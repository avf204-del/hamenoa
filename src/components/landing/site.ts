// כתובת האתר הציבורי — מקור אמת יחיד ל-metadataBase, ל-robots ול-sitemap.
//
// אין עדיין דומיין משלנו (סבב 35): הכתובת היא זו של Railway. כשיהיה דומיין
// מגדירים APP_URL בסביבה ולא נוגעים בקוד. הערך חייב להיות origin מלא בלי
// לוכסן סוגר, כי הוא מוזן ל-new URL() ומשורשר ל-"/sitemap.xml".

const FALLBACK_SITE_URL = "https://hamenoa-production.up.railway.app";

function normalize(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return FALLBACK_SITE_URL;
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export const SITE_URL = normalize(process.env.APP_URL);

/**
 * הנתיבים הציבוריים (D-1/D-13). רק הם נכנסים ל-sitemap ורק הם מותרים
 * ב-robots — כל השאר מאחורי הכניסה ואין סיבה שיאונדקס.
 *
 * ‏/credits נוסף בביקורת סבב 35 (LEGAL-5): סעיף הקניין הרוחני בתנאי
 * השימוש מפנה ל"קובץ CREDITS באתר", ולא היה עמוד כזה.
 *
 * ‏/method הוסר בסבב 41 (D-8): עמוד "השיטה" הציבורי נמחק כליל — מסמך
 * המתודה נשאר רק בגרסת הבעלים (src/app/admin/method), שלא צריכה sitemap
 * או robots. ‏src/proxy.ts מפנה בקשות ישנות ל-/method אל "/" — ראו
 * REDIRECTED_ROUTES מתחת.
 */
export const PUBLIC_ROUTES = [
  "/",
  "/terms",
  "/privacy",
  "/contact",
  "/credits",
] as const;

/**
 * כתובות שנמחקו ומפנות קבוע (308) לדף הבית — לא ב-sitemap ולא נתיב
 * ציבורי ב-proxy, אבל **כן** ב-Allow של robots (תיקון ביקורת סבב 41).
 * ‏robots.txt נקרא לפני הבקשה: כתובת שחסומה בו לא נסרקת בכלל, ולכן
 * ההפניה שלה לעולם לא נקראת — הכתובת הישנה נשארת באינדקס כ"חסום
 * ב-robots" במקום להתאחד עם "/". שתי ההחלטות (מחיקה + הפניה) חייבות
 * להסכים: מפנים — ומרשים לסורק לראות את ההפניה.
 */
export const REDIRECTED_ROUTES = ["/method"] as const;
