// זריעת נתוני בסיס: הבעלים + שלושה פרופילי מיקום לכל משתמש (החלטות
// 3+7+21+24 ב־docs/DECISIONS.md) + טעינת מאגר התרגילים מ-data/tagging.yaml.
// אידמפוטנטי: רץ שוב בלי כפילויות, ולכן db:reset לעולם לא מאבד את המאגר.
import "dotenv/config";
import {
  GYM_EQUIPMENT,
  DEFAULT_HOME_EQUIPMENT,
  PARK_EQUIPMENT,
} from "../src/lib/equipment";
import { createPrismaClient } from "../src/lib/prisma-client";
import { importExercises } from "../scripts/import-exercises";

const prisma = createPrismaClient();

// חייב להתאים ל-OWNER_ID ב-src/lib/users.ts ול-INSERT שבמיגרציית אבן דרך 8
const OWNER_ID = "usr_owner";

async function ensureOwner(): Promise<{ id: string; created: boolean }> {
  const existing = await prisma.user.findFirst({
    where: { role: "owner" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };
  const owner = await prisma.user.create({
    data: { id: OWNER_ID, name: "הבעלים", role: "owner" },
    select: { id: true },
  });
  return { id: owner.id, created: true };
}

async function ensureLocation(
  userId: string,
  input: { kind: "gym" | "home" | "park"; name: string; equipment: string[] },
) {
  const existing = await prisma.locationProfile.findFirst({
    where: { userId, kind: input.kind },
  });
  if (existing) {
    // חדר הכושר וגן הכושר סטנדרטיים — מתעדכנים עם הקטלוג. הבית בבעלות המשתמש.
    if (input.kind !== "home") {
      await prisma.locationProfile.update({
        where: { id: existing.id },
        data: { equipment: input.equipment },
      });
    }
    return { profile: existing, created: false };
  }
  const profile = await prisma.locationProfile.create({
    data: {
      userId,
      kind: input.kind,
      name: input.name,
      equipment: input.equipment,
      quantities: {},
      peakHours: false,
      constraints: [],
      usuallyTaken: [],
    },
  });
  return { profile, created: true };
}

async function main() {
  const owner = await ensureOwner();
  console.log(`הבעלים: ${owner.created ? "נוצר" : "קיים"} (${owner.id}).`);

  // כל משתמש (הבעלים והנסיינים) מקבל את שני הפרופילים שלו — הציוד של אחד
  // לא נראה ולא נערך על ידי אחר
  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  let created = 0;
  for (const user of users) {
    const gym = await ensureLocation(user.id, {
      kind: "gym",
      name: "חדר כושר",
      equipment: GYM_EQUIPMENT,
    });
    const home = await ensureLocation(user.id, {
      kind: "home",
      name: "בית",
      // ברירת מחדל: כל הציוד הביתי מסומן כקיים; ניתן לשינוי בזרימת הפתיחה
      equipment: DEFAULT_HOME_EQUIPMENT,
    });
    const park = await ensureLocation(user.id, {
      kind: "park",
      name: "גן כושר",
      equipment: PARK_EQUIPMENT,
    });
    if (gym.created) created += 1;
    if (home.created) created += 1;
    if (park.created) created += 1;
  }
  console.log(
    `פרופילי מיקום: ${users.length} משתמשים, ${created} פרופילים נוצרו עכשיו.`,
  );

  const count = await importExercises(prisma);
  console.log(`מאגר התרגילים נטען: ${count} תרגילים, אפס תיוג חסר.`);
}

main()
  .catch((e) => {
    console.error("הזריעה נכשלה:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
