import type { Metadata } from "next";
import ContactForm from "@/components/public/ContactForm";
import PublicShell from "@/components/public/PublicShell";
import { currentUser } from "@/lib/current-user";
import { operatorInfo } from "@/legal";
import { translator } from "@/i18n";
import { displayPrefs } from "@/i18n/server";

// יצירת קשר (החלטה 35, D-11). עמוד ציבורי, מחוץ לקבוצת (app): הוא ערוץ
// הפנייה של מי שעדיין לא נרשם, של מי שנתקע בכניסה, ושל מי שכבר מחק את
// החשבון — ולכן הוא לא יכול לשבת מאחורי שער.
//
// ‏currentUser() ולא requireUser(): אורח מקבל את הטופס כמו שהוא, ומי
// שמחובר מקבל בנוסף קישור חזרה לאפליקציה בכותרת (דרך PublicShell).

export async function generateMetadata(): Promise<Metadata> {
  const t = translator((await displayPrefs()).locale);
  return {
    title: t("צור קשר", "Contact us"),
    description: t("שאלה, בעיה או רעיון על המנוע — כתוב לנו ונחזור אליך.", "A question, problem or idea about Hamenoa — write to us and we'll get back to you."),
    robots: { index: true, follow: true },
    alternates: { canonical: "/contact" },
  };
}

export default async function ContactPage() {
  const user = await currentUser();
  const operator = operatorInfo();
  const t = translator((await displayPrefs()).locale);

  return (
    <PublicShell user={user ? { name: user.name } : null}>
      <div className="py-10">
        <h1 className="text-[1.75rem] font-bold leading-snug">{t("צור קשר", "Contact us")}</h1>
        <p className="mt-2.5 leading-relaxed text-fg-2">
          {t(
            "שאלה, בעיה, רעיון? כתוב לנו — אדם אחד קורא את כל מה שנכנס לכאן, והפיילוט הזה משתנה בדיוק לפי מה שאתם אומרים.",
            "A question, a problem, an idea? Write to us — one person reads everything that comes in here, and this pilot changes based on exactly what you tell us.",
          )}
        </p>

        <ContactForm />

        {user && (
          <p className="mt-6 rounded-(--r-m) border border-line bg-raised p-3.5 text-sm leading-relaxed text-fg-2">
            {t(
              "אתה מחובר — אפשר גם לשלוח משוב קצר מתוך האפליקציה: תפריט החשבון בכותרת ← \"שלח משוב\".",
              "You're signed in — you can also send short feedback from within the app: the account menu in the header → \"Send feedback\".",
            )}
          </p>
        )}

        {operator.email && (
          <p className="mt-4 text-sm leading-relaxed text-fg-3">
            {t("מעדיף מייל?", "Prefer email?")} <span dir="ltr">{operator.email}</span>
          </p>
        )}
      </div>
    </PublicShell>
  );
}
