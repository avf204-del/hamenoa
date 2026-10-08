// הגבלת קצב משותפת (החלטה 35, D-9).
//
// עד סבב 35 היה בקוד מגביל אחד בלבד, בתוך /api/auth/login — ספירת ניסיונות
// כושלים עם חסימה מדורגת. הוא נשאר שם כפי שהוא (יש לו התנהגות והודעות
// משלו, ובדיקות שנועלות אותן). מה שנפתח לציבור צריך משהו אחר: חלון הזזה על
// **כל** בקשה, לא רק על כישלון, כדי שהרשמה, טופס יצירת קשר ואירועי מדידה
// לא ייפתחו לספאם.
//
// שתי מגבלות מוצהרות, כי אין כאן Redis ואין צורך בו:
// • המצב חי בזיכרון התהליך — פריסה מאפסת אותו, ושתי מכונות לא מסונכרנות.
//   לקהל של פיילוט זו הגנה מספקת מפני סקריפט תמים; לא מפני תוקף נחוש.
// • המפה חסומה בתקרה. בגלישה **לא** מרוקנים אותה כולה (כך היה עד ביקורת
//   סבב 35, וזו הייתה דרך לאפס את כל הדליים בבת אחת עם 10,000 מפתחות
//   מזויפים): קודם מפנים שורות שחלונן פג, ורק אם זה לא הספיק מפנים את
//   הוותיקות ביותר.
//
// ומעליהן שכבה שנייה: כל דלי ציבורי מקבל גם **תקרה גלובלית** (`GLOBAL_KEY`)
// שאינה תלויה בכתובת, כי כתובת הפונה מגיעה מכותרת שהפרוקסי כותב ואי אפשר
// לסמוך עליה במאה אחוז.

export interface RateLimitOptions {
  /** כמה בקשות מותרות בחלון */
  max: number;
  /** אורך החלון במילישניות */
  windowMs: number;
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

/** חגורת ביטחון נגד גדילה בלתי מוגבלת של המפה */
const MAX_ENTRIES = 10_000;

/** כמה שורות מפנים כשגם הניקוי לפי זמן לא הספיק */
const EVICT_BATCH = 1_000;

/** החלון הארוך ביותר שבשימוש (שעה) — שורה ישנה ממנו כבר לא מגבילה איש */
const LONGEST_WINDOW_MS = 3_600_000;

/** המפתח של התקרה הגלובלית — דלי שאינו תלוי בכתובת הפונה */
export const GLOBAL_KEY = "@global";

/** מפתח → חותמות הזמן של הבקשות שנספרו בחלון הפעיל */
const hits = new Map<string, number[]>();

/**
 * הדליים הגלובליים יושבים במפה **נפרדת**, ובכוונה: המפה של המפתחות לפי
 * כתובת מוגבלת בגודלה ומפנה שורות בגלישה, ואם התקרה הגלובלית הייתה יושבת
 * בה, מבול של מפתחות מזויפים היה מפנה דווקא אותה — כלומר מבטל את ההגנה
 * שנועדה להתמודד עם אותו מבול. המפה הזו קטנה וחסומה מעצמה: מפתח אחד לכל
 * דלי שכתוב בקוד.
 */
const globalHits = new Map<string, number[]>();

/** ספירה בחלון הזזה על מפה נתונה. מחזירה את התוצאה, ומעדכנת את המפה. */
function consume(
  store: Map<string, number[]>,
  id: string,
  { max, windowMs }: RateLimitOptions,
  now: number,
): RateLimitResult {
  const cutoff = now - windowMs;
  // ניקוי עצל: רק המפתח שנגעו בו מנוקה, לא כל המפה
  const recent = (store.get(id) ?? []).filter((at) => at > cutoff);

  if (recent.length >= max) {
    store.set(id, recent);
    const oldest = recent[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { ok: false, retryAfterSec };
  }

  if (store === hits && !hits.has(id) && hits.size >= MAX_ENTRIES) makeRoom(now);
  recent.push(now);
  store.set(id, recent);
  return { ok: true };
}

/**
 * האם הבקשה עוברת. הקריאה עצמה **נספרת** כשהיא עוברת — כלומר קוראים לזה
 * פעם אחת לבקשה, בתחילת ה-handler.
 *
 * `now` מוזרק כדי שבדיקות יוכלו להזיז זמן בלי שעון מזויף — אותו דפוס כמו
 * `issueToken(claims, nowMs)` ב-src/lib/auth.ts.
 */
export function rateLimit(
  bucket: string,
  key: string,
  options: RateLimitOptions,
  now = Date.now(),
): RateLimitResult {
  const id = `${bucket}:${key}`;
  return consume(key === GLOBAL_KEY ? globalHits : hits, id, options, now);
}

/**
 * פינוי מקום במפה, בלי לרוקן אותה. קודם כל מה שכבר לא מגביל איש (חלון
 * שפג), ורק אם זה לא הספיק — אצווה של השורות שנגעו בהן לפני הכול (LRU).
 */
function makeRoom(now: number): void {
  const stale = now - LONGEST_WINDOW_MS;
  for (const [id, times] of hits) {
    const last = times[times.length - 1];
    if (last === undefined || last <= stale) hits.delete(id);
  }
  if (hits.size < MAX_ENTRIES) return;
  const byRecency = [...hits.entries()].sort(
    (a, b) => (a[1][a[1].length - 1] ?? 0) - (b[1][b[1].length - 1] ?? 0),
  );
  for (let i = 0; i < EVICT_BATCH && i < byRecency.length; i++) {
    hits.delete(byRecency[i][0]);
  }
}

/**
 * תקרה גלובלית לדלי — נספרת בלי קשר לכתובת הפונה, ולכן אי אפשר לעקוף
 * אותה בזיוף `x-forwarded-for`. זו התקרה שמגנה על המסד עצמו.
 */
export function globalLimit(
  bucket: string,
  options: RateLimitOptions,
  now = Date.now(),
): RateLimitResult {
  return rateLimit(bucket, GLOBAL_KEY, options, now);
}

/**
 * כמה קפיצות פרוקסי **שלנו** יושבות בקצה הימני של `x-forwarded-for`.
 * ‏0 מתאים ל-Railway היום; משתנה סביבה כדי שאפשר יהיה לתקן בלי פריסת קוד
 * אם תיכנס שכבת CDN נוספת.
 */
function trustedHops(): number {
  const raw = Number(process.env.TRUSTED_PROXY_HOPS);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
}

/**
 * כתובת הפונה מתוך `x-forwarded-for`.
 *
 * **נלקחת מהקצה הימני, לא מהשמאלי** (ביקורת סבב 35, SEC-3). השרשרת נכתבת
 * משמאל לימין, ולכן הערכים השמאליים הם בדיוק מה שהלקוח שלח בעצמו: פרוקסי
 * שמוסיף (append) מוסיף את הכתובת האמיתית בסוף, ופרוקסי שמוחק וכותב מחדש
 * משאיר ערך יחיד — בשני המקרים הימני הוא הנכון, והשמאלי ניתן לזיוף.
 * זיוף שכזה איפשר לעקוף כל מגבלה על ידי החלפת הכתובת המוצהרת בכל בקשה.
 *
 * בלי כותרת כזו כולם נספרים תחת "unknown" — עדיף מגבלה גסה מכלום.
 */
export function clientIp(request: {
  headers: { get: (name: string) => string | null };
}): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return "unknown";
  const parts = forwarded
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) return "unknown";
  const index = Math.max(0, parts.length - 1 - trustedHops());
  return parts[index] ?? "unknown";
}

/** איפוס מלא — לבדיקות בלבד (המצב הוא ברמת המודול) */
export function resetRateLimits(): void {
  hits.clear();
  globalHits.clear();
}
