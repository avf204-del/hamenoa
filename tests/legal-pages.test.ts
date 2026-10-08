// העמודים המשפטיים הציבוריים (סבב 35, D-5): /terms ו-/privacy.
// (עמוד /method הציבורי שנבדק כאן גם הוא נמחק בסבב 41 — ראו method-page.test.ts)
//
// שלושה דברים נשברים כאן בשקט ולא ייצעקו בבנייה:
// (א) noindex — ברירת המחדל בשורש היא robots:{index:false}; עמוד ציבורי
//     שלא דורס אותה יושב במפת האתר ולא נכנס לאינדוקס לעולם;
// (ב) גבול שרת/לקוח — רכיב "use client" שגורר @/lib/db מפיל את הבנייה;
// (ג) נוסח — כל טקסט משפטי חייב לבוא מ-src/legal, אחרת יש שני מקורות אמת
//     ואישור מגורסא מאבד את המשמעות.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PRIVACY, TERMS, fillDocument, operatorInfo } from "../src/legal";
import {
  formatEffectiveDate,
  sectionAnchor,
} from "../src/components/legal/legal-format";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const TERMS_PAGE = "src/app/terms/page.tsx";
const PRIVACY_PAGE = "src/app/privacy/page.tsx";
const VIEW = "src/components/legal/LegalDocumentView.tsx";
const FORM = "src/components/legal/ConsentForm.tsx";
const SUMMARY = "src/components/legal/ConsentSummaryBlock.tsx";

const SERVER_ONLY = [
  "@/lib/db",
  "@/lib/current-user",
  "@/catalog/load",
  "@/lib/progress",
  "@prisma/client",
];

describe("‏/privacy — מדיניות הפרטיות", () => {
  const source = read(PRIVACY_PAGE);

  it("מרנדר את PRIVACY מ-@/legal, ממולא בפרטי המפעיל", () => {
    expect(source).toMatch(/import\s*\{[^}]*\bPRIVACY\b[^}]*\}\s*from\s*"@\/legal"/);
    expect(source).toMatch(/legalDocument\(\s*"privacy"\s*,\s*locale\s*\)/);
    expect(source).toMatch(/fillDocument\(\s*legalDocument\("privacy", locale\)\s*,\s*operatorInfo\(\)\s*,\s*locale\s*\)/);
    expect(source).toContain("LegalDocumentView");
  });

  it("קריאה בלבד — אין בו טופס אישור", () => {
    expect(source).not.toContain("ConsentForm");
  });

  it("פתוח לאורח אנונימי (currentUser, לא requireUser) ויושב ב-PublicShell", () => {
    expect(source).toMatch(/await currentUser\(\)/);
    expect(source).not.toMatch(/requireUser\(/);
    expect(source).toContain("PublicShell");
  });

  it("מציע חזרה לאישור התנאים למי שנמצא באמצע הזרימה", () => {
    expect(source).toContain("legalAccepted(user)");
    expect(source).toContain("חזרה לאישור התנאים");
    expect(source).toContain('href="/terms"');
  });
});

describe("אינדוקס — שני העמודים המשפטיים נפתחים במפורש", () => {
  it.each([TERMS_PAGE, PRIVACY_PAGE])("%s מצהיר index:true", (file) => {
    expect(read(file)).toMatch(/robots:\s*\{\s*index:\s*true,\s*follow:\s*true\s*\}/);
  });

  it("הכותרות הן ה-shortTitle של המסמכים — קצרות מספיק לתבנית של השורש", () => {
    expect(read(TERMS_PAGE)).toContain("TERMS.shortTitle");
    expect(read(PRIVACY_PAGE)).toContain("PRIVACY.shortTitle");
    expect(TERMS.shortTitle.length).toBeLessThan(30);
    expect(PRIVACY.shortTitle.length).toBeLessThan(30);
  });
});

describe("גבול שרת/לקוח בקומפוננטות המשפטיות", () => {
  it("ConsentForm הוא הרכיב היחיד שמוכרז use client", () => {
    expect(read(FORM).trimStart().startsWith('"use client"')).toBe(true);
    for (const file of [VIEW, SUMMARY]) {
      expect(read(file).trimStart().startsWith('"use client"')).toBe(false);
    }
  });

  it.each([VIEW, SUMMARY, FORM])("%s אינו גורר מסד/Prisma", (file) => {
    const source = read(file);
    for (const serverOnly of SERVER_ONLY) {
      expect(source).not.toContain(serverOnly);
    }
  });

  it("אין בקומפוננטות ערכי צבע קשיחים — רק טוקנים", () => {
    for (const file of [VIEW, SUMMARY, FORM]) {
      expect(read(file)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(read(file)).not.toMatch(/\brgba?\(/);
    }
  });
});

describe("LegalDocumentView — שורת הגרסה, העוגנים ותוכן העניינים", () => {
  it("תאריך התחילה מוצג בעברית קצרה, בלי אפסים מובילים", () => {
    expect(formatEffectiveDate("2026-09-08")).toBe("8.9.2026");
    expect(formatEffectiveDate("2026-12-31")).toBe("31.12.2026");
    // קלט לא תקין מוחזר כמו שהוא ולא הופך ל-NaN
    expect(formatEffectiveDate("בקרוב")).toBe("בקרוב");
  });

  it("מזהה העוגן מקדים את שם המסמך — שני המסמכים חולקים מזהי סעיפים", () => {
    expect(sectionAnchor("terms", "contact")).toBe("terms-contact");
    expect(sectionAnchor("privacy", "contact")).toBe("privacy-contact");
    const shared = TERMS.sections
      .map((section) => section.id)
      .filter((id) => PRIVACY.sections.some((section) => section.id === id));
    expect(shared.length).toBeGreaterThan(0);
  });

  it("מספרים מקבלים מחלקת num, והמסמך מגיע כ-prop ולא נקרא מהסביבה", () => {
    const source = read(VIEW);
    expect(source).toContain('className="num"');
    expect(source).toContain("{doc.version}");
    expect(source).toContain("formatEffectiveDate(doc.effectiveDate, locale)");
    expect(source).not.toContain("process.env");
    expect(source).toContain("sectionAnchor(doc.slug, section.id)");
  });
});

describe("המסמכים עצמם ניתנים לרינדור אחרי מילוי", () => {
  it.each([
    ["terms", TERMS],
    ["privacy", PRIVACY],
  ] as const)("%s — בלי טוקנים שנשארו, עם מזהי סעיף ייחודיים", (_slug, doc) => {
    const filled = fillDocument(doc, operatorInfo());
    const all = [
      filled.title,
      filled.intro,
      ...filled.sections.flatMap((section) => [
        section.title,
        ...section.paragraphs,
        ...(section.bullets ?? []),
      ]),
    ].join(" ");
    expect(all).not.toContain("{{");
    const ids = filled.sections.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });
});
