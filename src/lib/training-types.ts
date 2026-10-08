/** Catalog domains; these are separate from engine modality and movement pattern. */
export const TRAINING_TYPES = ["base", "yoga", "capoeira", "dance"] as const;
export type TrainingType = (typeof TRAINING_TYPES)[number];

export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  base: "אימון בסיס",
  yoga: "יוגה",
  capoeira: "קפוארה",
  dance: "ריקוד",
};

export function isTrainingType(value: unknown): value is TrainingType {
  return typeof value === "string" && TRAINING_TYPES.includes(value as TrainingType);
}

/** Missing legacy values default to base; unknown values must never enter the base pool. */
export function isBaseTrainingExercise(entry: { trainingType?: string | null }): boolean {
  return entry.trainingType === undefined || entry.trainingType === null || entry.trainingType === "base";
}

export function trainingTypeLabel(value?: string | null): string {
  if (value == null) return TRAINING_TYPE_LABELS.base;
  return isTrainingType(value) ? TRAINING_TYPE_LABELS[value] : value;
}
