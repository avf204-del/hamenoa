import Link from "next/link";
import CtaLink from "@/components/landing/CtaLink";
import { startTarget } from "@/components/landing/cta";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import { Mark } from "@/components/icons";
import { googleAuthEnabled } from "@/lib/google-auth";
import { operatorInfo, operatorName } from "@/legal";
import { dirOf, translator, type T } from "@/i18n";
import { LocaleProvider } from "@/i18n/client";
import { displayPrefs } from "@/i18n/server";

// המעטפת של כל עמוד ציבורי (D-14): דף הנחיתה, התנאים, הפרטיות, יצירת
// הקשר ושאלון הבריאות. רכיב שרת — הוא קורא את דגל גוגל ואת פרטי המפעיל,
// ומשאיר ללקוח רק את מה שחייב לרוץ בדפדפן (ThemeToggle, CtaLink).
//
// למה לא Header.tsx הקיים: הוא מייעד את עצמו למשתמש מזוהה (AccountMenu),
// ומתחתיו יושב BottomNav שכל יעדיו מאחורי הכניסה. לאורח צריך כותרת אחרת
// לגמרי — ניווט שיווקי קצר ופוטר עם הקישורים המשפטיים.

export interface PublicShellLink {
  href: string;
  label: string;
}

// "השיטה" הוסר מהפוטר בסבב 41 (D-8) — עמוד /method הציבורי נמחק כליל.
const footerLinks = (t: T): PublicShellLink[] => [
  { href: "/terms", label: t("תנאי שימוש", "Terms of use") },
  { href: "/privacy", label: t("מדיניות פרטיות", "Privacy policy") },
  { href: "/contact", label: t("צור קשר", "Contact us") },
];

// מחליף השפה בכותרת (C1): מבקר בוחר אנגלית לפני הכניסה ולפני האישור.
// המעטפת מספקת את ה-LocaleProvider לכל רכיבי הלקוח שבתוכה.
export default async function PublicShell({
  children,
  user = null,
  links = [],
  cta = false,
  wide = false,
  step = null,
}: {
  children: React.ReactNode;
  /** משתמש מזוהה שנחת בעמוד ציבורי — הכותרת מציעה לו חזרה לאפליקציה */
  user?: { name: string } | null;
  /** ניווט שיווקי קצר בכותרת. ריק = בלי ניווט (התנאים, הפרטיות, הבריאות) */
  links?: PublicShellLink[];
  /** כפתור "התחל" קטן בכותרת — רק בדף הנחיתה */
  cta?: boolean;
  /** עמודה רחבה (max-w-3xl) לדף הנחיתה; ברירת המחדל היא רוחב האפליקציה */
  wide?: boolean;
  /**
   * שלב בשרשרת הכניסה הראשונה ("שלב 1 מתוך 2 — אישור התנאים"). כשהוא
   * נמסר, הכותרת מציגה אותו **במקום** הקישור "חזרה לאפליקציה" (ביקורת
   * סבב 35, UX-2): הקישור הזה שלח את המשתמש ל-`/`, ושער ה-onboarding
   * החזיר אותו מיד לאותו מסך — מבוי סתום גלוי במסך הראשון של כל נרשם.
   */
  step?: string | null;
}) {
  const operator = operatorInfo();
  const display = await displayPrefs();
  const t = translator(display.locale);
  const start = startTarget(googleAuthEnabled(), display.locale);
  const column = wide ? "max-w-6xl" : "max-w-lg";

  return (
    <LocaleProvider locale={display.locale} units={display.units} timeZone={display.timeZone}>
    <div lang={display.locale} dir={dirOf(display.locale)} className="brand-entry flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-app/85 backdrop-blur-md">
        <div
          className={`mx-auto flex min-h-16 w-full ${column} items-center gap-3 px-5 flex-wrap py-2`}
        >
          {/* בשלבי הכניסה הראשונה גם הלוגו אינו קישור: כל דרך אל `/`
              מוחזרת מיד לאותו מסך בידי שער ה-onboarding (UX-2) */}
          {step ? (
            <span className="flex items-center gap-2">
              <Mark size={24} className="text-accent" />
              <span className="text-lg font-bold tracking-tight">{t("המנוע", "Hamenoa")}</span>
            </span>
          ) : (
            <Link
              href="/"
              className="flex items-center gap-2 transition-opacity duration-(--t-quick) hover:opacity-80"
            >
              <Mark size={24} className="text-accent" />
              <span className="text-lg font-bold tracking-tight">{t("המנוע", "Hamenoa")}</span>
            </Link>
          )}

          {links.length > 0 && (
            <nav className="ms-2 hidden items-center gap-5 text-sm text-fg-2 sm:flex">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="transition-colors duration-(--t-quick) hover:text-fg"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          )}

          <div className="ms-auto flex items-center gap-2 min-w-0 flex-wrap">
            <LanguageToggle />
            <ThemeToggle />
            {step ? (
              <span className="flex min-h-11 items-center text-sm font-medium text-fg-2">
                {step}
              </span>
            ) : user ? (
              <Link
                href="/"
                className="flex min-h-11 items-center rounded-(--r-s) border border-line px-3.5 text-sm font-semibold text-fg transition-colors duration-(--t-quick) hover:bg-raised"
              >
                {t("חזרה לאפליקציה", "Back to the app")}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex min-h-11 items-center px-2 text-sm font-medium text-fg-2 transition-colors duration-(--t-quick) hover:text-fg"
                >
                  {t("כניסה", "Sign in")}
                </Link>
                {cta && (
                  <CtaLink
                    href={start.href}
                    placement="header"
                    className="hidden min-h-11 items-center rounded-(--r-s) bg-accent px-4 text-sm font-bold text-on-accent transition-colors duration-(--t-quick) hover:bg-accent-hi sm:flex"
                  >
                    {start.label}
                  </CtaLink>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className={`mx-auto w-full ${column} px-5`}>{children}</div>
      </main>

      <footer className="mt-16 border-t border-line">
        <div className={`mx-auto w-full ${column} px-5 py-9`}>
          <div className="flex items-center gap-2 text-fg-2">
            <Mark size={20} className="text-accent" />
            <span className="font-bold">{t("המנוע", "Hamenoa")}</span>
          </div>
          {/* יעדי מגע של 44 פיקסלים בפוטר (ביקורת סבב 35, UX-7): הקישורים
              היו בגובה שורת טקסט (‏~20px) וצפופים זה לזה. הגובה מגיע מ-
              min-h-11 ולא מ-padding, כדי שהמרווח האנכי בין השורות יישאר
              נשלט; לכן גם gap-y ירד וה-mt הותאמו סביבו */}
          <nav className="mt-2 flex flex-wrap gap-x-5 text-sm">
            {footerLinks(t).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex min-h-11 items-center text-fg-2 transition-colors duration-(--t-quick) hover:text-fg"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="mt-1 text-xs leading-relaxed text-fg-3">
            <Link
              href="/credits"
              className="inline-flex min-h-11 items-center underline decoration-line-strong underline-offset-4 transition-colors duration-(--t-quick) hover:text-fg-2"
            >
              {t("מאגר התרגילים ממקורות פתוחים", "Exercise library from open sources")}
            </Link>
          </p>
          <p className="text-xs text-fg-3">
            © <span className="num">2026</span> {operatorName(operator, display.locale)}
          </p>
        </div>
      </footer>
    </div>
    </LocaleProvider>
  );
}
