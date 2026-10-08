"use client";

// Warm-up and cool-down: one item at a time, with its picture, a short
// instruction and a clock that suggests, never locks. "Next" is always open.

import { useEffect, useState } from "react";
import ExerciseThumb from "@/components/ExerciseThumb";
import type { GuidedItem } from "@/core/contract";
import { useLocale } from "@/i18n/client";
import type { ExerciseInfoMap } from "@/lib/exercise-info";
import { clock, say } from "./format";
import { PrimaryButton, QuietButton, Screen } from "./parts";
import { useShortScreen, useTapGuard } from "./useRun";

interface Props {
  title: string;
  items: GuidedItem[];
  info: ExerciseInfoMap;
  /** The label of the last press: "To the first game", "Finish workout". */
  doneLabel: string;
  onDone: () => void;
  skipLabel?: string;
}

export default function Guided({ title, items, info, doneLabel, onDone, skipLabel }: Props) {
  const { t, locale } = useLocale();
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(items[0]?.seconds ?? 0);
  const item = items[index];
  const short = useShortScreen();
  const last = index >= items.length - 1;

  // A second tap of the same finger must not skip the item that has just appeared.
  const { mark, fresh } = useTapGuard();

  useEffect(() => {
    mark();
    const timer = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [index, mark]);

  if (!item) return null;

  const next = () => {
    if (fresh()) return;
    if (last) return onDone();
    setIndex(index + 1);
    setLeft(items[index + 1].seconds);
  };

  return (
    <Screen
      actions={
        <>
          <PrimaryButton onClick={next}>{last ? doneLabel : t("הבא", "Next")}</PrimaryButton>
          {skipLabel && !last && <QuietButton onClick={onDone}>{skipLabel}</QuietButton>}
        </>
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-fg-2">
          {title} <span className="num">{index + 1}/{items.length}</span>
        </span>
        <span role="timer" className={`num text-3xl font-semibold leading-none ${left === 0 ? "text-ok" : ""}`}>
          {clock(left)}
        </span>
      </div>
      <div className="mt-3 flex gap-1.5">
        {items.map((it, i) => (
          <span key={it.key + i} className={`h-1.5 flex-1 rounded-full ${i < index ? "bg-accent" : i === index ? "bg-accent-soft ring-1 ring-accent" : "bg-sunken"}`} />
        ))}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <ExerciseThumb info={info[item.key]} size={short ? 108 : 148} />
        <h1 className="text-3xl font-bold leading-snug">{say(item.name, locale)}</h1>
        <p className="max-w-sm leading-relaxed text-fg-2">{say(item.instruction, locale)}</p>
      </div>
    </Screen>
  );
}
