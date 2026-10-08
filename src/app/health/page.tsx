import type { Metadata } from "next";
import { redirect } from "next/navigation";
import HealthScreenForm from "@/components/health/HealthScreenForm";
import { parseStoredAnswers } from "@/components/health/health-logic";
import PublicShell from "@/components/public/PublicShell";
import { healthTexts } from "@/legal";
import { translator } from "@/i18n";
import { displayPrefs } from "@/i18n/server";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { healthScreened } from "@/lib/onboarding";

export async function generateMetadata(): Promise<Metadata> {
  const t = translator((await displayPrefs()).locale);
  return { title: t("שאלון בריאות", "Health questionnaire") };
}

// שאלון הבריאות (סבב 35, D-6). מחוץ לקבוצת (app) בכוונה — בדיוק כמו
// /terms: השער שמפנה לכאן יושב בפריסת האפליקציה, ועמוד בתוכה היה יוצר
// לולאת הפניות. המעטפת היא PublicShell (D-14), כמו בשאר שלבי הכניסה
// הראשונה, כי הניווט התחתון עדיין לא רלוונטי בשלב הזה.
//
// העמוד דורש משתמש מזוהה (הוא **לא** ב-PUBLIC_PATHS): שאלון בריאות של
// אורח אנונימי אין לאן לשמור.
//
// מי שכבר מילא את הגרסה הנוכחית מוחזר הביתה, אלא אם ביקש במפורש לעדכן
// (‏?update=1 מתפריט החשבון) — ואז התשובות הקודמות מוצגות כברירת מחדל.

export default async function HealthPage({
  searchParams,
}: {
  searchParams: Promise<{ update?: string | string[] }>;
}) {
  const user = await requireUser();
  const { update } = await searchParams;
  const wantsUpdate = (Array.isArray(update) ? update[0] : update) === "1";
  if (healthScreened(user) && !wantsUpdate) redirect("/");

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { healthAnswers: true },
  });
  const previous = parseStoredAnswers(row?.healthAnswers);
  const hasPrevious = Object.keys(previous.answers).length > 0;
  const { locale } = await displayPrefs();
  const t = translator(locale);
  const HEALTH_TEXTS = healthTexts(locale);

  return (
    <PublicShell
      user={{ name: user.name }}
      step={wantsUpdate ? null : t("שלב 2 מתוך 2 — שאלון בריאות", "Step 2 of 2 — health questionnaire")}
    >
      <div className="py-6">
        <h1 className="text-[1.75rem] font-bold leading-snug">
          {wantsUpdate ? t("עדכון שאלון הבריאות", "Update the health questionnaire") : HEALTH_TEXTS.title}
        </h1>
        <p className="mt-2 leading-relaxed text-fg-2">{HEALTH_TEXTS.intro}</p>

        <HealthScreenForm
          update={wantsUpdate}
          initialAnswers={hasPrevious ? previous.answers : null}
          initialAcknowledged={hasPrevious && previous.acknowledged}
          returnTo="/"
        />
      </div>
    </PublicShell>
  );
}
