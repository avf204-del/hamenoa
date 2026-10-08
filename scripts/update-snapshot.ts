// עדכון ה-snapshot של Free Exercise DB (רישיון Unlicense) — הדרך היחידה
// לערוך את data/free-exercise-db.snapshot.json (חוקי חלון התוכן).
// מושך את האינדקס המלא מהמאגר הפתוח, בורר בדיוק את הרשומות שמקורות
// tagging.yaml (וגל מדורג, אם קיים) מפנים אליהן, וכותב snapshot ממוין.
// נכשל בקול רם על מקור שלא קיים במאגר. הרצה: pnpm snapshot:update

import fs from "node:fs";
import path from "node:path";
import { loadTagging } from "./import-exercises";
import { loadWave } from "./wave";

const FULL_DB_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const SNAPSHOT_PATH = path.join(process.cwd(), "data", "free-exercise-db.snapshot.json");

interface UpstreamExercise {
  id: string;
  name: string;
  equipment: string | null;
  level: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
}

async function main() {
  const wanted = new Map<string, string>(); // source id -> הסלאג שמפנה אליו
  for (const [scope, tagging] of [
    ["tagging.yaml", loadTagging()],
    ["tagging.wave-machines.yaml", loadWave()],
  ] as const) {
    for (const [slug, entry] of Object.entries(tagging)) {
      if (entry.source) wanted.set(entry.source, `${scope}:${slug}`);
    }
  }

  const res = await fetch(FULL_DB_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} בהורדת האינדקס המלא`);
  const upstream: UpstreamExercise[] = await res.json();
  const byId = new Map(upstream.map((e) => [e.id, e]));

  const missing = [...wanted.keys()].filter((id) => !byId.has(id));
  if (missing.length) {
    throw new Error(
      "מקורות שלא קיימים במאגר הפתוח:\n" +
        missing.map((id) => `  ${id} (${wanted.get(id)})`).join("\n"),
    );
  }

  const before = fs.existsSync(SNAPSHOT_PATH)
    ? new Set<string>(
        (JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8")).exercises as { id: string }[]).map(
          (e) => e.id,
        ),
      )
    : new Set<string>();

  const exercises = [...wanted.keys()].sort().map((id) => {
    const e = byId.get(id)!;
    return {
      id: e.id,
      name: e.name,
      equipment: e.equipment,
      level: e.level,
      primaryMuscles: e.primaryMuscles,
      secondaryMuscles: e.secondaryMuscles,
    };
  });

  const snapshot = {
    source: "https://github.com/yuhonas/free-exercise-db",
    license: "Unlicense (public domain)",
    fetchedAt: new Date().toISOString().slice(0, 10),
    count: exercises.length,
    exercises,
  };
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 1) + "\n");

  const after = new Set(exercises.map((e) => e.id));
  const added = [...after].filter((id) => !before.has(id));
  const removed = [...before].filter((id) => !after.has(id));
  console.log(`snapshot נכתב: ${exercises.length} רשומות.`);
  if (added.length) console.log("נוספו:", added.join(", "));
  if (removed.length) console.log("הוסרו:", removed.join(", "));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
