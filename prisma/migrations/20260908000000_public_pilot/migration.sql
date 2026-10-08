-- החלטה 35 — "המנוע" נפתח לציבור. מיגרציה אחת לסבב:
-- ד'5 — משפטי v3: גרסת המסמכים שאושרה על המשתמש + יומן אישורים append-only;
-- ד'6 — שאלון בריאות לפני האימון הראשון (מועד, גרסה, דגל, והתשובות עצמן);
-- ד'8 — אנליטיקה עצמית (PilotEvent), בלי מפתח זר ובלי כתובות IP;
-- ד'10 — הגדרות הרשמה (AppSetting);
-- ד'11 — משוב מתוך האפליקציה ופניות מטופס יצירת הקשר (Feedback);
-- וכן signupSource על המשתמש (google | invite | owner).
-- כל העמודות החדשות על User אופציונליות: המסד החי מלא בשורות קיימות, ואין
-- backfill — "חסר" נקרא בשערים כ"טרם נעשה", וכל המשתמשים יאשרו מחדש פעם אחת.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "legalVersion" INTEGER;
ALTER TABLE "User" ADD COLUMN "healthScreenedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "healthScreenVersion" INTEGER;
ALTER TABLE "User" ADD COLUMN "healthFlagged" BOOLEAN;
ALTER TABLE "User" ADD COLUMN "healthAnswers" JSONB;
ALTER TABLE "User" ADD COLUMN "signupSource" TEXT;

-- CreateTable
CREATE TABLE "LegalAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PilotEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "userRole" TEXT,
    "visitId" TEXT,
    "path" TEXT,
    "props" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PilotEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "kind" TEXT NOT NULL,
    "rating" INTEGER,
    "name" TEXT,
    "email" TEXT,
    "text" TEXT NOT NULL,
    "path" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegalAcceptance_userId_idx" ON "LegalAcceptance"("userId");

-- CreateIndex
CREATE INDEX "PilotEvent_name_createdAt_idx" ON "PilotEvent"("name", "createdAt");

-- CreateIndex
CREATE INDEX "PilotEvent_userId_idx" ON "PilotEvent"("userId");

-- CreateIndex
CREATE INDEX "PilotEvent_visitId_idx" ON "PilotEvent"("visitId");

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_key_key" ON "AppSetting"("key");

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
