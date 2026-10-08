// שכבת הכניסה (החלטות 20 ו-21): סיסמת בעלים או קוד הזמנה, ואסימון חתום
// שנושא מזהה משתמש ותפקיד. הבדיקות מכסות את מה שמפריד בין "פרטי" ל"פתוח
// לרשת" — אימות סיסמה, תוקף, זיוף חתימה, והעלאת תפקיד ביד.
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const PASSWORD = "סיסמה-ארוכה-לבדיקה";
const USER = { userId: "usr_test", role: "tester" } as const;
const OWNER = { userId: "usr_owner", role: "owner" } as const;

async function auth() {
  // טעינה מחדש בכל בדיקה — המודול קורא את משתני הסביבה בזמן ריצה
  return import("../src/lib/auth");
}

describe("שכבת הכניסה", () => {
  const original = { ...process.env };
  beforeEach(() => {
    process.env.APP_PASSWORD = PASSWORD;
    delete process.env.AUTH_SECRET;
  });
  afterEach(() => {
    process.env = { ...original };
  });

  it("בלי APP_PASSWORD השכבה כבויה, ואף אסימון לא נחשב תקף", async () => {
    const { authEnabled, readToken, passwordMatches } = await auth();
    delete process.env.APP_PASSWORD;
    expect(authEnabled()).toBe(false);
    expect(passwordMatches(PASSWORD)).toBe(false);
    expect(readToken("v2.usr_owner.owner.9999999999.abc")).toBe(null);
  });

  it("הסיסמה הנכונה מתקבלת; כל אחרת נדחית", async () => {
    const { passwordMatches } = await auth();
    expect(passwordMatches(PASSWORD)).toBe(true);
    expect(passwordMatches("")).toBe(false);
    expect(passwordMatches(`${PASSWORD} `)).toBe(false);
    expect(passwordMatches(PASSWORD.slice(0, -1))).toBe(false);
  });

  it("אסימון שהונפק נקרא עם המשתמש והתפקיד, ואחרי פקיעה כבר לא", async () => {
    const { issueToken, readToken, SESSION_TTL_SEC } = await auth();
    const now = 1_800_000_000_000;
    const token = issueToken(USER, now);
    expect(readToken(token, now)).toEqual({ userId: "usr_test", role: "tester" });
    expect(readToken(token, now + SESSION_TTL_SEC * 1000 + 1_000)).toBe(null);
  });

  it("חתימה מזויפת או תוקף שהוארך ביד נדחים", async () => {
    const { issueToken, readToken } = await auth();
    const now = 1_800_000_000_000;
    const [, userId, role, exp, signature] = issueToken(USER, now).split(".");
    expect(readToken(`v2.${userId}.${role}.${Number(exp) + 86_400}.${signature}`, now))
      .toBe(null);
    expect(readToken(`v2.${userId}.${role}.${exp}.${"0".repeat(signature.length)}`, now))
      .toBe(null);
    expect(readToken(`v9.${userId}.${role}.${exp}.${signature}`, now)).toBe(null);
    expect(readToken(undefined, now)).toBe(null);
    expect(readToken("", now)).toBe(null);
  });

  it("העלאת תפקיד או החלפת משתמש באסימון נפסלות (החתימה מכסה את שניהם)", async () => {
    const { issueToken, readToken } = await auth();
    const now = 1_800_000_000_000;
    const [, , , exp, signature] = issueToken(USER, now).split(".");
    // אותו אסימון, "owner" במקום "tester"
    expect(readToken(`v2.usr_test.owner.${exp}.${signature}`, now)).toBe(null);
    // אותו אסימון, מזהה של משתמש אחר
    expect(readToken(`v2.usr_other.tester.${exp}.${signature}`, now)).toBe(null);
  });

  it("אסימון בעלים ואסימון נסיין לא ניתנים להחלפה זה בזה", async () => {
    const { issueToken, readToken } = await auth();
    const now = 1_800_000_000_000;
    const ownerToken = issueToken(OWNER, now);
    const testerToken = issueToken(USER, now);
    expect(readToken(ownerToken, now)?.role).toBe("owner");
    expect(readToken(testerToken, now)?.role).toBe("tester");
    expect(ownerToken).not.toBe(testerToken);
  });

  it("אסימון v1 מלפני אבן דרך 8 נקרא כבעלים — מכשיר מחובר לא מנותק", async () => {
    const { readToken } = await auth();
    const now = 1_800_000_000_000;
    // נבנה כאן באותה נוסחה שבה נחתם ב-v1 (payload = "v1.<exp>")
    const { createHmac, createHash } = await import("node:crypto");
    const secret = createHash("sha256").update(`hamenoa:${PASSWORD}`).digest("hex");
    const exp = Math.floor(now / 1000) + 3600;
    const signature = createHmac("sha256", secret).update(`v1.${exp}`).digest("hex");
    expect(readToken(`v1.${exp}.${signature}`, now)).toEqual({
      userId: null,
      role: "owner",
    });
    expect(readToken(`v1.${exp}.${"0".repeat(signature.length)}`, now)).toBe(null);
  });

  it("החלפת סיסמה מבטלת אסימונים קיימים (בלי AUTH_SECRET)", async () => {
    const { issueToken, readToken } = await auth();
    const now = 1_800_000_000_000;
    const token = issueToken(OWNER, now);
    process.env.APP_PASSWORD = "סיסמה-אחרת";
    expect(readToken(token, now)).toBe(null);
  });

  it("מזהה משתמש עם מפריד הנקודה לא נכנס לאסימון", async () => {
    const { issueToken } = await auth();
    expect(() => issueToken({ userId: "usr.evil", role: "tester" })).toThrow();
  });

  it("signPayload/payloadSignatureValid (כניסת גוגל, פריט 1) — אותו סוד, זיוף נדחה", async () => {
    const { signPayload, payloadSignatureValid } = await auth();
    const signature = signPayload("hello");
    expect(payloadSignatureValid("hello", signature)).toBe(true);
    expect(payloadSignatureValid("hello!", signature)).toBe(false);
    expect(payloadSignatureValid("hello", "0".repeat(signature.length))).toBe(false);
  });
});
