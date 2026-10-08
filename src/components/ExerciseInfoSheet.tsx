"use client";

// גיליון "איך מבצעים": רצף תמונות מסודר עם כיתובים,
// צעדי ביצוע ודגשים — נפתח מכל מקום שתרגיל מופיע בו.

import { useState } from "react";
import Image from "next/image";
import Sheet from "@/components/Sheet";
import type { ExerciseInfo } from "@/lib/exercise-info";
import { useLocale } from "@/i18n/client";
import { exerciseInstructions, exerciseName } from "@/lib/exercise-names";
import ExerciseExecutionDetails from "@/components/ExerciseExecutionDetails";

/** The cue-line prefix in each language's instructions ("Note:" in the English text). */
const CUE_PREFIX = { he: "שים לב", en: "Note" } as const;
const CUE_LINE = new RegExp(`^(?:${CUE_PREFIX.he}|${CUE_PREFIX.en}):?\\s*(.*)$`);

/** Training-type labels in English; Hebrew comes ready from the server. */
const TRAINING_TYPE_EN: Record<string, string> = {
  base: "Base training",
  yoga: "Yoga",
  capoeira: "Capoeira",
  dance: "Dance",
};

/** פירוק instructionsHe לצעדים ממוספרים ולשורות "שים לב" */
function parseInstructions(text: string): { steps: string[]; cues: string[] } {
  const steps: string[] = [];
  const cues: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const numbered = line.match(/^\d+\.\s*(.*)$/);
    if (numbered) {
      steps.push(numbered[1]);
      continue;
    }
    const cue = line.match(CUE_LINE);
    if (cue) {
      cues.push(cue[1]);
      continue;
    }
    (steps.length > 0 ? cues : steps).push(line);
  }
  return { steps, cues };
}

export default function ExerciseInfoSheet({
  info,
  onClose,
  infoKey,
}: {
  /** null = סגור */
  info: ExerciseInfo | null;
  onClose: () => void;
  /** The info-map key (slug / drill / stretch) — lets English name a drill without nameEn. */
  infoKey?: string | null;
}) {
  const { t, locale } = useLocale();
  // התוכן האחרון נשמר כדי שאנימציית הסגירה לא תציג גיליון מרוקן
  const [rendered, setRendered] = useState<ExerciseInfo | null>(info);
  if (info && info !== rendered) setRendered(info);
  const shown = info ?? rendered;
  // The key is kept with the content, so the closing animation keeps the same name
  const [renderedKey, setRenderedKey] = useState<string | null | undefined>(infoKey);
  if (info && infoKey !== renderedKey) setRenderedKey(infoKey);
  const key = info ? infoKey : renderedKey;
  const parsed = shown
    ? parseInstructions(locale === "he" ? shown.instructionsHe : exerciseInstructions({ k: shown }, "k", locale))
    : null;
  const frames = shown?.frames ?? shown?.images.map(file => ({ file, captionHe: "", altHe: "" })) ?? [];
  const name = !shown
    ? ""
    : key
      ? exerciseName({ [key]: shown }, key, shown.nameHe, locale)
      : t(shown.nameHe, shown.nameEn || "Exercise");
  const typeLabel =
    locale === "he"
      ? shown?.trainingTypeLabel
      : shown?.trainingTypeLabel && (TRAINING_TYPE_EN[shown.trainingType ?? "base"] ?? "");
  return (
    <Sheet open={info !== null} onClose={onClose} title={name}>
      {shown && parsed && (
        <div>
          {locale === "he" && shown.nameEn && (
            <p className="text-xs lowercase text-fg-3">{shown.nameEn}</p>
          )}
          {typeLabel && (
            <p className="mt-2 text-sm font-bold text-accent" aria-label={t("סוג התרגיל", "Exercise type")}>
              {typeLabel}
            </p>
          )}
          {shown.catalogOnly && <p className="mt-2 text-sm text-fg-2">{t("לעיון במאגר; עדיין לא זמין באימוני האפליקציה.", "Available for catalog review; not yet available in this app's workouts.")}</p>}

          {frames.length > 0 && (
            <ol
              aria-label={t("שלבי ביצוע בתמונות", "Steps in pictures")}
              role="list"
              className={`mt-3 grid grid-cols-1 gap-3 ${frames.length > 1 ? "sm:grid-cols-2" : ""}`}
            >
              {frames.map((frame, i) => (
                <li key={frame.file} className="min-w-0">
                  <figure>
                    <Image
                      src={frame.file}
                      alt={locale === "he" && frame.altHe ? frame.altHe : t(`${shown.nameHe} — שלב ${i + 1}`, `${name} — step ${i + 1}`)}
                      width={640}
                      height={854}
                      unoptimized
                      className="aspect-3/4 w-full rounded-(--r-s) border border-line bg-[#FFF5E8] object-contain"
                    />
                    <figcaption className="mt-2 text-sm leading-relaxed text-fg-2">
                      <span className="font-bold">{t(`שלב ${i + 1} מתוך ${frames.length}`, `Step ${i + 1} of ${frames.length}`)}</span>
                      {locale === "he" && frame.captionHe && <span className="mt-1 block">{frame.captionHe}</span>}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ol>
          )}

          {parsed.steps.length > 0 && (
            <ol className="mt-4 space-y-2 text-sm leading-relaxed text-fg-2">
              {parsed.steps.map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-bold text-accent">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}

          {parsed.cues.length > 0 && (
            <div className="mt-4 rounded-(--r-s) bg-accent-soft p-3">
              <p className="text-xs font-bold text-accent">{t("דגשים", "Key points")}</p>
              <ul className="mt-1 space-y-1 text-sm leading-relaxed text-fg-2">
                {parsed.cues.map((cue, i) => (
                  <li key={i}>{cue}</li>
                ))}
              </ul>
            </div>
          )}
          {shown.execution && <ExerciseExecutionDetails execution={shown.execution} locale={locale} current={shown.executionMatchesInstructions} />}
          {shown.sourceInstructionsEn && <details className="mt-4 rounded-(--r-s) border border-line p-3 text-sm text-fg-2">
            <summary className="cursor-pointer font-bold">{t("הוראות המקור באנגלית", "Archived source instructions in English")}</summary>
            <p className="mt-2">{t("נוסח המקור נשמר לעיון; הוראות הביצוע שנבדקו מוצגות בעברית למעלה.", "The source text is retained for reference; the reviewed execution instructions appear in Hebrew above.")}</p>
            <p dir="ltr" lang="en" className="mt-2 whitespace-pre-wrap leading-relaxed">{shown.sourceInstructionsEn}</p>
          </details>}
          {shown.licenseNote && (
            <details className="mt-4 rounded-(--r-s) border border-line p-3 text-sm text-fg-2">
              <summary className="cursor-pointer font-bold">{t("מקור ורישיון התוכן", "Content source and license")}</summary>
              <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">{shown.licenseNote}</p>
            </details>
          )}
        </div>
      )}
    </Sheet>
  );
}
