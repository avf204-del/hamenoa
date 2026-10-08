import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const stateDir = path.join(root, '.cloud');

export function port(value, fallback) {
  const n = Number(value ?? fallback);
  if (!Number.isInteger(n) || n < 1024 || n > 65535) throw Error('Cloud development port must be an integer from 1024 to 65535');
  return n;
}

export function previewUrl(env, appPort) {
  if (!env.CODESPACE_NAME) return `http://localhost:${appPort}`;
  const domain = env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev';
  if (!/^[a-z0-9-]+$/i.test(env.CODESPACE_NAME) || !/^[a-z0-9.-]+$/i.test(domain)) throw Error('Invalid Codespaces host');
  return `https://${env.CODESPACE_NAME}-${appPort}.${domain}`;
}

export function loadSettings() {
  // Refuse ambiguous checkouts: these files may contain a real database or OAuth configuration.
  for (const file of ['.env', '.env.local', '.env.development', '.env.development.local', '.env.production', '.env.production.local']) {
    if (fs.existsSync(path.join(root, file))) throw Error(`Use a clean cloud checkout: ${file} already exists. It was not read or changed.`);
  }
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  const file = path.join(stateDir, 'settings.json');
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({ schema: 1, password: randomBytes(24).toString('base64url'), authSecret: randomBytes(32).toString('hex') }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  }
  const settings = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (settings.schema !== 1 || typeof settings.password !== 'string' || settings.password.length < 24 || typeof settings.authSecret !== 'string' || settings.authSecret.length < 32) throw Error('Invalid .cloud/settings.json; inspect it locally without uploading secrets.');
  return settings;
}

export function developmentEnvironment(settings, parent = process.env) {
  // Prisma imports dotenv/config. Inherited override/path or Node preloads must
  // not replace our loopback database before migration and seed execute.
  const inherited = Object.fromEntries(Object.entries(parent).filter(([key]) => !key.startsWith('DOTENV_CONFIG_') && key !== 'NODE_OPTIONS'));
  const appPort = port(parent.CLOUD_APP_PORT, 3000);
  const dbPort = port(parent.CLOUD_DB_PORT, 5540);
  if (appPort === dbPort) throw Error('App and database ports must differ');
  const appUrl = previewUrl(parent, appPort);
  return {
    ...inherited,
    NODE_ENV: 'development',
    DATABASE_URL: `postgres://postgres@127.0.0.1:${dbPort}/postgres`,
    // PGlite has one PostgreSQL session. Concurrent protocol streams can
    // replace each other's unnamed prepared statements even across sockets.
    DATABASE_POOL_MAX: '1',
    // An intentionally unavailable local shadow DB: migrate dev must never inherit a remote target.
    SHADOW_DATABASE_URL: 'postgres://postgres@127.0.0.1:5541/postgres',
    APP_PASSWORD: settings.password,
    AUTH_SECRET: settings.authSecret,
    APP_URL: appUrl,
    FORCEAPP_DEV_ORIGIN: new URL(appUrl).hostname,
    GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '',
    OPERATOR_NAME: 'סביבת פיתוח בלבד', SUPPORT_EMAIL: '',
    TZ: 'Asia/Jerusalem', NEXT_TELEMETRY_DISABLED: '1',
    NEXT_DIST_DIR: '.next',
    CONTENT_ARCHIVE_DIR: path.join(stateDir, 'content-sources'),
    CLOUD_APP_PORT: String(appPort), CLOUD_DB_PORT: String(dbPort),
  };
}
