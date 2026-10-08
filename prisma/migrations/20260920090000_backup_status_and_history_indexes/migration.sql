ALTER TABLE "BackupRun" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ok';
ALTER TABLE "BackupRun" ADD COLUMN "error" TEXT;
ALTER TABLE "Session" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "BackupRun_source_finishedAt_idx" ON "BackupRun"("source", "finishedAt");
CREATE INDEX "SetLog_userId_exerciseId_completedAt_idx" ON "SetLog"("userId", "exerciseId", "completedAt");
CREATE INDEX "SwapEvent_sessionId_idx" ON "SwapEvent"("sessionId");
