// חסימה מדורגת אחרי ניחושים בנתיב הכניסה — בזיכרון התהליך (החלטה 20).
//
// למה לא `rateLimit()` המשותף מ-src/lib/rate-limit.ts: לדלי הזה יש התנהגות
// מוצהרת משלו — חמישה כישלונות פותחים דקת חסימה, וההודעה מונה שניות — ורק
// **כישלון** נספר בו. מה שכן נלקח משם בביקורת סבב 37 (SEC1) הוא החגורות
// שחסרו כאן לגמרי: תקרת גודל, פינוי לפי זמן, וקיצוץ המפתח. בלעדיהן כל
// ניסיון כושל הוסיף שורה שלא נמחקה לעולם (המחיקה היחידה הייתה בכניסה
// מוצלחת עם אותו מפתח), ומבול של ניסיונות ניפח את התהליך עד נפילה.
//
// המודול מחזיק מצב ברמת המודול, ולכן `now` מוזרק כפרמטר ולא מזויף — אותו
// דפוס כמו `issueToken(claims, nowMs)` ב-src/lib/auth.ts.

/** כמה כישלונות ברצף פותחים חסימה */
export const MAX_FAILS = 5;

/** אורך החסימה */
export const BLOCK_MS = 60_000;

/**
 * חלון ספירת הכישלונות: אחרי עשר דקות בלי ניסיון נוסף הרשומה פגה והמונה
 * מתחיל מאפס. עד הביקורת לא היה חלון כזה — רשומה נשארה במפה לנצח.
 */
export const COUNT_WINDOW_MS = 600_000;

/** חגורת ביטחון נגד גדילה בלתי מוגבלת של המפה */
export const MAX_ENTRIES = 5_000;

/** כמה שורות מפנים כשגם הניקוי לפי זמן לא הספיק */
const EVICT_BATCH = 500;

/** המפתח נגזר מכותרת שהלקוח שולח — קוצצים כדי שלא ייכנסו אליו קילובייטים */
export const MAX_KEY_LEN = 64;

interface Attempt {
  /** כישלונות ברצף שטרם פתחו חסימה */
  fails: number;
  /** מתי החסימה נגמרת; 0 = אין חסימה פעילה */
  blockedUntil: number;
  /** מתי הרשומה מפסיקה להגביל ואפשר למחוק אותה */
  expiresAt: number;
}

const attempts = new Map<string, Attempt>();

/** מפתח הדלי מתוך כתובת הפונה — חתוך באורך */
export function attemptKey(raw: string): string {
  return raw.slice(0, MAX_KEY_LEN);
}

/** הרשומה הפעילה, או null. רשומה שפג תוקפה נמחקת תוך כדי קריאה. */
function active(key: string, now: number): Attempt | null {
  const state = attempts.get(key);
  if (!state) return null;
  if (state.expiresAt <= now) {
    attempts.delete(key);
    return null;
  }
  return state;
}

/** כמה שניות נותרו לחסימה הפעילה, או 0 כשאין חסימה */
export function blockedSeconds(key: string, now: number): number {
  const state = active(key, now);
  if (!state || state.blockedUntil <= now) return 0;
  return Math.ceil((state.blockedUntil - now) / 1000);
}

/** ניסיון כושל מקרב לחסימה. המונה מתאפס כשהחסימה נפתחת (התנהגות קיימת). */
export function countFailure(key: string, now: number): void {
  const state = active(key, now);
  const fails = (state?.fails ?? 0) + 1;
  const blocked = fails >= MAX_FAILS;
  if (!attempts.has(key) && attempts.size >= MAX_ENTRIES) makeRoom(now);
  attempts.set(key, {
    fails: blocked ? 0 : fails,
    blockedUntil: blocked ? now + BLOCK_MS : 0,
    expiresAt: now + (blocked ? BLOCK_MS : COUNT_WINDOW_MS),
  });
}

/** כניסה מוצלחת מנקה את המונה של אותו מפתח */
export function clearAttempts(key: string): void {
  attempts.delete(key);
}

/**
 * פינוי מקום בלי לרוקן את המפה (אותו לקח כמו ב-rate-limit.ts): קודם כל
 * הרשומות שכבר לא מגבילות איש, ורק אם זה לא הספיק — אצווה של הוותיקות.
 */
function makeRoom(now: number): void {
  for (const [key, state] of attempts) {
    if (state.expiresAt <= now) attempts.delete(key);
  }
  if (attempts.size < MAX_ENTRIES) return;
  const byAge = [...attempts.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
  for (let i = 0; i < EVICT_BATCH && i < byAge.length; i += 1) {
    attempts.delete(byAge[i][0]);
  }
}

/** איפוס מלא — לבדיקות בלבד (המצב הוא ברמת המודול) */
export function resetAttempts(): void {
  attempts.clear();
}

/** כמה רשומות מוחזקות כרגע — לבדיקות בלבד */
export function attemptEntryCount(): number {
  return attempts.size;
}
