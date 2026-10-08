import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import YAML from 'yaml';
import archive from '../data/training-types-archived/manifest.json';
import { loadTagging } from '../scripts/import-exercises';
import { isRetiredExercise, RETIRED_EXERCISE_ALIASES } from '../src/lib/retired-exercises';
import { mediaFrames } from '../src/lib/exercise-media.cjs';

describe('user-archived yoga, capoeira and dance', () => {
  it('preserves the exact content and Hebrew names while removing active selection', () => {
    const active = loadTagging();
    expect(Object.keys(archive.exercises)).toHaveLength(15);
    for (const file of archive.files) {
      const bytes = readFileSync(file.file);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(file.sha256);
      const records = YAML.parse(bytes.toString());
      for (const [slug, metadata] of Object.entries(archive.exercises)) {
        if (!records[slug]) continue;
        expect(records[slug].nameHe).toBe(metadata.nameHe);
        expect(metadata.nameHe).toMatch(/[א-ת]/);
        expect(active[slug]).toBeUndefined();
        expect(isRetiredExercise(slug)).toBe(true);
        expect(RETIRED_EXERCISE_ALIASES[slug]).toBeUndefined();
        expect(mediaFrames('exercises', slug).length).toBeGreaterThan(0);
        expect(existsSync(`data/sources/${metadata.provenanceId}/manifest.json`)).toBe(true);
      }
    }
    expect(Object.values(active).filter(e=>e.trainingType==='dance')).toHaveLength(0);
    expect(Object.values(active).filter(e=>['yoga','capoeira'].includes(e.trainingType ?? 'base'))).toHaveLength(0);
  });
});
