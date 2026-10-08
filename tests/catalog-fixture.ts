// The real exercise catalog as the workout core sees it, read straight from
// data/tagging.yaml so planner tests run against the content that ships.

import type { ExerciseData } from "../src/catalog/types";
import { muscleGroupList } from "../src/lib/muscle-groups";
import { exerciseDataFromEntry, loadTagging } from "../scripts/import-exercises";

export function realCatalog(): ExerciseData[] {
  return Object.entries(loadTagging()).map(([slug, entry]) => {
    const row = exerciseDataFromEntry(slug, entry);
    const muscles = (value: unknown) => (Array.isArray(value) ? (value as string[]) : null);
    return {
      slug,
      trainingType: row.trainingType,
      nameHe: row.nameHe,
      nameEn: row.nameEn,
      modality: row.modality,
      pattern: row.pattern,
      equipment: row.equipment,
      stationType: row.stationType,
      skillLevel: row.skillLevel,
      loadClass: row.loadClass,
      repPaceSecPerRep: row.repPaceSecPerRep,
      systemicCost: row.systemicCost,
      constraints: row.constraints,
      substitutes: row.substitutes,
      scalingEasier: row.scalingEasierId,
      scalingHarder: row.scalingHarderId,
      unilateral: row.unilateral,
      muscleGroups: muscleGroupList({
        primaryMuscles: muscles(row.primaryMuscles),
        secondaryMuscles: muscles(row.secondaryMuscles),
        pattern: row.pattern,
      }),
    };
  });
}
