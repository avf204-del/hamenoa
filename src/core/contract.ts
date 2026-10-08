// The contract between the workout engine and every screen.
//
// One shape of "workout", used everywhere:
//
//   Workout   the plan: warm-up, stations, cool-down. Built once by the planner.
//   Station   one mini-game: a rule, its exercises, a clock and a score.
//   RunEvent  what the player did, in order. The only thing a screen sends.
//   RunView   where the player is now. Always derived from Workout + events.
//
// Screens never decide rules: they show a RunView and send events. Rules never
// know about screens: they are pure functions in src/core/games. Changing a
// type in this file is a product decision, not a refactor (docs/CONTRACT.md).
//
// Pure: nothing here may import React, Next or Prisma.

import type { LocationKind } from "@/catalog/types";

export const CONTRACT_VERSION = 1;

/** Interface text in both languages. */
export interface Copy {
  he: string;
  en: string;
}

/* ---------- The plan ---------- */

export type Unit = "reps" | "sec";

export interface Load {
  kg: number;
  /** Dumbbells are stated per hand; a machine or bar as one total. */
  per: "hand" | "total";
}

export interface StationExercise {
  /** Catalog identity: the exercise slug. */
  slug: string;
  name: Copy;
  /** The most the player does in one go. Never an instruction to reach it. */
  quota: number;
  unit: Unit;
  /** null = bodyweight. */
  load: Load | null;
}

/** Game ids come from the games table (docs/reference/games-table.md). */
export type GameId = "G18";

export interface Station {
  /** Stable inside one workout: "s1", "s2"... */
  id: string;
  game: GameId;
  ruleVersion: number;
  exercises: StationExercise[];
  /** The station clock, from the end of the 3-2-1 to the bell. */
  frameSec: number;
  /** Required rest after a portion, before the next one may start. */
  restSec: number;
  /** Required rest when a round closes. */
  roundRestSec: number;
  /** Two attempts are comparable only when their keys are equal. */
  compareKey: string;
}

/** A warm-up or cool-down item: guidance, not a scored exercise. */
export interface GuidedItem {
  /** Catalog key: "drill:<id>", "stretch:<id>". */
  key: string;
  name: Copy;
  instruction: Copy;
  seconds: number;
}

export interface Workout {
  contract: typeof CONTRACT_VERSION;
  seed: string;
  place: LocationKind;
  requestedMin: number;
  warmup: GuidedItem[];
  stations: Station[];
  cooldown: GuidedItem[];
  /** Warm-up, station clocks, moves between stations and cool-down. */
  estimatedSec: number;
  /** Said plainly to the player when the plan differs from the request. */
  notes: Copy[];
}

/* ---------- What the player did ---------- */

export type EndReason = "time" | "choice" | "pain" | "rule";

/** What a screen may send. The server adds `id` and the time `at`. */
export type RunEventInput =
  /** Leave the preview: the warm-up begins. */
  | { type: "begin" }
  | { type: "warmup-done" }
  /** "Start game": the station clock starts when the 3-2-1 ends. */
  | { type: "station-start"; station: string }
  /** "Start": the next portion, once the required rest has passed. */
  | { type: "portion-start"; station: string }
  /**
   * What was actually done in a portion. A number is a report, zero included;
   * null means the player does not know. The target is never recorded on the
   * player's behalf. The report names the portion it is about (`Portion.index`),
   * so one that arrives late can never be filed under another.
   */
  | { type: "report"; station: string; portion: number; amount: number | null }
  /** Stop this game. A pain stop may also be added to a game that already ended. */
  | { type: "station-end"; station: string; reason: EndReason }
  /** From an ended station: on to the next station, or to the cool-down. */
  | { type: "next" }
  /** Stop the stations now and go to the cool-down. */
  | { type: "to-cooldown" }
  | { type: "finish" };

export type RunEvent = RunEventInput & {
  /** Chosen by the sender; sending the same id twice changes nothing. */
  id: string;
  /** Server time in milliseconds. For station-start: when the clock starts. */
  at: number;
};

/** Seconds of "3-2-1" between pressing "Start game" and the clock starting. */
export const COUNTDOWN_SEC = 3;

/* ---------- Rules ---------- */

/** One saved report, as a rule sees it. */
export interface Report {
  exerciseIndex: number;
  /** What was asked of this portion: the quota, or what was left of it. */
  target: number;
  amount: number | null;
  startedAt: number;
  at: number;
}

/** The piece of work in front of the player. */
export interface Portion {
  /** Its place in the station, from 0: how many reports were saved before it. */
  index: number;
  exerciseIndex: number;
  target: number;
  /** 1-based. */
  round: number;
}

export interface Score {
  /** Compared left to right; higher is better. */
  rank: number[];
  /** The headline number and what it counts: 2, "rounds". */
  value: number;
  unit: Copy;
  /** The full result in words. */
  text: Copy;
}

export interface GameRule {
  id: GameId;
  ruleVersion: number;
  title: Copy;
  /** The question the game asks: "How many rounds will you complete?" */
  question: Copy;
  /** One plain line for someone who sees the game for the first time. */
  howTo: Copy;
  exercises: { min: number; max: number };
  defaults: { frameSec: number; restSec: number; roundRestSec: number };
  /** The next portion given the saved reports; null when the rule itself ends the game. */
  next(station: Station, reports: readonly Report[]): Portion | null;
  /** Required rest in seconds after the last saved report. */
  restAfter(station: Station, reports: readonly Report[]): number;
  score(station: Station, reports: readonly Report[]): Score;
}

/* ---------- Where the player is ---------- */

export type Phase = "preview" | "warmup" | "station" | "cooldown" | "summary";

export type StationStatus =
  /** Reading the game; no clock is running. */
  | "ready"
  /** 3-2-1. */
  | "countdown"
  | "working"
  | "resting"
  /** The bell rang mid-portion: report only what was already done. */
  | "last-report"
  | "ended";

export interface StationView {
  id: string;
  status: StationStatus;
  clockStartsAt: number | null;
  clockEndsAt: number | null;
  /** While resting: when the next portion may start. */
  restEndsAt: number | null;
  /** The portion being worked on, or the one that comes next. */
  portion: Portion | null;
  portionStartedAt: number | null;
  reports: Report[];
  score: Score;
  endReason: EndReason | null;
  endedAt: number | null;
}

export interface RunView {
  phase: Phase;
  /** The station on screen while phase is "station". */
  stationIndex: number;
  station: StationView | null;
  /** Every station that has started, in order. */
  stations: StationView[];
  startedAt: number | null;
  finishedAt: number | null;
}
