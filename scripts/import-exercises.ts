// ייבוא מאגר התרגילים (docs/SPEC.md סעיף 6):
// ממזג את data/tagging.yaml (הנכס — נכתב ומתוחזק ביד) עם ה-snapshot של
// Free Exercise DB (רישיון Unlicense), מוודא תיוג מלא, וטוען למסד.
// נכשל בקול רם על כל שדה חסר או הפניה שבורה — "אפס תיוג חסר" נאכף כאן ובבדיקות.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "yaml";
import { EQUIPMENT_LABELS, SPECIALIST_EQUIPMENT_STATIONS } from "../src/lib/equipment";
import { MUSCLE_VOCABULARY } from "../src/lib/muscle-groups";
import { Prisma } from "../src/generated/prisma/client";
import { isTrainingType, type TrainingType } from "../src/lib/training-types";
import { isProvenanceId, loadProvenanceManifest, provenanceLicenseNote } from "./exercise-provenance";
import type {
  EnvConstraint,
  LoadClass,
  Modality,
  Pattern,
  StationType,
  SystemicCost,
} from "../src/catalog/types";

// כל נקודות הכניסה (pnpm dev/build, tsx, vitest) רצות משורש הפרויקט
const ROOT = process.cwd();
export const TAGGING_PATH = path.join(ROOT, "data", "tagging.yaml");

export interface TaggingEntry {
  source: string | null; // מזהה ב-Free Exercise DB, או null כשאין מזהה במאגר זה
  /** Missing legacy values default to base. New domains remain catalog-only. */
  trainingType?: TrainingType;
  /** Archive attribution, including adaptations with source: null. */
  provenanceId?: string | null;
  /** תאריך הוספה למאגר, "YYYY-MM-DD" — להצגת "חדש" ומיון בעורך המאגר */
  addedOn: string;
  nameHe: string;
  nameEn: string;
  modality: Modality;
  pattern: Pattern;
  equipment: string[];
  stationType: StationType;
  skillLevel: number;
  loadClass: LoadClass;
  /** סט שלם מבוצע בצד אחד (יד/רגל) — לא לסירוגין. ברירת מחדל: false */
  unilateral?: boolean;
  repPaceSecPerRep: number;
  systemicCost: SystemicCost;
  constraints: EnvConstraint[];
  substitutes: string[];
  scalingEasier: string | null;
  scalingHarder: string | null;
  instructionsHe: string;
  /**
   * רשות: דריסה ידנית של שרירים ראשיים/משניים (אוצר המילים של
   * free-exercise-db — src/lib/muscle-groups.ts). כשלא מופיע, רשומה
   * עם source ממוזגת אוטומטית מה-snapshot; רשומה מקורית (source: null)
   * נשארת בלי נתוני שרירים אלא אם דורסים כאן.
   */
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
}

interface SnapshotExercise {
  id: string;
  name: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
}

interface Snapshot {
  license: string;
  exercises: SnapshotExercise[];
}

const MODALITIES = ["cardio", "gymnastics", "weights"];
const PATTERNS = [
  "squat", "hinge", "pushV", "pushH", "pullV", "pullH",
  "lunge", "carry", "core", "locomotion",
];
const STATION_TYPES = ["fixed", "portable", "none"];
const LOAD_CLASSES = ["bodyweight", "light", "moderate", "heavy"];
const SYSTEMIC_COSTS = ["low", "med", "high"];
const CONSTRAINTS = ["noise", "ceiling", "space"];

const REQUIRED_FIELDS: (keyof TaggingEntry)[] = [
  "source", "addedOn", "nameHe", "nameEn", "modality", "pattern", "equipment",
  "stationType", "skillLevel", "loadClass", "repPaceSecPerRep",
  "systemicCost", "constraints", "substitutes", "scalingEasier",
  "scalingHarder", "instructionsHe",
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function loadTaggingCatalog(root = ROOT): {
  entries: Record<string, TaggingEntry>;
  fileBySlug: Map<string, string>;
} {
  const fragmentDir = path.join(root, "data", "training-types");
  const files = [
    path.join(root, "data", "tagging.yaml"),
    ...(fs.existsSync(fragmentDir)
      ? fs.readdirSync(fragmentDir).filter((name) => name.endsWith(".yaml")).sort()
        .map((name) => path.join(fragmentDir, name))
      : []),
  ];
  const entries: Record<string, TaggingEntry> = Object.create(null);
  const fileBySlug = new Map<string, string>();
  for (const file of files) {
    const parsed = parse(fs.readFileSync(file, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${file}: נדרשת מפת slug לרשומות תרגיל`);
    }
    for (const [slug, entry] of Object.entries(parsed)) {
      if (fileBySlug.has(slug)) {
        throw new Error(`slug משוכפל: ${slug} (${fileBySlug.get(slug)}, ${file})`);
      }
      entries[slug] = entry as TaggingEntry;
      fileBySlug.set(slug, file);
    }
  }
  return { entries, fileBySlug };
}

export function loadTagging(root = ROOT): Record<string, TaggingEntry> {
  return loadTaggingCatalog(root).entries;
}

export function loadSnapshot(root = ROOT): Snapshot {
  return JSON.parse(fs.readFileSync(path.join(root, "data", "free-exercise-db.snapshot.json"), "utf8"));
}

/** מחזיר רשימת שגיאות תיוג. רשימה ריקה = "אפס תיוג חסר". */
export function validateTagging(
  tagging: Record<string, TaggingEntry>,
  snapshotIds: Set<string>,
  root = ROOT,
): string[] {
  const errors: string[] = [];
  const slugs = new Set(Object.keys(tagging));
  const equipmentSlugs = new Set(Object.keys(EQUIPMENT_LABELS));
  const usedSources = new Map<string, string>();
  const provenanceErrors = new Map<string, string | null>();

  for (const [slug, entry] of Object.entries(tagging)) {
    const err = (msg: string) => errors.push(`${slug}: ${msg}`);

    // רשומה שבורה מעריכה ידנית (slug: בלי גוף) — שגיאת תיוג, לא קריסה
    if (!entry || typeof entry !== "object") {
      err("רשומה ריקה או לא תקינה");
      continue;
    }

    for (const field of REQUIRED_FIELDS) {
      if (!(field in entry)) err(`שדה חסר — ${field}`);
    }
    if (errors.length && errors[errors.length - 1].startsWith(slug + ": שדה חסר")) continue;

    // טיפוסים לפני תוכן — קלט ידני/API עם טיפוס שגוי לא יעבור בזכות coercion
    if (entry.source !== null && typeof entry.source !== "string") {
      err(`source חייב להיות מחרוזת או null`);
      continue;
    }
    if (entry.trainingType !== undefined && !isTrainingType(entry.trainingType)) {
      err("trainingType חייב להיות base, yoga, capoeira או dance");
    }
    if (entry.provenanceId != null) {
      if (!isProvenanceId(entry.provenanceId)) {
        err("provenanceId חייב להיות מזהה ארכיון תקין");
      } else {
        if (!provenanceErrors.has(entry.provenanceId)) {
          try {
            loadProvenanceManifest(entry.provenanceId, root);
            provenanceErrors.set(entry.provenanceId, null);
          } catch (error) {
            provenanceErrors.set(entry.provenanceId, error instanceof Error ? error.message : String(error));
          }
        }
        const issue = provenanceErrors.get(entry.provenanceId);
        if (issue) err(`provenanceId: ${issue}`);
      }
    }
    for (const field of ["nameHe", "nameEn", "instructionsHe"] as const) {
      if (typeof entry[field] !== "string") err(`${field} חייב להיות מחרוזת`);
    }
    if (typeof entry.addedOn !== "string" || !DATE_RE.test(entry.addedOn)) {
      err(`addedOn חייב להיות תאריך בתבנית YYYY-MM-DD`);
    }
    for (const field of ["equipment", "constraints", "substitutes"] as const) {
      if (!Array.isArray(entry[field])) err(`${field} חייב להיות רשימה`);
    }
    if (typeof entry.repPaceSecPerRep !== "number" || !Number.isFinite(entry.repPaceSecPerRep)) {
      err(`repPaceSecPerRep חייב להיות מספר`);
    }
    // שדה רשות: מופיע רק על תרגילים חד-צדדיים, ואם מופיע — בוליאני
    if ("unilateral" in entry && typeof entry.unilateral !== "boolean") {
      err(`unilateral חייב להיות בוליאני`);
    }
    // שדות רשות: דריסת שרירים ידנית — רשימת מחרוזות מאוצר המילים של free-exercise-db בלבד
    for (const field of ["primaryMuscles", "secondaryMuscles"] as const) {
      if (!(field in entry)) continue;
      const val = entry[field];
      if (!Array.isArray(val)) {
        err(`${field} חייב להיות רשימה`);
        continue;
      }
      for (const m of val) {
        if (typeof m !== "string" || !MUSCLE_VOCABULARY.includes(m)) {
          err(`${field}: שריר לא מוכר — ${m}`);
        }
      }
    }
    if (errors.length && errors[errors.length - 1].startsWith(slug + ":")) {
      const slugErrors = errors.filter((e) => e.startsWith(slug + ":"));
      if (slugErrors.some((e) => e.includes("חייב להיות"))) continue;
    }

    if (entry.source !== null) {
      if (!snapshotIds.has(entry.source)) err(`source לא קיים ב-snapshot: ${entry.source}`);
      const dup = usedSources.get(entry.source);
      if (dup) err(`source משוכפל עם ${dup}: ${entry.source}`);
      usedSources.set(entry.source, slug);
    }
    if (!entry.nameHe?.trim()) err("nameHe ריק");
    if (!entry.nameEn?.trim()) err("nameEn ריק");
    if (!MODALITIES.includes(entry.modality)) err(`modality לא חוקי: ${entry.modality}`);
    if (!PATTERNS.includes(entry.pattern)) err(`pattern לא חוקי: ${entry.pattern}`);
    if (!STATION_TYPES.includes(entry.stationType)) err(`stationType לא חוקי: ${entry.stationType}`);
    if (!LOAD_CLASSES.includes(entry.loadClass)) err(`loadClass לא חוקי: ${entry.loadClass}`);
    if (!SYSTEMIC_COSTS.includes(entry.systemicCost)) err(`systemicCost לא חוקי: ${entry.systemicCost}`);
    if (!Number.isInteger(entry.skillLevel) || entry.skillLevel < 1 || entry.skillLevel > 5) {
      err(`skillLevel חייב להיות 1-5: ${entry.skillLevel}`);
    }
    // תקרה 40 שנ': תנועות איטיות באמת (קימה טורקית) מגיעות ל-30 שנ' לחזרה
    if (
      typeof entry.repPaceSecPerRep === "number" &&
      !(entry.repPaceSecPerRep > 0 && entry.repPaceSecPerRep <= 40)
    ) {
      err(`repPaceSecPerRep לא סביר: ${entry.repPaceSecPerRep}`);
    }
    for (const eq of entry.equipment ?? []) {
      if (!equipmentSlugs.has(eq)) err(`ציוד לא מוכר: ${eq}`);
      if (Object.hasOwn(SPECIALIST_EQUIPMENT_STATIONS, eq)) {
        const requiredStation = SPECIALIST_EQUIPMENT_STATIONS[eq as keyof typeof SPECIALIST_EQUIPMENT_STATIONS];
        if (entry.stationType !== requiredStation) err(`${eq} מחייב stationType: ${requiredStation}`);
      }
    }
    for (const c of entry.constraints ?? []) {
      if (!CONSTRAINTS.includes(c)) err(`constraint לא מוכר: ${c}`);
    }
    if (!entry.substitutes?.length) err("substitutes ריק — חייב לפחות תחליף אחד");
    for (const sub of entry.substitutes ?? []) {
      if (!slugs.has(sub)) err(`תחליף לא קיים: ${sub}`);
      if (sub === slug) err("תחליף מפנה לעצמו");
    }
    for (const field of ["scalingEasier", "scalingHarder"] as const) {
      const ref = entry[field];
      if (ref !== null && !slugs.has(ref)) err(`${field} מפנה לסלאג לא קיים: ${ref}`);
      if (ref === slug) err(`${field} מפנה לעצמו`);
    }
    if (!entry.instructionsHe?.trim() || entry.instructionsHe.trim().length < 40) {
      err("instructionsHe חסר או קצר מדי");
    }
  }
  return errors;
}

const FREE_DB_LICENSE_NOTE =
  "Free Exercise DB (github.com/yuhonas/free-exercise-db) — Unlicense, נחלת הכלל. ההוראות בעברית נכתבו במקור לפרויקט.";
const ORIGINAL_LICENSE_NOTE =
  "רשומה מקורית של הפרויקט — נוצרה עבור המנוע, ללא טקסט ממקור חיצוני.";

interface SnapshotMuscles {
  primaryMuscles: string[];
  secondaryMuscles: string[];
}

// זכרון-מטמון של קישור source→שרירים מה-snapshot, כדי לא לקרוא ולפרסר את
// הקובץ מחדש על כל תרגיל בלולאת הייבוא (148 קריאות). הקובץ לא משתנה
// באמצע ריצה, כך שמטמון-פר-תהליך בטוח.
const snapshotMusclesCache = new Map<string, Map<string, SnapshotMuscles>>();

function snapshotMusclesById(root = ROOT): Map<string, SnapshotMuscles> {
  const cached = snapshotMusclesCache.get(root);
  if (cached) return cached;
  const map = new Map<string, SnapshotMuscles>();
  for (const e of loadSnapshot(root).exercises) {
    map.set(e.id, {
      primaryMuscles: e.primaryMuscles ?? [],
      secondaryMuscles: e.secondaryMuscles ?? [],
    });
  }
  snapshotMusclesCache.set(root, map);
  return map;
}

/**
 * ממפה רשומת תיוג לשדות רשומת Exercise במסד. שרירים: דריסה ידנית
 * ב-tagging.yaml קודמת; אחרת מתמזג מה-snapshot לפי source; רשומה מקורית
 * (source: null) בלי דריסה נשארת עם null (src/lib/muscle-groups.ts נופל
 * לניחוש לפי דפוס).
 */
export function exerciseDataFromEntry(slug: string, entry: TaggingEntry, root = ROOT) {
  const linked = entry.source ? snapshotMusclesById(root).get(entry.source) : undefined;
  const provenance = entry.provenanceId ? loadProvenanceManifest(entry.provenanceId, root) : null;
  return {
    slug,
    nameHe: entry.nameHe,
    nameEn: entry.nameEn,
    trainingType: entry.trainingType ?? "base",
    provenanceId: entry.provenanceId ?? null,
    sourceId: entry.source ?? (entry.provenanceId ? `provenance:${entry.provenanceId}` : "original"),
    licenseNote: provenance ? provenanceLicenseNote(provenance)
      : entry.source ? FREE_DB_LICENSE_NOTE : ORIGINAL_LICENSE_NOTE,
    modality: entry.modality,
    pattern: entry.pattern,
    equipment: entry.equipment,
    stationType: entry.stationType,
    skillLevel: entry.skillLevel,
    loadClass: entry.loadClass,
    unilateral: entry.unilateral ?? false,
    repPaceSecPerRep: entry.repPaceSecPerRep,
    systemicCost: entry.systemicCost,
    constraints: entry.constraints,
    substitutes: entry.substitutes,
    scalingEasierId: entry.scalingEasier,
    scalingHarderId: entry.scalingHarder,
    instructionsHe: entry.instructionsHe.trim(),
    // Json? נדרש: null גולמי אינו קביל בקלט Prisma (מבדיל בין JSON null
    // ל-SQL NULL) — Prisma.DbNull הוא הסמן הנכון לריקון עמודה מסוג Json?
    primaryMuscles: entry.primaryMuscles ?? linked?.primaryMuscles ?? Prisma.DbNull,
    secondaryMuscles:
      entry.secondaryMuscles ?? linked?.secondaryMuscles ?? Prisma.DbNull,
  };
}

export type ExerciseUpsertData = ReturnType<typeof exerciseDataFromEntry>;

// חתימה מינימלית כדי שהסקריפט יעבוד גם עם קליינט אמיתי וגם בבדיקות
type MinimalPrisma = {
  exercise: {
    upsert(args: {
      where: { slug: string };
      create: ExerciseUpsertData;
      update: ExerciseUpsertData;
    }): Promise<unknown>;
    count(): Promise<number>;
  };
};

export async function importExercises(prisma: MinimalPrisma, root = ROOT): Promise<number> {
  const tagging = loadTagging(root);
  const snapshot = loadSnapshot(root);
  const errors = validateTagging(tagging, new Set(snapshot.exercises.map((e) => e.id)), root);
  if (errors.length) {
    throw new Error(`תיוג חסר או שבור (${errors.length}):\n` + errors.join("\n"));
  }

  // Preflight every provenance mapping before the first write; never delete history.
  const rows = Object.entries(tagging).map(([slug, entry]) => exerciseDataFromEntry(slug, entry, root));
  for (const data of rows) {
    await prisma.exercise.upsert({ where: { slug: data.slug }, create: data, update: data });
  }
  return Object.keys(tagging).length;
}

// הרצה ישירה: pnpm tsx scripts/import-exercises.ts
const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  (async () => {
    const { createPrismaClient } = await import("../src/lib/prisma-client");
    const prisma = createPrismaClient();
    try {
      const count = await importExercises(prisma);
      console.log(`מאגר התרגילים נטען: ${count} תרגילים, אפס תיוג חסר.`);
    } catch (e) {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  })();
}
