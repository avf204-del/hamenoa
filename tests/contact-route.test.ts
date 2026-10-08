// POST /api/contact (סבב 35, D-11).
//
// זה הראוט הציבורי היחיד שכותב למסד, ולכן שלוש ההגנות שלו נבדקות
// במפורש: מלכודת הדבש (204 בלי שמירה), מגבלת חמש פניות לשעה לכתובת,
// והוולידציה. בנוסף נבדק שהוא **לא** דורש כניסה — אבל מקשר את הפנייה
// למשתמש כשיש עוגייה תקפה.

import { beforeEach, describe, expect, it, vi } from "vitest";

const { create, currentUser, recordEvent } = vi.hoisted(() => ({
  create: vi.fn(),
  currentUser: vi.fn(),
  recordEvent: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: { feedback: { create } } }));
vi.mock("@/lib/current-user", () => ({ currentUser }));
vi.mock("@/lib/pilot-events", () => ({ recordEvent }));

import { POST } from "../src/app/api/contact/route";
import { resetRateLimits } from "../src/lib/rate-limit";

const MESSAGE = "נתקעתי בכניסה עם גוגל";

function post(body: unknown, ip = "203.0.113.7"): Request {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/contact", () => {
  beforeEach(() => {
    resetRateLimits();
    create.mockReset().mockResolvedValue({ id: "fb_1" });
    recordEvent.mockReset().mockResolvedValue(undefined);
    currentUser.mockReset().mockResolvedValue(null);
  });

  it("אורח אנונימי — הפנייה נשמרת עם kind='contact' ו-userId ריק", async () => {
    const res = await POST(
      post({ name: "דנה", email: "dana@example.com", message: MESSAGE }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const data = create.mock.calls[0][0].data as Record<string, unknown>;
    expect(data).toEqual({
      kind: "contact",
      userId: null,
      name: "דנה",
      email: "dana@example.com",
      text: MESSAGE,
    });
    expect(recordEvent).toHaveBeenCalledWith("contact_sent", {
      userId: null,
      userRole: null,
    });
  });

  it("משתמש מזוהה — הפנייה מקושרת אליו", async () => {
    currentUser.mockResolvedValue({ id: "usr_t1", name: "מתאמן", role: "tester" });
    await POST(post({ message: MESSAGE }));
    const data = create.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.userId).toBe("usr_t1");
    expect(recordEvent).toHaveBeenCalledWith("contact_sent", {
      userId: "usr_t1",
      userRole: "tester",
    });
  });

  it("כשל בזיהוי אינו כשל בפנייה — היא נשמרת אנונימית", async () => {
    currentUser.mockRejectedValue(new Error("אין עוגייה"));
    const res = await POST(post({ message: MESSAGE }));
    expect(res.status).toBe(200);
    expect(create.mock.calls[0][0].data.userId).toBeNull();
  });

  it("מלכודת דבש — 204 בלי שמירה ובלי אירוע", async () => {
    const res = await POST(post({ message: MESSAGE, website: "spam.example" }));
    expect(res.status).toBe(204);
    expect(create).not.toHaveBeenCalled();
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it("הודעה קצרה מדי — 400 עם הודעה בעברית", async () => {
    const res = await POST(post({ message: "היי" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error.length).toBeGreaterThan(0);
    expect(create).not.toHaveBeenCalled();
  });

  it("מעל חמש פניות לשעה מאותה כתובת — 429 עם retry-after", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await POST(post({ message: MESSAGE }))).status).toBe(200);
    }
    const blocked = await POST(post({ message: MESSAGE }));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    expect(create).toHaveBeenCalledTimes(5);
  });

  it("המגבלה היא לפי כתובת — פונה אחר לא נחסם בגללה", async () => {
    for (let i = 0; i < 5; i++) await POST(post({ message: MESSAGE }));
    const other = await POST(post({ message: MESSAGE }, "198.51.100.4"));
    expect(other.status).toBe(200);
  });

  it("כשל מסד מוחזר כ-500 מוסבר, לא כקריסה", async () => {
    create.mockRejectedValue(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(post({ message: MESSAGE }));
    expect(res.status).toBe(500);
    expect((await res.json()) as { ok: boolean }).toMatchObject({ ok: false });
    spy.mockRestore();
  });
});
