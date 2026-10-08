// עזרי תצוגה משותפים (שרת ולקוח)

/** mm:ss — לטיימרים ולמשכי זמן */
export function formatClock(totalSec: number): string {
  const clamped = Math.max(0, Math.round(totalSec));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** מספר בלי אפסים נגררים (82.5 → ‎"82.5", 80.0 → "80") */
function trimNumber(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/**
 * תוצאת מדד לפי היחידה שלה (BenchmarkResult.scoreUnit):
 * זמן = mm:ss, משקל = ק"ג, וחזרות כברירת מחדל.
 */
/** תאריך קריא מ-YYYY-MM-DD: ‏"25.8.2026" (בלי אפסים מובילים) */
export function formatDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return day;
  return `${d}.${m}.${y}`;
}

export function formatBenchmarkScore(value: number, unit: string): string {
  if (unit === "seconds") return formatClock(value);
  if (unit === "kg") return `${trimNumber(value)} ק״ג`;
  return `${trimNumber(value)} חזרות`;
}

/**
 * הפרש בין שתי תוצאות מדד, כשחיובי = שיפור: בזמן ("נגד השעון")
 * ירידה בשניות היא השיפור, בחזרות ובמשקל — עלייה.
 */
export function benchmarkDelta(
  latest: number,
  previous: number,
  unit: string,
): number {
  const raw = unit === "seconds" ? previous - latest : latest - previous;
  // עיגול לעשירית — שארית צפה זעירה לא תוצג כ"שיפור 0"
  return Math.round(raw * 10) / 10;
}

/** גודל הדלתא בתצוגה (בלי סימן — הכיוון מוצג בנפרד) */
export function formatBenchmarkDelta(delta: number, unit: string): string {
  const size = Math.abs(delta);
  if (unit === "seconds") return formatClock(size);
  if (unit === "kg") return `${trimNumber(size)} ק״ג`;
  return `${trimNumber(size)}`;
}
