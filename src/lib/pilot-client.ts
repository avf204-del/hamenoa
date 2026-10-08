// צד הלקוח של המדידה העצמית (החלטה 35, D-8).
//
// **המודול הזה טהור-דפדפן בכוונה: אין בו שום ייבוא.** קומפוננטת "use client"
// שמייבאת ממנו לא גוררת אליה את Prisma דרך שרשרת ייבוא, וזה בדיוק החוק
// שהוא נועד לשמור (CLAUDE.md — גבול שרת/לקוח).
//
// גם רשימת האירועים שהלקוח רשאי לשלוח יושבת כאן, ולא ב-pilot-events.ts:
// הצד ההפוך (שרת → לקוח) מותר, ולכן `pilot-events.ts` מייבא מכאן ומקבל
// בדיקת טיפוסים שכל שם ברשימה הוא באמת אירוע מוכר.

/** האירועים היחידים שהדפדפן רשאי לדווח עליהם ישירות */
export const CLIENT_EVENTS = ["landing_view", "landing_cta"] as const;

export type ClientEventName = (typeof CLIENT_EVENTS)[number];

/** מפתח ה-sessionStorage; מזהה הביקור חי ללשונית אחת ונמחק בסגירתה */
const VISIT_KEY = "hamenoa.visit";

const VISIT_LEN = 12;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** גיבוי לזיכרון: גלישה פרטית וחסימת אחסון לא יפילו את המדידה */
let memoryVisitId: string | null = null;

function newVisitId(): string {
  const values = new Uint8Array(VISIT_LEN);
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(values);
  } else {
    for (let i = 0; i < VISIT_LEN; i += 1) {
      values[i] = Math.floor(Math.random() * 256);
    }
  }
  let out = "";
  for (const value of values) out += ALPHABET[value % ALPHABET.length];
  return out;
}

/**
 * מזהה הביקור הנוכחי: 12 תווים אקראיים, בלי שום פרט מזהה. הוא מה שמאפשר
 * לספור "כמה אנשים ראו את דף הנחיתה" בלי לשמור כתובות IP.
 *
 * כל גישה לאחסון עטופה ב-try/catch: דפדפן שחוסם אחסון זורק כבר בקריאה.
 */
export function getVisitId(): string {
  if (memoryVisitId) return memoryVisitId;
  try {
    const stored = globalThis.sessionStorage?.getItem(VISIT_KEY);
    if (stored && /^[a-z0-9]{6,32}$/.test(stored)) {
      memoryVisitId = stored;
      return stored;
    }
  } catch {
    // אחסון חסום — ממשיכים למזהה בזיכרון
  }
  const fresh = newVisitId();
  memoryVisitId = fresh;
  try {
    globalThis.sessionStorage?.setItem(VISIT_KEY, fresh);
  } catch {
    // אותו דבר: המזהה בזיכרון מספיק לביקור הזה
  }
  return fresh;
}

/**
 * דיווח אירוע. **בולע כל שגיאה ולא מחזיר כלום** — מדידה לעולם לא תשבור
 * מסך, ולא תעכב ניווט: `keepalive` מאפשר לבקשה להשלים גם אחרי שהדף נעזב.
 */
export function trackEvent(
  name: ClientEventName,
  props?: Record<string, unknown>,
): void {
  try {
    if (typeof fetch !== "function") return;
    void fetch("/api/pilot/event", {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        visitId: getVisitId(),
        path: globalThis.location?.pathname ?? null,
        ...(props ? { props } : {}),
      }),
    }).catch(() => {});
  } catch {
    // אין רשת, אין fetch, חוסם פרסומות — לא קורה כלום
  }
}

/**
 * מוסיף `v=<visitId>` לקישור יוצא (כניסת גוגל), כדי שהרשמה שנולדה מדף
 * הנחיתה תישאר מחוברת לביקור שהוליד אותה. הבנייה ידנית ולא דרך `URL`,
 * כי הקישורים כאן יחסיים ואין להם בסיס.
 */
export function withVisit(href: string): string {
  const visit = getVisitId();
  const hashAt = href.indexOf("#");
  const base = hashAt === -1 ? href : href.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : href.slice(hashAt);
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}v=${encodeURIComponent(visit)}${hash}`;
}

/** איפוס מזהה הביקור שבזיכרון — לבדיקות בלבד */
export function resetVisitId(): void {
  memoryVisitId = null;
}
