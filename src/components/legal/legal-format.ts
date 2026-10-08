// עזרי תצוגה למסמכים המשפטיים (סבב 35, D-5).
//
// טהור בכוונה (בלי React/Next/Prisma) כדי שאפשר יהיה לבדוק אותו ב-Vitest
// ולקרוא לו גם מרכיב שרת וגם מרכיב לקוח.

import type { Locale } from "@/i18n";

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * תאריך תחילה מ-YYYY-MM-DD לתצוגה עברית קצרה: "8.9.2026".
 * בלי אפסים מובילים — כך נהוג בעברית, וכך זה נקרא בטלפון.
 * קלט שאינו בתבנית מוחזר כמו שהוא (עדיף תאריך גולמי מאשר "NaN").
 * באנגלית: "8 Sep 2026".
 */
export function formatEffectiveDate(iso: string, locale: Locale = "he"): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso;
  const [, year, month, day] = match;
  if (locale === "en") return `${Number(day)} ${MONTHS_EN[Number(month) - 1] ?? month} ${year}`;
  return `${Number(day)}.${Number(month)}.${year}`;
}

/** מזהה עוגן ייחודי לסעיף — שם המסמך מקדים, כי שני מסמכים חולקים מזהים. */
export function sectionAnchor(slug: string, sectionId: string): string {
  return `${slug}-${sectionId}`;
}
