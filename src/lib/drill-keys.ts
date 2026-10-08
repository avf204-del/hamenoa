// מפתחות תצוגה לפריטי חימום ושחרור בתוך ExerciseInfoMap.
// דרילי המוביליות והמתיחות אינם רשומות מאגר — הם חיים ב-src/engine/data/warmup-content.ts —
// ולכן הם מקבלים מפתח עם קידומת, כדי שלעולם לא יתנגשו בסלאג של תרגיל מהמאגר.
// הקובץ טהור ובטוח ללקוח (בלי fs/prisma), כי גם הקומפוננטות בונות ממנו מפתחות.

export const DRILL_PREFIX = "drill:";
export const STRETCH_PREFIX = "stretch:";

export function drillKey(drillId: string): string {
  return `${DRILL_PREFIX}${drillId}`;
}

export function stretchKey(stretchId: string): string {
  return `${STRETCH_PREFIX}${stretchId}`;
}

/** פירוק מפתח חזרה לקטלוג המקור — null כשזה סלאג רגיל של תרגיל מהמאגר */
export function catalogRef(
  key: string,
): { kind: "drill" | "stretch"; id: string } | null {
  if (key.startsWith(DRILL_PREFIX)) {
    return { kind: "drill", id: key.slice(DRILL_PREFIX.length) };
  }
  if (key.startsWith(STRETCH_PREFIX)) {
    return { kind: "stretch", id: key.slice(STRETCH_PREFIX.length) };
  }
  return null;
}
