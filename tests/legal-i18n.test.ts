// English twins of the legal/consent/health content (C1). Hebrew stays the
// canonical text; English must mirror its structure exactly and never leak
// Hebrew.

import { describe, expect, it } from "vitest";
import {
  CONSENT_SUMMARY,
  CONSENT_SUMMARY_EN,
  HEALTH_QUESTIONS,
  HEALTH_QUESTIONS_EN,
  HEALTH_SCREEN_VERSION,
  HEALTH_TEXTS,
  HEALTH_TEXTS_EN,
  LEGAL_VERSION,
  PRIVACY,
  PRIVACY_EN,
  TERMS,
  TERMS_EN,
  consentSummary,
  contactPhrase,
  fillDocument,
  healthQuestions,
  healthTexts,
  legalDocument,
  type LegalDocument,
} from "../src/legal";
import { formatEffectiveDate } from "../src/components/legal/legal-format";

const HEBREW = /[֐-׿]/;
const DISCLAIMER =
  "This English version is provided for convenience. If it differs from the Hebrew version, the Hebrew version governs.";

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

const tokens = (doc: LegalDocument, token: string) =>
  doc.sections.map((s) =>
    [...s.paragraphs, ...(s.bullets ?? [])].join(" ").split(token).length - 1,
  );

describe.each([
  ["terms", TERMS, TERMS_EN],
  ["privacy", PRIVACY, PRIVACY_EN],
] as const)("%s — English mirrors Hebrew", (_slug, he, en) => {
  it("same slug, version, date, section ids, paragraph and bullet counts", () => {
    expect(en.slug).toBe(he.slug);
    expect(en.version).toBe(he.version);
    expect(en.effectiveDate).toBe(he.effectiveDate);
    expect(en.sections.map((s) => s.id)).toEqual(he.sections.map((s) => s.id));
    expect(en.sections.map((s) => s.paragraphs.length)).toEqual(
      he.sections.map((s) => s.paragraphs.length),
    );
    expect(en.sections.map((s) => s.bullets?.length ?? null)).toEqual(
      he.sections.map((s) => s.bullets?.length ?? null),
    );
  });

  it("same tokens in the same sections", () => {
    for (const token of ["{{operatorName}}", "{{contact}}"]) {
      expect(tokens(en, token)).toEqual(tokens(he, token));
    }
  });

  it("no Hebrew character, and opens with the governing-language sentence", () => {
    for (const s of strings(en)) expect(s).not.toMatch(HEBREW);
    expect(en.intro.startsWith(DISCLAIMER)).toBe(true);
  });

  it("filled English stays Hebrew-free with the default operator", () => {
    const filled = fillDocument(en, { name: "מפעיל האפליקציה", email: "a@b.co" }, "en");
    for (const s of strings(filled)) expect(s).not.toMatch(HEBREW);
    expect(strings(filled).join(" ")).not.toContain("{{");
  });
});

describe("summary and health — same shape, no Hebrew", () => {
  it("consent summary", () => {
    expect(Object.keys(CONSENT_SUMMARY_EN)).toEqual(Object.keys(CONSENT_SUMMARY));
    expect(CONSENT_SUMMARY_EN.points.length).toBe(CONSENT_SUMMARY.points.length);
    for (const s of strings(CONSENT_SUMMARY_EN)) expect(s).not.toMatch(HEBREW);
  });

  it("health questions: same ids, same order, detail where Hebrew has one", () => {
    expect(HEALTH_QUESTIONS_EN.map((q) => q.id)).toEqual(HEALTH_QUESTIONS.map((q) => q.id));
    expect(HEALTH_QUESTIONS_EN.map((q) => !!q.detail)).toEqual(HEALTH_QUESTIONS.map((q) => !!q.detail));
    for (const s of strings(HEALTH_QUESTIONS_EN)) expect(s).not.toMatch(HEBREW);
  });

  it("health texts: same keys, same emergency list length, doctor advice kept", () => {
    expect(Object.keys(HEALTH_TEXTS_EN)).toEqual(Object.keys(HEALTH_TEXTS));
    expect(HEALTH_TEXTS_EN.emergency.length).toBe(HEALTH_TEXTS.emergency.length);
    expect(HEALTH_TEXTS_EN.flagged).toMatch(/see a doctor/);
    expect(HEALTH_TEXTS_EN.flagged).toMatch(/before you start/);
    expect(HEALTH_TEXTS_EN.emergencyTitle).toContain("101");
    for (const s of strings(HEALTH_TEXTS_EN)) expect(s).not.toMatch(HEBREW);
  });
});

describe("accessors", () => {
  it("Hebrew returns the original constants, untouched", () => {
    expect(legalDocument("terms", "he")).toBe(TERMS);
    expect(legalDocument("privacy", "he")).toBe(PRIVACY);
    expect(consentSummary("he")).toBe(CONSENT_SUMMARY);
    expect(healthQuestions("he")).toBe(HEALTH_QUESTIONS);
    expect(healthTexts("he")).toBe(HEALTH_TEXTS);
  });

  it("English returns the twins", () => {
    expect(legalDocument("terms", "en")).toBe(TERMS_EN);
    expect(legalDocument("privacy", "en")).toBe(PRIVACY_EN);
    expect(consentSummary("en")).toBe(CONSENT_SUMMARY_EN);
    expect(healthQuestions("en")).toBe(HEALTH_QUESTIONS_EN);
    expect(healthTexts("en")).toBe(HEALTH_TEXTS_EN);
  });

  it("fillDocument without locale is unchanged Hebrew", () => {
    const op = { name: "דנה", email: "x@y.co" };
    expect(fillDocument(TERMS, op)).toEqual(fillDocument(TERMS, op, "he"));
    expect(contactPhrase(op)).toBe('בדוא"ל x@y.co או דרך טופס יצירת הקשר באתר');
  });

  it("English contact phrase, with and without email", () => {
    expect(contactPhrase({ name: "n", email: "x@y.co" }, "en")).toBe(
      "by email at x@y.co or via the contact form on the site",
    );
    expect(contactPhrase({ name: "n", email: null }, "en")).toBe("via the contact form on the site");
  });

  it("versions are not bumped by a translation", () => {
    expect(LEGAL_VERSION).toBe(6); // הועלה בהחלטה 47 בגלל תוכן חדש, לא בגלל תרגום
    expect(HEALTH_SCREEN_VERSION).toBe(1);
  });

  it("effective date formats per locale", () => {
    expect(formatEffectiveDate("2026-09-08")).toBe("8.9.2026");
    expect(formatEffectiveDate("2026-09-08", "en")).toBe("8 Sep 2026");
  });
});
