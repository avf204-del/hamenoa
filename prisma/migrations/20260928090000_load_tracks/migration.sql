CREATE TABLE "ExerciseTrack" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "slug" TEXT NOT NULL, "band" TEXT NOT NULL,
 "data" JSONB NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ExerciseTrack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "ExerciseTrack_band_check" CHECK ("band" IN ('heavy','moderate','light'))
);
CREATE UNIQUE INDEX "ExerciseTrack_userId_slug_band_key" ON "ExerciseTrack"("userId","slug","band");
CREATE TABLE "ExerciseLoadState" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "data" JSONB NOT NULL,
 "lastSessionDay" INTEGER, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ExerciseLoadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ExerciseLoadState_userId_key" ON "ExerciseLoadState"("userId");

ALTER TABLE "SetLog" ADD COLUMN "recordKind" TEXT;
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_recordKind_check" CHECK ("recordKind" IS NULL OR "recordKind" IN ('segment','aggregate'));
