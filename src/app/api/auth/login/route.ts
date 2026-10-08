import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE,
  SESSION_TTL_SEC,
  authEnabled,
  cookieSecure,
  issueToken,
  passwordMatches,
  type UserRole,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redeemInvite } from "@/lib/invites";
import { recordEvent } from "@/lib/pilot-events";
import { clientIp, globalLimit, rateLimit, type RateLimitResult } from "@/lib/rate-limit";
import { ensureOwner } from "@/lib/users";
import { attemptKey, blockedSeconds, clearAttempts, countFailure } from "./attempts";

// שני מסלולי כניסה, אותה עוגייה (החלטות 20 ו-21):
//   { password } → הבעלים.
//   { code }     → נסיין, בקוד ההזמנה האישי שהבעלים מסר לו. הפדיון הראשון
//                  יוצר את המשתמש; כל כניסה אחריו מחזירה אותו לנתונים שלו.
// הצלחה = עוגייה חתומה לחודש, נושאת מזהה משתמש ותפקיד.
//
// שלוש שכבות הגבלה (ביקורת סבב 37, SEC1) — עד הסבב הזה הייתה רק הראשונה,
// והיא נשענה על **הערך השמאלי** של x-forwarded-for, כלומר על מה שהלקוח
// מצהיר על עצמו. החלפת הערך בכל בקשה פתחה דלי חדש, ולכן החסימה לא נתפסה
// מעולם ולא היה שום חסם על קצב ניחוש הסיסמה וקודי ההזמנה:
//   1. חסימה מדורגת לכל כתובת אחרי כישלונות (./attempts.ts), עכשיו לפי
//      `clientIp` — הקצה הימני, זה שהפרוקסי שלנו כתב.
//   2. דלי פרץ לכל כתובת על **כל** בקשה, גם מוצלחת — חוסם גם את ניחושי
//      קוד ההזמנה, שפוגעים במסד.
//   3. תקרה גלובלית שאינה תלויה בכותרת כלל, ולכן זיוף לא עוקף אותה. היא
//      נספרת רק על ניסיון שעולה לנו — כישלון, או ניחוש קוד הזמנה שמגיע
//      למסד. בקשה עם הסיסמה הנכונה **אינה** נספרת בה אף פעם, כדי שמבול
//      חיצוני לא ינעל את הבעלים מחוץ לאפליקציה שלו.

/** בקשות כניסה לדקה מאותה כתובת — נספרות כולן, לא רק הכושלות */
const BURST = { max: 20, windowMs: 60_000 };

/** תקרת הניסיונות היקרים בשעה, בכל המערכת יחד */
const FAIL_CEILING = { max: 300, windowMs: 3_600_000 };
const FAIL_BUCKET = "login-fail-global";

function tooMany(seconds: number, message: string): NextResponse {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 429, headers: { "retry-after": String(seconds) } },
  );
}

export async function POST(request: NextRequest) {
  if (!authEnabled()) {
    return NextResponse.json(
      { ok: false, error: "שכבת הכניסה לא מוגדרת בשרת." },
      { status: 503 },
    );
  }

  const now = Date.now();
  const ip = clientIp(request);
  const key = attemptKey(ip);

  const burst = rateLimit("login", ip, BURST, now);
  if (!burst.ok) {
    return tooMany(
      burst.retryAfterSec,
      `יותר מדי ניסיונות. נסה שוב בעוד ${burst.retryAfterSec} שניות.`,
    );
  }

  const blocked = blockedSeconds(key, now);
  if (blocked > 0) {
    return tooMany(blocked, `יותר מדי ניסיונות. נסה שוב בעוד ${blocked} שניות.`);
  }

  let password = "";
  let code: unknown = null;
  try {
    const body = (await request.json()) as { password?: unknown; code?: unknown };
    password = typeof body.password === "string" ? body.password : "";
    code = body.code ?? null;
  } catch {
    password = "";
  }

  // התקרה הגלובלית נגבית פעם אחת לבקשה לכל היותר: גם כשקוד הזמנה נבדק מול
  // המסד וגם כשהוא נדחה, זה ניסיון אחד ולא שניים.
  let ceilingCharged = false;
  const chargeCeiling = (): RateLimitResult => {
    if (ceilingCharged) return { ok: true };
    ceilingCharged = true;
    return globalLimit(FAIL_BUCKET, FAIL_CEILING, now);
  };
  const ceilingReached = (seconds: number): NextResponse =>
    tooMany(seconds, "יותר מדי ניסיונות כניסה כרגע. נסה שוב בעוד כמה דקות.");

  /** ניסיון כושל מקרב לחסימה, ונספר גם בתקרה הגלובלית */
  const failure = (error: string, status: number): NextResponse => {
    countFailure(key, now);
    const ceiling = chargeCeiling();
    if (!ceiling.ok) return ceilingReached(ceiling.retryAfterSec);
    return NextResponse.json({ ok: false, error }, { status });
  };

  let identity: { id: string; name: string; role: UserRole } | null = null;
  let created = false;

  if (code !== null && code !== undefined && code !== "") {
    // הניחוש הזה מגיע למסד — נספר בתקרה לפני הפדיון, לא רק אחרי כישלון
    const ceiling = chargeCeiling();
    if (!ceiling.ok) return ceilingReached(ceiling.retryAfterSec);

    let result;
    try {
      result = await redeemInvite(code);
    } catch (e) {
      console.error("פדיון קוד הזמנה נכשל:", e);
      return NextResponse.json(
        { ok: false, error: "הכניסה נכשלה — בדוק את לוג השרת" },
        { status: 500 },
      );
    }
    if (!result.ok) {
      return failure(result.error, result.status);
    }
    identity = { id: result.user.id, name: result.user.name, role: "tester" };
    created = result.created;
  } else {
    if (!passwordMatches(password)) {
      return failure("הסיסמה לא נכונה.", 401);
    }
    const owner = await ensureOwner();
    identity = { id: owner.id, name: owner.name, role: "owner" };
  }

  clearAttempts(key);
  // "נראה לאחרונה" נכתב בכניסה בלבד — לא בכל בקשה
  await prisma.user
    .update({ where: { id: identity.id }, data: { lastSeenAt: new Date() } })
    .catch((e) => console.error("עדכון זמן הכניסה נכשל:", e));

  // מדידה בלבד (D-8/D-16) — לא משנה את התשובה ולא מעכבת אותה
  void recordEvent("login", {
    userId: identity.id,
    userRole: identity.role,
    props: { source: identity.role === "owner" ? "password" : "invite" },
  });

  const response = NextResponse.json({
    ok: true,
    user: { name: identity.name, role: identity.role },
    created,
  });
  response.cookies.set({
    name: AUTH_COOKIE,
    value: issueToken({ userId: identity.id, role: identity.role }, now),
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(request),
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
  return response;
}
