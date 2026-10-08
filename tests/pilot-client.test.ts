// צד הלקוח של המדידה (החלטה 35, D-8). שתי דרישות שאסור להן להישבר:
// המודול אינו מייבא כלום (ולכן קומפוננטת לקוח שמייבאת ממנו לא גוררת את
// Prisma), והוא בולע כל תקלה — אחסון חסום, אין רשת, אין fetch.

import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CLIENT_EVENTS,
  getVisitId,
  resetVisitId,
  trackEvent,
  withVisit,
} from "../src/lib/pilot-client";

const ROOT = path.resolve(import.meta.dirname, "..");

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  } as Storage;
}

const original = {
  sessionStorage: Object.getOwnPropertyDescriptor(globalThis, "sessionStorage"),
  fetch: globalThis.fetch,
};

function setStorage(value: Storage | undefined) {
  Object.defineProperty(globalThis, "sessionStorage", {
    value,
    configurable: true,
    writable: true,
  });
}

describe("pilot-client", () => {
  beforeEach(() => {
    resetVisitId();
    setStorage(fakeStorage());
  });

  afterEach(() => {
    if (original.sessionStorage) {
      Object.defineProperty(globalThis, "sessionStorage", original.sessionStorage);
    } else {
      setStorage(undefined);
    }
    globalThis.fetch = original.fetch;
    vi.restoreAllMocks();
  });

  it("המודול טהור-דפדפן: אין בו שום ייבוא", () => {
    const src = readFileSync(path.join(ROOT, "src/lib/pilot-client.ts"), "utf8");
    expect(src).not.toMatch(/^\s*import\s/m);
  });

  describe("getVisitId", () => {
    it("מזהה של 12 תווים a-z0-9, יציב בין קריאות ונשמר ב-sessionStorage", () => {
      const first = getVisitId();
      expect(first).toMatch(/^[a-z0-9]{12}$/);
      expect(getVisitId()).toBe(first);
      expect(globalThis.sessionStorage.getItem("hamenoa.visit")).toBe(first);
    });

    it("קורא מזהה קיים מהאחסון במקום לייצר חדש", () => {
      globalThis.sessionStorage.setItem("hamenoa.visit", "abc123def456");
      expect(getVisitId()).toBe("abc123def456");
    });

    it("מזהה שמור פגום מוחלף במזהה תקין", () => {
      globalThis.sessionStorage.setItem("hamenoa.visit", "NOT-A-VALID-ID!!");
      expect(getVisitId()).toMatch(/^[a-z0-9]{12}$/);
    });

    it("אחסון שזורק (גלישה פרטית) — נופל למזהה בזיכרון, בלי חריגה", () => {
      setStorage({
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      } as unknown as Storage);
      const id = getVisitId();
      expect(id).toMatch(/^[a-z0-9]{12}$/);
      expect(getVisitId()).toBe(id);
    });
  });

  describe("trackEvent", () => {
    it("שולח POST ל-/api/pilot/event עם keepalive ומזהה הביקור", () => {
      const send = vi.fn(async () => new Response(null, { status: 204 }));
      globalThis.fetch = send as unknown as typeof fetch;

      trackEvent("landing_cta", { placement: "hero" });

      expect(send).toHaveBeenCalledTimes(1);
      const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe("/api/pilot/event");
      expect(init.method).toBe("POST");
      expect(init.keepalive).toBe(true);
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      expect(body.name).toBe("landing_cta");
      expect(body.visitId).toBe(getVisitId());
      expect(body.props).toEqual({ placement: "hero" });
    });

    it("כישלון רשת נבלע — אין חריגה ואין דחייה לא מטופלת", () => {
      globalThis.fetch = (() => Promise.reject(new Error("offline"))) as typeof fetch;
      expect(() => trackEvent("landing_view")).not.toThrow();
    });

    it("בלי fetch כלל — לא קורה כלום", () => {
      globalThis.fetch = undefined as unknown as typeof fetch;
      expect(() => trackEvent("landing_view")).not.toThrow();
    });
  });

  describe("withVisit", () => {
    it("מוסיף v לקישור בלי שאילתה", () => {
      const visit = getVisitId();
      expect(withVisit("/api/auth/google")).toBe(`/api/auth/google?v=${visit}`);
    });

    it("מצרף ב-& לקישור שכבר יש בו שאילתה, ושומר על העוגן בסוף", () => {
      const visit = getVisitId();
      expect(withVisit("/api/auth/google?next=%2F")).toBe(
        `/api/auth/google?next=%2F&v=${visit}`,
      );
      expect(withVisit("/method#engine")).toBe(`/method?v=${visit}#engine`);
    });
  });

  it("רשימת האירועים שהלקוח רשאי לשלוח היא בדיוק שני אירועי דף הנחיתה", () => {
    expect([...CLIENT_EVENTS]).toEqual(["landing_view", "landing_cta"]);
  });
});
