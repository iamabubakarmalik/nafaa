-- CreateEnum
CREATE TYPE "PtaStatus" AS ENUM ('APPROVED', 'NON_PTA', 'PATCH', 'PENDING', 'EXEMPT');

-- AlterTable
ALTER TABLE "ProductImei" ADD COLUMN     "ptaStatus" "PtaStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "ptaTaxDueAt" TIMESTAMP(3),
ADD COLUMN     "ptaTaxPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "ptaVerifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ProductImei_tenantId_ptaStatus_idx" ON "ProductImei"("tenantId", "ptaStatus");
