"use client";

// One workout, from preview to summary. This component only chooses which
// screen matches the current view; the view itself comes from the core.

import { useState } from "react";
import ExerciseInfoSheet from "@/components/ExerciseInfoSheet";
import { useLocale } from "@/i18n/client";
import type { ExerciseInfoMap } from "@/lib/exercise-info";
import Guided from "./Guided";
import Preview from "./Preview";
import StationEnded from "./StationEnded";
import StationPlay from "./StationPlay";
import StationReady from "./StationReady";
import Summary from "./Summary";
import { useRun, useScreenAwake, type RunData } from "./useRun";

export default function WorkoutRun({ data, info }: { data: RunData; info: ExerciseInfoMap }) {
  const { t } = useLocale();
  const run = useRun(data);
  const { workout, view, now, best, send } = run;
  const [howTo, setHowTo] = useState<string | null>(null);
  useScreenAwake(view.phase !== "preview" && view.phase !== "summary");

  let screen: React.ReactNode;
  if (view.phase === "preview") {
    screen = <Preview workout={workout} info={info} onBegin={() => send({ type: "begin" })} onHowTo={setHowTo} />;
  } else if (view.phase === "warmup") {
    screen = (
      <Guided
        title={t("חימום", "Warm-up")}
        items={workout.warmup}
        info={info}
        doneLabel={t("למשחקון הראשון", "To the first game")}
        onDone={() => send({ type: "warmup-done" })}
        skipLabel={t("דלג על החימום", "Skip the warm-up")}
      />
    );
  } else if (view.phase === "station" && view.station) {
    const station = workout.stations[view.stationIndex];
    const position = { index: view.stationIndex, total: workout.stations.length };
    const common = { station, best: best[station.id], info, send, onHowTo: setHowTo };
    screen =
      view.station.status === "ready" ? (
        <StationReady {...common} position={position} />
      ) : view.station.status === "ended" ? (
        <StationEnded station={station} view={view.station} best={best[station.id]} isLast={view.stationIndex === workout.stations.length - 1} send={send} />
      ) : (
        <StationPlay {...common} view={view.station} now={now} position={position} />
      );
  } else if (view.phase === "cooldown") {
    screen = (
      <Guided
        title={t("שחרור", "Cool-down")}
        items={workout.cooldown}
        info={info}
        doneLabel={t("סיים אימון", "Finish workout")}
        onDone={() => send({ type: "finish" })}
        skipLabel={t("סיים בלי שחרור", "Finish without the cool-down")}
      />
    );
  } else {
    screen = <Summary workout={workout} view={view} best={best} />;
  }

  return (
    <>
      {run.unsaved && (
        <div role="alert" className="animate-slide-down sticky top-0 z-40 flex items-center justify-between gap-3 bg-danger-soft px-5 py-3 text-sm">
          <span>{t("הפעולה האחרונה עוד לא נשמרה.", "Your last action is not saved yet.")}</span>
          <button type="button" onClick={run.retry} className="min-h-11 rounded-(--r-s) border border-line px-3 font-bold">
            {t("נסה לשמור שוב", "Try saving again")}
          </button>
        </div>
      )}
      {screen}
      <ExerciseInfoSheet info={howTo ? (info[howTo] ?? null) : null} infoKey={howTo} onClose={() => setHowTo(null)} />
    </>
  );
}
