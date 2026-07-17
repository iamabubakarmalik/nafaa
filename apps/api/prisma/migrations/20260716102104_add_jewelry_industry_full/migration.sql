-- CreateEnum
CREATE TYPE "JewelryMetalType" AS ENUM ('GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM', 'ROSE_GOLD', 'WHITE_GOLD', 'IMITATION', 'MIXED', 'OTHER');

-- CreateEnum
CREATE TYPE "JewelryPurity" AS ENUM ('KARAT_24', 'KARAT_22', 'KARAT_21', 'KARAT_18', 'KARAT_14', 'KARAT_10', 'KARAT_9', 'STERLING_925', 'SILVER_999', 'SILVER_925', 'SILVER_800', 'PLATINUM_950', 'PLATINUM_900', 'OTHER');

-- CreateEnum
CREATE TYPE "JewelryCategory" AS ENUM ('RING', 'NECKLACE', 'EARRINGS', 'BANGLE', 'BRACELET', 'ANKLET', 'PENDANT', 'CHAIN', 'NOSE_PIN', 'NOSE_RING', 'MAANG_TIKKA', 'JHUMKA', 'CHOKER', 'MANGALSUTRA', 'HAAR', 'KUNDAN_SET', 'BRIDAL_SET', 'KADA', 'PAYAL', 'TOE_RING', 'BROOCH', 'CUFFLINK', 'TIE_PIN', 'WATCH', 'COIN', 'BAR', 'BULLION', 'BUTTON', 'RAKHI', 'OTHER');

-- CreateEnum
CREATE TYPE "JewelryStyle" AS ENUM ('TRADITIONAL', 'MODERN', 'ANTIQUE', 'BRIDAL', 'DAILY_WEAR', 'PARTY_WEAR', 'KUNDAN', 'POLKI', 'MEENAKARI', 'JADAU', 'TEMPLE', 'FILIGREE', 'HANDMADE', 'MACHINE_MADE', 'ITALIAN', 'TURKISH', 'DUBAI', 'INDIAN', 'PAKISTANI', 'CUSTOM', 'OTHER');

-- CreateEnum
CREATE TYPE "GemstoneType" AS ENUM ('DIAMOND', 'RUBY', 'EMERALD', 'SAPPHIRE', 'PEARL', 'OPAL', 'TOPAZ', 'AMETHYST', 'AQUAMARINE', 'GARNET', 'TURQUOISE', 'CORAL', 'ONYX', 'JADE', 'MOONSTONE', 'CITRINE', 'TANZANITE', 'ZIRCON', 'CZ', 'KUNDAN_STONE', 'OTHER', 'NONE');

-- CreateEnum
CREATE TYPE "JewelryOrderStatus" AS ENUM ('DRAFT', 'QUOTED', 'CONFIRMED', 'DESIGNING', 'METAL_ISSUED', 'IN_PRODUCTION', 'POLISHING', 'QUALITY_CHECK', 'HALLMARKING', 'READY', 'DELIVERED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "ExchangeType" AS ENUM ('OLD_GOLD_EXCHANGE', 'OLD_SILVER_EXCHANGE', 'BROKEN_JEWELRY', 'PURE_METAL_DEPOSIT', 'COIN_EXCHANGE', 'RESIZING', 'REPAIR', 'RENOVATION', 'MELT_AND_REMAKE');

-- CreateTable
CREATE TABLE "JewelryMetalRate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "metalType" "JewelryMetalType" NOT NULL,
    "purity" "JewelryPurity" NOT NULL,
    "ratePerGram" DOUBLE PRECISION NOT NULL,
    "ratePerTola" DOUBLE PRECISION,
    "ratePerOunce" DOUBLE PRECISION,
    "buyRate" DOUBLE PRECISION,
    "sellRate" DOUBLE PRECISION,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JewelryMetalRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JewelryProductProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "itemCode" TEXT,
    "designNumber" TEXT,
    "category" "JewelryCategory" NOT NULL,
    "subCategory" TEXT,
    "style" "JewelryStyle" NOT NULL DEFAULT 'TRADITIONAL',
    "metalType" "JewelryMetalType" NOT NULL,
    "purity" "JewelryPurity" NOT NULL,
    "purityHallmark" TEXT,
    "grossWeight" DOUBLE PRECISION NOT NULL,
    "netWeight" DOUBLE PRECISION NOT NULL,
    "stoneWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waxWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "size" TEXT,
    "length" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "thickness" DOUBLE PRECISION,
    "makingChargePerGram" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "makingChargeFixed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "makingChargePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wastagePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wastageGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "designerCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "polishCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hallmarkCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hasStones" BOOLEAN NOT NULL DEFAULT false,
    "hasDiamond" BOOLEAN NOT NULL DEFAULT false,
    "hasGemstone" BOOLEAN NOT NULL DEFAULT false,
    "hasPearl" BOOLEAN NOT NULL DEFAULT false,
    "stoneCount" INTEGER NOT NULL DEFAULT 0,
    "stoneCaret" DOUBLE PRECISION,
    "stoneQuality" TEXT,
    "stoneColor" TEXT,
    "stoneClarity" TEXT,
    "stoneCut" TEXT,
    "hallmarkNumber" TEXT,
    "hallmarkAuthority" TEXT,
    "hallmarkDate" TIMESTAMP(3),
    "bisNumber" TEXT,
    "jewellerCode" TEXT,
    "hallmarkPhotoUrl" TEXT,
    "designerName" TEXT,
    "karigarName" TEXT,
    "workshopName" TEXT,
    "countryOfOrigin" TEXT,
    "isCustomOrder" BOOLEAN NOT NULL DEFAULT false,
    "isBespoke" BOOLEAN NOT NULL DEFAULT false,
    "isAntique" BOOLEAN NOT NULL DEFAULT false,
    "isCertified" BOOLEAN NOT NULL DEFAULT false,
    "certificateNumber" TEXT,
    "certificateAuthority" TEXT,
    "certificatePhotoUrl" TEXT,
    "isBuyBackEligible" BOOLEAN NOT NULL DEFAULT true,
    "buyBackPct" DOUBLE PRECISION NOT NULL DEFAULT 90,
    "isReturnable" BOOLEAN NOT NULL DEFAULT false,
    "returnDays" INTEGER NOT NULL DEFAULT 0,
    "currentValue" DOUBLE PRECISION,
    "lastValuationDate" TIMESTAMP(3),
    "insuredValue" DOUBLE PRECISION,
    "insurancePolicyNumber" TEXT,
    "insuranceExpiry" TIMESTAMP(3),
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videoUrl" TEXT,
    "descriptionLong" TEXT,
    "careInstructions" TEXT,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isBridalCollection" BOOLEAN NOT NULL DEFAULT false,
    "isFestivalSpecial" BOOLEAN NOT NULL DEFAULT false,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JewelryProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JewelryGemstone" (
    "id" TEXT NOT NULL,
    "jewelryProfileId" TEXT NOT NULL,
    "type" "GemstoneType" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "caret" DOUBLE PRECISION NOT NULL,
    "quality" TEXT,
    "color" TEXT,
    "clarity" TEXT,
    "cut" TEXT,
    "shape" TEXT,
    "origin" TEXT,
    "isCertified" BOOLEAN NOT NULL DEFAULT false,
    "certificateNumber" TEXT,
    "ratePerCaret" DOUBLE PRECISION,
    "totalValue" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JewelryGemstone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JewelrySale" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerCnic" TEXT,
    "customerAddress" TEXT,
    "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "JewelryOrderStatus" NOT NULL DEFAULT 'CONFIRMED',
    "metalRateSnapshot" JSONB,
    "grossWeight" DOUBLE PRECISION NOT NULL,
    "netWeight" DOUBLE PRECISION NOT NULL,
    "metalValue" DOUBLE PRECISION NOT NULL,
    "makingCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wastageValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "polishCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hallmarkCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stoneValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "paymentMethod" TEXT,
    "exchangeMetalGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "exchangeMetalPurity" "JewelryPurity",
    "exchangeValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hallmarkVerified" BOOLEAN NOT NULL DEFAULT false,
    "hasCertificate" BOOLEAN NOT NULL DEFAULT false,
    "isReturned" BOOLEAN NOT NULL DEFAULT false,
    "returnedAt" TIMESTAMP(3),
    "returnReason" TEXT,
    "isExchanged" BOOLEAN NOT NULL DEFAULT false,
    "exchangedAt" TIMESTAMP(3),
    "exchangeType" "ExchangeType",
    "customerNotes" TEXT,
    "internalNotes" TEXT,
    "createdById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JewelrySale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JewelrySaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "category" "JewelryCategory" NOT NULL,
    "metalType" "JewelryMetalType" NOT NULL,
    "purity" "JewelryPurity" NOT NULL,
    "ratePerGram" DOUBLE PRECISION NOT NULL,
    "grossWeight" DOUBLE PRECISION NOT NULL,
    "netWeight" DOUBLE PRECISION NOT NULL,
    "metalValue" DOUBLE PRECISION NOT NULL,
    "makingChargePerGram" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "makingChargeFixed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "makingChargePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "makingTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wastagePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wastageValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "polishCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hallmarkCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stoneValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "itemTotal" DOUBLE PRECISION NOT NULL,
    "hallmarkNumber" TEXT,
    "certificateNumber" TEXT,
    "itemPhotoUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JewelrySaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JewelryCustomOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promisedDate" TIMESTAMP(3),
    "status" "JewelryOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "category" "JewelryCategory" NOT NULL,
    "metalType" "JewelryMetalType" NOT NULL,
    "purity" "JewelryPurity" NOT NULL,
    "style" "JewelryStyle" NOT NULL DEFAULT 'CUSTOM',
    "expectedGrossWeight" DOUBLE PRECISION NOT NULL,
    "expectedNetWeight" DOUBLE PRECISION,
    "expectedMakingCharges" DOUBLE PRECISION,
    "advancePayment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedPrice" DOUBLE PRECISION NOT NULL,
    "finalPrice" DOUBLE PRECISION,
    "designDescription" TEXT NOT NULL,
    "referenceImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "approvedDesignUrl" TEXT,
    "hasGemstones" BOOLEAN NOT NULL DEFAULT false,
    "gemstonesRequired" JSONB,
    "hasEngraving" BOOLEAN NOT NULL DEFAULT false,
    "engravingText" TEXT,
    "designedBy" TEXT,
    "assignedKarigarId" TEXT,
    "assignedKarigarName" TEXT,
    "metalIssuedGrams" DOUBLE PRECISION,
    "metalIssuedDate" TIMESTAMP(3),
    "metalReceivedGrams" DOUBLE PRECISION,
    "metalReceivedDate" TIMESTAMP(3),
    "wastageGrams" DOUBLE PRECISION,
    "designStartedAt" TIMESTAMP(3),
    "designApprovedAt" TIMESTAMP(3),
    "productionStartedAt" TIMESTAMP(3),
    "polishingStartedAt" TIMESTAMP(3),
    "qualityCheckedAt" TIMESTAMP(3),
    "hallmarkedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "customerRating" INTEGER,
    "customerFeedback" TEXT,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'ADVANCE_PAID',
    "hallmarkNumber" TEXT,
    "certificateNumber" TEXT,
    "internalNotes" TEXT,
    "cancellationReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JewelryCustomOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JewelryExchange" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "exchangeNumber" TEXT NOT NULL,
    "exchangeType" "ExchangeType" NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerCnic" TEXT,
    "exchangeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemDescription" TEXT NOT NULL,
    "metalType" "JewelryMetalType" NOT NULL,
    "claimedPurity" "JewelryPurity" NOT NULL,
    "grossWeight" DOUBLE PRECISION NOT NULL,
    "testedPurity" "JewelryPurity",
    "netWeight" DOUBLE PRECISION,
    "stoneWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fineGoldEquivalent" DOUBLE PRECISION,
    "ratePerGram" DOUBLE PRECISION NOT NULL,
    "grossValue" DOUBLE PRECISION NOT NULL,
    "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netValue" DOUBLE PRECISION NOT NULL,
    "meltingCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "testingCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saleId" TEXT,
    "usedAgainstOrderId" TEXT,
    "purpose" TEXT,
    "testingMethod" TEXT,
    "testedBy" TEXT,
    "witnessedBy" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cnicPhotoUrl" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JewelryExchange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JewelryKarigar" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "karigarNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "fatherName" TEXT,
    "cnic" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "photoUrl" TEXT,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearsExperience" INTEGER,
    "skillLevel" TEXT,
    "hourlyRate" DOUBLE PRECISION,
    "perGramRate" DOUBLE PRECISION,
    "fixedRatePerPiece" DOUBLE PRECISION,
    "metalIssuedGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metalReturnedGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wastageGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outstandingGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "completedOrders" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qualityRating" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isInHouse" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JewelryKarigar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JewelryMetalStock" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entryType" TEXT NOT NULL,
    "metalType" "JewelryMetalType" NOT NULL,
    "purity" "JewelryPurity" NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,
    "balanceGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratePerGram" DOUBLE PRECISION,
    "totalValue" DOUBLE PRECISION,
    "source" TEXT,
    "reference" TEXT,
    "karigarId" TEXT,
    "saleId" TEXT,
    "exchangeId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JewelryMetalStock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JewelryMetalRate_tenantId_idx" ON "JewelryMetalRate"("tenantId");

-- CreateIndex
CREATE INDEX "JewelryMetalRate_tenantId_metalType_purity_idx" ON "JewelryMetalRate"("tenantId", "metalType", "purity");

-- CreateIndex
CREATE INDEX "JewelryMetalRate_effectiveDate_idx" ON "JewelryMetalRate"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "JewelryMetalRate_tenantId_metalType_purity_effectiveDate_key" ON "JewelryMetalRate"("tenantId", "metalType", "purity", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "JewelryProductProfile_productId_key" ON "JewelryProductProfile"("productId");

-- CreateIndex
CREATE INDEX "JewelryProductProfile_tenantId_idx" ON "JewelryProductProfile"("tenantId");

-- CreateIndex
CREATE INDEX "JewelryProductProfile_tenantId_category_idx" ON "JewelryProductProfile"("tenantId", "category");

-- CreateIndex
CREATE INDEX "JewelryProductProfile_tenantId_metalType_idx" ON "JewelryProductProfile"("tenantId", "metalType");

-- CreateIndex
CREATE INDEX "JewelryProductProfile_tenantId_purity_idx" ON "JewelryProductProfile"("tenantId", "purity");

-- CreateIndex
CREATE INDEX "JewelryGemstone_jewelryProfileId_idx" ON "JewelryGemstone"("jewelryProfileId");

-- CreateIndex
CREATE INDEX "JewelrySale_tenantId_idx" ON "JewelrySale"("tenantId");

-- CreateIndex
CREATE INDEX "JewelrySale_tenantId_status_idx" ON "JewelrySale"("tenantId", "status");

-- CreateIndex
CREATE INDEX "JewelrySale_customerId_idx" ON "JewelrySale"("customerId");

-- CreateIndex
CREATE INDEX "JewelrySale_saleDate_idx" ON "JewelrySale"("saleDate");

-- CreateIndex
CREATE UNIQUE INDEX "JewelrySale_tenantId_invoiceNumber_key" ON "JewelrySale"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "JewelrySaleItem_saleId_idx" ON "JewelrySaleItem"("saleId");

-- CreateIndex
CREATE INDEX "JewelryCustomOrder_tenantId_idx" ON "JewelryCustomOrder"("tenantId");

-- CreateIndex
CREATE INDEX "JewelryCustomOrder_tenantId_status_idx" ON "JewelryCustomOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "JewelryCustomOrder_customerId_idx" ON "JewelryCustomOrder"("customerId");

-- CreateIndex
CREATE INDEX "JewelryCustomOrder_assignedKarigarId_idx" ON "JewelryCustomOrder"("assignedKarigarId");

-- CreateIndex
CREATE UNIQUE INDEX "JewelryCustomOrder_tenantId_orderNumber_key" ON "JewelryCustomOrder"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "JewelryExchange_tenantId_idx" ON "JewelryExchange"("tenantId");

-- CreateIndex
CREATE INDEX "JewelryExchange_customerId_idx" ON "JewelryExchange"("customerId");

-- CreateIndex
CREATE INDEX "JewelryExchange_exchangeDate_idx" ON "JewelryExchange"("exchangeDate");

-- CreateIndex
CREATE UNIQUE INDEX "JewelryExchange_tenantId_exchangeNumber_key" ON "JewelryExchange"("tenantId", "exchangeNumber");

-- CreateIndex
CREATE INDEX "JewelryKarigar_tenantId_idx" ON "JewelryKarigar"("tenantId");

-- CreateIndex
CREATE INDEX "JewelryKarigar_tenantId_isActive_idx" ON "JewelryKarigar"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "JewelryKarigar_tenantId_karigarNumber_key" ON "JewelryKarigar"("tenantId", "karigarNumber");

-- CreateIndex
CREATE INDEX "JewelryMetalStock_tenantId_idx" ON "JewelryMetalStock"("tenantId");

-- CreateIndex
CREATE INDEX "JewelryMetalStock_tenantId_metalType_purity_idx" ON "JewelryMetalStock"("tenantId", "metalType", "purity");

-- CreateIndex
CREATE INDEX "JewelryMetalStock_entryDate_idx" ON "JewelryMetalStock"("entryDate");

-- CreateIndex
CREATE UNIQUE INDEX "JewelryMetalStock_tenantId_entryNumber_key" ON "JewelryMetalStock"("tenantId", "entryNumber");

-- AddForeignKey
ALTER TABLE "JewelryGemstone" ADD CONSTRAINT "JewelryGemstone_jewelryProfileId_fkey" FOREIGN KEY ("jewelryProfileId") REFERENCES "JewelryProductProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JewelrySaleItem" ADD CONSTRAINT "JewelrySaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "JewelrySale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
