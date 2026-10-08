// מחיקת חשבון בידי המשתמש (החלטה 35, D-12).
//
// שלוש דרישות מהותיות נבדקות כאן, ולא רק "נראה נכון בקוד":
// • **המפעיל חסום** — מחיקת רשומת הבעלים נועלת את לוח הניהול ואת הכניסה
//   בסיסמה, ולכן היא לא פעולה ממסך החשבון.
// • **סדר הפעולות**: האירוע נרשם לפני האנונימיזציה, אחרת הוא עצמו היה
//   נשאר נושא מזהה של משתמש מחוק. אירועים מאונמים ולא נמחקים (D-8),
//   ואילו משוב — טקסט חופשי שהמשתמש כתב — נמחק.
// • **העוגייה נמחקת** באותה תשובה, אחרת הדפדפן ממשיך לשלוח אסימון של
//   משתמש שכבר לא קיים.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { AUTH_COOKIE } from "../src/lib/auth";

const {
  userGate,
  recordEvent,
  pilotEventUpdateMany,
  feedbackDeleteMany,
  userDelete,
} = vi.hoisted(() => ({
  userGate: vi.fn(),
  recordEvent: vi.fn(),
  pilotEventUpdateMany: vi.fn(),
  feedbackDeleteMany: vi.fn(),
  userDelete: vi.fn(),
}));

vi.mock("@/lib/current-user", () => ({ userGate }));
vi.mock("@/lib/pilot-events", () => ({ recordEvent }));
vi.mock("@/lib/db", () => ({
  prisma: {
    pilotEvent: { updateMany: pilotEventUpdateMany },
    feedback: { deleteMany: feedbackDeleteMany },
    matchParticipant: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    user: { delete: userDelete },
  },
}));

import { DELETE } from "../src/app/api/me/route";

const TESTER = {
  id: "usr_t1",
  name: "דנה כהן",
  role: "tester" as const,
  disclaimerAcceptedAt: new Date(),
  legalVersion: 3,
  healthScreenedAt: new Date(),
  healthScreenVersion: 1,
};

function request(): NextRequest {
  return new NextRequest("http://localhost/api/me", { method: "DELETE" });
}

describe("DELETE /api/me", () => {
  beforeEach(() => {
    recordEvent.mockReset().mockResolvedValue(undefined);
    pilotEventUpdateMany.mockReset().mockResolvedValue({ count: 4 });
    feedbackDeleteMany.mockReset().mockResolvedValue({ count: 1 });
    userDelete.mockReset().mockResolvedValue({ id: TESTER.id });
    userGate.mockReset().mockResolvedValue({ userId: TESTER.id, user: TESTER });
  });

  it("שער חסום — התשובה שלו מוחזרת כמו שהיא, ושום דבר לא נמחק", async () => {
    const blocked = Response.json({ ok: false }, { status: 401 });
    userGate.mockResolvedValue({ response: blocked });

    const res = await DELETE(request());
    expect(res.status).toBe(401);
    expect(userDelete).not.toHaveBeenCalled();
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it("המפעיל מקבל 403 בעברית, ושום דבר לא נמחק", async () => {
    userGate.mockResolvedValue({
      userId: "usr_owner",
      user: { ...TESTER, id: "usr_owner", role: "owner" },
    });

    const res = await DELETE(request());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      ok: false,
      error: "המפעיל לא יכול למחוק את החשבון מכאן",
    });
    expect(userDelete).not.toHaveBeenCalled();
    expect(pilotEventUpdateMany).not.toHaveBeenCalled();
    expect(feedbackDeleteMany).not.toHaveBeenCalled();
  });

  it("מתאמן — האירוע נרשם עם התפקיד, לפני שהמזהה מנוקה מהאירועים", async () => {
    const order: string[] = [];
    recordEvent.mockImplementation(async () => {
      order.push("event");
    });
    pilotEventUpdateMany.mockImplementation(async () => {
      order.push("anonymize");
      return { count: 4 };
    });

    await DELETE(request());

    expect(recordEvent).toHaveBeenCalledWith("account_deleted", {
      userId: TESTER.id,
      userRole: "tester",
    });
    expect(order).toEqual(["event", "anonymize"]);
  });

  it("אירועי הפיילוט מאונמים ולא נמחקים; המשוב נמחק; המשתמש נמחק", async () => {
    const res = await DELETE(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    expect(pilotEventUpdateMany).toHaveBeenCalledWith({
      where: { userId: TESTER.id },
      data: { userId: null },
    });
    expect(feedbackDeleteMany).toHaveBeenCalledWith({ where: { userId: TESTER.id } });
    expect(userDelete).toHaveBeenCalledWith({ where: { id: TESTER.id } });
  });

  it("עוגיית הכניסה נמחקת באותה תשובה", async () => {
    const res = await DELETE(request());
    const cookie = res.cookies.get(AUTH_COOKIE);
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
    expect(cookie?.path).toBe("/");
    expect(cookie?.httpOnly).toBe(true);
  });
});
