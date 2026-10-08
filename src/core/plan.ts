// The planner: turns "how long, where, with what" into a Workout.
//
// Pure and deterministic: the same request and seed always give the same
// plan. It reads exercises as plain data and never touches the database.

import type { EnvConstraint, ExerciseData, LocationKind, Pattern } from "@/catalog/types";
import { MOBILITY_DRILLS, STRETCHES, type Joint, type Muscle } from "@/catalog/warmup-content";
import {
  CONTRACT_VERSION,
  COUNTDOWN_SEC,
  type Copy,
  type GameId,
  type GuidedItem,
  type Station,
  type StationExercise,
  type Workout,
} from "@/core/contract";
import { ruleFor } from "@/core/games";
import { createRng, shuffled } from "@/core/rng";
import type { MuscleGroupSlug } from "@/lib/muscle-groups";
import EXERCISE_TEXT_EN from "../../data/exercise-text-en.json";

const TEXT_EN = EXERCISE_TEXT_EN as {
  drills: Record<string, { name: string; instructions: string }>;
  stretches: Record<string, { name: string; instructions: string }>;
};

export interface PlanRequest {
  minutes: number;
  place: LocationKind;
  /** Equipment that is actually free to use now. */
  equipment: readonly string[];
  constraints?: readonly EnvConstraint[];
  exercises: readonly ExerciseData[];
  seed: string;
  /** Exercises from the player's recent workouts; chosen last, for variety. */
  recent?: readonly string[];
}

export type PlanErrorCode = "minutes" | "no-exercises";

export class PlanError extends Error {
  constructor(public readonly code: PlanErrorCode) {
    super(code);
  }
}

export const MIN_MINUTES = 10;
export const MAX_MINUTES = 90;
const MAX_STATIONS = 4;
/** Walking over, setting up and reading the next game. */
const MOVE_BETWEEN_STATIONS_SEC = 60;

/* ---------- Which exercises may be offered ---------- */

// Starting policy: familiar, controlled, bodyweight movements that can be
// counted in repetitions. Loaded and single-machine work arrives with the
// games built for it.
const NOT_FOR_NOW = /jump|burpee|clap|sprint|snatch|clean-and|kipping|explosive|bound|hop|skipping/;
const HELD_NOT_COUNTED = /-hold$|wall-sit|plank/;
const MAX_SKILL = 2;

export function isEligible(exercise: ExerciseData, request: Pick<PlanRequest, "equipment" | "constraints">): boolean {
  const available = new Set(request.equipment);
  const constraints = request.constraints ?? [];
  return (
    (exercise.trainingType === undefined || exercise.trainingType === "base") &&
    exercise.skillLevel <= MAX_SKILL &&
    exercise.loadClass === "bodyweight" &&
    exercise.modality !== "cardio" &&
    !exercise.unilateral &&
    !NOT_FOR_NOW.test(exercise.slug) &&
    !HELD_NOT_COUNTED.test(exercise.slug) &&
    exercise.equipment.every((item) => available.has(item)) &&
    !exercise.constraints.some((c) => constraints.includes(c))
  );
}

/* ---------- Body regions: what makes a station varied ---------- */

type Region = "legs" | "push" | "pull" | "back" | "core";

const REGION_OF: Partial<Record<Pattern, Region>> = {
  squat: "legs",
  lunge: "legs",
  pushH: "push",
  pushV: "push",
  pullH: "pull",
  pullV: "pull",
  hinge: "back",
  core: "core",
};

/** Each station mixes three regions; the mix rotates from station to station. */
const STATION_MIXES: Region[][] = [
  ["legs", "push", "back"],
  ["core", "pull", "legs"],
  ["push", "back", "core"],
  ["legs", "pull", "core"],
];

/** A modest starting quota: the most to do in one go, not a number to reach. */
const QUOTA: Record<Region, number> = { legs: 6, back: 6, core: 6, push: 4, pull: 4 };

/* ---------- Stations ---------- */

function toStationExercise(exercise: ExerciseData, region: Region): StationExercise {
  return {
    slug: exercise.slug,
    name: { he: exercise.nameHe, en: exercise.nameEn ?? exercise.slug.replaceAll("-", " ") },
    quota: QUOTA[region],
    unit: "reps",
    load: null,
  };
}

/** Equal keys mean the same game on the same exercises under the same terms. */
export function compareKeyOf(station: Omit<Station, "compareKey">): string {
  const exercises = station.exercises.map((e) => `${e.slug}*${e.quota}${e.unit}${e.load ? `@${e.load.kg}${e.load.per}` : ""}`);
  return [
    `${station.game}v${station.ruleVersion}`,
    exercises.join("+"),
    `clock${station.frameSec}`,
    `rest${station.restSec}-${station.roundRestSec}`,
  ].join("|");
}

function buildStations(request: PlanRequest, count: number, game: GameId): Station[] {
  const rule = ruleFor(game);
  const rng = createRng(request.seed);
  const recent = new Set(request.recent ?? []);

  // Simple first, then not-recently-done, then by the seeded shuffle.
  const pool = shuffled(
    request.exercises.filter((e) => isEligible(e, request) && REGION_OF[e.pattern] !== undefined),
    rng,
  ).sort((a, b) => Number(recent.has(a.slug)) - Number(recent.has(b.slug)) || a.skillLevel - b.skillLevel);

  const used = new Set<string>();
  const stations: Station[] = [];

  for (let i = 0; i < count; i++) {
    const mix = STATION_MIXES[i % STATION_MIXES.length];
    const chosen: StationExercise[] = [];
    for (const region of mix) {
      const candidates = pool.filter((e) => REGION_OF[e.pattern] === region && !chosen.some((c) => c.slug === e.slug));
      // Prefer an exercise this workout has not used yet.
      const pick = candidates.find((e) => !used.has(e.slug)) ?? candidates[0];
      if (!pick) continue;
      used.add(pick.slug);
      chosen.push(toStationExercise(pick, region));
    }
    if (chosen.length < rule.exercises.min) continue;

    const draft = {
      id: `s${stations.length + 1}`,
      game,
      ruleVersion: rule.ruleVersion,
      exercises: chosen,
      ...rule.defaults,
    };
    stations.push({ ...draft, compareKey: compareKeyOf(draft) });
  }
  return stations;
}

/* ---------- Warm-up and cool-down, from what the stations use ---------- */

const JOINTS_FOR: Record<Region, Joint[]> = {
  legs: ["hip", "knee", "ankle"],
  back: ["hip", "spine"],
  core: ["spine"],
  push: ["shoulder", "wrist"],
  pull: ["shoulder"],
};

const GROUP_OF_MUSCLE: Record<Muscle, MuscleGroupSlug> = {
  quads: "quads",
  hamstrings: "hamstrings",
  glutes: "glutes",
  calves: "calves",
  chest: "chest",
  lats: "back",
  shoulders: "shoulders",
  triceps: "arms",
  forearms: "arms",
  lowerBack: "back",
  upperBack: "back",
  abs: "core",
  hipFlexors: "quads",
};

const EASY_MOVEMENT_KEY = "drill:walking-easy";

function warmupFor(regions: readonly Region[]): GuidedItem[] {
  const items: GuidedItem[] = [
    {
      key: EASY_MOVEMENT_KEY,
      name: { he: "תנועה קלה במקום", en: "Easy movement in place" },
      instruction: {
        he: "נוע בנוחות, נשום כרגיל ובחר קצב קל.",
        en: "Move comfortably at an easy pace and breathe normally.",
      },
      seconds: 60,
    },
  ];
  // One drill per region the stations will load, in the order they appear.
  for (const region of regions) {
    if (items.length >= 4) break;
    const drill = MOBILITY_DRILLS.find(
      (d) => d.joints.some((j) => JOINTS_FOR[region].includes(j)) && !items.some((it) => it.key === `drill:${d.id}`),
    );
    if (!drill) continue;
    const en = TEXT_EN.drills[drill.id];
    items.push({
      key: `drill:${drill.id}`,
      name: { he: drill.nameHe, en: en?.name ?? drill.id.replaceAll("-", " ") },
      instruction: { he: drill.instructionsHe, en: en?.instructions ?? "" },
      seconds: 30,
    });
  }
  return items;
}

function cooldownFor(groups: ReadonlySet<MuscleGroupSlug>): GuidedItem[] {
  const items: GuidedItem[] = [
    {
      key: EASY_MOVEMENT_KEY,
      name: { he: "הליכה קלה והורדת קצב", en: "Easy walking, slowing down" },
      instruction: {
        he: "לך בקצב רגוע ותן לנשימה להירגע.",
        en: "Walk at a relaxed pace and let your breathing settle.",
      },
      seconds: 60,
    },
  ];
  for (const stretch of STRETCHES) {
    if (items.length >= 4) break;
    if (!stretch.muscles.some((m) => groups.has(GROUP_OF_MUSCLE[m]))) continue;
    const en = TEXT_EN.stretches[stretch.id];
    items.push({
      key: `stretch:${stretch.id}`,
      name: { he: stretch.nameHe, en: en?.name ?? stretch.id.replaceAll("-", " ") },
      instruction: {
        he: `${stretch.instructionsHe} בטווח נוח בלבד.`,
        en: `${en?.instructions ?? ""} Stay within a comfortable range.`.trim(),
      },
      seconds: stretch.perSide ? stretch.durationSec * 2 : stretch.durationSec,
    });
  }
  return items;
}

/* ---------- The plan ---------- */

const sum = (items: readonly { seconds: number }[]) => items.reduce((total, item) => total + item.seconds, 0);

function estimate(warmup: GuidedItem[], stations: Station[], cooldown: GuidedItem[]): number {
  const games = stations.reduce((total, s) => total + COUNTDOWN_SEC + s.frameSec, 0);
  const moves = Math.max(0, stations.length - 1) * MOVE_BETWEEN_STATIONS_SEC;
  return sum(warmup) + games + moves + sum(cooldown);
}

export function planWorkout(request: PlanRequest): Workout {
  if (!Number.isFinite(request.minutes) || request.minutes < MIN_MINUTES || request.minutes > MAX_MINUTES) {
    throw new PlanError("minutes");
  }
  const game: GameId = "G18";
  const rule = ruleFor(game);

  // How many stations fit once a typical warm-up and cool-down are set aside.
  const NOMINAL_WARMUP_AND_COOLDOWN_SEC = 150 + 210;
  const perStation = COUNTDOWN_SEC + rule.defaults.frameSec + MOVE_BETWEEN_STATIONS_SEC;
  const fits = Math.floor((request.minutes * 60 - NOMINAL_WARMUP_AND_COOLDOWN_SEC) / perStation);
  const count = Math.min(MAX_STATIONS, Math.max(1, fits));

  const stations = buildStations(request, count, game);
  if (stations.length === 0) throw new PlanError("no-exercises");

  const bySlug = new Map(request.exercises.map((e) => [e.slug, e]));
  const picked = stations.flatMap((s) => s.exercises.map((e) => bySlug.get(e.slug)!));
  const regions = [...new Set(picked.map((e) => REGION_OF[e.pattern]!))];
  const groups = new Set(picked.flatMap((e) => [...(e.muscleGroups ?? [])]));

  const warmup = warmupFor(regions);
  const cooldown = cooldownFor(groups);
  const estimatedSec = estimate(warmup, stations, cooldown);

  const notes: Copy[] = [];
  const builtMin = Math.round(estimatedSec / 60);
  if (request.minutes - builtMin >= 4) {
    notes.push({
      he: `האימון שנבנה קצר מהזמן שביקשת: כ־${builtMin} דקות.`,
      en: `This workout is shorter than you asked for: about ${builtMin} minutes.`,
    });
  }

  return {
    contract: CONTRACT_VERSION,
    seed: request.seed,
    place: request.place,
    requestedMin: request.minutes,
    warmup,
    stations,
    cooldown,
    estimatedSec,
    notes,
  };
}
