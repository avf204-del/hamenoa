// A live check of the workout API against a local dev server and database:
// what the server accepts, what it refuses, and what it writes down by itself
// when the clock decides. Run with `pnpm check:live` (see README).

import { BASE, PASSWORD, checker, connect, sameDatabase, sleep } from "./shared.mjs";

const db = await connect();
const { check, finish } = checker();

let cookie = "";
async function call(method, path, body) {
  const response = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", cookie },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const set = response.headers.getSetCookie?.() ?? [];
  if (set.length) cookie = set.map((value) => value.split(";")[0]).join("; ");
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
}

const newId = () => crypto.randomUUID();
const send = (id, event, eventId = newId()) => call("POST", `/api/workouts/${id}/events`, { id: eventId, event });
const build = async (minutes) => (await call("POST", "/api/workouts", { minutes, place: "home" })).json.id;
const planOf = async (id) => (await call("GET", `/api/workouts/${id}`)).json.workout;
const report = (workout) => ({ type: "report", station: "s1", portion: 0, amount: workout.stations[0].exercises[0].quota });

/** Move a workout into the past, as if this much time went by with nobody pressing. */
async function age(id, ms) {
  const { rows } = await db.query('select context, "startedAt" from "Session" where id=$1', [id]);
  const { context, startedAt } = rows[0];
  context.run.events = context.run.events.map((event) => ({ ...event, at: event.at - ms }));
  await db.query('update "Session" set context=$2, "startedAt"=$3 where id=$1', [id, JSON.stringify(context), startedAt ? new Date(startedAt.getTime() - ms) : null]);
}
const sessionRow = async (id) => (await db.query('select status, "startedAt", "completedAt" from "Session" where id=$1', [id])).rows[0];
const firstBlock = async (id) => (await db.query('select payload from "Block" where "sessionId"=$1 order by "order"', [id])).rows[0].payload;
const toFirstPortion = async (id) => {
  await send(id, { type: "begin" });
  await send(id, { type: "warmup-done" });
  const started = await send(id, { type: "station-start", station: "s1" });
  await sleep(3300);
  return started;
};

/* ---------- Sign in, and start from no workouts ---------- */

let r = await call("POST", "/api/auth/login", { password: PASSWORD });
check("sign in", r.status === 200, String(r.status));
await call("POST", "/api/terms");
const noToAll = Object.fromEntries(
  ["heart-condition", "chest-pain-exertion", "chest-pain-rest", "dizziness-fainting", "musculoskeletal", "bp-heart-medication", "pregnancy", "other-reason"].map((key) => [key, false]),
);
await call("POST", "/api/health", { answers: noToAll, acknowledged: false });
const userId = await sameDatabase(db, await build(20));
// Only workouts made by this core are removed.
await db.query(`delete from "Session" where "userId"=$1 and id in (select "sessionId" from "Block" where type='game')`, [userId]);

/* ---------- How long ---------- */

r = await call("POST", "/api/workouts", { minutes: 11, place: "home" });
check("11 minutes is refused", r.status === 400 && r.json.code === "minutes");
r = await call("POST", "/api/workouts", { minutes: 20.5, place: "home" });
check("20.5 minutes is refused, not a crash", r.status === 400 && r.json.code === "minutes", String(r.status));
for (const [minutes, games] of [[12, 1], [20, 2], [25, 3], [30, 4]]) {
  const workout = await planOf(await build(minutes));
  check(`${minutes} minutes → ${games} games, no "shorter than asked" note`, workout.stations.length === games && workout.notes.length === 0, `about ${(workout.estimatedSec / 60).toFixed(1)} min`);
}

/* ---------- A: reports name their portion; a pain stop after the end; nothing after finish ---------- */

const a = await build(20);
let workout = await planOf(a);
check("workout A starts", (await toFirstPortion(a)).status === 200);
r = await send(a, { type: "report", station: "s1", amount: 1 });
check("a report that does not name its portion is refused", r.status === 400, String(r.status));
r = await send(a, { type: "report", station: "s1", portion: 1, amount: 1 });
check("a report for another portion is refused", r.status === 422 && r.json.code === "stale", r.json?.code);
r = await send(a, report(workout), "has:colon-in-id");
check("an event id shaped like the server's own is refused", r.status === 400, String(r.status));
r = await send(a, report(workout));
check("a report for the open portion is saved", r.status === 200);
r = await send(a, report(workout));
check("the same portion reported again is refused", r.status === 422, r.json?.code);
r = await send(a, { type: "station-end", station: "s1", reason: "time" });
check("a client cannot claim the clock ended the game", r.status === 400, String(r.status));
r = await send(a, { type: "station-end", station: "s1", reason: "choice" });
check("the game ends by choice", r.status === 200);
let block = await firstBlock(a);
check("its result is stored as a choice", block.result?.reason === "choice", JSON.stringify(block.result?.score.rank));
const endedAt = block.result.endedAt;
r = await send(a, { type: "station-end", station: "s1", reason: "pain" });
check("a pain stop is accepted after the game ended", r.status === 200);
block = await firstBlock(a);
check("the result now says pain and keeps its time", block.result.reason === "pain" && block.result.endedAt === endedAt);
r = await send(a, { type: "next" });
check("no further game after a pain stop", r.status === 422 && r.json.code === "stopped-for-pain", r.json?.code);
await send(a, { type: "to-cooldown" });
const finishId = newId();
r = await send(a, { type: "finish" }, finishId);
check("the workout finishes", r.status === 200);
r = await send(a, { type: "finish" }, finishId);
check("the same finish sent again answers ok and changes nothing", r.status === 200);
r = await send(a, { type: "begin" });
check("a finished workout takes nothing more", r.status === 410 && r.json.code === "closed", `${r.status} ${r.json?.code}`);
const painKey = workout.stations[0].compareKey;

/* ---------- B: the clock ends a game while nobody presses ---------- */

const b = await build(20);
workout = await planOf(b);
check("a game stopped for pain does not come back", !workout.stations.some((s) => s.compareKey === painKey));
await toFirstPortion(b);
await send(b, report(workout));
await age(b, 10 * 60 * 1000);
check("before anyone reads: no result yet", !(await firstBlock(b)).result);
r = await call("GET", `/api/workouts/${b}`);
const last = r.json.events.at(-1);
check("reading writes the clock's ending into the log", last.type === "station-end" && last.reason === "time" && last.id === "s1:end");
check("and the result onto the station", (await firstBlock(b)).result?.reason === "time");
check("the workout is still under way", (await sessionRow(b)).status === "active");
const keyB = workout.stations[0].compareKey;

await age(b, 4 * 60 * 60 * 1000);
r = await call("GET", "/api/workouts");
check("a workout left for hours is not offered as open", r.json.id === null, JSON.stringify(r.json));
let row = await sessionRow(b);
const minutes = (row.completedAt - row.startedAt) / 60000;
check("it is closed as done, with the length it really had", row.status === "done" && minutes > 4 && minutes < 7, `${row.status}, ${minutes.toFixed(1)} min`);
r = await call("GET", `/api/workouts/${b}`);
check("its log ends with the closing finish", r.json.events.at(-1).id === "run:closed");
check("and it takes nothing more", (await send(b, { type: "next" })).status === 410);

/* ---------- C: left in the warm-up ---------- */

const c = await build(20);
workout = await planOf(c);
check("the game with a result comes back first", workout.stations[0].compareKey === keyB);
r = await call("GET", `/api/workouts/${c}`);
check("with its result to beat", Boolean(r.json.best.s1), r.json.best.s1?.text?.he);
await send(c, { type: "begin" });
await age(c, 4 * 60 * 60 * 1000);
check("an event for a workout left for hours is refused", (await send(c, { type: "warmup-done" })).status === 410);
row = await sessionRow(c);
check("left in the warm-up → abandoned, not done", row.status === "abandoned", row.status);

/* ---------- One-game workouts alternate between a returning game and a new one ---------- */

async function playOneGame() {
  const id = await build(12);
  const plan = await planOf(id);
  await toFirstPortion(id);
  await send(id, report(plan));
  await send(id, { type: "station-end", station: "s1", reason: "choice" });
  await send(id, { type: "to-cooldown" });
  if ((await send(id, { type: "finish" })).status !== 200) throw new Error("could not finish a one-game workout");
  return plan.stations[0].compareKey;
}
const first = await playOneGame();
const second = await playOneGame();
const third = await playOneGame();
check("one-game workouts: returning, then new, then returning", first === keyB && second !== keyB && (third === keyB || third === second));

/* ---------- Beginning a new workout while another is under way ---------- */

const d = await build(20);
workout = await planOf(d);
await toFirstPortion(d);
await send(d, report(workout));
const e = await build(20);
check("a new workout begins while another is under way", (await send(e, { type: "begin" })).status === 200);
row = await sessionRow(d);
check("the other one is closed as done, keeping its work", row.status === "done", row.status);
block = await firstBlock(d);
check("its open game was cut short by choice, with its result", block.result?.reason === "choice", JSON.stringify(block.result?.score.rank));
r = await call("GET", `/api/workouts/${d}`);
check("its log ends with the closing finish", r.json.events.at(-1).id === "run:closed");
check("and it takes nothing more", (await send(d, { type: "portion-start", station: "s1" })).status === 410);
check("the new one is the one under way", (await sessionRow(e)).status === "active");

await db.end();
process.exit(finish());
