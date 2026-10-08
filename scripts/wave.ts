// Optional staging catalog for future content. The machine wave was integrated in T018.
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import type { TaggingEntry } from "./import-exercises";

export const WAVE_PATH = path.join(process.cwd(), "data", "tagging.wave-machines.yaml");

/**
 * סלאגי הציוד החדשים שהגל דורש, עם תוויות עברית מוצעות — זהו בדיוק
 * ה-diff המיועד ל-EquipmentSlug/EQUIPMENT_LABELS/GYM_EQUIPMENT
 * ב-src/lib/equipment.ts (מבוצע בחלון האינטגרציה, לא כאן).
 */
export const WAVE_EQUIPMENT: Record<string, string> = {
  "leg-press-machine": "מכונת לחיצת רגליים",
  "hack-squat-machine": "מכונת האק סקוואט",
  "smith-machine": "מכונת סמית'",
  "leg-extension-machine": "מכונת יישור ברכיים",
  "leg-curl-machine": "מכונת כפיפת ברכיים",
  "adductor-machine": "מכונת קירוב ירכיים",
  "abductor-machine": "מכונת הרחקת ירכיים",
  // chest-press-machine מוזג ל-src/lib/equipment.ts בסבב 33 (החלטה 33 יא)
  // יחד עם machine-chest-press ב-tagging.yaml — כבר לא ציוד-גל ממתין
  "pec-deck": "מכונת פרפר",
  "shoulder-press-machine": "מכונת לחיצת כתפיים",
  "row-machine": "מכונת חתירה בישיבה",
  "ab-crunch-machine": "מכונת כפיפות בטן",
  "calf-machine": "מכונת הרמת עקבים",
  "back-extension-bench": "מתקן יישור גב",
  treadmill: "הליכון",
  "exercise-bike": "אופני כושר",
  elliptical: "אליפטיקל",
  "stair-climber": "מכונת מדרגות",
};

/** רשומות הגל, או אובייקט ריק אם אין קובץ גל */
export function loadWave(): Record<string, TaggingEntry> {
  if (!fs.existsSync(WAVE_PATH)) return {};
  const parsed = parse(fs.readFileSync(WAVE_PATH, "utf8"));
  return (parsed ?? {}) as Record<string, TaggingEntry>;
}
