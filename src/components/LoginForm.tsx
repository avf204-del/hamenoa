"use client";

// טופס הכניסה (החלטות 20 ו-21; נפתח לציבור בסבב 35, D-4).
//
// המסלול הראשי הוא גוגל: לחיצה אחת, ומי שאין לו חשבון במנוע מקבל אותו שם
// (ההרשמה עצמה בשרת — /api/auth/google/callback). שני המסלולים האחרים
// מכווצים מאחורי גילוי-מדורג, כי הם רלוונטיים למיעוט: קוד הזמנה למי שקיבל
// אחד, וסיסמה למי שמפעיל את השירות.
//
// הבורר מפורש ולא מנחש: קוד וסיסמה עלולים להיראות דומה, ולכן השרת מבדיל
// לפי שם השדה בגוף הבקשה — לא לפי צורת הטקסט.
//
// כשגוגל כבוי בשרת (פיתוח מקומי בלי GOOGLE_CLIENT_ID) שני השדות גלויים
// מיד, כי אז אין מסלול ראשי להסתיר מאחוריו.

import Link from "next/link";
import { useState } from "react";
import { withVisit } from "@/lib/pilot-client";
import { safeNext } from "@/lib/safe-next";
import { useLocale } from "@/i18n/client";
import { localizeApiError } from "@/i18n/api-errors";

/** איזה שדה סוד פתוח כרגע; null = אף אחד (המצב ההתחלתי כשגוגל דלוק) */
type Panel = "code" | "password" | null;

const SUBMIT_CLASS =
  "mt-5 w-full rounded-(--r-m) bg-accent px-6 py-4 text-center text-lg font-bold text-on-accent transition-[background-color] duration-(--t-quick) hover:bg-accent-hi disabled:opacity-50";

const INPUT_CLASS =
  "mt-2 w-full rounded-(--r-m) border border-line bg-sunken px-4 py-3.5 text-lg outline-none focus:border-accent";

const ALERT_CLASS =
  "rounded-(--r-s) bg-danger-soft px-3 py-2 text-sm leading-relaxed text-danger";

export default function LoginForm({
  next,
  googleEnabled = false,
  googleError = null,
  ownerEntry = false,
}: {
  next: string;
  googleEnabled?: boolean;
  googleError?: string | null;
  /** ‏?owner=1 — פותח את שדה הסיסמה מיד, בלי לחפש את הקישור הקטן */
  ownerEntry?: boolean;
}) {
  const { t, locale } = useLocale();
  const [panel, setPanel] = useState<Panel>(
    googleEnabled ? (ownerEntry ? "password" : null) : ownerEntry ? "password" : "code",
  );
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openPanel = (to: Exclude<Panel, null>) => {
    if (to === panel) return;
    setPanel(to);
    setValue("");
    setError(null);
  };

  /** חזרה למצב ההתחלתי — קיים רק כשיש מסלול ראשי לחזור אליו */
  const closePanel = () => {
    setPanel(null);
    setValue("");
    setError(null);
  };

  const googleHref = `/api/auth/google?next=${encodeURIComponent(next)}`;

  /**
   * מזהה הביקור נקרא רק בלחיצה ולא בזמן הרינדור: הוא חי ב-sessionStorage,
   * שאינו קיים בשרת, וקריאה שלו ברינדור הייתה מייצרת אי-התאמה בהידרציה.
   * ה-href עצמו נשאר תקין — לחיצה אמצעית או פתיחה בלשונית עובדות כרגיל.
   */
  function goGoogle(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    window.location.assign(withVisit(googleHref));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || panel === null || value.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // השרת סולח על רווחים, מקפים ואותיות קטנות בקוד — אין נרמול בלקוח
        body: JSON.stringify(
          panel === "code" ? { code: value } : { password: value },
        ),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        created?: boolean;
      };
      if (!response.ok || !data.ok) {
        setError(data.error ? localizeApiError(data.error, locale) : t("לא הצלחנו להיכנס. כדאי לבדוק את הפרטים ולנסות שוב.", "We couldn't sign you in. Check the details and try again."));
        setValue("");
        return;
      }
      // מי שנוצר זה עתה נוחת במסך הבית עם קבלת פנים ומסלול הכיול, ולא
      // בקישור עמוק שאין לו בו עדיין שום נתון
      const target = data.created ? "/?welcome=1" : next;
      // ניווט מלא ולא router.push — כדי שכל המסכים ייטענו מחדש עם העוגייה
      window.location.assign(safeNext(target));
    } catch {
      setError(t("אין חיבור לשרת.", "No connection to the server."));
    } finally {
      setBusy(false);
    }
  }

  const isCode = panel === "code";

  const secretPanel = panel && (
    <div id="secret-panel" className="mt-4">
      <label htmlFor="secret" className="block text-sm font-bold">
        {isCode ? t("קוד ההזמנה", "Invitation code") : t("סיסמת מפעיל", "Operator password")}
      </label>
      <p id="secret-hint" className="mt-1 text-sm leading-relaxed text-fg-3">
        {isCode
          ? t("שמונה תווים עם מקף באמצע. אותיות גדולות או קטנות — לא משנה.", "Eight characters with a hyphen in the middle. Upper or lower case doesn't matter.")
          : t("לשימוש מי שמפעיל את השירות.", "For whoever operates the service.")}
      </p>
      <input
        id="secret"
        aria-invalid={!!error}
        aria-describedby={error ? "secret-hint secret-error" : "secret-hint"}
        // שדה הקוד אינו סוד שמור — הצגתו מונעת שגיאות הקלדה בחדר כושר
        type={isCode ? "text" : "password"}
        inputMode={isCode ? "text" : undefined}
        value={value}
        autoFocus
        dir={isCode ? "ltr" : undefined}
        autoComplete={isCode ? "one-time-code" : "current-password"}
        autoCapitalize={isCode ? "characters" : undefined}
        autoCorrect="off"
        spellCheck={false}
        placeholder={isCode ? "XXXX-XXXX" : undefined}
        onChange={(e) => setValue(e.target.value)}
        className={`${INPUT_CLASS} ${isCode ? "num tracking-[0.12em]" : ""}`}
      />
      {error && (
        <p id="secret-error" role="alert" className={`mt-2.5 ${ALERT_CLASS}`}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || value.trim().length === 0}
        className={SUBMIT_CLASS}
      >
        {busy ? t("רגע…", "One moment…") : t("כניסה", "Sign in")}
      </button>
    </div>
  );

  return (
    <form onSubmit={submit} className="mt-7">
      {googleError && (
        <p role="alert" className={`mb-4 ${ALERT_CLASS}`}>
          {googleError}
        </p>
      )}

      {googleEnabled && (
        <>
          <a
            href={googleHref}
            onClick={goGoogle}
            className="flex min-h-11 w-full items-center justify-center rounded-(--r-m) bg-accent px-6 py-4 text-center text-lg font-bold text-on-accent transition-[background-color] duration-(--t-quick) hover:bg-accent-hi"
          >
            {t("המשך עם גוגל", "Continue with Google")}
          </a>
          <p className="mt-3 text-center text-xs leading-relaxed text-fg-3">
            {t("בהמשך תתבקש לאשר את", "Next, you'll be asked to accept the")}{" "}
            <Link href="/terms" className="underline hover:text-fg-2">
              {t("תנאי השימוש", "terms of use")}
            </Link>{" "}
            {t("ואת", "and the")}{" "}
            <Link href="/privacy" className="underline hover:text-fg-2">
              {t("מדיניות הפרטיות", "privacy policy")}
            </Link>
            .
          </p>

          <div
            className="my-6 flex items-center gap-3 text-xs text-fg-3"
            aria-hidden="true"
          >
            <span className="h-px flex-1 bg-line" />
            {t("או", "or")}
            <span className="h-px flex-1 bg-line" />
          </div>

          {panel === null && (
            <button
              type="button"
              onClick={() => openPanel("code")}
              className="flex min-h-11 w-full items-center justify-center rounded-(--r-m) border border-line bg-raised px-6 py-3.5 text-base font-semibold text-fg transition-colors duration-(--t-quick) hover:bg-sunken"
            >
              {t("יש לך קוד הזמנה?", "Have an invitation code?")}
            </button>
          )}
        </>
      )}

      {!googleEnabled && (
        <div
          role="group"
          aria-label={t("דרך הכניסה", "Sign-in method")}
          className="flex gap-1.5 rounded-(--r-m) border border-line bg-sunken p-1"
        >
          {(
            [
              { value: "code", label: t("קוד הזמנה", "Invitation code") },
              { value: "password", label: t("סיסמה", "Password") },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={panel === option.value}
              onClick={() => openPanel(option.value)}
              className={`min-h-11 flex-1 rounded-(--r-s) text-sm font-semibold transition-colors duration-(--t-quick) ${
                panel === option.value
                  ? "bg-accent text-on-accent"
                  : "text-fg-2 hover:text-fg"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {secretPanel}

      {googleEnabled && panel === null && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => openPanel("password")}
            className="min-h-11 px-3 text-xs text-fg-3 underline transition-colors duration-(--t-quick) hover:text-fg-2"
          >
            {t("כניסת מפעיל", "Operator sign-in")}
          </button>
        </div>
      )}

      {googleEnabled && panel !== null && (
        <div className="mt-5 flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => openPanel(isCode ? "password" : "code")}
            className="min-h-11 px-3 text-xs text-fg-3 underline transition-colors duration-(--t-quick) hover:text-fg-2"
          >
            {isCode ? t("כניסת מפעיל", "Operator sign-in") : t("יש לך קוד הזמנה?", "Have an invitation code?")}
          </button>
          <button
            type="button"
            onClick={() => closePanel()}
            className="min-h-11 px-3 text-xs text-fg-3 transition-colors duration-(--t-quick) hover:text-fg-2"
          >
            {t("חזרה לכניסה עם גוגל", "Back to Google sign-in")}
          </button>
        </div>
      )}
    </form>
  );
}
