// כניסה עם גוגל — שלב 1: הפניה לגוגל עם state חתום (פריט 1).
// בלי GOOGLE_CLIENT_ID/SECRET הנתיב לא קיים בפועל — 404, בלי הבדל בין
// "כבוי" ל"לא קיים" שיכול להדליף מידע.
import { NextResponse, type NextRequest } from "next/server";
import { cookieSecure } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import {
  OAUTH_NONCE_COOKIE,
  OAUTH_NONCE_COOKIE_PATH,
  OAUTH_NONCE_COOKIE_TTL_SEC,
  buildAuthUrl,
  googleAuthEnabled,
  oauthOrigin,
} from "@/lib/google-auth";

/**
 * מזהה הביקור מהדפדפן (`?v=`, נכתב על ידי withVisit ב-src/lib/pilot-client.ts).
 * הוא נכנס ל-state החתום כדי שאירוע ההרשמה יתחבר לביקור שהתחיל בדף הנחיתה;
 * צורה לא תקינה נשמטת בשקט — מדידה לא מכשילה כניסה.
 */
function safeVisit(raw: string | null): string | null {
  return raw && /^[a-z0-9]{6,32}$/.test(raw) ? raw : null;
}

export async function GET(request: NextRequest) {
  if (!googleAuthEnabled()) {
    return NextResponse.json({ ok: false, error: "כניסת גוגל לא מוגדרת." }, { status: 404 });
  }
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const visit = safeVisit(request.nextUrl.searchParams.get("v"));
  // ה-origin לא נגזר מהמארח הפנימי של הבקשה — בפרודקשן זה נתן localhost:8080 (ראה oauthOrigin)
  const result = buildAuthUrl(oauthOrigin(request), next, visit);
  if (!result) {
    return NextResponse.json({ ok: false, error: "כניסת גוגל לא מוגדרת." }, { status: 404 });
  }
  const response = NextResponse.redirect(result.url);
  // עוגיית בינדינג: קושרת את ה-state לדפדפן הזה ומספקת חד-פעמיות (minor 11)
  response.cookies.set({
    name: OAUTH_NONCE_COOKIE,
    value: result.nonce,
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(request),
    path: OAUTH_NONCE_COOKIE_PATH,
    maxAge: OAUTH_NONCE_COOKIE_TTL_SEC,
  });
  return response;
}
