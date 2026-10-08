// מי המשתמש של הבקשה הנוכחית (אבן דרך 8, החלטה 21).
//
// זו נקודת האמת היחידה לבידוד הנתונים: כל שאילתה על נתונים אישיים מסננת
// לפי המזהה שחוזר מכאן. הפונקציה נכשלת סגור — בלי משתמש מזוהה אין נתונים,
// לא רשימה ריקה ולא "כל מה שיש".
//
// שתי נקודות עדינות:
// • ה-proxy חוסם בקשות בלי עוגייה תקפה, אבל אסימון חתום נשאר תקף עד פקיעתו.
//   לכן דווקא כאן — במקום שיש בו גישה למסד — נבדק גם ביטול המשתמש.
// • בפיתוח מקומי בלי APP_PASSWORD שכבת הכניסה כבויה (כמו עד היום), והבקשה
//   מיוחסת לבעלים. **בפרודקשן זה לא קורה לעולם** (ביקורת סבב 37, SEC2):
//   בלי APP_PASSWORD ה-proxy מחזיר 503, ואם בכל זאת מגיעים לכאן — נתיב
//   ציבורי שנוסף, ראוט שלא עובר ב-proxy — הפונקציה מחזירה null ולא את
//   הבעלים. בלי ההגנה הזו מחיקה של משתנה הסביבה הפכה את "/" ממסך נחיתה
//   למסך הבית הפרטי של הבעלים, לכל מבקר אנונימי.

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, authEnabled, readToken, type UserRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { healthScreened, legalAccepted } from "@/lib/onboarding";
import { ensureOwner } from "@/lib/users";

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  /** חותמת אישור המסמכים המשפטיים (החלטה 26ד); null = טרם אושרו */
  disclaimerAcceptedAt: Date | null;
  /** גרסת המסמכים שאושרה (סבב 35); אישור של גרסה ישנה אינו אישור */
  legalVersion: number | null;
  /** חותמת מילוי שאלון הבריאות (החלטה 35, D-6) */
  healthScreenedAt: Date | null;
  /** גרסת השאלון שמולאה */
  healthScreenVersion: number | null;
}

function toRole(raw: string): UserRole {
  return raw === "owner" ? "owner" : "tester";
}

/**
 * המשתמש של הבקשה. ממוזער פר-בקשה (React cache), כך שכמה שכבות שקוראות
 * לו באותה בקשה לא מייצרות שאילתה נוספת.
 */
export const currentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!authEnabled()) {
    // נכשל סגור: מסד אמיתי בלי סיסמה אינו "כולם הבעלים", הוא "אין משתמש"
    if (process.env.NODE_ENV === "production") return null;

    const owner = await ensureOwner();
    // ensureOwner לא מחזיר את חותמת ההצהרה — שאילתה קטנה משלימה אותה
    const extra = await prisma.user.findUnique({
      where: { id: owner.id },
      select: {
        disclaimerAcceptedAt: true,
        legalVersion: true,
        healthScreenedAt: true,
        healthScreenVersion: true,
      },
    });
    return {
      id: owner.id,
      name: owner.name,
      role: "owner",
      disclaimerAcceptedAt: extra?.disclaimerAcceptedAt ?? null,
      legalVersion: extra?.legalVersion ?? null,
      healthScreenedAt: extra?.healthScreenedAt ?? null,
      healthScreenVersion: extra?.healthScreenVersion ?? null,
    };
  }

  const store = await cookies();
  const claims = readToken(store.get(AUTH_COOKIE)?.value);
  if (!claims) return null;

  // אסימון v1 (לפני אבן דרך 8) לא נושא מזהה — הוא של הבעלים לפי הגדרה
  const row = claims.userId
    ? await prisma.user.findUnique({
        where: { id: claims.userId },
        select: {
          id: true,
          name: true,
          role: true,
          revokedAt: true,
          disclaimerAcceptedAt: true,
          legalVersion: true,
          healthScreenedAt: true,
          healthScreenVersion: true,
        },
      })
    : await prisma.user.findFirst({
        where: { role: "owner" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          role: true,
          revokedAt: true,
          disclaimerAcceptedAt: true,
          legalVersion: true,
          healthScreenedAt: true,
          healthScreenVersion: true,
        },
      });

  if (!row || row.revokedAt) return null;
  // התפקיד נקבע במסד, לא באסימון: שינוי תפקיד תופס מיד
  return {
    id: row.id,
    name: row.name,
    role: toRole(row.role),
    disclaimerAcceptedAt: row.disclaimerAcceptedAt,
    legalVersion: row.legalVersion,
    healthScreenedAt: row.healthScreenedAt,
    healthScreenVersion: row.healthScreenVersion,
  };
});

export async function currentUserId(): Promise<string | null> {
  return (await currentUser())?.id ?? null;
}

/**
 * המשתמש של הבקשה, או הפניה ל-/login. מיועד ל**רכיבי שרת**: זריקה בתוך
 * רינדור הופכת ל-500, ומסך שגיאה הוא התשובה הלא נכונה ל"פג התוקף".
 *
 * שתי הערות למי שקורא לזה:
 * • ‏`redirect()` פועל דרך זריקה פנימית של Next — אסור לעטוף את הקריאה
 *   ב-`catch` שבולע, אחרת ההפניה נבלעת והמסך ייטען חצי-ריק.
 * • בראוט API משתמשים ב-`userGate()`/`ownerGate()` ולא בזה: לקוח fetch
 *   רוצה 401, לא הפניה לעמוד HTML.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireUserId(): Promise<string> {
  return (await requireUser()).id;
}

/**
 * שער הבעלים ל**רכיבי שרת** של `/admin`. ה-proxy כבר חוסם את האזור, וזו
 * שכבה שנייה במקום שיש בו גישה למסד: משתמש שבוטל או שתפקידו הורד לא ייכנס
 * גם אם האסימון החתום שלו עוד בתוקף. מי שאינו בעלים מוחזר לאפליקציה, לא
 * ל-/login — הוא מחובר, פשוט לא לכאן.
 */
export async function requireOwner(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "owner") redirect("/");
  return user;
}

/* ---------- שערים לראוטים ---------- */

export function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: "נדרשת כניסה" }, { status: 401 });
}

export function forbidden(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "האזור הזה פתוח לבעלים בלבד" },
    { status: 403 },
  );
}

/**
 * 403 מובחן (קוד `disclaimer-required`) לראוט כתיבה אישי כשההצהרה המשפטית
 * טרם אושרה (החלטה 26ד, minor 12 בסבב 30). הקוד המובחן — לא רק status —
 * מאפשר ללקוח להבדיל בין "לא מחובר" ל"מחובר אבל צריך לאשר קודם", ומדריך
 * אותו ל-/terms במקום להציג שגיאה גנרית.
 */
export function disclaimerRequired(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: "נדרש אישור ההצהרה המשפטית",
      code: "disclaimer-required",
    },
    { status: 403 },
  );
}

/**
 * אחותה של `disclaimerRequired` לשלב השני בשרשרת (החלטה 35, D-6/D-7):
 * מחובר, אישר את המסמכים, אבל טרם מילא את שאלון הבריאות. שוב קוד מובחן
 * ולא רק 403 — הלקוח מפנה ל-/health במקום להציג שגיאה סתומה.
 */
export function healthRequired(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: "לפני האימון הראשון יש למלא את שאלון הבריאות",
      code: "health-required",
    },
    { status: 403 },
  );
}

/**
 * שער סטנדרטי לראוט אישי: או מזהה משתמש, או תשובת 401 מוכנה להחזרה.
 * הצורה הזו מכריחה את הראוט להתייחס למקרה הלא-מזוהה — בלי ברירת מחדל שקטה.
 */
export async function userGate(): Promise<
  { userId: string; user: CurrentUser } | { response: NextResponse }
> {
  const user = await currentUser();
  if (!user) return { response: unauthorized() };
  return { userId: user.id, user };
}

/**
 * שער לראוטי **כתיבה** אישיים (יצירת/עדכון אימונים, סטים, כיול, מדדים):
 * כמו `userGate`, ובנוסף שני שלבי הכניסה הראשונה — אישור המסמכים המשפטיים
 * (minor 12, סבב 30) ומילוי שאלון הבריאות (החלטה 35). האכיפה בשערי המסכים
 * לבדה לא מספיקה: קריאת fetch ישירה עוקפת אותם לגמרי.
 *
 * ‏`requireHealth: false` נועד לראוט אחד — /api/health עצמו, שאחרת היה
 * חוסם את המסלול שנועד לפתוח אותו. /api/terms נשאר על `userGate` מאותה
 * סיבה. ראוטי קריאה ו-/api/auth/* לא עוברים כאן.
 *
 * הבעלים אינו פטור באופן מיוחד: השער בודק את המצב בפועל, בלי case לפי role.
 */
export async function writeGate({
  requireHealth = true,
}: { requireHealth?: boolean } = {}): Promise<
  { userId: string; user: CurrentUser } | { response: NextResponse }
> {
  const user = await currentUser();
  if (!user) return { response: unauthorized() };
  if (!legalAccepted(user)) return { response: disclaimerRequired() };
  if (requireHealth && !healthScreened(user)) return { response: healthRequired() };
  return { userId: user.id, user };
}

/** שער ל-/admin ולראוטי הניהול: בעלים בלבד (החלטה 21) */
export async function ownerGate(): Promise<
  { userId: string; user: CurrentUser } | { response: NextResponse }
> {
  const user = await currentUser();
  if (!user) return { response: unauthorized() };
  if (user.role !== "owner") return { response: forbidden() };
  return { userId: user.id, user };
}
