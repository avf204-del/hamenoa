/**
 * Localization core (C1). Pure: no React, Next or storage.
 *
 * Two mechanisms, both checked by the compiler:
 * - typed dictionaries for the experience screens (`experience-copy.ts`);
 * - whole-message pairs `t(he, en)` for existing trainee screens, so a
 *   string cannot ship in one language only and no sentence is assembled
 *   from fragments.
 * Stored data stays canonical: weights in kg, instants in UTC. Locale,
 * units and time zone are independent choices.
 */
export type Locale = "he" | "en";
export type Units = "kg" | "lb";

export const LOCALE_COOKIE = "hm-locale";
export const UNITS_COOKIE = "hm-units";
export const TZ_COOKIE = "hm-tz";
export const DEFAULT_TIME_ZONE = "Asia/Jerusalem";

export function isLocale(v: unknown): v is Locale {
  return v === "he" || v === "en";
}
export function isUnits(v: unknown): v is Units {
  return v === "kg" || v === "lb";
}

export function dirOf(locale: Locale): "rtl" | "ltr" {
  return locale === "he" ? "rtl" : "ltr";
}

export type T = (he: string, en: string) => string;

export function translator(locale: Locale): T {
  return locale === "en" ? (_he, en) => en : (he) => he;
}

/** `{n}` is replaced by the number. Hebrew and English plural rules differ. */
export function plural(
  locale: Locale,
  n: number,
  forms: { he: readonly [one: string, other: string]; en: readonly [one: string, other: string] },
): string {
  const [one, other] = forms[locale];
  return (n === 1 ? one : other).replace("{n}", String(n));
}

export const LB_PER_KG = 2.2046226218;

/** Display only; storage stays in kg. */
export function kgToDisplay(kg: number, units: Units): number {
  if (units === "kg") return Math.round(kg * 100) / 100;
  return Math.round(kg * LB_PER_KG * 10) / 10;
}

/** Convert a user-entered value to canonical kg. */
export function displayToKg(value: number, units: Units): number {
  return units === "kg" ? value : value / LB_PER_KG;
}

export function formatWeight(kg: number, units: Units): string {
  const v = kgToDisplay(kg, units);
  const rounded = units === "lb" ? Math.round(v) : v;
  return `${rounded} ${units}`;
}

export function intlLocale(locale: Locale): string {
  return locale === "he" ? "he-IL" : "en-US";
}

export function formatDate(
  iso: string | Date,
  locale: Locale,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  try {
    return new Intl.DateTimeFormat(intlLocale(locale), { ...options, timeZone }).format(d);
  } catch {
    return new Intl.DateTimeFormat(intlLocale(locale), { ...options, timeZone: DEFAULT_TIME_ZONE }).format(d);
  }
}

/** Unit suffix in the reader's language: "ק״ג" only for kg in Hebrew. */
export function unitLabel(units: Units, locale: Locale): string {
  return units === "kg" ? (locale === "he" ? "ק״ג" : "kg") : "lb";
}

/** A stored kg value shown in the chosen units, e.g. "22.5 ק״ג" / "50 lb". */
export function weightText(kg: number, units: Units, locale: Locale): string {
  const v = kgToDisplay(kg, units);
  return `${units === "lb" ? Math.round(v * 2) / 2 : v} ${unitLabel(units, locale)}`;
}

/** Stepper increment in display units: a kg step converted and rounded to a usable lb step. */
export function displayStep(stepKg: number, units: Units): number {
  if (units === "kg") return stepKg;
  const lb = stepKg * LB_PER_KG;
  return lb >= 4 ? Math.round(lb / 2.5) * 2.5 : Math.max(1, Math.round(lb));
}
