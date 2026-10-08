import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadTagging } from "../scripts/import-exercises";
import { isCatalogOnly } from "../src/catalog/workout-policy";
import { MOBILITY_DRILLS, STRETCHES } from "../src/catalog/warmup-content";
import { WALKING_DRILL } from "../src/lib/walking";

type Entry = { name: string; instructions: string };
const en = JSON.parse(readFileSync(join(__dirname, "../data/exercise-text-en.json"), "utf8")) as {
  version: number;
  exercises: Record<string, string>;
  drills: Record<string, Entry>;
  stretches: Record<string, Entry>;
};
const tagging = loadTagging();

const HEBREW = /[֐-׿]/;
const nums = (s: string) => (s.match(/\d+/g) ?? []).sort();

const drillSources = [...MOBILITY_DRILLS, WALKING_DRILL];

describe("exercise-text-en.json", () => {
  it("has version 1", () => {
    expect(en.version).toBe(1);
  });

  it("covers the merged catalog and preserves the legacy translation numbers", () => {
    expect(Object.keys(en.exercises)).toEqual(Object.keys(tagging));
    for (const [slug, { instructionsHe }] of Object.entries(tagging)) {
      const text = en.exercises[slug];
      expect(text?.trim(), slug).toBeTruthy();
      expect(HEBREW.test(text), slug).toBe(false);
      // Legacy translations retain their existing exact-number check.
      // Added rows preserve archived source English, separately from the
      // reviewed Hebrew adaptation. The parity audit hashes every English row.
      if (!isCatalogOnly(slug)) expect(nums(text), slug).toEqual(nums(instructionsHe));
    }
  });

  for (const [section, sources] of [
    ["drills", drillSources],
    ["stretches", STRETCHES],
  ] as const) {
    it(`covers exactly the ${section} ids, with numbers preserved`, () => {
      const out = en[section];
      expect(Object.keys(out)).toEqual(sources.map((s) => s.id));
      for (const src of sources) {
        const e = out[src.id];
        expect(e?.name.trim(), src.id).toBeTruthy();
        expect(e?.instructions.trim(), src.id).toBeTruthy();
        expect(HEBREW.test(e.name) || HEBREW.test(e.instructions), src.id).toBe(false);
        expect(nums(e.instructions), src.id).toEqual(nums(src.instructionsHe));
        expect(nums(e.name), src.id).toEqual(nums(src.nameHe));
      }
    });
  }
});
