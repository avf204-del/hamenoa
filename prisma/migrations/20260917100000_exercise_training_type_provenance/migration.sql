-- Additive catalog metadata. Exercise ids and all history references stay intact.
ALTER TABLE "Exercise"
  ADD COLUMN "trainingType" TEXT NOT NULL DEFAULT 'base',
  ADD COLUMN "provenanceId" TEXT;

ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_trainingType_check"
  CHECK ("trainingType" IN ('base', 'yoga', 'capoeira', 'dance'));
