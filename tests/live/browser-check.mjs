// A live check, in a real browser, of what the workout screen does when
// things go wrong between the phone and the server: no connection, a server
// error, a page closed before a press was saved, a double tap, a workout
// that was closed or deleted, a signed-out player.
// Run `pnpm check:live` (see README); the API check signs the user up first.

import { chromium } from "playwright";
import { BASE, PASSWORD, checker, connect, storedEvents } from "./shared.mjs";

const db = await connect();
const { check, finish } = checker();

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-proxy-server"],
});
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "he-IL" });
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(String(error).slice(0, 200)));

const EVENTS = "**/api/workouts/*/events";
const FULL = /^עשיתי \d+$/;
const button = (name, exact = false) => page.getByRole("button", { name, exact });
/** A person does not press two buttons within half a second; neither does this check. */
const tap = async (name, exact = false) => {
  await page.waitForTimeout(500);
  await button(name, exact).first().click({ timeout: 10_000 });
};
const shows = async (text) => (await page.getByText(text).count()) > 0;
const count = (events, type) => events.filter((event) => event.type === type).length;

async function build(minutes) {
  await page.goto(`${BASE}/workout?new=1`, { waitUntil: "networkidle" });
  await button(minutes, true).click();
  await tap("בנה אימון");
  await page.waitForURL(/workout\/c/, { timeout: 20_000 });
  await page.waitForLoadState("networkidle");
  return page.url().split("/").pop();
}

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.getByText("סיסמה", { exact: true }).first().click();
await page.locator("input").first().fill(PASSWORD);
await page.getByText("כניסה", { exact: true }).first().click();
await page.waitForURL(/workout/, { timeout: 20_000 });

/* ---------- 1. No connection while reporting ---------- */

let id = await build("25");
await tap("מתחילים בחימום");
await tap("דלג על החימום");
await tap("התחל משחקון");
await page.waitForTimeout(3600);

await context.setOffline(true);
await button(FULL).click();
await page.waitForTimeout(800);
check("offline: the press shows at once (rest on screen)", await shows("מנוחה"));
check("offline: the player is told it is not saved", await shows("אין חיבור"));
check("offline: nothing reached the server", count(await storedEvents(db, id), "report") === 0);
await page.waitForTimeout(10_500);
await button(/^התחל$/).click({ timeout: 3000 }).catch(() => {});
await page.waitForTimeout(600);
check("offline: a new press waits (still resting)", (await button(FULL).count()) === 0);
await context.setOffline(false);
await page.waitForTimeout(6500);
check("back online: saved without being asked, notice gone", !(await shows("אין חיבור")));
let events = await storedEvents(db, id);
check("back online: exactly one report, and no start that was never made", count(events, "report") === 1 && count(events, "portion-start") === 0);

/* ---------- 2. The server fails once; "try again" saves ---------- */

await page.waitForTimeout(10_500);
let failing = true;
await page.route(EVENTS, (route) => (failing ? route.fulfill({ status: 500, body: "{}" }) : route.continue()));
await button(/^התחל$/).click();
await page.waitForTimeout(900);
check("server error: the player is told", await shows("עוד לא נשמרה"));
failing = false;
await tap("נסה שוב");
await page.waitForTimeout(1200);
check("try again: saved, notice gone", !(await shows("עוד לא נשמרה")));
check("try again: the start is in the log once", count(await storedEvents(db, id), "portion-start") === 1);
await page.unroute(EVENTS);

/* ---------- 3. A report that was never saved; the page closes and reopens ---------- */

await page.route(EVENTS, (route) => route.abort());
await button(FULL).click();
await page.waitForTimeout(900);
check("connection lost mid-report: the player is told", await shows("אין חיבור"));
await page.unroute(EVENTS);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1500);
check("reopened: the stored report was sent and saved", count(await storedEvents(db, id), "report") === 2);

/* ---------- 4. A stored "start game" is not replayed on reopening ---------- */

await tap("אפשרויות");
await tap("סיים משחקון");
await tap("למשחקון הבא");
await page.waitForTimeout(700);
await page.route(EVENTS, (route) => route.abort());
await tap("התחל משחקון");
await page.waitForTimeout(900);
await page.unroute(EVENTS);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1500);
events = await storedEvents(db, id);
check("reopened: an unsaved \"start game\" did not start a clock", count(events, "station-start") === 1 && (await button("התחל משחקון").count()) === 1);

/* ---------- 5. A double tap does not press the button that appears underneath ---------- */

await tap("התחל משחקון");
await page.waitForTimeout(3600);
await tap("אפשרויות");
await tap("סיים משחקון");
await page.waitForTimeout(500);
await page.getByRole("dialog").getByRole("button", { name: "0", exact: true }).click();
await page.waitForTimeout(700);
const box = await button("למשחקון הבא").boundingBox();
const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
await page.mouse.click(x, y);
await page.waitForTimeout(120);
await page.mouse.click(x, y);
await page.waitForTimeout(1200);
events = await storedEvents(db, id);
check("double tap on \"next game\": the next game did not start by itself", count(events, "station-start") === 2 && (await button("התחל משחקון").count()) === 1);

/* ---------- 6. A double tap on "I did fewer" does not choose from the list that opens ---------- */

await tap("התחל משחקון");
await page.waitForTimeout(3600);
const before = count(await storedEvents(db, id), "report");
const fewer = await button("עשיתי פחות").boundingBox();
const [fx, fy] = [fewer.x + fewer.width / 2, fewer.y + fewer.height / 2];
for (const dx of [-60, 60]) {
  // Wherever the second tap lands on the row that appears, nothing is reported.
  await page.mouse.click(fx, fy);
  await page.waitForTimeout(120);
  await page.mouse.click(fx + dx, fy);
  await page.waitForTimeout(700);
  if ((await button("חזרה").count()) > 0) await button("חזרה").click();
  await page.waitForTimeout(500);
}
check("double tap on \"I did fewer\": nothing was reported", count(await storedEvents(db, id), "report") === before && (await button(FULL).count()) === 1);

/* ---------- 7. A pain stop is taken even while another press is unsaved ---------- */

await page.route(EVENTS, (route) => route.abort());
await button(FULL).click();
await page.waitForTimeout(900);
check("unsaved report: the player is told", await shows("אין חיבור"));
await tap("אפשרויות");
await tap("עצור");
await page.waitForTimeout(700);
check("pain stop while unsaved: the game stops on screen", await shows("עצרת בגלל כאב"));
await page.unroute(EVENTS);
await page.waitForTimeout(6500);
events = await storedEvents(db, id);
const tail = events.slice(-2);
check("back online: the report and the pain stop are both saved, in order", tail[0]?.type === "report" && tail[1]?.type === "station-end" && tail[1]?.reason === "pain", tail.map((e) => e.type).join(","));
check("and the notice is gone", !(await shows("אין חיבור")));

/* ---------- 8. A pain stop pressed behind a press the server refuses is still saved ---------- */

id = await build("20");
await tap("מתחילים בחימום");
await tap("דלג על החימום");
await tap("התחל משחקון");
await page.waitForTimeout(3600);
await button(FULL).click();
// Hold every request, so the presses queue up; meanwhile the server's rest clock is pushed forward.
let release;
const held = new Promise((resolve) => { release = resolve; });
await page.waitForTimeout(10_500);
await page.route(EVENTS, async (route) => { await held; await route.continue(); });
await button(/^התחל$/).click();
await page.waitForTimeout(600);
await tap("אפשרויות");
await tap("עצור");
await page.waitForTimeout(400);
{
  // The server now believes the report came later: the rest is not over, so it will refuse the start.
  const { rows } = await db.query('select context from "Session" where id=$1', [id]);
  const stored = rows[0].context;
  stored.run.events = stored.run.events.map((event) => (event.type === "report" ? { ...event, at: event.at + 9000 } : event));
  await db.query('update "Session" set context=$2 where id=$1', [id, JSON.stringify(stored)]);
}
release();
await page.waitForTimeout(2500);
await page.unroute(EVENTS);
events = await storedEvents(db, id);
check("refused start, then pain: the start is not in the log", count(events, "portion-start") === 0);
check("refused start, then pain: the pain stop is saved", events.at(-1)?.type === "station-end" && events.at(-1)?.reason === "pain", events.map((e) => e.type).join(","));
check("and the screen shows the stop", await shows("עצרת בגלל כאב"));

/* ---------- 9. The server keeps failing on one press: the player may give it up ---------- */

await page.route(EVENTS, (route) => route.fulfill({ status: 500, body: "{}" }));
await tap("לשחרור");
await page.waitForTimeout(900);
check("server keeps failing: the press shows, and the player is told", (await shows("עוד לא נשמרה")) && (await button("לשחרור").count()) === 0);
await page.waitForTimeout(11_000);
check("after a few failures the player may give the press up", (await button("ותר עליה").count()) === 1);
await tap("ותר עליה");
await page.waitForTimeout(1200);
await page.unroute(EVENTS);
check("given up: the screen is back on the saved state, and says so", (await shows("לא נרשמה")) && (await button("לשחרור").count()) === 1);
check("given up: nothing was added", count(await storedEvents(db, id), "to-cooldown") === 0);
await page.waitForTimeout(6500);

/* ---------- 10. The workout was closed elsewhere ---------- */

await db.query(`update "Session" set status='done' where id=$1`, [id]);
await tap("לשחרור");
await page.waitForTimeout(1500);
check("closed workout: the player is told the press was not recorded", await shows("לא נרשמה"));
check("closed workout: nothing was added", count(await storedEvents(db, id), "to-cooldown") === 0);

/* ---------- 11. The workout no longer exists ---------- */

id = await build("12");
await page.waitForTimeout(1500);
await db.query('delete from "Session" where id=$1', [id]);
await button("מתחילים בחימום").click({ timeout: 3000 }).catch(() => {});
check("deleted workout: back to the home screen", await page.waitForURL(/\/workout$/, { timeout: 8000 }).then(() => true, () => false), page.url());

/* ---------- 12. Signed out ---------- */

await build("12");
await page.waitForTimeout(1500);
await context.clearCookies();
await button("מתחילים בחימום").click({ timeout: 3000 }).catch(() => {});
check("signed out: sent to sign in", await page.waitForURL(/\/login/, { timeout: 8000 }).then(() => true, () => false), page.url());

check("no script errors on the page", pageErrors.length === 0, pageErrors.join(" | "));
await db.end();
await browser.close();
process.exit(finish());
