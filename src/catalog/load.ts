// Reads the exercise catalog from the database into the pure ExerciseData
// shape the workout core consumes. Server only.

import type { EnvConstraint, ExerciseData, Pattern } from "@/catalog/types";
import { createAsyncCache } from "@/lib/async-cache";
import { prisma } from "@/lib/db";
import { muscleGroupList } from "@/lib/muscle-groups";
import { isRetiredExercise } from "@/lib/retired-exercises";
import { isBaseTrainingExercise, type TrainingType } from "@/lib/training-types";

type ExerciseRow = Awaited<ReturnType<typeof prisma.exercise.findMany>>[number];

/** Muscle groups are computed here, once per exercise, from the stored muscle data. */
export function exerciseRowToData(e: ExerciseRow): ExerciseData {
  return {
    slug: e.slug,
    trainingType: (e.trainingType ?? "base") as TrainingType,
    provenanceId: e.provenanceId ?? null,
    nameHe: e.nameHe,
    modality: e.modality as ExerciseData["modality"],
    pattern: e.pattern as Pattern,
    equipment: e.equipment as string[],
    stationType: e.stationType as ExerciseData["stationType"],
    skillLevel: e.skillLevel,
    loadClass: e.loadClass as ExerciseData["loadClass"],
    repPaceSecPerRep: e.repPaceSecPerRep,
    systemicCost: e.systemicCost as ExerciseData["systemicCost"],
    constraints: e.constraints as EnvConstraint[],
    substitutes: e.substitutes as string[],
    scalingEasier: e.scalingEasierId,
    scalingHarder: e.scalingHarderId,
    unilateral: e.unilateral,
    muscleGroups: muscleGroupList({
      primaryMuscles: e.primaryMuscles,
      secondaryMuscles: e.secondaryMuscles,
      pattern: e.pattern as Pattern,
    }),
  };
}

// The table changes only through the importer or the admin editor, and it is
// read on every workout build. Rows are cached per process for a few minutes;
// the arrays and maps derived from them are rebuilt on every call.
const EXERCISES_TTL_MS = 5 * 60_000;
const exercisesCache = createAsyncCache(() => prisma.exercise.findMany({ orderBy: { slug: "asc" } }), EXERCISES_TTL_MS);

/** Call after every write to the Exercise table. */
export function invalidateExercisesCache(): void {
  exercisesCache.clear();
}

export async function loadExercises(): Promise<{
  data: ExerciseData[];
  idBySlug: Map<string, string>;
  slugById: Map<string, string>;
}> {
  const rows = await exercisesCache.get();
  return {
    // The id maps cover every row so stored logs stay readable; only base,
    // non-retired exercises are offered to a new workout.
    data: rows.filter((row) => isBaseTrainingExercise(row) && !isRetiredExercise(row.slug)).map(exerciseRowToData),
    idBySlug: new Map(rows.map((r) => [r.slug, r.id])),
    slugById: new Map(rows.map((r) => [r.id, r.slug])),
  };
}
