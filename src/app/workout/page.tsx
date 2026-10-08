import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEFAULT_MINUTES, MINUTE_CHOICES } from "@/components/workout/choices";
import WorkoutBuilder from "@/components/workout/WorkoutBuilder";
import { requireUser } from "@/lib/current-user";
import { openWorkout, placesFor, recentWorkouts } from "@/lib/workout-store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "האימון של היום" };

export default async function WorkoutHome({ searchParams }: { searchParams: Promise<{ new?: string | string[] }> }) {
  const user = await requireUser();
  const [{ new: fresh }, jar, places, open, past] = await Promise.all([
    searchParams,
    cookies(),
    placesFor(user.id),
    openWorkout(user.id),
    recentWorkouts(user.id),
  ]);

  // A workout that is already under way is where the player belongs,
  // unless they came here to build a different one.
  if (open?.started && !fresh) redirect(`/workout/${open.id}`);

  const lastPlace = places.find((p) => p.kind === jar.get("hm-place")?.value)?.kind;
  const lastMinutes = Number(jar.get("hm-minutes")?.value);
  const initial = {
    place: lastPlace ?? places[0]?.kind ?? "home",
    minutes: MINUTE_CHOICES.includes(lastMinutes) ? lastMinutes : DEFAULT_MINUTES,
  };

  return <WorkoutBuilder places={places} initial={initial} open={open} past={past} isOwner={user.role === "owner"} />;
}
