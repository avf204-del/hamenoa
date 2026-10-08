import type { Copy } from "@/core/contract";
import type { Locale } from "@/i18n";

/** Seconds as a clock: 252 → "4:12". Never negative. */
export function clock(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** Whole seconds left until a moment, counted up so "0" shows only at the end. */
export function secondsUntil(at: number | null, now: number): number {
  return at === null ? 0 : Math.max(0, Math.ceil((at - now) / 1000));
}

export function say(copy: Copy, locale: Locale): string {
  return locale === "en" && copy.en ? copy.en : copy.he;
}
