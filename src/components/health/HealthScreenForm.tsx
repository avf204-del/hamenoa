"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { healthTexts } from "@/legal";
import { useLocale } from "@/i18n/client";
import { localizeApiError } from "@/i18n/api-errors";
import { allAnswered, isFlagged } from "./health-logic";
import HealthQuestionnaire from "./HealthQuestionnaire";

// שאלון הבריאות — החלק האינטראקטיבי (סבב 35, D-6).
//
// כל שאלה היא כרטיס עם שתי לחצניות גדולות ("כן"/"לא"), בלי ברירת מחדל:
// שאלון בריאותי שמסומן מראש הוא שאלון שלא נענה. הכפתור נעול עד שכל
// השאלות נענו, ואם נענתה "כן" ולו פעם אחת — גם עד שסומן האישור.
//
// פאנל התוצאה מכוון בכוונה בטון רגוע (accent) ולא באדום: "כן" בשאלון
// אינו שגיאה ואינו אבחנה — זו המלצה להתייעץ, וצבע של תקלה היה מפחיד
// אנשים בלי סיבה.
//
// רשימת סימני העצירה מוצגת תמיד, גם לפני שנענתה שאלה — היא הדבר היחיד
// בעמוד שחשוב שייקרא בכל מקרה.
//
// המסך מייבא את הטקסטים ישירות מ-@/legal (מודול טהור) ולא מקבל אותם
// כ-props: אין כאן שרשרת ייבוא לשרת, ואין כפילות נוסח.
//
// החלטה 47: החלק המוצג (שאלות, תוצאה, אישור, רשימת עצירה) עבר ל-
// HealthQuestionnaire, כדי שאורח בזירה יעבור בדיוק את אותו שאלון — בלי
// שהתשובות שלו יישמרו. כאן נשארו המצב, השליחה ל-/api/health והניווט.

interface Props {
  /** התשובות הקודמות, כשנכנסים לעדכן (‏/health?update=1) */
  initialAnswers?: Record<string, boolean> | null;
  initialAcknowledged?: boolean;
  /** מצב עדכון — משנה את הכיתוב על הכפתור ואת אישור השמירה */
  update?: boolean;
  /** לאן חוזרים אחרי שמירה — להגדרות החוויה כשנפתח משם */
  returnTo?: string;
}

export default function HealthScreenForm({
  initialAnswers = null,
  initialAcknowledged = false,
  update = false,
  returnTo = "/",
}: Props) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const HEALTH_TEXTS = healthTexts(locale);
  const [answers, setAnswers] = useState<Record<string, boolean>>(
    () => initialAnswers ?? {},
  );
  const [acknowledged, setAcknowledged] = useState(initialAcknowledged);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answered = useMemo(() => allAnswered(answers), [answers]);
  const flagged = useMemo(() => isFlagged(answers), [answers]);
  const canSubmit = answered && (!flagged || acknowledged) && !busy && !saved;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/health", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers, acknowledged }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        setBusy(false);
        setError(data?.error ? localizeApiError(data.error, locale) : t("התשובות לא נשמרו. נסה שוב.", "Your answers weren't saved. Please try again."));
        return;
      }
      setSaved(true);
      router.refresh();
      router.replace(returnTo);
    } catch {
      setBusy(false);
      setError(t("אין חיבור לשרת.", "Can't reach the server."));
    }
  }

  const buttonLabel = saved
    ? update
      ? t("עודכן", "Updated")
      : t("נשמר", "Saved")
    : busy
      ? t("שומר…", "Saving…")
      : update
        ? t("שמור עדכון", "Save update")
        : HEALTH_TEXTS.continueLabel;

  return (
    <div className="mt-6">
      <HealthQuestionnaire
        answers={answers}
        onAnswer={(id, answer) => setAnswers((prev) => ({ ...prev, [id]: answer }))}
        acknowledged={acknowledged}
        onAcknowledged={setAcknowledged}
      />

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-(--r-s) bg-danger-soft px-3 py-2 text-sm leading-relaxed text-danger"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="mt-5 min-h-11 w-full rounded-(--r-m) bg-accent px-6 py-4 text-center text-lg font-bold text-on-accent transition-[background-color] duration-(--t-quick) hover:bg-accent-hi disabled:opacity-50"
      >
        {buttonLabel}
      </button>

      <p className="mt-3 text-center text-xs leading-relaxed text-fg-3">
        {HEALTH_TEXTS.updateNote}
      </p>
    </div>
  );
}
