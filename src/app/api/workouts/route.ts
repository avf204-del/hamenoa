import { NextResponse } from "next/server";
import { userGate, writeGate } from "@/lib/current-user";
import { isJsonObject, jsonNumber } from "@/lib/json-object";
import { rateLimit } from "@/lib/rate-limit";
import { createWorkout, openWorkoutId } from "@/lib/workout-store";

// GET  — the player's unfinished workout, if any.
// POST { minutes, place, equipment? } — build a new workout and return its id.

export async function GET() {
  const gate = await userGate();
  if ("response" in gate) return gate.response;
  return NextResponse.json({ ok: true, id: await openWorkoutId(gate.userId) });
}

const MESSAGES: Record<string, string> = {
  minutes: "בחר משך אימון בין 10 ל-90 דקות",
  place: "מקום האימון לא מוכר",
  "no-exercises": "לא נמצאו תרגילים שמתאימים לציוד שסומן",
};

export async function POST(request: Request) {
  const gate = await writeGate();
  if ("response" in gate) return gate.response;

  const limit = rateLimit("workout-build", gate.userId, { max: 20, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ ok: false, error: "יותר מדי בקשות. נסה שוב בעוד רגע." }, { status: 429 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (!isJsonObject(body)) return NextResponse.json({ ok: false, error: "בקשה לא תקינה" }, { status: 400 });

  const equipment = Array.isArray(body.equipment)
    ? body.equipment.filter((item): item is string => typeof item === "string")
    : undefined;
  const result = await createWorkout(gate.userId, {
    minutes: jsonNumber(body.minutes),
    place: typeof body.place === "string" ? body.place : "",
    equipment,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, code: result.error, error: MESSAGES[result.error] }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
