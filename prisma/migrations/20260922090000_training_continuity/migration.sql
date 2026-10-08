ALTER TABLE "User" ADD COLUMN "trainingPreferences" JSONB;
ALTER TABLE "LocationProfile" ADD COLUMN "weightInventory" JSONB;
ALTER TABLE "SwapEvent" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "SwapEvent" ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false;
-- Preserve the currently active window at migration time, without resurrecting
-- every historical restriction. New reports do not expire automatically.
UPDATE "SwapEvent" SET "resolvedAt" = CURRENT_TIMESTAMP, "needsReview" = true
WHERE "reason" = 'injury' AND "createdAt" < CURRENT_TIMESTAMP - INTERVAL '14 days';
CREATE INDEX "SwapEvent_injury_active_idx" ON "SwapEvent"("sessionId")
WHERE "reason" = 'injury' AND "resolvedAt" IS NULL;
