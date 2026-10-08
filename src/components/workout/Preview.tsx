"use client";

// The whole workout before it starts: warm-up, every game with its
// exercises, cool-down. Nothing surprising appears later.

import Link from "next/link";
import type { Workout } from "@/core/contract";
import { locationLabel } from "@/catalog/labels";
import { ruleFor } from "@/core/games";
import { useLocale } from "@/i18n/client";
import type { ExerciseInfoMap } from "@/lib/exercise-info";
import { clock, say } from "./format";
import { ExerciseRow, Group, PrimaryButton, Screen } from "./parts";
import { unlockSound } from "./signals";

interface Props {
  workout: Workout;
  info: ExerciseInfoMap;
  onBegin: () => void;
  onHowTo: (key: string) => void;
}

const total = (items: readonly { seconds: number }[]) => items.reduce((sum, item) => sum + item.seconds, 0);

export default function Preview({ workout, info, onBegin, onHowTo }: Props) {
  const { t, locale } = useLocale();
  const minutes = Math.round(workout.estimatedSec / 60);

  return (
    <Screen
      actions={
        <>
          <PrimaryButton
            onClick={() => {
              unlockSound();
              onBegin();
            }}
          >
            {t("מתחילים בחימום", "Start with the warm-up")}
          </PrimaryButton>
          <Link href="/workout?new=1" className="flex min-h-12 items-center justify-center text-base font-medium text-fg-2 hover:text-fg">
            {t("בנה אימון אחר", "Build a different workout")}
          </Link>
        </>
      }
    >
      <p className="text-sm text-fg-2">{locationLabel(workout.place, locale)}</p>
      <h1 className="mt-1 text-3xl font-bold leading-tight">
        {t("האימון שלך", "Your workout")} · {t("כ־", "about ")}
        <span className="num">{minutes}</span> {t("דקות", "minutes")}
      </h1>
      {workout.notes.map((note) => (
        <p key={note.he} className="mt-3 rounded-(--r-m) bg-accent-soft px-4 py-3 text-sm leading-relaxed">
          {say(note, locale)}
        </p>
      ))}

      <div className="mt-5 flex flex-col gap-3">
        <Group title={t("חימום", "Warm-up")} aside={clock(total(workout.warmup))}>
          {workout.warmup.map((item, i) => (
            <ExerciseRow key={item.key + i} info={info[item.key]} name={say(item.name, locale)} onOpen={() => onHowTo(item.key)} />
          ))}
        </Group>

        {workout.stations.map((station, i) => {
          const rule = ruleFor(station.game);
          return (
            <Group key={station.id} title={`${t("משחקון", "Game")} ${i + 1} · ${say(rule.question, locale)}`} aside={clock(station.frameSec)}>
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
          );
        })}

        <Group title={t("שחרור", "Cool-down")} aside={clock(total(workout.cooldown))}>
          {workout.cooldown.map((item, i) => (
            <ExerciseRow key={item.key + i} info={info[item.key]} name={say(item.name, locale)} onOpen={() => onHowTo(item.key)} />
          ))}
        </Group>
      </div>
    </Screen>
  );
}
