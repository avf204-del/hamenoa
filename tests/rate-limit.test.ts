// הגבלת הקצב המשותפת (החלטה 35, D-9). המודול מחזיק מצב ברמת המודול, ולכן
// כל בדיקה מאפסת אותו; הזמן מוזרק כפרמטר ולא מזויף — אותו דפוס כמו auth.ts.

import { beforeEach, describe, expect, it } from "vitest";
import {
  GLOBAL_KEY,
  clientIp,
  globalLimit,
  rateLimit,
  resetRateLimits,
} from "../src/lib/rate-limit";

const NOW = 1_800_000_000_000;
const LIMIT = { max: 3, windowMs: 60_000 };

describe("rateLimit — חלון הזזה בזיכרון", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("מעביר עד המכסה וחוסם את הבקשה שאחריה", () => {
    for (let i = 0; i < LIMIT.max; i += 1) {
      expect(rateLimit("t", "1.2.3.4", LIMIT, NOW).ok, `בקשה ${i + 1}`).toBe(true);
    }
    const blocked = rateLimit("t", "1.2.3.4", LIMIT, NOW);
    expect(blocked.ok).toBe(false);
    if (blocked.ok) throw new Error("unreachable");
    expect(blocked.retryAfterSec).toBe(60);
  });

  it("החלון מזיז: אחרי שהבקשה הראשונה יצאה מהחלון נפתח מקום אחד", () => {
    rateLimit("t", "ip", LIMIT, NOW);
    rateLimit("t", "ip", LIMIT, NOW + 10_000);
    rateLimit("t", "ip", LIMIT, NOW + 20_000);
    expect(rateLimit("t", "ip", LIMIT, NOW + 30_000).ok).toBe(false);

    // 60,001 מ"ש אחרי הראשונה — היא כבר מחוץ לחלון
    expect(rateLimit("t", "ip", LIMIT, NOW + 60_001).ok).toBe(true);
    // ומיד אחריה שוב מלא (שלוש בתוך החלון)
    expect(rateLimit("t", "ip", LIMIT, NOW + 60_002).ok).toBe(false);
  });

  it("בקשה חסומה אינה נספרת — היא לא מאריכה את החסימה", () => {
    for (let i = 0; i < LIMIT.max; i += 1) rateLimit("t", "ip", LIMIT, NOW);
    for (let i = 0; i < 20; i += 1) rateLimit("t", "ip", LIMIT, NOW + 1_000 * i);
    // החלון עדיין נמדד מהבקשה הראשונה שהתקבלה, לא מהניסיונות שנחסמו
    expect(rateLimit("t", "ip", LIMIT, NOW + 60_001).ok).toBe(true);
  });

  it("דליים ומפתחות נספרים בנפרד", () => {
    for (let i = 0; i < LIMIT.max; i += 1) rateLimit("a", "ip1", LIMIT, NOW);
    expect(rateLimit("a", "ip1", LIMIT, NOW).ok).toBe(false);
    expect(rateLimit("a", "ip2", LIMIT, NOW).ok).toBe(true);
    expect(rateLimit("b", "ip1", LIMIT, NOW).ok).toBe(true);
  });

  it("זמן ההמתנה המוחזר יורד ככל שהחלון מתקדם, ולעולם לא 0", () => {
    for (let i = 0; i < LIMIT.max; i += 1) rateLimit("t", "ip", LIMIT, NOW);
    const early = rateLimit("t", "ip", LIMIT, NOW + 1_000);
    const late = rateLimit("t", "ip", LIMIT, NOW + 59_900);
    if (early.ok || late.ok) throw new Error("unreachable");
    expect(early.retryAfterSec).toBe(59);
    expect(late.retryAfterSec).toBe(1);
  });
});

describe("clientIp", () => {
  const request = (value: string | null) => ({
    headers: { get: (name: string) => (name === "x-forwarded-for" ? value : null) },
  });

  // ביקורת סבב 35, SEC-3: הערך השמאלי הוא מה שהלקוח שלח בעצמו — מי שרוצה
  // לעקוף מגבלה פשוט מחליף אותו בכל בקשה. הימני נכתב בידי הפרוקסי שלנו.
  it("לוקח את הכתובת מהקצה הימני של השרשרת ומקצץ רווחים", () => {
    expect(clientIp(request("198.51.100.10, 203.0.113.7"))).toBe("203.0.113.7");
    expect(clientIp(request("  203.0.113.7  "))).toBe("203.0.113.7");
  });

  it("החלפת הערך השמאלי לא פותחת חלון חדש", () => {
    const a = clientIp(request("198.51.100.10, 203.0.113.7"));
    const b = clientIp(request("198.51.100.11, 203.0.113.7"));
    expect(a).toBe(b);
  });

  it("בלי כותרת — כולם תחת unknown, ולא כשל", () => {
    expect(clientIp(request(null))).toBe("unknown");
    expect(clientIp(request("")))
      .toBe("unknown");
    expect(clientIp(request(" , "))).toBe("unknown");
  });
});

describe("globalLimit — תקרה שאינה תלויה בכתובת", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("נספרת בדלי אחד לכל הפונים", () => {
    for (let i = 0; i < LIMIT.max; i += 1) {
      expect(globalLimit("g", LIMIT, NOW).ok).toBe(true);
    }
    expect(globalLimit("g", LIMIT, NOW).ok).toBe(false);
    // גם למי שמגיע מכתובת אחרת לגמרי — זו כל הנקודה
    expect(rateLimit("g", GLOBAL_KEY, LIMIT, NOW).ok).toBe(false);
  });
});

describe("גלישת המפה", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("מבול של מפתחות מזויפים לא מאפס את התקרה הגלובלית", () => {
    // התקרה הגלובלית ממוצה
    for (let i = 0; i < LIMIT.max; i += 1) globalLimit("contact-global", LIMIT, NOW);
    expect(globalLimit("contact-global", LIMIT, NOW).ok).toBe(false);

    // ואז 12,000 כתובות מזויפות — יותר מהתקרה של מפת הכתובות
    for (let i = 0; i < 12_000; i += 1) {
      rateLimit("contact", `spoofed-${i}`, LIMIT, NOW + 1);
    }

    // עד ביקורת סבב 35 הגלישה ריקנה את כל המפה, וזו הייתה דרך לאפס כל דלי
    expect(globalLimit("contact-global", LIMIT, NOW + 2).ok).toBe(false);
  });

  it("מפתח פעיל שורד גלישה; ותיק שאין בו תנועה מפונה", () => {
    for (let i = 0; i < LIMIT.max; i += 1) rateLimit("t", "active", LIMIT, NOW);
    for (let i = 0; i < 12_000; i += 1) rateLimit("t", `spoofed-${i}`, LIMIT, NOW - 60_000);

    // הדלי הפעיל (הנגיעה האחרונה בו היא המאוחרת ביותר) עדיין חסום
    expect(rateLimit("t", "active", LIMIT, NOW).ok).toBe(false);
  });
});
