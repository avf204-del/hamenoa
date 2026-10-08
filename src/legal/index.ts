// נקודת הכניסה של התוכן המשפטי (סבב 35).
//
// LEGAL_VERSION היא גרסת האישור שנרשמת בחשבון המשתמש. מעלים אותה (יחד עם
// version של המסמך שהשתנה) רק בשינוי מהותי — ואז כל משתמש נדרש לאשר מחדש
// בכניסה הבאה. תיקוני ניסוח לא מעלים גרסה.

import type { LegalDocument, LegalSection } from "./types";
import { operatorName, type OperatorInfo } from "./operator";
import type { Locale } from "@/i18n";
import { TERMS } from "./terms";
import { TERMS_EN } from "./terms.en";
import { PRIVACY } from "./privacy";
import { PRIVACY_EN } from "./privacy.en";
import { CONSENT_SUMMARY } from "./summary";
import { CONSENT_SUMMARY_EN } from "./summary.en";
import { HEALTH_QUESTIONS, HEALTH_TEXTS } from "./health-screen";
import { HEALTH_QUESTIONS_EN, HEALTH_TEXTS_EN } from "./health-screen.en";

// 6: שיתוף אימונים בהסכמת המתאמן עם מאמנים ומנהלים — טעון בדיקת עורך/ת דין.
export const LEGAL_VERSION = 6;

export * from "./types";
export * from "./operator";
export * from "./terms";
export * from "./privacy";
export * from "./summary";
export * from "./health-screen";
export * from "./terms.en";
export * from "./privacy.en";
export * from "./summary.en";
export * from "./health-screen.en";

// תרגום לאנגלית אינו שינוי מהותי: אותה גרסה, אותם מזהים. העברית גוברת.
export function legalDocument(slug: "terms" | "privacy", locale: Locale): LegalDocument {
  if (slug === "terms") return locale === "en" ? TERMS_EN : TERMS;
  return locale === "en" ? PRIVACY_EN : PRIVACY;
}
export function consentSummary(locale: Locale): typeof CONSENT_SUMMARY {
  return locale === "en" ? CONSENT_SUMMARY_EN : CONSENT_SUMMARY;
}
export function healthQuestions(locale: Locale): typeof HEALTH_QUESTIONS {
  return locale === "en" ? HEALTH_QUESTIONS_EN : HEALTH_QUESTIONS;
}
export function healthTexts(locale: Locale): typeof HEALTH_TEXTS {
  return locale === "en" ? HEALTH_TEXTS_EN : HEALTH_TEXTS;
}

/** ביטוי יצירת הקשר שמחליף את {{contact}} — עם דוא"ל כשיש, אחרת טופס בלבד. */
export function contactPhrase(op: OperatorInfo, locale: Locale = "he"): string {
  if (locale === "en") {
    return op.email
      ? `by email at ${op.email} or via the contact form on the site`
      : "via the contact form on the site";
  }
  return op.email
    ? `בדוא"ל ${op.email} או דרך טופס יצירת הקשר באתר`
    : "דרך טופס יצירת הקשר באתר";
}

/** מילוי שני הטוקנים המותרים בטקסט. טוקן לא מוכר נשאר כמו שהוא (הבדיקות תופסות). */
export function fillTokens(text: string, op: OperatorInfo, locale: Locale = "he"): string {
  return text
    .split("{{operatorName}}")
    .join(operatorName(op, locale))
    .split("{{contact}}")
    .join(contactPhrase(op, locale));
}

function fillSection(section: LegalSection, op: OperatorInfo, locale: Locale): LegalSection {
  const filled: LegalSection = {
    id: section.id,
    title: fillTokens(section.title, op, locale),
    paragraphs: section.paragraphs.map((p) => fillTokens(p, op, locale)),
  };
  if (section.bullets) filled.bullets = section.bullets.map((b) => fillTokens(b, op, locale));
  return filled;
}

/** עותק עמוק של המסמך עם הטוקנים ממולאים. המקור לא משתנה. */
export function fillDocument(doc: LegalDocument, op: OperatorInfo, locale: Locale = "he"): LegalDocument {
  return {
    slug: doc.slug,
    title: fillTokens(doc.title, op, locale),
    shortTitle: fillTokens(doc.shortTitle, op, locale),
    version: doc.version,
    effectiveDate: doc.effectiveDate,
    intro: fillTokens(doc.intro, op, locale),
    sections: doc.sections.map((s) => fillSection(s, op, locale)),
  };
}
