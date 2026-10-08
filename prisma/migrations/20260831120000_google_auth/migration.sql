-- כניסה עם גוגל (הרחבה של אבן דרך 8/החלטה 21, פריט 1): קישור חשבון קיים
-- לחשבון גוגל. שתי העמודות אופציונליות — משתמש שלא קישר גוגל לא מושפע,
-- ואין הרשמה חדשה כאן: googleSub מתמלא רק בקישור חשבון קיים או בכניסה
-- עם sub שכבר שייך למשתמש (src/lib/google-auth.ts, src/app/api/auth/google).

-- AlterTable
ALTER TABLE "User" ADD COLUMN "googleSub" TEXT;
ALTER TABLE "User" ADD COLUMN "email" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");
