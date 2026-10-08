"use client";

// The screen's link to a run: it keeps the events, ticks the clock, derives
// the view with the same pure code the server uses, and sends what the
// player does. A press shows its effect at once; the server's answer then
// replaces the local guess.

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

interface Unsent {
  id: string;
  event: RunEventInput;
}

export interface Run {
  workout: Workout;
  view: RunView;
  now: number;
  best: Record<string, Score>;
  send: (event: RunEventInput) => void;
  /** Something the player did has not reached the server yet. */
  unsaved: boolean;
  retry: () => void;
}

const TICK_MS = 200;

export function useRun(initial: RunData): Run {
  const { id, workout } = initial;
  const router = useRouter();
  const [events, setEvents] = useState(initial.events);
  const [best, setBest] = useState(initial.best);
  // The first render uses the server's clock so server and browser agree.
  const [now, setNow] = useState(initial.serverNow);
  const [unsent, setUnsent] = useState<Unsent | null>(null);

  const eventsRef = useRef(initial.events);
  const offsetRef = useRef(0);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const storageKey = `hm-run-unsent:${id}`;

  const serverTime = useCallback(() => Date.now() + offsetRef.current, []);

  const adopt = useCallback((data: RunData) => {
    offsetRef.current = data.serverNow - Date.now();
    eventsRef.current = data.events;
    setEvents(data.events);
    setBest(data.best);
    setNow(data.serverNow);
  }, []);

  useEffect(() => {
    offsetRef.current = initial.serverNow - Date.now();
    const timer = setInterval(() => setNow(serverTime()), TICK_MS);
    return () => clearInterval(timer);
  }, [initial.serverNow, serverTime]);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/workouts/${id}`, { cache: "no-store" });
    if (response.ok) adopt((await response.json()) as RunData);
  }, [id, adopt]);

  const post = useCallback(
    async (item: Unsent) => {
      try {
        const response = await fetch(`/api/workouts/${id}/events`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(item),
        });
        if (response.ok) {
          adopt((await response.json()) as RunData);
        } else if (response.status === 403) {
          // Terms or health screening need attention before anything is saved;
          // the workout area's own gate sends the player to the right page.
          router.replace("/workout");
          return;
        } else if (response.status >= 500) {
          // The server failed, the press did not: keep it and offer to send it again.
          throw new Error("server");
        } else {
          // The server saw things differently (a clock a moment apart): take its word.
          await refresh();
        }
        setUnsent(null);
        try { localStorage.removeItem(storageKey); } catch { /* storage may be unavailable */ }
      } catch {
        // Not saved: keep the press and offer to send it again.
        setUnsent(item);
        try { localStorage.setItem(storageKey, JSON.stringify(item)); } catch { /* storage may be unavailable */ }
      }
    },
    [id, adopt, refresh, storageKey, router],
  );

  const send = useCallback(
    (event: RunEventInput) => {
      const item: Unsent = { id: crypto.randomUUID(), event };
      const local = accept(workout, eventsRef.current, event, item.id, serverTime());
      if (!local.ok) return;
      eventsRef.current = local.events;
      setEvents(local.events);
      setNow(serverTime());
      queueRef.current = queueRef.current.then(() => post(item));
    },
    [workout, post, serverTime],
  );

  const retry = useCallback(() => {
    if (unsent) queueRef.current = queueRef.current.then(() => post(unsent));
  }, [unsent, post]);

  // A press that was not saved before the page closed is sent when it reopens.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) queueRef.current = queueRef.current.then(() => post(JSON.parse(saved) as Unsent));
    } catch { /* storage may be unavailable */ }
  }, [storageKey, post]);

  // Coming back to the tab: the clock moved on while we were away.
  useEffect(() => {
    const onVisible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", retry);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", retry);
    };
  }, [refresh, retry]);

  const view = useMemo(() => replay(workout, events, now), [workout, events, now]);
  return { workout, view, now, best, send, unsaved: unsent !== null, retry };
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
