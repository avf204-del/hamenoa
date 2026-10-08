// תצוגת תוצאות מדד (SPEC סעיף 10): הפורמט לפי היחידה, וכיוון השיפור —
// בזמן שיפור הוא ירידה, בחזרות ובמשקל עלייה. טעות כיוון תציג נסיגה
// כשיפור ירוק, ולכן זה נעול בבדיקה.

import { describe, expect, it } from "vitest";
import {
  benchmarkDelta,
  formatBenchmarkDelta,
  formatBenchmarkScore,
} from "@/lib/format";

describe("formatBenchmarkScore", () => {
  it("שניות מוצגות כשעון mm:ss", () => {
    expect(formatBenchmarkScore(452, "seconds")).toBe("7:32");
    expect(formatBenchmarkScore(60, "seconds")).toBe("1:00");
  });

  it("משקל בק\"ג, בלי אפסים נגררים", () => {
    expect(formatBenchmarkScore(80, "kg")).toBe("80 ק״ג");
    expect(formatBenchmarkScore(82.5, "kg")).toBe("82.5 ק״ג");
  });

  it("חזרות כברירת מחדל", () => {
    expect(formatBenchmarkScore(42, "reps")).toBe("42 חזרות");
  });
});

describe("benchmarkDelta — חיובי תמיד = שיפור", () => {
  it("בזמן: מהר יותר (פחות שניות) הוא שיפור", () => {
    expect(benchmarkDelta(440, 452, "seconds")).toBe(12);
    expect(benchmarkDelta(470, 452, "seconds")).toBe(-18);
  });

  it("בחזרות ובמשקל: יותר הוא שיפור", () => {
    expect(benchmarkDelta(45, 42, "reps")).toBe(3);
    expect(benchmarkDelta(77.5, 80, "kg")).toBe(-2.5);
  });
});

describe("formatBenchmarkDelta", () => {
  it("גודל בלבד, מפורמט לפי היחידה", () => {
    expect(formatBenchmarkDelta(-12, "seconds")).toBe("0:12");
    expect(formatBenchmarkDelta(2.5, "kg")).toBe("2.5 ק״ג");
    expect(formatBenchmarkDelta(-3, "reps")).toBe("3");
  });
});
