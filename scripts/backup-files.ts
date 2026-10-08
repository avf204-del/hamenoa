import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync } from "node:fs";

/** Hash incrementally: media archives can be larger than the Node heap. */
export async function fileSha256(file: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

export async function verifyBackupChecksum(file: string): Promise<boolean> {
  if (!existsSync(`${file}.sha256`)) return false; // Legacy backups remain readable.
  const expected = readFileSync(`${file}.sha256`, "utf8").trim().split(/\s+/)[0];
  if (!/^[a-f0-9]{64}$/.test(expected) || (await fileSha256(file)) !== expected) {
    throw new Error("חתימת הגיבוי אינה תואמת — השחזור נעצר לפני כתיבה למסד.");
  }
  return true;
}
