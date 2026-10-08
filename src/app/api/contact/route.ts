import { NextResponse } from "next/server";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { validateContact } from "@/lib/feedback";
import { recordEvent } from "@/lib/pilot-events";
import { clientIp, globalLimit, rateLimit } from "@/lib/rate-limit";

// טופס יצירת הקשר (החלטה 35, D-11). **ראוט ציבורי** — הוא ערוץ הפנייה
// היחיד של מי שעוד לא נרשם, וגם של מי שכבר מחק את החשבון.
//
// שלוש הגנות, בסדר הזה:
// • חמש פניות לשעה לכתובת, ומעליהן תקרה גלובלית של 100 לשעה. הכתובת
//   מגיעה מכותרת שפרוקסי כותב, ולכן היא לבדה לא חוסמת ספאם מבוזר
//   (ביקורת סבב 35, SEC-3).
// • מלכודת דבש: שדה מוסתר בשם `website` שרק מכונה ממלאת. תשובה 204,
//   בלי שמירה ובלי הודעת שגיאה שתלמד את הבוט מה נתפס.
// • ולידציה במודול טהור (src/lib/feedback.ts), אותה אחת שרצה בדפדפן.
//
// אם במקרה יש עוגיית כניסה תקפה — הפנייה מקושרת למשתמש, כדי שאפשר יהיה
// לענות לו בהקשר. כישלון בזיהוי אינו כישלון בפנייה: היא נשמרת אנונימית.

export async function POST(request: Request) {
  const limit = rateLimit("contact", clientIp(request), {
    max: 5,
    windowMs: 3_600_000,
  });
  if (!limit.ok) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSec / 60));
    return NextResponse.json(
      {
        ok: false,
        error: `נשלחו כבר כמה פניות מכאן. נסה שוב בעוד ${minutes} דקות.`,
      },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSec) } },
    );
  }

  const ceiling = globalLimit("contact-global", { max: 100, windowMs: 3_600_000 });
  if (!ceiling.ok) {
    return NextResponse.json(
      { ok: false, error: "הטופס עמוס כרגע. נסה שוב בעוד שעה." },
      { status: 429, headers: { "retry-after": String(ceiling.retryAfterSec) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validateContact(body);
  if (parsed.ok === "honeypot") return new NextResponse(null, { status: 204 });
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const viewer = await currentUser().catch(() => null);

  try {
    await prisma.feedback.create({
      data: {
        kind: "contact",
        userId: viewer?.id ?? null,
        name: parsed.value.name,
        email: parsed.value.email,
        text: parsed.value.message,
      },
    });
  } catch (e) {
    console.error("שמירת פנייה נכשלה:", e);
    return NextResponse.json(
      { ok: false, error: "השליחה נכשלה — בדוק את לוג השרת" },
      { status: 500 },
    );
  }

  void recordEvent("contact_sent", {
    userId: viewer?.id ?? null,
    userRole: viewer?.role ?? null,
  });

  return NextResponse.json({ ok: true });
}
