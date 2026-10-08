// Shared by the live checks: where the app and its database are, and a
// refusal to run anywhere but on a local, throwaway database. These checks
// delete the signed-in user's workouts, answer the health questions for that
// user and rewrite rows directly.

import pg from "pg";

export const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
export const PASSWORD = process.env.APP_PASSWORD ?? "";
const DATABASE_URL = process.env.DATABASE_URL ?? "";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

/** True only for a plain address on this machine, with nothing that could send the connection elsewhere. */
function isLocal(address) {
  try {
    const url = new URL(address);
    // A connection string may name another server in its query (?host=...): no query is accepted at all.
    return LOCAL_HOSTS.has(url.hostname) && url.search === "";
  } catch {
    return false;
  }
}

function refuse(message) {
  console.error(`Refusing to run: ${message}`);
  process.exit(2);
}

export async function connect() {
  if (process.env.LIVE_CHECK !== "throwaway-local-data") {
    refuse("these checks delete workouts and change data. Set LIVE_CHECK=throwaway-local-data to say the database is a local throwaway one.");
  }
  if (!PASSWORD || !DATABASE_URL) refuse("set APP_PASSWORD and DATABASE_URL to the values the local dev server uses.");
  if (!isLocal(DATABASE_URL) || !isLocal(BASE)) refuse("the app and the database must both be on this machine, addressed without a query string.");
  const db = new pg.Client({ connectionString: DATABASE_URL });
  await db.connect();
  return db;
}

/**
 * The local server could still be pointed at another database. After the
 * first workout is built through the app, it must be found in the database
 * these checks write to; otherwise nothing more is touched.
 */
export async function sameDatabase(db, sessionId) {
  const { rows } = await db.query('select "userId" from "Session" where id=$1', [sessionId]);
  if (rows.length === 0) refuse("the app does not use the database in DATABASE_URL.");
  return rows[0].userId;
}

export function checker() {
  let passed = 0;
  let failed = 0;
  return {
    check(name, ok, detail = "") {
      if (ok) passed += 1;
      else failed += 1;
      console.log(`${ok ? "ok   " : "FAIL "}${name}${detail ? `  → ${detail}` : ""}`);
    },
    finish() {
      console.log(`\n${passed} passed, ${failed} failed`);
      return failed === 0 ? 0 : 1;
    },
  };
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The events stored for a workout, straight from the database. */
export async function storedEvents(db, id) {
  const { rows } = await db.query('select context from "Session" where id=$1', [id]);
  return rows[0]?.context.run.events ?? [];
}
