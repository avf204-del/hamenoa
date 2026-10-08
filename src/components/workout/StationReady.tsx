"use client";

// Before a game: what it asks, on which exercises, for how long, and the
// result to beat. No clock runs here; reading costs nothing.

import type { Score, Station } from "@/core/contract";
import { ruleFor } from "@/core/games";
import { useLocale } from "@/i18n/client";
import type { ExerciseInfoMap } from "@/lib/exercise-info";
import { clock, say } from "./format";
import { ExerciseRow, Group, PrimaryButton, QuietButton, Screen } from "./parts";
import { unlockSound } from "./signals";
import type { Run } from "./useRun";

interface Props {
  station: Station;
  best: Score | undefined;
  position: { index: number; total: number };
  info: ExerciseInfoMap;
  send: Run["send"];
  onHowTo: (slug: string) => void;
}

export default function StationReady({ station, best, position, info, send, onHowTo }: Props) {
  const { t, locale } = useLocale();
  const rule = ruleFor(station.game);

  const start = () => {
    unlockSound();
    send({ type: "station-start", station: station.id });
  };

  return (
    <Screen
      actions={
        <>
          <PrimaryButton onClick={start}>{t("התחל משחקון", "Start game")}</PrimaryButton>
          <QuietButton onClick={() => send({ type: "to-cooldown" })}>{t("דלג לשחרור", "Skip to cool-down")}</QuietButton>
        </>
      }
    >
      <p className="text-sm text-fg-2">
        {t("משחקון", "Game")} <span className="num">{position.index + 1}</span> {t("מתוך", "of")} <span className="num">{position.total}</span> · {say(rule.title, locale)}
      </p>
      <h1 className="mt-2 text-4xl font-bold leading-tight">{say(rule.question, locale)}</h1>
      <p className="mt-3 leading-relaxed text-fg-2">{say(rule.howTo, locale)}</p>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-(--r-l) border border-line bg-raised px-4 py-3">
        <div>
          <div className="text-sm text-fg-2">{t("זמן המשחקון", "Game clock")}</div>
          <div className="num text-2xl font-semibold">{clock(station.frameSec)}</div>
        </div>
        <div className="text-end">
          <div className="text-sm text-fg-2">{best ? t("התוצאה לנצח", "Result to beat") : t("ניסיון ראשון", "First attempt")}</div>
          <div className="font-medium">{best ? say(best.text, locale) : t("היום נקבעת תוצאת הפתיחה", "Today sets your opening result")}</div>
        </div>
      </div>

      <div className="mt-4">
        <Group title={t("הסבב", "The round")} aside={t(`${station.exercises.length} תרגילים`, `${station.exercises.length} exercises`)}>
          {station.exercises.map((exercise) => (
            <ExerciseRow
              key={exercise.slug}
              info={info[exercise.slug]}
              name={say(exercise.name, locale)}
              detail={
                <>
                  <span className="num">{exercise.quota}</span> {exercise.unit === "sec" ? t("שניות", "seconds") : t("חזרות", "reps")}
                </>
              }
              onOpen={() => onHowTo(exercise.slug)}
            />
          ))}
        </Group>
      </div>
    </Screen>
  );
}
