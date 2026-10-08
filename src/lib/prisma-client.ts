// יצירת לקוח Prisma מול Postgres (החלטה 20) — נקודה אחת לכל הצרכנים:
// קוד השרת (src/lib/db.ts), הזריעה והסקריפטים. שינוי חיבור נעשה כאן בלבד.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

// ברירת מחדל בפיתוח: ה-Postgres המקומי של `pnpm db:local`.
// בפרודקשן אין ברירת מחדל — חסר DATABASE_URL הוא תקלת הגדרה, לא משהו שמנחשים.
const LOCAL_DEV_URL = "postgres://postgres@127.0.0.1:5433/postgres";

export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL חסר — הגדר את כתובת ה-Postgres המנוהל.");
  }
  return LOCAL_DEV_URL;
}

export function createPrismaClient(url = databaseUrl(), max = 5) {
  // בריכה מוגבלת לכל תהליך; לפני הגדלת מספר המופעים יש לבדוק את תקציב החיבורים הכולל.
  // ‏max=1 לבדיקות מול PGlite: כל החיבורים שם חולקים סשן אחד, ו-ROLLBACK בחיבור
  // אחד פוגע במצב של חיבור אחר — בריכה של חיבור יחיד היא המודל הנאמן.
  const adapter = new PrismaPg({ connectionString: url, max });
  return new PrismaClient({ adapter });
}
