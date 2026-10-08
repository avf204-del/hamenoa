import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import pg from 'pg';
import { developmentEnvironment, loadSettings, root, stateDir } from './environment.mjs';

const mode = process.argv[2] || 'dev';
if (!['setup', 'dev', 'verify', 'password'].includes(mode)) throw Error('Use setup, dev, verify or password');
const settings = loadSettings();
if (mode === 'password') {
  console.log(settings.password); // Explicit, interactive request for the synthetic environment only.
  process.exit(0);
}
const env = developmentEnvironment(settings);
const children = new Set();
let stopping = false;

function start(command, args, overrides = {}) {
  const child = spawn(command, args, { cwd: root, env: { ...env, ...overrides }, stdio: 'inherit' });
  children.add(child);
  child.completion = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code, signal) => code === 0 || stopping ? resolve() : reject(Error(`${command} exited ${code ?? signal}`)));
  });
  child.completion.catch(() => {}); // Awaited by the caller or service readiness loop.
  child.once('close', () => children.delete(child));
  return child;
}

async function stop() {
  stopping = true;
  const owned = [...children];
  for (const child of owned) child.kill('SIGTERM');
  await Promise.race([Promise.allSettled(owned.map(c => c.completion)), pause(5000)]);
  for (const child of children) child.kill('SIGKILL');
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void stop().then(() => process.exit(0)); });

async function available(port) {
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', () => reject(Error(`Port ${port} is occupied. Stop your own instance or choose CLOUD_DB_PORT / CLOUD_APP_PORT. No existing process was stopped.`)));
    probe.listen(Number(port), '127.0.0.1', () => probe.close(resolve));
  });
}

async function ready(child, check, milliseconds = 60000) {
  const until = Date.now() + milliseconds;
  while (Date.now() < until) {
    if (child.exitCode !== null || child.signalCode || child.pid === undefined) { await child.completion; throw Error('Service stopped before readiness'); }
    try { if (await check()) return; } catch { /* startup, bounded by deadline */ }
    await pause(300);
  }
  throw Error('Service did not become ready before timeout');
}

async function database() {
  await available(env.CLOUD_DB_PORT);
  const child = start(process.execPath, ['--import', 'tsx', 'scripts/local-pg.ts', '--port', env.CLOUD_DB_PORT, '--dir', path.join(stateDir, 'database')]);
  await ready(child, async () => {
    const client = new pg.Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 1000 });
    try { await client.connect(); await client.query('SELECT 1'); return true; } finally { await client.end(); }
  });
  // URL is constructed above; neither inherited DATABASE_URL nor .env can select the target.
  await start('pnpm', ['db:setup']).completion;
  return child;
}

async function smoke() {
  const base = `http://127.0.0.1:${env.CLOUD_APP_PORT}`;
  for (const route of ['/login', '/terms', '/privacy']) {
    const response = await fetch(base + route);
    if (response.status !== 200) throw Error(`Smoke ${route}: ${response.status}`);
  }
  const locked = await fetch(base + '/workout', { redirect: 'manual' });
  if (![307, 308].includes(locked.status) || !locked.headers.get('location')?.includes('/login')) throw Error('The workout area must require login');
  const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: settings.password }) });
  const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  if (!login.ok || !cookie) throw Error('Synthetic owner login failed');
  const experience = await fetch(base + '/workout', { headers: { cookie }, redirect: 'manual' });
  // A fresh synthetic owner must complete consent/health onboarding. Do not
  // mistake a redirect to a public page for a rendered workout.
  let entry = 'experience';
  if ([307, 308].includes(experience.status)) {
    const target = new URL(experience.headers.get('location') || '/', base);
    if (target.origin !== base || !['/terms', '/health'].includes(target.pathname)) throw Error('Unexpected redirect after owner login');
    const onboarding = await fetch(target, { headers: { cookie }, redirect: 'manual' });
    if (onboarding.status !== 200) throw Error('Onboarding entry failed');
    entry = `onboarding ${target.pathname}`;
  } else if (experience.status !== 200) throw Error(`Authenticated experience: ${experience.status}`);
  console.log(`Cloud smoke passed: 3 public pages, authentication boundary, owner login and ${entry}.`);
}

try {
  if (mode !== 'setup') await available(env.CLOUD_APP_PORT);
  const db = await database();
  if (mode === 'setup') {
    await start('pnpm', ['exec', 'next', 'typegen']).completion;
    console.log('Cloud development database and Prisma are ready. Existing synthetic data was preserved.');
  } else if (mode === 'dev') {
    const app = start(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-H', '0.0.0.0', '-p', env.CLOUD_APP_PORT]);
    console.log(`Development preview: ${env.APP_URL}/workout — private port; password: pnpm cloud:password`);
    await Promise.race([app.completion, db.completion]);
  } else {
    await start('pnpm', ['exec', 'next', 'typegen']).completion;
    for (const args of [['cloud:test'], ['typecheck'], ['test', '--maxWorkers=2'], ['lint'], ['build']]) {
      // Unit tests define their own public origin. Keep the loopback database
      // and synthetic credentials, but do not preload the preview URL into
      // modules whose configuration is captured when first imported.
      const overrides = args[0] === 'test' ? { NODE_ENV: 'test', APP_URL: undefined }
        : args[0] === 'build' ? { NODE_ENV: 'production' } : {};
      await start('pnpm', args, overrides).completion;
    }
    const app = start(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', env.CLOUD_APP_PORT], { NODE_ENV: 'production' });
    await ready(app, async () => (await fetch(`http://127.0.0.1:${env.CLOUD_APP_PORT}/login`, { signal: AbortSignal.timeout(1000) })).status === 200);
    await smoke();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Cloud development failed');
  process.exitCode = 1;
} finally {
  await stop();
}
