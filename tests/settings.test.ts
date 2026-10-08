// הגדרות ההרשמה (החלטה 35, D-10). שלוש נקודות שהבדיקה שומרת עליהן:
// ברירת מחדל פתוחה כשאין שורה במסד, מטמון של עשר שניות (סגירה נכנסת לתוקף
// כמעט מיד, בלי סיבוב מסד בכל קולבק), וספירת התקרה שסופרת מתאמנים פעילים
// בלבד — לא את הבעלים ולא את משתמשי הסימולציה.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, upsert, count } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
  count: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    appSetting: { findUnique, upsert },
    user: { count },
  },
}));

import {
  getRegistrationSettings,
  registrationAllowed,
  resetSettingsCache,
  setRegistrationSettings,
} from "../src/lib/settings";

describe("הגדרות ההרשמה", () => {
  beforeEach(() => {
    findUnique.mockReset();
    upsert.mockReset();
    count.mockReset();
    resetSettingsCache();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-07T10:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("בלי שורה במסד — פיילוט פתוח בלי תקרה", async () => {
    findUnique.mockResolvedValue(null);
    expect(await getRegistrationSettings()).toEqual({ open: true, cap: null });
  });

  it("קורא את השורה, ומנקה ערכים שבורים לברירת המחדל שלהם", async () => {
    findUnique.mockResolvedValue({ value: { open: false, cap: 25 } });
    expect(await getRegistrationSettings()).toEqual({ open: false, cap: 25 });

    resetSettingsCache();
    findUnique.mockResolvedValue({ value: { open: true, cap: "הרבה" } });
    expect(await getRegistrationSettings()).toEqual({ open: true, cap: null });

    resetSettingsCache();
    findUnique.mockResolvedValue({ value: { cap: -5 } });
    expect(await getRegistrationSettings()).toEqual({ open: true, cap: null });
  });

  it("מטמון של 10 שניות: קריאה חוזרת לא פונה למסד, ואחרי החלון כן", async () => {
    findUnique.mockResolvedValue({ value: { open: true, cap: null } });
    await getRegistrationSettings();
    await getRegistrationSettings();
    expect(findUnique).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-09-07T10:00:11Z"));
    await getRegistrationSettings();
    expect(findUnique).toHaveBeenCalledTimes(2);
  });

  it("תקלת מסד לא סוגרת הרשמה בשקט — מוחזר הערך הידוע האחרון", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    findUnique.mockResolvedValue({ value: { open: false, cap: null } });
    await getRegistrationSettings();

    vi.setSystemTime(new Date("2026-09-07T10:00:11Z"));
    findUnique.mockRejectedValue(new Error("המסד נפל"));
    expect(await getRegistrationSettings()).toEqual({ open: false, cap: null });
  });

  it("setRegistrationSettings כותב לשורת registration ומעדכן את המטמון", async () => {
    upsert.mockResolvedValue({});
    const saved = await setRegistrationSettings({ open: false, cap: 30 });
    expect(saved).toEqual({ open: false, cap: 30 });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: "registration" } }),
    );

    // נקרא מהמטמון, בלי פנייה נוספת למסד
    expect(await getRegistrationSettings()).toEqual({ open: false, cap: 30 });
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe("registrationAllowed", () => {
  beforeEach(() => {
    findUnique.mockReset();
    upsert.mockReset();
    count.mockReset();
    resetSettingsCache();
  });

  it("הרשמה סגורה → closed, בלי לספור בכלל", async () => {
    findUnique.mockResolvedValue({ value: { open: false, cap: null } });
    expect(await registrationAllowed()).toEqual({ ok: false, reason: "closed" });
    expect(count).not.toHaveBeenCalled();
  });

  it("פתוחה בלי תקרה → מותר, בלי ספירה", async () => {
    findUnique.mockResolvedValue({ value: { open: true, cap: null } });
    expect(await registrationAllowed()).toEqual({ ok: true });
    expect(count).not.toHaveBeenCalled();
  });

  it("תחת התקרה → מותר; בתקרה או מעליה → full", async () => {
    findUnique.mockResolvedValue({ value: { open: true, cap: 10 } });
    count.mockResolvedValue(9);
    expect(await registrationAllowed()).toEqual({ ok: true });

    count.mockResolvedValue(10);
    expect(await registrationAllowed()).toEqual({ ok: false, reason: "full" });
  });

  it("הספירה היא של מתאמנים פעילים בלבד — לא בעלים, לא סימולציה, לא מבוטלים", async () => {
    findUnique.mockResolvedValue({ value: { open: true, cap: 5 } });
    count.mockResolvedValue(1);
    await registrationAllowed();
    expect(count).toHaveBeenCalledWith({
      where: { role: "tester", revokedAt: null },
    });
  });
});
