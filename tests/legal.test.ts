// התוכן המשפטי (סבב 35 — פיילוט ציבורי): מבנה שני המסמכים, מילוי הטוקנים,
// היעדר ניסוחים שנפסלו (ויתור פרטיות גורף, "אדם יחיד", "ללא הפרדת גישה"),
// גרסאות, שאלון הבריאות, ופרטי המפעיל ממשתני הסביבה.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CONSENT_SUMMARY,
  DEFAULT_OPERATOR_NAME,
  HEALTH_QUESTIONS,
  HEALTH_SCREEN_VERSION,
  HEALTH_TEXTS,
  LEGAL_VERSION,
  PRIVACY,
  TERMS,
  contactPhrase,
  fillDocument,
  fillTokens,
  operatorInfo,
} from "../src/legal";
import type { LegalDocument, OperatorInfo } from "../src/legal";

const DOCS: LegalDocument[] = [TERMS, PRIVACY];
const WITH_EMAIL: OperatorInfo = { name: "ישראל ישראלי", email: "support@example.test" };
const WITHOUT_EMAIL: OperatorInfo = { name: "ישראל ישראלי", email: null };

const FORBIDDEN = ["ויתור מלא על פרטיות", "אדם יחיד", "ללא הפרדת גישה"];
const ALLOWED_TOKENS = new Set(["operatorName", "contact"]);
const EMAIL_LITERAL = /[\w.+-]+@[\w-]+\.[\w.-]+/;

/** כל הטקסטים של המסמך כמחרוזת אחת (כותרות, פסקאות, נקודות). */
function docText(doc: LegalDocument): string {
  return JSON.stringify(doc);
}

/** כל התוכן המשפטי — מסמכים, תקציר, שאלון — לבדיקת ניסוחים אסורים. */
function everything(): string {
  return [docText(TERMS), docText(PRIVACY), JSON.stringify(CONSENT_SUMMARY), JSON.stringify(HEALTH_QUESTIONS), JSON.stringify(HEALTH_TEXTS)].join("\n");
}

describe("מבנה המסמכים", () => {
  it.each(DOCS)("$slug: לפחות 12 סעיפים עם מזהים ייחודיים ותוכן מלא", (doc) => {
    expect(doc.sections.length).toBeGreaterThanOrEqual(12);
    const ids = doc.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of doc.sections) {
      expect(section.id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(section.title.trim().length).toBeGreaterThan(0);
      expect(section.paragraphs.length).toBeGreaterThan(0);
      for (const p of section.paragraphs) expect(p.trim().length).toBeGreaterThan(0);
      if (section.bullets) {
        expect(section.bullets.length).toBeGreaterThan(0);
        for (const b of section.bullets) expect(b.trim().length).toBeGreaterThan(0);
      }
    }
    expect(doc.title.trim().length).toBeGreaterThan(0);
    expect(doc.shortTitle.trim().length).toBeGreaterThan(0);
    expect(doc.intro.trim().length).toBeGreaterThan(0);
    expect(doc.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("ה-slug של כל מסמך תואם לזהותו", () => {
    expect(TERMS.slug).toBe("terms");
    expect(PRIVACY.slug).toBe("privacy");
  });

  it("תנאי השימוש מכסים את הנושאים החובה", () => {
    const ids = new Set(TERMS.sections.map((s) => s.id));
    for (const id of ["service", "eligibility", "account", "not-medical", "health-screen", "assumption-of-risk", "listen-to-body", "technique", "personalization-limits", "as-is", "liability", "fair-use", "ip", "termination", "changes", "law", "contact"]) {
      expect(ids.has(id), `חסר סעיף ${id}`).toBe(true);
    }
  });

  it("מדיניות הפרטיות מכסה את סעיף 11 ואת שאר הנושאים", () => {
    const ids = new Set(PRIVACY.sections.map((s) => s.id));
    for (const id of ["operator", "data-collected", "sensitive-data", "mandatory", "purposes", "legal-basis", "recipients", "transfer", "backups", "security", "cookies", "retention", "rights", "minors", "changes", "contact"]) {
      expect(ids.has(id), `חסר סעיף ${id}`).toBe(true);
    }
    // המידע הבריאותי מסומן במפורש כמידע בעל רגישות מיוחדת
    expect(docText(PRIVACY)).toContain("מידע בעל רגישות מיוחדת");
  });
});

describe("גרסאות", () => {
  it("N15: מציג את ליבת המשחק ונתוני העבר בלי להרחיב הסכמה או הרשאות", () => {
    expect(LEGAL_VERSION).toBe(6);
    expect(TERMS.version).toBe(4);
    expect(PRIVACY.version).toBe(6);
    expect(TERMS.sections.map((s) => s.id)).toContain('personal-games');
    for (const id of ['challenges-arena', 'arena-referee', 'arena-guests']) expect(TERMS.sections.some(s => s.id === id)).toBe(false);
    expect(PRIVACY.sections.map((s) => s.id)).toContain("social");
    const games = TERMS.sections.find((s) => s.id === 'personal-games')!.paragraphs.join(' ');
    expect(games).toContain('לקצר מנוחה');
    expect(games).toContain('אינם זמינים');
    const social = PRIVACY.sections.find((s) => s.id === "social")!.paragraphs.join(" ");
    expect(social).toContain('תשובות שאלון הבריאות של אורח לא נשמרו');
    expect(social).toContain('מחיקת החשבון');
  });

  it("גרסת שאלון הבריאות היא 1", () => {
    expect(HEALTH_SCREEN_VERSION).toBe(1);
  });
});

describe("טוקנים ומילוי", () => {
  it.each(DOCS)("$slug: משתמש רק בשני הטוקנים המותרים, כולל {{contact}}", (doc) => {
    const text = docText(doc);
    const found = [...text.matchAll(/\{\{([^}]*)\}\}/g)].map((m) => m[1]);
    expect(found.length).toBeGreaterThan(0);
    for (const token of found) expect(ALLOWED_TOKENS.has(token), `טוקן לא מוכר: ${token}`).toBe(true);
    expect(text).toContain("{{contact}}");
  });

  it.each(DOCS)("$slug: אין כתובת דוא\"ל מפורשת בנוסח הגולמי", (doc) => {
    expect(docText(doc)).not.toMatch(EMAIL_LITERAL);
  });

  it.each(DOCS)("$slug: אחרי fillDocument לא נשאר {{ — עם דוא\"ל ובלי", (doc) => {
    const withEmail = docText(fillDocument(doc, WITH_EMAIL));
    expect(withEmail).not.toContain("{{");
    expect(withEmail).toContain(WITH_EMAIL.email);
    expect(withEmail).toContain(WITH_EMAIL.name);

    const withoutEmail = docText(fillDocument(doc, WITHOUT_EMAIL));
    expect(withoutEmail).not.toContain("{{");
    expect(withoutEmail).not.toMatch(EMAIL_LITERAL);
    expect(withoutEmail).toContain("טופס יצירת הקשר באתר");
  });

  it("fillDocument מחזיר עותק עמוק ולא נוגע במקור", () => {
    const filled = fillDocument(TERMS, WITH_EMAIL);
    expect(filled).not.toBe(TERMS);
    expect(filled.sections).not.toBe(TERMS.sections);
    expect(docText(TERMS)).toContain("{{contact}}");
    // מבנה נשמר: אותם מזהים, אותו מספר פסקאות ונקודות
    expect(filled.sections.map((s) => s.id)).toEqual(TERMS.sections.map((s) => s.id));
    filled.sections.forEach((s, i) => {
      expect(s.paragraphs.length).toBe(TERMS.sections[i].paragraphs.length);
      expect(s.bullets?.length).toBe(TERMS.sections[i].bullets?.length);
    });
  });

  it("fillTokens מחליף את כל המופעים", () => {
    const out = fillTokens("{{operatorName}} / {{contact}} / {{operatorName}}", WITHOUT_EMAIL);
    expect(out).toBe("ישראל ישראלי / דרך טופס יצירת הקשר באתר / ישראל ישראלי");
  });

  it("contactPhrase — שני הענפים", () => {
    expect(contactPhrase(WITH_EMAIL)).toBe('בדוא"ל support@example.test או דרך טופס יצירת הקשר באתר');
    expect(contactPhrase(WITHOUT_EMAIL)).toBe("דרך טופס יצירת הקשר באתר");
  });
});

describe("ניסוחים שנפסלו", () => {
  it.each(FORBIDDEN)("הביטוי \"%s\" לא מופיע בשום מקום", (phrase) => {
    expect(everything()).not.toContain(phrase);
  });

  it("הגבלת האחריות מסויגת ל\"במידה המרבית שהדין מתיר\" ומחריגה נזק גוף ברשלנות", () => {
    const liability = TERMS.sections.find((s) => s.id === "liability");
    const text = liability?.paragraphs.join("\n") ?? "";
    expect(text).toContain("במידה המרבית שהדין מתיר");
    expect(text).toContain("נזק גוף");
    expect(text).toContain("רשלנות");
  });
});

describe("תקציר ההסכמה", () => {
  it("6–8 נקודות, תיבת סימון כוללת-מגדר שמזכירה את שני המסמכים, והערה על הגרסה", () => {
    expect(CONSENT_SUMMARY.points.length).toBeGreaterThanOrEqual(6);
    expect(CONSENT_SUMMARY.points.length).toBeLessThanOrEqual(8);
    expect(CONSENT_SUMMARY.checkboxLabel).toContain("תנאי השימוש");
    expect(CONSENT_SUMMARY.checkboxLabel).toContain("מדיניות הפרטיות");
    expect(CONSENT_SUMMARY.checkboxLabel).toContain("מסכים/ה");
    expect(CONSENT_SUMMARY.note).toContain("חותמת זמן");
    expect(CONSENT_SUMMARY.note).toContain("גרסת המסמכים");
    expect(CONSENT_SUMMARY.button.trim().length).toBeGreaterThan(0);
    // התקציר כן לגבי שני הדברים החשובים: שאלון בריאות, והמפעיל רואה הכול
    const all = CONSENT_SUMMARY.points.join("\n");
    expect(all).toContain("שאלון בריאות");
    expect(all).toContain("המפעיל");
    expect(all).toContain("כל הנתונים");
  });
});

describe("שאלון הבריאות", () => {
  it("7–8 שאלות עם מזהים ייחודיים ונוסח מלא", () => {
    expect(HEALTH_QUESTIONS.length).toBeGreaterThanOrEqual(7);
    expect(HEALTH_QUESTIONS.length).toBeLessThanOrEqual(8);
    const ids = HEALTH_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of HEALTH_QUESTIONS) {
      expect(q.id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(q.text.trim().length).toBeGreaterThan(0);
      expect(q.text.startsWith("האם")).toBe(true);
    }
  });

  it("מכסה את התחומים הנדרשים", () => {
    const ids = new Set(HEALTH_QUESTIONS.map((q) => q.id));
    for (const id of ["heart-condition", "chest-pain-exertion", "chest-pain-rest", "dizziness-fainting", "musculoskeletal", "bp-heart-medication", "pregnancy", "other-reason"]) {
      expect(ids.has(id), `חסרה שאלה ${id}`).toBe(true);
    }
  });

  it("הטקסטים: 4–6 סימני עצירה, המלצה לרופא בדגל, ותזכורת שהתשובות הן מידע בריאותי", () => {
    expect(HEALTH_TEXTS.emergency.length).toBeGreaterThanOrEqual(4);
    expect(HEALTH_TEXTS.emergency.length).toBeLessThanOrEqual(6);
    expect(HEALTH_TEXTS.flagged).toContain("רופא");
    expect(HEALTH_TEXTS.ackLabel.trim().length).toBeGreaterThan(0);
    expect(HEALTH_TEXTS.continueLabel.trim().length).toBeGreaterThan(0);
    expect(HEALTH_TEXTS.updateNote).toContain("מידע בעל רגישות מיוחדת");
    expect(HEALTH_TEXTS.updateNote).toContain("תפריט החשבון");
  });
});

describe("operatorInfo — משתני סביבה", () => {
  const saved = { name: process.env.OPERATOR_NAME, email: process.env.SUPPORT_EMAIL };

  beforeEach(() => {
    delete process.env.OPERATOR_NAME;
    delete process.env.SUPPORT_EMAIL;
  });

  afterEach(() => {
    if (saved.name === undefined) delete process.env.OPERATOR_NAME;
    else process.env.OPERATOR_NAME = saved.name;
    if (saved.email === undefined) delete process.env.SUPPORT_EMAIL;
    else process.env.SUPPORT_EMAIL = saved.email;
  });

  it("בלי משתנים: שם ברירת מחדל ודוא\"ל null", () => {
    expect(operatorInfo()).toEqual({ name: DEFAULT_OPERATOR_NAME, email: null });
    expect(DEFAULT_OPERATOR_NAME).toBe("מפעיל האפליקציה");
  });

  it("מחרוזת ריקה או רווחים נחשבות כלא מוגדר", () => {
    process.env.OPERATOR_NAME = "   ";
    process.env.SUPPORT_EMAIL = "";
    expect(operatorInfo()).toEqual({ name: DEFAULT_OPERATOR_NAME, email: null });
  });

  it("ערכים מוגדרים עוברים כמו שהם (בלי רווחים בקצוות)", () => {
    process.env.OPERATOR_NAME = " אבי ";
    process.env.SUPPORT_EMAIL = " help@example.test ";
    expect(operatorInfo()).toEqual({ name: "אבי", email: "help@example.test" });
  });
});
