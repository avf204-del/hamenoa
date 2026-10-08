// גיזום הגיבויים (ביקורת סבב 35, ממצא LEGAL-2).
//
// המסמכים המשפטיים מבטיחים שעותק גיבוי נעלם "בתוך 30 יום לכל היותר".
// הגיזום הישן ספר קבצים בלבד; כשהמחשב של המפעיל כבוי שבוע, 30 הקבצים
// נפרשו על 37 יום וההבטחה נשברה בלי שאיש ידע. הבדיקה נועלת את שני
// הכללים — מספר וגיל — ואת זה שגיל מנצח גם כשיש מעט קבצים.

import { describe, expect, it } from "vitest";
import { backupTimestamp, backupsToPrune } from "../scripts/backup-prune";

const NOW = new Date("2026-09-07T12:00:00Z");
const DAY = 86_400_000;

/** שם קובץ גיבוי שנוצר לפני N ימים */
function file(daysAgo: number): string {
  const at = new Date(NOW.getTime() - daysAgo * DAY);
  const stamp = at.toISOString().replace(/[:.]/g, "-").replace("T", "-").slice(0, 19);
  return `engine-${stamp}.json.gz`;
}

describe("backupTimestamp", () => {
  it("קורא את החותמת מהשם", () => {
    expect(backupTimestamp("engine-2026-09-07-17-38-36.json.gz")?.toISOString()).toBe(
      "2026-09-07T17:38:36.000Z",
    );
  });

  it("שם שאינו בתבנית — null, ולא תאריך מומצא", () => {
    expect(backupTimestamp("engine-manual.json.gz")).toBeNull();
  });
});

describe("backupsToPrune", () => {
  it("שומר את N האחרונים ומוחק את מה שמעבר", () => {
    const files = [file(4), file(3), file(2), file(1)];
    expect(backupsToPrune(files, 2, NOW)).toEqual([file(4), file(3)].sort());
  });

  it("קובץ בן יותר מ-30 יום נמחק גם כשיש פחות מ-N קבצים", () => {
    // בדיוק התרחיש: המחשב היה כבוי, יש רק שלושה קבצים והם פרושים על 40 יום
    const files = [file(40), file(31), file(2)];
    expect(backupsToPrune(files, 30, NOW)).toEqual([file(40), file(31)].sort());
  });

  it("קובץ בן פחות מ-30 יום נשאר", () => {
    expect(backupsToPrune([file(29), file(1)], 30, NOW)).toEqual([]);
  });

  it("קבצים שאינם גיבוי לא נוגעים בהם", () => {
    const files = [file(40), "README.md", "engine-manual.json.gz", "engine.sqlite"];
    expect(backupsToPrune(files, 30, NOW)).toEqual([file(40)]);
  });

  it("שם בלי חותמת נגזם רק לפי מספר, לא לפי גיל", () => {
    // אין ממה להסיק גיל — עדיף להשאיר קובץ זר מאשר למחוק בניחוש
    expect(backupsToPrune(["engine-manual.json.gz"], 30, NOW)).toEqual([]);
    expect(backupsToPrune(["engine-a.json.gz", "engine-b.json.gz"], 1, NOW)).toEqual([
      "engine-a.json.gz",
    ]);
  });
});
