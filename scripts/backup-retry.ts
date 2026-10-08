// ניסיון חוזר חסום לפעולה אסינכרונית שעלולה להיכשל כי המסד עוד "ישן" —
// המקרה הידוע: Neon מתעורר מ-scale-to-zero, וההתחברות/השאילתה הראשונה
// נתקעת/נכשלת בזמן ההתעוררות. עוטפים רק את הפעולה הראשונה; אחרי שהיא
// מצליחה המסד ער, ושאר הריצה לא עוברת דרך כאן.
//
// טהור: בלי Prisma, בלי console, בלי setTimeout אמיתי בברירת מחדל שאי
// אפשר להזריק לו stub — קורא ה-caller מזין sleep/onRetry, ולכן ניתן
// לבדוק ב-Vitest בלי להמתין בפועל (ר' tests/backup-retry.test.ts).

export type RetryOptions = {
  /** כמה ניסיונות חוזרים מעבר לניסיון הראשון (ברירת מחדל: 2) */
  retries?: number;
  /** המתנה בין ניסיונות, במילישניות (ברירת מחדל: 15000) */
  delayMs?: number;
  /** מוזרק לבדיקות כדי לא להמתין באמת */
  sleep?: (ms: number) => Promise<void>;
  /** נקרא לפני כל ניסיון חוזר (לא לפני הניסיון הראשון) */
  onRetry?: (attempt: number, totalAttempts: number, error: unknown) => void;
};

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    retries = 2,
    delayMs = 15_000,
    sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
    onRetry,
  } = options;
  const totalAttempts = retries + 1;
  let lastError: unknown;
  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt === totalAttempts) break;
      onRetry?.(attempt + 1, totalAttempts, e);
      await sleep(delayMs);
    }
  }
  throw lastError;
}
