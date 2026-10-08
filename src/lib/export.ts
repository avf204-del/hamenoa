// ייצוא הנתונים האישיים (החלטה 35, D-12).
//
// "הנתונים שלך שלך" הוא אחד מארבעת ההבטחות של המוצר, ולכן הייצוא הוא קובץ
// אחד, קריא, שאפשר לפתוח בכל עורך — לא גיבוי פנימי ולא פורמט קנייני.
//
// **מה לא נכנס לקובץ, ולמה:** ‏`googleSub` הוא מזהה החשבון מול גוגל, כלומר
// אמצעי הכניסה עצמו — לא נתון אימון. הוא לא נחשף כאן בשום צורה. הבנייה
// **בוררת שדות במפורש** ולא מעתיקה את שורת המשתמש כמו שהיא, כך שגם שדה
// רגיש שיתווסף לסכמה בעתיד לא ידלוף לקובץ בלי החלטה מפורשת. בדיקה נועלת זאת.
//
// המודול טהור: בלי Prisma, בלי Next. הראוט (src/app/api/me/export/route.ts)
// שולף את השורות ומזין אותן לכאן.

import { localDayOf } from "@/lib/local-day";

/** גרסת מבנה הקובץ — כדי שקורא עתידי יידע מה הוא מחזיק ביד */
export const EXPORT_FORMAT = "hamenoa-export";
// גרסה 2 (ביקורת סבב 35, LEGAL-4): נוסף `usageEvents` — אירועי המדידה
// הפנימית שמדיניות הפרטיות מונה במפורש כמידע שנאסף, ולכן חייבים להופיע
// ב"קובץ JSON עם כל המידע האישי".
// גרסה 3 (C1): נוסף `experience` — העדפות החוויה, קישורי האימונים לחוויה,
// משוב החוויה והישגים/XP. בלי טקסט חופשי: כל הערכים הם מזהי בחירה.
// גרסה 4 (החלטה 47): נוסף `social` — הכינוי, האתגרים והזירות של המשתמש,
// והתוצאות והבחירות **שלו בלבד**. בלי כינויים או מזהים של משתתפים אחרים.
export const EXPORT_FORMAT_VERSION = 6;

type Stamp = Date | string | null;

/** שורת המשתמש כפי שהראוט שולף אותה. אין כאן googleSub — גם לא כאופציה. */
export interface ExportUserRow {
  id: string;
  name: string;
  role: string;
  createdAt: Stamp;
  lastSeenAt: Stamp;
  email: string | null;
  signupSource: string | null;
  disclaimerAcceptedAt: Stamp;
  legalVersion: number | null;
  healthScreenedAt: Stamp;
  healthScreenVersion: number | null;
  healthFlagged: boolean | null;
  healthAnswers: unknown;
  trainingPreferences?: unknown;
}

export interface ExportRows {
  capacity?:unknown;
  user: ExportUserRow;
  trainingPreferences?: unknown;
  calibrations: readonly unknown[];
  locations: readonly unknown[];
  /** אימונים, כל אחד עם הבלוקים שלו ובתוכם ה-SetLog */
  sessions: readonly unknown[];
  swapEvents: readonly unknown[];
  /** מדדים, כל אחד עם התוצאות שלו */
  benchmarks: readonly unknown[];
  feedback: readonly unknown[];
  legalAcceptances: readonly unknown[];
  /** אירועי המדידה הפנימית שנושאים את מזהה המשתמש (PilotEvent) */
  usageEvents: readonly unknown[];
  /** חוויית האימון (C1) — חסר בקריאות ישנות = אין נתוני חוויה */
  loadProgression?: unknown;
  game?: { state: unknown; runs: readonly unknown[]; ledger: readonly unknown[] };
  experience?: ExperienceExport;
  /** אתגרים וזירה (החלטה 47) */
  social?: SocialExport;
  professional?: ProfessionalExport;
}

export interface ProfessionalExport {
  workspacesOwned: readonly unknown[];
  memberships: readonly unknown[];
  invitesCreated: readonly unknown[];
  tags: readonly unknown[];
  sessionMetas: readonly unknown[];
  audits: readonly unknown[];
  comments: readonly unknown[];
}

export interface SocialExport {
  displayName: string | null;
  challenges: readonly unknown[];
  matches: readonly unknown[];
}

export interface ExperienceExport {
  profile: unknown;
  sessions: readonly unknown[];
  feedback: readonly unknown[];
  awards: readonly unknown[];
}

export interface ExportFile {
  capacity?:unknown;
  format: typeof EXPORT_FORMAT;
  formatVersion: typeof EXPORT_FORMAT_VERSION;
  exportedAt: string;
  user: {
    id: string;
    name: string;
    role: string;
    createdAt: string | null;
    lastSeenAt: string | null;
    email: string | null;
    signupSource: string | null;
  };
  legal: {
    acceptedAt: string | null;
    version: number | null;
    acceptances: readonly unknown[];
  };
  health: {
    screenedAt: string | null;
    version: number | null;
    flagged: boolean | null;
    answers: unknown;
  };
  trainingPreferences?: unknown;
  calibrations: readonly unknown[];
  locations: readonly unknown[];
  sessions: readonly unknown[];
  swapEvents: readonly unknown[];
  benchmarks: readonly unknown[];
  feedback: readonly unknown[];
  usageEvents: readonly unknown[];
  loadProgression?: unknown;
  game: { state: unknown; runs: readonly unknown[]; ledger: readonly unknown[] };
  experience: ExperienceExport;
  social: SocialExport;
  professional: ProfessionalExport;
}

/** חותמת זמן אחידה: Date או מחרוזת → ISO, וכל דבר אחר → null */
function stamp(value: Stamp): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return value;
}

/**
 * בניית תוכן קובץ הייצוא. טהורה: אותן שורות → אותו קובץ (פרט ל-exportedAt,
 * שמוזרק כדי שהבדיקה תוכל לקבע אותו).
 */
export function buildExport(rows: ExportRows, now: Date = new Date()): ExportFile {
  const u = rows.user;
  return {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    user: {
      id: u.id,
      name: u.name,
      role: u.role,
      createdAt: stamp(u.createdAt),
      lastSeenAt: stamp(u.lastSeenAt),
      email: u.email ?? null,
      signupSource: u.signupSource ?? null,
    },
    legal: {
      acceptedAt: stamp(u.disclaimerAcceptedAt),
      version: u.legalVersion ?? null,
      acceptances: rows.legalAcceptances,
    },
    health: {
      screenedAt: stamp(u.healthScreenedAt),
      version: u.healthScreenVersion ?? null,
      flagged: u.healthFlagged ?? null,
      answers: u.healthAnswers ?? null,
    },
    trainingPreferences: u.trainingPreferences ?? null,
    calibrations: rows.calibrations,
    locations: rows.locations,
    sessions: rows.sessions,
    swapEvents: rows.swapEvents,
    benchmarks: rows.benchmarks,
    feedback: rows.feedback,
    usageEvents: rows.usageEvents,
    capacity:rows.capacity??null,
    loadProgression: rows.loadProgression,
    game: rows.game ?? { state: null, runs: [], ledger: [] },
    experience: rows.experience ?? { profile: null, sessions: [], feedback: [], awards: [] },
    social: rows.social ?? { displayName: null, challenges: [], matches: [] },
    professional: rows.professional ?? { workspacesOwned: [], memberships: [], invitesCreated: [], tags: [], sessionMetas: [], audits: [], comments: [] },
  };
}

/** שם הקובץ שיישמר אצל המשתמש — לפי היום המקומי (שעון ישראל) */
export function exportFilename(now: Date = new Date()): string {
  return `hamenoa-export-${localDayOf(now)}.json`;
}
