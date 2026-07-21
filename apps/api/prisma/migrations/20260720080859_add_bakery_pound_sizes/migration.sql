-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BakerySize" ADD VALUE 'HALF_POUND';
ALTER TYPE "BakerySize" ADD VALUE 'ONE_POUND';
ALTER TYPE "BakerySize" ADD VALUE 'ONE_HALF_POUND';
ALTER TYPE "BakerySize" ADD VALUE 'TWO_POUND';
ALTER TYPE "BakerySize" ADD VALUE 'THREE_POUND';
ALTER TYPE "BakerySize" ADD VALUE 'FIVE_POUND';

-- AlterTable
ALTER TABLE "BakeryProductProfile" ADD COLUMN     "pricePerPound" DOUBLE PRECISION;
