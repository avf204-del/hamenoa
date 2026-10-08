// בדיקות מאגר התרגילים (אבן דרך 1):
// "אפס תרגילים עם תיוג חסר" נאכף כאן — הבדיקה נכשלת על כל שדה חסר,
// הפניה שבורה, ציוד לא מוכר, או תרגיל שלא ניתן לביצוע באף פרופיל.

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import {
  loadSnapshot,
  loadTagging,
  validateTagging,
} from "../scripts/import-exercises";
import { GYM_EQUIPMENT, HOME_EQUIPMENT_OPTIONS, SPECIALIST_EQUIPMENT_OPTIONS } from "../src/lib/equipment";
import type { Pattern } from "../src/catalog/types";
import { isCatalogOnly } from "../src/catalog/workout-policy";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const tagging = loadTagging();
const snapshot = loadSnapshot();
const snapshotIds = new Set(snapshot.exercises.map((e) => e.id));
// Fixed historical inventory assertions describe the base catalog only. The
// shared validation above still checks every new training-type fragment.
const entries = Object.entries(tagging).filter(([slug, entry]) => (entry.trainingType ?? "base") === "base" && !isCatalogOnly(slug));

const ALL_PATTERNS: Pattern[] = [
  "squat", "hinge", "pushV", "pushH", "pullV", "pullH",
  "lunge", "carry", "core", "locomotion",
];

const EXPECTED_ORIGINALS = new Set([
  "kettlebell-swing", "pike-pushup", "suitcase-carry",
  "hollow-hold", "burpee", "jumping-jacks",
  // גל הרצועות והפארק (בקשת בעלים 24.8): ארבעה תרגילים שאינם במקור הפתוח
  "strap-assisted-squat", "strap-assisted-pistol", "strap-hamstring-curl", "l-sit",
  // פריט 7 (הרחבת המאגר): הליכה עם משקולת מעל הראש — אין חלופה במקור הפתוח לדפוס carry
  "dumbbell-overhead-carry",
  // סבב 34 (החלטת בעלים): כפיפות בטן עם שיפוע — אין רשומת decline sit-up במקור הפתוח
  "decline-situp",
  // סבב 40 (החלטת בעלים 16.9.2026 — הרחבת המאגר הביתי): 70 רשומות מקוריות
  // לתנועות משקל-גוף, גומיות ורצועות שאין להן רשומה במקור הפתוח
  // (ראה CREDITS.md, "הרחבת המאגר הביתי").
  "side-lying-leg-raise",
  "floor-back-extension",
  "wall-sit",
  "sumo-squat",
  "cossack-squat",
  "lateral-lunge",
  "bodyweight-reverse-lunge",
  "curtsy-lunge",
  "shrimp-squat",
  "standing-calf-raise",
  "single-leg-calf-raise",
  "bodyweight-good-morning",
  "bodyweight-single-leg-deadlift",
  "glute-bridge-march",
  "bodyweight-bulgarian-split-squat",
  "chair-pistol-squat",
  "wall-pushup",
  "knee-pushup",
  "archer-pushup",
  "hindu-pushup",
  "spiderman-pushup",
  "sphinx-pushup",
  "pseudo-planche-pushup",
  "wall-handstand-hold",
  "wall-walk",
  "elevated-pike-pushup",
  "prone-y-raise",
  "prone-t-raise",
  "superman-pull",
  "bird-dog",
  "hollow-rock",
  "plank-shoulder-tap",
  "plank-jack",
  "side-plank-hip-dip",
  "reverse-plank",
  "copenhagen-plank",
  "bear-plank-hold",
  "lying-windshield-wiper",
  "sit-through",
  "toe-touch-crunch",
  "cross-body-mountain-climber",
  "band-row",
  "band-lat-pulldown",
  "band-face-pull",
  "band-biceps-curl",
  "band-deadlift",
  "band-pallof-press",
  "band-woodchop",
  "band-thruster",
  "strap-biceps-curl",
  "strap-triceps-extension",
  "strap-chest-fly",
  "strap-y-fly",
  "strap-face-pull",
  "strap-pike",
  "strap-atomic-pushup",
  "strap-reverse-lunge",
  "strap-mountain-climber",
  "strap-plank",
  "strap-single-arm-row",
  "high-knees",
  "running-in-place",
  "step-jack",
  "lateral-shuffle",
  "bear-crawl",
  "crab-walk",
  "inchworm",
  "squat-thrust",
  "frog-jump",
  "jump-squat-180",
  // סבב 42 (docs/AEROBIC-WORKORDER.md, D-8; הוראת בעלים 16.9.2026):
  // "הליכה במקום" — אין רשומה כזו במקור הפתוח.
  "marching-in-place",
]);

describe("מאגר התרגילים — tagging.yaml", () => {
  it("אפס תיוג חסר: הוולידציה עוברת נקי", () => {
    expect(validateTagging(tagging, snapshotIds)).toEqual([]);
  });

  // היעד המקורי היה ~70 (SPEC סעיף 6); הבעלים ביקש הרחבות (כבלים 24.8,
  // רצועות ופארק 24.8, גל המכונות שממתין לאינטגרציה, וסבב שני 31.8 —
  // מוט, ספסל, קטלבל מתקדם וקרדיו) — הטווח עודכן בהתאם.
  // סבב 40 (16.9): +114 תרגילים ביתיים (משקל גוף, גומיות, רצועות) — 264.
  it("יש בין 65 ל-300 תרגילים", () => {
    expect(entries.length).toBeGreaterThanOrEqual(65);
    expect(entries.length).toBeLessThanOrEqual(300);
  });

  it("כל 10 דפוסי התנועה מכוסים, כל אחד עם 2 תרגילים לפחות", () => {
    for (const pattern of ALL_PATTERNS) {
      const count = entries.filter(([, e]) => e.pattern === pattern).length;
      expect(count, `דפוס ${pattern}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("כל ציוד בקטלוג נתמך בחדר כושר או בבית, עם החרגות חדר הכושר", () => {
    const gym = new Set<string>([...GYM_EQUIPMENT, ...SPECIALIST_EQUIPMENT_OPTIONS]);
    const home = new Set<string>(HOME_EQUIPMENT_OPTIONS);
    expect(gym.has("bands")).toBe(false);
    expect(gym.has("straps")).toBe(false);
    for (const [slug, e] of entries) {
      for (const eq of e.equipment) {
        expect(gym.has(eq) || home.has(eq), `${slug} דורש ציוד לא נתמך: ${eq}`).toBe(true);
        if (eq === "bands" || eq === "straps") expect(home.has(eq)).toBe(true);
      }
    }
  });

  it("לכל דפוס יש לפחות תרגיל אחד ברירת-מחדל ביתית", () => {
    const home = new Set<string>(HOME_EQUIPMENT_OPTIONS);
    for (const pattern of ALL_PATTERNS) {
      const doable = entries.filter(
        ([, e]) =>
          e.pattern === pattern && e.equipment.every((eq) => home.has(eq)),
      );
      expect(doable.length, `דפוס ${pattern} בבית`).toBeGreaterThanOrEqual(1);
    }
  });

  it("הרשומות המקוריות הן בדיוק השש שאושרו", () => {
    const originals = entries
      .filter(([, e]) => e.source === null)
      .map(([slug]) => slug)
      .sort();
    expect(originals).toEqual([...EXPECTED_ORIGINALS].sort());
  });

  it("עקיבות רישוי: ה-snapshot הוא Unlicense וכל מקור קיים בו", () => {
    expect(snapshot.license).toContain("Unlicense");
    for (const [slug, e] of entries) {
      if (e.source !== null) {
        expect(snapshotIds.has(e.source), `${slug}: ${e.source}`).toBe(true);
      }
    }
  });

  it("שרשראות סקיילינג: הגרסה הקלה קלה באמת, והקשה לא חלשה בשני הצירים", () => {
    const loadRank = { bodyweight: 0, light: 1, moderate: 2, heavy: 3 } as const;
    for (const [slug, e] of entries) {
      if (e.scalingEasier) {
        const easier = tagging[e.scalingEasier];
        expect(
          easier.skillLevel,
          `${slug} → ${e.scalingEasier}: מיומנות`,
        ).toBeLessThanOrEqual(e.skillLevel);
        expect(
          loadRank[easier.loadClass],
          `${slug} → ${e.scalingEasier}: עומס`,
        ).toBeLessThanOrEqual(loadRank[e.loadClass]);
      }
      if (e.scalingHarder) {
        const harder = tagging[e.scalingHarder];
        expect(
          harder.skillLevel >= e.skillLevel ||
            loadRank[harder.loadClass] >= loadRank[e.loadClass],
          `${slug} → ${e.scalingHarder}: הגרסה הקשה חלשה בשני הצירים`,
        ).toBe(true);
      }
    }
  });

  it("שרשראות סקיילינג: אין הפניה עצמית ואין קצה כפול מיותר", () => {
    for (const [slug, e] of entries) {
      expect(e.scalingEasier, slug).not.toBe(slug);
      expect(e.scalingHarder, slug).not.toBe(slug);
      if (e.scalingEasier && e.scalingHarder) {
        expect(e.scalingEasier).not.toBe(e.scalingHarder);
      }
    }
  });

  it("ההוראות בעברית: לכל תרגיל צעדים ממוספרים ורמז בטיחות", () => {
    for (const [slug, e] of entries) {
      expect(e.instructionsHe, slug).toMatch(/1\./);
      expect(e.instructionsHe, slug).toMatch(/2\./);
      expect(e.instructionsHe, slug).toMatch(/שים לב/);
    }
  });

  it("תיוג חד-צדדי: בדיוק התרגילים שסט שלם שלהם הוא צד אחד", () => {
    // לאנג'ים לסירוגין אינם unilateral — הצדדים מתחלפים באותו סט.
    // עליות מדרגה הוגדרו מחדש כחד-צדדיות בהכרעת בעלים 27.8 (החלטה 32):
    // כל החזרות על אותה רגל, ורק בסיום הסט מחליפים.
    const expected = [
      "bulgarian-split-squat", "cable-woodchop", "dumbbell-overhead-carry",
      "dumbbell-step-up",
      "kettlebell-arnold-press", "kettlebell-clean-and-jerk", "kettlebell-jerk",
      "kettlebell-push-press", "kettlebell-snatch", "kettlebell-windmill",
      "one-arm-dumbbell-row", "one-arm-kettlebell-row", "one-arm-kettlebell-swing",
      "pallof-press", "pistol-squat", "side-plank", "single-arm-pushup",
      "single-leg-deadlift", "single-leg-glute-bridge", "step-up",
      "strap-assisted-pistol",
      "strap-split-squat", "suitcase-carry", "turkish-getup",
      // סבב 40: חד-צדדיים חדשים (סט שלם לצד אחד ואז החלפה)
      "band-external-rotation",
      "band-hip-adduction",
      "band-hip-extension",
      "band-hip-flexion",
      "band-internal-rotation",
      "band-pallof-press",
      "band-woodchop",
      "bodyweight-bulgarian-split-squat",
      "bodyweight-single-leg-deadlift",
      "chair-pistol-squat",
      "copenhagen-plank",
      "glute-kickback",
      "oblique-crunch",
      "shrimp-squat",
      "side-jackknife",
      "side-lying-leg-raise",
      "side-plank-hip-dip",
      "single-leg-calf-raise",
      "single-leg-hop",
      "single-leg-lateral-hop",
      "single-leg-push-off",
      "strap-reverse-lunge",
      "strap-single-arm-row",
    ];
    const tagged = entries
      .filter(([, e]) => e.unilateral === true)
      .map(([slug]) => slug)
      .sort();
    expect(tagged).toEqual([...expected].sort());
    // השדה הוא רשות, ואם מופיע — רק true (אין unilateral: false מפורש)
    for (const [slug, e] of entries) {
      if ("unilateral" in e) expect(e.unilateral, slug).toBe(true);
    }
  });

  it("addedOn: לכל תרגיל תאריך הוספה בתבנית YYYY-MM-DD", () => {
    for (const [slug, e] of entries) {
      expect(e.addedOn, slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("שכבות מיומנות: יש תרגילים קלים (1-2) ומתקדמים (4-5)", () => {
    const easy = entries.filter(([, e]) => e.skillLevel <= 2).length;
    const advanced = entries.filter(([, e]) => e.skillLevel >= 4).length;
    expect(easy).toBeGreaterThanOrEqual(20);
    expect(advanced).toBeGreaterThanOrEqual(4);
  });

  // חוק הבסיס (docs/strength-model.md §9): loadExerciseData בונה את מאגר
  // התרגילים דרך Object.entries על ה-YAML המנותח, שמשמר את סדר הקובץ.
  // rng.ts (pick/shuffle) בוחר לפי index/length מספריים על המערך הזה —
  // כל תוספת למאגר שמשנה את ה-length של רשימת מועמדים מזיזה אילו
  // תרגילים *אחרים* נבחרים לאותו seed, גם כשהם לא קשורים לתרגיל החדש.
  // הדבר בלתי נמנע ברגע שרשומה חדשה זכאית לרשימת מועמדים כלשהי — אבל
  // הכנסתה *באמצע* הקובץ (לא בסופו) מזיזה גם את המיקום היחסי שלה בתוך
  // כל רשימת מועמדים מסוננת, ומרחיבה את ההשפעה למקרי בסיס נוספים בלי
  // שום סיבה. ראתה זאת בדיקת תאימות-לאחור בסבב 34: decline-situp הוכנס
  // מיד אחרי situp במקום בסוף הקובץ, והדבר הפיל 184/360 מקרי בסיס.
  // הבדיקה הזו אוכפת: כל מפתח שהוא באמת חדש בסבב הנוכחי חייב לשבת בקובץ
  // *אחרי* כל מפתח שכבר היה קיים. "כבר היה קיים" נמדד גם מול HEAD וגם מול
  // נקודת ההסתעפות מ-main: קומיט ביניים בתוך הסבב (למשל קומיט מיזוג) עלול
  // להחסיר רשומה ותיקה, ורשומה שמוחזרת למקומה המקורי אינה רשומה חדשה.
  // האיחוד לא מרכך את הנעילה — רשומה שלא קיימת באף אחד מהשניים עדיין חייבת
  // לשבת בסוף הקובץ.
  it("סדר הקובץ: תרגילים חדשים מתווספים בסוף הקובץ — לא באמצע", () => {
    const yamlAt = (rev: string): string | null => {
      try {
        return execFileSync("git", ["show", `${rev}:data/tagging.yaml`], {
          cwd: ROOT,
          encoding: "utf8",
        });
      } catch {
        return null;
      }
    };
    const branchPoint = (() => {
      try {
        return execFileSync("git", ["merge-base", "HEAD", "main"], {
          cwd: ROOT,
          encoding: "utf8",
        }).trim();
      } catch {
        return null;
      }
    })();
    const known = [yamlAt("HEAD"), branchPoint ? yamlAt(branchPoint) : null]
      .filter((text): text is string => text !== null);
    // אין גישה להיסטוריית git (למשל checkout רדוד) — מדלגים בשקט.
    if (!known.length) return;
    const headKeys = new Set(
      known.flatMap((text) => Object.keys(parse(text) as Record<string, unknown>)),
    );
    const currentKeys = Object.keys(tagging);
    const currentIndex = new Map(currentKeys.map((k, i) => [k, i]));
    const maxHeadIndex = Math.max(
      ...[...headKeys].map((k) => currentIndex.get(k) ?? -1),
    );
    const newKeys = currentKeys.filter((k) => !headKeys.has(k));
    for (const slug of newKeys) {
      expect(
        currentIndex.get(slug)!,
        `${slug} הוכנס לפני הסוף — מיקום ${currentIndex.get(slug)} קטן ממיקום הרשומה הקיימת האחרונה (${maxHeadIndex})`,
      ).toBeGreaterThan(maxHeadIndex);
    }
  });
});
