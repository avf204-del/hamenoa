// שכבת הכניסה של המנוע. שני מסלולים, אותה עוגייה חתומה:
// • הבעלים — הסיסמה היחידה מ-APP_PASSWORD (החלטה 20).
// • נסיין — קוד הזמנה אישי שהבעלים הנפיק ב-/admin (החלטה 21, אבן דרך 8).
// אין הרשמה עצמית ואין שחזור סיסמה.
//
// האסימון נושא את מזהה המשתמש ואת התפקיד, חתומים יחד: כך שכבת ה-proxy
// יודעת לחסום את /admin בלי גישה למסד. ביטול משתמש נאכף בשרת (currentUser),
// כי אסימון חתום נשאר תקף עד פקיעתו.
//
// הגדרה: APP_PASSWORD (חובה בפרודקשן). AUTH_SECRET הוא רשות — בלעדיו החתימה
// נגזרת מהסיסמה עצמה, כך שהחלפת סיסמה מנתקת מיד את כל המכשירים.
import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE = "hamenoa_session";
/** חודש — הבעלים לא אמור להתבקש סיסמה באמצע אימון */
export const SESSION_TTL_SEC = 30 * 24 * 60 * 60;

export type UserRole = "owner" | "tester";

/** מה שהאסימון נושא. userId=null באסימון v1 הישן — הבעלים לפני אבן דרך 8. */
export interface TokenClaims {
  userId: string | null;
  role: UserRole;
}

export function authPassword(): string | null {
  const value = process.env.APP_PASSWORD;
  return value && value.length > 0 ? value : null;
}

/** האם שכבת הכניסה פעילה. בפיתוח בלי APP_PASSWORD — פתוח, כמו היום. */
export function authEnabled(): boolean {
  return authPassword() !== null;
}

function secret(): string {
  const explicit = process.env.AUTH_SECRET;
  if (explicit && explicit.length > 0) return explicit;
  const password = authPassword();
  if (!password) throw new Error("אין APP_PASSWORD — אי אפשר לחתום עוגיית כניסה.");
  return createHash("sha256").update(`hamenoa:${password}`).digest("hex");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

/** השוואה בזמן קבוע — לא מדליפה כמה תווים התאימו */
function equals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function passwordMatches(attempt: string): boolean {
  const expected = authPassword();
  if (!expected) return false;
  // גיבוב לפני ההשוואה — אורך הקלט לא מסגיר את אורך הסיסמה
  const digest = (value: string) => createHash("sha256").update(value).digest("hex");
  return equals(digest(attempt), digest(expected));
}

/** דגל Secure לעוגייה: לפי הפרוטוקול שהגיע לשרת (מאחורי פרוקסי — הכותרת) */
export function cookieSecure(request: {
  headers: { get: (name: string) => string | null };
  url: string;
}): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

/** מזהה שנכנס לאסימון חייב להיות נקי מהמפריד ומתווים מפתיעים */
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function issueToken(
  claims: { userId: string; role: UserRole },
  nowMs = Date.now(),
): string {
  if (!SAFE_ID.test(claims.userId)) {
    throw new Error("מזהה משתמש לא חוקי לאסימון כניסה.");
  }
  const exp = Math.floor(nowMs / 1000) + SESSION_TTL_SEC;
  const payload = `v2.${claims.userId}.${claims.role}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

/**
 * קריאת אסימון ואימות חתימתו. מחזיר null לכל אסימון פגום, פג או מזויף.
 * v1 (לפני אבן דרך 8) נקרא כאסימון של הבעלים — כך שהמכשירים שכבר מחוברים
 * לא מנותקים בעליית הגרסה; המזהה עצמו נפתר במסד לפי התפקיד.
 */
export function readToken(
  token: string | undefined,
  nowMs = Date.now(),
): TokenClaims | null {
  if (!token) return null;
  const parts = token.split(".");
  try {
    if (parts[0] === "v1" && parts.length === 3) {
      const exp = Number(parts[1]);
      if (!Number.isFinite(exp) || exp * 1000 <= nowMs) return null;
      if (!equals(parts[2], sign(`v1.${exp}`))) return null;
      return { userId: null, role: "owner" };
    }
    if (parts[0] === "v2" && parts.length === 5) {
      const [, userId, role, rawExp, signature] = parts;
      if (!SAFE_ID.test(userId)) return null;
      if (role !== "owner" && role !== "tester") return null;
      const exp = Number(rawExp);
      if (!Number.isFinite(exp) || exp * 1000 <= nowMs) return null;
      if (!equals(signature, sign(`v2.${userId}.${role}.${exp}`))) return null;
      return { userId, role };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * חתימת מטען כללית — לשימוש מחוץ לאסימון הכניסה עצמו (כניסת גוגל: ה-state
 * שמגן על זרימת ה-OAuth, src/lib/google-auth.ts). אותו סוד כמו האסימון,
 * כדי שלא תיווסף תלות בסוד נוסף רק בשביל state קצר-מועד.
 */
export function signPayload(payload: string): string {
  return sign(payload);
}

/** Renew an authenticated active account once its existing session enters its
 * last week. Expired, invalid and legacy owner tokens are never renewed here. */
export function renewedToken(token: string | undefined, nowMs = Date.now()): string | null {
  const claims = readToken(token, nowMs);
  if (!claims?.userId || !token || token.split(".")[0] !== "v2") return null;
  const remaining = Number(token.split(".")[3]) * 1000 - nowMs;
  return remaining <= 7 * 86400000 ? issueToken({ userId: claims.userId, role: claims.role }, nowMs) : null;
}

/** אימות חתימה שהופקה ע"י signPayload — בזמן קבוע, כמו שאר ההשוואות כאן */
export function payloadSignatureValid(payload: string, signature: string): boolean {
  try {
    return equals(signature, sign(payload));
  } catch {
    return false;
  }
}
