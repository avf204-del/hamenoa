// קודי הזמנה (אבן דרך 8, החלטה 21). מאז החלטה 35 זהו **המסלול המשני**:
// ההצטרפות הרגילה היא הרשמה עצמית עם גוגל, והקוד נועד למי שאין לו חשבון
// גוגל, למי שהבעלים מכניס אישית, ולפתיחת דלת כשההרשמה סגורה או מלאה.
// הלוגיקה כאן לא השתנתה: משתמש נוצר מקוד שהבעלים הנפיק ב-/admin ומסר אישית.
//
// **קוד עובד פעם אחת בלבד** (קריטריון הסיום של M8; הכרעת בעלים 26.8):
// הפדיון מסמן `usedAt`, ומאותו רגע הקוד מת — גם למי שפדה אותו. מתאמן שננעל
// בחוץ (עוגייה שפגה, מכשיר חדש, ניקוי דפדפן) לא מתחיל מאפס: הבעלים לוחץ
// "הנפק קוד חדש" על אותה שורת הזמנה, הקוד מתחלף וה-`usedAt` מתאפס — אבל
// ה-`userId` נשאר, ולכן הפדיון החדש מחזיר אותו **לאותו חשבון ולנתונים שלו**.
// כך כל *קוד* נפדה פעם אחת בדיוק, ואף היסטוריה לא הולכת לאיבוד.
//
// שלושת המצבים של שורת הזמנה:
//   usedAt=null,  user=null  → קוד חדש שטרם נפדה (מתאמן חדש)
//   usedAt=null,  user≠null  → קוד שהונפק מחדש למתאמן קיים, ממתין לשימוש
//   usedAt≠null             → נוצל; צריך הנפקה מחדש כדי להיכנס שוב

import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db";
import { recordEvent } from "@/lib/pilot-events";
import { createUser } from "@/lib/users";

/** בלי 0/O/1/I/L — הקוד נמסר בעל פה ובהודעה, ואסור שיהיה בו ספק */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LEN = 8;

/** ‏XXXX-XXXX — הצורה שנשמרת במסד ומוצגת לבעלים */
export function formatInviteCode(letters: string): string {
  return `${letters.slice(0, 4)}-${letters.slice(4, 8)}`;
}

/**
 * ניקוי קלט מהמשתמש: רווחים, מקפים ואותיות קטנות לא אמורים להכשיל כניסה.
 * מחזיר null לכל דבר שאינו קוד באורך הנכון.
 */
export function normalizeInviteCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const letters = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (letters.length !== CODE_LEN) return null;
  return formatInviteCode(letters);
}

/** קוד אקראי אחיד (randomInt דוגם מחדש — בלי הטיית מודולו) */
export function generateInviteCode(): string {
  let letters = "";
  for (let i = 0; i < CODE_LEN; i++) {
    letters += ALPHABET[randomInt(ALPHABET.length)];
  }
  return formatInviteCode(letters);
}

/** קוד שאינו תפוס במסד. התנגשות אקראית נדירה — ובכל זאת מנוסה מחדש. */
async function freshCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    const taken = await prisma.invite.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!taken) return code;
  }
  throw new Error("לא הצלחנו להנפיק קוד ייחודי — נסה שוב.");
}

export interface InviteRow {
  id: string;
  code: string;
  label: string;
  createdAt: string;
  /** מתי הקוד *הנוכחי* נפדה. null = עדיין ניתן לשימוש. */
  usedAt: string | null;
  revoked: boolean;
  /** המשתמש שהקוד שייך לו; null = הקוד עוד לא נפדה מעולם */
  user: { id: string; name: string; lastSeenAt: string | null; sessions: number } | null;
}

type InviteWithUser = {
  id: string;
  code: string;
  label: string;
  createdAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  user: {
    id: string;
    name: string;
    lastSeenAt: Date | null;
    _count: { sessions: number };
  } | null;
};

const WITH_USER = {
  user: {
    select: {
      id: true,
      name: true,
      lastSeenAt: true,
      _count: { select: { sessions: true } },
    },
  },
} as const;

function toRow(row: InviteWithUser): InviteRow {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    createdAt: row.createdAt.toISOString(),
    usedAt: row.usedAt?.toISOString() ?? null,
    revoked: row.revokedAt !== null,
    user: row.user
      ? {
          id: row.user.id,
          name: row.user.name,
          lastSeenAt: row.user.lastSeenAt?.toISOString() ?? null,
          sessions: row.user._count.sessions,
        }
      : null,
  };
}

/** רשימת ההזמנות ללוח הבעלים: מי הוזמן, מי נכנס, ומתי נראה לאחרונה */
export async function listInvites(): Promise<InviteRow[]> {
  const rows = await prisma.invite.findMany({
    orderBy: { createdAt: "desc" },
    include: WITH_USER,
  });
  return rows.map(toRow);
}

/** הנפקת קוד למתאמן חדש */
export async function createInvite(label: string): Promise<InviteRow> {
  const clean = label.trim().slice(0, 60) || "מתאמן";
  const row = await prisma.invite.create({
    data: { code: await freshCode(), label: clean },
    include: WITH_USER,
  });
  return toRow(row);
}

export type ReissueResult =
  | { ok: true; invite: InviteRow }
  | { ok: false; error: string; status: number };

/**
 * הנפקת קוד חדש על אותה שורת הזמנה: הקוד הישן מוחלף (ומפסיק לעבוד),
 * ה-usedAt מתאפס, וה-userId נשאר — כך שהמתאמן חוזר לחשבון ולנתונים שלו.
 */
export async function reissueInvite(id: string): Promise<ReissueResult> {
  const existing = await prisma.invite.findUnique({
    where: { id },
    select: { id: true, revokedAt: true },
  });
  if (!existing) return { ok: false, error: "קוד לא נמצא", status: 404 };
  if (existing.revokedAt) {
    return {
      ok: false,
      error: "הגישה מבוטלת — החזר אותה לפני הנפקת קוד חדש.",
      status: 400,
    };
  }
  const row = await prisma.invite.update({
    where: { id },
    data: { code: await freshCode(), usedAt: null },
    include: WITH_USER,
  });
  return { ok: true, invite: toRow(row) };
}

/** ביטול/החזרה של גישה. ביטול חוסם גם את המשתמש שכבר נוצר מהקוד. */
export async function setInviteRevoked(
  id: string,
  revoked: boolean,
): Promise<boolean> {
  const invite = await prisma.invite.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!invite) return false;
  const at = revoked ? new Date() : null;
  await prisma.$transaction(async (tx) => {
    await tx.invite.update({ where: { id }, data: { revokedAt: at } });
    if (invite.userId) {
      await tx.user.update({ where: { id: invite.userId }, data: { revokedAt: at } });
    }
  });
  // שכבת הכניסה בודקת ביטול מול המסד עם מטמון של שניות (src/lib/access.ts);
  // אין מכאן דרך לנקות אותו — ה-proxy הוא חבילה נפרדת — והחסימה תופסת
  // בתוך אותן שניות. הראוטים והמסכים חוסמים כבר בבקשה הראשונה.
  return true;
}

export type RedeemResult =
  | { ok: true; user: { id: string; name: string; role: "tester" }; created: boolean }
  | { ok: false; error: string; status: number };

/** סימון פנימי למרוץ פדיון (שתי לחיצות במקביל) — מפעיל ניסיון שני */
const CLAIM_RACE = "invite-claim-race";

const USED = {
  ok: false,
  error: "קוד ההזמנה כבר נוצל. בקש מהבעלים קוד חדש.",
  status: 403,
} as const;

async function redeemOnce(code: string): Promise<RedeemResult> {
  return prisma.$transaction(async (tx) => {
    const invite = await tx.invite.findUnique({
      where: { code },
      include: { user: { select: { id: true, name: true, revokedAt: true } } },
    });
    if (!invite) {
      return { ok: false, error: "קוד ההזמנה לא מוכר.", status: 401 } as const;
    }
    if (invite.revokedAt) {
      return { ok: false, error: "קוד ההזמנה בוטל.", status: 403 } as const;
    }
    if (invite.usedAt) return USED;

    // קוד שהונפק מחדש למתאמן קיים — כניסה חוזרת לאותו חשבון, בלי ליצור חדש
    if (invite.user) {
      if (invite.user.revokedAt) {
        return { ok: false, error: "קוד ההזמנה בוטל.", status: 403 } as const;
      }
      const claimed = await tx.invite.updateMany({
        where: { id: invite.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claimed.count === 0) throw new Error(CLAIM_RACE);
      return {
        ok: true,
        user: { id: invite.user.id, name: invite.user.name, role: "tester" },
        created: false,
      } as const;
    }

    const user = await createUser(tx, {
      name: invite.label,
      role: "tester",
      signupSource: "invite",
    });
    // תפיסת הקוד מותנית: פדיון מקביל שהספיק קודם מאפס את המונה, והטרנזקציה
    // הזו מתבטלת יחד עם המשתמש שנוצר בה
    const claimed = await tx.invite.updateMany({
      where: { id: invite.id, usedAt: null, userId: null },
      data: { userId: user.id, usedAt: new Date() },
    });
    if (claimed.count === 0) throw new Error(CLAIM_RACE);
    return {
      ok: true,
      user: { id: user.id, name: user.name, role: "tester" },
      created: true,
    } as const;
  });
}

/** פדיון קוד — פעם אחת בדיוק לכל קוד */
export async function redeemInvite(raw: unknown): Promise<RedeemResult> {
  const code = normalizeInviteCode(raw);
  if (!code) return { ok: false, error: "קוד ההזמנה לא תקין.", status: 400 };
  let result: RedeemResult;
  try {
    result = await redeemOnce(code);
  } catch (e) {
    // מרוץ: הניסיון השני יראה את הקוד כמנוצל ויחזיר את התשובה הנכונה
    if (e instanceof Error && e.message === CLAIM_RACE) {
      result = await redeemOnce(code);
    } else {
      throw e;
    }
  }
  // אירוע ההרשמה נרשם **אחרי** שהטרנזקציה נסגרה בהצלחה, ורק בפדיון שיצר
  // משתמש — כך שניסיון שנכשל או ניסיון חוזר של אותו מתאמן לא נספר (D-8).
  if (result.ok && result.created) {
    void recordEvent("signup", {
      userId: result.user.id,
      userRole: "tester",
      props: { source: "invite" },
    });
  }
  return result;
}
