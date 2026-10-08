// הגדרות מערכת שהבעלים משנה בזמן ריצה (החלטה 35, D-10).
//
// כרגע יש נושא אחד: האם ההרשמה לפיילוט פתוחה, ואם כן — עד כמה משתתפים.
// הן יושבות בשורת AppSetting אחת עם המפתח "registration" ולא במשתנה סביבה,
// כי סגירת הרשמה צריכה לקרות בלחיצה מהטלפון, בלי פריסה מחדש.
//
// המטמון קצר (10 שניות) ומכוון: זרימת ההרשמה קוראת את ההגדרות בכל קולבק של
// גוגל, וסגירה שנכנסת לתוקף אחרי עשר שניות היא בדיוק הדיוק שנדרש כאן.

import { prisma } from "@/lib/db";

export interface RegistrationSettings {
  /** האם נרשמים חדשים מתקבלים */
  open: boolean;
  /** תקרת משתתפים פעילים; null = בלי תקרה */
  cap: number | null;
}

export type RegistrationVerdict =
  | { ok: true }
  | { ok: false; reason: "closed" | "full" };

/** המפתח היחיד בטבלה כרגע */
const REGISTRATION_KEY = "registration";

/** ברירת המחדל כשאין שורה במסד — פיילוט פתוח בלי תקרה */
const DEFAULTS: RegistrationSettings = { open: true, cap: null };

const CACHE_TTL_MS = 10_000;

let cached: { at: number; value: RegistrationSettings } | null = null;

/** קורא את הצורה מ-JSON חופשי; כל שדה שבור נופל לברירת המחדל שלו */
function parse(value: unknown): RegistrationSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULTS;
  const raw = value as { open?: unknown; cap?: unknown };
  const cap =
    typeof raw.cap === "number" && Number.isFinite(raw.cap) && raw.cap > 0
      ? Math.floor(raw.cap)
      : null;
  return { open: raw.open !== false, cap };
}

export async function getRegistrationSettings(): Promise<RegistrationSettings> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.value;

  try {
    const row = await prisma.appSetting.findUnique({
      where: { key: REGISTRATION_KEY },
      select: { value: true },
    });
    const value = row ? parse(row.value) : DEFAULTS;
    cached = { at: now, value };
    return value;
  } catch (e) {
    // תקלת מסד לא סוגרת הרשמה בשקט ולא פותחת אותה בשקט: מחזירים את מה
    // שידוע (אם ידוע), ורק אחרת את ברירת המחדל — בלי למטמן את הכישלון.
    console.error("קריאת הגדרות ההרשמה נכשלה:", e);
    return cached?.value ?? DEFAULTS;
  }
}

export async function setRegistrationSettings(
  next: RegistrationSettings,
): Promise<RegistrationSettings> {
  const value = parse(next);
  // ‏Prisma דורש אובייקט JSON "רגיל" (עם index signature) לעמודת Json
  const stored = { open: value.open, cap: value.cap };
  await prisma.appSetting.upsert({
    where: { key: REGISTRATION_KEY },
    create: { key: REGISTRATION_KEY, value: stored },
    update: { value: stored },
  });
  cached = { at: Date.now(), value };
  return value;
}

/**
 * האם אפשר לצרף משתמש חדש עכשיו. הספירה היא של מתאמנים פעילים בלבד:
 * ‏role "tester" שלא בוטל. הבעלים לא נספר, וגם לא משתמשי הסימולציה
 * (role "sim") — הם לא תופסים מקום בפיילוט.
 */
export async function registrationAllowed(): Promise<RegistrationVerdict> {
  const settings = await getRegistrationSettings();
  if (!settings.open) return { ok: false, reason: "closed" };
  if (settings.cap === null) return { ok: true };

  const active = await prisma.user.count({
    where: { role: "tester", revokedAt: null },
  });
  return active >= settings.cap ? { ok: false, reason: "full" } : { ok: true };
}

/** איפוס המטמון — לבדיקות בלבד (המצב הוא ברמת המודול) */
export function resetSettingsCache(): void {
  cached = null;
}
