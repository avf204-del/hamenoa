import { NextResponse } from "next/server";
import { ownerGate } from "@/lib/current-user";
import { reissueInvite, setInviteRevoked } from "@/lib/invites";

// פעולות על קוד הזמנה קיים — בעלים בלבד.
//
// PATCH { revoked: boolean } — ביטול/החזרת גישה. ביטול מנתק גם את המשתמש
//   שנוצר מהקוד: הבקשה הבאה שלו לא תזוהה, גם אם העוגייה עוד בתוקף.
// PATCH { reissue: true } — קוד חדש על אותה שורה. הקוד הישן מפסיק לעבוד,
//   אבל הנסיין נשאר קשור וחוזר לנתונים שלו. זה המסלול לנסיין שננעל בחוץ.

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await ownerGate();
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    revoked?: unknown;
    reissue?: unknown;
  } | null;

  try {
    if (body?.reissue === true) {
      const result = await reissueInvite(id);
      if (!result.ok) {
        return NextResponse.json(
          { ok: false, error: result.error },
          { status: result.status },
        );
      }
      return NextResponse.json({ ok: true, invite: result.invite });
    }

    if (typeof body?.revoked === "boolean") {
      const found = await setInviteRevoked(id, body.revoked);
      if (!found) {
        return NextResponse.json({ ok: false, error: "קוד לא נמצא" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "בקשה לא תקינה" }, { status: 400 });
  } catch (e) {
    console.error("עדכון קוד ההזמנה נכשל:", e);
    return NextResponse.json(
      { ok: false, error: "העדכון נכשל — בדוק את לוג השרת" },
      { status: 500 },
    );
  }
}
