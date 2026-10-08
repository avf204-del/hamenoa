// שער נגד סחיפה: תיאור הטבלאות ב-scripts/db-schema.ts משמש גם להעתקת
// הנתונים ל-Postgres וגם לגיבוי. שדה חדש בסכמה שלא נוסף שם = שדה שלא
// מגובה ולא מועתק — כישלון שקט. הבדיקה משווה את השניים.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MODELS, type ColumnKind } from "../scripts/db-schema";

/** רק טיפוסים סקלריים הם עמודות בטבלה; שדה מטיפוס מודל הוא קשר */
const SCALARS: Record<string, ColumnKind> = {
  String: "scalar",
  Int: "scalar",
  Float: "scalar",
  Boolean: "bool",
  DateTime: "date",
  Json: "json",
};

function parseSchema(): Map<string, Record<string, ColumnKind>> {
  const models = new Map<string, Record<string, ColumnKind>>();
  let current: Record<string, ColumnKind> | null = null;
  for (const rawLine of readFileSync("prisma/schema.prisma", "utf8").split("\n")) {
    // ההערות מוסרות ראשונות — יש בהן סוגריים מסולסלים ({ [equipment]: number })
    const line = rawLine.replace(/\/\/.*$/, "").trim();
    const model = /^model\s+(\w+)\s*\{$/.exec(line);
    if (model) {
      current = {};
      models.set(model[1], current);
      continue;
    }
    if (line === "}") {
      current = null;
      continue;
    }
    if (!current) continue;
    const field = /^(\w+)\s+(\w+)(\[\])?/.exec(line);
    if (!field) continue;
    const [, name, type, list] = field;
    if (list || !(type in SCALARS)) continue;
    current[name] = SCALARS[type];
  }
  return models;
}

describe("תיאור הטבלאות לגיבוי ולהעתקה תואם ל-schema.prisma", () => {
  const schema = parseSchema();

  it("כל מודל בסכמה מופיע ברשימה", () => {
    expect([...schema.keys()].sort()).toEqual(MODELS.map((m) => m.table).sort());
  });

  it("לכל מודל: אותן עמודות ואותם סוגי המרה", () => {
    for (const spec of MODELS) {
      expect(schema.get(spec.table), `מודל חסר: ${spec.table}`).toEqual(
        spec.columns,
      );
    }
  });

  it("סדר ההוספה מכבד מפתחות זרים (הורה לפני ילד)", () => {
    const position = new Map(MODELS.map((m, i) => [m.table, i]));
    const edges: [string, string][] = [
      // אבן דרך 8: המשתמש הוא ההורה של כל הנתונים האישיים
      ["User", "Invite"],
      ["User", "LocationProfile"],
      ["User", "UserCalibration"],
      ["User", "Benchmark"],
      ["User", "Session"],
      ["User", "SetLog"],
      ["User", "BenchmarkResult"],
      ["LocationProfile", "Session"],
      ["Session", "Block"],
      ["Block", "SetLog"],
      ["Exercise", "SetLog"],
      ["Session", "SwapEvent"],
      ["Benchmark", "BenchmarkResult"],
      ["Session", "BenchmarkResult"],
      // סבב 35: יומן האישורים המשפטיים והמשוב תלויים במשתמש
      ["User", "LegalAcceptance"],
      ["User", "Feedback"],
      // C1: נתוני החוויה תלויים במשתמש, והקישור לאימון גם ב-Session
      ["User", "ExperienceProfile"],
      ["User", "ExperienceSession"],
      ["Session", "ExperienceSession"],
      ["User", "ExperienceFeedback"],
      ["User", "ExperienceAward"],
      // החלטה 47: אתגרים וזירה
      ["User", "Challenge"],
      ["Challenge", "ChallengeMember"],
      ["User", "ChallengeMember"],
      ["User", "Match"],
      ["Match", "MatchParticipant"],
      ["User", "MatchParticipant"],
      ["Match", "MatchResult"],
      ["MatchParticipant", "MatchResult"],
    ];
    for (const [parent, child] of edges) {
      expect(position.get(parent)!).toBeLessThan(position.get(child)!);
    }
  });
});
