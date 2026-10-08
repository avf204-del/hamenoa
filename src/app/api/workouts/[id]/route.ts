import { NextResponse } from "next/server";
import { userGate } from "@/lib/current-user";
import { loadRun } from "@/lib/workout-store";

// GET — the plan, the events so far and the server clock.

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await userGate();
  if ("response" in gate) return gate.response;
  const { id } = await params;
  const snapshot = await loadRun(gate.userId, id);
  if (!snapshot) return NextResponse.json({ ok: false, error: "האימון לא נמצא" }, { status: 404 });
  return NextResponse.json({ ok: true, ...snapshot });
}
