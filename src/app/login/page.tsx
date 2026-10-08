import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import ThemeToggle from "@/components/ThemeToggle";
import { Mark } from "@/components/icons";
import { currentUser } from "@/lib/current-user";
import { googleAuthEnabled } from "@/lib/google-auth";
import { prisma } from "@/lib/db";
import { safeNext } from "@/lib/safe-next";
import { googleErrorMessage } from "./google-errors";
import LanguageToggle from "@/components/LanguageToggle";
import { dirOf, translator } from "@/i18n";
import { LocaleProvider } from "@/i18n/client";
import { displayPrefs } from "@/i18n/server";

export const metadata: Metadata = { title: "כניסה" };

function firstParam(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value ?? null;
}

const SHELL =
  "brand-entry relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 pb-16 pt-24";

/**
 * מחליף ערכת הנושא בפינה העליונה (ביקורת סבב 35, UX-6). המסך הזה יושב
 * מחוץ ל-PublicShell ומחוץ לכותרת האפליקציה, ולכן היה המסך היחיד בכל
 * המוצר שבו אי אפשר לעבור בין כהה לבהיר. מוחלט (absolute) ולא שורה
 * בראש העמודה, כי העמודה ממורכזת אנכית — שורה רגילה הייתה נעה עם התוכן.
 */
function CornerToggle() {
  return (
    <div className="absolute inset-x-5 top-4 flex justify-end gap-2">
      <LanguageToggle />
      <ThemeToggle />
    </div>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string | string[];
    googleError?: string | string[];
    owner?: string | string[];
  }>;
}) {
  const { next: rawNext, googleError, owner } = await searchParams;
  const next = safeNext(rawNext);
  const display = await displayPrefs();
  const t = translator(display.locale);
  const wrap = (children: React.ReactNode) => (
    <LocaleProvider locale={display.locale} units={display.units} timeZone={display.timeZone}>
      <div lang={display.locale} dir={dirOf(display.locale)}>{children}</div>
    </LocaleProvider>
  );
  // רק קוד שברשימה הסגורה הופך להודעה; טקסט חופשי בכתובת לא מוצג (סבב 37)
  const googleErrorText = googleErrorMessage(googleError, display.locale);
  const googleEnabled = googleAuthEnabled();
  const ownerEntry = firstParam(owner) === "1";

  // מי שכבר מחובר לא צריך את טופס הכניסה — הוא כאן רק כדי לחבר גוגל
  // לחשבון הקיים שלו (זו הדרך הזולה שנבחרה לכפתור "חבר גוגל", ראו פריט 1).
  const user = await currentUser();
  if (user) {
    const linked = googleEnabled
      ? Boolean(
          (await prisma.user.findUnique({
            where: { id: user.id },
            select: { googleSub: true },
          }))?.googleSub,
        )
      : false;

    return wrap(
      <div className={SHELL}>
        <CornerToggle />
        <Mark size={38} className="text-accent" />
        <h1 className="mt-4 text-[1.75rem] font-bold leading-snug">
          {t(`מחובר/ת בתור ${user.name}`, `Signed in as ${user.name}`)}
        </h1>
        {googleErrorText && (
          <p
            role="alert"
            className="mt-4 rounded-(--r-s) bg-danger-soft px-3 py-2 text-sm leading-relaxed text-danger"
          >
            {googleErrorText}
          </p>
        )}
        {googleEnabled && !linked && (
          <>
            <p className="mt-2 leading-relaxed text-fg-2">
              {t("אפשר לחבר את חשבון הגוגל שלך — הכניסה הבאה תהיה בלחיצה אחת.", "You can link your Google account — next time, sign-in is one tap.")}
            </p>
            <a
              href="/api/auth/google?next=%2F"
              className="mt-5 flex min-h-11 w-full items-center justify-center rounded-(--r-m) bg-accent px-6 py-3.5 text-base font-bold text-on-accent transition-colors duration-(--t-quick) hover:bg-accent-hi"
            >
              {t("חבר גוגל", "Link Google")}
            </a>
          </>
        )}
        {googleEnabled && linked && (
          <p className="mt-2 leading-relaxed text-fg-2">
            {t("חשבון הגוגל שלך כבר מחובר.", "Your Google account is already linked.")}
          </p>
        )}
        <Link
          href="/"
          className="mt-5 flex min-h-11 w-full items-center justify-center rounded-(--r-m) border border-line px-6 py-3.5 text-base font-semibold text-fg transition-colors duration-(--t-quick) hover:bg-raised"
        >
          {t("חזרה לאפליקציה", "Back to the app")}
        </Link>
      </div>
    );
  }

  return wrap(
    <div className={SHELL}>
      <CornerToggle />
      <Mark size={38} className="text-accent" />
      <h1 className="mt-4 text-[1.75rem] font-bold leading-snug">{t("אימון עם כיוון", "A workout with direction")}</h1>
      <p className="mt-2 leading-relaxed text-fg-2">
        {googleEnabled
          ? t("כניסה עם Google. הפיילוט חינם; בכניסה הראשונה מאשרים תנאים וממלאים שאלון בריאות.", "Sign in with Google. The pilot is free; first-time users accept the terms and complete a health questionnaire.")
          : t("בחר את דרך הכניסה שלך.", "Choose how to sign in.")}
      </p>
      <LoginForm
        next={next}
        googleEnabled={googleEnabled}
        googleError={googleErrorText}
        ownerEntry={ownerEntry}
      />
      {/* כשגוגל דלוק שורת ההסכמה שמתחת לכפתור כבר נושאת את שני הקישורים,
          ואין טעם בשכפול שלהם שתי שורות מתחת */}
      {!googleEnabled && (
        <p className="mt-8 text-center text-xs leading-relaxed text-fg-3">
          <Link href="/terms" className="underline hover:text-fg-2">
            {t("תנאי השימוש", "Terms of use")}
          </Link>
          {" · "}
          <Link href="/privacy" className="underline hover:text-fg-2">
            {t("מדיניות הפרטיות", "Privacy policy")}
          </Link>
        </p>
      )}
      {/* דרך חזרה החוצה (ביקורת סבב 35, UX-6): מי שהגיע לכאן בטעות, או
          שרוצה לקרוא על המוצר לפני שנרשם, נשאר קודם לכן בלי שום יציאה */}
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center justify-center self-center px-3 text-sm text-fg-3 transition-colors duration-(--t-quick) hover:text-fg-2"
      >
        {t("לדף הראשי", "To the home page")}
      </Link>
      <details className="mt-4 text-center text-sm text-fg-3">
        <summary className="cursor-pointer">{t("בעיה בכניסה?", "Trouble signing in?")}</summary>
        <p className="mt-2 leading-relaxed">{t("קוד הזמנה הוא חד־פעמי. בקש קוד חדש לאותו חשבון — ההיסטוריה נשמרת. בכניסה עם Google, השתמש באותו חשבון.", "Invitation codes are single-use. Ask for a new code for the same account; your history stays. If you use Google, sign in with the same account.")}</p>
      </details>
    </div>
  );
}
