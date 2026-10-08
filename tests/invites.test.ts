// קודי הזמנה (אבן דרך 8, החלטה 21; מקור הרשמה משני בסבב 35). כאן נבדק
// החלק הטהור — צורת הקוד וניקוי הקלט; הקוד נמסר בעל פה ובהודעה, ולכן חייב
// להיות חד-משמעי בקריאה ולסלוח על אופן ההקלדה בלי לסלוח על קוד שגוי — ובנוסף
// הפדיון עצמו (עם מסד מוקאה): מאיזה מקור נרשם המשתמש, ומתי נספר אירוע הרשמה.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { transaction, createUser, recordEvent } = vi.hoisted(() => ({
  transaction: vi.fn(),
  createUser: vi.fn(),
  recordEvent: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: { $transaction: transaction } }));
vi.mock("@/lib/users", () => ({ createUser }));
vi.mock("@/lib/pilot-events", () => ({ recordEvent }));

import {
  formatInviteCode,
  generateInviteCode,
  normalizeInviteCode,
  redeemInvite,
} from "../src/lib/invites";

const SHAPE = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

describe("קוד הזמנה", () => {
  it("הצורה קבועה: XXXX-XXXX, בלי תווים שאפשר לבלבל ביניהם", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateInviteCode();
      expect(code).toMatch(SHAPE);
      // 0/O ו-1/I/L הוצאו מהאלפבית בכוונה
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it("שני קודים רצופים אינם זהים", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateInviteCode()));
    expect(codes.size).toBe(50);
  });

  it("רווחים, מקפים ואותיות קטנות לא מכשילים כניסה", () => {
    const code = formatInviteCode("ABCD2345");
    expect(normalizeInviteCode("abcd2345")).toBe(code);
    expect(normalizeInviteCode("ABCD-2345")).toBe(code);
    expect(normalizeInviteCode("  abcd - 2345 ")).toBe(code);
    expect(normalizeInviteCode("AB CD 23 45")).toBe(code);
  });

  it("קלט שאינו קוד באורך הנכון נדחה", () => {
    expect(normalizeInviteCode("ABCD234")).toBe(null);
    expect(normalizeInviteCode("ABCD23456")).toBe(null);
    expect(normalizeInviteCode("")).toBe(null);
    expect(normalizeInviteCode(null)).toBe(null);
    expect(normalizeInviteCode(12345678)).toBe(null);
    expect(normalizeInviteCode("!!!!-!!!!")).toBe(null);
  });
});

/* ---------- פדיון: מקור ההרשמה ואירוע הפיילוט (סבב 35) ---------- */

const CODE = "ABCD-2345";

/** לקוח הטרנזקציה כפי ש-redeemOnce משתמש בו */
function tx(invite: Record<string, unknown> | null) {
  return {
    invite: {
      findUnique: vi.fn(async () => invite),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
  };
}

describe("פדיון קוד הזמנה", () => {
  beforeEach(() => {
    recordEvent.mockReset().mockResolvedValue(undefined);
    createUser.mockReset().mockResolvedValue({
      id: "usr_new",
      name: "דנה",
      role: "tester",
    });
    transaction.mockReset();
  });

  it("קוד שטרם נפדה יוצר משתמש עם signupSource 'invite'", async () => {
    const client = tx({ id: "inv_1", label: "דנה", revokedAt: null, usedAt: null, user: null });
    transaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(client));

    const result = await redeemInvite(CODE);
    expect(result).toEqual({
      ok: true,
      user: { id: "usr_new", name: "דנה", role: "tester" },
      created: true,
    });
    expect(createUser).toHaveBeenCalledWith(client, {
      name: "דנה",
      role: "tester",
      signupSource: "invite",
    });
  });

  it("יצירה כזו נספרת כאירוע הרשמה, עם המקור 'invite'", async () => {
    const client = tx({ id: "inv_1", label: "דנה", revokedAt: null, usedAt: null, user: null });
    transaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(client));

    await redeemInvite(CODE);
    expect(recordEvent).toHaveBeenCalledWith("signup", {
      userId: "usr_new",
      userRole: "tester",
      props: { source: "invite" },
    });
  });

  it("כניסה חוזרת של מתאמן קיים (קוד שהונפק מחדש) אינה הרשמה — אין אירוע", async () => {
    const client = tx({
      id: "inv_1",
      label: "דנה",
      revokedAt: null,
      usedAt: null,
      user: { id: "usr_old", name: "דנה", revokedAt: null },
    });
    transaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(client));

    const result = await redeemInvite(CODE);
    expect(result).toMatchObject({ ok: true, created: false });
    expect(createUser).not.toHaveBeenCalled();
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it("קוד לא תקין נדחה בלי לגעת במסד ובלי אירוע", async () => {
    const result = await redeemInvite("לא-קוד");
    expect(result).toEqual({ ok: false, error: "קוד ההזמנה לא תקין.", status: 400 });
    expect(transaction).not.toHaveBeenCalled();
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it("קוד שכבר נוצל נדחה, ואינו נספר כהרשמה", async () => {
    const client = tx({
      id: "inv_1",
      label: "דנה",
      revokedAt: null,
      usedAt: new Date(),
      user: null,
    });
    transaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(client));

    const result = await redeemInvite(CODE);
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(recordEvent).not.toHaveBeenCalled();
  });
});
