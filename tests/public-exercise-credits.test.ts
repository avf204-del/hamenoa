import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { loadTagging } from "../scripts/import-exercises";
import { loadProvenanceManifest } from "../scripts/exercise-provenance";
import { PUBLIC_EXERCISE_CREDITS } from "../src/lib/public-exercise-credits";
import CreditsPage from "../src/app/credits/page";
import archive from "../data/training-types-archived/manifest.json";

vi.mock("@/lib/current-user", () => ({ currentUser: async () => null }));
vi.mock("@/components/public/PublicShell", () => ({ default: ({ children }: { children: ReactNode }) => children }));

describe("public attribution for accepted adaptations", () => {
  it("covers every active non-base source using the validated archived attribution", () => {
    const sourceIds = [...new Set(Object.values(loadTagging())
      .filter((entry) => entry.trainingType && entry.trainingType !== "base")
      .map((entry) => entry.provenanceId))].sort();
    // Historical exercises retain their public attribution after retirement.
    const archivedSources = Object.values(archive.exercises).map(entry => entry.provenanceId);
    expect(PUBLIC_EXERCISE_CREDITS.map((source) => source.id).sort()).toEqual([...new Set([...sourceIds, ...archivedSources])].sort());
    for (const source of PUBLIC_EXERCISE_CREDITS) {
      expect(source).toEqual({ id: source.id, ...loadProvenanceManifest(source.id) });
    }
    expect(PUBLIC_EXERCISE_CREDITS.some((source) => source.id === "minghelli-2023-capoeira")).toBe(true);
    expect(PUBLIC_EXERCISE_CREDITS.some((source) => source.id === "moreira-2017-capoeira")).toBe(false);
  });

  it("renders source/license links, creators, adaptation details and the media exclusion publicly", async () => {
    const html = renderToStaticMarkup(await CreditsPage());
    for (const source of PUBLIC_EXERCISE_CREDITS) {
      expect(html).toContain(`href="${source.sourceUrl}"`);
      expect(html).toContain(`href="${source.licenseUrl}"`);
      const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
      for (const value of [source.title, source.author, source.changes, source.attribution!]) {
        expect(html).toContain(escape(value));
      }
    }
    expect(html).toContain("עיבוד לעברית: ForceApp");
    expect(html).toContain("לא הועתקו מהמקורות תמונות");
    expect(html).toContain("קפוארה");
    expect(html).not.toContain("כולן נכתבו במקור");
  });
});
