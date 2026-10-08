// כניסה עם גוגל (פריט 1). מכסים כאן רק את מה שטהור ולא תלוי ברשת/מסד:
// הדגל, ה-state החתום (זיוף/פקיעה), ההחלטה בין כניסה/קישור/חסימה/דחייה,
// והתאמת עוגיית הבינדינג (minor 11 — קשירת דפדפן + חד-פעמיות ל-state).
// זרימת ה-cookie/callback עצמה (Request/Response של Next) מכוסה כאן
// ב"source-locks" — קריאת קובצי ה-route כטקסט ובדיקה שהם באמת קוראים
// לפונקציות הטהורות בסדר הנכון, כי הדבקה מלאה של NextRequest אינה משתלמת פה.
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const PASSWORD = "סיסמה-ארוכה-לבדיקה";
const CLIENT_ID = "test-client-id";
const CLIENT_SECRET = "test-client-secret";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

/** ‏src/lib/users.ts נוגע במסד; google-auth.ts עצמו לא — המוק כאן משרת
 *  רק את הבדיקות של createGoogleUser בסוף הקובץ */
const { userCreate, locationFindFirst, locationCreate } = vi.hoisted(() => ({
  userCreate: vi.fn(),
  locationFindFirst: vi.fn(),
  locationCreate: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { create: userCreate },
    locationProfile: { findFirst: locationFindFirst, create: locationCreate },
  },
}));

/** ההרשמה פתוחה — ברירת המחדל בכל בדיקה שלא בודקת דווקא סגירה */
const OPEN = { ok: true } as const;

async function googleAuth() {
  // טעינה מחדש בכל בדיקה — המודול (ו-auth.ts שמתחתיו) קוראים env בזמן ריצה
  return import("../src/lib/google-auth");
}

describe("כניסת גוגל — הדגל", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  it("בלי אחד מהשלושה (APP_PASSWORD / CLIENT_ID / SECRET) — כבוי, ואין כתובת הרשאה", async () => {
    delete process.env.APP_PASSWORD;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    const { googleAuthEnabled, buildAuthUrl } = await googleAuth();
    expect(googleAuthEnabled()).toBe(false);
    expect(buildAuthUrl("https://example.com", "/")).toBe(null);

    process.env.APP_PASSWORD = PASSWORD;
    expect(googleAuthEnabled()).toBe(false); // עדיין בלי client id/secret

    process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
    expect(googleAuthEnabled()).toBe(false); // חסר secret

    process.env.GOOGLE_CLIENT_SECRET = CLIENT_SECRET;
    expect(googleAuthEnabled()).toBe(true);
  });

  it("בלי APP_PASSWORD — כבוי גם אם client id/secret קיימים (אותה שכבת כניסה)", async () => {
    delete process.env.APP_PASSWORD;
    process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
    process.env.GOOGLE_CLIENT_SECRET = CLIENT_SECRET;
    const { googleAuthEnabled } = await googleAuth();
    expect(googleAuthEnabled()).toBe(false);
  });
});

describe("כניסת גוגל — state חתום", () => {
  const original = { ...process.env };
  beforeEach(() => {
    process.env.APP_PASSWORD = PASSWORD;
    process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
    process.env.GOOGLE_CLIENT_SECRET = CLIENT_SECRET;
    delete process.env.AUTH_SECRET;
  });
  afterEach(() => {
    process.env = { ...original };
  });

  it("כתובת ההרשאה נושאת state שמפענח בחזרה ל-redirectUri ול-next שנכנסו", async () => {
    const { buildAuthUrl, verifyState } = await googleAuth();
    const result = buildAuthUrl("https://hamenoa-production.up.railway.app", "/ability");
    expect(result).not.toBe(null);
    const url = new URL(result!.url);
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe(CLIENT_ID);
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://hamenoa-production.up.railway.app/api/auth/google/callback",
    );
    const state = url.searchParams.get("state")!;
    expect(state).toBe(result!.state);

    const verified = verifyState(state);
    expect(verified).toEqual({
      redirectUri: "https://hamenoa-production.up.railway.app/api/auth/google/callback",
      next: "/ability",
      nonce: result!.nonce,
      visit: null,
    });
  });

  it("‏scope מבקש גם profile — בלעדיו אין שם תצוגה להרשמה עצמית", async () => {
    const { buildAuthUrl } = await googleAuth();
    const url = new URL(buildAuthUrl("https://example.com", "/")!.url);
    expect(url.searchParams.get("scope")).toBe("openid email profile");
  });

  it("מזהה ביקור תקין נוסע בתוך ה-state וחוזר ממנו", async () => {
    const { buildAuthUrl, verifyState } = await googleAuth();
    const result = buildAuthUrl("https://example.com", "/", "ab12cd34ef56")!;
    // הוא לא מופיע בכתובת עצמה — רק בתוך המטען החתום
    expect(new URL(result.url).searchParams.get("v")).toBe(null);
    expect(verifyState(result.state)?.visit).toBe("ab12cd34ef56");
  });

  it("מזהה ביקור שאינו בצורה הנכונה נשמט, ולא מפיל את הזרימה", async () => {
    const { buildAuthUrl, verifyState } = await googleAuth();
    for (const bad of ["ABC123", "ab 12", "ab", "a".repeat(33), "<script>", ""]) {
      const result = buildAuthUrl("https://example.com", "/", bad)!;
      expect(result).not.toBe(null);
      expect(verifyState(result.state)?.visit).toBe(null);
    }
  });

  it("state מזויף (חתימה שגויה) נדחה", async () => {
    const { buildAuthUrl, verifyState } = await googleAuth();
    const { state } = buildAuthUrl("https://example.com", "/")!;
    const [body] = state.split(".");
    expect(verifyState(`${body}.${"0".repeat(64)}`)).toBe(null);
    expect(verifyState(`${body}extra.${state.split(".")[1]}`)).toBe(null);
  });

  it("state שפג תוקפו נדחה", async () => {
    const { buildAuthUrl, verifyState } = await googleAuth();
    const now = 1_800_000_000_000;
    const { state } = buildAuthUrl("https://example.com", "/", null, now)!;
    expect(verifyState(state, now)).not.toBe(null);
    expect(verifyState(state, now + 11 * 60_000)).toBe(null); // חלון של 10 דקות
  });

  it("קלט חסר-צורה לא מפיל, רק נדחה", async () => {
    const { verifyState } = await googleAuth();
    expect(verifyState(null)).toBe(null);
    expect(verifyState("")).toBe(null);
    expect(verifyState("no-dot-here")).toBe(null);
    expect(verifyState("a.b.c")).toBe(null);
  });

  it("החלפת סיסמה מבטלת state קיים (בלי AUTH_SECRET — אותו סוד כמו האסימון)", async () => {
    const { buildAuthUrl, verifyState } = await googleAuth();
    const { state } = buildAuthUrl("https://example.com", "/")!;
    process.env.APP_PASSWORD = "סיסמה-אחרת";
    expect(verifyState(state)).toBe(null);
  });
});

describe("כניסת גוגל — ההחלטה בין כניסה/קישור/חסימה/הרשמה", () => {
  it("יש משתמש עם ה-sub ולא בוטל → כניסה, עם התפקיד מהמסד", async () => {
    const { decideGoogleLogin } = await googleAuth();
    expect(
      decideGoogleLogin({
        existingUser: { id: "usr_1", role: "tester", revokedAt: null },
        sessionUserId: null,
        registration: OPEN,
      }),
    ).toEqual({ action: "login", userId: "usr_1", role: "tester" });

    expect(
      decideGoogleLogin({
        existingUser: { id: "usr_owner", role: "owner", revokedAt: null },
        sessionUserId: "usr_owner",
        registration: OPEN,
      }),
    ).toEqual({ action: "login", userId: "usr_owner", role: "owner" });
  });

  it("יש משתמש עם ה-sub אבל בוטל → חסימה, גם עם session פעיל", async () => {
    const { decideGoogleLogin } = await googleAuth();
    expect(
      decideGoogleLogin({
        existingUser: { id: "usr_1", role: "tester", revokedAt: new Date() },
        sessionUserId: "usr_2",
        registration: OPEN,
      }),
    ).toEqual({ action: "blocked" });
  });

  it("אין משתמש עם ה-sub, אבל יש session פעיל → קישור לחשבון המחובר (לא יצירה)", async () => {
    const { decideGoogleLogin } = await googleAuth();
    expect(
      decideGoogleLogin({
        existingUser: null,
        sessionUserId: "usr_active",
        registration: OPEN,
      }),
    ).toEqual({ action: "link", userId: "usr_active" });
  });

  it("אין משתמש ואין session, וההרשמה פתוחה → חשבון חדש", async () => {
    const { decideGoogleLogin } = await googleAuth();
    expect(
      decideGoogleLogin({
        existingUser: null,
        sessionUserId: null,
        registration: OPEN,
      }),
    ).toEqual({ action: "signup" });
  });

  it("ההרשמה סגורה או מלאה → הודעה עם הסיבה, בלי יצירה", async () => {
    const { decideGoogleLogin } = await googleAuth();
    expect(
      decideGoogleLogin({
        existingUser: null,
        sessionUserId: null,
        registration: { ok: false, reason: "closed" },
      }),
    ).toEqual({ action: "registrationClosed", reason: "closed" });

    expect(
      decideGoogleLogin({
        existingUser: null,
        sessionUserId: null,
        registration: { ok: false, reason: "full" },
      }),
    ).toEqual({ action: "registrationClosed", reason: "full" });
  });

  it("הרשמה סגורה אינה חוסמת כניסה של מתאמן קיים ולא קישור לחשבון מחובר", async () => {
    const { decideGoogleLogin } = await googleAuth();
    const closed = { ok: false, reason: "closed" } as const;
    expect(
      decideGoogleLogin({
        existingUser: { id: "usr_1", role: "tester", revokedAt: null },
        sessionUserId: null,
        registration: closed,
      }),
    ).toEqual({ action: "login", userId: "usr_1", role: "tester" });

    expect(
      decideGoogleLogin({
        existingUser: null,
        sessionUserId: "usr_active",
        registration: closed,
      }),
    ).toEqual({ action: "link", userId: "usr_active" });
  });

  it("משתמש שבוטל נחסם גם כשההרשמה סגורה — החסימה קודמת לכל השאר", async () => {
    const { decideGoogleLogin } = await googleAuth();
    expect(
      decideGoogleLogin({
        existingUser: { id: "usr_1", role: "tester", revokedAt: new Date() },
        sessionUserId: null,
        registration: { ok: false, reason: "full" },
      }),
    ).toEqual({ action: "blocked" });
  });
});

describe("כניסת גוגל — עוגיית הבינדינג (minor 11: קשירת דפדפן + חד-פעמיות)", () => {
  const original = { ...process.env };
  beforeEach(() => {
    process.env.APP_PASSWORD = PASSWORD;
    process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
    process.env.GOOGLE_CLIENT_SECRET = CLIENT_SECRET;
    delete process.env.AUTH_SECRET;
  });
  afterEach(() => {
    process.env = { ...original };
  });

  it("nonceMatches — התאמה מדויקת בלבד מתקבלת", async () => {
    const { buildAuthUrl, nonceMatches } = await googleAuth();
    const result = buildAuthUrl("https://example.com", "/")!;
    expect(nonceMatches(result.nonce, result.nonce)).toBe(true);
  });

  it("nonceMatches — עוגייה חסרה, ריקה, שונה או באורך שונה נדחית", async () => {
    const { buildAuthUrl, nonceMatches } = await googleAuth();
    const result = buildAuthUrl("https://example.com", "/")!;
    expect(nonceMatches(null, result.nonce)).toBe(false);
    expect(nonceMatches(undefined, result.nonce)).toBe(false);
    expect(nonceMatches("", result.nonce)).toBe(false);
    expect(nonceMatches("0".repeat(result.nonce.length), result.nonce)).toBe(false);
    expect(nonceMatches(result.nonce.slice(0, -1), result.nonce)).toBe(false); // אורך שונה
    expect(nonceMatches(`${result.nonce}0`, result.nonce)).toBe(false); // אורך שונה
  });

  it("כל קריאה ל-buildAuthUrl מייצרת nonce טרי ושונה (בלי שימוש חוזר)", async () => {
    const { buildAuthUrl } = await googleAuth();
    const a = buildAuthUrl("https://example.com", "/")!;
    const b = buildAuthUrl("https://example.com", "/")!;
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.state).not.toBe(b.state);
  });

  it("ה-nonce שחוזר מ-buildAuthUrl הוא בדיוק זה שקבור בתוך ה-state המאומת", async () => {
    const { buildAuthUrl, verifyState } = await googleAuth();
    const result = buildAuthUrl("https://example.com", "/next")!;
    const verified = verifyState(result.state);
    expect(verified?.nonce).toBe(result.nonce);
  });
});

describe("כניסת גוגל — source-locks: הראוטים באמת קושרים עוגייה ל-state", () => {
  const routeSrc = read("src/app/api/auth/google/route.ts");
  const callbackSrc = read("src/app/api/auth/google/callback/route.ts");

  it("יזום הזרימה (route.ts) כותב עוגיית nonce httpOnly עם ה-nonce שחזר מ-buildAuthUrl", () => {
    expect(routeSrc).toContain("name: OAUTH_NONCE_COOKIE");
    expect(routeSrc).toContain("value: result.nonce");
    expect(routeSrc).toContain("httpOnly: true");
    expect(routeSrc).toContain("path: OAUTH_NONCE_COOKIE_PATH");
  });

  it("הקולבק בודק את nonceMatches לפני חילוף ה-code (לא רק אחרי)", () => {
    const nonceCheckIdx = callbackSrc.indexOf("nonceMatches(cookieNonce, state.nonce)");
    const exchangeIdx = callbackSrc.indexOf("exchangeCode(code, state.redirectUri)");
    expect(nonceCheckIdx).toBeGreaterThan(-1);
    expect(exchangeIdx).toBeGreaterThan(-1);
    expect(nonceCheckIdx).toBeLessThan(exchangeIdx);
  });

  it("הקולבק מוחק את עוגיית ה-nonce (חד-פעמיות) בכל נתיב יציאה: כישלון, הרשמה, קישור והתחברות", () => {
    // הגדרת הפונקציה עצמה + ארבע קריאות: בתוך loginRedirect (כל כשל),
    // ובשלושת ענפי ההצלחה — "signup" (סבב 35), "link" ו-"login".
    const occurrences = callbackSrc.split("clearNonceCookie(").length - 1;
    expect(occurrences).toBe(5);
  });
});

describe("הרשמה עם גוגל — נעילת מקור על הקולבק (D-3, D-9)", () => {
  const callbackSrc = read("src/app/api/auth/google/callback/route.ts");
  const startSrc = read("src/app/api/auth/google/route.ts");

  it("הגבלת הקצב של הקולבק היא הדבר הראשון אחרי בדיקת הדגל — לפני כל I/O", () => {
    const limitIdx = callbackSrc.indexOf('rateLimit("google-callback"');
    const exchangeIdx = callbackSrc.indexOf("exchangeCode(code");
    expect(limitIdx).toBeGreaterThan(-1);
    expect(limitIdx).toBeLessThan(exchangeIdx);
    expect(callbackSrc).toContain("max: 60, windowMs: 60_000");
  });

  it("מכסת ההרשמות (10 לשעה) נספרת רק בענף היצירה, לפני createGoogleUser", () => {
    const signupBranch = callbackSrc.indexOf('decision.action === "signup"');
    const quotaIdx = callbackSrc.indexOf('rateLimit("signup"');
    const createIdx = callbackSrc.indexOf("createGoogleUser(");
    expect(signupBranch).toBeGreaterThan(-1);
    expect(signupBranch).toBeLessThan(quotaIdx);
    expect(quotaIdx).toBeLessThan(createIdx);
    expect(callbackSrc).toContain("max: 10, windowMs: 3_600_000");
  });

  it("מצב ההרשמה נבדק מול המסד ומוזן להחלטה, והיצירה מפנה ל-/?welcome=1", () => {
    expect(callbackSrc).toContain("registrationAllowed()");
    expect(callbackSrc).toMatch(/decideGoogleLogin\(\{[^}]*registration[^}]*\}\)/);
    expect(callbackSrc).toContain('new URL("/?welcome=1", oauthOrigin(request))');
  });

  it("הרשמה וכניסה נרשמות כאירועי פיילוט עם המקור והביקור", () => {
    expect(callbackSrc).toContain('void recordEvent("signup"');
    expect(callbackSrc).toContain('void recordEvent("login"');
    expect(callbackSrc).toContain('props: { source: "google" }');
    expect(callbackSrc).toContain("state.visit");
  });

  it("יזום הזרימה מעביר את מזהה הביקור מ-?v= אל buildAuthUrl", () => {
    expect(startSrc).toContain('searchParams.get("v")');
    expect(startSrc).toContain("buildAuthUrl(oauthOrigin(request), next, visit)");
  });
});

describe("createGoogleUser — שם התצוגה ושורת המשתמש", () => {
  const original = { ...process.env };
  beforeEach(() => {
    userCreate.mockReset().mockResolvedValue({ id: "usr_new", name: "דנה כהן" });
    locationFindFirst.mockReset().mockResolvedValue({ id: "loc_1" });
    locationCreate.mockReset().mockResolvedValue({});
  });
  afterEach(() => {
    process.env = { ...original };
  });

  it("שם ריק, רווחים בלבד או חסר → שם ברירת המחדל", async () => {
    const { displayNameFrom, DEFAULT_DISPLAY_NAME } = await import("../src/lib/users");
    expect(DEFAULT_DISPLAY_NAME).toBe("מתאמן");
    expect(displayNameFrom(null)).toBe("מתאמן");
    expect(displayNameFrom(undefined)).toBe("מתאמן");
    expect(displayNameFrom("")).toBe("מתאמן");
    expect(displayNameFrom("   ")).toBe("מתאמן");
  });

  it("רווחים מיותרים נבלעים והאורך נחתך ל-60 תווים", async () => {
    const { displayNameFrom } = await import("../src/lib/users");
    expect(displayNameFrom("  דנה   כהן  ")).toBe("דנה כהן");
    const long = displayNameFrom("א".repeat(200));
    expect(long.length).toBe(60);
  });

  it("היצירה נועלת role tester ו-signupSource google, ולא מקבלת אותם מבחוץ", async () => {
    const { createGoogleUser } = await import("../src/lib/users");
    const created = await createGoogleUser({
      sub: "google-sub-1",
      email: "dana@example.com",
      name: "  דנה כהן ",
    });
    expect(created).toEqual({ id: "usr_new", name: "דנה כהן", role: "tester" });

    const data = userCreate.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.role).toBe("tester");
    expect(data.signupSource).toBe("google");
    expect(data.googleSub).toBe("google-sub-1");
    expect(data.email).toBe("dana@example.com");
    expect(data.name).toBe("דנה כהן");
    expect(data.lastSeenAt).toBeInstanceOf(Date);
  });

  it("בלי אימייל ובלי שם — נוצר משתמש תקין עם שם ברירת המחדל ובלי עמודת email", async () => {
    userCreate.mockResolvedValue({ id: "usr_new", name: "מתאמן" });
    const { createGoogleUser } = await import("../src/lib/users");
    const created = await createGoogleUser({ sub: "sub-2", email: null, name: null });
    expect(created.name).toBe("מתאמן");
    const data = userCreate.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.name).toBe("מתאמן");
    expect("email" in data).toBe(false);
  });
});

describe("כניסת גוגל — ה-origin של redirect_uri (תקלת localhost:8080 בפרודקשן, 16.9.2026)", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  /** בקשה מינימלית בצורה שהמודול דורש — כותרות + url, בלי NextRequest */
  function fakeRequest(url: string, headers: Record<string, string> = {}) {
    const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
    return { url, headers: { get: (name: string) => map.get(name.toLowerCase()) ?? null } };
  }

  it("בפרודקשן — תמיד הכתובת הציבורית (SITE_URL), גם כשהבקשה נראית כמו localhost:8080", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.APP_URL;
    const { oauthOrigin, googleRedirectUri } = await googleAuth();
    const origin = oauthOrigin(
      fakeRequest("http://localhost:8080/api/auth/google", {
        host: "localhost:8080",
        "x-forwarded-proto": "https",
      }),
    );
    expect(origin).toBe("https://hamenoa-production.up.railway.app");
    expect(googleRedirectUri(origin)).toBe(
      "https://hamenoa-production.up.railway.app/api/auth/google/callback",
    );
    vi.unstubAllEnvs();
  });

  it("בפרודקשן עם APP_URL — הדומיין שהוגדר, בלי לוכסן סוגר", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://hamenoa.co.il/");
    vi.resetModules();
    const { oauthOrigin } = await googleAuth();
    expect(oauthOrigin(fakeRequest("http://localhost:8080/api/auth/google"))).toBe(
      "https://hamenoa.co.il",
    );
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("בפיתוח — כותרת Host מנצחת את ה-url הפנימי, והפרוטוקול לפי x-forwarded-proto", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { oauthOrigin } = await googleAuth();
    expect(
      oauthOrigin(
        fakeRequest("http://localhost:3000/api/auth/google", { host: "macbook-air.local:3000" }),
      ),
    ).toBe("http://macbook-air.local:3000");
    expect(
      oauthOrigin(
        fakeRequest("http://localhost:3000/api/auth/google", {
          host: "localhost:3000",
          "x-forwarded-host": "dev.example.test, inner",
          "x-forwarded-proto": "https, http",
        }),
      ),
    ).toBe("https://dev.example.test");
    // בלי שום כותרת — נופלים ל-url של הבקשה עצמה
    expect(oauthOrigin(fakeRequest("http://localhost:3000/api/auth/google"))).toBe(
      "http://localhost:3000",
    );
    vi.unstubAllEnvs();
  });

  it("source-lock: נתיב היזום קורא ל-oauthOrigin ולא נוגע ב-nextUrl.host", () => {
    const src = read("src/app/api/auth/google/route.ts");
    expect(src).toContain("buildAuthUrl(oauthOrigin(request)");
    expect(src).not.toContain("nextUrl.host");
  });

  it("source-lock: כל הפניה בקולבק נבנית על oauthOrigin ולא על כתובת הבקשה (ERR_CONNECTION_REFUSED על localhost:8080)", () => {
    const src = read("src/app/api/auth/google/callback/route.ts");
    expect(src).not.toContain("request.url");
    expect(src).toContain('new URL("/login", oauthOrigin(request))');
    expect(src).toContain('new URL("/?welcome=1", oauthOrigin(request))');
    expect(src.split("internalRedirectUrl(state.next, oauthOrigin(request))").length - 1).toBe(2);
  });

  it("source-lock: session שמצביע על משתמש שאינו במסד לא נחשב session לצורך קישור", () => {
    const src = read("src/app/api/auth/google/callback/route.ts");
    const check = src.indexOf("if (!sessionUser) sessionUserId = null;");
    const decide = src.indexOf("decideGoogleLogin({");
    expect(check).toBeGreaterThan(-1);
    expect(check).toBeLessThan(decide);
  });
});
