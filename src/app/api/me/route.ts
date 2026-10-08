import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, cookieSecure } from "@/lib/auth";
import { userGate } from "@/lib/current-user";
import { purgeUser } from "@/lib/users";

// מי מחובר עכשיו (אבן דרך 8): שם ותפקיד בלבד — מספיק כדי להציג את שורת
// המשתמש, לחשוף את הקישור ל-/admin רק לבעלים, ולדעת מתי לשלוח ל-/login.

export async function GET() {
  const gate = await userGate();
  if ("response" in gate) return gate.response;
  return NextResponse.json({
    ok: true,
    user: { name: gate.user.name, role: gate.user.role },
  });
}

/**
 * מחיקת החשבון בידי המשתמש עצמו (החלטה 35, D-12).
 *
 * המחיקה מיידית ומלאה: ה-cascade בסכמה מוריד איתה את פרופילי המיקום, הכיול,
 * האימונים והבלוקים, ה-SetLog, המדדים והתוצאות וההזמנה. שני דברים מטופלים
 * כאן במפורש כי אינם cascade:
 * • ‏`Feedback` מוגדר SetNull — משוב שנשלח היה מזוהה, ולכן הוא **נמחק**
 *   ולא מנותק; מחיקת חשבון שמשאירה טקסט חופשי שהמשתמש כתב אינה מחיקה.
 * • ‏`PilotEvent` בכלל בלי מפתח זר — האירועים **מאונמים** (userId→null)
 *   ונשארים, כדי שמדדי הפיילוט ההיסטוריים לא ישתנו למפרע (D-8).
 *
 * הבעלים חסום כאן בכוונה: מחיקת רשומת הבעלים נועלת את לוח הניהול ואת
 * מסלול הכניסה בסיסמה. זו החלטת תשתית, לא פעולה ממסך החשבון.
 */
export async function DELETE(request: NextRequest) {
  const gate = await userGate();
  if ("response" in gate) return gate.response;
  const { userId, user } = gate;

  if (user.role === "owner") {
    return NextResponse.json(
      { ok: false, error: "המפעיל לא יכול למחוק את החשבון מכאן" },
      { status: 403 },
    );
  }

  // הרצף עצמו יושב ב-purgeUser (src/lib/users.ts), כי גם מסלול המפעיל
  // (‏/admin/users/[id]) חייב להריץ בדיוק אותו דבר — ראו את ההערה שם.
  await purgeUser(userId, user.role);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(request),
    path: "/",
    maxAge: 0,
  });
  return response;
}
