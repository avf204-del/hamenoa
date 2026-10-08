// Inventory first; --apply explicitly prunes expired legacy personal-data copies.
// Content archives have their own retention and are never traversed here.
import { readdirSync, statSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { backupsToPrune, MAX_AGE_DAYS } from "./backup-prune";

export function legacyBackupExpired(name: string, modifiedAt: Date, now = new Date()): boolean {
  return /^(?:pre-[\w-]+(?:[\d:T.-]+)?\.json|(?:dev[^/]*|qa)\.db)$/.test(name) &&
    modifiedAt.getTime() < now.getTime() - MAX_AGE_DAYS * 86_400_000;
}

const main = process.argv[1]?.endsWith("backup-maintenance.ts");
if (main) {
  const dirIndex = process.argv.indexOf("--dir");
  const dir = dirIndex >= 0 ? process.argv[dirIndex + 1] : "backups";
  if (!dir) throw new Error("Missing --dir value");
  const now = new Date();
  const names = readdirSync(dir).filter((name) => statSync(join(dir, name)).isFile());
  const regular = new Set(backupsToPrune(names, 30, now));
  const candidates = names.filter((name) => regular.has(name) || legacyBackupExpired(name, statSync(join(dir, name)).mtime, now));
  const apply = process.argv.includes("--apply");
  for (const name of candidates) {
    console.log(`${apply ? "Removing" : "Would remove"}: ${name}`);
    if (apply) {
      unlinkSync(join(dir, name));
      if (existsSync(join(dir, `${name}.sha256`))) unlinkSync(join(dir, `${name}.sha256`));
    }
  }
  console.log(`${candidates.length} expired backups; mode=${apply ? "apply" : "dry-run"}`);
}
