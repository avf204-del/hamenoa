import Link from "next/link";
import { consentSummary } from "@/legal";
import { translator, type Locale } from "@/i18n";

// תקציר ההסכמה שמוצג מעל תיבת הסימון (סבב 35, D-5).
//
// רכיב שרת, בלי לוגיקה: הנוסח כולו ב-src/legal/summary.ts. התפקיד היחיד
// כאן הוא לתת לתקציר צורה שנקראת — נקודה אחת בשורה, סימן "וי" קטן שמצויר
// מהטוקנים (אין ספריית אייקונים חיצונית, ואין סימן וי בסט הפנימי), ושני
// קישורים למסמכים המלאים לפני שמסמנים משהו.

/** סימן "וי" קטן בעיגול רך — מצויר כאן, בלי תלות חיצונית */
function CheckDot() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"
    >
      <svg
        viewBox="0 0 24 24"
        width="13"
        height="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 13l4.5 4.5L19 7" />
      </svg>
    </span>
  );
}

export default function ConsentSummaryBlock({ locale = "he" }: { locale?: Locale }) {
  const CONSENT_SUMMARY = consentSummary(locale);
  const t = translator(locale);
  return (
    <section aria-labelledby="consent-summary-title">
      <h1
        id="consent-summary-title"
        className="text-[1.75rem] font-bold leading-snug"
      >
        {CONSENT_SUMMARY.title}
      </h1>
      <p className="mt-2.5 leading-relaxed text-fg-2">{CONSENT_SUMMARY.intro}</p>

      <ul className="mt-5 space-y-3">
        {CONSENT_SUMMARY.points.map((point) => (
          <li key={point} className="flex gap-3 rounded-(--r-m) border border-line bg-raised p-4">
            <CheckDot />
            <span className="text-base leading-relaxed text-fg-2">
              {point}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
        <a
          href="#full"
          className="text-accent underline decoration-line-strong underline-offset-4 transition-opacity duration-(--t-quick) hover:opacity-80"
        >
          {t("לתנאים המלאים", "Full terms")}
        </a>
        <Link
          href="/privacy"
          className="text-accent underline decoration-line-strong underline-offset-4 transition-opacity duration-(--t-quick) hover:opacity-80"
        >
          {t("למדיניות הפרטיות", "Privacy policy")}
        </Link>
      </div>
    </section>
  );
}
