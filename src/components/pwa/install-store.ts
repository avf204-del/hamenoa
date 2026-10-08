// מאגר אירוע ההתקנה (SPEC סעיף 12, M7).
//
// למה מודול ולא state בקומפוננטה: כרום יורה את beforeinstallprompt פעם
// אחת, מוקדם, על הטעינה הראשונה — ולא משנה באיזה מסך המשתמש נחת. אם
// המאזין נרשם רק כשכרטיס ההתקנה מתרנדר (מסך הבית), אירוע שנורה בזמן
// שהמשתמש היה במסך ההתקדמות נעלם והכפתור לא יופיע לעולם.
// לכן: הלכידה מתחילה מהפריסה השורשית, והכרטיס רק קורא מכאן.

/** אירוע ההתקנה של כרום — עדיין לא בטיפוסים הסטנדרטיים של TS */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let started = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** מתחיל ללכוד את אירועי ההתקנה. בטוח לקריאה חוזרת. */
export function startInstallCapture(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    // בלי preventDefault כרום מציג באנר משלו במקום הכרטיס שלנו
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

export function subscribeInstall(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** הרפרנס יציב עד שהאירוע באמת משתנה — תנאי של useSyncExternalStore */
export function getInstallEvent(): BeforeInstallPromptEvent | null {
  return deferred;
}

/** בשרת אין אירוע התקנה */
export function getServerInstallEvent(): null {
  return null;
}

/** אחרי שהדיאלוג הוצג — האירוע נצרך ואי אפשר להשתמש בו שוב */
export function consumeInstallEvent(): void {
  deferred = null;
  emit();
}
