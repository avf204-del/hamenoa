"use client";

// The end of a workout: what each game came to, and the way home.

import Link from "next/link";
import type { RunView, Score, Workout } from "@/core/contract";
import { compareScores, ruleFor } from "@/core/games";
import { useLocale } from "@/i18n/client";
import { say } from "./format";
import { Screen } from "./parts";

interface Props {
  workout: Workout;
  view: RunView;
  best: Record<string, Score>;
}

export default function Summary({ workout, view, best }: Props) {
  const { t, locale } = useLocale();
  const minutes = view.startedAt !== null && view.finishedAt !== null ? Math.max(1, Math.round((view.finishedAt - view.startedAt) / 60000)) : null;
  const rounds = view.stations.reduce((sum, s) => sum + s.score.value, 0);

  return (
    <Screen
      actions={
        <Link href="/workout" className="flex min-h-16 w-full items-center justify-center rounded-(--r-m) bg-accent px-6 text-xl font-bold text-on-accent hover:bg-accent-hi">
          {t("חזרה לבית", "Back home")}
        </Link>
      }
    >
      <h1 className="text-3xl font-bold leading-tight">{t("האימון נשמר", "Workout saved")}</h1>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-(--r-l) border border-line bg-raised px-4 py-3">
          <div className="text-sm text-fg-2">{t("סבבים מלאים", "Full rounds")}</div>
          <div className="num text-4xl font-semibold">{rounds}</div>
        </div>
        <div className="rounded-(--r-l) border border-line bg-raised px-4 py-3">
          <div className="text-sm text-fg-2">{t("דקות", "Minutes")}</div>
          <div className="num text-4xl font-semibold">{minutes ?? "–"}</div>
        </div>
      </div>

      <ul className="mt-5 flex flex-col gap-3">
        {workout.stations.map((station, i) => {
          const played = view.stations.find((s) => s.id === station.id);
          const earlier = best[station.id];
          const record = played && earlier && compareScores(played.score, earlier) < 0;
          return (
            <li key={station.id} className="rounded-(--r-l) border border-line bg-raised px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-bold">
                  {t("משחקון", "Game")} <span className="num">{i + 1}</span> · {say(ruleFor(station.game).title, locale)}
                </span>
                {record && <span className="rounded-full bg-ok-soft px-3 py-0.5 text-sm font-bold text-ok">{t("תוצאה חדשה", "New best")}</span>}
              </div>
              <p className="mt-1 text-fg-2">{played ? say(played.score.text, locale) : t("לא שוחק", "Not played")}</p>
              <p className="mt-1 text-sm text-fg-3">{station.exercises.map((e) => say(e.name, locale)).join(" ← ")}</p>
            </li>
          );
        })}
      </ul>
    </Screen>
  );
}
