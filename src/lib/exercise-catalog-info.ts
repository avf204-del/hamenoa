// Server-only catalog metadata, deliberately separate from the visual info module.
import { prisma } from "@/lib/db";
import { trainingTypeLabel } from "@/lib/training-types";
import type { ExerciseExecution } from "@/catalog/execution";
import { isCatalogOnly } from "@/catalog/workout-policy";
import { exerciseExecution, executionMatchesInstructions } from "@/lib/exercise-execution";

export interface ExerciseCatalogInfo {
  trainingType: string;
  trainingTypeLabel: string;
  provenanceId: string | null;
  licenseNote: string;
  execution?: ExerciseExecution;
  executionMatchesInstructions?: boolean;
  catalogOnly?: boolean;
}

export async function exerciseCatalogInfoForSlugs(
  slugs: string[],
): Promise<Record<string, ExerciseCatalogInfo>> {
  if (!slugs.length) return {};
  const rows = await prisma.exercise.findMany({
    where: { slug: { in: [...new Set(slugs)] } },
    select: { slug: true, trainingType: true, provenanceId: true, licenseNote: true, instructionsHe: true },
  });
  return Object.fromEntries(rows.map((row) => [row.slug, {
    trainingType: row.trainingType ?? "base",
    trainingTypeLabel: trainingTypeLabel(row.trainingType),
    provenanceId: row.provenanceId ?? null,
    licenseNote: row.licenseNote,
    execution: exerciseExecution(row.slug),
    executionMatchesInstructions: exerciseExecution(row.slug)
      ? executionMatchesInstructions(exerciseExecution(row.slug)!, row.instructionsHe) : undefined,
    catalogOnly: isCatalogOnly(row.slug),
  }]));
}
