"use client";

// The screen's link to a run: it keeps the events, ticks the clock, derives
// the view with the same pure code the server uses, and sends what the
// player does. A press shows its effect at once; the server's answer then
// replaces the local guess.
//
// Presses leave in the order they were made, one at a time. If one cannot be
// saved, the ones behind it wait and new presses are paused, so nothing is
// ever saved out of order or filed under the wrong portion. Stopping a game
// is the exception: a stop is always taken and never dropped.

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { RunEvent, RunEventInput, RunView, Score, Workout } from "@/core/contract";
import { accept, replay } from "@/core/run";

export interface RunData {
  id: string;
  workout: Workout;
  events: RunEvent[];
  serverNow: number;
  best: Record<string, Score>;
}

/** A press on its way to the server. */
interface Pending {
  id: string;
  event: RunEventInput;
  /** The phone's own clock when it was pressed. */
  pressedAt: number;
}

export interface Run {
  workout: Workout;
  view: RunView;
  now: number;
  best: Record<string, Score>;
  /**
   * One press. Events passed together are one action and are saved in that
   * order. Answers whether the press was taken.
   */
  send: (...events: RunEventInput[]) => boolean;
  /** A press could not be saved yet. Until it is, only stopping a game is taken. */
  stalled: boolean;
  /** The server itself keeps failing on that press; the player may give it up. */
  canDiscard: boolean;
  /** The server did not record the last press; the screen shows the saved state. */
  notRecorded: boolean;
  retry: () => void;
  discard: () => void;
}

const TICK_MS = 200;
const REQUEST_TIMEOUT_MS = 10_000;
const RETRY_EVERY_MS = 5_000;
/** Two presses this close are one finger: the second would hit a button that just appeared. */
const DOUBLE_TAP_MS = 400;
/** A press found in storage on reopening is sent only if it is this fresh. */
const KEEP_STORED_MS = 3 * 60 * 60 * 1000;
const NOTICE_MS = 6_000;
/** After this many server errors in a row on one press, the player is offered to give it up. */
const SERVER_FAILS_BEFORE_DISCARD = 3;

type Delivery = "saved" | "refused" | "no-answer" | "server-error" | "left";

interface Answer {
  status: number;
  data: unknown;
}

function newId(): string {
  // randomUUID needs a secure page; older phones and plain-http test hosts lack it.
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** One request with a time limit on all of it; null when no answer came. */
async function ask(url: string, init?: RequestInit): Promise<Answer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, cache: "no-store", signal: controller.signal });
    // The body is read inside the limit too: a connection can die after the headers.
    const data: unknown = await response.json().catch(() => null);
    return { status: response.status, data };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isRunData(data: unknown): data is RunData {
  return typeof data === "object" && data !== null && Array.isArray((data as RunData).events);
}

const isStop = (event: RunEventInput) => event.type === "station-end";
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Presses left in storage by a page that closed before they were saved. Only
 * what the player reported or stopped is sent again: a report names its own
 * portion and a stop is never dropped. A stored "start" is not replayed, since
 * it would start a clock while nobody is ready.
 */
function storedPresses(key: string): Pending[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(saved)) return [];
    const kept: Pending[] = [];
    for (const item of saved as Pending[]) {
      const fresh = typeof item?.pressedAt === "number" && Date.now() - item.pressedAt < KEEP_STORED_MS;
      const type = item?.event?.type;
      if (!fresh || typeof item.id !== "string" || (type !== "report" && type !== "station-end")) break;
      kept.push(item);
    }
    return kept;
  } catch {
    return [];
  }
}

export function useRun(initial: RunData): Run {
  const { id, workout } = initial;
  const router = useRouter();
  const [events, setEvents] = useState(initial.events);
  const [best, setBest] = useState(initial.best);
  // The first render uses the server's clock so server and browser agree.
  const [now, setNow] = useState(initial.serverNow);
  const [stalled, setStalled] = useState(false);
  const [canDiscard, setCanDiscard] = useState(false);
  const [notRecorded, setNotRecorded] = useState(false);

  /** What is on screen: the saved events plus the presses still on their way. */
  const eventsRef = useRef(initial.events);
  /** The last events the server confirmed. */
  const savedRef = useRef(initial.events);
  const offsetRef = useRef(0);
  const pendingRef = useRef<Pending[]>([]);
  const stalledRef = useRef(false);
  const serverFailsRef = useRef(0);
  const lastPressRef = useRef(0);
  const loadedRef = useRef(false);
  /** Everything that talks to the server runs through this chain, one at a time. */
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const waitingRef = useRef(0);
  const storageKey = `hm-run-unsent:${id}`;

  const serverTime = useCallback(() => Date.now() + offsetRef.current, []);

  const remember = useCallback(() => {
    try {
      if (pendingRef.current.length > 0) localStorage.setItem(storageKey, JSON.stringify(pendingRef.current));
      else localStorage.removeItem(storageKey);
    } catch { /* storage may be unavailable */ }
  }, [storageKey]);

  const setStall = useCallback((value: boolean) => {
    stalledRef.current = value;
    setStalled(value);
    if (!value) {
      serverFailsRef.current = 0;
      setCanDiscard(false);
    }
  }, []);

  /** Show the saved events with the presses that are still on their way on top. */
  const show = useCallback(() => {
    let local = savedRef.current;
    for (const item of pendingRef.current) {
      const result = accept(workout, local, item.event, item.id, serverTime());
      if (!result.ok) break;
      local = result.events;
    }
    eventsRef.current = local;
    setEvents(local);
    setNow(serverTime());
  }, [workout, serverTime]);

  const adopt = useCallback(
    (data: RunData, askedAt: number) => {
      // The answer was stamped somewhere between asking and hearing back.
      offsetRef.current = data.serverNow - (askedAt + Date.now()) / 2;
      savedRef.current = data.events;
      setBest(data.best);
      show();
    },
    [show],
  );

  /** Where the player is sent when this page can no longer save anything. */
  const leaveFor = useCallback(
    ({ status, data }: Answer): boolean => {
      if (status === 401) {
        // Signed out. What was pressed stays stored and is sent after signing in again.
        router.replace("/login");
        return true;
      }
      if (status === 403) {
        // Terms or health screening need attention before anything more is saved.
        const code = (data as { code?: string } | null)?.code;
        router.replace(code === "health-required" ? "/health" : "/terms");
        return true;
      }
      if (status === 404) {
        // This workout no longer exists (a newer plan replaced it).
        pendingRef.current = [];
        remember();
        router.replace("/workout");
        return true;
      }
      return false;
    },
    [router, remember],
  );

  const refresh = useCallback(async () => {
    const askedAt = Date.now();
    const answer = await ask(`/api/workouts/${id}`);
    // No answer: offline. The next press or the next visit will tell.
    if (!answer) return;
    if (answer.status === 200 && isRunData(answer.data)) adopt(answer.data, askedAt);
    else leaveFor(answer);
  }, [id, adopt, leaveFor]);

  const deliver = useCallback(
    async (item: Pending): Promise<Delivery> => {
      for (let attempt = 0; attempt < 4; attempt++) {
        const askedAt = Date.now();
        const answer = await ask(`/api/workouts/${id}/events`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: item.id, event: item.event }),
        });
        if (!answer) return "no-answer";
        if (answer.status === 200) {
          if (!isRunData(answer.data)) return "no-answer";
          pendingRef.current = pendingRef.current.filter((p) => p.id !== item.id);
          remember();
          adopt(answer.data, askedAt);
          return "saved";
        }
        // Two writes met on the server: nothing was lost, ask again.
        if (answer.status === 409) {
          await pause(250 * (attempt + 1));
          continue;
        }
        if (leaveFor(answer)) return "left";
        return answer.status >= 500 || answer.status === 429 ? "server-error" : "refused";
      }
      return "server-error";
    },
    [id, adopt, leaveFor, remember],
  );

  /**
   * Let go of a press the server will not take. A stop pressed after it is
   * still sent; anything else that followed was pressed on a screen that was
   * not true, and no longer applies.
   */
  const giveUp = useCallback(
    async (item: Pending, tell: boolean) => {
      pendingRef.current = pendingRef.current.filter((p) => p.id !== item.id && isStop(p.event));
      remember();
      // Back to what was saved, even if the server cannot be asked right now.
      show();
      if (tell) setNotRecorded(true);
      await refresh();
    },
    [remember, show, refresh],
  );

  /** Send what is waiting, in order, stopping at the first press that cannot be saved. */
  const flush = useCallback(async () => {
    while (pendingRef.current.length > 0) {
      const item = pendingRef.current[0];
      const outcome = await deliver(item);
      if (outcome === "saved") {
        serverFailsRef.current = 0;
        continue;
      }
      if (outcome === "left") return;
      if (outcome === "refused") {
        // A refused stop means the game had already ended, which is what the
        // player asked for: nothing to tell.
        await giveUp(item, !isStop(item.event));
        continue;
      }
      serverFailsRef.current = outcome === "server-error" ? serverFailsRef.current + 1 : 0;
      setCanDiscard(serverFailsRef.current >= SERVER_FAILS_BEFORE_DISCARD);
      stalledRef.current = true;
      setStalled(true);
      return;
    }
    setStall(false);
  }, [deliver, giveUp, setStall]);

  const enqueue = useCallback((work: () => Promise<void>) => {
    waitingRef.current += 1;
    const run = () => work().finally(() => { waitingRef.current -= 1; });
    chainRef.current = chainRef.current.then(run, run);
  }, []);

  const send = useCallback(
    (...inputs: RunEventInput[]): boolean => {
      // While a press is unsaved, new ones would be built on a screen that
      // may not be true. Stopping a game is always taken: it waits its turn.
      if (stalledRef.current && !inputs.some(isStop)) return false;
      const pressedAt = Date.now();
      if (pressedAt - lastPressRef.current < DOUBLE_TAP_MS) return false;

      let local = eventsRef.current;
      const items: Pending[] = [];
      for (const event of inputs) {
        const item: Pending = { id: newId(), event, pressedAt };
        const result = accept(workout, local, event, item.id, serverTime());
        if (!result.ok) break;
        local = result.events;
        items.push(item);
      }
      if (items.length === 0) return false;

      lastPressRef.current = pressedAt;
      pendingRef.current = [...pendingRef.current, ...items];
      remember();
      eventsRef.current = local;
      setEvents(local);
      setNow(serverTime());
      setNotRecorded(false);
      enqueue(flush);
      return true;
    },
    [workout, serverTime, remember, enqueue, flush],
  );

  const retry = useCallback(() => {
    // One attempt at a time: a slow connection must not pile up retries.
    if (waitingRef.current === 0) enqueue(flush);
  }, [enqueue, flush]);

  const discard = useCallback(() => {
    enqueue(async () => {
      const item = pendingRef.current[0];
      if (item) await giveUp(item, true);
      serverFailsRef.current = 0;
      setCanDiscard(false);
      await flush();
    });
  }, [enqueue, giveUp, flush]);

  /** Catch up with the server: send what waits, or just read the saved state. */
  const sync = useCallback(() => {
    enqueue(() => (pendingRef.current.length > 0 ? flush() : refresh()));
  }, [enqueue, flush, refresh]);

  useEffect(() => {
    offsetRef.current = initial.serverNow - Date.now();
    const timer = setInterval(() => setNow(serverTime()), TICK_MS);
    return () => clearInterval(timer);
  }, [initial.serverNow, serverTime]);

  // On opening: send what an earlier page left unsaved, and set the clock by
  // a fresh answer rather than by the moment the page was drawn.
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    pendingRef.current = storedPresses(storageKey);
    remember();
    sync();
  }, [storageKey, remember, sync]);

  // Coming back to the tab or to a connection: the clock moved on meanwhile.
  useEffect(() => {
    const onVisible = () => { if (!document.hidden) sync(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", sync);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", sync);
    };
  }, [sync]);

  // While a press is unsaved, keep trying without asking the player to.
  useEffect(() => {
    if (!stalled) return;
    const timer = setInterval(() => { if (!document.hidden) retry(); }, RETRY_EVERY_MS);
    return () => clearInterval(timer);
  }, [stalled, retry]);

  useEffect(() => {
    if (!notRecorded) return;
    const timer = setTimeout(() => setNotRecorded(false), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notRecorded]);

  const view = useMemo(() => replay(workout, events, now), [workout, events, now]);
  return { workout, view, now, best, send, stalled, canDiscard, notRecorded, retry, discard };
}

/**
 * Guards something that has just appeared against the second tap of the same
 * finger: `mark` when it appears, and `fresh` says whether it is still too
 * new to be pressed on purpose.
 */
export function useTapGuard(): { mark: () => void; fresh: () => boolean } {
  const shownAt = useRef(0);
  const mark = useCallback(() => { shownAt.current = Date.now(); }, []);
  const fresh = useCallback(() => Date.now() - shownAt.current < DOUBLE_TAP_MS, []);
  return { mark, fresh };
}

/** Keeps the phone's screen on while a workout is on it. */
export function useScreenAwake(active: boolean): void {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = () => {
      navigator.wakeLock.request("screen").then((l) => { if (cancelled) void l.release(); else lock = l; }).catch(() => {});
    };
    const onVisible = () => { if (!document.hidden) request(); };
    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [active]);
}

const SHORT_SCREEN = "(max-height: 720px)";

function watchShortScreen(onChange: () => void): () => void {
  const query = window.matchMedia(SHORT_SCREEN);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** A phone browser with its bars showing leaves little height: screens tighten up. */
export function useShortScreen(): boolean {
  return useSyncExternalStore(watchShortScreen, () => window.matchMedia(SHORT_SCREEN).matches, () => false);
}
