import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { MOBILITY_DRILLS, STRETCHES } from "../src/catalog/warmup-content";
import { WALKING_DRILL } from "../src/lib/walking";

type Entry = { name: string; instructions: string };
const en = JSON.parse(readFileSync(join(__dirname, "../data/exercise-text-en.json"), "utf8")) as {
  version: number;
  exercises: Record<string, string>;
  drills: Record<string, Entry>;
  stretches: Record<string, Entry>;
};
const tagging = parse(readFileSync(join(__dirname, "../data/tagging.yaml"), "utf8")) as Record<
  string,
  { instructionsHe: string }
>;

const HEBREW = /[֐-׿]/;
const nums = (s: string) => (s.match(/\d+/g) ?? []).sort();

const drillSources = [...MOBILITY_DRILLS, WALKING_DRILL];

describe("exercise-text-en.json", () => {
  it("has version 1", () => {
    expect(en.version).toBe(1);
  });

  it("covers exactly the tagging.yaml slugs, with numbers preserved", () => {
    expect(Object.keys(en.exercises)).toEqual(Object.keys(tagging));
    for (const [slug, { instructionsHe }] of Object.entries(tagging)) {
      const text = en.exercises[slug];
      expect(text?.trim(), slug).toBeTruthy();
      expect(HEBREW.test(text), slug).toBe(false);
      expect(nums(text), slug).toEqual(nums(instructionsHe));
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
