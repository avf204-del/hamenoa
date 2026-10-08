import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { PGlite } from "@electric-sql/pglite";
import type { Client } from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";
import { writeDatabaseSnapshot, validateSnapshot } from "../scripts/db-snapshot";
import { verifyBackupChecksum } from "../scripts/backup-files";
import { createAsyncCache } from "../src/lib/async-cache";
import { backupTimestamp } from "../scripts/backup-prune";

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((d) => rm(d, { recursive: true, force: true }))); });
async function temporary() { const d = await mkdtemp(join(tmpdir(), "forceapp-storage-test-")); directories.push(d); return d; }

describe("consistent streaming backups", () => {
  it("pages a real database, retains pre-migration columns, and verifies the completed file", async () => {
    const db = await PGlite.create();
    try {
      await db.exec('CREATE TABLE "User" (id text primary key, legacy text); INSERT INTO "User" VALUES (\'a\',\'one\'),(\'b\',\'two\'),(\'c\',\'three\');');
      let isolation = "";
      const client = { query: async (sql: string, values?: unknown[]) => {
        const result = await db.query(sql, values);
        if (sql.startsWith("BEGIN")) {
          isolation = (await db.query<{ transaction_isolation: string }>("SHOW transaction_isolation")).rows[0].transaction_isolation;
          expect((await db.query<{ transaction_read_only: string }>("SHOW transaction_read_only")).rows[0].transaction_read_only).toBe("on");
        }
        return result;
      } } as unknown as Pick<Client, "query">;
      const dir = await temporary();
      const now = new Date("2026-09-20T00:15:11.123Z");
      const result = await writeDatabaseSnapshot(client, dir, { pageSize: 2, now });
      expect(isolation).toBe("repeatable read");
      expect(result.rows).toBe(3);
      expect(await verifyBackupChecksum(result.file)).toBe(true);
      const snapshot = JSON.parse(gunzipSync(await readFile(result.file)).toString());
      expect(snapshot.tables.User.map((r: { legacy: string }) => r.legacy)).toEqual(["one", "two", "three"]);
      expect(snapshot.missingTables).toContain("SetLog");
      expect(() => validateSnapshot(snapshot)).toThrow("חלקי");
      expect(validateSnapshot(snapshot, true).tables.User).toHaveLength(3);
      expect((await readdir(dir)).some((f) => f.includes("partial"))).toBe(false);
      const simultaneous = await writeDatabaseSnapshot(client, dir, { pageSize: 2, now });
      expect(simultaneous.file).not.toBe(result.file);
      expect(await verifyBackupChecksum(result.file)).toBe(true);
      expect(await verifyBackupChecksum(simultaneous.file)).toBe(true);
      expect(backupTimestamp(simultaneous.file.split("/").at(-1)!)?.toISOString()).toBe(now.toISOString());
      await writeFile(result.file, "corrupted");
      await expect(verifyBackupChecksum(result.file)).rejects.toThrow("חתימת");
    } finally { await db.close(); }
  });

  it("does not publish a failed backup", async () => {
    const dir = await temporary();
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("pg_tables")) return { rows: [{ tablename: "User" }] };
      if (sql.startsWith('SELECT *')) throw new Error("connection lost");
      return { rows: [] };
    });
    await expect(writeDatabaseSnapshot({ query } as unknown as Pick<Client, "query">, dir)).rejects.toThrow("connection lost");
    expect(await readdir(dir)).toEqual([]);
    expect(query).toHaveBeenCalledWith("ROLLBACK");
  });

  it("rejects malformed snapshots and invalid dates in retention filenames", () => {
    for (const value of [null, [], {}, { format: 1, createdAt: "bad", tables: {} },
      { format: 1, createdAt: new Date().toISOString(), tables: { User: [{ id: "same" }, { id: "same" }] } }]) {
      expect(() => validateSnapshot(value, true)).toThrow();
    }
    expect(backupTimestamp("engine-2026-02-31-00-00-00.json.gz")).toBeNull();
    expect(backupTimestamp("engine-2026-09-20-00-15-11-123.json.gz")?.toISOString()).toBe("2026-09-20T00:15:11.123Z");
  });
});

describe("exercise cache concurrency", () => {
  it("shares concurrent requests and does not repopulate from invalidated reads", async () => {
    let finishOld!: (value: number[]) => void;
    const load = vi.fn().mockImplementationOnce(() => new Promise<number[]>((resolve) => { finishOld = resolve; }))
      .mockResolvedValueOnce([2]);
    const cache = createAsyncCache<number[]>(load, 300_000);
    const old = cache.get();
    expect(cache.get()).toBe(old);
    await Promise.resolve();
    cache.clear();
    expect(await cache.get()).toEqual([2]);
    finishOld([1]); await old;
    expect(await cache.get()).toEqual([2]);
    expect(load).toHaveBeenCalledTimes(2);
  });
  it("retries failed loads instead of caching a rejected promise", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([3]);
    const cache = createAsyncCache(load, 100);
    await expect(cache.get()).rejects.toThrow("offline");
    expect(await cache.get()).toEqual([3]);
  });
});
