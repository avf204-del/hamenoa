import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import media from '../src/lib/exercise-media.cjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');
const stable = value => value === null || typeof value !== 'object' ? value
  : Array.isArray(value) ? value.map(stable)
    : Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
export const valueHash = value => hash(JSON.stringify(stable(value)));
export const taggingHash = row => valueHash({ ...row, unilateral: row.unilateral ?? false, trainingType: row.trainingType ?? 'base', provenanceId: row.provenanceId ?? null });
const json = (root, file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const bytesHash = (root, file) => fs.existsSync(path.join(root, file)) ? hash(fs.readFileSync(path.join(root, file))) : null;

export function readCatalog(root) {
  const data = path.join(root, 'data');
  const files = ['tagging.yaml'];
  const fragments = path.join(data, 'training-types');
  if (fs.existsSync(fragments)) files.push(...fs.readdirSync(fragments).filter(f => f.endsWith('.yaml')).sort().map(f => `training-types/${f}`));
  const tagging = {};
  for (const file of files) {
    for (const [slug, entry] of Object.entries(YAML.parse(fs.readFileSync(path.join(data, file), 'utf8')) ?? {})) {
      if (slug in tagging) throw Error(`Duplicate catalog slug: ${slug}`);
      tagging[slug] = entry;
    }
  }
  const execution = json(root, 'data/exercise-execution.json').exercises;
  const english = json(root, 'data/exercise-text-en.json').exercises;
  const manifest = media.readMediaManifest(root);
  const records = Object.fromEntries(Object.entries(tagging).map(([slug, row]) => [slug, {
    tagging: taggingHash(row),
    execution: execution[slug] ? valueHash(execution[slug]) : null,
    english: english[slug] ? hash(english[slug]) : null,
    frames: media.mediaFrames('exercises', slug, { root, manifest }),
  }]));
  return { tagging, execution, english, records };
}

export function recordDifferences(expected, actual) {
  const differences = [];
  for (const slug of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
    if (!expected[slug]) differences.push({ slug, field: 'added-row' });
    else if (!actual[slug]) differences.push({ slug, field: 'missing-row' });
    else for (const field of ['tagging', 'execution', 'english', 'frames']) {
      if (valueHash(expected[slug][field]) !== valueHash(actual[slug][field])) differences.push({ slug, field });
    }
  }
  return differences;
}

/** Read-only audit. Neither baseline nor either application's data is modified. */
export function auditCatalog(root = ROOT, source = null, sourceRevision = null) {
  const provenance = json(root, 'data/catalog-source.json');
  const baseline = json(root, 'data/catalog-baseline.json');
  const catalog = readCatalog(root);
  const differences = recordDifferences(baseline.records, catalog.records);
  for (const [file, expected] of Object.entries({ ...baseline.files, ...baseline.assets })) {
    if (bytesHash(root, file) !== expected) differences.push({ file, field: 'bytes' });
  }
  for (const [slug, execution] of Object.entries(catalog.execution)) {
    const row = catalog.tagging[slug];
    if (!row || hash(row.instructionsHe.trim()) !== execution.evidence.instructionsHash) differences.push({ slug, field: 'instruction-evidence' });
    if (!row || (row.unilateral ?? false) !== execution.unilateral) differences.push({ slug, field: 'unilateral-evidence' });
    for (const image of execution.evidence.sourceImages) {
      if (!fs.existsSync(path.join(root, 'public/free-exercise-db', image))) differences.push({ slug, file: image, field: 'source-image' });
    }
  }
  for (const slug of new Set([...Object.keys(catalog.tagging), ...Object.keys(catalog.execution), ...Object.keys(catalog.english)])) {
    if (!catalog.tagging[slug] || !catalog.execution[slug] || !catalog.english[slug]) differences.push({ slug, field: 'mapping-coverage' });
  }
  let comparedSourceCommit = null;
  if (source) {
    comparedSourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim();
    const expectedCommit = sourceRevision ?? provenance.sourceCommit;
    if (comparedSourceCommit !== expectedCommit) throw Error(`Source checkout must be at ${expectedCommit}; received ${comparedSourceCommit}`);
    differences.push(...recordDifferences(readCatalog(source).records, catalog.records).map(d => ({ ...d, comparison: 'source' })));
    for (const file of Object.keys({ ...baseline.files, ...baseline.assets })) {
      if (bytesHash(root, file) !== bytesHash(source, file)) differences.push({ file, field: 'source-bytes' });
    }
  }
  return {
    schemaVersion: 1,
    sourceRepository: provenance.repository,
    pinnedSourceCommit: provenance.sourceCommit,
    comparedSourceCommit,
    rows: Object.keys(catalog.records).length,
    executionRows: Object.keys(catalog.execution).length,
    demoFrames: Object.values(catalog.records).reduce((n, row) => n + row.frames.length, 0),
    sourceImages: Object.keys(baseline.assets).filter(f => f.startsWith('public/free-exercise-db/')).length,
    hashedAssets: Object.keys(baseline.assets).length,
    differences,
    ok: differences.length === 0,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const option = key => args.includes(key) ? args[args.indexOf(key) + 1] : null;
    if (args.some(a => a.startsWith('--') && !['--source', '--source-revision'].includes(a))) throw Error('Usage: node scripts/catalog-parity.mjs [--source /path/to/forceapp] [--source-revision SHA]');
    const result = auditCatalog(ROOT, option('--source'), option('--source-revision'));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
