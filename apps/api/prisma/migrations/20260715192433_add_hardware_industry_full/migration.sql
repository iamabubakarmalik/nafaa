-- CreateEnum
CREATE TYPE "HardwareCategoryType" AS ENUM ('CEMENT', 'STEEL_REBAR', 'STEEL_SHEET', 'STEEL_PIPE', 'BRICKS', 'BLOCKS', 'SAND', 'GRAVEL', 'CRUSH', 'TILES_FLOOR', 'TILES_WALL', 'MARBLE', 'GRANITE', 'SANITARY_WARE', 'PLUMBING_PIPE', 'PLUMBING_FITTING', 'ELECTRIC_WIRE', 'ELECTRIC_SWITCH', 'ELECTRIC_CONDUIT', 'PAINT', 'PRIMER', 'THINNER', 'WOOD_LUMBER', 'PLYWOOD', 'MDF', 'HARDWARE_TOOL', 'POWER_TOOL', 'HAND_TOOL', 'FASTENER', 'ADHESIVE', 'WATERPROOFING', 'INSULATION', 'DOOR', 'WINDOW', 'GLASS', 'ALUMINUM', 'IRON_FABRICATION', 'ROOFING', 'SAFETY_EQUIPMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "HardwareUnit" AS ENUM ('BAG', 'KG', 'TON', 'PIECE', 'DOZEN', 'CARTON', 'METER', 'FEET', 'INCH', 'SQFT', 'SQMETER', 'CUBIC_FEET', 'CUBIC_METER', 'LITER', 'GALLON', 'BUNDLE', 'ROLL', 'SHEET', 'BOX', 'SET', 'TRIP');

-- CreateEnum
CREATE TYPE "HardwareBrandTier" AS ENUM ('PREMIUM', 'STANDARD', 'ECONOMY', 'IMPORTED', 'LOCAL');

-- CreateEnum
CREATE TYPE "HardwareDeliveryStatus" AS ENUM ('PENDING', 'SCHEDULED', 'LOADED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'PARTIALLY_DELIVERED', 'FAILED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "HardwareDeliveryVehicleType" AS ENUM ('PICKUP', 'MINI_TRUCK', 'TRUCK', 'TRAILER', 'DUMPER', 'CRANE', 'RICKSHAW', 'MOTORCYCLE', 'CUSTOMER_PICKUP', 'OTHER');

-- CreateEnum
CREATE TYPE "HardwareQuotationStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED', 'REVISED');

-- CreateEnum
CREATE TYPE "HardwareProjectStatus" AS ENUM ('PLANNING', 'QUOTED', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HardwareCreditAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED', 'DEFAULTED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "HardwareCreditTransactionType" AS ENUM ('SALE', 'PAYMENT', 'ADJUSTMENT', 'REFUND', 'WRITE_OFF', 'INTEREST', 'OPENING_BALANCE');

-- CreateTable
CREATE TABLE "HardwareBrand" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "tier" "HardwareBrandTier" NOT NULL DEFAULT 'STANDARD',
    "countryOfOrigin" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "supplierContact" TEXT,
    "supplierPhone" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalProducts" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HardwareBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwareProductProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "brandId" TEXT,
    "categoryType" "HardwareCategoryType",
    "unit" "HardwareUnit" NOT NULL DEFAULT 'PIECE',
    "bulkUnit" "HardwareUnit",
    "bulkQuantity" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "weightPerUnit" DOUBLE PRECISION,
    "volumePerUnit" DOUBLE PRECISION,
    "lengthMm" DOUBLE PRECISION,
    "widthMm" DOUBLE PRECISION,
    "heightMm" DOUBLE PRECISION,
    "diameterMm" DOUBLE PRECISION,
    "thicknessMm" DOUBLE PRECISION,
    "grade" TEXT,
    "diameter" TEXT,
    "gradeStrength" TEXT,
    "bagWeight" DOUBLE PRECISION,
    "tileSize" TEXT,
    "finishType" TEXT,
    "piecesPerBox" INTEGER,
    "sqftPerBox" DOUBLE PRECISION,
    "colorCode" TEXT,
    "colorName" TEXT,
    "finishSheen" TEXT,
    "coverage" DOUBLE PRECISION,
    "litersPerCan" DOUBLE PRECISION,
    "minBulkQty" DOUBLE PRECISION,
    "bulkPrice" DOUBLE PRECISION,
    "wholesalePrice" DOUBLE PRECISION,
    "retailPrice" DOUBLE PRECISION,
    "cashPrice" DOUBLE PRECISION,
    "creditPrice" DOUBLE PRECISION,
    "requiresTruck" BOOLEAN NOT NULL DEFAULT false,
    "requiresCrane" BOOLEAN NOT NULL DEFAULT false,
    "canDeliverInCity" BOOLEAN NOT NULL DEFAULT true,
    "canDeliverIntercity" BOOLEAN NOT NULL DEFAULT true,
    "deliveryChargePerKm" DOUBLE PRECISION,
    "minDeliveryCharge" DOUBLE PRECISION,
    "requiresCoveredStorage" BOOLEAN NOT NULL DEFAULT false,
    "requiresDryStorage" BOOLEAN NOT NULL DEFAULT false,
    "shelfLifeMonths" INTEGER,
    "hasIsoCertification" BOOLEAN NOT NULL DEFAULT false,
    "hasPsqcaCertification" BOOLEAN NOT NULL DEFAULT false,
    "certificationNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "manufacturingLocation" TEXT,
    "batchTraceable" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isFastMoving" BOOLEAN NOT NULL DEFAULT false,
    "totalSold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReturns" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HardwareProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwareBulkPricing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "minQuantity" DOUBLE PRECISION NOT NULL,
    "maxQuantity" DOUBLE PRECISION,
    "price" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION,
    "discountPct" DOUBLE PRECISION,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HardwareBulkPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwareProject" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "projectNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "contractorName" TEXT,
    "contractorPhone" TEXT,
    "architectName" TEXT,
    "siteAddress" TEXT NOT NULL,
    "city" TEXT,
    "area" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "siteContactPhone" TEXT,
    "projectType" TEXT,
    "builtUpArea" DOUBLE PRECISION,
    "floors" INTEGER,
    "startDate" TIMESTAMP(3),
    "expectedEndDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "status" "HardwareProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "estimatedBudget" DOUBLE PRECISION,
    "totalQuoted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOrdered" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDelivered" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPending" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditDays" INTEGER NOT NULL DEFAULT 0,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HardwareProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwareQuotation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "quotationNumber" TEXT NOT NULL,
    "projectId" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "customerAddress" TEXT,
    "status" "HardwareQuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "quotationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "convertedSaleId" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentTerms" TEXT,
    "deliveryTerms" TEXT,
    "warrantyTerms" TEXT,
    "specialTerms" TEXT,
    "validityDays" INTEGER NOT NULL DEFAULT 15,
    "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "internalNotes" TEXT,
    "customerNotes" TEXT,
    "revisionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HardwareQuotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwareQuotationItem" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "itemName" TEXT NOT NULL,
    "itemDescription" TEXT,
    "brand" TEXT,
    "specifications" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" "HardwareUnit" NOT NULL DEFAULT 'PIECE',
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HardwareQuotationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwareDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "deliveryNumber" TEXT NOT NULL,
    "saleId" TEXT,
    "projectId" TEXT,
    "quotationId" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "deliveryAddress" TEXT NOT NULL,
    "city" TEXT,
    "area" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "landmark" TEXT,
    "siteContactName" TEXT,
    "siteContactPhone" TEXT,
    "status" "HardwareDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "vehicleType" "HardwareDeliveryVehicleType" NOT NULL DEFAULT 'TRUCK',
    "vehicleNumber" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "driverCnic" TEXT,
    "helperName" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "scheduledTime" TEXT,
    "loadedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "distanceKm" DOUBLE PRECISION,
    "deliveryCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loadingCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unloadingCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tollCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receivedByName" TEXT,
    "receivedByPhone" TEXT,
    "receivedByCnic" TEXT,
    "receiverSignatureUrl" TEXT,
    "deliveryProofUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gateEntryNumber" TEXT,
    "loadingInstructions" TEXT,
    "driverInstructions" TEXT,
    "customerNotes" TEXT,
    "internalNotes" TEXT,
    "issueReported" TEXT,
    "createdById" TEXT,
    "dispatchedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HardwareDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwareDeliveryItem" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "itemName" TEXT NOT NULL,
    "brand" TEXT,
    "orderedQty" DOUBLE PRECISION NOT NULL,
    "loadedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveredQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "returnedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "damagedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" "HardwareUnit" NOT NULL DEFAULT 'PIECE',
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HardwareDeliveryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwareCreditAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "accountNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerCnic" TEXT,
    "businessName" TEXT,
    "businessAddress" TEXT,
    "status" "HardwareCreditAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditDays" INTEGER NOT NULL DEFAULT 30,
    "interestRateMonthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPurchases" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPayments" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWriteOffs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInterest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "age0To30Days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "age31To60Days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "age61To90Days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ageOver90Days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "guarantorName" TEXT,
    "guarantorPhone" TEXT,
    "guarantorCnic" TEXT,
    "guarantorRelation" TEXT,
    "chequeSecurity" TEXT,
    "postDatedCheques" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "referredBy" TEXT,
    "openedByStaffId" TEXT,
    "openingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "lastPurchaseDate" TIMESTAMP(3),
    "lastPaymentDate" TIMESTAMP(3),
    "lastReminderDate" TIMESTAMP(3),
    "notes" TEXT,
    "documentsUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HardwareCreditAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwareCreditTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "transactionType" "HardwareCreditTransactionType" NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DOUBLE PRECISION NOT NULL,
    "runningBalance" DOUBLE PRECISION NOT NULL,
    "saleId" TEXT,
    "deliveryId" TEXT,
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "handledById" TEXT,
    "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HardwareCreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwareReorderRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "minStock" DOUBLE PRECISION NOT NULL,
    "reorderPoint" DOUBLE PRECISION NOT NULL,
    "reorderQty" DOUBLE PRECISION NOT NULL,
    "maxStock" DOUBLE PRECISION,
    "preferredSupplier" TEXT,
    "leadTimeDays" INTEGER,
    "emergencyContact" TEXT,
    "autoAlert" BOOLEAN NOT NULL DEFAULT true,
    "lastAlertAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HardwareReorderRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HardwareBrand_tenantId_idx" ON "HardwareBrand"("tenantId");

-- CreateIndex
CREATE INDEX "HardwareBrand_tenantId_tier_idx" ON "HardwareBrand"("tenantId", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "HardwareBrand_tenantId_name_key" ON "HardwareBrand"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "HardwareProductProfile_productId_key" ON "HardwareProductProfile"("productId");

-- CreateIndex
CREATE INDEX "HardwareProductProfile_tenantId_idx" ON "HardwareProductProfile"("tenantId");

-- CreateIndex
CREATE INDEX "HardwareProductProfile_tenantId_categoryType_idx" ON "HardwareProductProfile"("tenantId", "categoryType");

-- CreateIndex
CREATE INDEX "HardwareProductProfile_brandId_idx" ON "HardwareProductProfile"("brandId");

-- CreateIndex
CREATE INDEX "HardwareBulkPricing_tenantId_idx" ON "HardwareBulkPricing"("tenantId");

-- CreateIndex
CREATE INDEX "HardwareBulkPricing_productId_idx" ON "HardwareBulkPricing"("productId");

-- CreateIndex
CREATE INDEX "HardwareProject_tenantId_idx" ON "HardwareProject"("tenantId");

-- CreateIndex
CREATE INDEX "HardwareProject_tenantId_status_idx" ON "HardwareProject"("tenantId", "status");

-- CreateIndex
CREATE INDEX "HardwareProject_customerId_idx" ON "HardwareProject"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "HardwareProject_tenantId_projectNumber_key" ON "HardwareProject"("tenantId", "projectNumber");

-- CreateIndex
CREATE INDEX "HardwareQuotation_tenantId_idx" ON "HardwareQuotation"("tenantId");

-- CreateIndex
CREATE INDEX "HardwareQuotation_tenantId_status_idx" ON "HardwareQuotation"("tenantId", "status");

-- CreateIndex
CREATE INDEX "HardwareQuotation_projectId_idx" ON "HardwareQuotation"("projectId");

-- CreateIndex
CREATE INDEX "HardwareQuotation_customerId_idx" ON "HardwareQuotation"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "HardwareQuotation_tenantId_quotationNumber_key" ON "HardwareQuotation"("tenantId", "quotationNumber");

-- CreateIndex
CREATE INDEX "HardwareQuotationItem_quotationId_idx" ON "HardwareQuotationItem"("quotationId");

-- CreateIndex
CREATE INDEX "HardwareDelivery_tenantId_idx" ON "HardwareDelivery"("tenantId");

-- CreateIndex
CREATE INDEX "HardwareDelivery_tenantId_status_idx" ON "HardwareDelivery"("tenantId", "status");

-- CreateIndex
CREATE INDEX "HardwareDelivery_scheduledDate_idx" ON "HardwareDelivery"("scheduledDate");

-- CreateIndex
CREATE INDEX "HardwareDelivery_projectId_idx" ON "HardwareDelivery"("projectId");

-- CreateIndex
CREATE INDEX "HardwareDelivery_customerId_idx" ON "HardwareDelivery"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "HardwareDelivery_tenantId_deliveryNumber_key" ON "HardwareDelivery"("tenantId", "deliveryNumber");

-- CreateIndex
CREATE INDEX "HardwareDeliveryItem_deliveryId_idx" ON "HardwareDeliveryItem"("deliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "HardwareCreditAccount_customerId_key" ON "HardwareCreditAccount"("customerId");

-- CreateIndex
CREATE INDEX "HardwareCreditAccount_tenantId_idx" ON "HardwareCreditAccount"("tenantId");

-- CreateIndex
CREATE INDEX "HardwareCreditAccount_tenantId_status_idx" ON "HardwareCreditAccount"("tenantId", "status");

-- CreateIndex
CREATE INDEX "HardwareCreditAccount_customerId_idx" ON "HardwareCreditAccount"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "HardwareCreditAccount_tenantId_accountNumber_key" ON "HardwareCreditAccount"("tenantId", "accountNumber");

-- CreateIndex
CREATE INDEX "HardwareCreditTransaction_tenantId_idx" ON "HardwareCreditTransaction"("tenantId");

-- CreateIndex
CREATE INDEX "HardwareCreditTransaction_accountId_idx" ON "HardwareCreditTransaction"("accountId");

-- CreateIndex
CREATE INDEX "HardwareCreditTransaction_transactionDate_idx" ON "HardwareCreditTransaction"("transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "HardwareCreditTransaction_tenantId_transactionNumber_key" ON "HardwareCreditTransaction"("tenantId", "transactionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "HardwareReorderRule_productId_key" ON "HardwareReorderRule"("productId");

-- CreateIndex
CREATE INDEX "HardwareReorderRule_tenantId_idx" ON "HardwareReorderRule"("tenantId");

-- AddForeignKey
ALTER TABLE "HardwareQuotation" ADD CONSTRAINT "HardwareQuotation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "HardwareProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardwareQuotationItem" ADD CONSTRAINT "HardwareQuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "HardwareQuotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardwareDelivery" ADD CONSTRAINT "HardwareDelivery_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "HardwareProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardwareDeliveryItem" ADD CONSTRAINT "HardwareDeliveryItem_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "HardwareDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardwareCreditTransaction" ADD CONSTRAINT "HardwareCreditTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "HardwareCreditAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
