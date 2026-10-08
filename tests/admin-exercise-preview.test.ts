import { createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import ExercisesAdminPage from "../src/app/admin/exercises/page";
import ExerciseEditor, { type ExerciseRow } from "../src/components/admin/ExerciseEditor";
import type { ExerciseInfoMap } from "../src/lib/exercise-info";
import { RETIRED_EXERCISE_SLUGS } from "../src/lib/retired-exercises";

const { findMany, infoForSlugs } = vi.hoisted(() => ({ findMany: vi.fn(), infoForSlugs: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { exercise: { findMany } } }));
vi.mock("@/lib/exercise-info", () => ({ exerciseInfoForSlugs: infoForSlugs }));
vi.mock("@/components/ExerciseInfoSheet", () => ({ default: () => null }));

it("passes all server frames to the read-only admin preview and renders an independent button", async () => {
  const row: ExerciseRow = {
    slug: "yoga-preview", nameHe: "יוגה לבדיקה", nameEn: "Yoga", sourceId: "provenance:source",
    licenseNote: "CC-BY-4.0", trainingType: "yoga", provenanceId: "source",
    modality: "gymnastics", pattern: "core", equipment: [], stationType: "none",
    skillLevel: 1, loadClass: "bodyweight", repPaceSecPerRep: 1, systemicCost: "low",
    constraints: [], substitutes: [], scalingEasier: null, scalingHarder: null,
    instructionsHe: "הוראות שמורות", addedOn: null, thumbnail: null,
  };
  const frames = [0, 1, 2, 3].map((n) => ({ file: `/exercises/yoga-preview/${n}.webp`, captionHe: `שלב ${n + 1}`, altHe: `תיאור ${n + 1}` }));
  const info: ExerciseInfoMap = { [row.slug]: { ...row, images: frames.map((frame) => frame.file), frames } };
  findMany.mockResolvedValue([{ ...row, scalingEasierId: null, scalingHarderId: null }]);
  infoForSlugs.mockResolvedValue(info);
  const page = await ExercisesAdminPage();
  // ההוצאה היא רשימה אחת: הכינוי high-knees + 15 סלאגי הארכיון (retirement = selection-only)
  expect(findMany).toHaveBeenCalledWith({ where: { slug: { notIn: RETIRED_EXERCISE_SLUGS } } });
  expect(RETIRED_EXERCISE_SLUGS).toContain("high-knees");
  expect(infoForSlugs).toHaveBeenCalledWith([row.slug]);

  function editorProps(node: ReactNode): { initialRows: ExerciseRow[]; exerciseInfo: ExerciseInfoMap; validationErrors: string[]; latestDate: string | null } | undefined {
    if (Array.isArray(node)) return node.map(editorProps).find(Boolean);
    if (!isValidElement<{ children?: ReactNode }>(node)) return undefined;
    if (node.type === ExerciseEditor) return node.props as ReturnType<typeof editorProps>;
    return editorProps(node.props.children);
  }
  const props = editorProps(page)!;
  expect(props.exerciseInfo[row.slug].frames).toEqual(frames);
  expect(props.initialRows[0].thumbnail).toBe(frames[0].file);
  const html = renderToStaticMarkup(createElement(ExerciseEditor, props));
  expect(html).toContain('aria-label="הסבר ותמונות: יוגה לבדיקה"');
  expect(html).toContain("סוג התרגיל");
  expect(html).not.toContain("תחום אימון");
  // The preview must be available while the edit form is closed.
  expect(html).not.toContain("<textarea");
  expect(html).not.toMatch(/<button[^>]*>(?:(?!<\/button>)[\s\S])*<button/);
});
