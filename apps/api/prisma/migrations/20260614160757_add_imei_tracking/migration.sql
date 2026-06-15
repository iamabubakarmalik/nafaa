-- CreateEnum
CREATE TYPE "ImeiStatus" AS ENUM ('IN_STOCK', 'SOLD', 'RETURNED', 'DAMAGED', 'RESERVED', 'LOST');

-- CreateTable
CREATE TABLE "ProductImei" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "imei1" TEXT NOT NULL,
    "imei2" TEXT,
    "serialNumber" TEXT,
    "status" "ImeiStatus" NOT NULL DEFAULT 'IN_STOCK',
    "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saleItemId" TEXT,
    "soldAt" TIMESTAMP(3),
    "soldPrice" DOUBLE PRECISION,
    "warrantyMonths" INTEGER DEFAULT 12,
    "warrantyExpiry" TIMESTAMP(3),
    "purchaseItemId" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "color" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductImei_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductImei_saleItemId_key" ON "ProductImei"("saleItemId");

-- CreateIndex
CREATE INDEX "ProductImei_tenantId_idx" ON "ProductImei"("tenantId");

-- CreateIndex
CREATE INDEX "ProductImei_tenantId_status_idx" ON "ProductImei"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ProductImei_productId_idx" ON "ProductImei"("productId");

-- CreateIndex
CREATE INDEX "ProductImei_variantId_idx" ON "ProductImei"("variantId");

-- CreateIndex
CREATE INDEX "ProductImei_imei1_idx" ON "ProductImei"("imei1");

-- CreateIndex
CREATE INDEX "ProductImei_saleItemId_idx" ON "ProductImei"("saleItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImei_tenantId_imei1_key" ON "ProductImei"("tenantId", "imei1");

-- AddForeignKey
ALTER TABLE "ProductImei" ADD CONSTRAINT "ProductImei_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImei" ADD CONSTRAINT "ProductImei_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImei" ADD CONSTRAINT "ProductImei_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
