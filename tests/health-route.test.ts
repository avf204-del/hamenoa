// שמירת שאלון הבריאות (החלטה 35, D-6/D-7).
//
// שתי דרישות מהותיות נבדקות כאן ולא רק "נראה נכון בקוד":
// • **שלמות**: מפתחות התשובות חייבים להיות בדיוק מזהי השאלות של הגרסה
//   הנוכחית. רשומה חלקית של מידע בריאותי גרועה מאין רשומה.
// • **אישור אחרי סימון**: אם נענתה "כן" ולו פעם אחת, בלי `acknowledged`
//   אין שמירה — זה מה שהופך את ההמלצה לפנות לרופא/ה למשהו שנרשם.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { HEALTH_QUESTIONS, HEALTH_SCREEN_VERSION } from "../src/legal";

const { update, writeGate, recordEvent } = vi.hoisted(() => ({
  update: vi.fn(),
  writeGate: vi.fn(),
  recordEvent: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: { user: { update } } }));
vi.mock("@/lib/current-user", () => ({ writeGate }));
vi.mock("@/lib/pilot-events", () => ({ recordEvent }));

import { POST } from "../src/app/api/health/route";

const USER = { id: "usr_t1", name: "מתאמן", role: "tester" as const };

function post(body: unknown): Request {
  return new Request("http://localhost/api/health", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function allAnswers(value: boolean): Record<string, boolean> {
  return Object.fromEntries(HEALTH_QUESTIONS.map((q) => [q.id, value]));
}

describe("POST /api/health", () => {
  beforeEach(() => {
    update.mockReset().mockResolvedValue({});
    recordEvent.mockReset().mockResolvedValue(undefined);
    writeGate.mockReset().mockResolvedValue({ userId: USER.id, user: USER });
  });

  it("קורא ל-writeGate בלי דרישת בריאות — אחרת השאלון חוסם את עצמו", async () => {
    await POST(post({ answers: allAnswers(false) }));
    expect(writeGate).toHaveBeenCalledWith({ requireHealth: false });
  });

  it("שער חסום — התשובה שלו מוחזרת כמו שהיא, בלי כתיבה", async () => {
    const blocked = Response.json({ ok: false }, { status: 403 });
    writeGate.mockResolvedValue({ response: blocked });
    const res = await POST(post({ answers: allAnswers(false) }));
    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("הכול 'לא' — נשמר עם flagged=false ובלי צורך באישור", async () => {
    const res = await POST(post({ answers: allAnswers(false) }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, flagged: false });

    const data = update.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.healthFlagged).toBe(false);
    expect(data.healthScreenVersion).toBe(HEALTH_SCREEN_VERSION);
    expect(data.healthScreenedAt).toBeInstanceOf(Date);
    expect(data.healthAnswers).toEqual({
      answers: allAnswers(false),
      acknowledged: false,
    });
  });

  it("'כן' אחד בלי אישור — 400, ושום דבר לא נשמר", async () => {
    const answers = { ...allAnswers(false), [HEALTH_QUESTIONS[0].id]: true };
    const res = await POST(post({ answers }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false });
    expect(update).not.toHaveBeenCalled();
  });

  it("'כן' עם אישור — נשמר עם flagged=true", async () => {
    const answers = { ...allAnswers(false), [HEALTH_QUESTIONS[0].id]: true };
    const res = await POST(post({ answers, acknowledged: true }));
    expect(await res.json()).toEqual({ ok: true, flagged: true });
    const data = update.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.healthFlagged).toBe(true);
    expect(data.healthAnswers).toEqual({ answers, acknowledged: true });
  });

  it("תשובות חלקיות, מפתח מומצא, או ערך שאינו בוליאני — 400", async () => {
    const partial = { ...allAnswers(false) };
    delete partial[HEALTH_QUESTIONS[0].id];
    expect((await POST(post({ answers: partial }))).status).toBe(400);

    const extra = { ...allAnswers(false), "made-up": false };
    expect((await POST(post({ answers: extra }))).status).toBe(400);

    const wrongType = { ...allAnswers(false), [HEALTH_QUESTIONS[0].id]: "לא" };
    expect((await POST(post({ answers: wrongType }))).status).toBe(400);

    expect((await POST(post({}))).status).toBe(400);
    expect((await POST(post({ answers: [] }))).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("רושם אירוע health_screened עם הדגל, ולא חוסם את התשובה", async () => {
    await POST(post({ answers: allAnswers(false) }));
    expect(recordEvent).toHaveBeenCalledWith(
      "health_screened",
      expect.objectContaining({ userId: USER.id, props: { flagged: false } }),
    );
  });
});
