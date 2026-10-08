// ולידציה של משוב ושל פנייה מטופס יצירת הקשר (החלטה 35, D-11).
//
// מודול טהור בכוונה — בלי Prisma, בלי Next, בלי שום ייבוא: אותה פונקציה
// בדיוק רצה בדפדפן (כדי להראות שגיאה לפני שליחה) ובשרת (כדי להגן על
// המסד). כלל הזהב: מה שהלקוח בודק לנוחות, השרת בודק שוב לאמת.
//
// שתי החלטות שראוי להסביר:
// • **משוב יכול להיות דירוג בלבד.** גיליון המשוב מציג חמישה כפתורים
//   ותיבת טקסט שכתוב עליה "מה היית משנה?" — כלומר הטקסט רשות. לכן
//   הדרישה כאן היא "לפחות אחד מהשניים", ולא "טקסט חובה": שליחה ריקה
//   נחסמת, אבל מי שרק נגע ב-4 לא נחסם באמצע מחווה של רצון טוב.
// • **מלכודת הדבש (honeypot) אינה שגיאה.** שדה `website` שמולא הוא כמעט
//   תמיד בוט; מחזירים ok מדומה ולא הודעת שגיאה, כדי לא ללמד את הבוט מה
//   בדיוק נתפס. הראוט עונה 204 בלי לשמור כלום.

/** אורך מרבי לטקסט משוב או להודעת פנייה */
export const TEXT_MAX = 2000;
/** אורך מזערי להודעה בטופס יצירת הקשר — פחות מזה אינו פנייה */
export const MESSAGE_MIN = 5;
export const NAME_MAX = 80;
export const EMAIL_MAX = 120;
/** הנתיב שממנו נשלח המשוב נשמר לצורך הקשר בלבד, ולכן נחתך ולא נפסל */
export const PATH_MAX = 200;

export interface FeedbackValue {
  rating: number | null;
  text: string;
  path: string | null;
}

export interface ContactValue {
  name: string | null;
  email: string | null;
  message: string;
}

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

/** תוצאת טופס יצירת הקשר: תקין, שגוי, או מלכודת דבש שנפלה בה מכונה */
export type ContactValidation = Validated<ContactValue> | { ok: "honeypot" };

/** תבנית בסיסית בכוונה: משהו@משהו.סיומת, בלי לנסות לחקות את RFC 5322 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function asRecord(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as Record<string, unknown>;
}

/** מחרוזת חתוכה ברווחים, או null כשהשדה חסר/ריק */
function optionalString(value: unknown): { ok: true; value: string | null } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false };
  const trimmed = value.trim();
  return { ok: true, value: trimmed.length > 0 ? trimmed : null };
}

/**
 * משוב מתוך האפליקציה: דירוג 1-5 ו/או טקסט חופשי, ונתיב המסך שממנו נשלח.
 */
export function validateFeedback(body: unknown): Validated<FeedbackValue> {
  const raw = asRecord(body);
  if (!raw) return { ok: false, error: "גוף הבקשה לא תקין" };

  let rating: number | null = null;
  if (raw.rating !== undefined && raw.rating !== null) {
    if (
      typeof raw.rating !== "number" ||
      !Number.isInteger(raw.rating) ||
      raw.rating < 1 ||
      raw.rating > 5
    ) {
      return { ok: false, error: "הדירוג חייב להיות מספר שלם בין 1 ל-5" };
    }
    rating = raw.rating;
  }

  let text = "";
  if (raw.text !== undefined && raw.text !== null) {
    if (typeof raw.text !== "string") return { ok: false, error: "הטקסט לא תקין" };
    text = raw.text.trim();
  }
  if (text.length > TEXT_MAX) {
    return { ok: false, error: `המשוב ארוך מדי — עד ${TEXT_MAX} תווים` };
  }

  if (rating === null && text.length === 0) {
    return { ok: false, error: "אפשר לדרג, אפשר לכתוב, אבל לא לשלוח ריק" };
  }

  const path = optionalString(raw.path);
  if (!path.ok) return { ok: false, error: "הנתיב לא תקין" };

  return {
    ok: true,
    value: {
      rating,
      text,
      path: path.value ? path.value.slice(0, PATH_MAX) : null,
    },
  };
}

/**
 * פנייה מטופס יצירת הקשר הציבורי: שם ומייל רשות, הודעה חובה, ושדה
 * `website` שאסור שיהיה בו כלום — הוא מוסתר מבני אדם.
 */
export function validateContact(body: unknown): ContactValidation {
  const raw = asRecord(body);
  if (!raw) return { ok: false, error: "גוף הבקשה לא תקין" };

  // ראשון בסדר הבדיקות: בוט לא יקבל אפילו הודעת שגיאה מדויקת
  if (typeof raw.website === "string" && raw.website.trim().length > 0) {
    return { ok: "honeypot" };
  }

  const name = optionalString(raw.name);
  if (!name.ok) return { ok: false, error: "השם לא תקין" };
  if (name.value && name.value.length > NAME_MAX) {
    return { ok: false, error: `השם ארוך מדי — עד ${NAME_MAX} תווים` };
  }

  const email = optionalString(raw.email);
  if (!email.ok) return { ok: false, error: "כתובת המייל לא תקינה" };
  if (email.value) {
    if (email.value.length > EMAIL_MAX) {
      return { ok: false, error: `כתובת המייל ארוכה מדי — עד ${EMAIL_MAX} תווים` };
    }
    if (!EMAIL_PATTERN.test(email.value)) {
      return { ok: false, error: "כתובת המייל לא נראית תקינה" };
    }
  }

  if (typeof raw.message !== "string") {
    return { ok: false, error: "צריך לכתוב הודעה" };
  }
  const message = raw.message.trim();
  if (message.length < MESSAGE_MIN) {
    return { ok: false, error: "כתוב לנו עוד קצת — לפחות כמה מילים" };
  }
  if (message.length > TEXT_MAX) {
    return { ok: false, error: `ההודעה ארוכה מדי — עד ${TEXT_MAX} תווים` };
  }

  return { ok: true, value: { name: name.value, email: email.value, message } };
}
