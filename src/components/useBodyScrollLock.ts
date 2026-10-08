"use client";

// M2 (סבב 37): נעילת גלילת ה-body עם מונה-הפניות גלובלי (ברמת מודול),
// ולא עצמאית לכל מופע Sheet כמו קודם. עד סבב 36 תמיד היה לכל היותר
// Sheet פתוח אחד בו-זמנית, ולכן נעילה/שחרור עצמאיים בכל מופע הספיקו.
// "האימון המלא" (החלטה D-8, סבב 36) יצר לראשונה תרחיש של שני Sheet
// פתוחים בו-זמנית (הגיליון החיצוני + ExerciseInfoSheet הפנימי דרך
// PlanView) — בלי מונה משותף, סגירת הגיליון הפנימי בלבד היתה משחררת
// בטעות את נעילת הגלילה של הגיליון החיצוני שעדיין מוצג כפתוח (גלילת
// רקע/rubber-band מאחורי מודל פתוח).
//
// overflowValueForCount מיוצאת בנפרד מהאפקט עצמו כדי שחשבון המונה
// (כמה מופעים פתוחים → איזה ערך overflow רצוי) ייבדק ב-vitest node
// בלי jsdom (הפרויקט לא מתקין jsdom/RTL — ראה תיעוד בדיקות).

import { useEffect } from "react";

let lockCount = 0;

/** ערך ה-overflow הרצוי על document.body לפי מספר הנעילות הפתוחות כרגע. */
export function overflowValueForCount(count: number): "" | "hidden" {
  return count > 0 ? "hidden" : "";
}

function applyLockCount(next: number) {
  lockCount = Math.max(0, next);
  document.body.style.overflow = overflowValueForCount(lockCount);
}

/**
 * נועל את גלילת ה-body כל עוד open=true. משותף בין כל מופעי ה-hook
 * בעמוד דרך מונה-הפניות מודול-level: אם שני גיליונות פתוחים בו-זמנית,
 * סגירה (או unmount) של אחד בלבד לא משחררת את הנעילה — היא משתחררת
 * רק כשהמונה מגיע ל-0. ה-cleanup של useEffect רץ גם ב-open→false וגם
 * ב-unmount, כך שהמונה מתעדכן נכון בשני המקרים.
 */
export function useBodyScrollLock(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    applyLockCount(lockCount + 1);
    return () => {
      applyLockCount(lockCount - 1);
    };
  }, [open]);
}
