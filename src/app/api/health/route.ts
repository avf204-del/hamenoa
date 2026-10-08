import { NextResponse } from "next/server";
import { HEALTH_QUESTIONS, HEALTH_SCREEN_VERSION } from "@/legal";
import { writeGate } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { recordEvent } from "@/lib/pilot-events";

// שמירת שאלון הבריאות (החלטה 35, D-6).
//
// `writeGate({ requireHealth: false })` ולא `userGate`: המסמכים המשפטיים
// כן נדרשים כאן (התשובות הן מידע בריאותי, ומדיניות הפרטיות היא מה שמסביר
// מה נעשה איתן), אבל דרישת השאלון עצמו הייתה חוסמת את המסלול שנועד למלא
// אותו.
//
// הוולידציה קפדנית בכוונה: מפתחות התשובות חייבים להיות **בדיוק** מזהי
// השאלות של הגרסה הנוכחית. תשובה חלקית או שאלה שהומצאה בלקוח היא באג, לא
// קלט לגיטימי — ורשומה חלקית כאן היא בדיוק מה שלא רוצים במידע בריאותי.

const QUESTION_IDS = HEALTH_QUESTIONS.map((q) => q.id);

function bad(error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(request: Request) {
  const gate = await writeGate({ requireHealth: false });
  if ("response" in gate) return gate.response;

  const body = (await request.json().catch(() => null)) as {
    answers?: unknown;
    acknowledged?: unknown;
  } | null;
  if (!body || typeof body !== "object") return bad("גוף הבקשה לא תקין");

  const raw = body.answers;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return bad("חסרות תשובות לשאלון");
  }
  const keys = Object.keys(raw as Record<string, unknown>);
  const sameSet =
    keys.length === QUESTION_IDS.length && QUESTION_IDS.every((id) => keys.includes(id));
  if (!sameSet) return bad("יש לענות על כל השאלות");

  const answers: Record<string, boolean> = {};
  for (const id of QUESTION_IDS) {
    const value = (raw as Record<string, unknown>)[id];
    if (typeof value !== "boolean") return bad("יש לענות על כל השאלות");
    answers[id] = value;
  }

  const flagged = QUESTION_IDS.some((id) => answers[id]);
  const acknowledged = body.acknowledged === true;
  if (flagged && !acknowledged) {
    return bad("כדי להמשיך יש לאשר את ההמלצה לפנות לרופא/ה");
  }

  await prisma.user.update({
    where: { id: gate.userId },
    data: {
      healthScreenedAt: new Date(),
      healthScreenVersion: HEALTH_SCREEN_VERSION,
      healthFlagged: flagged,
      healthAnswers: { answers, acknowledged },
    },
  });

  void recordEvent("health_screened", {
    userId: gate.userId,
    userRole: gate.user.role,
    props: { flagged },
  });

  return NextResponse.json({ ok: true, flagged });
}
