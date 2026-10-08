// כתיבה-חזרה ל-data/tagging.yaml — מקור האמת של מאגר התרגילים.
// עריכה בעורך המאגר מעדכנת גם את הקובץ וגם את המסד, כך ש-db:reset
// לעולם לא מאבד עריכות. שרת בלבד (fs).

import fs from "node:fs";
import { parseDocument } from "yaml";
import {
  exerciseDataFromEntry,
  loadSnapshot,
  loadTaggingCatalog,
  validateTagging,
  type TaggingEntry,
} from "../../scripts/import-exercises";
import { prisma } from "@/lib/db";
import { invalidateExercisesCache } from "@/catalog/load";
import { atomicWriteFile } from "./atomic-file";

/** השדות שעורך המאגר רשאי לעדכן; source ו-provenanceId נשארים קבועים. */
export type EditableTaggingFields = Omit<TaggingEntry, "source" | "provenanceId">;

export class TaggingValidationError extends Error {
  constructor(public errors: string[]) {
    super(errors.join("\n"));
  }
}

// Local content editing is serialized; Git/YAML is authoritative. Production
// containers cannot retain edits across deployment, so the API is read-only there.
let writeQueue: Promise<unknown> = Promise.resolve();
export function updateTaggingEntry(slug: string, fields: Partial<EditableTaggingFields>): Promise<TaggingEntry> {
  const operation = writeQueue.catch(() => {}).then(() => writeEntry(slug, fields));
  writeQueue = operation.catch(() => {});
  return operation;
}

async function writeEntry(
  slug: string,
  fields: Partial<EditableTaggingFields>,
): Promise<TaggingEntry> {
  const { entries: tagging, fileBySlug } = loadTaggingCatalog();
  const current = tagging[slug];
  if (!current) throw new TaggingValidationError([`תרגיל לא קיים: ${slug}`]);

  const updated: TaggingEntry = { ...current, ...fields, source: current.source, provenanceId: current.provenanceId };
  const candidate = { ...tagging, [slug]: updated };

  const snapshot = loadSnapshot();
  const errors = validateTagging(
    candidate,
    new Set(snapshot.exercises.map((e) => e.id)),
  );
  if (errors.length) throw new TaggingValidationError(errors);

  // Persist the authoritative source before its rebuildable database projection.
  // A database failure never loses the user's edit; import-exercises can replay it.
  const data = exerciseDataFromEntry(slug, updated);
  const taggingPath = fileBySlug.get(slug)!;
  const doc = parseDocument(fs.readFileSync(taggingPath, "utf8"));
  doc.set(slug, updated);
  await atomicWriteFile(taggingPath, doc.toString({ lineWidth: 0, blockQuote: "literal" }));
  try {
    await prisma.exercise.upsert({ where: { slug }, create: data, update: data });
  } catch {
    throw new TaggingValidationError([
      "העריכה נשמרה בקובץ התיוג, אך הסנכרון למסד נכשל. אפשר לנסות לשמור שוב או להריץ pnpm exec tsx scripts/import-exercises.ts.",
    ]);
  } finally {
    invalidateExercisesCache();
  }

  return updated;
}
