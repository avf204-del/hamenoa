// G18, fixed rounds: what comes next, how much rest, and what the score is.

import { describe, expect, it } from "vitest";
import type { Report, Station } from "../src/core/contract";
import { compareScores } from "../src/core/games";
import { G18 } from "../src/core/games/g18";

const station: Station = {
  id: "s1",
  game: "G18",
  ruleVersion: 1,
  exercises: [
    { slug: "air-squat", name: { he: "סקוואט", en: "Air squat" }, quota: 6, unit: "reps", load: null },
    { slug: "wall-pushup", name: { he: "שכיבות סמיכה על קיר", en: "Wall push-up" }, quota: 4, unit: "reps", load: null },
    { slug: "glute-bridge", name: { he: "גשר אגן", en: "Glute bridge" }, quota: 6, unit: "reps", load: null },
  ],
  frameSec: 300,
  restSec: 10,
  roundRestSec: 20,
  compareKey: "test",
};

/** Feed amounts through the rule the way the run does, one portion at a time. */
function play(amounts: (number | null)[]): Report[] {
  const reports: Report[] = [];
  for (const amount of amounts) {
    const portion = G18.next(station, reports)!;
    reports.push({ exerciseIndex: portion.exerciseIndex, target: portion.target, amount, startedAt: 0, at: 0 });
  }
  return reports;
}

describe("G18 — סבב תרגילים קבוע", () => {
  it("פותח בתרגיל הראשון, במכסה המלאה, בסבב 1", () => {
    expect(G18.next(station, [])).toEqual({ exerciseIndex: 0, target: 6, round: 1 });
    expect(G18.score(station, []).rank).toEqual([0, 0, 0]);
    expect(G18.restAfter(station, [])).toBe(0);
  });

  it("מכסה מלאה מעבירה לתרגיל הבא עם מנוחת מעבר", () => {
    const reports = play([6]);
    expect(G18.next(station, reports)).toEqual({ exerciseIndex: 1, target: 4, round: 1 });
    expect(G18.restAfter(station, reports)).toBe(10);
    expect(G18.score(station, reports).rank).toEqual([0, 1, 0]);
  });

  it("סבב נספר רק כשכל המכסות מלאות, ואחריו מנוחת סוף סבב", () => {
    const reports = play([6, 4, 6]);
    expect(G18.score(station, reports).rank).toEqual([1, 0, 0]);
    expect(G18.score(station, reports).value).toBe(1);
    expect(G18.restAfter(station, reports)).toBe(20);
    expect(G18.next(station, reports)).toEqual({ exerciseIndex: 0, target: 6, round: 2 });
  });

  it("מנה חלקית משאירה את אותו תרגיל פתוח עם היתרה בלבד", () => {
    const reports = play([4]);
    expect(G18.next(station, reports)).toEqual({ exerciseIndex: 0, target: 2, round: 1 });
    expect(G18.score(station, reports).rank).toEqual([0, 0, 4]);
    // השלמת היתרה סוגרת את התרגיל
    expect(G18.next(station, play([4, 2]))).toEqual({ exerciseIndex: 1, target: 4, round: 1 });
  });

  it("אפס הוא דיווח אמיתי: לא מקדם ולא נמחק", () => {
    const reports = play([0]);
    expect(G18.next(station, reports)).toEqual({ exerciseIndex: 0, target: 6, round: 1 });
    expect(G18.restAfter(station, reports)).toBe(10);
  });

  it("כמות לא ידועה ממשיכה הלאה, אבל הסבב שלה לא נספר כמלא", () => {
    const reports = play([6, null, 6]);
    expect(G18.score(station, reports).rank).toEqual([0, 0, 0]);
    // הסבב הבא יכול להיספר
    expect(G18.score(station, play([6, null, 6, 6, 4, 6])).rank).toEqual([1, 0, 0]);
  });

  it("הדוגמה מטבלת המשחקונים: סבב מלא, סקוואט מלא ו-2 מתוך 4 קיר", () => {
    const score = G18.score(station, play([6, 4, 6, 6, 2]));
    expect(score.rank).toEqual([1, 1, 2]);
    expect(score.text.he).toBe("סבב אחד · ועוד תרגיל אחד ו־2 חזרות");
  });

  it("השוואה: יותר סבבים מנצח, ובשוויון התקדמות בסבב הבא", () => {
    const one = G18.score(station, play([6, 4, 6]));
    const onePlus = G18.score(station, play([6, 4, 6, 6]));
    const two = G18.score(station, play([6, 4, 6, 6, 4, 6]));
    expect(compareScores(two, onePlus)).toBeLessThan(0);
    expect(compareScores(one, onePlus)).toBeGreaterThan(0);
    expect(compareScores(one, one)).toBe(0);
  });
});
