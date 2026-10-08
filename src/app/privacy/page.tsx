import type { Metadata } from "next";
import Link from "next/link";
import LegalDocumentView from "@/components/legal/LegalDocumentView";
import PublicShell from "@/components/public/PublicShell";
import { PRIVACY, PRIVACY_EN, fillDocument, legalDocument, operatorInfo } from "@/legal";
import { translator } from "@/i18n";
import { displayPrefs } from "@/i18n/server";
import { currentUser } from "@/lib/current-user";
import { legalAccepted } from "@/lib/onboarding";

// מדיניות הפרטיות (סבב 35, D-5) — קריאה בלבד, בכל מצב. אין כאן אישור:
// האישור נעשה פעם אחת ב-/terms ומכסה את שני המסמכים יחד.
//
// מי שהגיע לכאן באמצע זרימת האישור (לחץ "למדיניות הפרטיות" במסך האישור)
// מקבל בתחתית פס דביק שמחזיר אותו בדיוק לאן שהיה — בלי לחפש כפתור חזרה.
//
// מחוץ לקבוצת (app) בכוונה, כמו /terms: משתמש שטרם אישר חייב להיות מסוגל
// לקרוא את המסמך בלי ששער ה-onboarding יזרוק אותו בחזרה.

export async function generateMetadata(): Promise<Metadata> {
  const t = translator((await displayPrefs()).locale);
  return {
    title: t(PRIVACY.shortTitle, PRIVACY_EN.shortTitle),
    description: t(
      "מדיניות הפרטיות של המנוע — איזה מידע נאסף, למה, מי רואה אותו, איפה הוא נשמר ומה הזכויות שלך.",
      "Hamenoa's privacy policy — what information is collected, why, who sees it, where it is stored and what your rights are.",
    ),
    robots: { index: true, follow: true },
  };
}

export default async function PrivacyPage() {
  const user = await currentUser();
  const { locale } = await displayPrefs();
  const t = translator(locale);
  const doc = fillDocument(legalDocument("privacy", locale), operatorInfo(), locale);
  const midConsent = !!user && !legalAccepted(user);

  return (
    <PublicShell user={user ? { name: user.name } : null}>
      <div className="py-8">
        <LegalDocumentView doc={doc} locale={locale} />

        {midConsent ? (
          <div className="sticky bottom-0 mt-10 border-t border-line bg-app/90 py-4 backdrop-blur-md">
            <Link
              href="/terms"
              className="flex min-h-11 w-full items-center justify-center rounded-(--r-m) bg-accent px-6 py-3.5 text-base font-bold text-on-accent transition-colors duration-(--t-quick) hover:bg-accent-hi"
            >
              {t("חזרה לאישור התנאים", "Back to accepting the terms")}
            </Link>
          </div>
        ) : (
          <p className="mt-10 border-t border-line pt-5 text-sm leading-relaxed text-fg-2">
            {t("יש שאלות?", "Questions?")}{" "}
            <Link
              href="/contact"
              className="font-semibold text-accent underline decoration-line-strong underline-offset-4 transition-opacity duration-(--t-quick) hover:opacity-80"
            >
              {t("צור קשר", "Contact us")}
            </Link>
          </p>
        )}
      </div>
    </PublicShell>
  );
}
