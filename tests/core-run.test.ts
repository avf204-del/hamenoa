// The run: a plan plus ordered events gives one view, at any moment.

import { describe, expect, it } from "vitest";
import { COUNTDOWN_SEC, type RunEvent, type RunEventInput, type Workout } from "../src/core/contract";
import { accept, impliedEvents, replay } from "../src/core/run";

const workout: Workout = {
  contract: 1,
  seed: "test",
  place: "home",
  requestedMin: 25,
  warmup: [{ key: "drill:walking-easy", name: { he: "תנועה קלה", en: "Easy movement" }, instruction: { he: "", en: "" }, seconds: 60 }],
  stations: ["s1", "s2"].map((id) => ({
    id,
    game: "G18" as const,
    ruleVersion: 1,
    exercises: [
      { slug: "air-squat", name: { he: "סקוואט", en: "Air squat" }, quota: 6, unit: "reps" as const, load: null },
      { slug: "wall-pushup", name: { he: "קיר", en: "Wall push-up" }, quota: 4, unit: "reps" as const, load: null },
      { slug: "glute-bridge", name: { he: "גשר", en: "Glute bridge" }, quota: 6, unit: "reps" as const, load: null },
    ],
    frameSec: 300,
    restSec: 10,
    roundRestSec: 20,
    compareKey: id,
  })),
  cooldown: [{ key: "stretch:figure-four", name: { he: "מתיחה", en: "Stretch" }, instruction: { he: "", en: "" }, seconds: 40 }],
  estimatedSec: 800,
  notes: [],
};

const SEC = 1000;

/** Plays inputs at given times, failing loudly on a rejected one. */
function run(steps: [atSec: number, input: RunEventInput][]): RunEvent[] {
  let events: RunEvent[] = [];
  steps.forEach(([atSec, input], i) => {
    const result = accept(workout, events, input, `e${i}`, atSec * SEC);
    if (!result.ok) throw new Error(`step ${i} (${input.type}) rejected: ${result.reason}`);
    events = result.events;
  });
  return events;
}

const toStation: [number, RunEventInput][] = [
  [0, { type: "begin" }],
  [60, { type: "warmup-done" }],
];

describe("מהלך אימון", () => {
  it("מתחיל בתצוגה מקדימה, ועובר חימום ← תחנה מוכנה", () => {
    expect(replay(workout, [], 0).phase).toBe("preview");
    const view = replay(workout, run(toStation), 61 * SEC);
    expect(view.phase).toBe("station");
    expect(view.station).toMatchObject({ id: "s1", status: "ready", clockStartsAt: null });
    expect(view.station!.portion).toEqual({ exerciseIndex: 0, target: 6, round: 1 });
  });

  it("התחלת משחקון: ספירה 3-2-1, ואז השעון והמנה הראשונה מתחילים יחד", () => {
    const events = run([...toStation, [70, { type: "station-start", station: "s1" }]]);
    const start = (70 + COUNTDOWN_SEC) * SEC;
    expect(replay(workout, events, 71 * SEC).station).toMatchObject({ status: "countdown", clockStartsAt: start });
    const working = replay(workout, events, start + 1).station!;
    expect(working).toMatchObject({ status: "working", clockEndsAt: start + 300 * SEC, portionStartedAt: start });
  });

  it("דיווח ← מנוחה נדרשת ← המנה הבאה מתחילה רק בלחיצה", () => {
    const events = run([
      ...toStation,
      [70, { type: "station-start", station: "s1" }],
      [90, { type: "report", station: "s1", amount: 6 }],
    ]);
    const resting = replay(workout, events, 91 * SEC).station!;
    expect(resting).toMatchObject({ status: "resting", restEndsAt: 100 * SEC });
    expect(resting.portion).toEqual({ exerciseIndex: 1, target: 4, round: 1 });
    // גם אחרי שהמנוחה עברה, בלי לחיצה עדיין לא עובדים
    expect(replay(workout, events, 105 * SEC).station!.status).toBe("resting");

    const early = accept(workout, events, { type: "portion-start", station: "s1" }, "x", 95 * SEC);
    expect(early).toEqual({ ok: false, reason: "rest-not-over" });
    const onTime = accept(workout, events, { type: "portion-start", station: "s1" }, "x", 100 * SEC);
    expect(onTime.ok).toBe(true);
  });

  it("היעד אינו נרשם במקום המתאמן: כמות מעל היתרה או לא שלמה נדחית", () => {
    const events = run([...toStation, [70, { type: "station-start", station: "s1" }]]);
    const at = 80 * SEC;
    expect(accept(workout, events, { type: "report", station: "s1", amount: 7 }, "x", at)).toEqual({ ok: false, reason: "bad-amount" });
    expect(accept(workout, events, { type: "report", station: "s1", amount: 2.5 }, "x", at)).toEqual({ ok: false, reason: "bad-amount" });
    expect(accept(workout, events, { type: "report", station: "s1", amount: 0 }, "x", at).ok).toBe(true);
    expect(accept(workout, events, { type: "report", station: "s1", amount: null }, "x", at).ok).toBe(true);
    expect(accept(workout, events, { type: "report", station: "s2", amount: 6 }, "x", at)).toEqual({ ok: false, reason: "wrong-station" });
  });

  it("הפעמון באמצע מנה: אפשר עדיין לדווח על מה שכבר בוצע, והדיווח נחתם בזמן הפעמון", () => {
    const events = run([...toStation, [70, { type: "station-start", station: "s1" }]]);
    const bell = (73 + 300) * SEC;
    expect(replay(workout, events, bell + 5 * SEC).station!.status).toBe("last-report");
    const late = accept(workout, events, { type: "report", station: "s1", amount: 3 }, "late", bell + 8 * SEC);
    expect(late.ok).toBe(true);
    if (!late.ok) return;
    const ended = replay(workout, late.events, bell + 9 * SEC).station!;
    expect(ended).toMatchObject({ status: "ended", endReason: "time", endedAt: bell });
    expect(ended.reports[0]).toMatchObject({ amount: 3, at: bell });
    expect(ended.score.rank).toEqual([0, 0, 3]);
  });

  it("אחרי הפעמון, המשך בלי דיווח נרשם כסיום בזמן ולא כבחירה", () => {
    const events = run([...toStation, [70, { type: "station-start", station: "s1" }]]);
    const bell = (73 + 300) * SEC;
    const skipped = accept(workout, events, { type: "station-end", station: "s1", reason: "choice" }, "skip", bell + 4 * SEC);
    expect(skipped.ok).toBe(true);
    if (!skipped.ok) return;
    expect(skipped.events.at(-1)).toMatchObject({ type: "station-end", reason: "time", at: bell });
    expect(replay(workout, skipped.events, bell + 5 * SEC).station).toMatchObject({ status: "ended", endReason: "time", reports: [] });
  });

  it("הפעמון בזמן מנוחה מסיים את המשחקון, והסיום נרשם במפורש לפני כל אירוע חדש", () => {
    const events = run([
      ...toStation,
      [70, { type: "station-start", station: "s1" }],
      [90, { type: "report", station: "s1", amount: 6 }],
    ]);
    const after = 400 * SEC;
    expect(replay(workout, events, after).station).toMatchObject({ status: "ended", endReason: "time" });
    expect(impliedEvents(workout, events, after)).toEqual([
      { id: "s1:end", at: 373 * SEC, type: "station-end", station: "s1", reason: "time" },
    ]);
    const next = accept(workout, events, { type: "next" }, "n", after);
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.events.map((e) => e.type)).toEqual(["begin", "warmup-done", "station-start", "report", "station-end", "next"]);
    expect(replay(workout, next.events, after).station).toMatchObject({ id: "s2", status: "ready" });
  });

  it("סיום משחקון מרצון, מעבר לתחנה הבאה, שחרור וסיכום", () => {
    const events = run([
      ...toStation,
      [70, { type: "station-start", station: "s1" }],
      [90, { type: "report", station: "s1", amount: 6 }],
      [95, { type: "station-end", station: "s1", reason: "choice" }],
      [100, { type: "next" }],
      [110, { type: "station-start", station: "s2" }],
      [130, { type: "station-end", station: "s2", reason: "choice" }],
      [135, { type: "next" }],
      [200, { type: "finish" }],
    ]);
    const view = replay(workout, events, 201 * SEC);
    expect(view).toMatchObject({ phase: "summary", startedAt: 0, finishedAt: 200 * SEC });
    expect(view.stations.map((s) => [s.id, s.endReason])).toEqual([["s1", "choice"], ["s2", "choice"]]);
    expect(view.stations[0].score.rank).toEqual([0, 1, 0]);
  });

  it("עצירה בגלל כאב: אין משחקון הבא, רק שחרור או סיום", () => {
    const events = run([
      ...toStation,
      [70, { type: "station-start", station: "s1" }],
      [80, { type: "station-end", station: "s1", reason: "pain" }],
    ]);
    expect(accept(workout, events, { type: "next" }, "n", 81 * SEC)).toEqual({ ok: false, reason: "stopped-for-pain" });
    expect(accept(workout, events, { type: "to-cooldown" }, "c", 81 * SEC).ok).toBe(true);
    expect(accept(workout, events, { type: "finish" }, "f", 81 * SEC).ok).toBe(true);
  });

  it("אי אפשר לסיים אימון באמצע משחקון בלי לסיים אותו קודם", () => {
    const events = run([...toStation, [70, { type: "station-start", station: "s1" }]]);
    expect(accept(workout, events, { type: "finish" }, "f", 80 * SEC)).toEqual({ ok: false, reason: "end-station-first" });
    expect(accept(workout, events, { type: "to-cooldown" }, "c", 80 * SEC)).toEqual({ ok: false, reason: "end-station-first" });
  });

  it("אותו יומן ואותו שעון נותנים תמיד אותה תצוגה", () => {
    const events = run([
      ...toStation,
      [70, { type: "station-start", station: "s1" }],
      [90, { type: "report", station: "s1", amount: 4 }],
    ]);
    expect(replay(workout, events, 95 * SEC)).toEqual(replay(workout, events, 95 * SEC));
    expect(replay(workout, events, 95 * SEC).station!.portion).toEqual({ exerciseIndex: 0, target: 2, round: 1 });
  });
});
