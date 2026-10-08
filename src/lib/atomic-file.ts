import { randomUUID } from "node:crypto";
import { open, rename, rm, stat } from "node:fs/promises";

export async function atomicWriteFile(file: string, text: string): Promise<void> {
  const temporary = `${file}.${randomUUID()}.tmp`;
  const mode = (await stat(file)).mode & 0o777;
  try {
    const handle = await open(temporary, "wx", mode);
    try { await handle.writeFile(text, "utf8"); await handle.sync(); }
    finally { await handle.close(); }
    await rename(temporary, file);
  } finally { await rm(temporary, { force: true }); }
}
