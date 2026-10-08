import type { Metadata } from "next";
import Link from "next/link";
import ConsentForm from "@/components/legal/ConsentForm";
import ConsentSummaryBlock from "@/components/legal/ConsentSummaryBlock";
import LegalDocumentView from "@/components/legal/LegalDocumentView";
import PublicShell from "@/components/public/PublicShell";
import { TERMS, TERMS_EN, fillDocument, legalDocument, operatorInfo } from "@/legal";
import { translator } from "@/i18n";
import { displayPrefs } from "@/i18n/server";
import { currentUser } from "@/lib/current-user";
import { legalAccepted } from "@/lib/onboarding";

// תנאי השימוש (סבב 35, D-5). לעמוד הזה שני מצבים באותה כתובת:
//
// • **מצב אישור** — משתמש מזוהה שטרם אישר את הגרסה הנוכחית. הוא רואה קודם
//   את התקציר בשפה פשוטה, ואחריו את המסמך המלא (עוגן #full). זה המסך
//   שאליו שער ה-onboarding שולח, ולכן הוא חייב לשבת **מחוץ** לקבוצת
//   (app) — אחרת הפריסה הייתה מפנה אותו לעצמו בלולאה.
// • **מצב קריאה** — אורח אנונימי (העמוד ציבורי ומאונדקס) או מי שכבר אישר.
//   רק המסמך, בלי תיבת סימון ובלי כפתור.
//
// הנוסח כולו מגיע מ-src/legal אחרי fillDocument — אין כאן טקסט משפטי.

export async function generateMetadata(): Promise<Metadata> {
  const t = translator((await displayPrefs()).locale);
  return {
    title: t(TERMS.shortTitle, TERMS_EN.shortTitle),
    description: t(
      "תנאי השימוש של המנוע — מהות השירות, מה באחריותך, וגבולות האחריות של המפעיל.",
      "Hamenoa's terms of use — what the service is, what is your responsibility, and the limits of the operator's liability.",
    ),
    robots: { index: true, follow: true },
  };
}

export default async function TermsPage() {
  const user = await currentUser();
  const { locale } = await displayPrefs();
  const t = translator(locale);
  const doc = fillDocument(legalDocument("terms", locale), operatorInfo(), locale);
  const needsConsent = !!user && !legalAccepted(user);

  return (
    <PublicShell
      user={user ? { name: user.name } : null}
      step={needsConsent ? t("שלב 1 מתוך 2 — אישור התנאים", "Step 1 of 2 — accept the terms") : null}
    >
      <div className="py-6">
        {needsConsent ? (
          <>
            <ConsentSummaryBlock locale={locale} />
            <ConsentForm />
            <section
              id="full"
              className="mt-8 scroll-mt-20 border-t border-line pt-6"
            >
              {/* h2 ולא h1: הכותרת הראשית של המסך היא תקציר ההסכמה
                  (ביקורת סבב 35, UX-5) */}
              <LegalDocumentView doc={doc} headingLevel={2} locale={locale} />
            </section>
          </>
        ) : (
          <>
            <LegalDocumentView doc={doc} locale={locale} />
            <p className="mt-10 border-t border-line pt-5 text-sm leading-relaxed text-fg-2">
              {t("יש שאלות?", "Questions?")}{" "}
              <Link
                href="/contact"
                className="font-semibold text-accent underline decoration-line-strong underline-offset-4 transition-opacity duration-(--t-quick) hover:opacity-80"
              >
                {t("צור קשר", "Contact us")}
              </Link>
            </p>
          </>
        )}
      </div>
    </PublicShell>
  );
}
