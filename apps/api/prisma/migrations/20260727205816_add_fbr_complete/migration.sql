/*
  Warnings:

  - You are about to drop the column `isActive` on the `fbr_configs` table. All the data in the column will be lost.
  - You are about to drop the column `isSandbox` on the `fbr_configs` table. All the data in the column will be lost.
  - You are about to drop the column `lastSyncAt` on the `fbr_configs` table. All the data in the column will be lost.
  - You are about to drop the column `totalInvoicesSent` on the `fbr_configs` table. All the data in the column will be lost.
  - You are about to drop the `fbr_invoice_logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "FbrSubmissionMode" AS ENUM ('DISABLED', 'MANUAL', 'AUTO_ALL', 'AUTO_ABOVE_LIMIT');

-- CreateEnum
CREATE TYPE "FbrEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "FbrInvoiceStatus" AS ENUM ('PENDING', 'SUBMITTING', 'SUBMITTED', 'ACKNOWLEDGED', 'REJECTED', 'RETRY_QUEUED', 'MANUAL_SKIPPED', 'CANCELLED');

-- AlterTable
ALTER TABLE "fbr_configs" DROP COLUMN "isActive",
DROP COLUMN "isSandbox",
DROP COLUMN "lastSyncAt",
DROP COLUMN "totalInvoicesSent",
ADD COLUMN     "askBeforeSubmit" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "autoSubmitThreshold" DECIMAL(12,2),
ADD COLUMN     "businessAddress" TEXT,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "defaultTaxRate" DECIMAL(5,2) NOT NULL DEFAULT 17,
ADD COLUMN     "environment" "FbrEnvironment" NOT NULL DEFAULT 'SANDBOX',
ADD COLUMN     "hideNonFbrSales" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSubmissionAt" TIMESTAMP(3),
ADD COLUMN     "printFbrLogo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "printQrOnReceipt" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "retentionMonths" INTEGER NOT NULL DEFAULT 72,
ADD COLUMN     "submissionMode" "FbrSubmissionMode" NOT NULL DEFAULT 'DISABLED',
ADD COLUMN     "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalSkipped" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalSubmitted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ALTER COLUMN "posId" DROP NOT NULL,
ALTER COLUMN "ntn" DROP NOT NULL,
ALTER COLUMN "apiToken" DROP NOT NULL,
ALTER COLUMN "apiEndpoint" DROP NOT NULL,
ALTER COLUMN "apiEndpoint" DROP DEFAULT;

-- DropTable
DROP TABLE "fbr_invoice_logs";

-- DropEnum
DROP TYPE "FbrPosStatus";

-- CreateTable
CREATE TABLE "fbr_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "status" "FbrInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "fbrInvoiceNumber" TEXT,
    "fbrQrCode" TEXT,
    "fbrVerificationUrl" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 17,
    "requestPayload" JSONB NOT NULL,
    "responsePayload" JSONB,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 5,
    "nextRetryAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "skippedReason" TEXT,
    "skippedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fbr_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fbr_invoices_saleId_key" ON "fbr_invoices"("saleId");

-- CreateIndex
CREATE INDEX "fbr_invoices_tenantId_status_idx" ON "fbr_invoices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "fbr_invoices_configId_submittedAt_idx" ON "fbr_invoices"("configId", "submittedAt");

-- CreateIndex
CREATE INDEX "fbr_invoices_status_nextRetryAt_idx" ON "fbr_invoices"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "fbr_invoices_saleId_idx" ON "fbr_invoices"("saleId");

-- CreateIndex
CREATE INDEX "fbr_configs_tenantId_isEnabled_idx" ON "fbr_configs"("tenantId", "isEnabled");

-- AddForeignKey
ALTER TABLE "fbr_invoices" ADD CONSTRAINT "fbr_invoices_configId_fkey" FOREIGN KEY ("configId") REFERENCES "fbr_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
