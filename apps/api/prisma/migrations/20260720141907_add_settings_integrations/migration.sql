-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN     "integrations" JSONB,
ADD COLUMN     "receiptConfig" JSONB;
