-- אבן דרך 8 (החלטה 21): נסיינים בהזמנה אישית.
-- כל הנתונים האישיים הקיימים במסד נוצרו בידי הבעלים ומשויכים כאן לרשומת
-- המשתמש הקבועה 'usr_owner'. הסדר מכוון: יוצרים את הטבלאות, מוסיפים עמודה
-- שמותר בה NULL, ממלאים, ורק אז אוכפים NOT NULL ומפתחות זרים — כך שאין רגע
-- שבו שורה קיימת מפרה אילוץ. המיגרציה רצה בטרנזקציה אחת: כישלון = חזרה מלאה.

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "userId" TEXT,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_userId_key" ON "Invite"("userId");

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- הבעלים: מזהה קבוע (לא cuid) כדי שגיבוי, שחזור והגירה יצביעו על אותה שורה
INSERT INTO "User" ("id", "name", "role", "createdAt")
VALUES ('usr_owner', 'הבעלים', 'owner', CURRENT_TIMESTAMP);

-- AlterTable — LocationProfile
ALTER TABLE "LocationProfile" ADD COLUMN "userId" TEXT;
UPDATE "LocationProfile" SET "userId" = 'usr_owner' WHERE "userId" IS NULL;
ALTER TABLE "LocationProfile" ALTER COLUMN "userId" SET NOT NULL;
CREATE INDEX "LocationProfile_userId_kind_idx" ON "LocationProfile"("userId", "kind");
ALTER TABLE "LocationProfile" ADD CONSTRAINT "LocationProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable — UserCalibration
ALTER TABLE "UserCalibration" ADD COLUMN "userId" TEXT;
UPDATE "UserCalibration" SET "userId" = 'usr_owner' WHERE "userId" IS NULL;
ALTER TABLE "UserCalibration" ALTER COLUMN "userId" SET NOT NULL;
CREATE INDEX "UserCalibration_userId_createdAt_idx" ON "UserCalibration"("userId", "createdAt");
ALTER TABLE "UserCalibration" ADD CONSTRAINT "UserCalibration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable — Session
ALTER TABLE "Session" ADD COLUMN "userId" TEXT;
UPDATE "Session" SET "userId" = 'usr_owner' WHERE "userId" IS NULL;
ALTER TABLE "Session" ALTER COLUMN "userId" SET NOT NULL;
CREATE INDEX "Session_userId_date_idx" ON "Session"("userId", "date");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable — SetLog (השיוך נגזר מהאימון שהסט נרשם בו)
ALTER TABLE "SetLog" ADD COLUMN "userId" TEXT;
UPDATE "SetLog" SET "userId" = 'usr_owner' WHERE "userId" IS NULL;
ALTER TABLE "SetLog" ALTER COLUMN "userId" SET NOT NULL;
CREATE INDEX "SetLog_userId_completedAt_idx" ON "SetLog"("userId", "completedAt");
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable — Benchmark. ההגדרות זהות לכולם, אבל המצב (דחיית "יום מדד?",
-- התוצאות) הוא אישי — ולכן הרשומה עצמה פר-משתמש והייחודיות עוברת ל-(userId, slug).
ALTER TABLE "Benchmark" ADD COLUMN "userId" TEXT;
UPDATE "Benchmark" SET "userId" = 'usr_owner' WHERE "userId" IS NULL;
ALTER TABLE "Benchmark" ALTER COLUMN "userId" SET NOT NULL;
DROP INDEX "Benchmark_slug_key";
CREATE UNIQUE INDEX "Benchmark_userId_slug_key" ON "Benchmark"("userId", "slug");
ALTER TABLE "Benchmark" ADD CONSTRAINT "Benchmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable — BenchmarkResult
ALTER TABLE "BenchmarkResult" ADD COLUMN "userId" TEXT;
UPDATE "BenchmarkResult" SET "userId" = 'usr_owner' WHERE "userId" IS NULL;
ALTER TABLE "BenchmarkResult" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "BenchmarkResult" ADD CONSTRAINT "BenchmarkResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- מחיקת משתמש גוררת את כל נתוניו: התוצאה נמחקת עם המדד ועם האימון, ולא
-- חוסמת אותם ב-RESTRICT (שהיה נכון כשהיה משתמש אחד ואיש לא נמחק).
ALTER TABLE "BenchmarkResult" DROP CONSTRAINT "BenchmarkResult_benchmarkId_fkey";
ALTER TABLE "BenchmarkResult" ADD CONSTRAINT "BenchmarkResult_benchmarkId_fkey" FOREIGN KEY ("benchmarkId") REFERENCES "Benchmark"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BenchmarkResult" DROP CONSTRAINT "BenchmarkResult_sessionId_fkey";
ALTER TABLE "BenchmarkResult" ADD CONSTRAINT "BenchmarkResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
