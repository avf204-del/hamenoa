-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "gameBudgetSec" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SetLog" ADD COLUMN     "gameplayEligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gameplayUnits" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "GameState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "materials" INTEGER NOT NULL DEFAULT 0,
    "keys" INTEGER NOT NULL DEFAULT 0,
    "tool" BOOLEAN NOT NULL DEFAULT false,
    "challengeStage" INTEGER NOT NULL DEFAULT 0,
    "buildStage" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "factor" DOUBLE PRECISION NOT NULL,
    "awardedMaterials" INTEGER NOT NULL DEFAULT 0,
    "awardedKeys" INTEGER NOT NULL DEFAULT 0,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "materials" INTEGER NOT NULL DEFAULT 0,
    "keys" INTEGER NOT NULL DEFAULT 0,
    "detail" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameState_userId_key" ON "GameState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GameRun_sessionId_key" ON "GameRun"("sessionId");

-- CreateIndex
CREATE INDEX "GameRun_userId_createdAt_idx" ON "GameRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GameLedger_userId_createdAt_idx" ON "GameLedger"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameLedger_userId_key_key" ON "GameLedger"("userId", "key");

-- AddForeignKey
ALTER TABLE "GameState" ADD CONSTRAINT "GameState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRun" ADD CONSTRAINT "GameRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRun" ADD CONSTRAINT "GameRun_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameLedger" ADD CONSTRAINT "GameLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "GameState" ADD CONSTRAINT "GameState_balances" CHECK ("materials" >= 0 AND "keys" >= 0 AND "challengeStage" BETWEEN 0 AND 4 AND "buildStage" BETWEEN 0 AND 4);
ALTER TABLE "GameRun" ADD CONSTRAINT "GameRun_bounds" CHECK ("factor" BETWEEN 0.65 AND 1.25 AND "progress" BETWEEN 0 AND 1 AND "awardedMaterials" >= 0 AND "awardedKeys" >= 0);
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_gameplayUnits_nonnegative" CHECK ("gameplayUnits" >= 0);
