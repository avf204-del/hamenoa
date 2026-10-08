-- AlterTable
ALTER TABLE "MatchParticipant" ADD COLUMN     "guestHealthAcknowledged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "guestHealthFlagged" BOOLEAN;
