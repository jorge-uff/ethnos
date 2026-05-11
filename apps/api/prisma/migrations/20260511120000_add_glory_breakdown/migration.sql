-- AlterTable
ALTER TABLE "Player" ADD COLUMN "gloryFromKingdoms" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Player" ADD COLUMN "gloryFromBands" INTEGER NOT NULL DEFAULT 0;

UPDATE "Player" SET "gloryFromKingdoms" = "glory", "gloryFromBands" = 0;
