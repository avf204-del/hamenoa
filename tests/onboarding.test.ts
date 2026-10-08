// שרשרת הכניסה הראשונה (החלטה 35, D-1/D-5/D-6). מודול טהור — בלי מוקים,
// רק מצבים מומצאים. הבדיקה המהותית כאן היא **הגרסה**: אישור של נוסח ישן
// אינו אישור של הנוסח הנוכחי, וזה מה שמחזיר את כולם למסך האישור פעם אחת.

import { describe, expect, it } from "vitest";
import { HEALTH_SCREEN_VERSION, LEGAL_VERSION } from "../src/legal";
import {
  healthScreened,
  legalAccepted,
  onboardingRedirect,
  type OnboardingState,
} from "../src/lib/onboarding";

const STAMP = new Date("2026-09-01T08:00:00Z");

function state(patch: Partial<OnboardingState> = {}): OnboardingState {
  return {
    disclaimerAcceptedAt: null,
    legalVersion: null,
    healthScreenedAt: null,
    healthScreenVersion: null,
    ...patch,
  };
}

const done = state({
  disclaimerAcceptedAt: STAMP,
  legalVersion: LEGAL_VERSION,
  healthScreenedAt: STAMP,
  healthScreenVersion: HEALTH_SCREEN_VERSION,
});

describe("legalAccepted", () => {
  it("דורש גם חותמת וגם את הגרסה הנוכחית", () => {
    expect(legalAccepted(done)).toBe(true);
    expect(legalAccepted(state())).toBe(false);
  });

  it("חותמת ותיקה בלי גרסה (משתמש מלפני סבב 35) אינה אישור", () => {
    expect(legalAccepted(state({ disclaimerAcceptedAt: STAMP }))).toBe(false);
  });

  it("אישור של גרסה קודמת אינו אישור של הנוכחית", () => {
    expect(
      legalAccepted(
        state({ disclaimerAcceptedAt: STAMP, legalVersion: LEGAL_VERSION - 1 }),
      ),
    ).toBe(false);
  });

  it("גרסה בלי חותמת אינה אישור", () => {
    expect(legalAccepted(state({ legalVersion: LEGAL_VERSION }))).toBe(false);
  });
});

describe("healthScreened", () => {
  it("דורש גם חותמת וגם את גרסת השאלון הנוכחית", () => {
    expect(healthScreened(done)).toBe(true);
    expect(
      healthScreened(
        state({
          healthScreenedAt: STAMP,
          healthScreenVersion: HEALTH_SCREEN_VERSION + 1,
        }),
      ),
    ).toBe(false);
    expect(healthScreened(state({ healthScreenedAt: STAMP }))).toBe(false);
  });
});

describe("onboardingRedirect", () => {
  it("משפטי קודם לבריאות", () => {
    expect(onboardingRedirect(state())).toBe("/terms");
  });

  it("אחרי אישור המסמכים — שאלון הבריאות", () => {
    expect(
      onboardingRedirect(
        state({ disclaimerAcceptedAt: STAMP, legalVersion: LEGAL_VERSION }),
      ),
    ).toBe("/health");
  });

  it("הכול הושלם — אין הפניה", () => {
    expect(onboardingRedirect(done)).toBe(null);
  });

  it("שאלון מלא בלי אישור משפטי עדיין מוביל ל-/terms", () => {
    expect(
      onboardingRedirect(
        state({
          healthScreenedAt: STAMP,
          healthScreenVersion: HEALTH_SCREEN_VERSION,
        }),
      ),
    ).toBe("/terms");
  });
});
