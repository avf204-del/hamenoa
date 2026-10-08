// כניסה עם גוגל — שלב 2: callback (פריט 1; הרשמה עצמית בסבב 35, D-3).
// מאמת את ה-state, מחליף code בטוקן מול גוגל, ואז אחת מארבע:
//   • יש כבר משתמש עם ה-sub הזה → כניסה (עוגיית v2 הקיימת, כמו סיסמה/קוד).
//   • אין, אבל יש session פעיל → קישור גוגל לחשבון המחובר.
//   • אין כלום וההרשמה פתוחה → חשבון חדש, ומשם לשרשרת הפתיחה (/?welcome=1).
//   • אין כלום וההרשמה סגורה/מלאה → חוזרים ל-/login עם הסבר.
// ההחלטה עצמה (decideGoogleLogin) טהורה ובדוקה ב-tests/google-auth.test.ts;
// הראוט הזה רק אוסף את הקלט שלה ומבצע את הצד של המסד/העוגייה.
//
// שתי הגבלות קצב (D-9), שתיהן לפי כתובת: הקולבק כולו 60/דקה — הוא נתיב
// ציבורי שמבצע קריאת רשת יוצאת — ויצירת משתמשים 10/שעה, שנספרת רק כשבאמת
// עומדים ליצור חשבון, כדי שכניסה רגילה לא תבזבז את המכסה.
import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE,
  SESSION_TTL_SEC,
  cookieSecure,
  issueToken,
  readToken,
} from "@/lib/auth";
import {
  OAUTH_NONCE_COOKIE,
  OAUTH_NONCE_COOKIE_PATH,
  decideGoogleLogin,
  exchangeCode,
  googleAuthEnabled,
  nonceMatches,
  oauthOrigin,
  verifyState,
  type RegistrationVerdict,
} from "@/lib/google-auth";
import { prisma } from "@/lib/db";
import { recordEvent } from "@/lib/pilot-events";
import { clientIp, globalLimit, rateLimit } from "@/lib/rate-limit";
import { registrationAllowed } from "@/lib/settings";
import { createGoogleUser } from "@/lib/users";
import { internalRedirectUrl } from "@/lib/safe-next";
import type { GoogleErrorCode } from "@/app/login/google-errors";

/** מוחקת את עוגיית הבינדינג — חד-פעמיות: היא נצרכת (ומתה) בקריאה אחת לקולבק */
function clearNonceCookie(response: NextResponse, request: NextRequest) {
  response.cookies.set({
    name: OAUTH_NONCE_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(request),
    path: OAUTH_NONCE_COOKIE_PATH,
    maxAge: 0,
  });
}

/**
 * חזרה למסך הכניסה עם **קוד** שגיאה, לא עם נוסח (ביקורת סבב 37). הנוסח
 * יושב ב-src/app/login/google-errors.ts, ומסך הכניסה מציג רק קוד שברשימה —
 * אחרת אפשר היה לבנות כתובת שמציגה טקסט של תוקף בתוך קופסת שגיאה אמיתית.
 */
function loginRedirect(request: NextRequest, code: GoogleErrorCode): NextResponse {
  // הבסיס הוא ה-origin הציבורי (oauthOrigin) ולא כתובת הבקשה הגולמית: מאחורי
  // ה-proxy של Railway האחרונה היא localhost:8080, וההפניה נחתה אצל המשתמש
  // על כתובת שלא קיימת (ERR_CONNECTION_REFUSED, 16.9.2026). אותו כלל בכל
  // הפניה בקובץ הזה — יש נעילת מקור ב-tests/google-auth.test.ts.
  const url = new URL("/login", oauthOrigin(request));
  url.searchParams.set("googleError", code);
  const response = NextResponse.redirect(url);
  clearNonceCookie(response, request);
  return response;
}

function issueCookie(response: NextResponse, request: NextRequest, userId: string, role: "owner" | "tester") {
  response.cookies.set({
    name: AUTH_COOKIE,
    value: issueToken({ userId, role }, Date.now()),
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(request),
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export async function GET(request: NextRequest) {
  if (!googleAuthEnabled()) {
    return NextResponse.json({ ok: false, error: "כניסת גוגל לא מוגדרת." }, { status: 404 });
  }

  const ip = clientIp(request);
  const burst = rateLimit("google-callback", ip, { max: 60, windowMs: 60_000 });
  if (!burst.ok) {
    return new NextResponse("יותר מדי בקשות. נסה שוב בעוד רגע.", {
      status: 429,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "retry-after": String(burst.retryAfterSec),
      },
    });
  }

  const params = request.nextUrl.searchParams;
  if (params.get("error")) {
    return loginRedirect(request, "cancelled");
  }

  const state = verifyState(params.get("state"));
  if (!state) {
    return loginRedirect(request, "state");
  }

  // קשירת הדפדפן + חד-פעמיות (minor 11): ה-nonce שבתוך ה-state חייב להתאים
  // לעוגייה שהוטבעה ביזום הזרימה באותו דפדפן. עוגייה חסרה/לא תואמת (state
  // הועתק לדפדפן אחר, או שכבר נצרך פעם) נדחית באותה הודעה כמו state לא תקין.
  const cookieNonce = request.cookies.get(OAUTH_NONCE_COOKIE)?.value ?? null;
  if (!nonceMatches(cookieNonce, state.nonce)) {
    return loginRedirect(request, "state");
  }

  const code = params.get("code");
  if (!code) {
    return loginRedirect(request, "nocode");
  }

  const exchanged = await exchangeCode(code, state.redirectUri);
  if (!exchanged.ok) {
    console.error("כניסת גוגל נכשלה:", exchanged.error);
    return loginRedirect(request, "exchange");
  }
  const { sub, email, name } = exchanged.identity;

  const existingUser = await prisma.user.findUnique({
    where: { googleSub: sub },
    select: { id: true, role: true, revokedAt: true },
  });

  // אסימון v1 (לפני אבן דרך 8) לא נושא מזהה — הוא תמיד הבעלים, כמו ב-current-user.ts
  const claims = readToken(request.cookies.get(AUTH_COOKIE)?.value);
  let sessionUserId: string | null = claims?.userId ?? null;
  if (sessionUserId) {
    // עוגייה תקפה שמצביעה על משתמש שכבר לא במסד (שחזור/מחיקה) — לא "קישור"
    // לרשומה שאין, שהיה נופל ב-P2025 ומדווח link-taken מטעה; מתייחסים
    // כאילו אין session, כמו current-user.ts.
    const sessionUser = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: { id: true },
    });
    if (!sessionUser) sessionUserId = null;
  }
  if (claims && !sessionUserId) {
    const owner = await prisma.user.findFirst({
      where: { role: "owner" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    sessionUserId = owner?.id ?? null;
  }

  // מצב ההרשמה נקרא רק כשהוא באמת רלוונטי (אין חשבון ואין session) — כניסה
  // רגילה של מתאמן קיים לא נוגעת במסד ההגדרות ולא נחסמת כשהפיילוט מלא.
  const registration: RegistrationVerdict =
    !existingUser && !sessionUserId ? await registrationAllowed() : { ok: true };

  const decision = decideGoogleLogin({ existingUser, sessionUserId, registration });

  if (decision.action === "blocked") {
    return loginRedirect(request, "revoked");
  }

  if (decision.action === "registrationClosed") {
    return loginRedirect(request, decision.reason === "closed" ? "closed" : "full");
  }

  if (decision.action === "signup") {
    const quota = rateLimit("signup", ip, { max: 10, windowMs: 3_600_000 });
    if (!quota.ok) {
      return loginRedirect(request, "signup-rate");
    }

    // תקרה גלובלית מעל תקרת הכתובת: `x-forwarded-for` נכתב בידי פרוקסי
    // ואי אפשר לסמוך עליו לבדו (ביקורת סבב 35, SEC-3). 100 חשבונות חדשים
    // בשעה הם הרבה מעל קצב פיילוט אמיתי, ומתחת לכל הצפה.
    const ceiling = globalLimit("signup-global", { max: 100, windowMs: 3_600_000 });
    if (!ceiling.ok) {
      return loginRedirect(request, "signup-busy");
    }

    let created: { id: string; name: string; role: "tester" };
    try {
      created = await createGoogleUser({ sub, email, name });
    } catch (e) {
      console.error("יצירת חשבון מגוגל נכשלה:", e);
      return loginRedirect(request, "signup-failed");
    }

    const visitId = state.visit ?? undefined;
    void recordEvent("signup", {
      userId: created.id,
      userRole: "tester",
      visitId,
      props: { source: "google" },
    });
    void recordEvent("login", {
      userId: created.id,
      userRole: "tester",
      visitId,
      props: { source: "google" },
    });

    // תמיד הביתה עם ?welcome=1 ולא ל-state.next: השער ישלח אותו ל-/terms
    // ואז ל-/health, וקישור עמוק שאין בו עדיין נתונים רק היה מבלבל.
    const signupResponse = NextResponse.redirect(new URL("/?welcome=1", oauthOrigin(request)));
    issueCookie(signupResponse, request, created.id, "tester");
    clearNonceCookie(signupResponse, request);
    return signupResponse;
  }

  if (decision.action === "link") {
    try {
      await prisma.user.update({
        where: { id: decision.userId },
        data: { googleSub: sub, ...(email ? { email } : {}) },
      });
    } catch (e) {
      const code = (e as { code?: string } | null)?.code ?? "?";
      console.error(`קישור גוגל לחשבון נכשל (prisma ${code}, user ${decision.userId}):`, e);
      return loginRedirect(request, "link-taken");
    }
    const linkResponse = NextResponse.redirect(internalRedirectUrl(state.next, oauthOrigin(request)));
    clearNonceCookie(linkResponse, request);
    return linkResponse;
  }

  // decision.action === "login"
  await prisma.user
    .update({
      where: { id: decision.userId },
      data: { lastSeenAt: new Date(), ...(email ? { email } : {}) },
    })
    .catch((e) => console.error("עדכון כניסת גוגל נכשל:", e));

  void recordEvent("login", {
    userId: decision.userId,
    userRole: decision.role,
    visitId: state.visit ?? undefined,
    props: { source: "google" },
  });

  const response = NextResponse.redirect(internalRedirectUrl(state.next, oauthOrigin(request)));
  issueCookie(response, request, decision.userId, decision.role);
  clearNonceCookie(response, request);
  return response;
}
