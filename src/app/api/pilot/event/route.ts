import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/current-user";
import {
  isClientEvent,
  isValidVisitId,
  recordEvent,
  type PilotEventName,
} from "@/lib/pilot-events";
import { clientIp, globalLimit, rateLimit } from "@/lib/rate-limit";

// קליטת אירועי מדידה מהדפדפן (החלטה 35, D-8). **ראוט ציבורי** — הוא משרת
// גם את דף הנחיתה, לפני שיש בכלל משתמש.
//
// שלוש הגנות, כי כל אחד יכול לקרוא לו:
// • רק שמות מתוך CLIENT_EVENTS מתקבלים; שרת בלבד רושם את כל השאר.
// • כל שדה חסום באורך, ו-props מוגבל לקילובייט — הטבלה הזו לא תשמש כאחסון.
// • חלון קצב של 120 בקשות לדקה לכתובת, **ומעליו** תקרה גלובלית של 2,000
//   שורות לשעה. הכתובת מגיעה מכותרת שפרוקסי כותב, ולכן היא לבדה אינה
//   חסם על גדילת הטבלה (ביקורת סבב 35, SEC-3); התקרה הגלובלית היא.
//
// הראוט לא מחזיר גוף: 204 בהצלחה, 400 בקלט פגום, 429 בחריגת קצב. הוא גם
// לעולם לא מחזיר 500 — תקלה אצלנו אינה עניינו של דף הנחיתה.

const MAX_PATH = 200;
const MAX_PROPS_BYTES = 1024;

function bad(error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const limit = rateLimit("pilot-event", clientIp(request), {
      max: 120,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return new NextResponse(null, {
        status: 429,
        headers: { "retry-after": String(limit.retryAfterSec) },
      });
    }

    // התקרה שאי אפשר לעקוף בהחלפת כתובת: הכתיבה האנונימית היחידה במסד
    // חסומה ב-2,000 שורות לשעה בכל המערכת — כמה סדרי גודל מעל תנועת
    // פיילוט אמיתית, וחסם קשיח על גדילת הטבלה.
    const ceiling = globalLimit("pilot-event-global", {
      max: 2_000,
      windowMs: 3_600_000,
    });
    if (!ceiling.ok) {
      return new NextResponse(null, {
        status: 429,
        headers: { "retry-after": String(ceiling.retryAfterSec) },
      });
    }

    const body = (await request.json().catch(() => null)) as {
      name?: unknown;
      visitId?: unknown;
      path?: unknown;
      props?: unknown;
    } | null;
    if (!body || typeof body !== "object") return bad("גוף הבקשה לא תקין");

    if (!isClientEvent(body.name)) return bad("אירוע לא מוכר");
    const name = body.name as PilotEventName;

    if (!isValidVisitId(body.visitId)) return bad("מזהה ביקור לא תקין");

    if (body.path !== undefined && body.path !== null) {
      if (typeof body.path !== "string" || body.path.length > MAX_PATH) {
        return bad("נתיב לא תקין");
      }
    }
    const path = typeof body.path === "string" ? body.path : null;

    let props: Record<string, unknown> | null = null;
    if (body.props !== undefined && body.props !== null) {
      if (
        typeof body.props !== "object" ||
        Array.isArray(body.props) ||
        JSON.stringify(body.props).length > MAX_PROPS_BYTES
      ) {
        return bad("מאפייני האירוע לא תקינים");
      }
      props = body.props as Record<string, unknown>;
    }

    // מי שמחובר מסומן, כדי שלוח הפיילוט יוכל להחריג את הבעלים ממדדי הביקור.
    // כישלון כאן לא מעניין — האירוע נרשם אנונימי.
    const viewer = await currentUser().catch(() => null);

    await recordEvent(name, {
      userId: viewer?.id ?? null,
      userRole: viewer?.role ?? null,
      visitId: body.visitId,
      path,
      props,
    });

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("קליטת אירוע פיילוט נכשלה:", e);
    return new NextResponse(null, { status: 204 });
  }
}
