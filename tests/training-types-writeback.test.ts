import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse, stringify } from "yaml";
import { afterEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ root: "", upsert: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { exercise: { upsert: state.upsert } } }));
vi.mock("@/catalog/load", () => ({ invalidateExercisesCache: state.invalidate }));
vi.mock("../scripts/import-exercises", async (importOriginal) => {
  const original = await importOriginal<typeof import("../scripts/import-exercises")>();
  return {
    ...original,
    loadTaggingCatalog: () => original.loadTaggingCatalog(state.root),
    loadSnapshot: () => original.loadSnapshot(state.root),
    validateTagging: (entries: Parameters<typeof original.validateTagging>[0], ids: Set<string>) => original.validateTagging(entries, ids, state.root),
    exerciseDataFromEntry: (slug: string, entry: Parameters<typeof original.exerciseDataFromEntry>[1]) => original.exerciseDataFromEntry(slug, entry, state.root),
  };
});
import { updateTaggingEntry } from "../src/lib/tagging-store";

afterEach(() => {
  if (state.root) rmSync(state.root, { recursive: true, force: true });
  state.root = "";
});

it("admin edits the owning fragment, retains provenance, and leaves base YAML and archive bytes intact", async () => {
  state.root = mkdtempSync(path.join(tmpdir(), "training-types-writeback-"));
  const dataDir = path.join(state.root, "data");
  mkdirSync(path.join(dataDir, "training-types"), { recursive: true });
  mkdirSync(path.join(dataDir, "sources", "yoga-source"), { recursive: true });
  const entry = {
    source: null, addedOn: "2026-09-17", nameHe: "תרגיל", nameEn: "Test",
    modality: "gymnastics", pattern: "core", equipment: [], stationType: "none",
    skillLevel: 1, loadClass: "bodyweight", repPaceSecPerRep: 3, systemicCost: "low",
    constraints: [], substitutes: ["yoga"], scalingEasier: null, scalingHarder: null,
    instructionsHe: "הוראות הביצוע של התרגיל ארוכות מספיק לצורך בדיקת שמירת עריכה במקטע הנכון.",
  };
  const basePath = path.join(dataDir, "tagging.yaml");
  const fragmentPath = path.join(dataDir, "training-types/yoga.yaml");
  const manifestPath = path.join(dataDir, "sources/yoga-source/manifest.json");
  writeFileSync(basePath, stringify({ base: entry }));
  writeFileSync(fragmentPath, "# Preserve this content-agent comment\n" + stringify({ yoga: { ...entry, trainingType: "yoga", provenanceId: "yoga-source", substitutes: ["base"] } }));
  writeFileSync(path.join(dataDir, "free-exercise-db.snapshot.json"), JSON.stringify({ license: "Unlicense", exercises: [] }));
  writeFileSync(manifestPath, JSON.stringify({ title: "Source", author: "Author", sourceUrl: "https://example.org", license: "CC-BY-4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", changes: "תרגום" }));
  const beforeBase = readFileSync(basePath, "utf8");
  const beforeManifest = readFileSync(manifestPath, "utf8");
  state.upsert.mockResolvedValue({});
  const updated = await updateTaggingEntry("yoga", { nameHe: "שם מעודכן" });
  expect(updated).toMatchObject({ nameHe: "שם מעודכן", trainingType: "yoga", provenanceId: "yoga-source" });
  const fragment = readFileSync(fragmentPath, "utf8");
  expect(fragment).toContain("# Preserve this content-agent comment");
  expect(parse(fragment).yoga).toMatchObject({ nameHe: "שם מעודכן", provenanceId: "yoga-source" });
  expect(readFileSync(basePath, "utf8")).toBe(beforeBase);
  expect(readFileSync(manifestPath, "utf8")).toBe(beforeManifest);
  expect(state.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: "yoga" }, update: expect.objectContaining({ trainingType: "yoga", licenseNote: expect.stringContaining("CC-BY-4.0") }) }));
  expect(state.invalidate).toHaveBeenCalled();
  state.upsert.mockRejectedValueOnce(new Error("database unavailable"));
  await expect(updateTaggingEntry("yoga", { nameHe: "עריכה נשמרת גם בכשל מסד" })).rejects.toThrow("נשמרה בקובץ");
  expect(parse(readFileSync(fragmentPath, "utf8")).yoga.nameHe).toBe("עריכה נשמרת גם בכשל מסד");
  await Promise.all([
    updateTaggingEntry("yoga", { nameHe: "שם מקביל" }),
    updateTaggingEntry("yoga", { nameEn: "Concurrent edit" }),
  ]);
  expect(parse(readFileSync(fragmentPath, "utf8")).yoga).toMatchObject({ nameHe: "שם מקביל", nameEn: "Concurrent edit", provenanceId: "yoga-source" });
});
