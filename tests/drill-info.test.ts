// גיליון "איך מבצעים" לדרילי חימום ולמתיחות שחרור: הפריטים האלה אינם רשומות
// מאגר, ולכן הם נפתרים מהקטלוג הפנימי דרך מפתח עם קידומת. הבדיקה שומרת על
// שלוש הנקודות שהמסך נשען עליהן: מפתח לכל פריט, הוראות לכל מזהה, ואפס
// התנגשות בין מפתחות הדרילים לסלאגים של המאגר.

import { describe, expect, it } from "vitest";
import { MOBILITY_DRILLS, STRETCHES } from "../src/catalog/warmup-content";
import { catalogRef, drillKey, stretchKey } from "../src/lib/drill-keys";
import { exerciseInfoForSlugs } from "../src/lib/exercise-info";

describe("מידע לדרילי חימום ושחרור", () => {
  it("לכל דריל ומתיחה יש הוראות ביצוע בקטלוג", () => {
    for (const drill of [...MOBILITY_DRILLS, ...STRETCHES]) {
      expect(drill.instructionsHe.trim().length, drill.id).toBeGreaterThan(10);
    }
  });

  it("מפתח דריל אינו יכול להתחזות לסלאג של תרגיל מהמאגר", () => {
    for (const drill of MOBILITY_DRILLS) {
      expect(catalogRef(drillKey(drill.id))).toEqual({ kind: "drill", id: drill.id });
    }
    for (const stretch of STRETCHES) {
      expect(catalogRef(stretchKey(stretch.id))).toEqual({
        kind: "stretch",
        id: stretch.id,
      });
    }
    // סלאג רגיל נשאר סלאג — הוא ייפתר מול המסד
    expect(catalogRef("back-squat")).toBeNull();
  });

  it("המידע לדריל ולמתיחה נפתר בלי מסד", async () => {
    const drill = MOBILITY_DRILLS[0];
    const stretch = STRETCHES[0];
    const info = await exerciseInfoForSlugs([drillKey(drill.id), stretchKey(stretch.id)]);
    expect(info[drillKey(drill.id)].nameHe).toBe(drill.nameHe);
    expect(info[stretchKey(stretch.id)].instructionsHe).toBe(stretch.instructionsHe);
  });
});
