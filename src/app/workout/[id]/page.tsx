import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WorkoutRun from "@/components/workout/WorkoutRun";
import { requireUserId } from "@/lib/current-user";
import { exerciseInfoForSlugs } from "@/lib/exercise-info";
import { loadRun } from "@/lib/workout-store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "אימון" };

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const data = await loadRun(userId, id);
  if (!data) notFound();

  // Pictures and instructions for everything this workout shows.
  const { workout } = data;
  const keys = [
    ...workout.stations.flatMap((s) => s.exercises.map((e) => e.slug)),
    ...workout.warmup.map((item) => item.key),
    ...workout.cooldown.map((item) => item.key),
  ];
  const info = await exerciseInfoForSlugs([...new Set(keys)]);

  return <WorkoutRun data={data} info={info} />;
}
