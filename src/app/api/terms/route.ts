import { NextResponse } from "next/server";
import { LEGAL_VERSION } from "@/legal";
import { userGate } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { recordEvent } from "@/lib/pilot-events";

// אישור המסמכים המשפטיים (החלטה 26ד; גרסאות — החלטה 35, D-5).
//
// עד סבב 35 זו הייתה חותמת חד-פעמית שאישור חוזר לא נגע בה. מרגע שיש
// **גרסה**, ההיגיון מתהפך: אישור של נוסח חדש חייב לדרוס את הקודם, אחרת
// המשתמש נתקע במסך האישור לנצח. לכן `update` ולא `updateMany` מותנה.
//
// היומן (LegalAcceptance) הוא append-only ומחזיק את ההיסטוריה המלאה: מה
// אושר, באיזו גרסה ומתי. השדות שעל המשתמש הם רק המצב הנוכחי, לשער.

export async function POST() {
  const gate = await userGate();
  if ("response" in gate) return gate.response;

  const acceptedAt = new Date();
  await prisma.$transaction([
    prisma.legalAcceptance.create({
      data: { userId: gate.userId, version: LEGAL_VERSION, acceptedAt },
    }),
    prisma.user.update({
      where: { id: gate.userId },
      data: { disclaimerAcceptedAt: acceptedAt, legalVersion: LEGAL_VERSION },
    }),
  ]);

  void recordEvent("legal_accepted", {
    userId: gate.userId,
    userRole: gate.user.role,
    props: { version: LEGAL_VERSION },
  });

  return NextResponse.json({ ok: true, version: LEGAL_VERSION });
}
