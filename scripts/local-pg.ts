// שרת Postgres מקומי לפיתוח ולבדיקות — בלי Docker ובלי התקנה מערכתית.
// מריץ PGlite (Postgres שמהודר ל-WASM) ומגיש אותו בפרוטוקול הרשת של Postgres,
// כך ש-Prisma, pg וכל כלי אחר מתחברים אליו עם connection string רגיל.
//
//   pnpm db:local                      → postgres://postgres@127.0.0.1:5433/postgres
//   pnpm db:local --port 5434 --dir …  → מופע נוסף (למשל QA)
//
// זה תחליף פיתוח בלבד. בענן משתמשים ב-Postgres המנוהל (החלטה 20).
import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const dir = arg("dir", "prisma/local-pg");
const port = Number(arg("port", "5433"));
const host = arg("host", "127.0.0.1");

async function main() {
  mkdirSync(dir, { recursive: true });

  const db = await PGlite.create({ dataDir: dir });
  // ‏PGlite הוא מסד חד-חיבורי; המרבב של השרת מאפשר בכל זאת בריכת חיבורים
  const server = new PGLiteSocketServer({ db, port, host, maxConnections: 10 });
  await server.start();

  const shutdown = async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(`Postgres מקומי (PGlite) עלה על ${host}:${port}`);
  console.log(`DATABASE_URL="postgres://postgres@${host}:${port}/postgres"`);
  console.log("עצירה: Ctrl+C");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
