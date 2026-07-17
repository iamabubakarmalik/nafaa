-- CreateEnum
CREATE TYPE "AgriCategory" AS ENUM ('SEEDS', 'FERTILIZER', 'PESTICIDE', 'HERBICIDE', 'FUNGICIDE', 'INSECTICIDE', 'ANIMAL_FEED', 'POULTRY_FEED', 'CATTLE_FEED', 'FISH_FEED', 'VETERINARY_MEDICINE', 'FARM_TOOLS', 'IRRIGATION', 'MACHINERY_PART', 'MULCH_COVER', 'GROWTH_HORMONE', 'SOIL_CONDITIONER', 'PLANT_NUTRIENT', 'ORGANIC_INPUT', 'OTHER');

-- CreateEnum
CREATE TYPE "SeedType" AS ENUM ('WHEAT', 'RICE', 'COTTON', 'MAIZE', 'SUGARCANE', 'POTATO', 'ONION', 'TOMATO', 'CHILLI', 'PULSES', 'VEGETABLES', 'FRUITS', 'FODDER', 'OILSEEDS', 'OTHER');

-- CreateEnum
CREATE TYPE "FertilizerType" AS ENUM ('UREA', 'DAP', 'NPK', 'POTASH', 'ZINC', 'SULFUR', 'BORON', 'MICRONUTRIENT', 'ORGANIC', 'BIO_FERTILIZER', 'LIQUID', 'FOLIAR', 'OTHER');

-- CreateEnum
CREATE TYPE "FeedType" AS ENUM ('STARTER', 'GROWER', 'FINISHER', 'LAYER', 'BREEDER', 'MILK_REPLACER', 'MINERAL_MIX', 'CONCENTRATE', 'ROUGHAGE', 'SILAGE', 'HAY', 'BRAN', 'OIL_CAKE', 'MOLASSES', 'OTHER');

-- CreateEnum
CREATE TYPE "SeasonType" AS ENUM ('KHARIF', 'RABI', 'ZAID', 'ALL_SEASON', 'SPRING', 'SUMMER', 'MONSOON', 'WINTER');

-- CreateEnum
CREATE TYPE "AgriOrderStatus" AS ENUM ('DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FarmerAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEFAULTED', 'CLOSED', 'PENDING_APPROVAL');

-- CreateTable
CREATE TABLE "AgriProductProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "category" "AgriCategory" NOT NULL,
    "subCategory" TEXT,
    "seedType" "SeedType",
    "fertilizerType" "FertilizerType",
    "feedType" "FeedType",
    "brand" TEXT,
    "manufacturer" TEXT,
    "countryOfOrigin" TEXT,
    "npkRatio" TEXT,
    "activeIngredient" TEXT,
    "ingredients" JSONB,
    "concentration" TEXT,
    "packSize" TEXT,
    "packUnit" TEXT,
    "bagsPerTon" INTEGER,
    "applicationRate" TEXT,
    "applicationMethod" TEXT,
    "applicationInterval" TEXT,
    "targetCrops" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetPests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetAnimals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "season" "SeasonType",
    "suitableFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cropStage" TEXT,
    "toxicityLevel" TEXT,
    "ppePeriod" INTEGER,
    "reEntryPeriod" INTEGER,
    "warningLabel" TEXT,
    "hazardClass" TEXT,
    "isOrganic" BOOLEAN NOT NULL DEFAULT false,
    "organicCertNumber" TEXT,
    "govtRegNumber" TEXT,
    "govtRegExpiry" TIMESTAMP(3),
    "shelfLifeMonths" INTEGER,
    "storageTemp" TEXT,
    "storageInstructions" TEXT,
    "reorderLevel" DOUBLE PRECISION,
    "minStockAlert" DOUBLE PRECISION,
    "bulkDiscountThreshold" DOUBLE PRECISION,
    "bulkDiscountPct" DOUBLE PRECISION,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "descriptionLong" TEXT,
    "usageInstructions" TEXT,
    "precautions" TEXT,
    "firstAid" TEXT,
    "msdsUrl" TEXT,
    "brochureUrl" TEXT,
    "videoUrl" TEXT,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isSeasonal" BOOLEAN NOT NULL DEFAULT false,
    "isRestricted" BOOLEAN NOT NULL DEFAULT false,
    "requiresLicense" BOOLEAN NOT NULL DEFAULT false,
    "totalSold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgriProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgriFarmer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "farmerNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "fatherName" TEXT,
    "cnic" TEXT,
    "phone" TEXT NOT NULL,
    "altPhone" TEXT,
    "village" TEXT,
    "tehsil" TEXT,
    "district" TEXT,
    "province" TEXT,
    "address" TEXT,
    "landmark" TEXT,
    "landAreaAcres" DOUBLE PRECISION,
    "landAreaKanals" DOUBLE PRECISION,
    "landOwnership" TEXT,
    "soilType" TEXT,
    "waterSource" TEXT,
    "irrigationType" TEXT,
    "farmingType" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "primaryCrops" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "livestock" JSONB,
    "cnicFrontUrl" TEXT,
    "cnicBackUrl" TEXT,
    "landDocUrl" TEXT,
    "photoUrl" TEXT,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditDays" INTEGER NOT NULL DEFAULT 60,
    "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentSeason" "SeasonType",
    "currentCrop" TEXT,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalPurchases" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOutstanding" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPurchaseAt" TIMESTAMP(3),
    "status" "FarmerAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suspendedAt" TIMESTAMP(3),
    "suspensionReason" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgriFarmer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgriFarmerLedger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entryType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saleId" TEXT,
    "paymentId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgriFarmerLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgriBulkOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "farmerId" TEXT,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryDate" TIMESTAMP(3),
    "status" "AgriOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "season" "SeasonType",
    "cropTarget" TEXT,
    "landAreaAcres" DOUBLE PRECISION,
    "isDelivery" BOOLEAN NOT NULL DEFAULT false,
    "deliveryAddress" TEXT,
    "deliveryCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transportType" TEXT,
    "vehicleNumber" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bulkDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "paymentMethod" TEXT,
    "isCredit" BOOLEAN NOT NULL DEFAULT false,
    "creditDueDate" TIMESTAMP(3),
    "advisorNotes" TEXT,
    "farmerNotes" TEXT,
    "cancellationReason" TEXT,
    "createdById" TEXT,
    "deliveredBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgriBulkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgriBulkOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "category" "AgriCategory",
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgriBulkOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgriCropAdvisory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "advisoryNumber" TEXT NOT NULL,
    "farmerId" TEXT,
    "advisorId" TEXT,
    "advisorName" TEXT,
    "cropName" TEXT NOT NULL,
    "cropVariety" TEXT,
    "season" "SeasonType",
    "landAreaAcres" DOUBLE PRECISION,
    "stage" TEXT,
    "sowingDate" TIMESTAMP(3),
    "expectedHarvest" TIMESTAMP(3),
    "currentIssues" TEXT,
    "soilTestResult" JSONB,
    "waterTestResult" JSONB,
    "recommendations" JSONB,
    "productSuggestions" JSONB,
    "followUpDate" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgriCropAdvisory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgriSeasonalPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "season" "SeasonType" NOT NULL,
    "year" INTEGER NOT NULL,
    "cropName" TEXT NOT NULL,
    "sowingStart" TIMESTAMP(3) NOT NULL,
    "sowingEnd" TIMESTAMP(3) NOT NULL,
    "harvestStart" TIMESTAMP(3) NOT NULL,
    "harvestEnd" TIMESTAMP(3) NOT NULL,
    "recommendedProducts" JSONB,
    "applicationSchedule" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgriSeasonalPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgriSubsidyClaim" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "schemeName" TEXT NOT NULL,
    "govtScheme" TEXT,
    "productType" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "subsidyAmount" DOUBLE PRECISION NOT NULL,
    "finalPrice" DOUBLE PRECISION NOT NULL,
    "farmerCnic" TEXT,
    "cropTarget" TEXT,
    "landAreaAcres" DOUBLE PRECISION,
    "documentsSubmitted" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "approvedBy" TEXT,
    "approvalDate" TIMESTAMP(3),
    "disbursementDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgriSubsidyClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgriProductProfile_productId_key" ON "AgriProductProfile"("productId");

-- CreateIndex
CREATE INDEX "AgriProductProfile_tenantId_idx" ON "AgriProductProfile"("tenantId");

-- CreateIndex
CREATE INDEX "AgriProductProfile_tenantId_category_idx" ON "AgriProductProfile"("tenantId", "category");

-- CreateIndex
CREATE INDEX "AgriProductProfile_tenantId_seedType_idx" ON "AgriProductProfile"("tenantId", "seedType");

-- CreateIndex
CREATE INDEX "AgriProductProfile_tenantId_fertilizerType_idx" ON "AgriProductProfile"("tenantId", "fertilizerType");

-- CreateIndex
CREATE UNIQUE INDEX "AgriFarmer_customerId_key" ON "AgriFarmer"("customerId");

-- CreateIndex
CREATE INDEX "AgriFarmer_tenantId_idx" ON "AgriFarmer"("tenantId");

-- CreateIndex
CREATE INDEX "AgriFarmer_tenantId_status_idx" ON "AgriFarmer"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AgriFarmer_customerId_idx" ON "AgriFarmer"("customerId");

-- CreateIndex
CREATE INDEX "AgriFarmer_cnic_idx" ON "AgriFarmer"("cnic");

-- CreateIndex
CREATE UNIQUE INDEX "AgriFarmer_tenantId_farmerNumber_key" ON "AgriFarmer"("tenantId", "farmerNumber");

-- CreateIndex
CREATE INDEX "AgriFarmerLedger_tenantId_idx" ON "AgriFarmerLedger"("tenantId");

-- CreateIndex
CREATE INDEX "AgriFarmerLedger_farmerId_idx" ON "AgriFarmerLedger"("farmerId");

-- CreateIndex
CREATE INDEX "AgriFarmerLedger_entryDate_idx" ON "AgriFarmerLedger"("entryDate");

-- CreateIndex
CREATE UNIQUE INDEX "AgriFarmerLedger_tenantId_entryNumber_key" ON "AgriFarmerLedger"("tenantId", "entryNumber");

-- CreateIndex
CREATE INDEX "AgriBulkOrder_tenantId_idx" ON "AgriBulkOrder"("tenantId");

-- CreateIndex
CREATE INDEX "AgriBulkOrder_tenantId_status_idx" ON "AgriBulkOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AgriBulkOrder_farmerId_idx" ON "AgriBulkOrder"("farmerId");

-- CreateIndex
CREATE UNIQUE INDEX "AgriBulkOrder_tenantId_orderNumber_key" ON "AgriBulkOrder"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "AgriBulkOrderItem_orderId_idx" ON "AgriBulkOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "AgriCropAdvisory_tenantId_idx" ON "AgriCropAdvisory"("tenantId");

-- CreateIndex
CREATE INDEX "AgriCropAdvisory_farmerId_idx" ON "AgriCropAdvisory"("farmerId");

-- CreateIndex
CREATE UNIQUE INDEX "AgriCropAdvisory_tenantId_advisoryNumber_key" ON "AgriCropAdvisory"("tenantId", "advisoryNumber");

-- CreateIndex
CREATE INDEX "AgriSeasonalPlan_tenantId_year_idx" ON "AgriSeasonalPlan"("tenantId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "AgriSeasonalPlan_tenantId_season_year_cropName_key" ON "AgriSeasonalPlan"("tenantId", "season", "year", "cropName");

-- CreateIndex
CREATE INDEX "AgriSubsidyClaim_tenantId_idx" ON "AgriSubsidyClaim"("tenantId");

-- CreateIndex
CREATE INDEX "AgriSubsidyClaim_farmerId_idx" ON "AgriSubsidyClaim"("farmerId");

-- CreateIndex
CREATE INDEX "AgriSubsidyClaim_status_idx" ON "AgriSubsidyClaim"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AgriSubsidyClaim_tenantId_claimNumber_key" ON "AgriSubsidyClaim"("tenantId", "claimNumber");

-- AddForeignKey
ALTER TABLE "AgriBulkOrderItem" ADD CONSTRAINT "AgriBulkOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "AgriBulkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
