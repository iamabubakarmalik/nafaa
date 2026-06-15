-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "businessFeatures" JSONB,
ADD COLUMN     "businessType" TEXT,
ADD COLUMN     "defaultUnit" TEXT;
