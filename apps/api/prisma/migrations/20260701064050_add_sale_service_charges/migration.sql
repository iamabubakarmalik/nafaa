-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "serviceCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "serviceChargesBreakdown" JSONB;
