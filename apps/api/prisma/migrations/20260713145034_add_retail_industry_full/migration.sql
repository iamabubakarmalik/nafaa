-- CreateEnum
CREATE TYPE "UnitConversionType" AS ENUM ('BASE', 'PACK', 'BOX', 'DOZEN', 'CARTON', 'KG_TO_GRAM', 'L_TO_ML', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DamageStatus" AS ENUM ('REPORTED', 'APPROVED', 'REJECTED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "DamageReasonCode" AS ENUM ('EXPIRY', 'BREAKAGE', 'SPOILAGE', 'PEST_DAMAGE', 'WATER_DAMAGE', 'THEFT', 'MISHANDLING', 'MANUFACTURING_DEFECT', 'OTHER');

-- CreateEnum
CREATE TYPE "ComboStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'DRAFT');

-- CreateEnum
CREATE TYPE "BulkJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "BulkJobType" AS ENUM ('PRODUCTS', 'CUSTOMERS', 'SUPPLIERS', 'STOCK_ADJUSTMENT', 'PRICE_UPDATE');

-- CreateTable
CREATE TABLE "ProductUnit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "unitName" TEXT NOT NULL,
    "unitLabel" TEXT,
    "conversionType" "UnitConversionType" NOT NULL DEFAULT 'BASE',
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wholesalePrice" DOUBLE PRECISION,
    "mrpPrice" DOUBLE PRECISION,
    "barcode" TEXT,
    "sku" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCombo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "comboPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "originalTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "savingsAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "savingsPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "ComboStatus" NOT NULL DEFAULT 'ACTIVE',
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "maxPurchasePerCustomer" INTEGER,
    "stockAvailable" INTEGER,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "tagLine" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCombo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductComboItem" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "unitId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitName" TEXT,
    "originalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductComboItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "batchId" TEXT,
    "unitId" TEXT,
    "reportedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "damageNumber" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costImpact" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salvageValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netLoss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "reasonCode" "DamageReasonCode" NOT NULL DEFAULT 'OTHER',
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "supplierClaim" BOOLEAN NOT NULL DEFAULT false,
    "claimStatus" TEXT,
    "claimAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "DamageStatus" NOT NULL DEFAULT 'REPORTED',
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DamageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailQuickKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "shopId" TEXT,
    "productId" TEXT,
    "comboId" TEXT,
    "variantId" TEXT,
    "unitId" TEXT,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "hotkey" TEXT,
    "group" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailQuickKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkImportJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobType" "BulkJobType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "skipCount" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "status" "BulkJobStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarcodeLabelBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layout" TEXT NOT NULL DEFAULT '30_per_sheet',
    "paperSize" TEXT NOT NULL DEFAULT 'A4',
    "includePrice" BOOLEAN NOT NULL DEFAULT true,
    "includeName" BOOLEAN NOT NULL DEFAULT true,
    "includeShop" BOOLEAN NOT NULL DEFAULT true,
    "includeMrp" BOOLEAN NOT NULL DEFAULT false,
    "fontFamily" TEXT NOT NULL DEFAULT 'monospace',
    "items" JSONB NOT NULL,
    "totalLabels" INTEGER NOT NULL DEFAULT 0,
    "printedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BarcodeLabelBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReorderSuggestion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderPoint" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "suggestedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgDailySales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "daysOfStockLeft" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPurchasePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "preferredSupplierId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReorderSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductUnit_tenantId_idx" ON "ProductUnit"("tenantId");

-- CreateIndex
CREATE INDEX "ProductUnit_productId_idx" ON "ProductUnit"("productId");

-- CreateIndex
CREATE INDEX "ProductUnit_variantId_idx" ON "ProductUnit"("variantId");

-- CreateIndex
CREATE INDEX "ProductUnit_barcode_idx" ON "ProductUnit"("barcode");

-- CreateIndex
CREATE INDEX "ProductUnit_tenantId_isActive_idx" ON "ProductUnit"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProductUnit_productId_variantId_unitName_key" ON "ProductUnit"("productId", "variantId", "unitName");

-- CreateIndex
CREATE INDEX "ProductCombo_tenantId_idx" ON "ProductCombo"("tenantId");

-- CreateIndex
CREATE INDEX "ProductCombo_tenantId_status_idx" ON "ProductCombo"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ProductCombo_tenantId_isFeatured_idx" ON "ProductCombo"("tenantId", "isFeatured");

-- CreateIndex
CREATE INDEX "ProductCombo_barcode_idx" ON "ProductCombo"("barcode");

-- CreateIndex
CREATE INDEX "ProductCombo_categoryId_idx" ON "ProductCombo"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCombo_tenantId_name_key" ON "ProductCombo"("tenantId", "name");

-- CreateIndex
CREATE INDEX "ProductComboItem_comboId_idx" ON "ProductComboItem"("comboId");

-- CreateIndex
CREATE INDEX "ProductComboItem_productId_idx" ON "ProductComboItem"("productId");

-- CreateIndex
CREATE INDEX "ProductComboItem_variantId_idx" ON "ProductComboItem"("variantId");

-- CreateIndex
CREATE INDEX "DamageLog_tenantId_idx" ON "DamageLog"("tenantId");

-- CreateIndex
CREATE INDEX "DamageLog_tenantId_status_idx" ON "DamageLog"("tenantId", "status");

-- CreateIndex
CREATE INDEX "DamageLog_tenantId_reasonCode_idx" ON "DamageLog"("tenantId", "reasonCode");

-- CreateIndex
CREATE INDEX "DamageLog_productId_idx" ON "DamageLog"("productId");

-- CreateIndex
CREATE INDEX "DamageLog_shopId_idx" ON "DamageLog"("shopId");

-- CreateIndex
CREATE INDEX "DamageLog_createdAt_idx" ON "DamageLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DamageLog_tenantId_damageNumber_key" ON "DamageLog"("tenantId", "damageNumber");

-- CreateIndex
CREATE INDEX "RetailQuickKey_tenantId_idx" ON "RetailQuickKey"("tenantId");

-- CreateIndex
CREATE INDEX "RetailQuickKey_tenantId_userId_idx" ON "RetailQuickKey"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "RetailQuickKey_tenantId_shopId_idx" ON "RetailQuickKey"("tenantId", "shopId");

-- CreateIndex
CREATE INDEX "RetailQuickKey_tenantId_position_idx" ON "RetailQuickKey"("tenantId", "position");

-- CreateIndex
CREATE INDEX "BulkImportJob_tenantId_idx" ON "BulkImportJob"("tenantId");

-- CreateIndex
CREATE INDEX "BulkImportJob_tenantId_status_idx" ON "BulkImportJob"("tenantId", "status");

-- CreateIndex
CREATE INDEX "BulkImportJob_tenantId_jobType_idx" ON "BulkImportJob"("tenantId", "jobType");

-- CreateIndex
CREATE INDEX "BulkImportJob_createdAt_idx" ON "BulkImportJob"("createdAt");

-- CreateIndex
CREATE INDEX "BarcodeLabelBatch_tenantId_idx" ON "BarcodeLabelBatch"("tenantId");

-- CreateIndex
CREATE INDEX "BarcodeLabelBatch_createdAt_idx" ON "BarcodeLabelBatch"("createdAt");

-- CreateIndex
CREATE INDEX "ReorderSuggestion_tenantId_idx" ON "ReorderSuggestion"("tenantId");

-- CreateIndex
CREATE INDEX "ReorderSuggestion_tenantId_status_idx" ON "ReorderSuggestion"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ReorderSuggestion_productId_idx" ON "ReorderSuggestion"("productId");

-- CreateIndex
CREATE INDEX "ReorderSuggestion_shopId_idx" ON "ReorderSuggestion"("shopId");

-- AddForeignKey
ALTER TABLE "ProductUnit" ADD CONSTRAINT "ProductUnit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUnit" ADD CONSTRAINT "ProductUnit_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCombo" ADD CONSTRAINT "ProductCombo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCombo" ADD CONSTRAINT "ProductCombo_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductComboItem" ADD CONSTRAINT "ProductComboItem_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "ProductCombo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductComboItem" ADD CONSTRAINT "ProductComboItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductComboItem" ADD CONSTRAINT "ProductComboItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductComboItem" ADD CONSTRAINT "ProductComboItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ProductUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageLog" ADD CONSTRAINT "DamageLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageLog" ADD CONSTRAINT "DamageLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageLog" ADD CONSTRAINT "DamageLog_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageLog" ADD CONSTRAINT "DamageLog_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailQuickKey" ADD CONSTRAINT "RetailQuickKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkImportJob" ADD CONSTRAINT "BulkImportJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarcodeLabelBatch" ADD CONSTRAINT "BarcodeLabelBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReorderSuggestion" ADD CONSTRAINT "ReorderSuggestion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
