// אנליטיקה עצמית (החלטה 35, D-8): שורת אירוע אחת לכל צעד משמעותי בפיילוט.
//
// שלושה כללים שהמודול הזה אוכף, ולא רק ממליץ עליהם:
// • **לעולם לא זורק.** רישום אירוע הוא תצפית, לא חלק מהעסקה. קוראים לו
//   כ-`void recordEvent(...)` בלי await, וכישלון מסד נגמר ב-console.error.
// • **בלי כתובות IP ובלי פרטים מזהים.** ‏`visitId` הוא מזהה אקראי שנוצר
//   בדפדפן (src/lib/pilot-client.ts) ומת עם הלשונית.
// • **שורד מחיקת חשבון.** אין מפתח זר ל-User; במחיקה מנוקה ה-userId
//   ל-null והשורה נשארת, כדי שהמדדים ההיסטוריים לא ישתנו למפרע.

import { prisma } from "@/lib/db";
import { CLIENT_EVENTS as CLIENT_EVENT_NAMES } from "@/lib/pilot-client";

/** כל האירועים שהמערכת יודעת לרשום — הרשימה היא החוזה מול לוח הפיילוט */
export const PILOT_EVENTS = [
  "landing_view",
  "landing_cta",
  "signup",
  "login",
  "legal_accepted",
  "health_screened",
  "calibration_saved",
  "session_generated",
  "session_started",
  "session_completed",
  "session_abandoned",
  "feedback_sent",
  "contact_sent",
  "account_deleted",
  // חוויית האימון (C1). מאפיינים: דגלים/מזהי בחירה בלבד, בלי טקסט חופשי.
  "xp_enabled",
  "xp_disabled",
  "xp_preferences_saved",
  "xp_preferences_reset",
  "xp_day_override",
  "xp_session_created",
  "xp_session_ended",
  "xp_feedback",
  "xp_suggestion",
  "xp_next_saved",
  "xp_format_understood",
  "xp_rank_earned",
  "xp_feat_earned",
  // אתגרים וזירה (החלטה 47). props בצורה בלבד — בלי קוד ובלי שמות.
  "challenge_created",
  "challenge_joined",
  "challenge_left",
  "match_created",
  "match_started",
  "match_done",
  "guest_joined",
  "guest_claimed",
] as const;

export type PilotEventName = (typeof PILOT_EVENTS)[number];

/**
 * תת-הקבוצה שהדפדפן רשאי לשלוח ב-/api/pilot/event (ראוט ציבורי).
 * ההגדרה עצמה יושבת ב-pilot-client.ts כדי שקומפוננטת לקוח לא תייבא מכאן
 * (ודרך כאן — את Prisma); ההצהרה כאן היא שער הטיפוסים: שם שאינו אירוע
 * מוכר ייכשל בקומפילציה.
 */
export const CLIENT_EVENTS: readonly PilotEventName[] = CLIENT_EVENT_NAMES;

export function isClientEvent(name: unknown): name is PilotEventName {
  return typeof name === "string" && CLIENT_EVENTS.includes(name as PilotEventName);
}

/** מזהה ביקור תקין: אותיות קטנות וספרות בלבד, 6–32 תווים */
export function isValidVisitId(raw: unknown): raw is string {
  return typeof raw === "string" && /^[a-z0-9]{6,32}$/.test(raw);
}

export interface RecordEventInput {
  userId?: string | null;
  userRole?: string | null;
  visitId?: string | null;
  path?: string | null;
  props?: Record<string, unknown> | null;
}

/**
 * ערכים שאפשר לשמור ב-JSONB בלי הפתעות. ‏`undefined` נשמט, וכל דבר מורכב
 * (אובייקט, מערך, פונקציה) יורד — מאפייני אירוע הם דגלים ומספרים, לא
 * מבנים. כך גם אין דרך להבריח בטעות מטען אישי לתוך הטבלה.
 */
function jsonSafeProps(
  props: Record<string, unknown> | null | undefined,
): Record<string, string | number | boolean | null> | null {
  if (!props) return null;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === null) out[key] = null;
    else if (typeof value === "string") out[key] = value.slice(0, 200);
    else if (typeof value === "number") out[key] = Number.isFinite(value) ? value : 0;
    else if (typeof value === "boolean") out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * התפקיד של משתמש, לצורך סימון האירוע. שאילתה קטנה ושקטה — כישלון בה
 * נגמר ב-null, כלומר אירוע בלי תפקיד, בדיוק כמו לפני.
 */
async function roleOf(userId: string): Promise<string | null> {
  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return row?.role ?? null;
  } catch {
    return null;
  }
}

/**
 * רושם אירוע. אין ערך מוחזר ואין זריקה — הקורא ממשיך בשלו.
 *
 * **התפקיד מושלם כאן כשלא נמסר** (ביקורת סבב 35, ממצא D1): לוח הפיילוט
 * מחריג את הבעלים ואת משתמשי הסימולציה לפי `userRole`, ושלוש נקודות
 * רישום בשרת (סגירה אוטומטית של אימון שננטש, אימון בדיקה, אימון מדד)
 * שלחו userId בלי תפקיד — כך שאימונים של הבעלים נספרו במדדי הפיילוט.
 * מי שמוסר `userRole` במפורש (גם null) נשאר כפי שהוא: אירוע נחיתה
 * אנונימי לא ילך לחפש משתמש.
 */
export async function recordEvent(
  name: PilotEventName,
  input: RecordEventInput = {},
): Promise<void> {
  try {
    const userId = input.userId ?? null;
    const userRole =
      input.userRole !== undefined
        ? input.userRole
        : userId
          ? await roleOf(userId)
          : null;
    await prisma.pilotEvent.create({
      data: {
        name,
        userId,
        userRole,
        visitId: input.visitId ?? null,
        path: input.path ? input.path.slice(0, 200) : null,
        props: jsonSafeProps(input.props) ?? undefined,
      },
    });
  } catch (e) {
    console.error(`רישום אירוע הפיילוט "${name}" נכשל:`, e);
  }
}
