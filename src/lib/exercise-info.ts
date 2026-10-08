// מידע תצוגה לתרגיל (הערת בעלים 24.8): תמונות + הוראות ביצוע ודגשים,
// לכל מקום שתרגיל מופיע בו — תצוגה מקדימה ומסך האימון. שרת בלבד (fs).
// כולל גם דרילי חימום ומתיחות שחרור, שאינם רשומות מאגר אלא חיים בקטלוג
// הפנימי (warmup-content.ts) ומקבלים מפתח עם קידומת (drill-keys.ts).

import { MOBILITY_DRILLS, STRETCHES } from "@/catalog/warmup-content";
import { catalogRef } from "@/lib/drill-keys";
import { prisma } from "@/lib/db";
import { mediaFrames, readMediaManifest } from "@/lib/exercise-media.cjs";
import type { ExerciseMediaFrame, ExerciseMediaManifest } from "@/lib/exercise-media.cjs";
import { WALKING_DRILL, WALKING_INFO_KEY } from "@/lib/walking";
import { trainingTypeLabel } from "@/lib/training-types";
import { muscleToGroup, type MuscleGroupSlug } from "@/lib/muscle-groups";
import type { ExerciseCatalogInfo } from "@/lib/exercise-catalog-info";
import { isCatalogOnly } from "@/catalog/workout-policy";
import { exerciseExecution, executionMatchesInstructions } from "@/lib/exercise-execution";

import EXERCISE_TEXT_EN from "../../data/exercise-text-en.json";

/** English instructions (C1) — translated from the project's own Hebrew text. */
const TEXT_EN = EXERCISE_TEXT_EN as {
  exercises: Record<string, string>;
  drills: Record<string, { name: string; instructions: string }>;
  stretches: Record<string, { name: string; instructions: string }>;
};

export interface ExerciseInfo extends Partial<ExerciseCatalogInfo> {
  nameHe: string;
  /** שם אנגלי מהמאגר; ריק לדרילי חימום/שחרור, שאין להם שם כזה */
  nameEn: string;
  /** צעדי ביצוע + שורת "שים לב" — כפי שנכתבו ב-tagging.yaml או בקטלוג הדרילים */
  instructionsHe: string;
  /** Reviewed English translation when available; otherwise display Hebrew. */
  instructionsEn?: string;
  /** Archived source English, separate from the reviewed Hebrew adaptation. */
  sourceInstructionsEn?: string;
  /** Ordered public image paths, retained for thumbnails and older callers. */
  images: string[];
  /** Optional for compatibility with existing callers; server results include frame metadata. */
  frames?: ExerciseMediaFrame[];
  /** Equipment slugs (DB exercises only); used to group stations and name gear. */
  equipment?: string[];
  /** Primary muscle groups from real muscle data only (DB exercises); never guessed from the pattern. */
  groups?: MuscleGroupSlug[];
}

export type ExerciseInfoMap = Record<string, ExerciseInfo>;

/** Invalid metadata must not prevent workout instructions from opening. Tooling validates strictly. */
function displayManifest(): ExerciseMediaManifest {
  try {
    return readMediaManifest();
  } catch {
    return { schemaVersion: 1, exercises: {}, warmup: {} };
  }
}

function displayMedia(group: string, id: string, manifest = displayManifest()) {
  const frames = mediaFrames(group, id, { manifest });
  return { frames, images: frames.map(frame => frame.file) };
}

export function exerciseImages(slug: string): string[] {
  return displayMedia("exercises", slug).images;
}

/** תמונות דריל חימום/מתיחת שחרור — public/warmup/<id>/ (מוכן ע"י pnpm images:fetch) */
export function drillImages(id: string): string[] {
  return displayMedia("warmup", id).images;
}

const DRILLS_BY_ID = new Map(MOBILITY_DRILLS.map((d) => [d.id, d]));
const STRETCHES_BY_ID = new Map(STRETCHES.map((s) => [s.id, s]));

/** מידע תצוגה לפריט מהקטלוג הפנימי — null כשהמזהה לא מוכר */
function catalogInfo(key: string, manifest: ExerciseMediaManifest): ExerciseInfo | null {
  const ref = catalogRef(key);
  if (!ref) return null;
  const entry =
    ref.kind === "drill"
      ? ref.id === WALKING_DRILL.id ? WALKING_DRILL : DRILLS_BY_ID.get(ref.id)
      : STRETCHES_BY_ID.get(ref.id);
  if (!entry) return null;
  const en = ref.kind === "drill" ? TEXT_EN.drills[ref.id] : TEXT_EN.stretches[ref.id];
  return {
    nameHe: entry.nameHe,
    nameEn: en?.name ?? "",
    instructionsHe: entry.instructionsHe,
    instructionsEn: en?.instructions ?? "",
    trainingType: "base",
    trainingTypeLabel: trainingTypeLabel("base"),
    provenanceId: "forceapp-original",
    licenseNote: "הוראות ביצוע מקוריות בעברית מאת ForceApp. תוכן קנייני; לא נטען רישיון תוכן פתוח חיצוני.",
    ...displayMedia("warmup", ref.id, manifest),
  };
}

export async function exerciseInfoForSlugs(
  slugs: string[],
): Promise<ExerciseInfoMap> {
  if (slugs.length === 0) return {};
  const map: ExerciseInfoMap = {};
  const manifest = displayManifest();
  const dbSlugs: string[] = [];
  for (const key of slugs) {
    if (catalogRef(key) || key === WALKING_DRILL.id || key === "walking") {
      const info = catalogInfo(key === WALKING_DRILL.id || key === "walking" ? WALKING_INFO_KEY : key, manifest);
      if (info) map[key] = info;
      continue;
    }
    dbSlugs.push(key);
  }
  if (dbSlugs.length > 0) {
    const rows = await prisma.exercise.findMany({
      where: { slug: { in: dbSlugs } },
      select: { slug: true, nameHe: true, nameEn: true, instructionsHe: true,
        trainingType: true, provenanceId: true, licenseNote: true, equipment: true, primaryMuscles: true },
    });
    for (const row of rows) {
      const execution = exerciseExecution(row.slug);
      const groups = Array.isArray(row.primaryMuscles)
        ? [...new Set(row.primaryMuscles.map(muscleToGroup).filter((g): g is MuscleGroupSlug => g !== null))]
        : [];
      map[row.slug] = {
        ...(groups.length ? { groups } : {}),
        nameHe: row.nameHe,
        nameEn: row.nameEn,
        instructionsHe: row.instructionsHe,
        instructionsEn: isCatalogOnly(row.slug) ? "" : TEXT_EN.exercises[row.slug] ?? "",
        sourceInstructionsEn: isCatalogOnly(row.slug) ? TEXT_EN.exercises[row.slug] : undefined,
        trainingType: row.trainingType ?? "base",
        trainingTypeLabel: trainingTypeLabel(row.trainingType),
        provenanceId: row.provenanceId ?? null,
        licenseNote: row.licenseNote,
        equipment: Array.isArray(row.equipment) ? (row.equipment as string[]) : [],
        execution,
        executionMatchesInstructions: execution ? executionMatchesInstructions(execution, row.instructionsHe) : undefined,
        catalogOnly: isCatalogOnly(row.slug),
        ...displayMedia("exercises", row.slug, manifest),
      };
    }
  }
  return map;
}
