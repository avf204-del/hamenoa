// יעד חוזר בטוח (ביקורת סבב 35, ממצא SEC-1).
//
// הבדיקה הנאיבית שהייתה כאן — "מתחיל ב-/ ולא ב-//" — נשברת מול הדפדפן:
// קו נטוי הפוך שקול לקו נטוי בכתובת http(s), ותווי בקרה נמחקים לפני
// הפענוח. `/\evil.com` נראה כמו נתיב פנימי ונפתר ל-https://evil.com/.
// הבדיקות כאן נועלות את ההתנהגות מול הפענוח האמיתי של `URL`.

import { describe, expect, it } from "vitest";
import { internalRedirectUrl, safeNext } from "../src/lib/safe-next";

const APP = "https://hamenoa-production.up.railway.app/api/auth/google/callback";

describe("safeNext", () => {
  it("מחזיר נתיב פנימי כמו שהוא, עם שאילתה ועוגן", () => {
    expect(safeNext("/")).toBe("/");
    expect(safeNext("/progress")).toBe("/progress");
    expect(safeNext("/terms?x=1#full")).toBe("/terms?x=1#full");
  });

  it("מקבל גם מערך (searchParams של Next) וגם ערך חסר", () => {
    expect(safeNext(["/progress", "/other"])).toBe("/progress");
    expect(safeNext(undefined)).toBe("/");
    expect(safeNext(null)).toBe("/");
    expect(safeNext("")).toBe("/");
  });

  it("דוחה כתובת חיצונית בכל צורה שהדפדפן מפענח כמארח", () => {
    for (const attack of [
      "//evil.com",
      "https://evil.com",
      "http://evil.com/x",
      "/\\evil.com",
      "/\\\\evil.com",
      "/\t/evil.com",
      "/\n/evil.com",
      "javascript:alert(1)",
      "\\\\evil.com",
    ]) {
      expect(safeNext(attack)).toBe("/");
    }
  });

  it("הערכים שנדחו באמת היו יוצאים מהמקור בלי הבדיקה", () => {
    // ההוכחה שהממצא אמיתי ולא תיאורטי: כך הדפדפן מפענח אותם
    expect(new URL("/\\evil.com", APP).origin).toBe("https://evil.com");
    expect(new URL("/\t/evil.com", APP).origin).toBe("https://evil.com");
  });
});

describe("internalRedirectUrl", () => {
  it("בונה כתובת מוחלטת על מקור הבקשה", () => {
    expect(internalRedirectUrl("/progress", APP).href).toBe(
      "https://hamenoa-production.up.railway.app/progress",
    );
  });

  it("יעד זר — נופל לשורש של מקור הבקשה, לא לדומיין הזר", () => {
    for (const attack of ["/\\evil.com", "//evil.com", "https://evil.com/x"]) {
      expect(internalRedirectUrl(attack, APP).href).toBe(
        "https://hamenoa-production.up.railway.app/",
      );
    }
  });
});
