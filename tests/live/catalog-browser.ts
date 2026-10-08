/** Read-only catalog UI verification using a disposable user in an isolated local database. */
import { chromium } from 'playwright';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { developmentEnvironment, loadSettings } from '../../scripts/cloud/environment.mjs';
import { createPrismaClient } from '../../src/lib/prisma-client';
import { issueToken, AUTH_COOKIE } from '../../src/lib/auth';
import { LEGAL_VERSION, HEALTH_SCREEN_VERSION } from '../../src/legal';
import { loadTagging } from '../../scripts/import-exercises';
import { exerciseExecution } from '../../src/lib/exercise-execution';

Object.assign(process.env, developmentEnvironment(loadSettings(), { ...process.env, CLOUD_APP_PORT: '3220', CLOUD_DB_PORT: '5550' }));
assert.equal(new URL(process.env.DATABASE_URL!).hostname, '127.0.0.1');
assert.equal(new URL(process.env.DATABASE_URL!).port, '5550');
const db = createPrismaClient(undefined, 1);
const userId = 'catalog-browser-' + randomUUID();
const base = process.env.CATALOG_BROWSER_URL ?? process.env.APP_URL!;
assert(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'local browser origin required');
const output = process.env.CATALOG_BROWSER_OUTPUT ?? '.cloud/catalog-review';
const slugs = ['goblet-squat', 'marching-in-place', 'plank', 'fedb-sumo-deadlift-with-bands', 'fedb-sumo-deadlift-with-chains', 'fedb-front-incline-dumbbell-raise', 'fedb-standing-low-pulley-one-arm-triceps-extension', 'fedb-tire-flip', 'fedb-alternating-floor-press'];
async function main() {
  mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const results: object[] = [];
  try {
    await db.user.create({ data: { id: userId, name: 'Synthetic catalog review', role: 'owner', disclaimerAcceptedAt: new Date(), legalVersion: LEGAL_VERSION, healthScreenedAt: new Date(), healthScreenVersion: HEALTH_SCREEN_VERSION, healthFlagged: false } });
    const rows = await db.exercise.findMany();
    assert.equal(rows.length, 959);
    const { loadExercises } = await import('../../src/catalog/load');
    const pool = await loadExercises();
    assert.equal(pool.data.length, 282);
    assert.equal(pool.idBySlug.size, 959);
    assert.equal(pool.slugById.size, 959);
    assert(pool.data.every(e => !e.slug.startsWith('fedb-')), 'added entries must remain catalog-only');
    const tags = loadTagging();
    for (const width of [320, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await context.addCookies([{ name: AUTH_COOKIE, value: issueToken({ userId, role: 'owner' }), url: base }, { name: 'hm-locale', value: 'he', url: base }]);
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + '/admin/exercises', { waitUntil: 'domcontentloaded' });
      const search = page.getByRole('searchbox', { name: 'חיפוש תרגיל לפי שם' });
      await search.waitFor({ timeout: 60000 });
      for (const slug of slugs) {
        await search.fill(tags[slug].nameEn);
        await page.getByRole('button', { name: 'הסבר ותמונות: ' + tags[slug].nameHe, exact: true }).click();
        const dialog = page.getByRole('dialog');
        await dialog.waitFor();
        const summary = dialog.getByText('פרמטרים לביצוע', { exact: true });
        if (!await summary.locator('..').evaluate(el => (el as HTMLDetailsElement).open)) await summary.click();
        const text = await dialog.innerText();
        assert(text.includes('ספירת חזרות'));
        assert(text.includes(exerciseExecution(slug)!.grip), 'mapped grip missing: ' + slug);
        assert(!text.includes('יש לבדוק מחדש את הפרמטרים'), 'mapping should match the imported instructions');
        if (slug.startsWith('fedb-')) assert(text.includes('עדיין לא זמין באימוני האפליקציה'));
        if (slug === 'fedb-sumo-deadlift-with-bands') {
          assert(text.includes('כמה רכיבי עומס נפרדים'));
          assert(text.includes('גומייה ארוכה סגורה × 2'));
          assert(text.includes('עיגון גומייה'));
        }
        if (slug === 'fedb-front-incline-dumbbell-raise') assert(text.includes('30°–60°'));
        const images = dialog.locator('img');
        const count = await images.count();
        assert(count > 0);
        for (const image of await images.all()) {
          await image.scrollIntoViewIfNeeded();
          await image.evaluate((el: HTMLImageElement) => { el.loading = 'eager'; return el.decode(); });
        }
        if (slug === 'marching-in-place') assert.equal(count, 2);
        const links = dialog.locator('a[href^="/free-exercise-db/"]');
        for (const link of await links.all()) {
          const href = await link.getAttribute('href');
          const response = await context.request.get(base + href);
          assert.equal(response.status(), 200);
          assert(response.headers()['content-type'].startsWith('image/jpeg'));
        }
        assert(!await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), 'horizontal overflow');
        if (slug === 'fedb-sumo-deadlift-with-bands') {
          await summary.locator('..').evaluate(el => el.scrollIntoView({ block: 'start' }));
          await page.screenshot({ path: `${output}/mapping-${width}.png` });
        }
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"]')].every(el => el.closest('[inert]')));
        results.push({ width, slug, framesDecoded: count, sourceLinks: exerciseExecution(slug)!.evidence.sourceImages.length, readable: true, noOverflow: true });
        console.log(JSON.stringify({ width, slug, passed: true }));
      }
      assert.equal(errors.length, 0, errors.join('\n'));
      await context.close();
    }
    writeFileSync(output + '/browser.json', JSON.stringify({ at: new Date().toISOString(), synthetic: true, browser: 'Chromium', physicalDevice: false, dbRows: rows.length, workoutPool: pool.data.length, results, limits: ['Existing admin subtree is Hebrew; English and physical devices were not browser-tested.', 'Catalog source English is archived reference text; the reviewed adaptation is Hebrew.'] }, null, 2) + '\n');
    console.log(JSON.stringify({ passed: true, cases: results.length, localOnly: true }));
  } finally {
    await browser.close();
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
    const { prisma } = await import('../../src/lib/db');
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
