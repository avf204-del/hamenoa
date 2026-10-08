ALTER TABLE "SetLog" ADD COLUMN "capacityEvidence" JSONB;
ALTER TABLE "SetLog" ADD COLUMN "actualDoseSec" INTEGER;
CREATE TABLE "CapacityProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "data" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CapacityProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CapacityProfile_userId_key" ON "CapacityProfile"("userId");
ALTER TABLE "CapacityProfile" ADD CONSTRAINT "CapacityProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "MovementReceipt" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "result" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MovementReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MovementReceipt_sessionId_requestId_key" ON "MovementReceipt"("sessionId", "requestId");
ALTER TABLE "MovementReceipt" ADD CONSTRAINT "MovementReceipt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
