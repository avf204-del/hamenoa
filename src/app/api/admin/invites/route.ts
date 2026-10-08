import { NextResponse } from "next/server";
import { ownerGate } from "@/lib/current-user";
import { createInvite, listInvites } from "@/lib/invites";

// ניהול ההזמנות (אבן דרך 8, החלטה 21) — בעלים בלבד.
// GET  → כל הקודים: למי נועדו, מי מימש, מתי נראה לאחרונה, כמה אימונים.
// POST { label } → קוד חדש. הקוד נמסר אישית — מסלול משני לצד ההרשמה
//   העצמית בגוגל (החלטה 35).

export async function GET() {
  const gate = await ownerGate();
  if ("response" in gate) return gate.response;
  try {
    return NextResponse.json({ ok: true, invites: await listInvites() });
  } catch (e) {
    console.error("טעינת ההזמנות נכשלה:", e);
    return NextResponse.json(
      { ok: false, error: "טעינת ההזמנות נכשלה" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const gate = await ownerGate();
  if ("response" in gate) return gate.response;

  const body = (await request.json().catch(() => null)) as { label?: unknown } | null;
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  if (!label || label.length > 60) {
    return NextResponse.json(
      { ok: false, error: "צריך שם קצר למתאמן (עד 60 תווים)" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({ ok: true, invite: await createInvite(label) });
  } catch (e) {
    console.error("הנפקת קוד הזמנה נכשלה:", e);
    return NextResponse.json(
      { ok: false, error: "הנפקת הקוד נכשלה — בדוק את לוג השרת" },
      { status: 500 },
    );
  }
}
