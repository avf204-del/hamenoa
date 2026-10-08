// קבוצות שריר לתצוגה — מסך הסטטוס (החלטה 25/27 סעיף ו).
//
// המקור: Exercise.primaryMuscles / secondaryMuscles (אוצר המילים של
// free-exercise-db — ראה scripts/import-exercises.ts). המודול הזה טהור
// וממפה את אוצר המילים הגולמי (אנגלית, לפי snapshot) ל-9 קבוצות עבריות
// גסות שמתאימות לתצוגה למשתמש שאינו קרוספיטר. תרגיל בלי נתוני שרירים
// (רשומה מקורית, DECISIONS סעיף 13) נופל לניחוש גס לפי דפוס התנועה שלו.

import type { Pattern } from "@/catalog/types";

export type MuscleGroupSlug =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "core"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves";

/** הסדר הקנוני להצגה + השם העברי של כל קבוצה */
export const MUSCLE_GROUPS: { slug: MuscleGroupSlug; nameHe: string }[] = [
  { slug: "chest", nameHe: "חזה" },
  { slug: "back", nameHe: "גב" },
  { slug: "shoulders", nameHe: "כתפיים" },
  { slug: "arms", nameHe: "זרועות" },
  { slug: "core", nameHe: "ליבה" },
  { slug: "glutes", nameHe: "ישבן" },
  { slug: "quads", nameHe: "ירך קדמית" },
  { slug: "hamstrings", nameHe: "ירך אחורית" },
  { slug: "calves", nameHe: "שוקיים" },
];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroupSlug, string> =
  Object.fromEntries(MUSCLE_GROUPS.map((g) => [g.slug, g.nameHe])) as Record<
    MuscleGroupSlug,
    string
  >;

/** English twin of the group names (C1). */
export const MUSCLE_GROUP_LABELS_EN: Record<MuscleGroupSlug, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  core: "Core",
  glutes: "Glutes",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
};

/** A group's display name in the reader's language. */
export function muscleGroupLabel(slug: MuscleGroupSlug, locale: "he" | "en" = "he"): string {
  return (locale === "en" ? MUSCLE_GROUP_LABELS_EN : MUSCLE_GROUP_LABELS)[slug];
}

// אוצר המילים הגולמי של free-exercise-db (16 מחרוזות קיימות ב-snapshot +
// "neck" שקיימת באוצר המילים של הספרייה גם אם לא הופיעה אצלנו עדיין) —
// כל מפתח באותיות קטנות, כפי שמגיע מה-JSON.
const MUSCLE_TO_GROUP: Record<string, MuscleGroupSlug> = {
  chest: "chest",
  lats: "back",
  "middle back": "back",
  "lower back": "back",
  traps: "back",
  shoulders: "shoulders",
  neck: "shoulders",
  biceps: "arms",
  triceps: "arms",
  forearms: "arms",
  abdominals: "core",
  glutes: "glutes",
  abductors: "glutes",
  adductors: "glutes",
  quadriceps: "quads",
  hamstrings: "hamstrings",
  calves: "calves",
};

/** אוצר המילים המוכר — לוולידציה של דריסות ידניות ב-tagging.yaml */
export const MUSCLE_VOCABULARY: string[] = Object.keys(MUSCLE_TO_GROUP);

/** ניחוש גס כשאין נתוני שרירים אמיתיים (רשומה מקורית, source: null) */
const PATTERN_FALLBACK: Record<Pattern, MuscleGroupSlug[]> = {
  squat: ["quads", "glutes"],
  hinge: ["hamstrings", "back", "glutes"],
  pushV: ["shoulders", "arms"],
  pushH: ["chest", "arms"],
  pullV: ["back", "arms"],
  pullH: ["back", "arms"],
  lunge: ["quads", "glutes"],
  carry: ["arms", "core", "back"],
  core: ["core"],
  locomotion: ["calves", "quads"],
};

/** ממפה מחרוזת שריר גולמית לקבוצה שלה; לא מוכר / לא מחרוזת → null */
export function muscleToGroup(raw: unknown): MuscleGroupSlug | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase();
  return MUSCLE_TO_GROUP[key] ?? null;
}

function toMuscleArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function mapToGroups(raw: unknown): MuscleGroupSlug[] {
  const mapped = toMuscleArray(raw)
    .map(muscleToGroup)
    .filter((g): g is MuscleGroupSlug => g !== null);
  return dedupe(mapped);
}

export interface ExerciseMuscleInput {
  /** Exercise.primaryMuscles כפי שמגיע מ-Prisma (Json | null) */
  primaryMuscles?: unknown;
  /** Exercise.secondaryMuscles כפי שמגיע מ-Prisma (Json | null) */
  secondaryMuscles?: unknown;
  pattern: Pattern;
}

export interface ExerciseMuscleGroups {
  primary: MuscleGroupSlug[];
  secondary: MuscleGroupSlug[];
}

/**
 * קבוצות השריר של תרגיל, מנתוני primaryMuscles/secondaryMuscles כשיש
 * (עם דה-דופ וללא חפיפה בין ראשי למשני — קבוצה שכבר ראשית לא חוזרת
 * כמשנית), ונפילה לניחוש גס לפי דפוס כשאין נתונים אמיתיים בכלל.
 */
export function groupsForExercise(
  input: ExerciseMuscleInput,
): ExerciseMuscleGroups {
  const primary = mapToGroups(input.primaryMuscles);
  const secondaryAll = mapToGroups(input.secondaryMuscles);
  const secondary = secondaryAll.filter((g) => !primary.includes(g));

  if (primary.length === 0 && secondary.length === 0) {
    return { primary: PATTERN_FALLBACK[input.pattern] ?? [], secondary: [] };
  }

  return { primary, secondary };
}

/**
 * אותן קבוצות כרשימה שטוחה אחת — הראשיות תחילה ואז המשניות (בלי חפיפה,
 * כמו ב-groupsForExercise). זו הצורה שהמנוע צורך: ‏ExerciseData.muscleGroups
 * (סבב 36, D-5) מחושב פעם אחת באדפטר שיש לו את נתוני המסד, והמנוע עצמו רק
 * קורא אותו. האיבר הראשון הוא הקבוצה הראשית של התרגיל — עליה נשענת
 * מחזוריות השרירים ב-src/engine/muscle-cycle.ts.
 */
export function muscleGroupList(
  input: ExerciseMuscleInput,
): MuscleGroupSlug[] {
  const { primary, secondary } = groupsForExercise(input);
  return [...primary, ...secondary];
}
