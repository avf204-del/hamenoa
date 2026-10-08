"use client";

// מחיקת חשבון עצמית (החלטה 35, D-12). זכות שקיימת בכל מדיניות פרטיות
// ראויה, וכאן היא גם כפתור אמיתי — לא בקשה במייל.
//
// שני דברים שהמסך הזה מחויב לעשות:
// • **לומר את האמת המלאה לפני**: מה נמחק, מה נשאר בגיבויים ולכמה זמן,
//   ושאין ביטול. אחרי הלחיצה כבר אין למי להסביר.
// • **לדרוש מחווה מכוונת**: הקלדת המילה "מחק", בדיוק כמו שמחיקת מתעמל
//   בניהול דורשת הקלדת שם. כפתור אדום לבדו נלחץ בהיסח הדעת.
//
// השם "מחק חשבון" נעול (ביקורת סבב 35, LEGAL-8): גם תנאי השימוש וגם
// מדיניות הפרטיות מפנים את המשתמש לכפתור בשמו המדויק. שינוי כאן הופך
// מסמך משפטי לשגוי, ולכן עובר קודם דרך src/legal.

import { useState } from "react";
import Sheet from "@/components/Sheet";
import { useLocale } from "@/i18n/client";
import { localizeApiError } from "@/i18n/api-errors";

/** Anything this browser kept about workouts goes with the account. */
function clearLocalWorkoutData(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("hm-run-unsent:")) localStorage.removeItem(key);
    }
  } catch { /* storage may be unavailable */ }
}

const CONFIRM_WORD = "מחק";
/** English readers type the English word; the name "Delete account" is used by the English legal texts. */
const CONFIRM_WORD_EN = "DELETE";

export default function DeleteAccountSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t, locale } = useLocale();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const word = locale === "en" ? CONFIRM_WORD_EN : CONFIRM_WORD;
  const confirmed = locale === "en" ? typed.trim().toUpperCase() === word : typed.trim() === word;

  async function remove() {
    if (!confirmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/me", { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        setBusy(false);
        setError(data?.error ? localizeApiError(data.error, locale) : t("המחיקה נכשלה. נסה שוב.", "Deletion failed. Please try again."));
        return;
      }
      clearLocalWorkoutData();
      // ניווט מלא ומכוון ולא router.push: אחרי מחיקה חייבים להשליך את כל
      // מטמון הראוטר ואת מצב הזיכרון, בדיוק כמו ביציאה מהחשבון
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/?deleted=1");
    } catch {
      setBusy(false);
      setError(t("אין חיבור לשרת.", "No connection to the server."));
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("מחק חשבון", "Delete account")}>
      <div className="pb-2">
        <p className="text-sm leading-relaxed text-fg-2">
          {t(
            "המחיקה מסירה מיד את כל מה ששייך לך: האימונים והסטים, הכיול וההתקדמות, המדדים, המקומות, המשוב ששלחת ונתוני החוויה (העדפות, מסע והישגים).",
            "Deletion immediately removes everything that belongs to you: workouts and sets, calibration and progress, benchmarks, locations, the feedback you sent, and your experience data (preferences, journey and achievements).",
          )}
        </p>
        <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-fg-2">
          <li className="flex gap-2">
            <span aria-hidden="true" className="shrink-0 text-fg-3">
              •
            </span>
            <span>
              {t("עותקים בגיבויים נמחקים תוך", "Copies in backups are deleted within")}{" "}
              <span className="num font-semibold">30</span> {t("יום.", "days.")}
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="shrink-0 text-fg-3">
              •
            </span>
            <span>{t("אין ביטול לפעולה הזו, וגם לנו אין דרך להחזיר אותה.", "This can't be undone, and we have no way to restore it either.")}</span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="shrink-0 text-fg-3">
              •
            </span>
            <span>
              {t("רוצה לשמור עותק? \"ייצוא הנתונים שלי\" בתפריט החשבון, לפני שממשיכים.", "Want a copy? Use \"Export my data\" in the account menu before you continue.")}
            </span>
          </li>
        </ul>

        <label htmlFor="delete-confirm" className="mt-4 block text-sm text-fg-2">
          {t("הקלד", "Type")} <span className="font-bold text-fg">{word}</span> {t("כדי לאשר:", "to confirm:")}
        </label>
        <input
          id="delete-confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="mt-1.5 w-full rounded-(--r-s) border border-line bg-sunken px-3 py-2.5 text-sm text-fg transition-colors duration-(--t-quick) focus:border-danger focus:outline-none"
        />

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
          onClick={remove}
          disabled={!confirmed || busy}
          className="mt-4 min-h-12 w-full rounded-(--r-m) bg-danger px-6 text-base font-bold text-on-accent transition-opacity duration-(--t-quick) disabled:opacity-50"
        >
          {busy ? t("מוחק…", "Deleting…") : t("מחק את החשבון שלי", "Delete my account")}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="mb-2 mt-2 min-h-12 w-full rounded-(--r-m) border border-line text-sm font-semibold text-fg-2 transition-colors duration-(--t-quick) hover:text-fg disabled:opacity-60"
        >
          {t("ביטול", "Cancel")}
        </button>
      </div>
    </Sheet>
  );
}
