import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import YAML from 'yaml';
import { exerciseDataFromEntry, importExercises, loadSnapshot, loadTagging, validateTagging } from '../scripts/import-exercises';
import { exerciseExecution, executionMatchesInstructions } from '../src/lib/exercise-execution';
import { isCatalogOnly } from '../src/catalog/workout-policy';
import ExerciseExecutionDetails from '../src/components/ExerciseExecutionDetails';
import provenance from '../data/catalog-source.json';
import { realCatalog } from './catalog-fixture';
import { isEligible, planWorkout } from '../src/core/plan';
import { muscleGroupList } from '../src/lib/muscle-groups';
import type { ExerciseData } from '../src/catalog/types';

const tagging = loadTagging();
const base = YAML.parse(readFileSync('data/tagging.yaml', 'utf8')) as typeof tagging;

describe('reviewed independent catalog import', () => {
  it('validates all 959 entries and upserts through the hamenoa importer without deleting history', async () => {
    expect(Object.keys(tagging)).toHaveLength(959);
    expect(Object.keys(base)).toHaveLength(283);
    expect(Object.keys(tagging).filter(isCatalogOnly)).toHaveLength(676);
    expect(loadSnapshot().exercises).toHaveLength(876);
    expect(validateTagging(tagging, new Set(loadSnapshot().exercises.map(e => e.id)))).toEqual([]);
    const upsert = vi.fn().mockResolvedValue({});
    expect(await importExercises({ exercise: { upsert, count: vi.fn() } })).toBe(959);
    expect(upsert).toHaveBeenCalledTimes(959);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: 'fedb-sumo-deadlift-with-bands' }, create: expect.objectContaining({ provenanceId: 'free-exercise-db', equipment: ['barbell', 'bands'] }) }));
  });

  it('matches all media hashes and metadata against the committed baseline', () => {
    const audit = JSON.parse(execFileSync(process.execPath, ['scripts/catalog-parity.mjs'], { encoding: 'utf8' }));
    expect(audit).toMatchObject({ ok: true, rows: 959, executionRows: 959, demoFrames: 2181, sourceImages: 1746, hashedAssets: 3927, differences: [] });
  });

  it('preserves existing YAML and the complete G18 planner pool and seeded workouts', () => {
    const bytes = readFileSync('data/tagging.yaml');
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(provenance.legacyTaggingSha256);
    const original = YAML.parse(bytes.toString()) as typeof tagging;
    const legacy: ExerciseData[] = Object.entries(original).map(([slug, entry]) => {
      const row = exerciseDataFromEntry(slug, entry);
      return { ...row, nameEn: row.nameEn, scalingEasier: row.scalingEasierId, scalingHarder: row.scalingHarderId,
        muscleGroups: muscleGroupList({ primaryMuscles: Array.isArray(row.primaryMuscles) ? row.primaryMuscles : null, secondaryMuscles: Array.isArray(row.secondaryMuscles) ? row.secondaryMuscles : null, pattern: row.pattern }) };
    });
    const imported = realCatalog();
    expect(imported.map(e => e.slug)).toEqual(legacy.map(e => e.slug));
    for (const equipment of [[], ['chair'], ['chair', 'pullup-bar', 'dip-station']]) {
      expect(imported.filter(e => isEligible(e, { equipment })).map(e => e.slug)).toEqual(legacy.filter(e => isEligible(e, { equipment })).map(e => e.slug));
      for (const minutes of [15, 25, 45]) for (const seed of ['same-a', 'same-b']) {
        const request = { equipment, minutes, seed, place: 'home' as const };
        expect(planWorkout({ ...request, exercises: imported })).toEqual(planWorkout({ ...request, exercises: legacy }));
      }
    }
  });

  it('retains complex load components, band anchors, angles and instruction evidence; stale edits are flagged', () => {
    for (const [slug, entry] of Object.entries(tagging)) {
      const execution = exerciseExecution(slug)!;
      expect(executionMatchesInstructions(execution, entry.instructionsHe), slug).toBe(true);
      expect(execution.unilateral, slug).toBe(entry.unilateral ?? false);
      expect(executionMatchesInstructions(execution, entry.instructionsHe + '\nשינוי הוראות'), slug).toBe(false);
    }
    const bands = exerciseExecution('fedb-sumo-deadlift-with-bands')!;
    expect(bands).toMatchObject({ loadUnit: 'multiple-components', scalarLoadSupported: false, band: { count: 2, family: 'long-loop' } });
    const html = renderToStaticMarkup(createElement(ExerciseExecutionDetails, { execution: bands, locale: 'he', current: false }));
    expect(html).toContain('פרמטרים לביצוע');
    expect(html).toContain('עיגון גומייה');
    expect(html).toContain('כמה רכיבי עומס נפרדים');
    expect(html).toContain('יש לבדוק מחדש');
    expect(html).toContain('/free-exercise-db/Sumo_Deadlift_with_Bands/0.jpg');
    expect(html).not.toContain('<input');
  });
});
