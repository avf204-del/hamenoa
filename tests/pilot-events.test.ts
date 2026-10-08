// האנליטיקה העצמית (החלטה 35, D-8). הכלל שהמודול קיים בשבילו: רישום אירוע
// **לעולם לא זורק** — הוא תצפית, לא חלק מהעסקה. אם כישלון מסד כאן יפיל
// סיום אימון, המדידה תזיק יותר משתועיל.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { pilotEvent: { create } } }));

import {
  CLIENT_EVENTS,
  PILOT_EVENTS,
  isClientEvent,
  isValidVisitId,
  recordEvent,
} from "../src/lib/pilot-events";

/** הארגומנט של create בקריאה האחרונה */
function lastData(): Record<string, unknown> {
  const call = create.mock.calls.at(-1) as [{ data: Record<string, unknown> }];
  return call[0].data;
}

describe("רשימת האירועים", () => {
  it("ללא כפילויות, וכוללת את צעדי המשפך המרכזיים", () => {
    expect(new Set(PILOT_EVENTS).size).toBe(PILOT_EVENTS.length);
    for (const name of [
      "landing_view",
      "signup",
      "legal_accepted",
      "health_screened",
      "session_completed",
      "account_deleted",
    ]) {
      expect(PILOT_EVENTS).toContain(name);
    }
  });

  it("אירועי הלקוח הם תת-קבוצה של הרשימה המלאה", () => {
    for (const name of CLIENT_EVENTS) expect(PILOT_EVENTS).toContain(name);
  });

  it("isClientEvent מקבל רק את שני אירועי דף הנחיתה", () => {
    expect(isClientEvent("landing_view")).toBe(true);
    expect(isClientEvent("landing_cta")).toBe(true);
    // אירוע אמיתי, אבל לא כזה שהדפדפן רשאי לזייף
    expect(isClientEvent("signup")).toBe(false);
    expect(isClientEvent("session_completed")).toBe(false);
    expect(isClientEvent("")).toBe(false);
    expect(isClientEvent(null)).toBe(false);
    expect(isClientEvent(42)).toBe(false);
  });
});

describe("isValidVisitId", () => {
  it("אותיות קטנות וספרות, 6 עד 32 תווים", () => {
    expect(isValidVisitId("abc123")).toBe(true);
    expect(isValidVisitId("a1b2c3d4e5f6")).toBe(true);
    expect(isValidVisitId("a".repeat(32))).toBe(true);
  });

  it("דוחה קצר מדי, ארוך מדי, אותיות גדולות, תווים חריגים ולא-מחרוזת", () => {
    expect(isValidVisitId("abc12")).toBe(false);
    expect(isValidVisitId("a".repeat(33))).toBe(false);
    expect(isValidVisitId("ABC123")).toBe(false);
    expect(isValidVisitId("abc-123")).toBe(false);
    expect(isValidVisitId(undefined)).toBe(false);
    expect(isValidVisitId(123456)).toBe(false);
  });
});

describe("recordEvent", () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("כותב שורה עם השם והשדות שהועברו", async () => {
    await recordEvent("signup", {
      userId: "usr_1",
      userRole: "tester",
      visitId: "abc123def456",
      path: "/",
      props: { source: "google" },
    });
    expect(lastData()).toMatchObject({
      name: "signup",
      userId: "usr_1",
      userRole: "tester",
      visitId: "abc123def456",
      path: "/",
      props: { source: "google" },
    });
  });

  it("שדות חסרים נשמרים כ-null, ואירוע בלי props נשאר בלי props", async () => {
    await recordEvent("landing_view");
    const data = lastData();
    expect(data.userId).toBe(null);
    expect(data.userRole).toBe(null);
    expect(data.visitId).toBe(null);
    expect(data.path).toBe(null);
    expect(data.props).toBe(undefined);
  });

  it("props מסונן לערכים פשוטים בלבד — אובייקט מקונן לא נכנס לטבלה", async () => {
    await recordEvent("session_completed", {
      props: {
        score: 82,
        flagged: false,
        note: null,
        nested: { secret: "אסור" },
        list: [1, 2, 3],
        missing: undefined,
      },
    });
    expect(lastData().props).toEqual({ score: 82, flagged: false, note: null });
  });

  it("נתיב ארוך נחתך ל-200 תווים", async () => {
    await recordEvent("landing_view", { path: `/${"a".repeat(500)}` });
    expect(String(lastData().path)).toHaveLength(200);
  });

  it("כישלון מסד לא זורק — רק נרשם ללוג", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    create.mockRejectedValue(new Error("המסד נפל"));
    await expect(recordEvent("login")).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalled();
  });
});
