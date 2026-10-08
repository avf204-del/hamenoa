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
import type { RunEvent, RunEventInput, Score, Station, Workout } from "@/core/contract";
import { compareScores } from "@/core/games";
import { planWorkout, PlanError, type PlanErrorCode } from "@/core/plan";
import { accept, replay, type RejectReason } from "@/core/run";
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

  const [{ data: exercises }, recent] = await Promise.all([loadExercises(), recentSlugs(userId)]);

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

/* ---------- Reading ---------- */

export async function loadRun(userId: string, id: string): Promise<RunSnapshot | null> {
  const session = await prisma.session.findFirst({ where: { id, userId }, select: { id: true, context: true } });
  const run = session && readRun(session.context);
  if (!session || !run) return null;
  return { id: session.id, ...run, serverNow: Date.now(), best: await bestResults(userId, session.id, run.workout) };
}

/** The player's unfinished workout, if there is one. */
export async function openWorkoutId(userId: string): Promise<string | null> {
  const session = await prisma.session.findFirst({
    where: { userId, status: { in: ["active", "planned"] }, blocks: { some: { type: "game" } } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return session?.id ?? null;
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

export type AppendResult =
  | { ok: true; snapshot: RunSnapshot }
  | { ok: false; error: RejectReason | "not-found" | "busy" };

/**
 * Add one event to a run. Sending the same event id again changes nothing and
 * answers with the current state, so a retry after a lost connection is safe.
 */
export async function appendEvent(userId: string, id: string, eventId: string, input: RunEventInput): Promise<AppendResult> {
  const { idBySlug } = await loadExercises();
  const outcome = await prisma.$transaction(async (tx) => {
    const session = await tx.session.findFirst({
      where: { id, userId },
      select: { id: true, revision: true, context: true, status: true, blocks: { select: { id: true, order: true, payload: true } } },
    });
    const run = session && readRun(session.context);
    if (!session || !run) return { ok: false as const, error: "not-found" as const };
    if (run.events.some((e) => e.id === eventId)) return { ok: true as const, began: false, finished: false };

    const now = Date.now();
    const accepted = accept(run.workout, run.events, input, eventId, now);
    if (!accepted.ok) return { ok: false as const, error: accepted.reason };
    const added = accepted.events.slice(run.events.length);
    const view = replay(run.workout, accepted.events, now);

    // The revision check makes two simultaneous writes impossible to interleave.
    const updated = await tx.session.updateMany({
      where: { id: session.id, revision: session.revision },
      data: {
        revision: { increment: 1 },
        context: asJson({ run: { workout: run.workout, events: accepted.events } }),
        ...(added.some((e) => e.type === "begin") ? { status: "active", startedAt: new Date(now) } : {}),
        ...(view.phase === "summary" ? { status: "done", completedAt: new Date(now) } : {}),
      },
    });
    if (updated.count === 0) return { ok: false as const, error: "busy" as const };

    if (added.some((e) => e.type === "begin")) {
      // One active workout per player: an older one that was left open is closed.
      await tx.session.updateMany({
        where: { userId, status: "active", id: { not: session.id } },
        data: { status: "abandoned", completedAt: new Date(now) },
      });
    }

    for (const event of added) {
      if (event.type !== "report" && event.type !== "station-end") continue;
      const order = run.workout.stations.findIndex((s) => s.id === event.station);
      const block = session.blocks.find((b) => b.order === order);
      const station = view.stations.find((s) => s.id === event.station);
      if (!block || !station) continue;

      if (event.type === "report") {
        const report = station.reports.at(-1);
        if (!report || report.amount === null) continue;
        const exercise = run.workout.stations[order].exercises[report.exerciseIndex];
        const exerciseId = idBySlug.get(exercise.slug);
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
      } else {
        const payload = block.payload as unknown as StationBlock;
        const result = { score: station.score, reason: event.reason, endedAt: event.at };
        await tx.block.update({ where: { id: block.id }, data: { payload: asJson({ ...payload, result }) } });
      }
    }

    return { ok: true as const, began: added.some((e) => e.type === "begin"), finished: view.phase === "summary" && added.some((e) => e.type === "finish") };
  });

  if (!outcome.ok) return outcome;
  if (outcome.began) void recordEvent("session_started", { userId });
  if (outcome.finished) void recordEvent("session_completed", { userId });

  const snapshot = await loadRun(userId, id);
  return snapshot ? { ok: true, snapshot } : { ok: false, error: "not-found" };
}
