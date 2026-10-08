// A run is a workout plus the ordered events of what the player did.
// Everything a screen shows is derived here from those two and the clock.
//
// Pure: no React, Next or Prisma, and no reading of the real time. The caller
// passes `now`, so the same inputs always give the same view.

import {
  COUNTDOWN_SEC,
  type EndReason,
  type Phase,
  type Report,
  type RunEvent,
  type RunEventInput,
  type RunView,
  type Station,
  type StationView,
  type Workout,
} from "@/core/contract";
import { ruleFor } from "@/core/games";

/** What happened at one station so far. */
interface Track {
  station: Station;
  clockStartsAt: number;
  /** Set while a portion is being worked on. */
  portionStartedAt: number | null;
  reports: Report[];
  endReason: EndReason | null;
  endedAt: number | null;
}

function clockEnd(track: Track): number {
  return track.clockStartsAt + track.station.frameSec * 1000;
}

function readyView(station: Station): StationView {
  const rule = ruleFor(station.game);
  return {
    id: station.id,
    status: "ready",
    clockStartsAt: null,
    clockEndsAt: null,
    restEndsAt: null,
    portion: rule.next(station, []),
    portionStartedAt: null,
    reports: [],
    score: rule.score(station, []),
    endReason: null,
    endedAt: null,
  };
}

function viewOf(track: Track, now: number): StationView {
  const { station, reports } = track;
  const rule = ruleFor(station.game);
  const endsAt = clockEnd(track);
  const portion = rule.next(station, reports);
  const last = reports.at(-1);

  const view: StationView = {
    id: station.id,
    status: "ended",
    clockStartsAt: track.clockStartsAt,
    clockEndsAt: endsAt,
    restEndsAt: null,
    portion,
    portionStartedAt: track.portionStartedAt,
    reports,
    score: rule.score(station, reports),
    endReason: track.endReason,
    endedAt: track.endedAt,
  };

  if (track.endedAt !== null) return view;

  if (now < track.clockStartsAt) return { ...view, status: "countdown" };

  if (track.portionStartedAt !== null) {
    // The bell does not erase work in progress: the player may still report it.
    return { ...view, status: now >= endsAt ? "last-report" : "working" };
  }

  // Between portions.
  if (portion === null) {
    return { ...view, endReason: "rule", endedAt: last ? last.at : track.clockStartsAt };
  }
  if (now >= endsAt) return { ...view, endReason: "time", endedAt: endsAt };

  const restFrom = last ? last.at : track.clockStartsAt;
  return { ...view, status: "resting", restEndsAt: restFrom + rule.restAfter(station, reports) * 1000 };
}

/** Where the player is, given the plan, what they did and the time. */
export function replay(workout: Workout, events: readonly RunEvent[], now: number): RunView {
  let phase: Phase = "preview";
  let stationIndex = 0;
  let startedAt: number | null = null;
  let finishedAt: number | null = null;
  const tracks: Track[] = [];
  const trackOf = (id: string) => tracks.find((t) => t.station.id === id);

  for (const event of events) {
    switch (event.type) {
      case "begin":
        phase = "warmup";
        startedAt = event.at;
        break;
      case "warmup-done":
        phase = workout.stations.length > 0 ? "station" : "cooldown";
        stationIndex = 0;
        break;
      case "station-start": {
        const station = workout.stations.find((s) => s.id === event.station);
        if (!station || trackOf(station.id)) break;
        // The first portion starts with the clock: no extra tap after the 3-2-1.
        tracks.push({ station, clockStartsAt: event.at, portionStartedAt: event.at, reports: [], endReason: null, endedAt: null });
        break;
      }
      case "portion-start": {
        const track = trackOf(event.station);
        if (track && track.endedAt === null && track.portionStartedAt === null) track.portionStartedAt = event.at;
        break;
      }
      case "report": {
        const track = trackOf(event.station);
        if (!track || track.endedAt !== null || track.portionStartedAt === null) break;
        const portion = ruleFor(track.station.game).next(track.station, track.reports);
        if (!portion) break;
        track.reports.push({
          exerciseIndex: portion.exerciseIndex,
          target: portion.target,
          amount: event.amount,
          startedAt: track.portionStartedAt,
          // A report typed after the bell still describes work done before it.
          at: Math.min(event.at, clockEnd(track)),
        });
        track.portionStartedAt = null;
        break;
      }
      case "station-end": {
        const track = trackOf(event.station);
        if (!track || track.endedAt !== null) break;
        track.endedAt = event.at;
        track.endReason = event.reason;
        track.portionStartedAt = null;
        break;
      }
      case "next":
        if (stationIndex + 1 < workout.stations.length) stationIndex += 1;
        else phase = "cooldown";
        break;
      case "to-cooldown":
        phase = "cooldown";
        break;
      case "finish":
        phase = "summary";
        finishedAt = event.at;
        break;
    }
  }

  const stations = tracks.map((track) => viewOf(track, now));
  const current = phase === "station" ? workout.stations[stationIndex] : undefined;
  const station = current ? (stations.find((v) => v.id === current.id) ?? readyView(current)) : null;
  return { phase, stationIndex, station, stations, startedAt, finishedAt };
}

/**
 * Station endings the clock or a rule already decided but nobody recorded
 * yet. The server writes them down before it accepts anything new, so the
 * stored log always says explicitly how each station ended.
 */
export function impliedEvents(workout: Workout, events: readonly RunEvent[], now: number): RunEvent[] {
  const recorded = new Set(events.flatMap((e) => (e.type === "station-end" ? [e.station] : [])));
  return replay(workout, events, now)
    .stations.filter((s) => s.status === "ended" && !recorded.has(s.id) && s.endReason !== null && s.endedAt !== null)
    .map((s) => ({ id: `${s.id}:end`, at: s.endedAt!, type: "station-end" as const, station: s.id, reason: s.endReason! }));
}

export type RejectReason =
  | "not-now"
  | "wrong-station"
  | "rest-not-over"
  | "bad-amount"
  | "end-station-first"
  | "stopped-for-pain";

export type Accepted = { ok: true; events: RunEvent[] } | { ok: false; reason: RejectReason };

/** A press slightly before the rest ends still counts: clocks differ by a moment. */
const REST_TOLERANCE_MS = 400;

const MID_GAME: ReadonlySet<StationView["status"]> = new Set(["countdown", "working", "resting", "last-report"]);

/**
 * Decide whether the player may do `input` now. On success returns the full
 * log to store: what was there, anything the clock implied, and the new event.
 */
export function accept(
  workout: Workout,
  events: readonly RunEvent[],
  input: RunEventInput,
  id: string,
  now: number,
): Accepted {
  const settled = [...events, ...impliedEvents(workout, events, now)];
  const view = replay(workout, settled, now);
  const station = view.station;
  const reject = (reason: RejectReason): Accepted => ({ ok: false, reason });
  const done = (at = now): Accepted => ({ ok: true, events: [...settled, { ...input, id, at }] });

  switch (input.type) {
    case "begin":
      return view.phase === "preview" ? done() : reject("not-now");

    case "warmup-done":
      return view.phase === "warmup" ? done() : reject("not-now");

    case "station-start":
      if (view.phase !== "station" || !station || station.status !== "ready") return reject("not-now");
      if (input.station !== station.id) return reject("wrong-station");
      return done(now + COUNTDOWN_SEC * 1000);

    case "portion-start":
      if (view.phase !== "station" || !station || station.status !== "resting") return reject("not-now");
      if (input.station !== station.id) return reject("wrong-station");
      if (now < station.restEndsAt! - REST_TOLERANCE_MS) return reject("rest-not-over");
      return done();

    case "report": {
      if (view.phase !== "station" || !station) return reject("not-now");
      if (station.status !== "working" && station.status !== "last-report") return reject("not-now");
      if (input.station !== station.id) return reject("wrong-station");
      const { amount } = input;
      const target = station.portion?.target ?? 0;
      if (amount !== null && (!Number.isInteger(amount) || amount < 0 || amount > target)) return reject("bad-amount");
      return done();
    }

    case "station-end":
      if (view.phase !== "station" || !station || !MID_GAME.has(station.status)) return reject("not-now");
      if (input.station !== station.id) return reject("wrong-station");
      return done();

    case "next":
      if (view.phase !== "station" || !station || station.status !== "ended") return reject("not-now");
      if (station.endReason === "pain") return reject("stopped-for-pain");
      return done();

    case "to-cooldown":
      if (view.phase === "warmup") return done();
      if (view.phase !== "station" || !station) return reject("not-now");
      if (MID_GAME.has(station.status)) return reject("end-station-first");
      return done();

    case "finish":
      if (view.phase === "preview" || view.phase === "summary") return reject("not-now");
      if (view.phase === "station" && station && MID_GAME.has(station.status)) return reject("end-station-first");
      return done();
  }
}
