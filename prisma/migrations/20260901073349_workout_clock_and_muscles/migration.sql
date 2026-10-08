-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "primaryMuscles" JSONB,
ADD COLUMN     "secondaryMuscles" JSONB;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "startedAt" TIMESTAMP(3);
