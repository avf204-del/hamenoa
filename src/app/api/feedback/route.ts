import { NextResponse } from "next/server";
import { writeGate } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { validateFeedback } from "@/lib/feedback";
import { recordEvent } from "@/lib/pilot-events";
import { rateLimit } from "@/lib/rate-limit";

// משוב מתוך האפליקציה (החלטה 35, D-11). ‏`writeGate` ולא `userGate`: זו
// כתיבה אישית לכל דבר, ומי שטרם השלים את שרשרת הכניסה הראשונה לא כותב
// לטבלאות שלנו — גם לא משוב.
//
// מגבלת הקצב היא לפי משתמש ולא לפי כתובת: המשוב מגיע ממי שכבר מזוהה,
// והמזהה שלו יציב יותר מכל IP.

export async function POST(request: Request) {
  const gate = await writeGate();
  if ("response" in gate) return gate.response;

  const limit = rateLimit("feedback", gate.userId, {
    max: 20,
    windowMs: 3_600_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "יותר מדי משובים בשעה האחרונה. נסה שוב מאוחר יותר." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSec) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validateFeedback(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  await prisma.feedback.create({
    data: {
      kind: "feedback",
      userId: gate.userId,
      rating: parsed.value.rating,
      text: parsed.value.text,
      path: parsed.value.path,
    },
  });

  void recordEvent("feedback_sent", {
    userId: gate.userId,
    userRole: gate.user.role,
    props: { rating: parsed.value.rating },
  });

  return NextResponse.json({ ok: true });
}
