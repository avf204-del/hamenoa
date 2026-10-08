-- CreateTable
CREATE TABLE "BackupRun" (
    "id" TEXT NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "rows" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "target" TEXT NOT NULL,

    CONSTRAINT "BackupRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackupRun_finishedAt_idx" ON "BackupRun"("finishedAt");

