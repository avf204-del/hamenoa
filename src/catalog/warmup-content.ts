// תוכן מקורי של הפרויקט — תרגילי מוביליטי למרכיב החימום ומתיחות למרכיב השחרור.
// נכתב מאפס בעברית; אין טקסט ממקור חיצוני. (ראה docs/DECISIONS.md סעיף 13)

export type Joint = "ankle" | "hip" | "knee" | "shoulder" | "wrist" | "spine" | "neck";

export type Muscle =
  | "quads" | "hamstrings" | "glutes" | "calves" | "chest" | "lats"
  | "shoulders" | "triceps" | "forearms" | "lowerBack" | "upperBack"
  | "abs" | "hipFlexors";

export interface MobilityDrill {
  id: string;
  nameHe: string;
  joints: Joint[];
  reps: number;
  isSeconds: boolean;
  /** דריל שמבוצע לכל צד בנפרד — המספר המוצג הוא לכל צד */
  perSide?: boolean;
  instructionsHe: string;
  /** דפוסי תנועה שהדריל מעמיס בפועל — מסונן כשדפוס נמצא בהימנעות מכאב */
  loadsPatterns?: string[];
  /**
   * מזהה צילומים ב-Free Exercise DB (רישיון Unlicense) — שני שלבי תנועה
   * שמורדים ל-public/warmup/<id>/ ע"י pnpm images:fetch. בלי שדה (או null):
   * איור מקורי (scripts/generate-illustrations.ts). המנוע מתעלם מהשדה.
   */
  imageSource?: string | null;
}

export interface Stretch {
  id: string;
  nameHe: string;
  muscles: Muscle[];
  durationSec: number;
  perSide: boolean;
  instructionsHe: string;
  /** כמו ב-MobilityDrill — מקור צילומים חופשי, או איור מקורי כשאין */
  imageSource?: string | null;
}

export const MOBILITY_DRILLS: MobilityDrill[] = [
  {
    id: "ankle-circles",
    imageSource: "Ankle_Circles",
    nameHe: "סיבובי קרסול",
    joints: ["ankle"],
    reps: 10,
    isSeconds: false,
    perSide: true,
    instructionsHe: "עמוד על רגל אחת וסובב את כף הרגל השנייה באוויר, 10 סיבובים לכל כיוון ולכל רגל.",
  },
  {
    id: "ankle-rocks",
    nameHe: "הטיות ברך מעל בוהן",
    joints: ["ankle", "knee"],
    reps: 8,
    isSeconds: false,
    perSide: true,
    instructionsHe: "צעד קטן קדימה והטה את הברך הקדמית מעל כף הרגל בלי להרים את העקב. 8 הטיות לכל רגל.",
  },
  {
    id: "hip-circles",
    nameHe: "סיבובי אגן",
    joints: ["hip", "spine"],
    reps: 10,
    isSeconds: false,
    instructionsHe: "ידיים על המותניים וסובב את האגן במעגלים רחבים, 10 לכל כיוון.",
  },
  {
    id: "leg-swings",
    imageSource: "Front_Leg_Raises",
    nameHe: "נדנודי רגל",
    joints: ["hip", "knee"],
    reps: 10,
    isSeconds: false,
    perSide: true,
    instructionsHe: "אחוז בקיר או במתקן ונדנד רגל ישרה קדימה ואחורה בתנועה גדלה. 10 נדנודים לכל רגל.",
  },
  {
    id: "cat-cow",
    imageSource: "Cat_Stretch",
    nameHe: "חתול-פרה",
    joints: ["spine", "neck"],
    reps: 8,
    isSeconds: false,
    instructionsHe: "עמוד על ארבע. קמר את הגב מעלה עם סנטר לחזה, ואז שקע עם מבט קדימה. 8 מחזורים איטיים.",
  },
  {
    id: "shoulder-circles",
    imageSource: "Shoulder_Circles",
    nameHe: "סיבובי כתפיים",
    joints: ["shoulder"],
    reps: 10,
    isSeconds: false,
    instructionsHe: "סובב את שתי הכתפיים לאחור במעגלים גדולים ואיטיים, ואז קדימה. 10 לכל כיוון.",
  },
  {
    id: "arm-crossovers",
    imageSource: "Dynamic_Chest_Stretch",
    nameHe: "הצלבות ידיים",
    joints: ["shoulder", "spine"],
    reps: 10,
    isSeconds: false,
    instructionsHe: "פתח את הידיים לצדדים והצלב אותן על החזה לסירוגין, בתנועה רחבה וקצבית.",
  },
  {
    id: "wrist-circles",
    imageSource: "Wrist_Circles",
    nameHe: "סיבובי פרק יד",
    joints: ["wrist"],
    reps: 10,
    isSeconds: false,
    instructionsHe: "שלב אצבעות וסובב את פרקי הידיים לכל הכיוונים, 10 שניות לכל כיוון.",
  },
  {
    id: "wrist-rocks",
    nameHe: "העמסת פרקי יד",
    joints: ["wrist"],
    reps: 8,
    isSeconds: false,
    instructionsHe: "עמוד על ארבע עם כפות ידיים על הרצפה ואצבעות קדימה, והתנדנד בעדינות קדימה ואחורה.",
  },
  {
    id: "deep-squat-hold",
    nameHe: "סקוואט עמוק בהחזקה",
    joints: ["ankle", "knee", "hip"],
    loadsPatterns: ["squat"],
    reps: 30,
    isSeconds: true,
    instructionsHe: "רד לסקוואט עמוק ככל שנוח, עקבים על הרצפה, ודחוף את הברכיים החוצה עם המרפקים. החזק ונשום.",
  },
  {
    id: "worlds-greatest",
    imageSource: "Worlds_Greatest_Stretch",
    nameHe: "מתיחת הענק",
    joints: ["hip", "spine", "shoulder", "ankle"],
    loadsPatterns: ["lunge"],
    reps: 4,
    isSeconds: false,
    perSide: true,
    instructionsHe: "צעד גדול קדימה לעמדת לאנג' נמוך, הנח את שתי הידיים בפנים הרגל הקדמית, וסובב יד אחת לתקרה. 4 לכל צד.",
  },
  {
    id: "neck-half-circles",
    nameHe: "חצאי סיבוב צוואר",
    joints: ["neck"],
    reps: 6,
    isSeconds: false,
    instructionsHe: "גלגל את הסנטר מכתף לכתף דרך החזה, לאט ובלי להטות את הראש לאחור. 6 מחזורים.",
  },
];

export const STRETCHES: Stretch[] = [
  {
    id: "standing-quad",
    nameHe: "מתיחת ארבע ראשי בעמידה",
    muscles: ["quads", "hipFlexors"],
    durationSec: 30,
    perSide: true,
    instructionsHe: "אחוז בכף הרגל מאחורי הישבן, ברכיים צמודות, ודחוף את האגן מעט קדימה.",
  },
  {
    id: "seated-hamstring",
    imageSource: "Seated_Floor_Hamstring_Stretch",
    nameHe: "מתיחת אחורי ירך בישיבה",
    muscles: ["hamstrings", "lowerBack"],
    durationSec: 40,
    perSide: false,
    instructionsHe: "שב עם רגליים ישרות והישען קדימה מהאגן, עם גב ארוך, לכיוון כפות הרגליים.",
  },
  {
    id: "figure-four",
    imageSource: "Ankle_On_The_Knee",
    nameHe: "מתיחת ישבן בשכיבה (ארבע)",
    muscles: ["glutes"],
    durationSec: 40,
    perSide: true,
    instructionsHe: "שכב על הגב, הנח קרסול על הברך הנגדית ומשוך את הירך התחתונה אל החזה.",
  },
  {
    id: "kneeling-hip-flexor",
    imageSource: "Kneeling_Hip_Flexor",
    nameHe: "מתיחת כופפי ירך בכריעה",
    muscles: ["hipFlexors", "quads"],
    durationSec: 40,
    perSide: true,
    instructionsHe: "כרע על ברך אחת, הדק את הישבן ודחוף את האגן קדימה עד מתיחה בקדמת הירך האחורית.",
  },
  {
    id: "wall-calf",
    imageSource: "Calf_Stretch_Hands_Against_Wall",
    nameHe: "מתיחת תאומים מול קיר",
    muscles: ["calves"],
    durationSec: 30,
    perSide: true,
    instructionsHe: "הישען על קיר עם רגל אחורית ישרה ועקב צמוד לרצפה, והטה את הגוף קדימה.",
  },
  {
    id: "doorway-chest",
    nameHe: "מתיחת חזה במשקוף",
    muscles: ["chest", "shoulders"],
    durationSec: 30,
    perSide: true,
    instructionsHe: "הנח אמה על משקוף בגובה הכתף וסובב את הגוף מהמשקוף החוצה עד מתיחה בחזה.",
  },
  {
    id: "childs-pose",
    imageSource: "Childs_Pose",
    nameHe: "תנוחת ילד",
    muscles: ["lats", "lowerBack", "shoulders"],
    durationSec: 45,
    perSide: false,
    instructionsHe: "שב על העקבים, השתטח קדימה עם ידיים מושטות רחוק, והנח את המצח על הרצפה.",
  },
  {
    id: "lat-side-reach",
    imageSource: "Standing_Lateral_Stretch",
    nameHe: "מתיחת צד ורחב גבי",
    muscles: ["lats", "upperBack"],
    durationSec: 30,
    perSide: true,
    instructionsHe: "הרם יד מעל הראש והישען הצידה לכיוון הנגדי, כאילו מנסים להאריך את הצלעות.",
  },
  {
    id: "cross-shoulder",
    imageSource: "Shoulder_Stretch",
    nameHe: "מתיחת כתף חוצה גוף",
    muscles: ["shoulders", "upperBack"],
    durationSec: 30,
    perSide: true,
    instructionsHe: "הצלב יד ישרה מול החזה ומשוך אותה בעדינות אל הגוף עם היד השנייה.",
  },
  {
    id: "overhead-triceps",
    imageSource: "Triceps_Stretch",
    nameHe: "מתיחת יד אחורית מעל הראש",
    muscles: ["triceps", "lats"],
    durationSec: 30,
    perSide: true,
    instructionsHe: "הרם מרפק מעל הראש והורד את כף היד אל בין השכמות; משוך את המרפק בעדינות עם היד השנייה.",
  },
  {
    id: "prayer-forearms",
    nameHe: "מתיחת אמות בתפילה הפוכה",
    muscles: ["forearms"],
    durationSec: 30,
    perSide: false,
    instructionsHe: "הצמד כפות ידיים מול החזה עם אצבעות למטה, והרם את המרפקים עד מתיחה באמות.",
  },
  {
    id: "cobra",
    nameHe: "מתיחת בטן בשכיבה (קוברה)",
    muscles: ["abs", "hipFlexors", "chest"],
    durationSec: 30,
    perSide: false,
    instructionsHe: "שכב על הבטן ודחוף את החזה מעלה עם הידיים, כשהאגן נשאר על הרצפה.",
  },
  {
    id: "knees-to-chest",
    imageSource: "Hug_Knees_To_Chest",
    nameHe: "חיבוק ברכיים לחזה",
    muscles: ["lowerBack", "glutes"],
    durationSec: 40,
    perSide: false,
    instructionsHe: "שכב על הגב, חבק את שתי הברכיים אל החזה והתנדנד בעדינות מצד לצד.",
  },
  {
    id: "upper-back-hug",
    nameHe: "חיבוק עצמי לגב עליון",
    muscles: ["upperBack", "shoulders"],
    durationSec: 30,
    perSide: false,
    instructionsHe: "חבק את עצמך חזק, אחוז בשכמות, והורד את הסנטר לחזה תוך נשיפה איטית.",
  },
];
