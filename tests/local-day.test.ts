// שעון "היום" של המוצר (round30-findings confirmed[6]): קבוע לאזור הזמן
// של ישראל בכל מצב, בלי תלות ב-TZ של סביבת הריצה. מדמים חציית חצות
// בקיץ (UTC+3) ובחורף (UTC+2) על ידי העברת רגעים מפורשים ב-UTC.

import { describe, expect, it } from "vitest";
import { localDayOf, todayLocalStr } from "../src/lib/local-day";

describe("localDayOf — היום לפי שעון ישראל", () => {
  it("קיץ (שעון קיץ, UTC+3): 20:59Z עדיין אותו יום בישראל (23:59 מקומי)", () => {
    expect(localDayOf(new Date("2026-06-30T20:59:00Z"))).toBe("2026-06-30");
  });

  it("קיץ: 21:00Z ואילך כבר היום הבא בישראל (00:00 מקומי)", () => {
    expect(localDayOf(new Date("2026-06-30T21:00:00Z"))).toBe("2026-07-01");
  });

  it("חורף (שעון חורף, UTC+2): 21:59Z עדיין אותו יום בישראל", () => {
    expect(localDayOf(new Date("2026-01-15T21:59:00Z"))).toBe("2026-01-15");
  });

  it("חורף: 22:00Z ואילך כבר היום הבא בישראל (00:00 מקומי)", () => {
    expect(localDayOf(new Date("2026-01-15T22:00:00Z"))).toBe("2026-01-16");
  });

  it("צהריים — אין רגישות לגבול בכלל", () => {
    expect(localDayOf(new Date("2026-03-10T10:00:00Z"))).toBe("2026-03-10");
  });

  it("היום המקומי מקדים תמיד את היום ב-UTC בסביבת הגבול, לעולם לא מפגר אחריו", () => {
    // רגע ממש אחרי חצות בישראל, בעודו עדיין אותו יום ב-UTC
    const d = new Date("2026-06-30T21:35:00Z");
    const israelDay = localDayOf(d);
    const utcDay = d.toISOString().slice(0, 10);
    expect(israelDay).toBe("2026-07-01");
    expect(utcDay).toBe("2026-06-30");
    expect(israelDay > utcDay).toBe(true);
  });
});

describe("todayLocalStr — היום הנוכחי", () => {
  it("מחזיר מחרוזת YYYY-MM-DD תקינה", () => {
    expect(todayLocalStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("זהה ל-localDayOf(now) עד כדי אי-דיוק זניח של קריאה כפולה ל-Date.now", () => {
    const before = localDayOf(new Date());
    const now = todayLocalStr();
    // רק אם הבדיקה רצה בדיוק על גבול היום זה יכול להיכשל תיאורטית —
    // בלתי סביר בפועל, ומספיק בשביל בדיקת רגרסיה על ההתנהגות הרגילה.
    expect(now).toBe(before);
  });
});

// buildHistory קיבץ SetLog לפי "יום" עם getTimezoneOffset גולמי (שעון
// השרת/UTC) — לא עקבי עם todayStr/local-day.ts. נעילת מקור: אין את
// התבנית הגולמית בקובץ, וה-lastLoads-grouping עובר דרך localDayOf.
