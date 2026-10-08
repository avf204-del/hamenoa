import { NextResponse } from "next/server";
import { ownerGate } from "@/lib/current-user";
import { isJsonObject } from "@/lib/json-object";
import {
  TaggingValidationError,
  updateTaggingEntry,
  type EditableTaggingFields,
} from "@/lib/tagging-store";

const EDITABLE_KEYS: (keyof EditableTaggingFields)[] = [
  "nameHe", "nameEn", "modality", "pattern", "equipment", "stationType",
  "skillLevel", "loadClass", "repPaceSecPerRep", "systemicCost",
  "constraints", "substitutes", "scalingEasier", "scalingHarder",
  "instructionsHe",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const gate = await ownerGate();
  if ("response" in gate) return gate.response;
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, errors: ["עריכת מאגר התרגילים מתבצעת בסביבת הפיתוח ונשמרת בגיט לפני פריסה."] }, { status: 409 });
  }
  const { slug } = await params;
  try {
    const body: unknown = await request.json().catch(() => null);
    if (!isJsonObject(body)) return NextResponse.json({ ok: false, errors: ["בקשה לא תקינה"] }, { status: 400 });
    const fields: Partial<EditableTaggingFields> = {};
    for (const key of EDITABLE_KEYS) {
      if (key in body) {
        (fields as Record<string, unknown>)[key] = body[key];
      }
    }
    const entry = await updateTaggingEntry(slug, fields);
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    if (e instanceof TaggingValidationError) {
      return NextResponse.json({ ok: false, errors: e.errors }, { status: 400 });
    }
    console.error("עדכון תרגיל נכשל:", e);
    return NextResponse.json(
      { ok: false, errors: ["שגיאה לא צפויה בעדכון — בדוק את לוג השרת"] },
      { status: 500 },
    );
  }
}
