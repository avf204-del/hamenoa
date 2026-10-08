"use client";

// The game itself: one exercise in front of the player, the clock, the live
// score and the result to beat. One press reports a full portion; "less"
// opens a number. The screen shows what the core decided and sends presses.

import { useEffect, useRef, useState } from "react";
import ExerciseThumb from "@/components/ExerciseThumb";
import Sheet from "@/components/Sheet";
import type { RunEventInput, Score, Station, StationView } from "@/core/contract";
import { useLocale } from "@/i18n/client";
import type { ExerciseInfoMap } from "@/lib/exercise-info";
import { clock, say, secondsUntil } from "./format";
import { PrimaryButton, QuietButton, Screen } from "./parts";
import { beep, buzz, setSoundOff, soundOff } from "./signals";
import { useShortScreen, useTapGuard, type Run } from "./useRun";

interface Props {
  station: Station;
  view: StationView;
  now: number;
  best: Score | undefined;
  position: { index: number; total: number };
  info: ExerciseInfoMap;
  send: Run["send"];
  /** A press is waiting to be saved: only stopping the game is possible. */
  paused: boolean;
  onHowTo: (slug: string) => void;
}

export default function StationPlay({ station, view, now, best, position, info, send, paused, onHowTo }: Props) {
  const { t, locale } = useLocale();
  const [picking, setPicking] = useState(false);
  const [menu, setMenu] = useState(false);
  const [ending, setEnding] = useState(false);
  const [muted, setMuted] = useState(false);
  const short = useShortScreen();
  // A second tap of the same finger must not choose from a list that has just
  // opened under it: choices count only once the list has been up for a moment.
  const list = useTapGuard();
  const openPicker = () => {
    list.mark();
    setPicking(true);
  };

  const { status, portion, score } = view;
  const exercise = portion ? station.exercises[portion.exerciseIndex] : null;
  const unit = exercise?.unit === "sec" ? t("שניות", "seconds") : t("חזרות", "reps");
  const clockLeft = status === "countdown" ? station.frameSec : secondsUntil(view.clockEndsAt, now);
  const startsIn = secondsUntil(view.clockStartsAt, now);
  const restLeft = secondsUntil(view.restEndsAt, now);
  const elapsed = 1 - clockLeft / station.frameSec;

  // Signals: the clock should be felt without looking at the phone.
  const previous = useRef({ status, startsIn, restLeft, rounds: score.value });
  useEffect(() => {
    const before = previous.current;
    if (status === "countdown" && startsIn !== before.startsIn && startsIn > 0) beep("tick");
    if (before.status === "countdown" && status === "working") { beep("go"); buzz(60); }
    if (status === "resting" && before.restLeft > 0 && restLeft === 0) { beep("go"); buzz(60); }
    if (status === "last-report" && before.status !== "last-report") { beep("done"); buzz(200); }
    if (score.value > before.rounds) buzz([40, 60, 40]);
    previous.current = { status, startsIn, restLeft, rounds: score.value };
  }, [status, startsIn, restLeft, score.value]);

  /** A report always names the portion on screen, so it can never land on another one. */
  const reportOf = (amount: number | null): RunEventInput | null =>
    portion && { type: "report", station: station.id, portion: portion.index, amount };

  const report = (amount: number | null) => {
    const event = reportOf(amount);
    if (!event || list.fresh() || !send(event)) return;
    setPicking(false);
    buzz(20);
  };

  const end = (reason: "choice" | "pain", lastAmount?: number) => {
    if (list.fresh()) return;
    setMenu(false);
    setEnding(false);
    const stop: RunEventInput = { type: "station-end", station: station.id, reason };
    const last = lastAmount === undefined ? null : reportOf(lastAmount);
    // Reporting the last portion and stopping are one press.
    if (last) send(last, stop);
    else send(stop);
  };

  /** Ending mid-portion: first ask what was already done, never assume it. */
  const endByChoice = () => {
    if (status !== "working") return end("choice");
    setMenu(false);
    list.mark();
    setEnding(true);
  };

  const amounts = (upTo: number) => Array.from({ length: upTo + 1 }, (_, n) => n);
  const numberButton =
    "num flex min-h-14 min-w-0 flex-1 items-center justify-center rounded-(--r-s) border border-line bg-raised text-xl font-semibold transition-colors duration-(--t-quick) hover:border-accent disabled:opacity-40";

  /* ---------- The actions under the thumb ---------- */

  let actions: React.ReactNode = null;
  if (status === "working" && exercise && portion) {
    actions = picking ? (
      <>
        <p className="text-center text-sm text-fg-2">{t("כמה עשית?", "How many did you do?")}</p>
        <div className="flex gap-2">
          {amounts(portion.target - 1).map((n) => (
            <button key={n} type="button" className={numberButton} disabled={paused} onClick={() => report(n)}>
              {n}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <QuietButton onClick={() => setPicking(false)}>{t("חזרה", "Back")}</QuietButton>
          <QuietButton onClick={() => report(null)}>{t("לא ספרתי", "I did not count")}</QuietButton>
        </div>
      </>
    ) : (
      <>
        <PrimaryButton onClick={() => report(portion.target)} disabled={paused}>
          {t("עשיתי", "Did")} <span className="num">{portion.target}</span>
        </PrimaryButton>
        {!paused && <QuietButton onClick={openPicker}>{t("עשיתי פחות", "I did fewer")}</QuietButton>}
      </>
    );
  } else if (status === "resting" && exercise) {
    // The same button in the same place: grey while resting, live when the rest is over.
    actions = (
      <PrimaryButton onClick={() => send({ type: "portion-start", station: station.id })} disabled={restLeft > 0 || paused}>
        {t("התחל", "Start")}
      </PrimaryButton>
    );
  } else if (status === "last-report" && portion) {
    actions = (
      <>
        <p className="text-center text-sm text-fg-2">
          {t("דווח רק על מה שכבר ביצעת", "Report only what you already did")}
        </p>
        <div className="flex gap-2">
          {amounts(portion.target).map((n) => (
            <button key={n} type="button" className={numberButton} disabled={paused} onClick={() => report(n)}>
              {n}
            </button>
          ))}
        </div>
        <QuietButton onClick={() => end("choice")}>{t("המשך ללא דיווח", "Continue without a report")}</QuietButton>
      </>
    );
  }

  /* ---------- The middle of the screen ---------- */

  const scoreRow = (
    <div>
      <div className="flex items-baseline gap-3">
        <span key={score.value} className="num animate-bump text-5xl font-semibold leading-none">
          {score.value}
        </span>
        <span className="text-fg-2">{t("סבבים מלאים", "full rounds")}</span>
      </div>
      <p className="mt-2 text-sm leading-snug text-fg-2">
        {best ? (
          <>
            {t("לנצח", "To beat")}: <span className="font-medium text-fg">{say(best.text, locale)}</span>
          </>
        ) : (
          t("ניסיון ראשון: כאן נקבעת התוצאה לנצח", "First attempt: this sets the result to beat")
        )}
      </p>
    </div>
  );

  const beads = portion && (
    <div className="flex items-center gap-3" aria-label={t(`סבב ${portion.round}`, `Round ${portion.round}`)}>
      <span className="text-sm font-medium text-fg-2">
        {t("סבב", "Round")} <span className="num">{portion.round}</span>
      </span>
      <div className="flex flex-1 items-center gap-2">
        {station.exercises.map((e, i) => {
          const done = i < portion.exerciseIndex;
          const current = i === portion.exerciseIndex;
          return (
            <span
              key={e.slug}
              className={`h-2.5 flex-1 rounded-full transition-colors duration-(--t-slow) ${
                done ? "bg-accent" : current ? "bg-accent-soft ring-2 ring-accent" : "bg-sunken"
              }`}
            />
          );
        })}
      </div>
    </div>
  );

  let centre: React.ReactNode = null;
  if (status === "countdown" && exercise && portion) {
    centre = (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="text-fg-2">{t("מתחילים בעוד", "Starting in")}</div>
        <div key={startsIn} className="num animate-bump font-semibold leading-none text-accent" style={{ fontSize: "var(--fs-timer)" }}>
          {startsIn}
        </div>
        <div className="text-lg">
          {say(exercise.name, locale)} · <span className="num">{portion.target}</span> {unit}
        </div>
      </div>
    );
  } else if (status === "resting" && exercise && portion && restLeft > 0) {
    centre = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="text-lg font-medium text-ok">{t("מנוחה", "Rest")}</div>
        <div className="num text-7xl font-semibold leading-none text-ok">{clock(restLeft)}</div>
        <button type="button" onClick={() => onHowTo(exercise.slug)} className="mt-4 flex items-center gap-3 rounded-(--r-m) border border-line bg-raised py-2 ps-2 pe-4 text-start">
          <ExerciseThumb info={info[exercise.slug]} size={56} />
          <span>
            <span className="block text-sm text-fg-2">{t("הבא", "Next")}</span>
            <span className="block font-medium">
              {say(exercise.name, locale)} · <span className="num">{portion.target}</span> {unit}
            </span>
          </span>
        </button>
      </div>
    );
  } else if (exercise && portion) {
    centre = (
      <div className={`flex flex-1 flex-col items-center justify-center text-center ${short ? "gap-1.5 pt-3" : "gap-3"}`}>
        {status === "last-report" && <div className="text-lg font-bold text-accent">{t("הזמן הסתיים", "Time is up")}</div>}
        {status === "resting" && <div className="text-lg font-medium text-ok">{t("המנוחה הסתיימה · הבא", "Rest is over · next")}</div>}
        <button type="button" onClick={() => onHowTo(exercise.slug)} aria-label={t("איך מבצעים", "How to do it")}>
          <ExerciseThumb info={info[exercise.slug]} size={short ? 96 : 132} />
        </button>
        <h1 className="text-2xl font-bold leading-snug">{say(exercise.name, locale)}</h1>
        <div className="flex items-baseline gap-2">
          <span className={`num font-semibold leading-none ${short ? "text-5xl" : "text-6xl"}`}>{portion.target}</span>
          <span className="text-lg text-fg-2">{unit}</span>
        </div>
      </div>
    );
  }

  return (
    <Screen actions={actions}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-fg-2">
          {t("משחקון", "Game")} <span className="num">{position.index + 1}/{position.total}</span>
        </span>
        <span
          role="timer"
          className={`num text-3xl font-semibold leading-none ${clockLeft <= 10 && status !== "countdown" ? "animate-tick text-accent" : ""}`}
        >
          {clock(clockLeft)}
        </span>
        <button type="button" onClick={() => { setMuted(soundOff()); setMenu(true); }} className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line text-lg text-fg-2" aria-label={t("אפשרויות", "Options")}>
          ⋯
        </button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken">
        <div className="h-full rounded-full bg-accent transition-[width] duration-300 ease-linear" style={{ width: `${Math.min(100, Math.max(0, elapsed * 100))}%` }} />
      </div>

      <div className={`flex flex-col ${short ? "mt-3 gap-3" : "mt-5 gap-4"}`}>
        {scoreRow}
        {beads}
      </div>

      {centre}

      <Sheet open={menu} onClose={() => setMenu(false)} title={say({ he: "אפשרויות", en: "Options" }, locale)}>
        <div className="flex flex-col gap-1 pb-2">
          <QuietButton onClick={endByChoice}>{t("סיים משחקון", "End this game")}</QuietButton>
          <QuietButton
            onClick={() => {
              setSoundOff(!muted);
              setMuted(!muted);
            }}
          >
            {muted ? t("הפעל צלילים", "Turn sound on") : t("השתק צלילים", "Mute sound")}
          </QuietButton>
          <QuietButton danger onClick={() => end("pain")}>
            {t("עצור · כאב או תחושה חריגה", "Stop · pain or feeling unwell")}
          </QuietButton>
        </div>
      </Sheet>

      <Sheet open={ending} onClose={() => setEnding(false)} title={exercise ? t(`כמה הספקת ב${say(exercise.name, locale)}?`, `How many ${say(exercise.name, locale)} did you do?`) : ""}>
        {portion && (
          <div className="flex flex-col gap-3 pb-2">
            <div className="flex gap-2">
              {amounts(portion.target).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={numberButton}
                  onClick={() => end("choice", n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <QuietButton onClick={() => end("choice")}>{t("סיים ללא דיווח", "End without a report")}</QuietButton>
          </div>
        )}
      </Sheet>
    </Screen>
  );
}
