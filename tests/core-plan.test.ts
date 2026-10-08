// The planner, against the real exercise catalog.

import { describe, expect, it } from "vitest";
import { DEFAULT_MINUTES, MINUTE_CHOICES } from "../src/components/workout/choices";
import { isEligible, planWorkout, PlanError, type PlanRequest } from "../src/core/plan";
import { WALKING_INFO_KEY } from "../src/lib/walking";
import { realCatalog } from "./catalog-fixture";

const exercises = realCatalog();
const request = (overrides: Partial<PlanRequest> = {}): PlanRequest => ({
  minutes: 25,
  place: "home",
  equipment: [],
  exercises,
  seed: "seed-1",
  ...overrides,
});

describe("בניית אימון", () => {
  it("אותה בקשה ואותו seed בונים בדיוק אותו אימון; seed אחר בונה אחר", () => {
    expect(planWorkout(request())).toEqual(planWorkout(request()));
    const a = planWorkout(request()).stations.flatMap((s) => s.exercises.map((e) => e.slug));
    const b = planWorkout(request({ seed: "seed-2" })).stations.flatMap((s) => s.exercises.map((e) => e.slug));
    expect(a).not.toEqual(b);
  });

  it("בית בלי ציוד, 25 דקות: חימום, שלוש תחנות של שלושה תרגילים שונים, שחרור", () => {
    const workout = planWorkout(request());
    expect(workout.stations).toHaveLength(3);
    const slugs = workout.stations.flatMap((s) => s.exercises.map((e) => e.slug));
    expect(new Set(slugs).size).toBe(9);
    for (const station of workout.stations) {
      expect(station.exercises).toHaveLength(3);
      expect(station.exercises.every((e) => e.unit === "reps" && e.load === null && e.quota >= 4 && e.quota <= 6)).toBe(true);
      expect(station).toMatchObject({ game: "G18", frameSec: 300, restSec: 10, roundRestSec: 20 });
    }
    expect(workout.warmup.length).toBeGreaterThanOrEqual(2);
    expect(workout.cooldown.length).toBeGreaterThanOrEqual(2);
    expect(workout.warmup[0].key).toBe(WALKING_INFO_KEY);
  });

  it("אין תרגיל שדורש ציוד שלא סומן כזמין", () => {
    const bySlug = new Map(exercises.map((e) => [e.slug, e]));
    for (const equipment of [[], ["chair"], ["pullup-bar", "dip-station", "chair"]]) {
      for (const seed of ["a", "b", "c", "d"]) {
        const workout = planWorkout(request({ equipment, seed, minutes: 45 }));
        for (const exercise of workout.stations.flatMap((s) => s.exercises)) {
          const data = bySlug.get(exercise.slug)!;
          expect(data.equipment.every((item) => equipment.includes(item))).toBe(true);
          expect(isEligible(data, { equipment })).toBe(true);
        }
      }
    }
  });

  it("רק תרגילים מוכרים ונשלטים במשקל גוף: בלי קפיצות, בלי החזקות, בלי עומס חיצוני", () => {
    const bySlug = new Map(exercises.map((e) => [e.slug, e]));
    for (let i = 0; i < 30; i++) {
      const workout = planWorkout(request({ seed: `s${i}`, minutes: 45, equipment: ["chair", "pullup-bar", "bands", "straps", "dumbbells"] }));
      for (const exercise of workout.stations.flatMap((s) => s.exercises)) {
        const data = bySlug.get(exercise.slug)!;
        expect(data.loadClass).toBe("bodyweight");
        expect(data.skillLevel).toBeLessThanOrEqual(2);
        expect(exercise.slug).not.toMatch(/jump|burpee|plank|-hold$|wall-sit/);
      }
    }
  });

  it("מספר התחנות נקבע לפי הזמן, והאומדן אינו חורג מהבקשה", () => {
    const counts = [12, 15, 20, 25, 30, 45, 60].map((minutes) => {
      const workout = planWorkout(request({ minutes }));
      expect(workout.estimatedSec).toBeLessThanOrEqual(minutes * 60);
      return workout.stations.length;
    });
    expect(counts).toEqual([1, 1, 2, 3, 4, 4, 4]);
  });

  it("כל משך שמוצע במסך הבית בונה אימון באורך שביקשו, בלי הערת קיצור", () => {
    expect(MINUTE_CHOICES).toContain(DEFAULT_MINUTES);
    const built = MINUTE_CHOICES.map((minutes) => {
      const workout = planWorkout(request({ minutes }));
      expect(workout.notes).toEqual([]);
      expect(minutes * 60 - workout.estimatedSec).toBeLessThan(4 * 60);
      return workout.stations.length;
    });
    expect(built).toEqual([1, 2, 3, 4]);
  });

  it("כשהאימון קצר בהרבה מהבקשה, זה נאמר במפורש", () => {
    expect(planWorkout(request({ minutes: 25 })).notes).toEqual([]);
    const long = planWorkout(request({ minutes: 60 }));
    expect(long.notes).toHaveLength(1);
    expect(long.notes[0].he).toContain("קצר מהזמן שביקשת");
  });

  it("תרגילים מהאימונים האחרונים נבחרים אחרונים", () => {
    const first = planWorkout(request());
    const recent = first.stations.flatMap((s) => s.exercises.map((e) => e.slug));
    const second = planWorkout(request({ recent }));
    const again = second.stations.flatMap((s) => s.exercises.map((e) => e.slug)).filter((slug) => recent.includes(slug));
    expect(again).toEqual([]);
  });

  it("משחקון ששוחק בעבר חוזר ראשון בדיוק כפי שהיה, כדי שתהיה תוצאה לנצח", () => {
    const earlier = planWorkout(request()).stations[1];
    const recent = planWorkout(request()).stations.flatMap((s) => s.exercises.map((e) => e.slug));
    const workout = planWorkout(request({ seed: "another-day", rematch: [earlier], recent }));
    expect(workout.stations).toHaveLength(3);
    expect(workout.stations[0]).toEqual({ ...earlier, id: "s1" });
    expect(workout.stations[0].compareKey).toBe(earlier.compareKey);
    // שאר התחנות חדשות, בלי תרגילים מהמשחקון שחזר
    const back = new Set(earlier.exercises.map((e) => e.slug));
    const rest = workout.stations.slice(1).flatMap((s) => s.exercises.map((e) => e.slug));
    expect(rest.filter((slug) => back.has(slug))).toEqual([]);
    expect(new Set(rest).size).toBe(6);
  });

  it("באימון של משחקון אחד, משחקון חוזר ומשחקון חדש מתחלפים", () => {
    const earlier = planWorkout(request({ minutes: 12 })).stations[0];
    const back = planWorkout(request({ minutes: 12, seed: "day-2", rematch: [earlier] }));
    expect(back.stations.map((s) => s.compareKey)).toEqual([earlier.compareKey]);
    // אחרי אימון שכולו משחקון חוזר, האימון הקצר הבא מקבל משחקון חדש
    const fresh = planWorkout(request({ minutes: 12, seed: "day-3", rematch: [earlier], lastWasLoneRematch: true }));
    expect(fresh.stations).toHaveLength(1);
    expect(fresh.stations[0].compareKey).not.toBe(earlier.compareKey);
    // באימון ארוך יותר המשחקון החוזר נשאר, כי יש לצידו משחקונים חדשים
    const longer = planWorkout(request({ minutes: 25, seed: "day-3", rematch: [earlier], lastWasLoneRematch: true }));
    expect(longer.stations[0].compareKey).toBe(earlier.compareKey);
  });

  it("משחקון שהציוד שלו לא זמין היום אינו חוזר", () => {
    const withChair = planWorkout(request({ equipment: ["chair"], seed: "chair-day" }));
    const needsChair = withChair.stations.find((s) =>
      s.exercises.some((e) => exercises.find((x) => x.slug === e.slug)!.equipment.includes("chair")),
    );
    expect(needsChair).toBeDefined();
    const today = planWorkout(request({ equipment: [], rematch: [needsChair!] }));
    expect(today.stations.map((s) => s.compareKey)).not.toContain(needsChair!.compareKey);
  });

  it("מפתח ההשוואה משתנה כשמשתנים התרגילים או התנאים, ורק אז", () => {
    const [a, b] = [planWorkout(request()), planWorkout(request())];
    expect(a.stations[0].compareKey).toBe(b.stations[0].compareKey);
    expect(a.stations[0].compareKey).not.toBe(a.stations[1].compareKey);
    expect(a.stations[0].compareKey).toContain("G18v1");
  });

  it("זמן לא תקין או מאגר ריק נדחים בקוד שגיאה ברור", () => {
    expect(() => planWorkout(request({ minutes: 11 }))).toThrow(PlanError);
    expect(() => planWorkout(request({ minutes: 120 }))).toThrow(PlanError);
    expect(() => planWorkout(request({ minutes: 20.5 }))).toThrowError("minutes");
    expect(() => planWorkout(request({ exercises: [] }))).toThrowError("no-exercises");
  });
});
