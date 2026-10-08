"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { consentSummary } from "@/legal";
import { useLocale } from "@/i18n/client";

// טופס אישור המסמכים המשפטיים (סבב 35, D-5) — תיבת סימון אחת וכפתור.
//
// הכפתור נעול עד שהתיבה מסומנת: הסכמה למידע בריאותי חייבת להיות פעולה
// אקטיבית, לא לחיצה על כפתור שכתוב עליו "מסכים".
//
// אחרי POST /api/terms עושים router.refresh() לפני ההפניה — כדי ששער
// ה-onboarding בפריסה יקרא את החותמת הטרייה ויחליט לבד לאן להמשיך
// (‏/health אם עוד לא מולא השאלון, אחרת הביתה).
//
// מייבא רק מ-@/legal (מודול טהור). אין כאן שום ייבוא שרת.

export default function ConsentForm() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const CONSENT_SUMMARY = consentSummary(locale);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/terms", { method: "POST" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
      } | null;
      if (!res.ok || !data?.ok) {
        setBusy(false);
        setError(t("האישור לא נשמר. בדוק את החיבור ונסה שוב.", "Your acceptance wasn't saved. Check your connection and try again."));
        return;
      }
      router.refresh();
      router.replace("/");
    } catch {
      setBusy(false);
      setError(t("אין חיבור לשרת. בדוק את החיבור ונסה שוב.", "Can't reach the server. Check your connection and try again."));
    }
  }

  return (
    <div className="mt-7">
      <label className="flex cursor-pointer items-start gap-3 rounded-(--r-m) border border-line bg-raised p-4 [box-shadow:var(--raise-edge)] transition-colors duration-(--t-quick) hover:border-line-strong">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-(--accent)"
        />
        <span className="text-sm leading-relaxed text-fg">
          {CONSENT_SUMMARY.checkboxLabel}
        </span>
      </label>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-(--r-s) bg-danger-soft px-3 py-2 text-sm leading-relaxed text-danger"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={accept}
        disabled={!agreed || busy}
        className="mt-4 min-h-11 w-full rounded-(--r-m) bg-accent px-6 py-4 text-center text-lg font-bold text-on-accent transition-[background-color] duration-(--t-quick) hover:bg-accent-hi disabled:opacity-50"
      >
        {busy ? t("שומר…", "Saving…") : CONSENT_SUMMARY.button}
      </button>

      <p className="mt-3 text-center text-xs leading-relaxed text-fg-3">
        {CONSENT_SUMMARY.note}
      </p>
    </div>
  );
}
