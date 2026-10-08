import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import type { Client } from "pg";
import { MODELS } from "./db-schema";
import { fileSha256 } from "./backup-files";

export const BACKUP_FORMAT = 1;
export type Snapshot = {
  format: number;
  createdAt: string;
  tables: Record<string, Record<string, unknown>[]>;
  missingTables?: string[];
};

/** One read-only snapshot, bounded pages, and no finished filename until success. */
export async function writeDatabaseSnapshot(
  client: Pick<Client, "query">,
  dir: string,
  { pageSize = 1000, now = new Date() } = {},
) {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error("Invalid page size");
  await mkdir(dir, { recursive: true });
  const stamp = now.toISOString().replace(/[:.]/g, "-").replace("T", "-").replace(/Z$/, "");
  const file = join(dir, `engine-${stamp}-${randomUUID()}.json.gz`);
  const temporary = `${file}.${randomUUID()}.partial`;
  const counts: Record<string, number> = {};
  const missingTables: string[] = [];
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    // Inspect first instead of catching missing-table errors inside a transaction:
    // a PostgreSQL statement error would abort that entire transaction.
    const existing = await client.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = current_schema()",
    );
    const tables = new Set(existing.rows.map((r) => r.tablename));
    async function* json() {
      yield `{"format":${BACKUP_FORMAT},"createdAt":${JSON.stringify(now.toISOString())},"tables":{`;
      for (const [index, spec] of MODELS.entries()) {
        yield `${index ? "," : ""}${JSON.stringify(spec.table)}:[`;
        counts[spec.table] = 0;
        if (!tables.has(spec.table)) {
          missingTables.push(spec.table);
        } else {
          let cursor: string | null = null;
          for (;;) {
            // Identifiers are from the static model list, values are parameters.
            // SELECT * also preserves columns on a database awaiting migration.
            const page: { rows: Record<string, unknown>[] } = await client.query(
              `SELECT * FROM "${spec.table}" ${cursor === null ? "" : 'WHERE "id" > $1'} ORDER BY "id" ASC LIMIT $${cursor === null ? 1 : 2}`,
              cursor === null ? [pageSize] : [cursor, pageSize],
            );
            for (const row of page.rows) {
              yield `${counts[spec.table]++ ? "," : ""}${JSON.stringify(row)}`;
            }
            if (page.rows.length < pageSize) break;
            cursor = String(page.rows[page.rows.length - 1].id);
          }
        }
        yield "]";
      }
      yield `},"missingTables":${JSON.stringify(missingTables)}}`;
    }
    await pipeline(Readable.from(json()), createGzip(), createWriteStream(temporary, { flags: "wx", mode: 0o600 }));
    await client.query("COMMIT");
    const sha256 = await fileSha256(temporary);
    await writeFile(`${temporary}.sha256`, `${sha256}  ${basename(file)}\n`, { mode: 0o600, flag: "wx" });
    await rename(`${temporary}.sha256`, `${file}.sha256`);
    await rename(temporary, file);
    return { file, counts, missingTables, sha256, rows: Object.values(counts).reduce((a, b) => a + b, 0) };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await rm(temporary, { force: true });
    await rm(`${temporary}.sha256`, { force: true });
  }
}

/** Validate before any database connection or mutation, including legacy format 1. */
export function validateSnapshot(raw: unknown, allowPartial = false): Snapshot {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("גיבוי לא תקין");
  const s = raw as Snapshot;
  if (s.format !== BACKUP_FORMAT) throw new Error(`פורמט גיבוי לא נתמך: ${s.format}`);
  if (typeof s.createdAt !== "string" || !Number.isFinite(Date.parse(s.createdAt)) ||
      !s.tables || typeof s.tables !== "object" || Array.isArray(s.tables)) throw new Error("מבנה גיבוי לא תקין");
  const known = new Set(MODELS.map((m) => m.table));
  for (const [table, rows] of Object.entries(s.tables)) {
    if (!known.has(table) || !Array.isArray(rows)) throw new Error(`טבלת גיבוי לא תקינה: ${table}`);
    const ids = new Set<string>();
    for (const row of rows) {
      if (!row || typeof row !== "object" || Array.isArray(row) || typeof row.id !== "string" || !row.id || ids.has(row.id)) {
        throw new Error(`רשומה לא תקינה או מזהה כפול: ${table}`);
      }
      ids.add(row.id);
    }
  }
  if (s.missingTables !== undefined && (!Array.isArray(s.missingTables) || s.missingTables.some((t) => !known.has(t)))) {
    throw new Error("רשימת טבלאות חסרות לא תקינה");
  }
  const missing = MODELS.filter((m) => !Object.hasOwn(s.tables, m.table)).map((m) => m.table);
  if (!allowPartial && (missing.length || s.missingTables?.length)) {
    throw new Error("זהו גיבוי חלקי או ישן. בדוק את הטבלאות והשתמש ב־--allow-partial רק לשחזור מכוון.");
  }
  return s;
}
