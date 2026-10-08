// גיזום קבצי הגיבוי (ביקורת סבב 35, ממצא LEGAL-2).
//
// מדיניות הפרטיות והתנאים מבטיחים שעותק גיבוי של חשבון שנמחק "נעלם בתוך
// 30 יום לכל היותר". הגיזום שהיה כאן שמר את N הקבצים האחרונים ולא הכיר
// תאריך בכלל — ומכיוון שהגיבוי המקומי רץ כ-LaunchAgent שמשלים ריצות רק
// בהדלקה הבאה, שבוע שהמחשב כבוי פרש את 30 הקבצים על 37 יום ושבר את
// ההבטחה. לכן שני כללים, ומספיק שאחד מהם חל:
//   • יותר מ-N קבצים — הישנים נמחקים (כמו קודם).
//   • קובץ בן יותר מ-30 יום — נמחק, כמה שלא יהיו קבצים.
//
// מודול טהור בכוונה: הוא מקבל רשימת שמות ומחזיר רשימת שמות, ולכן נבדק
// בלי לגעת בדיסק.

export const BACKUP_PREFIX = "engine-";
export const BACKUP_SUFFIX = ".json.gz";

/** ההבטחה שבמסמכים המשפטיים, בימים */
export const MAX_AGE_DAYS = 30;

/** האם שם הקובץ הוא גיבוי של המנוע */
export function isBackupFile(name: string): boolean {
  return name.startsWith(BACKUP_PREFIX) && name.endsWith(BACKUP_SUFFIX);
}

/**
 * מועד היצירה מתוך שם הקובץ (`engine-2026-09-07-17-38-36.json.gz`) —
 * חותמת ISO ב-UTC שבה `:` ו-`.` הוחלפו במקף. שם שאינו בתבנית מחזיר null,
 * והוא יגוזם לפי מספר בלבד: עדיף להשאיר קובץ זר מאשר למחוק אותו בניחוש.
 */
export function backupTimestamp(name: string): Date | null {
  const stamp = name.slice(BACKUP_PREFIX.length, -BACKUP_SUFFIX.length);
  const m = /^(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})(?:-(\d{3}))?(?:-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})?$/.exec(stamp);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, ms = "0"] = m;
  const at = new Date(
    Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s), Number(ms)),
  );
  return at.getUTCFullYear() === Number(y) && at.getUTCMonth() === Number(mo) - 1 &&
    at.getUTCDate() === Number(d) && at.getUTCHours() === Number(h) &&
    at.getUTCMinutes() === Number(mi) && at.getUTCSeconds() === Number(s) ? at : null;
}

/**
 * אילו קבצים למחוק. מקבל את תוכן התיקייה כמו שהוא, ומחזיר שמות בלבד.
 * ‏`keep <= 0` מבטל את כלל המספר, אבל **לא** את כלל הגיל.
 */
export function backupsToPrune(
  files: readonly string[],
  keep: number,
  now: Date = new Date(),
  maxAgeDays: number = MAX_AGE_DAYS,
): string[] {
  const backups = files.filter(isBackupFile).sort(); // השם מתחיל בחותמת → מיון כרונולוגי
  const cutoff = now.getTime() - maxAgeDays * 86_400_000;

  const tooMany =
    Number.isFinite(keep) && keep > 0 ? backups.slice(0, Math.max(0, backups.length - keep)) : [];

  const tooOld = backups.filter((name) => {
    const at = backupTimestamp(name);
    return at !== null && at.getTime() < cutoff;
  });

  return [...new Set([...tooMany, ...tooOld])].sort();
}
