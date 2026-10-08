-- סבב 37 — "אימון פעיל אחד למשתמש" הופך מהסכם-בקוד לאילוץ במסד.
--
-- עד כאן הכלל נאכף בתבנית קרא-ואז-צור בלבד (api/sessions, activate,
-- benchmarks, assessment), בלי שום אטומיות: שתי בקשות מקבילות — לחיצה
-- כפולה, רשת שנתקעה, שתי לשוניות — עברו יחד את הבדיקה ויצרו שני אימונים
-- פעילים. מאותו רגע `findFirst({ status: "active" })` מחזיר אחד מהם בסדר
-- לא מוגדר, והמתאמן רושם סטים לשני אימונים לסירוגין בלי לדעת.
--
-- אינדקס ייחודי **חלקי**: רק על שורות active. ‏planned/done/abandoned
-- אינם מוגבלים כלל. ‏Prisma אינה יודעת לתאר תנאי WHERE ב-@@index/@@unique,
-- ולכן האינדקס חי בקובץ הזה בלבד ולא ב-schema.prisma (יש שם הערה ליד
-- המודל). הקוד קורא אותו דרך ACTIVE_SESSION_INDEX ב-src/lib/engine-io.ts.

-- ניקוי לפני האילוץ: אם למישהו כבר יש יותר מאימון פעיל אחד (בדיוק הבאג
-- שהאינדקס בא למנוע), האחרון שנוצר נשאר פעיל וכל השאר נסגרים כ"הופסק"
-- עם completedAt — בדיוק כמו כל נתיב סגירה אחר (סבב 36, D-6).
UPDATE "Session" AS s
SET "status" = 'abandoned',
    "completedAt" = COALESCE(s."completedAt", NOW())
WHERE s."status" = 'active'
  AND s."id" <> (
    SELECT k."id"
    FROM "Session" AS k
    WHERE k."userId" = s."userId" AND k."status" = 'active'
    ORDER BY k."createdAt" DESC, k."id" DESC
    LIMIT 1
  );

-- CreateIndex
CREATE UNIQUE INDEX "Session_userId_active_key"
  ON "Session" ("userId")
  WHERE "status" = 'active';
