// ייצוא הנתונים האישיים (החלטה 35, D-12).
//
// שתי דרישות מהותיות נבדקות כאן:
// • **googleSub לא נמצא בקובץ.** זה אמצעי הכניסה, לא נתון אימון. הבנייה
//   בוררת שדות במפורש, ולכן גם שורה שמכילה אותו לא מדליפה אותו החוצה.
// • **הכול בפנים.** אימונים, כיול, מיקומים, החלפות, מדדים, משוב, אישורים
//   ותשובות השאלון — כי "הנתונים שלך שלך" הוא הבטחה, לא כותרת.

import { describe, expect, it } from "vitest";
import {
  EXPORT_FORMAT,
  EXPORT_FORMAT_VERSION,
  buildExport,
  exportFilename,
  type ExportRows,
} from "../src/lib/export";

const NOW = new Date("2026-09-07T10:30:00.000Z");
const CREATED = new Date("2026-08-01T06:00:00.000Z");

function rows(patch: Partial<ExportRows> = {}): ExportRows {
  return {
    user: {
      id: "usr_t1",
      name: "דנה כהן",
      role: "tester",
      createdAt: CREATED,
      lastSeenAt: null,
      email: "dana@example.com",
      signupSource: "google",
      disclaimerAcceptedAt: CREATED,
      legalVersion: 3,
      healthScreenedAt: CREATED,
      healthScreenVersion: 1,
      healthFlagged: false,
      healthAnswers: { answers: { q1: false }, acknowledged: false },
    },
    calibrations: [{ id: "cal_1", level: 3 }],
    locations: [{ id: "loc_1", kind: "gym" }],
    sessions: [
      {
        id: "ses_1",
        status: "done",
        blocks: [{ id: "blk_1", type: "warmup", setLogs: [{ id: "log_1", actualReps: 10 }] }],
      },
    ],
    swapEvents: [{ id: "swp_1", reason: "busy" }],
    benchmarks: [{ id: "bm_1", slug: "baseline", results: [{ id: "res_1", scoreValue: 42 }] }],
    feedback: [{ id: "fb_1", kind: "feedback", text: "אימון טוב" }],
    legalAcceptances: [{ id: "la_1", version: 3 }],
    usageEvents: [
      { name: "signup", path: "/", props: { source: "google" }, createdAt: NOW },
      { name: "session_completed", path: null, props: { score: 80 }, createdAt: NOW },
    ],
    ...patch,
  };
}

describe("buildExport", () => {
  it("מסמן את הפורמט ואת מועד הייצוא", () => {
    const file = buildExport(rows(), NOW);
    expect(file.format).toBe(EXPORT_FORMAT);
    expect(file.formatVersion).toBe(EXPORT_FORMAT_VERSION);
    expect(file.exportedAt).toBe("2026-09-07T10:30:00.000Z");
  });

  it("googleSub לא נמצא בקובץ — גם כשהוא יושב בשורה שנכנסה", () => {
    const withSecret = rows();
    // שדה שאינו בטיפוס, כמו שורה שנשלפה בטעות עם select רחב מדי
    (withSecret.user as unknown as Record<string, unknown>).googleSub =
      "109876543210987654321";

    const json = JSON.stringify(buildExport(withSecret, NOW));
    expect(json).not.toContain("googleSub");
    expect(json).not.toContain("109876543210987654321");
  });

  it("פרטי המשתמש עוברים בשלמותם, וחותמות הזמן כ-ISO", () => {
    const file = buildExport(rows(), NOW);
    expect(file.user).toEqual({
      id: "usr_t1",
      name: "דנה כהן",
      role: "tester",
      createdAt: "2026-08-01T06:00:00.000Z",
      lastSeenAt: null,
      email: "dana@example.com",
      signupSource: "google",
    });
  });

  it("המשפטי והבריאותי יושבים בסעיפים משלהם, עם התשובות המלאות", () => {
    const file = buildExport(rows(), NOW);
    expect(file.legal).toEqual({
      acceptedAt: "2026-08-01T06:00:00.000Z",
      version: 3,
      acceptances: [{ id: "la_1", version: 3 }],
    });
    expect(file.health).toEqual({
      screenedAt: "2026-08-01T06:00:00.000Z",
      version: 1,
      flagged: false,
      answers: { answers: { q1: false }, acknowledged: false },
    });
  });

  it("כל שאר האוספים עוברים כמו שהם — כולל בלוקים וסטים בתוך האימון", () => {
    const source = rows();
    const file = buildExport(source, NOW);
    expect(file.calibrations).toEqual(source.calibrations);
    expect(file.locations).toEqual(source.locations);
    expect(file.sessions).toEqual(source.sessions);
    expect(file.swapEvents).toEqual(source.swapEvents);
    expect(file.benchmarks).toEqual(source.benchmarks);
    expect(file.feedback).toEqual(source.feedback);

    const session = file.sessions[0] as { blocks: { setLogs: unknown[] }[] };
    expect(session.blocks[0].setLogs).toHaveLength(1);
  });

  // ביקורת סבב 35, LEGAL-4: המדיניות מונה "נתוני שימוש (מדידה פנימית)"
  // ברשימת המידע שנאסף, ומבטיחה קובץ עם **כל** המידע האישי.
  it("אירועי המדידה של המשתמש נכללים בקובץ", () => {
    const source = rows();
    const file = buildExport(source, NOW);
    expect(file.usageEvents).toEqual(source.usageEvents);
  });

  it("משתמש חדש בלי שום נתון — קובץ תקין עם אוספים ריקים, לא שגיאה", () => {
    const empty = buildExport(
      rows({
        calibrations: [],
        locations: [],
        sessions: [],
        swapEvents: [],
        benchmarks: [],
        feedback: [],
        legalAcceptances: [],
        usageEvents: [],
      }),
      NOW,
    );
    expect(empty.sessions).toEqual([]);
    expect(empty.legal.acceptances).toEqual([]);
  });

  it("שדות רשות ריקים הופכים ל-null ולא נעלמים מהמבנה", () => {
    const bare = buildExport(
      rows({
        user: {
          ...rows().user,
          email: null,
          signupSource: null,
          disclaimerAcceptedAt: null,
          legalVersion: null,
          healthScreenedAt: null,
          healthScreenVersion: null,
          healthFlagged: null,
          healthAnswers: null,
        },
      }),
      NOW,
    );
    expect(bare.user.email).toBe(null);
    expect(bare.legal.acceptedAt).toBe(null);
    expect(bare.health).toEqual({
      screenedAt: null,
      version: null,
      flagged: null,
      answers: null,
    });
  });
});

describe("exportFilename", () => {
  it("נושא את היום המקומי, ומסתיים ב-json", () => {
    expect(exportFilename(NOW)).toBe("hamenoa-export-2026-09-07.json");
  });

  it("שעון ישראל, לא UTC — חצות ושלוש דקות הוא כבר היום הבא", () => {
    // 21:05 UTC = 00:05 שעון ישראל למחרת
    expect(exportFilename(new Date("2026-06-30T21:05:00.000Z"))).toBe(
      "hamenoa-export-2026-07-01.json",
    );
  });
});
