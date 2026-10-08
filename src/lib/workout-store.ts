// Where a run is kept. Server only.
//
// A workout is one Session row: the plan and the ordered events live together
// in Session.context.run, and every station is a Block. Each report with a
// known amount is also written as a SetLog row, which stays the source of
// truth for volume, records and progress.
//
// The core decides what is allowed (src/core/run.ts); this file only loads,
// asks the core, and stores what it answered.

import { randomUUID } from "node:crypto";
import { loadExercises } from "@/catalog/load";
import type { EnvConstraint, LocationKind } from "@/catalog/types";
import type { RunEvent, RunEventInput, RunView, Score, Station, Workout } from "@/core/contract";
import { compareScores } from "@/core/games";
import { planWorkout, PlanError, type PlanErrorCode } from "@/core/plan";
import { accept, closeAbandoned, impliedEvents, lastSeenAt, replay, type RejectReason } from "@/core/run";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { todayLocalStr } from "@/lib/local-day";
import { recordEvent } from "@/lib/pilot-events";
import { ensureLocationProfiles } from "@/lib/users";

export interface StoredRun {
  workout: Workout;
  events: RunEvent[];
}

/** What a station's Block keeps: the plan, and the result once it ended. */
interface StationBlock {
  station: Station;
  compareKey: string;
  result?: { score: Score; reason: string; endedAt: number };
}

export interface RunSnapshot {
  id: string;
  workout: Workout;
  events: RunEvent[];
  /** The server clock at the moment of this answer. */
  serverNow: number;
  /** Best earlier result per station id, for stations played before on the same terms. */
  best: Record<string, Score>;
}

const PLACES: readonly LocationKind[] = ["home", "gym", "park"];

/** A started workout nobody touched for this long is closed on the player's behalf. */
const LEFT_AFTER_MS = 3 * 60 * 60 * 1000;

const RUN_SELECT = {
  id: true,
  revision: true,
  status: true,
  context: true,
  blocks: { select: { id: true, order: true, payload: true } },
} as const;

interface SessionRow {
  id: string;
  revision: number;
  status: string;
  context: unknown;
  blocks: { id: string; order: number; payload: unknown }[];
}

/** Only a workout that is planned or under way takes events. */
function isOpen(status: string): boolean {
  return status === "planned" || status === "active";
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function readRun(context: unknown): StoredRun | null {
  const run = (context as { run?: StoredRun } | null)?.run;
  return run && run.workout && Array.isArray(run.events) ? run : null;
}

/* ---------- Building a workout ---------- */

export type CreateResult = { ok: true; id: string } | { ok: false; error: PlanErrorCode | "place" };

export async function createWorkout(
  userId: string,
  input: { minutes: number; place: string; equipment?: string[] },
): Promise<CreateResult> {
  if (!PLACES.includes(input.place as LocationKind)) return { ok: false, error: "place" };
  const place = input.place as LocationKind;

  await ensureLocationProfiles(prisma, userId);
  const location = await prisma.locationProfile.findFirstOrThrow({ where: { userId, kind: place } });
  const known = Array.isArray(location.equipment) ? (location.equipment as string[]) : [];
  // The player may narrow the place's equipment for today, never widen it.
  const equipment = input.equipment ? input.equipment.filter((item) => known.includes(item)) : known;

  const [{ data: exercises }, recent, earlier] = await Promise.all([
    loadExercises(),
    recentSlugs(userId),
    earlierGames(userId),
  ]);

  let workout: Workout;
  try {
    workout = planWorkout({
      minutes: input.minutes,
      place,
      equipment,
      constraints: Array.isArray(location.constraints) ? (location.constraints as EnvConstraint[]) : [],
      exercises,
      seed: randomUUID(),
      recent,
      rematch: earlier.rematch,
      lastWasLoneRematch: earlier.lastWasLoneRematch,
    });
  } catch (error) {
    if (error instanceof PlanError) return { ok: false, error: error.code };
    throw error;
  }

  const run: StoredRun = { workout, events: [] };
  const session = await prisma.$transaction(async (tx) => {
    // A plan the player looked at and never started is replaced, not piled up.
    // Only plans made by this core (their blocks are games) are touched.
    await tx.session.deleteMany({
      where: { userId, status: "planned", startedAt: null, blocks: { some: { type: "game" } } },
    });
    return tx.session.create({
      data: {
        userId,
        date: new Date(`${todayLocalStr()}T00:00:00.000Z`),
        seed: workout.seed,
        timeBudgetMin: workout.requestedMin,
        locationId: location.id,
        mood: "normal",
        status: "planned",
        explainLog: [],
        context: asJson({ run }),
        blocks: {
          create: workout.stations.map((station, order) => ({
            order,
            type: "game",
            format: station.game,
            plannedMin: station.frameSec / 60,
            payload: asJson({ station, compareKey: station.compareKey } satisfies StationBlock),
          })),
        },
      },
      select: { id: true },
    });
  });

  void recordEvent("session_generated", { userId, props: { place, minutes: workout.requestedMin, stations: workout.stations.length } });
  return { ok: true, id: session.id };
}

/** Exercises from the player's last few workouts, so the next one differs. */
async function recentSlugs(userId: string): Promise<string[]> {
  const sessions = await prisma.session.findMany({
    where: { userId, status: { in: ["done", "active"] } },
    orderBy: { createdAt: "desc" },
    take: 2,
    select: { blocks: { where: { type: "game" }, select: { payload: true } } },
  });
  return sessions.flatMap((s) =>
    s.blocks.flatMap((b) => ((b.payload as unknown as StationBlock).station?.exercises ?? []).map((e) => e.slug)),
  );
}

/**
 * What the planner needs to know about earlier workouts: the games worth
 * bringing back, the one waiting longest first, so there is a result to beat.
 * A game last stopped for pain does not come back, and neither does one that
 * never produced a result above zero.
 */
async function earlierGames(userId: string): Promise<{ rematch: Station[]; lastWasLoneRematch: boolean }> {
  const sessions = await prisma.session.findMany({
    where: { userId, status: "done", blocks: { some: { type: "game" } } },
    orderBy: { completedAt: "desc" },
    take: 60,
    select: { blocks: { where: { type: "game" }, select: { payload: true } } },
  });

  const known = new Map<string, { station: Station; endedAt: number; pain: boolean; scored: boolean }>();
  let lastWasLoneRematch = false;
  // Oldest first, so each entry ends up describing the latest time the game was played.
  for (const session of sessions.reverse()) {
    const played = session.blocks.map((b) => b.payload as unknown as StationBlock).filter((b) => b.result);
    lastWasLoneRematch = session.blocks.length === 1 && played.length === 1 && known.has(played[0].compareKey);
    for (const { station, compareKey, result } of played) {
      const scored = result!.score.rank.some((n) => n > 0) || (known.get(compareKey)?.scored ?? false);
      known.set(compareKey, { station, endedAt: result!.endedAt, pain: result!.reason === "pain", scored });
    }
  }

  const rematch = [...known.values()]
    .filter((game) => game.scored && !game.pain)
    .sort((a, b) => a.endedAt - b.endedAt)
    .map((game) => game.station);
  return { rematch, lastWasLoneRematch };
}

/* ---------- Reading ---------- */

export async function loadRun(userId: string, id: string): Promise<RunSnapshot | null> {
  await settle(userId, id);
  const session = await prisma.session.findFirst({ where: { id, userId }, select: { id: true, context: true } });
  const run = session && readRun(session.context);
  if (!session || !run) return null;
  return { id: session.id, ...run, serverNow: Date.now(), best: await bestResults(userId, session.id, run.workout) };
}

/** The player's unfinished workout, if there is one, and whether it has begun. */
export async function openWorkout(userId: string): Promise<{ id: string; started: boolean } | null> {
  const find = () =>
    prisma.session.findFirst({
      where: { userId, status: { in: ["active", "planned"] }, blocks: { some: { type: "game" } } },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true },
    });
  let session = await find();
  if (session?.status === "active") {
    // A workout left open for hours is closed here, so it is not offered as "continue".
    await settle(userId, session.id);
    session = await find();
  }
  return session ? { id: session.id, started: session.status === "active" } : null;
}

/* ---------- Keeping the stored log true to the clock ---------- */

/** What a stored run still owes its log, given the time. */
function overdue(run: StoredRun, status: string, now: number): { added: RunEvent[]; left: boolean } {
  const seen = lastSeenAt(run.events, now);
  const left = status === "active" && seen !== null && now - seen > LEFT_AFTER_MS;
  return { left, added: left ? closeAbandoned(run.workout, run.events, now) : impliedEvents(run.workout, run.events, now) };
}

/**
 * Append events the server itself decided on, with the results they bring.
 * With `closing`, the workout ends here too. Returns false when nothing was
 * written: there was nothing to add, or someone else is writing this run
 * right now (they record the same endings).
 */
async function writeServerEvents(
  tx: Prisma.TransactionClient,
  session: SessionRow,
  run: StoredRun,
  added: readonly RunEvent[],
  closing: boolean,
  now: number,
): Promise<boolean> {
  if (added.length === 0) return false;
  const events = [...run.events, ...added];
  const view = replay(run.workout, events, now);
  // A workout with real work in it counts as done; one that never got going does not.
  const worked = view.stations.some((s) => s.reports.some((r) => (r.amount ?? 0) > 0));
  const updated = await tx.session.updateMany({
    where: { id: session.id, revision: session.revision },
    data: {
      revision: { increment: 1 },
      context: asJson({ run: { workout: run.workout, events } }),
      ...(closing ? { status: worked ? "done" : "abandoned", completedAt: new Date(view.finishedAt ?? now) } : {}),
    },
  });
  if (updated.count === 0) return false;
  await writeStationResults(tx, session.blocks, run.workout, added, view);
  return true;
}

/**
 * Write down what the clock decided while nobody was pressing: stations whose
 * time ran out, and a workout that was left for hours. Returns true when this
 * call closed the workout.
 */
async function writeOverdue(tx: Prisma.TransactionClient, session: SessionRow, run: StoredRun, now: number): Promise<boolean> {
  const { added, left } = overdue(run, session.status, now);
  return (await writeServerEvents(tx, session, run, added, left, now)) && left;
}

async function settle(userId: string, id: string): Promise<void> {
  const peek = await prisma.session.findFirst({ where: { id, userId }, select: { status: true, context: true } });
  const stored = peek && readRun(peek.context);
  if (!peek || !stored || !isOpen(peek.status) || overdue(stored, peek.status, Date.now()).added.length === 0) return;

  await prisma.$transaction(async (tx) => {
    const session = await tx.session.findFirst({ where: { id, userId }, select: RUN_SELECT });
    const run = session && readRun(session.context);
    if (session && run && isOpen(session.status)) await writeOverdue(tx, session, run, Date.now());
  });
}

/** Each ended station keeps its result on its Block, where later workouts look for a result to beat. */
async function writeStationResults(
  tx: Prisma.TransactionClient,
  blocks: SessionRow["blocks"],
  workout: Workout,
  added: readonly RunEvent[],
  view: RunView,
): Promise<void> {
  for (const event of added) {
    if (event.type !== "station-end") continue;
    const order = workout.stations.findIndex((s) => s.id === event.station);
    const block = blocks.find((b) => b.order === order);
    const station = view.stations.find((s) => s.id === event.station);
    if (!block || !station) continue;
    const payload = block.payload as unknown as StationBlock;
    // The view knows the whole story: a pain stop added after the bell keeps the bell's time.
    const result = { score: station.score, reason: station.endReason ?? event.reason, endedAt: station.endedAt ?? event.at };
    await tx.block.update({ where: { id: block.id }, data: { payload: asJson({ ...payload, result }) } });
  }
}

async function bestResults(userId: string, sessionId: string, workout: Workout): Promise<Record<string, Score>> {
  const keys = workout.stations.map((s) => s.compareKey);
  const earlier = await prisma.block.findMany({
    where: { type: "game", session: { userId, id: { not: sessionId } } },
    select: { payload: true },
  });
  const best: Record<string, Score> = {};
  for (const block of earlier) {
    const { compareKey, result } = block.payload as unknown as StationBlock;
    if (!result || !keys.includes(compareKey)) continue;
    for (const station of workout.stations) {
      if (station.compareKey !== compareKey) continue;
      if (!best[station.id] || compareScores(result.score, best[station.id]) < 0) best[station.id] = result.score;
    }
  }
  return best;
}

/* ---------- Writing ---------- */

/** Two writes met; nothing of this one may stay. Thrown so the whole transaction is undone. */
class Busy extends Error {}

export type AppendResult =
  | { ok: true; snapshot: RunSnapshot }
  | { ok: false; error: RejectReason | "not-found" | "busy" | "closed" };

/**
 * Add one event to a run. Sending the same event id again changes nothing and
 * answers with the current state, so a retry after a lost connection is safe.
 */
export async function appendEvent(userId: string, id: string, eventId: string, input: RunEventInput): Promise<AppendResult> {
  const { idBySlug } = await loadExercises();
  const write = async (tx: Prisma.TransactionClient) => {
    const session = await tx.session.findFirst({ where: { id, userId }, select: RUN_SELECT });
    const run = session && readRun(session.context);
    if (!session || !run) return { ok: false as const, error: "not-found" as const };
    if (run.events.some((e) => e.id === eventId)) return { ok: true as const, began: false, finished: false };

    const now = Date.now();
    // A workout that is over, or was left for hours, takes nothing more.
    if (!isOpen(session.status)) return { ok: false as const, error: "closed" as const };
    if (overdue(run, session.status, now).left) {
      const closed = await writeOverdue(tx, session, run, now);
      return { ok: false as const, error: closed ? ("closed" as const) : ("busy" as const) };
    }
    const accepted = accept(run.workout, run.events, input, eventId, now);
    if (!accepted.ok) return { ok: false as const, error: accepted.reason };
    const added = accepted.events.slice(run.events.length);
    const view = replay(run.workout, accepted.events, now);

    const begins = added.some((e) => e.type === "begin");
    if (begins) {
      // One active workout per player (the database enforces it): another one
      // still open is closed before this one becomes active, and the work
      // done in it is kept.
      const others = await tx.session.findMany({ where: { userId, status: "active", id: { not: session.id } }, select: RUN_SELECT });
      for (const other of others) {
        const otherRun = readRun(other.context);
        const closing = otherRun ? closeAbandoned(otherRun.workout, otherRun.events, now) : [];
        if (otherRun && closing.length > 0) {
          if (!(await writeServerEvents(tx, other, otherRun, closing, true, now))) throw new Busy();
        } else {
          // A workout from before this core has no log to close: it is only marked.
          await tx.session.update({ where: { id: other.id }, data: { status: "abandoned", completedAt: new Date(now) } });
        }
      }
    }

    // The revision check makes two simultaneous writes impossible to interleave.
    const updated = await tx.session.updateMany({
      where: { id: session.id, revision: session.revision },
      data: {
        revision: { increment: 1 },
        context: asJson({ run: { workout: run.workout, events: accepted.events } }),
        ...(begins ? { status: "active", startedAt: new Date(now) } : {}),
        ...(view.phase === "summary" ? { status: "done", completedAt: new Date(now) } : {}),
      },
    });
    if (updated.count === 0) throw new Busy();

    await writeStationResults(tx, session.blocks, run.workout, added, view);

    // A report with a known amount is also a SetLog row: the source of truth for volume and records.
    for (const event of added) {
      if (event.type !== "report") continue;
      const order = run.workout.stations.findIndex((s) => s.id === event.station);
      const block = session.blocks.find((b) => b.order === order);
      const station = view.stations.find((s) => s.id === event.station);
      const report = station?.reports.at(-1);
      if (!block || !station || !report || report.amount === null) continue;
      const exerciseId = idBySlug.get(run.workout.stations[order].exercises[report.exerciseIndex].slug);
      if (!exerciseId) continue;
      const setIndex = station.reports.filter((r) => r.exerciseIndex === report.exerciseIndex).length - 1;
      const previous = station.reports.at(-2);
      const data = {
        targetReps: report.target,
        actualReps: report.amount,
        workSec: Math.max(0, Math.round((report.at - report.startedAt) / 1000)),
        restSec: previous ? Math.max(0, Math.round((report.startedAt - previous.at) / 1000)) : null,
        completedAt: new Date(report.at),
        reportedAt: new Date(now),
        timingSource: "server",
      };
      await tx.setLog.upsert({
        where: { blockId_exerciseId_setIndex: { blockId: block.id, exerciseId, setIndex } },
        create: { userId, blockId: block.id, exerciseId, setIndex, ...data },
        update: data,
      });
    }

    return { ok: true as const, began: begins, finished: view.phase === "summary" && added.some((e) => e.type === "finish") };
  };
  const outcome = await prisma.$transaction(write).catch((error: unknown) => {
    if (error instanceof Busy) return { ok: false as const, error: "busy" as const };
    throw error;
  });

  if (!outcome.ok) return outcome;
  if (outcome.began) void recordEvent("session_started", { userId });
  if (outcome.finished) void recordEvent("session_completed", { userId });

  const snapshot = await loadRun(userId, id);
  return snapshot ? { ok: true, snapshot } : { ok: false, error: "not-found" };
}

/* ---------- The home screen ---------- */

export interface PlaceOption {
  kind: LocationKind;
  equipment: string[];
}

/** The player's places and what each one has. */
export async function placesFor(userId: string): Promise<PlaceOption[]> {
  await ensureLocationProfiles(prisma, userId);
  const profiles = await prisma.locationProfile.findMany({ where: { userId }, select: { kind: true, equipment: true } });
  return PLACES.flatMap((kind) => {
    const profile = profiles.find((p) => p.kind === kind);
    return profile ? [{ kind, equipment: Array.isArray(profile.equipment) ? (profile.equipment as string[]) : [] }] : [];
  });
}

export interface PastWorkout {
  id: string;
  /** YYYY-MM-DD, local day. */
  day: string;
  minutes: number | null;
  games: number;
  rounds: number;
}

/** The last few finished workouts, newest first. */
export async function recentWorkouts(userId: string, take = 3): Promise<PastWorkout[]> {
  const sessions = await prisma.session.findMany({
    where: { userId, status: "done", blocks: { some: { type: "game" } } },
    orderBy: { completedAt: "desc" },
    take,
    select: { id: true, date: true, startedAt: true, completedAt: true, blocks: { where: { type: "game" }, select: { payload: true } } },
  });
  return sessions.map((s) => {
    const results = s.blocks.flatMap((b) => {
      const { result } = b.payload as unknown as StationBlock;
      return result ? [result] : [];
    });
    return {
      id: s.id,
      day: s.date.toISOString().slice(0, 10),
      minutes: s.startedAt && s.completedAt ? Math.max(1, Math.round((s.completedAt.getTime() - s.startedAt.getTime()) / 60000)) : null,
      games: results.length,
      rounds: results.reduce((sum, r) => sum + r.score.value, 0),
    };
  });
}
