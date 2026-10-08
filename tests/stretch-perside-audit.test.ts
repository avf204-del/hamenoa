// ביקורת perSide על כל מתיחות השחרור (STRETCHES) — סבב 33, פריט ו.
//
// כלל הביקורת (הכרעת בעלים): perSide=true רק כשה-instructionsHe/הטכניקה
// עובדים על צד אחד בכל פעם (למשל "כרע על ברך אחת", "הרם יד מעל הראש").
// מתיחה שהטקסט שלה מתאר שני האיברים יחד (רגליים ישרות, שתי הברכיים,
// כפות ידיים מוצמדות) היא דו-צדדית — perSide=false — גם אם קבוצת השריר
// שלה (hamstrings וכד') קיימת בשני צידי הגוף.
//
// הביקורת עברה ידנית על שם התרגיל ועל instructionsHe של כל אחת מ-14
// המתיחות (src/engine/data/warmup-content.ts). הבדיקה נועלת את הטבלה
// שיצאה מהביקורת כדי שעריכה עתידית לא תשבור בשקט את הסיווג — כולל
// המתיחה שהבעלים דיווח עליה (מתיחת אחורי ירך בישיבה, "seated-hamstring"):
// שתי הרגליים ישרות קדימה, ההרכנה היא של הגו כולו — דו-צדדית.

import { describe, expect, it } from "vitest";
import { STRETCHES } from "../src/catalog/warmup-content";

/**
 * true = הטכניקה המתוארת ב-instructionsHe עובדת על איבר/צד אחד בכל פעם
 * ("רגל אחת", "ברך אחת", "יד אחת מול הגוף עם היד השנייה" וכד').
 * false = שני האיברים פועלים יחד (שתי רגליים, שני כפות ידיים, חיבוק
 * עצמי בשתי הידיים) — גם אם יש בו סיבוב/הטיה של כל הגוף לכיוון אחד.
 */
const EXPECTED_PER_SIDE: Record<string, boolean> = {
  "standing-quad": true, // אוחז בכף רגל אחת מאחורי הישבן
  "seated-hamstring": false, // "רגליים ישרות" (שתיים) — הרכנת כל הגו, לא צד אחד
  "figure-four": true, // קרסול על הברך הנגדית — רגל אחת בכל פעם
  "kneeling-hip-flexor": true, // כריעה על ברך אחת
  "wall-calf": true, // רגל אחורית אחת ישרה
  "doorway-chest": true, // אמה אחת על המשקוף
  "childs-pose": false, // "שב על העקבים" — שתי הרגליים, ידיים מושטות יחד
  "lat-side-reach": true, // יד אחת למעלה, הטיה לצד הנגדי
  "cross-shoulder": true, // יד אחת מוצלבת, נמשכת ביד השנייה
  "overhead-triceps": true, // מרפק אחד מעל הראש
  "prayer-forearms": false, // שתי כפות הידיים מוצמדות יחד
  cobra: false, // שתי הידיים דוחפות את החזה מעלה יחד
  "knees-to-chest": false, // "שתי הברכיים" — מפורש בטקסט
  "upper-back-hug": false, // חיבוק עצמי בשתי הידיים
};

describe("ביקורת perSide על מתיחות השחרור (סבב 33, פריט ו)", () => {
  it("הטבלה מכסה בדיוק את כל המתיחות הקיימות — לא שוכחת ולא ממציאה", () => {
    expect(new Set(STRETCHES.map((s) => s.id))).toEqual(new Set(Object.keys(EXPECTED_PER_SIDE)));
  });

  it.each(STRETCHES)("$id: perSide תואם לתוצאת הביקורת", (stretch) => {
    expect(stretch.perSide, stretch.instructionsHe).toBe(EXPECTED_PER_SIDE[stretch.id]);
  });

  it("מתיחת אחורי ירך בישיבה — הדיווח הספציפי של הבעלים — היא דו-צדדית", () => {
    const seatedHamstring = STRETCHES.find((s) => s.id === "seated-hamstring");
    expect(seatedHamstring?.perSide).toBe(false);
    expect(seatedHamstring?.nameHe).toBe("מתיחת אחורי ירך בישיבה");
  });
});
