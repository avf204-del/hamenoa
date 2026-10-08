// POST /api/feedback (סבב 35, D-11).
//
// שלוש דרישות מהותיות נבדקות כאן: השער (writeGate — מי שלא השלים את
// שרשרת הכניסה לא כותב אצלנו), השמירה עם kind="feedback", ומגבלת הקצב
// לפי משתמש. אירוע המדידה נשלח ולא מומתן — feedback_sent הוא אחד
// המדדים שלוח הפיילוט נשען עליהם.

import { beforeEach, describe, expect, it, vi } from "vitest";

const { create, writeGate, recordEvent } = vi.hoisted(() => ({
  create: vi.fn(),
  writeGate: vi.fn(),
  recordEvent: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: { feedback: { create } } }));
vi.mock("@/lib/current-user", () => ({ writeGate }));
vi.mock("@/lib/pilot-events", () => ({ recordEvent }));

import { POST } from "../src/app/api/feedback/route";
import { resetRateLimits } from "../src/lib/rate-limit";

const USER = { id: "usr_t1", name: "מתאמן", role: "tester" as const };

function post(body: unknown): Request {
  return new Request("http://localhost/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    resetRateLimits();
    create.mockReset().mockResolvedValue({ id: "fb_1" });
    recordEvent.mockReset().mockResolvedValue(undefined);
    writeGate.mockReset().mockResolvedValue({ userId: USER.id, user: USER });
  });

  it("שער חסום — התשובה שלו מוחזרת כמו שהיא, בלי כתיבה", async () => {
    const blocked = Response.json(
      { ok: false, code: "disclaimer-required" },
      { status: 403 },
    );
    writeGate.mockResolvedValue({ response: blocked });

    const res = await POST(post({ rating: 5 }));
    expect(res.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it("משוב תקין נשמר עם kind='feedback' ומזהה המשתמש", async () => {
    const res = await POST(post({ rating: 4, text: " נוח ", path: "/progress" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const data = create.mock.calls[0][0].data as Record<string, unknown>;
    expect(data).toEqual({
      kind: "feedback",
      userId: USER.id,
      rating: 4,
      text: "נוח",
      path: "/progress",
    });
  });

  it("נרשם אירוע feedback_sent עם הדירוג", async () => {
    await POST(post({ rating: 2, text: "כבד מדי" }));
    expect(recordEvent).toHaveBeenCalledWith("feedback_sent", {
      userId: USER.id,
      userRole: "tester",
      props: { rating: 2 },
    });
  });

  it("קלט פסול מוחזר כ-400 עם הודעה בעברית, בלי שמירה", async () => {
    const res = await POST(post({ rating: 9, text: "כן" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/בין 1 ל-5/);
    expect(create).not.toHaveBeenCalled();
  });

  it("גוף שאינו JSON נדחה ב-400 ולא מפיל את הראוט", async () => {
    const res = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: "לא-json",
      }),
    );
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("מעל 20 משובים בשעה — 429 עם retry-after, והשמירה נפסקת", async () => {
    for (let i = 0; i < 20; i++) {
      const ok = await POST(post({ rating: 3 }));
      expect(ok.status).toBe(200);
    }
    const blocked = await POST(post({ rating: 3 }));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    expect(create).toHaveBeenCalledTimes(20);
  });

  it("המגבלה היא לפי משתמש — משתמש אחר לא נחסם בגללו", async () => {
    for (let i = 0; i < 20; i++) await POST(post({ rating: 3 }));
    writeGate.mockResolvedValue({
      userId: "usr_t2",
      user: { ...USER, id: "usr_t2" },
    });
    const res = await POST(post({ rating: 3 }));
    expect(res.status).toBe(200);
  });
});
