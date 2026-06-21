-- CreateEnum
CREATE TYPE "UsedPhoneCondition" AS ENUM ('EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "UsedPhoneStatus" AS ENUM ('PENDING_INSPECTION', 'IN_STOCK', 'REPAIRING', 'SOLD', 'RETURNED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "TradeInSource" AS ENUM ('CASH_BUYBACK', 'EXCHANGE', 'CONSIGNMENT');

-- CreateTable
CREATE TABLE "UsedPhone" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "usedPhoneCode" TEXT NOT NULL,
    "imei1" TEXT NOT NULL,
    "imei2" TEXT,
    "serialNumber" TEXT,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "storage" TEXT,
    "ram" TEXT,
    "color" TEXT,
    "modelYear" INTEGER,
    "ptaStatus" "PtaStatus" NOT NULL DEFAULT 'PENDING',
    "ptaTaxPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "condition" "UsedPhoneCondition" NOT NULL DEFAULT 'GOOD',
    "conditionNotes" TEXT,
    "hasOriginalBox" BOOLEAN NOT NULL DEFAULT false,
    "hasOriginalCharger" BOOLEAN NOT NULL DEFAULT false,
    "hasOriginalCable" BOOLEAN NOT NULL DEFAULT false,
    "hasOriginalEarphones" BOOLEAN NOT NULL DEFAULT false,
    "hasOriginalReceipt" BOOLEAN NOT NULL DEFAULT false,
    "hasWarrantyLeft" BOOLEAN NOT NULL DEFAULT false,
    "warrantyExpiryDate" TIMESTAMP(3),
    "source" "TradeInSource" NOT NULL DEFAULT 'CASH_BUYBACK',
    "buybackPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refurbishCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resalePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalSoldPrice" DOUBLE PRECISION,
    "fromCustomerId" TEXT,
    "fromCustomerName" TEXT,
    "fromCustomerPhone" TEXT,
    "fromCustomerCnic" TEXT,
    "cnicPhotoUrl" TEXT,
    "status" "UsedPhoneStatus" NOT NULL DEFAULT 'PENDING_INSPECTION',
    "soldToCustomerId" TEXT,
    "soldSaleId" TEXT,
    "soldAt" TIMESTAMP(3),
    "imeiPhotoUrl" TEXT,
    "devicePhotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inspectedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "inspectedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsedPhone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsedPhoneInspection" (
    "id" TEXT NOT NULL,
    "usedPhoneId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "screenCondition" TEXT,
    "bodyCondition" TEXT,
    "cameraWorks" BOOLEAN DEFAULT true,
    "speakerWorks" BOOLEAN DEFAULT true,
    "microphoneWorks" BOOLEAN DEFAULT true,
    "chargingPortWorks" BOOLEAN DEFAULT true,
    "buttonsWork" BOOLEAN DEFAULT true,
    "faceIdFingerprintWorks" BOOLEAN DEFAULT true,
    "batteryHealth" INTEGER,
    "imeiUnlocked" BOOLEAN DEFAULT true,
    "icloudUnlocked" BOOLEAN DEFAULT true,
    "softwareIssues" TEXT,
    "needsRepair" BOOLEAN NOT NULL DEFAULT false,
    "estimatedRepairCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recommendedActions" TEXT,
    "inspectedById" TEXT,
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsedPhoneInspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UsedPhone_soldSaleId_key" ON "UsedPhone"("soldSaleId");

-- CreateIndex
CREATE INDEX "UsedPhone_tenantId_idx" ON "UsedPhone"("tenantId");

-- CreateIndex
CREATE INDEX "UsedPhone_tenantId_status_idx" ON "UsedPhone"("tenantId", "status");

-- CreateIndex
CREATE INDEX "UsedPhone_tenantId_condition_idx" ON "UsedPhone"("tenantId", "condition");

-- CreateIndex
CREATE INDEX "UsedPhone_shopId_idx" ON "UsedPhone"("shopId");

-- CreateIndex
CREATE INDEX "UsedPhone_fromCustomerId_idx" ON "UsedPhone"("fromCustomerId");

-- CreateIndex
CREATE INDEX "UsedPhone_imei1_idx" ON "UsedPhone"("imei1");

-- CreateIndex
CREATE UNIQUE INDEX "UsedPhone_tenantId_usedPhoneCode_key" ON "UsedPhone"("tenantId", "usedPhoneCode");

-- CreateIndex
CREATE UNIQUE INDEX "UsedPhone_tenantId_imei1_key" ON "UsedPhone"("tenantId", "imei1");

-- CreateIndex
CREATE INDEX "UsedPhoneInspection_usedPhoneId_idx" ON "UsedPhoneInspection"("usedPhoneId");

-- CreateIndex
CREATE INDEX "UsedPhoneInspection_tenantId_idx" ON "UsedPhoneInspection"("tenantId");

-- AddForeignKey
ALTER TABLE "UsedPhone" ADD CONSTRAINT "UsedPhone_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedPhone" ADD CONSTRAINT "UsedPhone_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedPhone" ADD CONSTRAINT "UsedPhone_fromCustomerId_fkey" FOREIGN KEY ("fromCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedPhoneInspection" ADD CONSTRAINT "UsedPhoneInspection_usedPhoneId_fkey" FOREIGN KEY ("usedPhoneId") REFERENCES "UsedPhone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
