-- Additive only. Historical records retain their values; unknown timing is
-- deliberately not promoted to precise measured evidence.
ALTER TABLE "SetLog"
 ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
 ADD COLUMN "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ADD COLUMN "effectiveAt" TIMESTAMP(3),
 ADD COLUMN "timingSource" TEXT NOT NULL DEFAULT 'unknown',
 ADD COLUMN "reportedOnTime" BOOLEAN,
 ADD COLUMN "interrupted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GameState" ADD COLUMN "world" JSONB;
CREATE TABLE "SessionWriteReceipt" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "sessionId" TEXT NOT NULL,
 "requestId" TEXT NOT NULL,
 "payloadHash" TEXT NOT NULL,
 "setLogId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SessionWriteReceipt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "SessionWriteReceipt_setLogId_fkey" FOREIGN KEY ("setLogId") REFERENCES "SetLog"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SessionWriteReceipt_sessionId_requestId_key" ON "SessionWriteReceipt"("sessionId", "requestId");
