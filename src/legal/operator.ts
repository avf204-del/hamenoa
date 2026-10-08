// פרטי המפעיל — מגיעים ממשתני סביבה, לא מהקוד.
//
// OPERATOR_NAME — שם המפעיל כפי שיופיע במסמכים (אדם פרטי, לא חברה).
// SUPPORT_EMAIL — כתובת לפניות. ריק/לא מוגדר → null, והמסמכים יפנו לטופס
// יצירת הקשר בלבד (ראה contactPhrase ב-index.ts).

export interface OperatorInfo {
  name: string;
  email: string | null;
}

export const DEFAULT_OPERATOR_NAME = "מפעיל האפליקציה";
export const DEFAULT_OPERATOR_NAME_EN = "the app operator";

/** שם המפעיל לתצוגה: ברירת המחדל מתורגמת, שם אמיתי מוצג כמו שהוא. */
export function operatorName(op: OperatorInfo, locale: "he" | "en" = "he"): string {
  return locale === "en" && op.name === DEFAULT_OPERATOR_NAME ? DEFAULT_OPERATOR_NAME_EN : op.name;
}

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function operatorInfo(): OperatorInfo {
  return {
    name: clean(process.env.OPERATOR_NAME) ?? DEFAULT_OPERATOR_NAME,
    email: clean(process.env.SUPPORT_EMAIL),
  };
}
