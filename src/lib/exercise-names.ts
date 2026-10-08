// Localized exercise names and instructions (C1). Pure; no Prisma import.
// Plans store the Hebrew name (engine output); display resolves by key.
import type { Locale } from "@/i18n";
import type { ExerciseInfoMap } from "@/lib/exercise-info";

function humanize(key: string): string {
  const s = key.replace(/^(drill|stretch):/, "").replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Name for display; in English never falls back to Hebrew. */
export function exerciseName(info: ExerciseInfoMap | undefined, key: string, nameHe: string, locale: Locale): string {
  if (locale === "he") return nameHe;
  return info?.[key]?.nameEn || humanize(key);
}

/** Instructions for display in the chosen language ("" if none exist). */
export function exerciseInstructions(info: ExerciseInfoMap | undefined, key: string, locale: Locale): string {
  const entry = info?.[key];
  if (!entry) return "";
  return locale === "he" ? entry.instructionsHe : entry.instructionsEn ?? "";
}
