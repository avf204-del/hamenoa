// הודעות הכישלון של כניסת גוגל — רשימה סגורה (ביקורת סבב 37).
//
// עד הסבב הזה הקולבק שלח את **נוסח ההודעה** בכתובת (`?googleError=<טקסט>`)
// ומסך הכניסה הציג אותו כמו שהוא, בתוך קופסת שגיאה מעוצבת. שום דבר לא מנע
// ממישהו לבנות את הכתובת בעצמו ולהציג טקסט משלו — למשל "החשבון שלך הושהה,
// שלח את קוד ההזמנה ל…" — על הדומיין האמיתי, מעל טופס הכניסה האמיתי. ‏React
// מברֵח HTML, ולכן זו לא הרצת קוד אלא פישינג; הסגירה זהה בכל מקרה.
//
// עכשיו בכתובת נוסע **קוד קצר בלבד**, והנוסח נקבע כאן בקוד. קוד לא מוכר —
// לא מוצג כלום.

export type GoogleErrorCode =
  | "cancelled"
  | "state"
  | "nocode"
  | "exchange"
  | "revoked"
  | "closed"
  | "full"
  | "signup-rate"
  | "signup-busy"
  | "signup-failed"
  | "link-taken";

export const GOOGLE_ERROR_MESSAGES_EN: Record<GoogleErrorCode, string> = {
  cancelled: "Google sign-in was cancelled.",
  state: "The request expired or wasn't valid — please try again.",
  nocode: "Google didn't return a sign-in code.",
  exchange: "Google sign-in failed. Please try again.",
  revoked: "Access was revoked. Please contact the operator.",
  closed: "Registration is closed right now. You can leave a message on the contact page.",
  full: "The pilot is full right now. You can leave a message on the contact page.",
  "signup-rate": "Too many sign-ups from this connection. Try again in an hour.",
  "signup-busy": "Sign-up is busy right now. Try again in an hour.",
  "signup-failed": "Creating the account failed. Please try again.",
  "link-taken": "This Google account is already linked to another user.",
};

export const GOOGLE_ERROR_MESSAGES: Record<GoogleErrorCode, string> = {
  cancelled: "הכניסה עם גוגל בוטלה.",
  state: "הבקשה פגה או לא תקינה — נסה שוב.",
  nocode: "גוגל לא החזיר קוד כניסה.",
  exchange: "הכניסה עם גוגל נכשלה. נסה שוב.",
  revoked: "הגישה בוטלה. פנה לבעלים.",
  closed: "ההרשמה סגורה כרגע. אפשר להשאיר הודעה בעמוד יצירת הקשר.",
  full: "הפיילוט מלא כרגע. אפשר להשאיר הודעה בעמוד יצירת הקשר.",
  "signup-rate": "יותר מדי הרשמות מהחיבור הזה. נסה שוב בעוד שעה.",
  "signup-busy": "ההרשמה עמוסה כרגע. נסה שוב בעוד שעה.",
  "signup-failed": "פתיחת החשבון נכשלה. נסה שוב.",
  "link-taken": "חשבון הגוגל הזה כבר מקושר למשתמש אחר.",
};

/**
 * הנוסח שמתאים לקוד שהגיע בכתובת, או null לכל דבר אחר — כולל מערך של
 * ערכים (‏?googleError=a&googleError=b), טקסט חופשי, וקוד שלא ברשימה.
 *
 * ‏`Object.hasOwn` ולא גישה ישירה: ‏`?googleError=constructor` היה מחזיר את
 * מה שיושב על שרשרת האב-טיפוס, כלומר ערך שאינו מחרוזת בכלל.
 */
export function googleErrorMessage(
  raw: string | string[] | undefined,
  locale: "he" | "en" = "he",
): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  if (!Object.hasOwn(GOOGLE_ERROR_MESSAGES, value)) return null;
  return (locale === "en" ? GOOGLE_ERROR_MESSAGES_EN : GOOGLE_ERROR_MESSAGES)[value as GoogleErrorCode];
}
