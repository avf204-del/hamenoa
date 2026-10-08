-- CreateTable
CREATE TABLE "ExperienceProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "prefs" JSONB NOT NULL,
    "previous" JSONB,
    "dayOverride" JSONB,
    "suggestion" JSONB,
    "nextPlan" JSONB,
    "contentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperienceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "experienceVersion" INTEGER NOT NULL,
    "contentVersion" INTEGER NOT NULL,
    "profileRevision" INTEGER NOT NULL,
    "overrides" JSONB,
    "resolved" JSONB NOT NULL,
    "outcome" TEXT,
    "journeyStep" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "ExperienceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperienceFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceAward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "period" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperienceAward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExperienceProfile_userId_key" ON "ExperienceProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExperienceSession_sessionId_key" ON "ExperienceSession"("sessionId");

-- CreateIndex
CREATE INDEX "ExperienceSession_userId_createdAt_idx" ON "ExperienceSession"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ExperienceFeedback_userId_createdAt_idx" ON "ExperienceFeedback"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExperienceFeedback_sessionId_question_key" ON "ExperienceFeedback"("sessionId", "question");

-- CreateIndex
CREATE INDEX "ExperienceAward_userId_kind_period_idx" ON "ExperienceAward"("userId", "kind", "period");

-- CreateIndex
CREATE UNIQUE INDEX "ExperienceAward_userId_kind_key_key" ON "ExperienceAward"("userId", "kind", "key");

-- AddForeignKey
ALTER TABLE "ExperienceProfile" ADD CONSTRAINT "ExperienceProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceSession" ADD CONSTRAINT "ExperienceSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceSession" ADD CONSTRAINT "ExperienceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceFeedback" ADD CONSTRAINT "ExperienceFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceAward" ADD CONSTRAINT "ExperienceAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

