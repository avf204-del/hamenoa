// G18 — fixed rounds. "How many rounds will you complete?"
//
// A fixed order of exercises, each with a quota. The player works through
// them in order; a round counts only when every quota in it is full. A partial
// portion keeps the same exercise open, and the player may finish what is left
// of it after the rest or stop. The clock alone ends the game.

import type { Copy, GameRule, Portion, Report, Score, Station } from "@/core/contract";

interface Position {
  /** 1-based round the player is in. */
  round: number;
  /** Exercise the player is on. */
  index: number;
  /** Amount already saved for this exercise in this round. */
  saved: number;
  fullRounds: number;
  /** Exercises fully done in the current round. */
  doneInRound: number;
  /** The last report closed a round. */
  closedRound: boolean;
}

function position(station: Station, reports: readonly Report[]): Position {
  const count = station.exercises.length;
  const p: Position = { round: 1, index: 0, saved: 0, fullRounds: 0, doneInRound: 0, closedRound: false };
  // A round with an unknown amount in it can no longer be counted as full.
  let roundHasUnknown = false;

  const advance = () => {
    p.index += 1;
    p.saved = 0;
    if (p.index < count) return;
    if (!roundHasUnknown) p.fullRounds += 1;
    p.round += 1;
    p.index = 0;
    p.doneInRound = 0;
    roundHasUnknown = false;
    p.closedRound = true;
  };

  for (const report of reports) {
    p.closedRound = false;
    if (report.amount === null) {
      roundHasUnknown = true;
      advance();
      continue;
    }
    p.saved += report.amount;
    if (p.saved >= station.exercises[p.index].quota) {
      p.doneInRound += 1;
      advance();
    }
  }
  return p;
}

function count(n: number, one: Copy, many: Copy): Copy {
  return n === 1 ? one : { he: `${n} ${many.he}`, en: `${n} ${many.en}` };
}

function scoreText(p: Position, unit: "reps" | "sec"): Copy {
  const rounds =
    p.fullRounds === 0
      ? { he: "עוד לא הושלם סבב", en: "No full round yet" }
      : count(p.fullRounds, { he: "סבב אחד", en: "1 round" }, { he: "סבבים", en: "rounds" });
  const extras: Copy[] = [];
  if (p.doneInRound > 0) {
    extras.push(count(p.doneInRound, { he: "תרגיל אחד", en: "1 exercise" }, { he: "תרגילים", en: "exercises" }));
  }
  if (p.saved > 0) {
    extras.push(
      unit === "sec"
        ? count(p.saved, { he: "שנייה אחת", en: "1 second" }, { he: "שניות", en: "seconds" })
        : count(p.saved, { he: "חזרה אחת", en: "1 rep" }, { he: "חזרות", en: "reps" }),
    );
  }
  if (extras.length === 0) return rounds;
  return {
    he: `${rounds.he} · ועוד ${extras.map((e) => e.he).join(" ו־")}`,
    en: `${rounds.en} · plus ${extras.map((e) => e.en).join(" and ")}`,
  };
}

export const G18: GameRule = {
  id: "G18",
  ruleVersion: 1,
  title: { he: "סבב תרגילים קבוע", en: "Fixed rounds" },
  question: { he: "כמה סבבים תשלים?", en: "How many rounds will you complete?" },
  howTo: {
    he: "עוברים על התרגילים לפי הסדר. סבב נספר כשכל התרגילים שבו הושלמו.",
    en: "Work through the exercises in order. A round counts when every exercise in it is done.",
  },
  exercises: { min: 3, max: 5 },
  defaults: { frameSec: 300, restSec: 10, roundRestSec: 20 },

  next(station, reports): Portion {
    const p = position(station, reports);
    return { exerciseIndex: p.index, target: station.exercises[p.index].quota - p.saved, round: p.round };
  },

  restAfter(station, reports): number {
    if (reports.length === 0) return 0;
    return position(station, reports).closedRound ? station.roundRestSec : station.restSec;
  },

  score(station, reports): Score {
    const p = position(station, reports);
    return {
      rank: [p.fullRounds, p.doneInRound, p.saved],
      value: p.fullRounds,
      unit: p.fullRounds === 1 ? { he: "סבב", en: "round" } : { he: "סבבים", en: "rounds" },
      text: scoreText(p, station.exercises[p.index].unit),
    };
  },
};
