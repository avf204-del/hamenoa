// ניסיון חוזר חסום ל-timeout של התעוררות Neon מ-scale-to-zero (HANDOFF
// פריט ז מ-1.9): המנגנון עצמו טהור (בלי Prisma, בלי setTimeout אמיתי —
// sleep מוזרק) כדי שאפשר לבדוק אותו בלי להמתין בפועל בבדיקות.
import { describe, expect, it, vi } from "vitest";
import { withRetry } from "../scripts/backup-retry";

describe("withRetry", () => {
  it("מחזיר בהצלחה מהניסיון הראשון בלי לקרוא ל-sleep", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { sleep });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("מנסה שוב אחרי כישלון ומצליח בניסיון השני, עם קריאה אחת ל-sleep", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("cold start"))
      .mockResolvedValueOnce("ok");
    const result = await withRetry(fn, { sleep, delayMs: 15_000 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(15_000);
  });

  it("מכבד את מספר הניסיונות שהוגדר (retries) ולא מנסה יותר מהם", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fn = vi.fn().mockRejectedValue(new Error("still down"));
    await expect(withRetry(fn, { retries: 2, sleep })).rejects.toThrow("still down");
    expect(fn).toHaveBeenCalledTimes(3); // ניסיון ראשון + 2 חוזרים
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("קורא ל-onRetry עם מספר הניסיון הבא, הסך הכול, והשגיאה — לא לפני הניסיון הראשון", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const onRetry = vi.fn();
    const err1 = new Error("first fail");
    const fn = vi.fn().mockRejectedValueOnce(err1).mockResolvedValueOnce("ok");
    await withRetry(fn, { sleep, onRetry, retries: 2 });
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(2, 3, err1);
  });

  it("ברירת המחדל היא 2 ניסיונות חוזרים (סך הכול 3 קריאות) ו-15 שניות המתנה", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fn = vi.fn().mockRejectedValue(new Error("down"));
    await expect(withRetry(fn, { sleep })).rejects.toThrow("down");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledWith(15_000);
  });

  it("זורק את השגיאה האחרונה כשכל הניסיונות נכשלים", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("first"))
      .mockRejectedValueOnce(new Error("second"))
      .mockRejectedValueOnce(new Error("final"));
    await expect(withRetry(fn, { retries: 2, sleep })).rejects.toThrow("final");
  });
});
