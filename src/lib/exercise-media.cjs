/* eslint-disable @typescript-eslint/no-require-imports -- Shared by server code and standalone CommonJS imagery tools. */
const fs = require('node:fs');
const path = require('node:path');

const EXTENSIONS = ['webp', 'png', 'jpg', 'jpeg', 'svg'];
const emptyManifest = () => ({ schemaVersion: 1, exercises: {}, warmup: {} });

function validateKey(group, id) {
  if (!['exercises', 'warmup'].includes(group) || !/^[a-z0-9-]+$/.test(id)) {
    throw Error(`Invalid media key: ${group}/${id}`);
  }
}

function validateFile(file, group, id) {
  validateKey(group, id);
  const prefix = `/${group}/${id}/`;
  if (typeof file !== 'string' || !file.startsWith(prefix) ||
      !/^[a-zA-Z0-9_-]+\.(webp|png|jpg|jpeg|svg)$/.test(file.slice(prefix.length))) {
    throw Error(`Invalid media file for ${group}/${id}: ${file}`);
  }
  return file;
}

function readMediaManifest(root = process.cwd()) {
  const filename = path.join(root, 'data/exercise-media.json');
  if (!fs.existsSync(filename)) return emptyManifest();
  const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (data?.schemaVersion !== 1) throw Error('Unsupported exercise-media schemaVersion');
  for (const group of ['exercises', 'warmup']) {
    if (!data[group] || typeof data[group] !== 'object' || Array.isArray(data[group])) {
      throw Error(`Invalid exercise-media group: ${group}`);
    }
    for (const [id, entry] of Object.entries(data[group])) {
      validateKey(group, id);
      if (!Array.isArray(entry?.frames) || entry.frames.length < 1 || entry.frames.length > 6) {
        throw Error(`Expected 1–6 frames: ${group}/${id}`);
      }
      const files = new Set();
      for (const frame of entry.frames) {
        validateFile(frame?.file, group, id);
        if (files.has(frame.file)) throw Error(`Repeated media file: ${frame.file}`);
        files.add(frame.file);
        for (const field of ['captionHe', 'altHe']) {
          if (typeof frame[field] !== 'string' || !frame[field].trim()) {
            throw Error(`Missing ${field}: ${frame.file}`);
          }
        }
      }
    }
  }
  return data;
}

/** One preferred format per numeric frame, ordered 0, 1, 2, ... 10 (not lexically). */
function discoverFrameFiles(directory, group, id) {
  validateKey(group, id);
  if (!fs.existsSync(directory)) return [];
  const files = fs.readdirSync(directory).filter(file => /^\d+\.(webp|png|jpg|jpeg|svg)$/.test(file));
  files.sort((a, b) => Number(a.split('.')[0]) - Number(b.split('.')[0]) ||
    EXTENSIONS.indexOf(a.split('.')[1]) - EXTENSIONS.indexOf(b.split('.')[1]) || a.localeCompare(b));
  const seen = new Set();
  return files.filter(file => {
    const index = Number(file.split('.')[0]);
    if (seen.has(index)) return false;
    seen.add(index);
    return true;
  }).map(file => `/${group}/${id}/${file}`);
}

/** Metadata order is authoritative. Missing declared files never resurrect stale poses. */
function mediaFrames(group, id, options = {}) {
  validateKey(group, id);
  const root = options.root ?? process.cwd();
  const manifest = options.manifest ?? readMediaManifest(root);
  const declared = manifest[group][id]?.frames;
  if (declared) {
    return declared.filter(frame => fs.existsSync(path.join(root, 'public', frame.file.slice(1))))
      .map(({ file, captionHe, altHe }) => ({ file, captionHe, altHe }));
  }
  // Keep static directory prefixes visible to the bundler; a fully dynamic
  // public/group/id path causes it to trace the entire project into the server.
  const directory = group === 'exercises'
    ? path.join(root, 'public/exercises', id)
    : path.join(root, 'public/warmup', id);
  return discoverFrameFiles(directory, group, id).slice(0, 6)
    .map(file => ({ file, captionHe: '', altHe: '' }));
}

module.exports = { readMediaManifest, discoverFrameFiles, mediaFrames, validateKey, validateFile };
