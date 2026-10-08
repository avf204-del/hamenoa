import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { developmentEnvironment, previewUrl, port } from './environment.mjs';

test('cloud runner cannot inherit production database, login, OAuth or build directory', () => {
  const env = developmentEnvironment({ password: 'synthetic', authSecret: 'synthetic-key' }, {
    DATABASE_URL: 'postgres://production.invalid/live', SHADOW_DATABASE_URL: 'postgres://production.invalid/shadow',
    APP_PASSWORD: 'production', AUTH_SECRET: 'production-key', GOOGLE_CLIENT_ID: 'real', GOOGLE_CLIENT_SECRET: 'real',
    APP_URL: 'https://production.invalid', NEXT_DIST_DIR: '.next-production', NODE_ENV: 'production',
  });
  assert.equal(env.DATABASE_URL, 'postgres://postgres@127.0.0.1:5540/postgres');
  assert.equal(env.DATABASE_POOL_MAX, '1');
  assert.equal(env.APP_PASSWORD, 'synthetic');
  assert.equal(env.AUTH_SECRET, 'synthetic-key');
  assert.equal(env.GOOGLE_CLIENT_ID, '');
  assert.equal(env.GOOGLE_CLIENT_SECRET, '');
  assert.equal(env.APP_URL, 'http://localhost:3000');
  assert.equal(env.NODE_ENV, 'development');
  assert.equal(env.NEXT_DIST_DIR, '.next');
  assert.equal(env.SHADOW_DATABASE_URL, 'postgres://postgres@127.0.0.1:5541/postgres');
});
test('Codespaces preview uses the current workspace and exact forwarded host', () => {
  assert.equal(previewUrl({ CODESPACE_NAME: 'sample-123' }, 3000), 'https://sample-123-3000.app.github.dev');
  assert.equal(previewUrl({ CODESPACE_NAME: 'sample-123', GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: 'preview.example.com' }, 3010), 'https://sample-123-3010.preview.example.com');
  assert.throws(() => previewUrl({ CODESPACE_NAME: 'unsafe/path' }, 3000));
});
test('port overrides remain local and invalid or conflicting ports fail early', () => {
  for (const p of ['https://live', '', 0, 80, 65536, 3000.5]) assert.throws(() => port(p, 3000));
  assert.throws(() => developmentEnvironment({}, { CLOUD_DB_PORT: '3000', CLOUD_APP_PORT: '3000' }));
  assert.equal(developmentEnvironment({}, { CLOUD_DB_PORT: '5599' }).DATABASE_URL, 'postgres://postgres@127.0.0.1:5599/postgres');
});
test('a child loading dotenv cannot restore an inherited external database', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-env-test-'));
  try {
    const file = path.join(dir, 'external.env');
    fs.writeFileSync(file, 'DATABASE_URL=postgres://external.invalid/do-not-connect\n');
    const env = developmentEnvironment({ password: 'synthetic', authSecret: 'synthetic-key' }, {
      ...process.env, DOTENV_CONFIG_PATH: file, DOTENV_CONFIG_OVERRIDE: 'true', NODE_OPTIONS: '--require=missing-preload',
    });
    const url = execFileSync(process.execPath, ['--import', 'dotenv/config', '-e', 'process.stdout.write(process.env.DATABASE_URL)'], { env, encoding: 'utf8' });
    assert.equal(url, 'postgres://postgres@127.0.0.1:5540/postgres');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
