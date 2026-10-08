import { HEALTH_QUESTIONS } from "@/legal";

// לוגיקת שאלון הבריאות (סבב 35, D-6) — מודול טהור, בלי React ובלי מסד.
//
// שלוש ההחלטות שקובעות אם אפשר לשלוח יושבות כאן ולא בתוך הרכיב, כי הן
// אותן החלטות בדיוק שהשרת מאמת מולן (‏/api/health): כל השאלות נענו,
// "כן" ולו פעם אחת = flagged, ו-flagged בלי אישור = לא נשלח.

export interface StoredHealthAnswers {
  answers: Record<string, boolean>;
  acknowledged: boolean;
}

/**
 * קריאת התשובות השמורות מ-User.healthAnswers (עמודת Json חופשית — כל דבר
 * יכול לשבת שם, כולל null, מערך או מפתחות שכבר לא קיימים בשאלון).
 * מחזיר תמיד צורה תקינה: מפתחות שאינם שאלה מוכרת נזרקים, וכך גם ערך
 * שאינו בוליאני.
 */
export function parseStoredAnswers(value: unknown): StoredHealthAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { answers: {}, acknowledged: false };
  }
  const raw = value as { answers?: unknown; acknowledged?: unknown };
  const known = new Set(HEALTH_QUESTIONS.map((question) => question.id));
  const answers: Record<string, boolean> = {};
  if (raw.answers && typeof raw.answers === "object" && !Array.isArray(raw.answers)) {
    for (const [id, answer] of Object.entries(raw.answers as Record<string, unknown>)) {
      if (known.has(id) && typeof answer === "boolean") answers[id] = answer;
    }
  }
  return { answers, acknowledged: raw.acknowledged === true };
}

/** כל שאלה בשאלון נענתה (כן או לא) — בלי ברירת מחדל ובלי דילוג */
export function allAnswered(answers: Record<string, boolean>): boolean {
  return HEALTH_QUESTIONS.every(
    (question) => typeof answers[question.id] === "boolean",
  );
}

/** "כן" באחת השאלות לפחות = דגל שמחייב את ההמלצה הרפואית ואת האישור */
export function isFlagged(answers: Record<string, boolean>): boolean {
  return HEALTH_QUESTIONS.some((question) => answers[question.id] === true);
}

/** מותר לשלוח: הכול נענה, ואם יש דגל — גם ההמלצה אושרה */
export function canSubmitHealth(state: StoredHealthAnswers): boolean {
  if (!allAnswered(state.answers)) return false;
  return !isFlagged(state.answers) || state.acknowledged;
}
