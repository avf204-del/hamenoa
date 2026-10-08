"use client";

// מחזוריות: לפי המערכת ← כהה ← בהיר. הבחירה נשמרת ב-localStorage
// והסקריפט ב-layout מחיל אותה לפני הציור הראשון (בלי הבזק).
// localStorage הוא store חיצוני — נקרא דרך useSyncExternalStore כדי
// שהרינדור בשרת (בלי העדפה) יתעדכן נקי אחרי ההידרציה.

import { useEffect, useSyncExternalStore } from "react";
import { MonitorIcon, Moon, Sun } from "@/components/icons";

type ThemePref = "system" | "dark" | "light";

const STORAGE_KEY = "hamenoa-theme";
const CYCLE: ThemePref[] = ["system", "dark", "light"];

const PREF_LABELS: Record<ThemePref, string> = {
  system: "לפי המערכת",
  dark: "כהה",
  light: "בהיר",
};

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readPref(): ThemePref {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : "system";
  } catch {
    // דפדפן שחוסם אחסון — נופלים לברירת המחדל
    return "system";
  }
}

function resolve(pref: ThemePref): "dark" | "light" {
  if (pref !== "system") return pref;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function apply(pref: ThemePref) {
  document.documentElement.dataset.theme = resolve(pref);
  document.documentElement.dataset.themePreference = pref;
}

function writePref(pref: ThemePref) {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // בלי אחסון — הערכה תחול רק לסשן הנוכחי
  }
  apply(pref);
  listeners.forEach((listener) => listener());
}

export default function ThemeToggle() {
  const pref = useSyncExternalStore(subscribe, readPref, () => "system" as const);

  // מחיל את הערכה בכל שינוי העדפה — כולל שינוי שהגיע מטאב אחר (אירוע storage)
  useEffect(() => {
    apply(pref);
  }, [pref]);

  // כשהבחירה היא "לפי המערכת" — מגיבים לשינוי חי של ערכת המערכת
  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const cycle = () => {
    writePref(CYCLE[(CYCLE.indexOf(pref) + 1) % CYCLE.length]);
  };

  const Icon = pref === "system" ? MonitorIcon : pref === "dark" ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`ערכת נושא: ${PREF_LABELS[pref]}. לחיצה מחליפה.`}
      title={`ערכת נושא: ${PREF_LABELS[pref]}`}
      className="flex h-12 w-12 items-center justify-center rounded-(--r-s) border border-line bg-raised text-fg-2 transition-colors duration-(--t-quick) hover:text-fg"
    >
      <Icon size={19} />
    </button>
  );
}
