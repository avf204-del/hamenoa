// אכיפת ביטול גישה בשכבת הכניסה (אבן דרך 8, החלטה 21).
//
// הבאג שהבדיקה הזו נועלת: האסימון חתום וסטייטלס, ולכן נסיין שהבעלים ביטל
// המשיך להיכנס עד שהאסימון פג. הבדיקה עברה ל-proxy, ועם מטמון — ולכן חשוב
// גם שהמטמון לא ישאיר משתמש מבוטל בפנים, וגם שתקלת מסד לא תנעל את הבעלים.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique } } }));

async function access() {
  // מודול טרי לכל בדיקה — המטמון חי ברמת המודול
  vi.resetModules();
  return import("../src/lib/access");
}

const ACTIVE = { revokedAt: null };
const REVOKED = { revokedAt: new Date("2026-08-26T10:00:00Z") };

describe("אכיפת ביטול גישה", () => {
  beforeEach(() => {
    findUnique.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T09:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("משתמש פעיל עובר, משתמש שבוטל נחסם", async () => {
    const { userAccessAllowed } = await access();
    findUnique.mockResolvedValueOnce(ACTIVE);
    expect(await userAccessAllowed("usr_a")).toBe(true);
    findUnique.mockResolvedValueOnce(REVOKED);
    expect(await userAccessAllowed("usr_b")).toBe(false);
  });

  it("משתמש שנמחק נחסם כמו משתמש שבוטל", async () => {
    const { userAccessAllowed } = await access();
    findUnique.mockResolvedValueOnce(null);
    expect(await userAccessAllowed("usr_gone")).toBe(false);
  });

  it("בקשה חוזרת בתוך חלון המטמון לא פונה למסד שוב", async () => {
    const { userAccessAllowed } = await access();
    findUnique.mockResolvedValue(ACTIVE);
    await userAccessAllowed("usr_a");
    await userAccessAllowed("usr_a");
    await userAccessAllowed("usr_a");
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it("ביטול תופס תוך שניות ספורות — זו כל ההגנה, ואין ניקוי מפורש", async () => {
    const { userAccessAllowed } = await access();
    findUnique.mockResolvedValueOnce(ACTIVE);
    expect(await userAccessAllowed("usr_a")).toBe(true);

    // ‏TTL קצר: אחרי עשר שניות הבדיקה חוזרת למסד והביטול נאכף
    vi.setSystemTime(new Date("2026-08-27T09:00:10Z"));
    findUnique.mockResolvedValueOnce(REVOKED);
    expect(await userAccessAllowed("usr_a")).toBe(false);
    expect(findUnique).toHaveBeenCalledTimes(2);
  });

  it("חלון הסחיפה קצר מ-10 שניות — נעול, כי זה הגבול היחיד שיש", async () => {
    const { userAccessAllowed } = await access();
    findUnique.mockResolvedValue(ACTIVE);
    await userAccessAllowed("usr_a");
    vi.setSystemTime(new Date("2026-08-27T09:00:10Z"));
    await userAccessAllowed("usr_a");
    expect(findUnique).toHaveBeenCalledTimes(2);
  });

  it("תשובת 'חסום' לא נשמרת — החזרת גישה תופסת מיד, בלי חלון המתנה", async () => {
    const { userAccessAllowed } = await access();
    findUnique.mockResolvedValueOnce(REVOKED);
    expect(await userAccessAllowed("usr_a")).toBe(false);
    // הבעלים החזיר גישה באותה שנייה — הבקשה הבאה כבר עוברת
    findUnique.mockResolvedValueOnce(ACTIVE);
    expect(await userAccessAllowed("usr_a")).toBe(true);
  });

  it("תקלת מסד לא נועלת את הבעלים בחוץ — הסמכות היא currentUser", async () => {
    const { userAccessAllowed } = await access();
    findUnique.mockRejectedValueOnce(new Error("אין חיבור"));
    expect(await userAccessAllowed("usr_owner")).toBe(true);
  });

  it("כשל אינו נכנס למטמון — הבקשה הבאה מנסה שוב", async () => {
    const { userAccessAllowed } = await access();
    findUnique.mockRejectedValueOnce(new Error("אין חיבור"));
    expect(await userAccessAllowed("usr_b")).toBe(true);
    findUnique.mockResolvedValueOnce(REVOKED);
    expect(await userAccessAllowed("usr_b")).toBe(false);
  });
});
