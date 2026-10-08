// משתמשים (אבן דרך 8, החלטה 21; הרשמה עצמית בסבב 35). כאן נוצרים המשתמשים
// ונבנה להם המינימום שצריך כדי להתחיל: שלושה פרופילי מיקום (החלטה 24). אין
// כיול — מתאמן חדש עובר את שער הכיול של M5 בדיוק כמו הבעלים ביומו הראשון,
// ומקבל אימון ראשון שמרני.
//
// שלושה מסלולי יצירה, שלוש ערכי signupSource: "google" (הרשמה עצמית,
// createGoogleUser), "invite" (קוד הזמנה, src/lib/invites.ts) ו-"owner".

import {
  GYM_EQUIPMENT,
  DEFAULT_HOME_EQUIPMENT,
  PARK_EQUIPMENT,
} from "@/lib/equipment";
import { prisma } from "@/lib/db";
import { recordEvent } from "@/lib/pilot-events";

/** מזהה קבוע לבעלים — נקבע במיגרציה, ולכן ידוע גם לקוד וגם לגיבוי */
export const OWNER_ID = "usr_owner";
export const OWNER_NAME = "הבעלים";

/** לקוח Prisma או טרנזקציה — כדי שהיצירה תרוץ גם בתוך $transaction */
type Db = Pick<typeof prisma, "user" | "locationProfile">;

/**
 * פרופילי המיקום של משתמש. חדר הכושר וגן הכושר סטנדרטיים (מתעדכנים עם
 * הקטלוג בזריעה), הבית מתחיל עם כל הציוד מסומן וניתן לעריכה בזרימת
 * הפתיחה (החלטות 3 ו-24). אידמפוטנטי — משלים רק את מה שחסר, ולכן משמש
 * גם ליצירה-לפי-דרישה של פרופיל חדש (park) אצל משתמשי פרודקשן קיימים.
 */
export async function ensureLocationProfiles(db: Db, userId: string): Promise<void> {
  const wanted = [
    { kind: "gym", name: "חדר כושר", equipment: GYM_EQUIPMENT },
    { kind: "home", name: "בית", equipment: DEFAULT_HOME_EQUIPMENT },
    { kind: "park", name: "גן כושר", equipment: PARK_EQUIPMENT },
  ] as const;
  for (const profile of wanted) {
    const existing = await db.locationProfile.findFirst({
      where: { userId, kind: profile.kind },
      select: { id: true },
    });
    if (existing) continue;
    await db.locationProfile.create({
      data: {
        userId,
        kind: profile.kind,
        name: profile.name,
        equipment: [...profile.equipment],
        quantities: {},
        peakHours: false,
        constraints: [],
        usuallyTaken: [],
      },
    });
  }
}

/** יצירת משתמש חדש עם כל מה שדרוש כדי להיכנס ולהתאמן */
export async function createUser(
  db: Db,
  input: {
    name: string;
    role: "owner" | "tester";
    id?: string;
    /** google | invite | owner (סבב 35) — מאיזה מסלול הגיע */
    signupSource?: string;
  },
): Promise<{ id: string; name: string; role: string }> {
  const user = await db.user.create({
    data: {
      ...(input.id ? { id: input.id } : {}),
      name: input.name,
      role: input.role,
      ...(input.signupSource ? { signupSource: input.signupSource } : {}),
    },
    select: { id: true, name: true, role: true },
  });
  await ensureLocationProfiles(db, user.id);
  return user;
}

/** שם ברירת המחדל למי שנרשם בלי שם תצוגה שאפשר להשתמש בו */
export const DEFAULT_DISPLAY_NAME = "מתאמן";

/**
 * שם התצוגה של נרשם חדש. טהורה ובדוקה: רווחים מיותרים נבלעים, האורך נחתך
 * ל-60 תווים (כמו תווית ההזמנה), וכל דבר ריק נופל לשם ברירת המחדל — כדי
 * שלא ייווצר משתמש עם שם ריק שנראה שבור בכל מסך.
 */
export function displayNameFrom(raw: string | null | undefined): string {
  if (typeof raw !== "string") return DEFAULT_DISPLAY_NAME;
  const clean = raw.replace(/\s+/g, " ").trim().slice(0, 60).trim();
  return clean.length > 0 ? clean : DEFAULT_DISPLAY_NAME;
}

/**
 * יצירת חשבון מזהות גוגל (סבב 35, D-3) — נקודת ההרשמה העצמית היחידה.
 * ‏`role` הוא תמיד "tester": הבעלים נוצר במיגרציה, ואי אפשר להירשם לתפקיד
 * הזה מבחוץ. אישור המסמכים ושאלון הבריאות עדיין לפניו (שרשרת ה-onboarding).
 */
export async function createGoogleUser(input: {
  sub: string;
  email: string | null;
  name: string | null;
}): Promise<{ id: string; name: string; role: "tester" }> {
  const user = await prisma.user.create({
    data: {
      name: displayNameFrom(input.name),
      role: "tester",
      googleSub: input.sub,
      ...(input.email ? { email: input.email } : {}),
      signupSource: "google",
      lastSeenAt: new Date(),
    },
    select: { id: true, name: true },
  });
  await ensureLocationProfiles(prisma, user.id);
  return { id: user.id, name: user.name, role: "tester" };
}

/**
 * מחיקת חשבון מלאה — מסלול אחד לשתי הדלתות (ביקורת סבב 35, SEC-2/LEGAL-1).
 *
 * מדיניות הפרטיות מבטיחה מחיקה זהה בשני ערוצים: המשתמש מוחק את עצמו
 * (DELETE /api/me), או פונה למפעיל והמפעיל מוחק (‏/admin/users/[id]).
 * עד התיקון הזה מסלול המפעיל הריץ רק `user.delete`, ולכן השאיר מאחוריו
 * את שני הדברים שאינם cascade: משוב (FK מסוג SetNull) ואירועי מדידה
 * (בלי FK בכלל). כאן שני המסלולים מריצים בדיוק את אותו רצף:
 *
 * 1. ‏`account_deleted` נרשם **לפני** האנונימיזציה ובהמתנה, אחרת השורה
 *    הזו עצמה הייתה נושאת מזהה של משתמש שכבר לא קיים.
 * 2. ‏`PilotEvent` מאונם (userId→null) ונשאר — מדדי הפיילוט ההיסטוריים
 *    לא משתנים למפרע (D-8), והמדיניות מבטיחה בדיוק את זה.
 * 3. ‏`Feedback` **נמחק** ולא מנותק: טקסט חופשי שהמשתמש כתב (ובפניות גם
 *    שם ומייל שהקליד) הוא מידע אישי, ומחיקה שמשאירה אותו אינה מחיקה.
 * 4. ‏`user.delete` — ומשם ה-cascade מוריד אימונים, סטים, כיולים, מדדים,
 *    פרופילים, אישורים משפטיים וההזמנה.
 */
export async function purgeUser(
  userId: string,
  role: string,
  props?: Record<string, unknown>,
): Promise<void> {
  await recordEvent("account_deleted", {
    userId,
    userRole: role,
    ...(props ? { props } : {}),
  });
  await prisma.pilotEvent.updateMany({ where: { userId }, data: { userId: null } });
  await prisma.feedback.deleteMany({ where: { userId } });
  // החלטה 47: אורח מנוהל נשאר בזירה, בלי מנהל — הבקר מזין עבורו. חברויות
  // באתגרים, השתתפויות ותוצאות נמחקות ב-cascade; createdById ו-hostId
  // מתאפסים (SetNull), והבקר של הזירה עובר הלאה בקריאה הבאה.
  const mine = await prisma.matchParticipant.findMany({ where: { userId }, select: { id: true } });
  if (mine.length > 0) {
    await prisma.matchParticipant.updateMany({ where: { managedById: { in: mine.map((p) => p.id) } }, data: { managedById: null } });
  }
  await prisma.user.delete({ where: { id: userId } });
}

/**
 * רשומת הבעלים. נוצרת במיגרציה, ולכן בפועל תמיד קיימת; היצירה כאן היא
 * רשת ביטחון למסד שנבנה בדרך אחרת (בדיקות, סביבת scratch).
 */
export async function ensureOwner(): Promise<{ id: string; name: string; role: string }> {
  const existing = await prisma.user.findFirst({
    where: { role: "owner" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, role: true },
  });
  if (existing) {
    await ensureLocationProfiles(prisma, existing.id);
    return existing;
  }
  return createUser(prisma, { id: OWNER_ID, name: OWNER_NAME, role: "owner" });
}
