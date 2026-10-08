// גיבוי ושחזור של מסד הנתונים (החלטה 20: "גיבוי יומי אוטומטי מרגע שהמסד
// המקוון הוא מקור האמת"). הגיבוי הוא JSON לוגי בהזרמה דרך pg — בלי תלות ב-pg_dump
// ובלי בינארי מותקן, כך שהוא רץ גם בקונטיינר של פלטפורמת הפריסה.
//
//   pnpm db:backup                        → backups/engine-<חותמת>.json.gz
//   pnpm db:backup --dir /data/backups    → תיקיית יעד אחרת
//   pnpm db:backup --keep 30              → כמה גיבויים לשמור (ברירת מחדל 30)
// בכל מקרה נמחק גיבוי בן יותר מ-30 יום, גם אם יש פחות מ-N קבצים: זו
// ההבטחה שבמדיניות הפרטיות ("נעלם מהגיבויים בתוך 30 יום לכל היותר"),
// והיא לא יכולה להיות תלויה בקצב הריצות (ביקורת סבב 35, LEGAL-2).
//   pnpm db:restore backups/engine-…json.gz          → שחזור למסד ריק
//   pnpm db:restore backups/engine-…json.gz --force  → שחזור גם על מסד מאוכלס
//
// השחזור כותב ב-upsert לפי id בסדר מפתחות זרים, בטרנזקציה אחת — ניתן להריץ
// שוב, וכישלון באמצע לא משאיר מסד חצי-משוחזר. שורות שנזרעו ביעד עם מפתח
// עסקי מהגיבוי אך id אחר (תרגיל מ-deploy:prepare, מדד שנזרע בכניסה)
// מיושרות לפני הכתיבה — נמחקות, או מקבלות את מזהה הגיבוי כשמפנים אליהן.
import "dotenv/config";
import { gunzipSync } from "node:zlib";
import { Client } from "pg";
import { validateSnapshot, writeDatabaseSnapshot } from "./db-snapshot";
import { verifyBackupChecksum } from "./backup-files";
import { readdirSync, readFileSync, statSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createPrismaClient, databaseUrl } from "../src/lib/prisma-client";
import { MODELS, type ModelSpec } from "./db-schema";
import { withRetry } from "./backup-retry";
import { MAX_AGE_DAYS, backupsToPrune } from "./backup-prune";


/**
 * מי הריץ את הגיבוי. ‏RAILWAY_SERVICE_NAME קיים רק בתוך קונטיינר של
 * הפלטפורמה; `--source` מאפשר לתייג ידנית. ברירת המחדל: המחשב של הבעלים.
 */
function backupSource(): string {
  const explicit = process.argv.indexOf("--source");
  if (explicit >= 0 && process.argv[explicit + 1]) {
    return process.argv[explicit + 1].slice(0, 40);
  }
  return process.env.RAILWAY_SERVICE_NAME ? "railway-cron" : "local";
}

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

type Delegate = {
  findMany: (a?: unknown) => Promise<Record<string, unknown>[]>;
  findFirst: (a?: unknown) => Promise<Record<string, unknown> | null>;
  upsert: (a: unknown) => Promise<unknown>;
  update: (a: unknown) => Promise<unknown>;
  delete: (a: unknown) => Promise<unknown>;
  count: (a?: unknown) => Promise<number>;
};
const delegateOf = (prisma: unknown, model: string): Delegate =>
  (prisma as Record<string, Delegate>)[model];

/** תאריכים חוזרים מ-JSON כמחרוזות ISO — מחזירים אותם ל-Date לפני הכתיבה */
function reviveDates(row: Record<string, unknown>, columns: Record<string, string>) {
  const out: Record<string, unknown> = { ...row };
  for (const [column, kind] of Object.entries(columns)) {
    if (kind === "date" && typeof out[column] === "string") {
      out[column] = new Date(out[column] as string);
    }
  }
  return out;
}

/** Run-log writes may precede the migration adding BackupRun or its columns. */
function missingKind(e: unknown): "table" | "column" | null {
  const code =
    typeof e === "object" && e !== null && "code" in e
      ? (e as { code?: unknown }).code
      : null;
  return code === "P2021" ? "table" : code === "P2022" ? "column" : null;
}

async function backup() {
  const dir = arg("dir", "backups");
  const keep = Number(arg("keep", "30"));
  if (!Number.isInteger(keep) || keep < 0) throw new Error("--keep חייב להיות מספר שלם אי־שלילי");
  const prisma = createPrismaClient();
  try {
    // החלטה 47: שם ואסימון של אורחי זירה נמחקים 30 יום אחרי סוף הזירה.
    // ניקוי עצל — גם ביצירת זירה (src/lib/match-store.ts); כאן, לפני הצילום,
    // כדי שהשם לא ייכנס לגיבוי חדש ויקרה גם בלי פעילות.
    try {
      const purged = await prisma.matchParticipant.updateMany({
        where: {
          userId: null,
          OR: [{ guestName: { not: null } }, { guestTokenHash: { not: null } }],
          match: { endedAt: { lt: new Date(Date.now() - 30 * 86_400_000) } },
        },
        data: { guestName: null, guestTokenHash: null },
      });
      if (purged.count > 0) console.log(`  נוקו ${purged.count} אורחי זירה (30 יום)`);
    } catch (e) {
      if (missingKind(e) === null) console.error("ניקוי אורחי הזירה נכשל:", e instanceof Error ? e.message : e);
    }

    const client = await withRetry(async () => {
      const connection = new Client({ connectionString: databaseUrl(), connectionTimeoutMillis: 30_000 });
      try {
        await connection.connect();
        await connection.query("SELECT 1");
        return connection;
      } catch (error) {
        await connection.end().catch(() => {});
        throw error;
      }
    });
    let result;
    try {
      result = await writeDatabaseSnapshot(client, dir);
    } finally {
      await client.end();
    }
    const { file, rows, counts, missingTables } = result;
    const bytes = statSync(file).size;
    console.log(`גיבוי עקבי נשמר: ${file} (${rows} שורות, ${bytes} בתים)`);

    // רישום ההצלחה במסד — זה מה שמסך הניהול קורא. הקובץ נכתב לדיסק של מי
    // שהריץ (ווליום ב-Railway או המחשב), והאפליקציה לא רואה אותו; המסד הוא
    // המקום המשותף היחיד לשני נתיבי הגיבוי. כישלון ברישום לא מפיל גיבוי
    // שכבר נשמר בהצלחה — הקובץ חשוב יותר מהחיווי.
    try {
      await prisma.backupRun.create({
        data: { source: backupSource(), rows, bytes, target: file,
          status: missingTables.length ? "failed" : "ok",
          error: missingTables.length ? `נשמר גיבוי חלקי; טבלאות חסרות: ${missingTables.join(", ")}` : null },
      });
    } catch (e) {
      // לפני המיגרציה שמוסיפה את הטבלה זה המצב הצפוי, לא תקלה
      console.error(
        missingKind(e) !== null
          ? "הגיבוי נשמר; רישומו יתחיל אחרי המיגרציה שיוצרת את BackupRun."
          : `הגיבוי נשמר אך רישומו במסד נכשל: ${e instanceof Error ? e.message : e}`,
      );
    }
    for (const [table, count] of Object.entries(counts)) {
      const note = missingTables.includes(table) ? " (הטבלה עוד לא קיימת במסד)" : "";
      console.log(`  ${table}: ${count}${note}`);
    }
    if (missingTables.length > 0) {
      console.log(
        `שים לב: ${missingTables.length} טבלאות לא קיימות עדיין במסד המקור — ` +
          `הגיבוי נלקח לפני מיגרציה שמוסיפה אותן.`,
      );
    }

    // שמירת N הגיבויים האחרונים, **וגם** מחיקת כל מה שבן יותר מ-30 יום
    for (const f of backupsToPrune(readdirSync(dir), keep, new Date())) {
      unlinkSync(join(dir, f));
      if (existsSync(join(dir, `${f}.sha256`))) unlinkSync(join(dir, `${f}.sha256`));
      console.log(`  נמחק גיבוי ישן: ${f}`);
    }
    console.log(`  (שומר ${keep} גיבויים, ולא יותר מ-${MAX_AGE_DAYS} יום אחורה)`);
  } catch (error) {
    // A fixed message avoids persisting connection strings from driver errors.
    await prisma.backupRun.create({ data: {
      source: backupSource(), rows: 0, bytes: 0, target: dir, status: "failed",
      error: "הגיבוי נכשל; פרטים ביומן המשימה המקומי או בענן.",
    } }).catch(() => {}); // A database outage cannot record its own failure.
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * יישור מפתח עסקי לפני upsert לפי id: מסד יעד טרי מגיע כבר זרוע
 * (‏deploy:prepare מריץ import-exercises עם cuid חדש לכל תרגיל, וכניסה
 * לאפליקציה זורעת מדדים) — כך שכתיבת שורת הגיבוי הייתה נופלת על הפרת
 * ייחודיות (P2002). שורת יעד עם אותו מפתח עסקי ו-id שונה נמחקת כשאין
 * הפניות אליה; כשיש (למשל SetLog שנרשם לפני השחזור) — היא מקבלת את מזהה
 * הגיבוי, והמפתחות הזרים נגררים (כולם מוגדרים ON UPDATE CASCADE).
 * מחזיר כמה שורות יעד יושרו.
 */
async function alignBusinessKeys(
  tx: unknown,
  spec: ModelSpec,
  data: Record<string, unknown>,
): Promise<number> {
  let aligned = 0;
  const delegate = delegateOf(tx, spec.model);
  for (const key of spec.businessKeys ?? []) {
    // מפתח עם ערך חסר אינו ייחודי ב-Postgres (NULL≠NULL) — אין מה ליישר
    if (key.some((column) => data[column] === null || data[column] === undefined)) continue;
    const where = Object.fromEntries(key.map((column) => [column, data[column]]));
    const clash = await delegate.findFirst({
      where: { ...where, NOT: { id: data.id } },
      select: { id: true },
    });
    if (!clash) continue;
    let referenced = 0;
    for (const ref of spec.refs ?? []) {
      referenced += await delegateOf(tx, ref.model).count({
        where: { [ref.field]: clash.id },
      });
    }
    if (referenced === 0) {
      await delegate.delete({ where: { id: clash.id } });
    } else {
      const occupied = await delegate.findFirst({
        where: { id: data.id },
        select: { id: true },
      });
      if (occupied) {
        // גם המפתח העסקי וגם ה-id תפוסים בידי שתי שורות שונות — הצלבת
        // זהויות שאין לה פתרון אוטומטי בטוח. הטרנזקציה תגלגל הכול לאחור.
        throw new Error(
          `${spec.table}: הצלבת מזהים — המפתח (${key.join("+")}) תפוס בידי ${clash.id} ` +
            `וה-id ‏${data.id} תפוס בידי שורה אחרת. נדרש יישוב ידני לפני שחזור.`,
        );
      }
      await delegate.update({ where: { id: clash.id }, data: { id: data.id } });
    }
    aligned += 1;
  }
  return aligned;
}

async function restore() {
  const file = process.argv[process.argv.indexOf("--restore") + 1];
  if (!file || file.startsWith("--")) {
    throw new Error("שימוש: pnpm db:restore <קובץ גיבוי>");
  }
  if (!(await verifyBackupChecksum(file))) console.warn("גיבוי ישן ללא חתימה — בדיקת מבנה בלבד.");
  const raw = file.endsWith(".gz")
    ? gunzipSync(readFileSync(file)).toString("utf8")
    : readFileSync(file, "utf8");
  const snapshot = validateSnapshot(JSON.parse(raw), flag("allow-partial"));

  const prisma = createPrismaClient();
  console.log(`שחזור מ-${file} (נוצר ${snapshot.createdAt})`);
  console.log(`יעד: ${databaseUrl().replace(/:[^:@/]*@/, ":***@")}`);
  try {
    if (!flag("force")) {
      for (const spec of MODELS) {
        const existing = await delegateOf(prisma, spec.model).count();
        // טבלאות שמסד טרי מגיע איתן מלאות (מאגר התרגילים, שורת הבעלים)
        // אינן "יעד מאוכלס" — השחזור דורס אותן לפי id בכל מקרה
        if (existing > 0 && !spec.seeded) {
          throw new Error(
            `היעד אינו ריק (${spec.table}: ${existing} שורות). הרץ עם --force אם זו הכוונה.`,
          );
        }
      }
    }
    // כל הכתיבה בטרנזקציה אחת: כישלון באמצע מגלגל הכול לאחור, במקום
    // להשאיר מסד שה-User שוחזר בו וכל השאר חסר
    await prisma.$transaction(
      async (tx) => {
        for (const spec of MODELS) {
          const rows = snapshot.tables[spec.table] ?? [];
          const delegate = delegateOf(tx, spec.model);
          let aligned = 0;
          for (const row of rows) {
            const data = reviveDates(row, spec.columns);
            aligned += await alignBusinessKeys(tx, spec, data);
            await delegate.upsert({ where: { id: data.id }, create: data, update: data });
          }
          const note = aligned > 0 ? ` (יושרו ${aligned} שורות שנזרעו ביעד)` : "";
          console.log(`  ${spec.table}: ${rows.length} → ${await delegate.count()} ביעד${note}`);
        }
      },
      // שחזור מלא הוא אלפי upsert-ים — הרבה מעבר ל-5 השניות של ברירת המחדל
      { maxWait: 10_000, timeout: 10 * 60_000 },
    );
    console.log("השחזור הושלם.");
  } finally {
    await prisma.$disconnect();
  }
}

(flag("restore") ? restore() : backup()).catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
