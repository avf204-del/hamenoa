// שעון "היום" היחיד של האפליקציה — קבוע לאזור הזמן של ישראל (Asia/Jerusalem)
// ולא לאזור הזמן של סביבת הריצה. קונטיינר Railway רץ ב-UTC כברירת מחדל,
// ובלי המודול הזה כל חישוב "היום המקומי" בשרת היה למעשה UTC: אימון שנפתח
// בין 00:00 ל-02:59 שעון ישראל היה מקבל תאריך של אתמול, ונסגר/ננטש
// מוקדם מדי (round30-findings confirmed[6]). טהור, בלי Prisma/React —
// כל צרכן שרת (todayStr, localDayStr, מסכי שרת) עובר דרכו.
//
// Intl.DateTimeFormat עם timeZone מפורש נקרא מול מסד אזורי הזמן של ICU,
// לא מול process.env.TZ של הסביבה — ולכן נכון גם בלי TZ=Asia/Jerusalem
// בסביבת הריצה (זה מוגדר גם ב-railway.json כביטוח נוסף, לא כתלות).

const ISRAEL_TIME_ZONE = "Asia/Jerusalem";

// en-CA מפיק ישירות את הפורמט YYYY-MM-DD.
const israelDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ISRAEL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** היום המקומי (שעון ישראל) של רגע נתון, כמחרוזת YYYY-MM-DD */
export function localDayOf(d: Date): string {
  return israelDayFormatter.format(d);
}

/** "היום" הנוכחי לפי שעון ישראל, כמחרוזת YYYY-MM-DD */
export function todayLocalStr(): string {
  return localDayOf(new Date());
}

/*
 * אריתמטיקת ימים על מחרוזות YYYY-MM-DD — טהורה לגמרי, ולכן חיה כאן ולא
 * ב-progress.ts (שמייבא Prisma ולכן אסור לקומפוננטות לקוח לגעת בו — זה
 * בדיוק מה שהפיל את עמוד לוח השנה בסבב 33 כשהרדאר ייבא ממנו).
 * progress.ts מייצא אותן מחדש, כך שכל הצרכנים הקיימים לא זזים.
 */

/** הוספת n ימים (שלילי = אחורה) למחרוזת יום */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** תחילת השבוע של יום נתון — יום ראשון (השבוע הישראלי) */
export function weekStartStr(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return addDays(day, -d.getUTCDay());
}
