-- Null preserves uncertainty in earlier reports; cadence is a user report.
ALTER TABLE "SetLog" ADD COLUMN "reportedTempo" BOOLEAN;
