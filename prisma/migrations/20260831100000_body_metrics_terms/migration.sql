-- החלטה 26 (סבב 31.8), מיגרציה אחת לסבב:
-- א' — משקל וגובה בהיסטוריית הכיול (כוח יחסי ומגמת משקל);
-- ד' — חותמת אישור הצהרת הוויתור המשפטית על המשתמש.
ALTER TABLE "UserCalibration" ADD COLUMN "bodyWeightKg" DOUBLE PRECISION;
ALTER TABLE "UserCalibration" ADD COLUMN "heightCm" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN "disclaimerAcceptedAt" TIMESTAMP(3);
