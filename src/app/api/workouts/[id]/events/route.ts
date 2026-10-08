import { NextResponse } from "next/server";
import type { EndReason, RunEventInput } from "@/core/contract";
import { writeGate } from "@/lib/current-user";
import { isJsonObject } from "@/lib/json-object";
import { appendEvent } from "@/lib/workout-store";

// POST { id, event } — one thing the player did. Sending the same id again is
// safe: it answers with the current state and changes nothing.

const END_REASONS: readonly EndReason[] = ["choice", "pain"];

/** Only well-formed events reach the core; everything else is refused here. */
function parseEvent(raw: unknown): RunEventInput | null {
  if (!isJsonObject(raw) || typeof raw.type !== "string") return null;
  const station = typeof raw.station === "string" ? raw.station : null;
  switch (raw.type) {
    case "begin":
    case "warmup-done":
    case "next":
    case "to-cooldown":
    case "finish":
      return { type: raw.type };
    case "station-start":
    case "portion-start":
      return station ? { type: raw.type, station } : null;
    case "report": {
      // A report must say which portion it is about; the core refuses one that is no longer open.
      const { portion, amount } = raw;
      if (!station || !Number.isInteger(portion)) return null;
      if (amount !== null && typeof amount !== "number") return null;
      return { type: "report", station, portion: portion as number, amount };
    }
    case "station-end":
      // The clock and the rules end stations on their own; a player can only choose to stop.
      return station && END_REASONS.includes(raw.reason as EndReason)
        ? { type: "station-end", station, reason: raw.reason as EndReason }
        : null;
    default:
      return null;
  }
}

// 409: two writes met, try again. 410: this workout is over and takes nothing more.
const STATUS: Record<string, number> = { "not-found": 404, busy: 409, closed: 410 };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await writeGate();
  if ("response" in gate) return gate.response;
  const { id } = await params;

  const body: unknown = await request.json().catch(() => null);
  const eventId = isJsonObject(body) && typeof body.id === "string" ? body.id : "";
  const event = isJsonObject(body) ? parseEvent(body.event) : null;
  // Ids are chosen by the sender; the server's own ids (those with a colon) cannot be imitated.
  if (!event || !/^[A-Za-z0-9-]{8,64}$/.test(eventId)) {
    return NextResponse.json({ ok: false, error: "בקשה לא תקינה" }, { status: 400 });
  }

  const result = await appendEvent(gate.userId, id, eventId, event);
  if (!result.ok) {
    return NextResponse.json({ ok: false, code: result.error }, { status: STATUS[result.error] ?? 422 });
  }
  return NextResponse.json({ ok: true, ...result.snapshot });
}
