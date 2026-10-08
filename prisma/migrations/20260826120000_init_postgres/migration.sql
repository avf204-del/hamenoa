-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "licenseNote" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "equipment" JSONB NOT NULL,
    "stationType" TEXT NOT NULL,
    "skillLevel" INTEGER NOT NULL,
    "loadClass" TEXT NOT NULL,
    "repPaceSecPerRep" DOUBLE PRECISION NOT NULL,
    "systemicCost" TEXT NOT NULL,
    "constraints" JSONB NOT NULL,
    "substitutes" JSONB NOT NULL,
    "scalingEasierId" TEXT,
    "scalingHarderId" TEXT,
    "instructionsHe" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationProfile" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "equipment" JSONB NOT NULL,
    "quantities" JSONB NOT NULL,
    "peakHours" BOOLEAN NOT NULL DEFAULT false,
    "constraints" JSONB NOT NULL,
    "usuallyTaken" JSONB NOT NULL,

    CONSTRAINT "LocationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCalibration" (
    "id" TEXT NOT NULL,
    "repsPerMinute" JSONB NOT NULL,
    "failurePoints" JSONB NOT NULL,
    "maxReps" JSONB,
    "level" INTEGER NOT NULL,
    "paceFactor" DOUBLE PRECISION,
    "baselineLoads" JSONB,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCalibration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "seed" TEXT NOT NULL,
    "timeBudgetMin" INTEGER NOT NULL,
    "locationId" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "score" INTEGER,
    "rpe" INTEGER,
    "funRating" INTEGER,
    "explainLog" JSONB NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "format" TEXT,
    "plannedMin" DOUBLE PRECISION NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetLog" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "setIndex" INTEGER NOT NULL,
    "targetReps" INTEGER NOT NULL,
    "actualReps" INTEGER NOT NULL,
    "targetWeightKg" DOUBLE PRECISION,
    "actualWeightKg" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SetLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwapEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "fromExerciseId" TEXT NOT NULL,
    "toExerciseId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "midWorkout" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwapEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Benchmark" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "structure" JSONB NOT NULL,
    "cadenceWeeks" INTEGER NOT NULL DEFAULT 4,
    "lastDeclinedAt" TIMESTAMP(3),

    CONSTRAINT "Benchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenchmarkResult" (
    "id" TEXT NOT NULL,
    "benchmarkId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "scoreValue" DOUBLE PRECISION NOT NULL,
    "scoreUnit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BenchmarkResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_slug_key" ON "Exercise"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Block_sessionId_order_key" ON "Block"("sessionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "SetLog_blockId_exerciseId_setIndex_key" ON "SetLog"("blockId", "exerciseId", "setIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Benchmark_slug_key" ON "Benchmark"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BenchmarkResult_sessionId_key" ON "BenchmarkResult"("sessionId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "LocationProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapEvent" ADD CONSTRAINT "SwapEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkResult" ADD CONSTRAINT "BenchmarkResult_benchmarkId_fkey" FOREIGN KEY ("benchmarkId") REFERENCES "Benchmark"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkResult" ADD CONSTRAINT "BenchmarkResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

