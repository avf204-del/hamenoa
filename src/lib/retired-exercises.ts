import archive from "../../data/training-types-archived/manifest.json";

/** Selection-only retirement. Never rewrite saved workout slugs, ids or logs. */
export const RETIRED_EXERCISE_ALIASES: Readonly<Record<string, string>> = {
  "high-knees": "fast-skipping",
};
export const RETIRED_EXERCISE_SLUGS = [...Object.keys(RETIRED_EXERCISE_ALIASES), ...Object.keys(archive.exercises)];

export function isRetiredExercise(slug: string): boolean {
  return RETIRED_EXERCISE_SLUGS.includes(slug);
}
