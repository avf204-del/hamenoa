-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SetLog" ADD COLUMN     "restSec" INTEGER,
ADD COLUMN     "workSec" INTEGER;
