import type { Metadata } from "next";
import Link from "next/link";
import ExerciseEditor, {
  type ExerciseRow,
} from "@/components/admin/ExerciseEditor";
import { prisma } from "@/lib/db";
import { exerciseInfoForSlugs, type ExerciseInfoMap } from "@/lib/exercise-info";
import {
  loadSnapshot,
  loadTagging,
  validateTagging,
} from "../../../../scripts/import-exercises";
import type { Pattern } from "@/catalog/types";
import { PATTERN_ORDER } from "@/catalog/labels";
import { RETIRED_EXERCISE_SLUGS } from "@/lib/retired-exercises";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export const metadata: Metadata = { title: "עורך מאגר" };
export const dynamic = "force-dynamic";

export default async function ExercisesAdminPage() {
  let rows: ExerciseRow[] = [];
  let exerciseInfo: ExerciseInfoMap = {};
  let validationErrors: string[] = [];
  let loadError: string | null = null;
  let syncWarning: string | null = null;
  let latestDate: string | null = null;

  // שני מקורות כשל שונים — מסד לא מאותחל מול YAML שבור — עם אבחנה נפרדת,
  // כי ההנחיה לתיקון שונה לגמרי בכל מקרה.
  let addedOnBySlug = new Map<string, string>();
  let taggingCount: number | null = null;
  try {
    const tagging = loadTagging();
    const snapshot = loadSnapshot();
    validationErrors = validateTagging(
      tagging,
      new Set(snapshot.exercises.map((e) => e.id)),
    );
    taggingCount = Object.keys(tagging).filter((slug) => !RETIRED_EXERCISE_SLUGS.includes(slug)).length;
    addedOnBySlug = new Map(
      Object.entries(tagging).map(([slug, e]) => [slug, e.addedOn]),
    );
    const dates = [...addedOnBySlug.values()].sort();
    latestDate = dates.length ? dates[dates.length - 1] : null;
  } catch (e) {
    // YAML שבור (עריכה ידנית) — מציגים את השגיאה האמיתית, לא "מסד ריק"
    validationErrors = [
      `קובצי התיוג לא נטענו: ${e instanceof Error ? e.message : e}`,
    ];
  }

  try {
    const exercises = await prisma.exercise.findMany({
      where: { slug: { notIn: RETIRED_EXERCISE_SLUGS } },
    });
    exerciseInfo = await exerciseInfoForSlugs(exercises.map((e) => e.slug));
    rows = exercises
      .map((e) => ({
        slug: e.slug,
        nameHe: e.nameHe,
        nameEn: e.nameEn,
        sourceId: e.sourceId,
        licenseNote: e.licenseNote,
        trainingType: e.trainingType ?? "base",
        provenanceId: e.provenanceId,
        modality: e.modality,
        pattern: e.pattern,
        equipment: e.equipment as string[],
        stationType: e.stationType,
        skillLevel: e.skillLevel,
        loadClass: e.loadClass,
        repPaceSecPerRep: e.repPaceSecPerRep,
        systemicCost: e.systemicCost,
        constraints: e.constraints as string[],
        substitutes: e.substitutes as string[],
        scalingEasier: e.scalingEasierId,
        scalingHarder: e.scalingHarderId,
        instructionsHe: e.instructionsHe,
        addedOn: addedOnBySlug.get(e.slug) ?? null,
        thumbnail: exerciseInfo[e.slug]?.images[0] ?? null,
      }))
      .sort(
        (a, b) =>
          PATTERN_ORDER.indexOf(a.pattern as Pattern) -
            PATTERN_ORDER.indexOf(b.pattern as Pattern) ||
          a.skillLevel - b.skillLevel ||
          a.nameHe.localeCompare(b.nameHe, "he"),
      );
    if (taggingCount !== null && taggingCount !== rows.length) {
      syncWarning = `פער בין tagging.yaml (${taggingCount} רשומות) למסד (${rows.length} תרגילים) — הרץ pnpm db:setup לסנכרון.`;
    }
  } catch {
    loadError = "המסד ריק או לא מאותחל — הרץ pnpm db:setup ואז רענן.";
  }

  if (loadError || rows.length === 0) {
    return (
      <div className="pb-4">
        <h1 className="text-2xl font-bold">עורך מאגר</h1>
        <div className="mt-6 rounded-(--r-m) border border-dashed border-line-strong p-6 text-center text-sm text-fg-2">
          {loadError ?? "מאגר התרגילים ריק."}{" "}
          <code className="num rounded-md bg-sunken px-1.5 py-0.5 text-xs" dir="ltr">
            pnpm db:setup
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">עורך מאגר</h1>
        <Link href="/admin" className="text-sm text-fg-2 hover:text-fg">
          חזרה למצב ניהול
        </Link>
      </div>
      <p className="mt-1 text-sm text-fg-2">
        המאגר המשותף: <span className="num">{rows.length}</span> תרגילים
        מתויגים
        {latestDate && (
          <>
            {" "}
            · עודכן לאחרונה: <span className="num">{formatDate(latestDate)}</span>
          </>
        )}
        .
        {process.env.NODE_ENV === "production"
          ? "המאגר כאן לצפייה. עריכה נעשית בסביבת הפיתוח ונשמרת בגרסת התוכן הבאה."
          : "עריכה נשמרת תחילה לקובץ התיוג של התרגיל, ואז מסונכרנת למסד."}
      </p>
      <p className="mt-2 text-sm text-fg-2">התוספות זמינות לעיון עם פרמטרים ותמונות מקור תחת ״הסבר ותמונות״. שילובן באימון ממתין לתמיכה של משחקי האפליקציה.</p>
      {syncWarning && (
        <div
          role="alert"
          className="mt-3 rounded-(--r-s) bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
        >
          {syncWarning}
        </div>
      )}
      <ExerciseEditor
        initialRows={rows}
        exerciseInfo={exerciseInfo}
        validationErrors={validationErrors}
        latestDate={latestDate}
        readOnly={process.env.NODE_ENV === "production"}
      />
    </div>
  );
}
