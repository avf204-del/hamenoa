"use client";

// שאלון הבריאות — החלק המוצג בלבד (שאלות, פאנל תוצאה, אישור ההמלצה ורשימת
// העצירה). בלי שליחה ובלי ניווט: HealthScreenForm (משתמש רשום, /health) ודף
// האורח בזירה (החלטה 47) מרכיבים אותו עם המצב והשמירה שלהם. נוסח אחד,
// מ-@/legal, לשני המסלולים.

import { healthQuestions, healthTexts } from "@/legal";
import { useLocale } from "@/i18n/client";
import { allAnswered, isFlagged } from "./health-logic";

interface Props {
  answers: Record<string, boolean>;
  onAnswer: (id: string, answer: boolean) => void;
  acknowledged: boolean;
  onAcknowledged: (value: boolean) => void;
  /** רשימת סימני העצירה — מוצגת תמיד כברירת מחדל */
  emergency?: boolean;
}

export default function HealthQuestionnaire({ answers, onAnswer, acknowledged, onAcknowledged, emergency = true }: Props) {
  const { t, locale } = useLocale();
  const HEALTH_QUESTIONS = healthQuestions(locale);
  const HEALTH_TEXTS = healthTexts(locale);
  const answered = allAnswered(answers);
  const flagged = isFlagged(answers);
  const count = HEALTH_QUESTIONS.filter((q) => typeof answers[q.id] === "boolean").length;

  return (
    <div>
      <p role="status" className="mb-4 text-sm font-semibold text-fg-2">
        {locale === "en" ? (
          <>Answered <span className="num">{count}</span> of <span className="num">{HEALTH_QUESTIONS.length}</span> questions · all questions are required</>
        ) : (
          <>נענו <span className="num">{count}</span> מתוך <span className="num">{HEALTH_QUESTIONS.length}</span> שאלות · כל השאלות חובה</>
        )}
      </p>
      <ol className="space-y-3">
        {HEALTH_QUESTIONS.map((question, index) => {
          const value = answers[question.id];
          return (
            <li key={question.id} className="rounded-(--r-m) border border-line bg-raised p-4 [box-shadow:var(--raise-edge)]">
              <p className="text-[0.95rem] font-semibold leading-relaxed">
                <span className="num text-fg-3">{index + 1}.</span> {question.text}
              </p>
              {question.detail && <p className="mt-1.5 text-xs leading-relaxed text-fg-3">{question.detail}</p>}
              <div role="group" aria-label={question.text} className="mt-3 flex gap-2.5">
                {[
                  { label: t("כן", "Yes"), answer: true },
                  { label: t("לא", "No"), answer: false },
                ].map((option) => {
                  const selected = value === option.answer;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onAnswer(question.id, option.answer)}
                      className={`min-h-11 flex-1 rounded-(--r-m) border px-4 py-3 text-base font-bold transition-colors duration-(--t-quick) ${
                        selected ? "border-accent bg-accent-soft text-accent" : "border-line bg-sunken text-fg-2 hover:border-line-strong hover:text-fg"
                      }`}
                    >
                      <span aria-hidden="true">{selected ? "✓ " : ""}</span>
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      {answered && (
        <div role="status" className={`mt-6 rounded-(--r-m) border p-4 text-sm leading-relaxed ${flagged ? "border-accent bg-accent-soft text-fg" : "border-line bg-ok-soft text-fg"}`}>
          <h2 className={`font-bold ${flagged ? "text-accent" : "text-ok"}`}>
            {flagged ? t("כדאי להתייעץ עם רופא/ה לפני שמתחילים", "Consult a doctor before you start") : t("אפשר להתחיל", "You can start")}
          </h2>
          <p className="mt-1.5 text-fg-2">{flagged ? HEALTH_TEXTS.flagged : HEALTH_TEXTS.allClear}</p>
        </div>
      )}

      {answered && flagged && (
        <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-(--r-m) border border-line bg-raised p-4 transition-colors duration-(--t-quick) hover:border-line-strong">
          <input type="checkbox" checked={acknowledged} onChange={(event) => onAcknowledged(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-(--accent)" />
          <span className="text-sm leading-relaxed text-fg">{HEALTH_TEXTS.ackLabel}</span>
        </label>
      )}

      {emergency && (
        <section className="mt-6 rounded-(--r-m) border border-line bg-sunken p-4">
          <h2 className="text-sm font-bold leading-relaxed">{HEALTH_TEXTS.emergencyTitle}</h2>
          <ul className="mt-2.5 space-y-1.5 text-sm leading-relaxed text-fg-2">
            {HEALTH_TEXTS.emergency.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden="true" className="shrink-0 text-fg-3">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
