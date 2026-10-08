// שרשרת הכניסה הראשונה (החלטה 35, D-1/D-5/D-6): מה עוד חסר למשתמש מזוהה
// לפני שהוא רואה מסך אפליקציה.
//
// מודול טהור בכוונה — בלי Prisma, בלי React, בלי Next. הוא מקבל את השדות
// כמו שהם יושבים על המשתמש ומחזיר החלטה, כך שגם השער בפריסה
// (‏(app)/layout.tsx), גם שערי ה-API (writeGate) וגם העמודים עצמם שואלים
// את אותה שאלה ומקבלים את אותה תשובה. כל בדיקה כאן = בדיקת Vitest.
//
// **גרסה, לא רק חותמת.** אישור של נוסח ישן אינו אישור של הנוסח הנוכחי:
// העלאת LEGAL_VERSION מחזירה את כולם — הבעלים כולל — למסך האישור פעם אחת.

import { HEALTH_SCREEN_VERSION, LEGAL_VERSION } from "@/legal";

export interface OnboardingState {
  /** מועד האישור האחרון של המסמכים המשפטיים */
  disclaimerAcceptedAt: Date | null;
  /** הגרסה שאושרה אז */
  legalVersion: number | null;
  /** מועד מילוי שאלון הבריאות */
  healthScreenedAt: Date | null;
  /** גרסת השאלון שמולאה */
  healthScreenVersion: number | null;
}

/** אישר את הגרסה **הנוכחית** של תנאי השימוש ומדיניות הפרטיות */
export function legalAccepted(state: OnboardingState): boolean {
  return state.disclaimerAcceptedAt !== null && state.legalVersion === LEGAL_VERSION;
}

/** מילא את הגרסה **הנוכחית** של שאלון הבריאות */
export function healthScreened(state: OnboardingState): boolean {
  return (
    state.healthScreenedAt !== null &&
    state.healthScreenVersion === HEALTH_SCREEN_VERSION
  );
}

/**
 * לאן להפנות משתמש מזוהה לפני שהוא ממשיך, או `null` אם הכול הושלם.
 * הסדר קבוע: משפטי לפני בריאות — אין טעם לשאול על הגוף לפני שהוסכם על מה
 * שנעשה עם התשובות.
 */
export function onboardingRedirect(
  state: OnboardingState,
): "/terms" | "/health" | null {
  if (!legalAccepted(state)) return "/terms";
  if (!healthScreened(state)) return "/health";
  return null;
}
