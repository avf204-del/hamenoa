"use client";

// After the bell: the result, how it stands against the earlier one, and
// the way onward. Ending a game never ends the workout.

import type { Score, Station, StationView } from "@/core/contract";
import { compareScores, ruleFor } from "@/core/games";
import { useLocale } from "@/i18n/client";
import { say } from "./format";
import { PrimaryButton, QuietButton, Screen } from "./parts";
import type { Run } from "./useRun";

interface Props {
  station: Station;
  view: StationView;
  best: Score | undefined;
  isLast: boolean;
  send: Run["send"];
}

export default function StationEnded({ station, view, best, isLast, send }: Props) {
  const { t, locale } = useLocale();
  const { score, endReason } = view;
  const pain = endReason === "pain";
  const outcome = best ? compareScores(score, best) : null;
  const record = outcome !== null && outcome < 0;

  const why =
    endReason === "time"
      ? t("הזמן הסתיים", "Time is up")
      : pain
        ? t("עצרת בגלל כאב או תחושה חריגה", "You stopped because of pain or feeling unwell")
        : t("סיימת את המשחקון", "You ended the game");

  const against =
    outcome === null
      ? t("זו תוצאת הפתיחה שלך במסלול הזה. בפעם הבאה מנסים לעבור אותה.", "This is your opening result on this round. Next time, try to pass it.")
      : record
        ? t(`עברת את התוצאה הקודמת: ${say(best!.text, "he")}.`, `You passed your earlier result: ${say(best!.text, "en")}.`)
        : outcome === 0
          ? t("השווית בדיוק את התוצאה הקודמת.", "You matched your earlier result exactly.")
          : t(`התוצאה לנצח נשארת: ${say(best!.text, "he")}.`, `The result to beat is still: ${say(best!.text, "en")}.`);

  const onward = pain || isLast;

  return (
    <Screen
      actions={
        <>
          <PrimaryButton onClick={() => send(onward ? { type: "to-cooldown" } : { type: "next" })}>
            {onward ? t("לשחרור", "To cool-down") : t("למשחקון הבא", "Next game")}
          </PrimaryButton>
          <QuietButton onClick={() => send({ type: "finish" })}>{t("סיים אימון עכשיו", "Finish the workout now")}</QuietButton>
        </>
      }
    >
      <p className="text-sm text-fg-2">{say(ruleFor(station.game).title, locale)} · {why}</p>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        {record && <div className="rounded-full bg-ok-soft px-4 py-1.5 font-bold text-ok">{t("תוצאה חדשה לנצח", "A new result to beat")}</div>}
        <div className={`num font-semibold leading-none ${record ? "animate-goal-glow" : ""}`} style={{ fontSize: "var(--fs-timer)" }}>
          {score.value}
        </div>
        <div className="text-xl font-medium">{say(score.unit, locale)}</div>
        {score.rank.slice(1).some((n) => n > 0) && <p className="text-fg-2">{say(score.text, locale)}</p>}
        {!pain && <p className="mt-4 max-w-xs leading-relaxed text-fg-2">{against}</p>}
        {pain && (
          <p className="mt-4 max-w-xs leading-relaxed text-fg-2">
            {t("העבודה שביצעת נשמרה. לא ממשיכים למשחקון נוסף. אם התחושה לא חולפת, מומלץ לפנות לרופא.", "Your work was saved. No further game today. If the feeling does not pass, see a doctor.")}
          </p>
        )}
      </div>
    </Screen>
  );
}
