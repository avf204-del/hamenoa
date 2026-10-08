// כניסה עם גוגל — הרחבה של שכבת הכניסה (פריט 1, אחרי אבן דרך 8/החלטה 21).
// בלי ספריות OAuth חדשות: קוד ידני שמדבר ישירות עם שרתי גוגל.
//
// **state** מגן מפני CSRF ומקבע את redirect_uri לאותו ערך שנשלח בבקשת
// ההרשאה המקורית (חובה שיהיה זהה בחילוף ה-code) — חתום ב-HMAC על הסוד
// הקיים של שכבת הכניסה (src/lib/auth.ts). אין תלות בסוד נוסף ואין מסד
// בזרימת ה-state עצמה; ה-state גם נושא את יעד החזרה (next).
//
// **קשירת הדפדפן + חד-פעמיות (minor 11, סבב 30, הוכרע 1.9.2026):** ה-state
// לבדו הוא bearer-token חתום — מי שמחזיק (code, state) תקף (למשל תוקף
// שיזם בעצמו את הזרימה) יכול להשלים אותו בדפדפן של קורבן. לכן ה-nonce
// שבתוך ה-state נשמר גם בעוגיית httpOnly קצרת-מועד ביזום הזרימה
// (src/app/api/auth/google/route.ts), והקולבק דורש התאמה מדויקת ביניהם
// (nonceMatches, בזמן קבוע) לפני חילוף ה-code — כך שה-state קשור לדפדפן
// שיזם אותו. הקולבק גם מוחק את העוגייה מיד עם הצריכה (הצלחה או כישלון),
// כך שאותה עוגייה לא משמשת פעמיים (replay).
//
// **אימות ה-id_token:** הטוקן מגיע ישירות מגוגל ב-TLS (חילוף code מול
// oauth2.googleapis.com/token), ולכן פענוח ה-payload בלי אימות חתימה
// נוסף בטוח — אנחנו לא מקבלים את הטוקן הזה מגורם שלישי. בכל זאת נבדקים
// aud ו-iss כדי לתפוס תצורה שגויה (למשל CLIENT_ID לא תואם) מוקדם וברור.
//
// **הדגל:** בלי GOOGLE_CLIENT_ID+SECRET (וגם בלי APP_PASSWORD — הם אותה
// שכבת כניסה) — googleAuthEnabled() מחזיר false, שום כפתור לא נראה,
// והנתיבים עצמם מחזירים 404.
import { randomBytes, timingSafeEqual } from "node:crypto";
import { authEnabled, payloadSignatureValid, signPayload } from "@/lib/auth";
import { SITE_URL } from "@/components/landing/site";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
/** חלון קצר בכוונה — מספיק להפניה בפועל אצל גוגל, לא יותר */
const STATE_TTL_SEC = 10 * 60;

/** עוגיית ה-nonce שקושרת את ה-state לדפדפן שיזם ומספקת חד-פעמיות (minor 11) */
export const OAUTH_NONCE_COOKIE = "hamenoa_oauth_nonce";
/** אותו חלון כמו ה-state עצמו — אין טעם שהעוגייה תחיה יותר ממנו */
export const OAUTH_NONCE_COOKIE_TTL_SEC = STATE_TTL_SEC;
/** נתיב מצומצם: העוגייה רלוונטית רק לשני נתיבי זרימת גוגל */
export const OAUTH_NONCE_COOKIE_PATH = "/api/auth/google";

function googleClientId(): string | null {
  const value = process.env.GOOGLE_CLIENT_ID;
  return value && value.length > 0 ? value : null;
}

function googleClientSecret(): string | null {
  const value = process.env.GOOGLE_CLIENT_SECRET;
  return value && value.length > 0 ? value : null;
}

/** האם כניסת גוגל דלוקה. תלויה גם בשכבת הכניסה עצמה (אותו סוד לחתימה). */
export function googleAuthEnabled(): boolean {
  return authEnabled() && googleClientId() !== null && googleClientSecret() !== null;
}

/** כתובת ה-redirect על בסיס origin — ראה oauthOrigin לאופן קביעת ה-origin */
export function googleRedirectUri(origin: string): string {
  return `${origin}/api/auth/google/callback`;
}

/** צורת הבקשה שהמודול צריך — בלי תלות ב-NextRequest (נוח לבדיקות) */
export interface OriginRequest {
  headers: { get: (name: string) => string | null };
  url: string;
}

/**
 * ה-origin של redirect_uri — בפרודקשן **לא** נגזר מהבקשה הנכנסת.
 *
 * תקלה שנצפתה אצל משתמש (16.9.2026): מאחורי ה-proxy של Railway,
 * `request.nextUrl.host` (Next 16) מחזיר את כתובת ההאזנה הפנימית של
 * השרת — `localhost:8080` — ולא את הדומיין הציבורי, וגוגל דחתה את הכניסה
 * ב-`redirect_uri_mismatch` על `https://localhost:8080/api/auth/google/callback`.
 * הכתובת הרשומה ב-Google Cloud Console היא של האתר הציבורי (SITE_URL —
 * ‏APP_URL עם נפילה לכתובת Railway, src/components/landing/site.ts), ולכן
 * בפרודקשן זה מקור האמת: דטרמיניסטי, ובלי תלות בכותרות forwarded שגם
 * ניתנות לזיוף מצד הלקוח (docs/round30-findings.json). כשעוברים לדומיין
 * משלנו מגדירים APP_URL בסביבה — ומעדכנים את אותה כתובת גם בקונסולה.
 *
 * בפיתוח (localhost / macbook-air.local מהטלפון) הכתובת נגזרת מהבקשה:
 * כותרת Host (או x-forwarded-host מאחורי proxy מקומי) והפרוטוקול לפי
 * x-forwarded-proto — כמו cookieSecure ב-src/lib/auth.ts.
 */
export function oauthOrigin(request: OriginRequest): string {
  if (process.env.NODE_ENV === "production") return SITE_URL;
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProto
    ? forwardedProto.split(",")[0].trim()
    : url.protocol.replace(":", "");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host =
    (forwardedHost ? forwardedHost.split(",")[0].trim() : "") ||
    request.headers.get("host") ||
    url.host;
  return `${protocol}://${host}`;
}

/** מזהה ביקור תקין (אותו כלל כמו src/lib/pilot-client.ts) — נשמר כאן במקום
 *  לייבא, כדי שהמודול יישאר בלי תלויות מעבר ל-auth.ts */
const VISIT_ID = /^[a-z0-9]{6,32}$/;

/** מזהה ביקור, או null לכל דבר שאינו כזה — מזהה שבור פשוט נשמט */
function safeVisit(raw: unknown): string | null {
  return typeof raw === "string" && VISIT_ID.test(raw) ? raw : null;
}

interface StatePayload {
  nonce: string;
  redirectUri: string;
  next: string;
  exp: number;
  /** מזהה הביקור שהתחיל את הזרימה (D-8) — כדי שאירוע ההרשמה יתחבר
   *  לביקור בדף הנחיתה. רשות: זרימה שהתחילה במסך הכניסה חסרה אותו. */
  visit?: string;
}

function isStatePayload(value: unknown): value is StatePayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.nonce === "string" &&
    typeof v.redirectUri === "string" &&
    typeof v.next === "string" &&
    typeof v.exp === "number"
  );
}

function encodeState(data: StatePayload): string {
  const body = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  return `${body}.${signPayload(body)}`;
}

function decodeState(raw: string): StatePayload | null {
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  if (!payloadSignatureValid(body, signature)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!isStatePayload(data)) return null;
    if (data.exp * 1000 <= Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export interface AuthUrlResult {
  url: string;
  state: string;
  /** אותו nonce שנכנס ל-state, חתום — כדי שהקורא יוכל להכניס אותו לעוגיית הבינדינג */
  nonce: string;
}

/**
 * בניית כתובת ההרשאה של גוגל. null אם הדגל כבוי.
 *
 * ‏`visit` הוא מזהה הביקור מהדפדפן (`?v=` על /api/auth/google). הוא נוסע
 * בתוך ה-state החתום ולא בכתובת החוזרת מגוגל, כדי שלא ניתן יהיה לזייף אותו
 * — ואם הוא לא בצורה הנכונה הוא פשוט נשמט.
 */
export function buildAuthUrl(
  origin: string,
  next: string,
  visit: string | null = null,
  nowMs = Date.now(),
): AuthUrlResult | null {
  const clientId = googleClientId();
  if (!clientId) return null;
  const redirectUri = googleRedirectUri(origin);
  const nonce = randomBytes(16).toString("hex");
  const cleanVisit = safeVisit(visit);
  const state = encodeState({
    nonce,
    redirectUri,
    next,
    exp: Math.floor(nowMs / 1000) + STATE_TTL_SEC,
    ...(cleanVisit ? { visit: cleanVisit } : {}),
  });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    // profile נוסף בסבב 35: הרשמה עצמית צריכה שם תצוגה, ובלי ה-scope הזה
    // ה-id_token לא נושא name/given_name כלל.
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return { url: `${AUTH_ENDPOINT}?${params.toString()}`, state, nonce };
}

export interface VerifiedState {
  redirectUri: string;
  next: string;
  /** ה-nonce שהוטבע ב-state — מושווה מול עוגיית הבינדינג בקולבק (nonceMatches) */
  nonce: string;
  /** מזהה הביקור שהתחיל את הזרימה; null כשלא נשלח או לא היה תקין */
  visit: string | null;
}

/** אימות ה-state שחזר מגוגל: חתימה, תוקף, וצורת המטען */
export function verifyState(raw: string | null | undefined, nowMs = Date.now()): VerifiedState | null {
  if (!raw) return null;
  const data = decodeState(raw);
  if (!data) return null;
  if (data.exp * 1000 <= nowMs) return null;
  return {
    redirectUri: data.redirectUri,
    next: data.next,
    nonce: data.nonce,
    visit: safeVisit(data.visit),
  };
}

/**
 * השוואת ה-nonce שבעוגיית הבינדינג מול ה-nonce שבתוך ה-state המאומת,
 * בזמן קבוע. אורך שונה (כולל עוגייה חסרה) נדחה בלי להשוות תוכן — זה
 * עצמו לא מדליף מידע כי שני האורכים קבועים וידועים מראש (16 בייטים בהקסדצימלי).
 */
export function nonceMatches(cookieNonce: string | null | undefined, stateNonce: string): boolean {
  if (!cookieNonce) return false;
  const left = Buffer.from(cookieNonce, "utf8");
  const right = Buffer.from(stateNonce, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export interface GoogleIdentity {
  sub: string;
  email: string | null;
  /** שם התצוגה מגוגל (name, ואם אין — given_name); null כשאין אף אחד מהם */
  name: string | null;
}

/** פענוח id_token: JWT רגיל — ה-payload הוא המקטע האמצעי, בבסיס64url */
function decodeIdToken(idToken: string, clientId: string): GoogleIdentity | null {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    const sub = payload.sub;
    if (typeof sub !== "string" || sub.length === 0) return null;
    if (payload.aud !== clientId) return null;
    if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") {
      return null;
    }
    const email = typeof payload.email === "string" ? payload.email : null;
    // שם מלא כשיש; אחרת שם פרטי. משתמש שלא נתן הרשאת profile יקבל null,
    // ומי שיוצר את החשבון נופל לשם ברירת המחדל.
    const fullName = typeof payload.name === "string" ? payload.name : null;
    const givenName = typeof payload.given_name === "string" ? payload.given_name : null;
    return { sub, email, name: fullName ?? givenName };
  } catch {
    return null;
  }
}

export type ExchangeResult =
  | { ok: true; identity: GoogleIdentity }
  | { ok: false; error: string };

/** חילוף code בטוקן מול גוגל, ופענוח הזהות מתוך ה-id_token שחוזר */
export async function exchangeCode(code: string, redirectUri: string): Promise<ExchangeResult> {
  const clientId = googleClientId();
  const clientSecret = googleClientSecret();
  if (!clientId || !clientSecret) {
    return { ok: false, error: "כניסת גוגל לא מוגדרת בשרת." };
  }

  let response: Response;
  try {
    response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });
  } catch (e) {
    console.error("חילוף code מול גוגל נכשל:", e);
    return { ok: false, error: "אין חיבור לשרתי גוגל." };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("גוגל דחה את חילוף ה-code:", response.status, body);
    return { ok: false, error: "גוגל דחה את הכניסה." };
  }

  const data = (await response.json().catch(() => null)) as { id_token?: unknown } | null;
  if (!data || typeof data.id_token !== "string") {
    return { ok: false, error: "תשובת גוגל לא תקינה." };
  }

  const identity = decodeIdToken(data.id_token, clientId);
  if (!identity) return { ok: false, error: "אימות הזהות מול גוגל נכשל." };
  return { ok: true, identity };
}

/* ---------- החלטת הכניסה — טהורה ובדיקה בלי מסד/רשת ---------- */

export type LoginDecision =
  | { action: "login"; userId: string; role: "owner" | "tester" }
  | { action: "blocked" }
  | { action: "link"; userId: string }
  | { action: "signup" }
  | { action: "registrationClosed"; reason: "closed" | "full" };

/**
 * מצב ההרשמה כפי שהוא מגיע מ-src/lib/settings.ts. הצורה משוכפלת כאן
 * במכוון: המודול הזה נשאר טהור (בלי Prisma), והקורא מזין לו את התשובה.
 */
export type RegistrationVerdict =
  | { ok: true }
  | { ok: false; reason: "closed" | "full" };

/**
 * מה עושים עם זהות גוגל שחזרה (הורחב בסבב 35 להרשמה עצמית):
 * • יש כבר משתמש עם ה-sub הזה → כניסה (או חסימה אם בוטל).
 * • אין, אבל יש session פעיל → קישור גוגל לחשבון המחובר.
 * • אין כלום וההרשמה פתוחה → חשבון חדש.
 * • אין כלום וההרשמה סגורה/מלאה → הודעה, בלי יצירה.
 *
 * שים לב לסדר: קישור לחשבון מחובר קודם לבדיקת ההרשמה — הוא לא הרשמה
 * חדשה, ולכן תקרת המשתתפים לא אמורה לחסום אותו.
 */
export function decideGoogleLogin(params: {
  existingUser: { id: string; role: string; revokedAt: Date | null } | null;
  sessionUserId: string | null;
  registration: RegistrationVerdict;
}): LoginDecision {
  const { existingUser, sessionUserId, registration } = params;
  if (existingUser) {
    if (existingUser.revokedAt) return { action: "blocked" };
    return {
      action: "login",
      userId: existingUser.id,
      role: existingUser.role === "owner" ? "owner" : "tester",
    };
  }
  if (sessionUserId) return { action: "link", userId: sessionUserId };
  if (!registration.ok) {
    return { action: "registrationClosed", reason: registration.reason };
  }
  return { action: "signup" };
}
