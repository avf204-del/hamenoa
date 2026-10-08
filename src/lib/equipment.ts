// קטלוג הציוד — סלאגים קנוניים ותוויות עברית לממשק.
// Exercise.equipment ו-LocationProfile.equipment משתמשים בסלאגים האלה בלבד.

export type EquipmentSlug =
  | "barbell"
  | "rack"
  | "bench"
  | "dumbbells"
  | "kettlebells"
  | "pullup-bar"
  | "dip-station"
  | "cable"
  | "jump-rope"
  | "rower"
  | "box"
  | "bands"
  | "straps"
  | "chair"
  | "nordic-bench"
  | "plyo-blocks"
  // Strength and cardio machines supported by the active catalog.
  | "leg-press-machine"
  | "hack-squat-machine"
  | "smith-machine"
  | "leg-extension-machine"
  | "leg-curl-machine"
  | "adductor-machine"
  | "abductor-machine"
  | "chest-press-machine"
  | "pec-deck"
  | "shoulder-press-machine"
  | "row-machine"
  | "ab-crunch-machine"
  | "calf-machine"
  | "back-extension-bench"
  | "treadmill"
  | "exercise-bike"
  | "elliptical"
  | "stair-climber";

export const EQUIPMENT_LABELS: Record<EquipmentSlug, string> = {
  barbell: "מוט וצלחות",
  rack: "כלוב סקוואט",
  bench: "ספסל",
  dumbbells: "משקולות יד",
  kettlebells: "קטלבלים",
  "pullup-bar": "מוט מתח",
  "dip-station": "מקבילים",
  cable: "מתקן כבלים",
  "jump-rope": "חבל קפיצה",
  rower: "מכונת חתירה",
  box: "תיבת קפיצה",
  bands: "גומיות התנגדות",
  straps: "רצועות אימון",
  chair: "משטח יציב (כיסא/ספסל)",
  "nordic-bench": "מתקן נורדי עם עיגון קרסוליים",
  "plyo-blocks": "זוג משטחי ניתור נמוכים",
  "leg-press-machine": "מכונת לחיצת רגליים",
  "hack-squat-machine": "מכונת האק סקוואט",
  "smith-machine": "מכונת סמית'",
  "leg-extension-machine": "מכונת יישור ברכיים",
  "leg-curl-machine": "מכונת כפיפת ברכיים",
  "adductor-machine": "מכונת קירוב ירכיים",
  "abductor-machine": "מכונת הרחקת ירכיים",
  "chest-press-machine": "מכונת לחיצת חזה",
  "pec-deck": "מכונת פרפר",
  "shoulder-press-machine": "מכונת לחיצת כתפיים",
  "row-machine": "מכונת חתירה בישיבה",
  "ab-crunch-machine": "מכונת כפיפות בטן",
  "calf-machine": "מכונת הרמת עקבים",
  "back-extension-bench": "מתקן יישור גב",
  treadmill: "הליכון",
  "exercise-bike": "אופני כושר",
  elliptical: "אליפטיקל",
  "stair-climber": "מכונת מדרגות",
};

/** English equipment names (C1); same slugs. */
export const EQUIPMENT_LABELS_EN: Record<EquipmentSlug, string> = {
  barbell: "Barbell & plates",
  rack: "Squat rack",
  bench: "Bench",
  dumbbells: "Dumbbells",
  kettlebells: "Kettlebells",
  "pullup-bar": "Pull-up bar",
  "dip-station": "Dip station",
  cable: "Cable machine",
  "jump-rope": "Jump rope",
  rower: "Rowing machine",
  box: "Plyo box",
  bands: "Resistance bands",
  straps: "Suspension straps",
  chair: "Stable surface (chair/bench)",
  "nordic-bench": "Nordic bench with ankle anchor",
  "plyo-blocks": "Pair of low plyo blocks",
  "leg-press-machine": "Leg press machine",
  "hack-squat-machine": "Hack squat machine",
  "smith-machine": "Smith machine",
  "leg-extension-machine": "Leg extension machine",
  "leg-curl-machine": "Leg curl machine",
  "adductor-machine": "Adductor machine",
  "abductor-machine": "Abductor machine",
  "chest-press-machine": "Chest press machine",
  "pec-deck": "Pec deck",
  "shoulder-press-machine": "Shoulder press machine",
  "row-machine": "Seated row machine",
  "ab-crunch-machine": "Ab crunch machine",
  "calf-machine": "Calf raise machine",
  "back-extension-bench": "Back extension bench",
  treadmill: "Treadmill",
  "exercise-bike": "Exercise bike",
  elliptical: "Elliptical",
  "stair-climber": "Stair climber",
};

export function equipmentLabel(slug: string, locale: "he" | "en" = "he"): string {
  const table: Record<string, string> = locale === "en" ? EQUIPMENT_LABELS_EN : EQUIPMENT_LABELS;
  return table[slug] ?? slug;
}

// פרופיל חדר כושר מסחרי סטנדרטי (החלטה 3 ב-docs/DECISIONS.md).
// chair נכלל כי בחדר כושר תמיד יש משטח יציב (ספסל/תיבה) לתרגילי תמיכה.
/** Fixed strength machines in the active gym catalog; each is its own station. */
export const STRENGTH_MACHINE_EQUIPMENT: EquipmentSlug[] = [
  "leg-press-machine", "hack-squat-machine", "smith-machine", "leg-extension-machine",
  "leg-curl-machine", "adductor-machine", "abductor-machine", "chest-press-machine",
  "pec-deck", "shoulder-press-machine", "row-machine", "ab-crunch-machine",
  "calf-machine", "back-extension-bench",
];

export const GYM_EQUIPMENT: EquipmentSlug[] = [
  "barbell",
  "rack",
  "bench",
  "dumbbells",
  "kettlebells",
  "pullup-bar",
  "dip-station",
  "cable",
  "jump-rope",
  "rower",
  "box",
  "chair",
  ...STRENGTH_MACHINE_EQUIPMENT,
  "exercise-bike",
  "treadmill",
  "elliptical",
  "stair-climber",
];

/** Gym exclusions apply to persisted, custom, and professional inventories too.
 * Other locations and the global catalog retain these equipment slugs. */
export function filterGymEquipment(equipment: readonly string[]): string[] {
  return equipment.filter((item) => item !== "bands" && item !== "straps");
}

/** Old standard gym profiles have no provenance flag. Recognize the exact
 * historical default before filtering; custom lists never gain machines. */
export function expandedGymEquipment(equipment: readonly string[]): string[] {
  const legacy = [
    ...GYM_EQUIPMENT.filter((item) => !STRENGTH_MACHINE_EQUIPMENT.includes(item) || item === "chest-press-machine"),
    "bands", "straps",
  ];
  const current = new Set(equipment);
  return current.size === legacy.length && legacy.every((item) => current.has(item))
    ? [...GYM_EQUIPMENT] : filterGymEquipment(equipment);
}

/** Specialized equipment must be explicitly present, never inferred from a chair. */
export const SPECIALIST_EQUIPMENT_STATIONS = {
  "nordic-bench": "fixed",
  "plyo-blocks": "portable",
} as const;
export const SPECIALIST_EQUIPMENT_OPTIONS: EquipmentSlug[] = ["nordic-bench", "plyo-blocks"];

// Preserve legacy profile defaults; specialized equipment is opt-in only.
export const DEFAULT_HOME_EQUIPMENT: EquipmentSlug[] = [
  "dumbbells",
  "pullup-bar",
  "chair",
  "bands",
  "straps",
];

// Home setup and API validation offer these without preselecting specialty gear.
export const HOME_EQUIPMENT_OPTIONS: EquipmentSlug[] = [
  ...DEFAULT_HOME_EQUIPMENT,
  'dip-station',
  ...SPECIALIST_EQUIPMENT_OPTIONS,
];

// גן כושר (החלטה 24): מתקני חוץ ציבוריים קבועים בלבד — לא ציוד שמביאים
// מהבית. chair = ספסל הפארק ("משטח יציב"), והוא שפותח סטפ-אפ, דיפים על
// ספסל ושכמותם. תרגילי הצבר הפתוח (muscle-up, l-sit ועוד) חיים על
// pullup-bar/dip-station הקיימים.
export const PARK_EQUIPMENT: EquipmentSlug[] = [
  "pullup-bar",
  "dip-station",
  "chair",
];
