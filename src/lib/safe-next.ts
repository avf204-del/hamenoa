// יעד חוזר בטוח (`?next=`) — מודול אחד לכל מסלולי הכניסה.
//
// עד ביקורת סבב 35 הבדיקה הייתה "מתחיל ב-/ ולא ב-//", והיא לא מספיקה:
// לפי תקן WHATWG (וכל דפדפן, וגם `new URL` של Node) **קו נטוי הפוך שקול
// לקו נטוי** בכתובת http(s), ותווי בקרה (טאב, שורה חדשה) נמחקים לפני
// הפענוח. לכן `/\evil.com` ו-`/<tab>/evil.com` עברו את הבדיקה ונפתרו
// לכתובת `https://evil.com/` — הפניה פתוחה במסלול שהתוקף עצמו פותח
// (`/api/auth/google?next=…`), אחרי כניסת גוגל אמיתית של הקורבן.
//
// הכלל כאן הוא הוכחה ולא ניחוש: מפרקים את הערך מול מקור בדוי, ומקבלים
// אותו רק אם הוא נשאר באותו מקור. מודול טהור — בלי Next, בלי React —
// כדי שגם עמוד השרת (/login), גם ה-API וגם הקולבק ישתמשו באותו קוד.

/** מקור בדוי לפענוח יחסי. כל ערך שיוצא ממנו החוצה אינו נתיב פנימי. */
const PROBE_ORIGIN = "http://safe-next.invalid";

/**
 * קו נטוי הפוך או תו בקרה בערך. נבדק בקוד התו ולא בביטוי רגולרי, כדי
 * שהקובץ עצמו לא יכיל תווי בקרה.
 */
function hasBackslashOrControl(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code === 0x5c || code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * נתיב פנימי בלבד. כל דבר אחר (כתובת מוחלטת, `//host`, `/\host`, תווי
 * בקרה, ערך ריק) מוחלף בשורש.
 */
export function safeNext(raw: string | string[] | null | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || value.length === 0) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  // קו נטוי הפוך ותווי בקרה — הדפדפן מתייחס אליהם אחרת מהבדיקה הנאיבית
  if (hasBackslashOrControl(value)) return "/";

  let url: URL;
  try {
    url = new URL(value, PROBE_ORIGIN);
  } catch {
    return "/";
  }
  if (url.origin !== PROBE_ORIGIN) return "/";

  const path = `${url.pathname}${url.search}${url.hash}`;
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

/**
 * בניית כתובת הפניה מוחלטת מיעד חוזר, מול מקור הבקשה. גם אחרי `safeNext`
 * זו רשת ביטחון שנייה בנקודת ההפניה עצמה: אם משהו זר הצליח להיכנס ל-state
 * החתום (למשל state שנחתם בגרסה ישנה של הקוד), ההפניה תצא לשורש.
 */
export function internalRedirectUrl(next: string, requestUrl: string | URL): URL {
  const base = new URL(requestUrl);
  const target = new URL(safeNext(next), base);
  return target.origin === base.origin ? target : new URL("/", base);
}
