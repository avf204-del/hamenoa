// קבוצות שריר לתצוגה (החלטה 25/27 סעיף ו) — מיפוי אוצר המילים של
// free-exercise-db ל-9 קבוצות עבריות, כולל נפילה לניחוש לפי דפוס כשאין
// נתוני שרירים אמיתיים.

import { describe, expect, it } from "vitest";
import {
  MUSCLE_GROUPS,
  MUSCLE_VOCABULARY,
  groupsForExercise,
  muscleToGroup,
  type MuscleGroupSlug,
} from "../src/lib/muscle-groups";
import type { Pattern } from "../src/catalog/types";

const ALL_PATTERNS: Pattern[] = [
  "squat", "hinge", "pushV", "pushH", "pullV", "pullH",
  "lunge", "carry", "core", "locomotion",
];

describe("MUSCLE_GROUPS — 9 קבוצות קנוניות", () => {
  it("בדיוק 9 קבוצות, סלאגים ייחודיים", () => {
    expect(MUSCLE_GROUPS).toHaveLength(9);
    const slugs = MUSCLE_GROUPS.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(9);
  });

  it("לכל קבוצה יש שם עברי לא ריק", () => {
    for (const g of MUSCLE_GROUPS) {
      expect(g.nameHe.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("muscleToGroup — כל מילה באוצר המילים ממופה", () => {
  it("כל אחת מ-17 מחרוזות free-exercise-db ממופה לקבוצה קנונית", () => {
    // אוצר המילים הידוע (schema.prisma: Exercise.primaryMuscles) — נבדק כאן
    // מילה-מילה, לא רק דרך MUSCLE_VOCABULARY, כדי לתפוס רגרסיה בהגדרה עצמה
    const vocabulary = [
      "abdominals", "abductors", "adductors", "biceps", "calves", "chest",
      "forearms", "glutes", "hamstrings", "lats", "lower back",
      "middle back", "neck", "quadriceps", "shoulders", "traps", "triceps",
    ];
    const groupSlugs = new Set(MUSCLE_GROUPS.map((g) => g.slug));
    for (const muscle of vocabulary) {
      const group = muscleToGroup(muscle);
      expect(group, muscle).not.toBeNull();
      expect(groupSlugs.has(group as MuscleGroupSlug), muscle).toBe(true);
    }
    // אוצר המילים המיוצא תואם בדיוק — אין סטייה בין הרשימה למקור האמת
    expect([...MUSCLE_VOCABULARY].sort()).toEqual([...vocabulary].sort());
  });

  it("לא רגיש לרישיות ולרווחים מקיפים", () => {
    expect(muscleToGroup("Chest")).toBe("chest");
    expect(muscleToGroup("  glutes  ")).toBe("glutes");
    expect(muscleToGroup("LOWER BACK")).toBe("back");
  });

  it("קבוצת הגב מאחדת ארבעה שרירי מקור שונים", () => {
    expect(muscleToGroup("lats")).toBe("back");
    expect(muscleToGroup("middle back")).toBe("back");
    expect(muscleToGroup("lower back")).toBe("back");
    expect(muscleToGroup("traps")).toBe("back");
  });

  it("קבוצת הזרועות מאחדת שלושה שרירי מקור", () => {
    expect(muscleToGroup("biceps")).toBe("arms");
    expect(muscleToGroup("triceps")).toBe("arms");
    expect(muscleToGroup("forearms")).toBe("arms");
  });

  it("קבוצת הישבן מאחדת שלושה שרירי מקור", () => {
    expect(muscleToGroup("glutes")).toBe("glutes");
    expect(muscleToGroup("abductors")).toBe("glutes");
    expect(muscleToGroup("adductors")).toBe("glutes");
  });

  it("כתפיים ← shoulders + neck", () => {
    expect(muscleToGroup("shoulders")).toBe("shoulders");
    expect(muscleToGroup("neck")).toBe("shoulders");
  });
});

describe("muscleToGroup — מחרוזת לא מוכרת מחזירה null", () => {
  it("שריר לא קיים באוצר המילים", () => {
    expect(muscleToGroup("wings")).toBeNull();
    expect(muscleToGroup("obliques")).toBeNull();
    expect(muscleToGroup("")).toBeNull();
  });

  it("קלט שאינו מחרוזת מחזיר null בלי לזרוק", () => {
    expect(muscleToGroup(null)).toBeNull();
    expect(muscleToGroup(undefined)).toBeNull();
    expect(muscleToGroup(42)).toBeNull();
    expect(muscleToGroup(["chest"])).toBeNull();
  });
});

describe("groupsForExercise — נתוני שרירים אמיתיים", () => {
  it("ראשי בלבד ממופה נכון, משני ריק כשאין secondaryMuscles", () => {
    const result = groupsForExercise({
      primaryMuscles: ["chest"],
      secondaryMuscles: [],
      pattern: "pushH",
    });
    expect(result).toEqual({ primary: ["chest"], secondary: [] });
  });

  it("הפרדת ראשי/משני: קבוצה שכבר ראשית לא חוזרת כמשנית", () => {
    // בק-סקוואט: primary כולל quads+glutes; secondary מה-snapshot כולל
    // hamstrings+calves ו"glutes" חוזר — glutes כבר ראשי ולא אמור להופיע פעמיים
    const result = groupsForExercise({
      primaryMuscles: ["quadriceps", "glutes"],
      secondaryMuscles: ["hamstrings", "glutes", "calves"],
      pattern: "squat",
    });
    expect(result.primary).toEqual(["quads", "glutes"]);
    expect(result.secondary).toEqual(["hamstrings", "calves"]);
    expect(result.secondary).not.toContain("glutes");
  });

  it("דה-דופ בתוך הראשי: כמה שרירי מקור לאותה קבוצה → קבוצה אחת", () => {
    const result = groupsForExercise({
      primaryMuscles: ["lats", "traps", "middle back", "lower back"],
      secondaryMuscles: [],
      pattern: "pullV",
    });
    expect(result.primary).toEqual(["back"]);
  });

  it("דה-דופ בתוך המשני: כמה שרירי מקור לאותה קבוצה → קבוצה אחת", () => {
    const result = groupsForExercise({
      primaryMuscles: ["chest"],
      secondaryMuscles: ["biceps", "triceps", "forearms"],
      pattern: "pushH",
    });
    expect(result.secondary).toEqual(["arms"]);
  });

  it("שומר על סדר ההופעה הראשון של כל קבוצה", () => {
    const result = groupsForExercise({
      primaryMuscles: ["hamstrings", "glutes", "quadriceps"],
      secondaryMuscles: [],
      pattern: "hinge",
    });
    expect(result.primary).toEqual(["hamstrings", "glutes", "quads"]);
  });

  it("מחרוזות לא מוכרות ברשימת הקלט מסוננות בשקט", () => {
    const result = groupsForExercise({
      primaryMuscles: ["chest", "obliques"],
      secondaryMuscles: null,
      pattern: "pushH",
    });
    expect(result.primary).toEqual(["chest"]);
    expect(result.secondary).toEqual([]);
  });

  it("קלט שאינו מערך (undefined/null/מחרוזת בודדת) מטופל כאין-נתונים", () => {
    const result = groupsForExercise({
      primaryMuscles: undefined,
      secondaryMuscles: undefined,
      pattern: "core",
    });
    // אין נתונים אמיתיים בכלל → נופל לניחוש לפי הדפוס (core)
    expect(result).toEqual({ primary: ["core"], secondary: [] });
  });
});

describe("groupsForExercise — נפילה לניחוש לפי דפוס (אין נתוני שרירים)", () => {
  const FALLBACK_BY_PATTERN: Record<Pattern, MuscleGroupSlug[]> = {
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

  it.each(ALL_PATTERNS)("דפוס %s נופל לקבוצות הצפויות", (pattern) => {
    const result = groupsForExercise({
      primaryMuscles: null,
      secondaryMuscles: null,
      pattern,
    });
    expect(result.primary).toEqual(FALLBACK_BY_PATTERN[pattern]);
    expect(result.secondary).toEqual([]);
  });

  it("נתוני שרירים אמיתיים (גם אם רק משני) גוברים על הניחוש", () => {
    const result = groupsForExercise({
      primaryMuscles: [],
      secondaryMuscles: ["calves"],
      pattern: "squat",
    });
    // יש דגימה אמיתית (משני) — לא נופל לניחוש הדפוס (quads+glutes)
    expect(result).toEqual({ primary: [], secondary: ["calves"] });
  });
});
