// שכבת ההגנה של נתיב הכניסה (ביקורת סבב 37, SEC1).
//
// שני באגים נסגרו כאן, ושניהם נעולים בבדיקות למטה:
// • המפתח של מונה הכישלונות נלקח מהערך ה**שמאלי** של x-forwarded-for —
//   בדיוק הערך שהלקוח מצהיר על עצמו. החלפה שלו בכל בקשה פתחה דלי חדש,
//   ולכן החסימה לא נתפסה מעולם.
// • המפה של המונה גדלה בלי תקרה ובלי פינוי: כל ניסיון כושל הוסיף שורה
//   שנמחקה רק בכניסה מוצלחת עם אותו מפתח — כלומר לעולם לא.
//
// והתכונה שאסור שתישבר בדרך: תקרה גלובלית שנספרת רק על ניסיון שעולה לנו,
// כך שמבול חיצוני לא נועל את הבעלים מחוץ לאפליקציה שלו.

import { beforeEach, describe, expect, it, vi } from "vitest";

const { update, redeemInvite, recordEvent, ensureOwner } = vi.hoisted(() => ({
  update: vi.fn(),
  redeemInvite: vi.fn(),
  recordEvent: vi.fn(),
  ensureOwner: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: { user: { update } } }));
vi.mock("@/lib/invites", () => ({ redeemInvite }));
vi.mock("@/lib/pilot-events", () => ({ recordEvent }));
vi.mock("@/lib/users", () => ({ ensureOwner }));

import { NextRequest } from "next/server";
import { POST } from "../src/app/api/auth/login/route";
import {
  COUNT_WINDOW_MS,
  MAX_ENTRIES,
  MAX_KEY_LEN,
  attemptEntryCount,
  attemptKey,
  blockedSeconds,
  countFailure,
  resetAttempts,
} from "../src/app/api/auth/login/attempts";
import { resetRateLimits } from "../src/lib/rate-limit";

const PASSWORD = "סיסמה-ארוכה-מאוד-לבדיקה";

/** בקשת כניסה. `spoofed` הוא הערך שהלקוח מצהיר על עצמו (השמאלי). */
function post(body: unknown, realIp: string, spoofed?: string): NextRequest {
  const forwarded = spoofed ? `${spoofed}, ${realIp}` : realIp;
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": forwarded },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login — הגבלת ניחושים", () => {
  beforeEach(() => {
    resetAttempts();
    resetRateLimits();
    process.env.APP_PASSWORD = PASSWORD;
    delete process.env.AUTH_SECRET;
    delete process.env.TRUSTED_PROXY_HOPS;
    update.mockReset().mockResolvedValue({});
    recordEvent.mockReset().mockResolvedValue(undefined);
    redeemInvite.mockReset();
    ensureOwner
      .mockReset()
      .mockResolvedValue({ id: "usr_owner", name: "הבעלים", role: "owner" });
  });

  it("החלפת הערך השמאלי ב-x-forwarded-for לא פותחת דלי חדש", async () => {
    // חמישה כישלונות, כל אחד עם כתובת מוצהרת אחרת — הימנית זהה
    for (let i = 0; i < 5; i += 1) {
      const res = await POST(
        post({ password: "ניחוש" }, "203.0.113.9", `10.0.0.${i}`),
      );
      expect(res.status, `ניסיון ${i + 1}`).toBe(401);
    }

    // עד הביקורת הבקשה הזו הייתה מתקבלת שוב כ-401, לנצח
    const blocked = await POST(
      post({ password: "ניחוש" }, "203.0.113.9", "10.0.0.99"),
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    expect(await blocked.json()).toMatchObject({
      ok: false,
      error: expect.stringContaining("יותר מדי ניסיונות"),
    });
  });

  it("‏300 כישלונות במערכת אינם מונעים כניסה עם הסיסמה הנכונה", async () => {
    // 100 כתובות × 3 כישלונות = התקרה הגלובלית (300 לשעה) ממוצה
    for (let ip = 0; ip < 100; ip += 1) {
      for (let n = 0; n < 3; n += 1) {
        await POST(post({ password: "ניחוש" }, `198.51.100.${ip}`));
      }
    }

    // ניחוש נוסף — גם מכתובת טרייה — נחסם בתקרה שאינה תלויה בכותרת
    const guess = await POST(post({ password: "ניחוש" }, "203.0.113.77"));
    expect(guess.status).toBe(429);

    // אבל הסיסמה הנכונה עוברת: היא אינה נספרת בתקרה אף פעם
    const ok = await POST(post({ password: PASSWORD }, "203.0.113.78"));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({
      ok: true,
      user: { name: "הבעלים", role: "owner" },
    });
  });

  it("ניחוש קוד הזמנה נספר בתקרה **לפני** שהוא מגיע למסד", async () => {
    for (let ip = 0; ip < 100; ip += 1) {
      for (let n = 0; n < 3; n += 1) {
        await POST(post({ password: "ניחוש" }, `198.51.100.${ip}`));
      }
    }

    const res = await POST(post({ code: "ABCD1234" }, "203.0.113.90"));
    expect(res.status).toBe(429);
    expect(redeemInvite).not.toHaveBeenCalled();
  });

  it("דלי הפרץ חוסם גם ניסיונות שאינם כושלים מאותה כתובת", async () => {
    // 20 בקשות לדקה, גם עם הסיסמה הנכונה — כדי שניחושי קוד הזמנה, שפוגעים
    // במסד, לא ירוצו בלי חסם רק כי הם "לא כישלון"
    for (let i = 0; i < 20; i += 1) {
      const res = await POST(post({ password: PASSWORD }, "203.0.113.5"));
      expect(res.status, `בקשה ${i + 1}`).toBe(200);
    }
    const blocked = await POST(post({ password: PASSWORD }, "203.0.113.5"));
    expect(blocked.status).toBe(429);
  });
});

describe("מונה הניסיונות — תקרה, פינוי וקיצוץ", () => {
  const NOW = 1_800_000_000_000;

  beforeEach(() => {
    resetAttempts();
  });

  it("חמישה כישלונות פותחים דקת חסימה, והמונה מונה שניות", () => {
    for (let i = 0; i < 4; i += 1) countFailure("ip", NOW);
    expect(blockedSeconds("ip", NOW)).toBe(0);

    countFailure("ip", NOW);
    expect(blockedSeconds("ip", NOW)).toBe(60);
    expect(blockedSeconds("ip", NOW + 59_000)).toBe(1);
    expect(blockedSeconds("ip", NOW + 60_001)).toBe(0);
  });

  it("רשומה שפג תוקפה נמחקת — המונה לא זוכר ניסיון בן שעה", () => {
    for (let i = 0; i < 4; i += 1) countFailure("ip", NOW);
    expect(attemptEntryCount()).toBe(1);

    // עשר דקות בלי ניסיון נוסף — המונה מתחיל מאפס, והשורה מתפנה בקריאה
    expect(blockedSeconds("ip", NOW + COUNT_WINDOW_MS + 1)).toBe(0);
    expect(attemptEntryCount()).toBe(0);

    // ולכן ארבעה כישלונות חדשים עדיין לא חוסמים
    for (let i = 0; i < 4; i += 1) countFailure("ip", NOW + COUNT_WINDOW_MS + 2);
    expect(blockedSeconds("ip", NOW + COUNT_WINDOW_MS + 2)).toBe(0);
  });

  it("מבול של מפתחות לא מנפח את המפה בלי גבול", () => {
    for (let i = 0; i < MAX_ENTRIES + 2_000; i += 1) {
      countFailure(`spoofed-${i}`, NOW);
    }
    expect(attemptEntryCount()).toBeLessThanOrEqual(MAX_ENTRIES);
  });

  it("מפתח שמגיע מכותרת נחתך באורך", () => {
    expect(attemptKey("x".repeat(5_000))).toHaveLength(MAX_KEY_LEN);
    expect(attemptKey("203.0.113.7")).toBe("203.0.113.7");
  });
});
