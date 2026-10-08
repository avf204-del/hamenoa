// The exercise catalog's own vocabulary. Pure types: no React, Next or Prisma.
// The workout core (src/core) and the admin editor both read exercises
// through these types; nothing here describes a workout.

import type { MuscleGroupSlug } from "@/lib/muscle-groups";
import type { TrainingType } from "@/lib/training-types";
export type { TrainingType } from "@/lib/training-types";

export type Modality = "cardio" | "gymnastics" | "weights";

export type Pattern =
  | "squat"
  | "hinge"
  | "pushV"
  | "pushH"
  | "pullV"
  | "pullH"
  | "lunge"
  | "carry"
  | "core"
  | "locomotion";

export type StationType = "fixed" | "portable" | "none";

export type LoadClass = "bodyweight" | "light" | "moderate" | "heavy";

export type SystemicCost = "low" | "med" | "high";

export type EnvConstraint = "noise" | "ceiling" | "space";

export type LocationKind = "gym" | "home" | "park";

/** One exercise as the workout core sees it (no display or licensing fields). */
export interface ExerciseData {
  slug: string;
  /** Missing legacy data means base. */
  trainingType?: TrainingType;
  provenanceId?: string | null;
  nameHe: string;
  /** English name from the source catalog; may be missing on original entries. */
  nameEn?: string;
  modality: Modality;
  pattern: Pattern;
  equipment: string[];
  stationType: StationType;
  skillLevel: number;
  loadClass: LoadClass;
  repPaceSecPerRep: number;
  systemicCost: SystemicCost;
  constraints: EnvConstraint[];
  substitutes: string[];
  scalingEasier: string | null;
  scalingHarder: string | null;
  /** One-sided exercise: a full set is one side. Missing means two-sided. */
  unilateral?: boolean;
  /** Muscle groups, primary first. Computed once when exercises are loaded. */
  muscleGroups?: readonly MuscleGroupSlug[];
}
