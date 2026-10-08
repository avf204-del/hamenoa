"use client";

// The home screen: where, how long, with what. One press builds a workout.
// Sensible answers are already chosen, so the usual path is a single tap.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { locationLabel } from "@/catalog/labels";
import type { LocationKind } from "@/catalog/types";
import { formatDate } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { equipmentLabel } from "@/lib/equipment";
import type { PastWorkout, PlaceOption } from "@/lib/workout-store";
import { MINUTE_CHOICES } from "./choices";
import { PrimaryButton } from "./parts";

interface Props {
  places: PlaceOption[];
  /** The player's last choices, read from cookies on the server. */
  initial: { place: LocationKind; minutes: number };
  /** A workout that was built and not finished: waiting to start, or under way. */
  open: { id: string; started: boolean } | null;
  past: PastWorkout[];
  isOwner: boolean;
}

/** Remembered for next time; not sensitive, so a plain cookie. */
function remember(place: string, minutes: number): void {
  const year = 60 * 60 * 24 * 365;
  document.cookie = `hm-place=${place}; path=/; max-age=${year}; samesite=lax`;
  document.cookie = `hm-minutes=${minutes}; path=/; max-age=${year}; samesite=lax`;
}

export default function WorkoutBuilder({ places, initial, open, past, isOwner }: Props) {
  const { t, locale, timeZone } = useLocale();
  const router = useRouter();
  const [place, setPlace] = useState<LocationKind>(initial.place);
  const [minutes, setMinutes] = useState(initial.minutes);
  const [off, setOff] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const all = places.find((p) => p.kind === place)?.equipment ?? [];
  const missing = off[place] ?? [];
  const available = all.filter((item) => !missing.includes(item));

  const toggle = (item: string) =>
    setOff({ ...off, [place]: missing.includes(item) ? missing.filter((x) => x !== item) : [...missing, item] });

  async function build() {
    if (busy) return;
    setBusy(true);
    setError(null);
    remember(place, minutes);
    try {
      const response = await fetch("/api/workouts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ minutes, place, equipment: available }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; id?: string; error?: string; code?: string } | null;
      if (response.status === 403) return router.push(data?.code === "health-required" ? "/health" : "/terms");
      if (!response.ok || !data?.id) {
        setError(data?.error ?? t("בניית האימון נכשלה. נסה שוב.", "Could not build the workout. Try again."));
        setBusy(false);
        return;
      }
      router.push(`/workout/${data.id}`);
    } catch {
      setError(t("אין חיבור. נסה שוב.", "No connection. Try again."));
      setBusy(false);
    }
  }

  const choice = (selected: boolean) =>
    `flex min-h-14 flex-1 items-center justify-center rounded-(--r-m) border px-3 text-center text-base font-medium transition-colors duration-(--t-quick) ${
      selected ? "border-accent bg-accent-soft text-fg" : "border-line bg-raised text-fg-2 hover:text-fg"
    }`;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
      <header className="flex items-center justify-between">
        <span className="font-bold">{t("המנוע", "Hamenoa")}</span>
        <nav className="flex items-center gap-4 text-sm text-fg-2">
          {isOwner && <Link href="/admin" className="hover:text-fg">{t("ניהול", "Admin")}</Link>}
          <Link href="/account" className="hover:text-fg">{t("החשבון שלי", "My account")}</Link>
        </nav>
      </header>

      <h1 className="mt-8 text-4xl font-bold leading-tight">{t("מה עושים היום?", "What are we doing today?")}</h1>

      {open && (
        <Link href={`/workout/${open.id}`} className="mt-5 flex items-center justify-between gap-3 rounded-(--r-l) border border-accent bg-accent-soft px-4 py-4">
          <span className="font-medium">
            {open.started ? t("יש לך אימון באמצע", "You have a workout under way") : t("האימון שבנית מחכה לך", "The workout you built is waiting")}
          </span>
          <span className="font-bold text-accent">{open.started ? t("המשך", "Continue") : t("פתח", "Open")}</span>
        </Link>
      )}

      <fieldset className="mt-7">
        <legend className="mb-2 text-sm text-fg-2">{t("איפה", "Where")}</legend>
        <div className="flex gap-2">
          {places.map((p) => (
            <button key={p.kind} type="button" aria-pressed={place === p.kind} onClick={() => setPlace(p.kind)} className={choice(place === p.kind)}>
              {locationLabel(p.kind, locale)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm text-fg-2">{t("כמה דקות", "How many minutes")}</legend>
        <div className="flex gap-2">
          {MINUTE_CHOICES.map((m) => (
            <button key={m} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(m)} className={`num ${choice(minutes === m)}`}>
              {m}
            </button>
          ))}
        </div>
      </fieldset>

      {all.length > 0 && (
        <details className="mt-5 rounded-(--r-m) border border-line bg-raised px-4 py-3">
          <summary className="flex min-h-8 cursor-pointer items-center justify-between gap-3 text-sm">
            <span className="text-fg-2">{t("ציוד זמין", "Available equipment")}</span>
            <span className="font-medium">
              {available.length === all.length ? t("הכול", "All of it") : <span className="num">{available.length}/{all.length}</span>}
            </span>
          </summary>
          <p className="mt-2 text-sm text-fg-2">{t("כבה מה שתפוס או חסר היום.", "Turn off what is taken or missing today.")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {all.map((item) => {
              const on = !missing.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(item)}
                  className={`min-h-11 rounded-full border px-4 text-sm transition-colors duration-(--t-quick) ${
                    on ? "border-accent bg-accent-soft" : "border-line text-fg-3 line-through"
                  }`}
                >
                  {equipmentLabel(item, locale)}
                </button>
              );
            })}
          </div>
        </details>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-(--r-m) bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-6">
        <PrimaryButton onClick={build} disabled={busy}>
          {busy ? t("בונה…", "Building…") : t("בנה אימון", "Build workout")}
        </PrimaryButton>
      </div>

      {past.length > 0 && (
        <section className="mt-9">
          <h2 className="text-sm text-fg-2">{t("האימונים האחרונים", "Recent workouts")}</h2>
          <ul className="mt-2 divide-y divide-line rounded-(--r-l) border border-line bg-raised">
            {past.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span>{formatDate(new Date(`${w.day}T12:00:00Z`), locale, timeZone)}</span>
                <span className="text-sm text-fg-2">
                  <span className="num">{w.rounds}</span> {t("סבבים", "rounds")}
                  {w.minutes !== null && (
                    <>
                      {" "}· <span className="num">{w.minutes}</span> {t("דק׳", "min")}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
