-- CreateEnum
CREATE TYPE "MeatAnimalType" AS ENUM ('BEEF', 'MUTTON', 'GOAT', 'LAMB', 'CHICKEN', 'DUCK', 'TURKEY', 'QUAIL', 'CAMEL', 'BUFFALO', 'FISH', 'PRAWN', 'OTHER');

-- CreateEnum
CREATE TYPE "MeatCutCategory" AS ENUM ('WHOLE_ANIMAL', 'HALF_ANIMAL', 'QUARTER', 'PRIMAL_CUT', 'RETAIL_CUT', 'BONELESS', 'WITH_BONE', 'MINCE', 'UNDERCUT', 'RIBS', 'CHOPS', 'BREAST', 'LEG', 'THIGH', 'WING', 'DRUMSTICK', 'LIVER', 'KIDNEY', 'HEART', 'BRAIN', 'TONGUE', 'TROTTERS', 'HEAD', 'TAIL', 'OFFAL', 'BONES', 'FAT', 'SKIN', 'OTHER');

-- CreateEnum
CREATE TYPE "MeatFreshnessType" AS ENUM ('LIVE', 'FRESH_SLAUGHTERED', 'FRESH_CHILLED', 'FROZEN', 'PREPARED', 'PROCESSED', 'MARINATED', 'SMOKED', 'DRIED', 'CURED');

-- CreateEnum
CREATE TYPE "MeatSlaughterMethod" AS ENUM ('HALAL_HAND', 'HALAL_MACHINE', 'KOSHER', 'STANDARD', 'ORGANIC', 'FREE_RANGE', 'OTHER');

-- CreateEnum
CREATE TYPE "MeatQualityGrade" AS ENUM ('PREMIUM', 'GRADE_A', 'GRADE_B', 'GRADE_C', 'STANDARD', 'ECONOMY');

-- CreateEnum
CREATE TYPE "MeatSaleUnit" AS ENUM ('KG', 'GRAM', 'POUND', 'PIECE', 'DOZEN', 'WHOLE', 'HALF', 'QUARTER', 'KILO_PACK');

-- CreateEnum
CREATE TYPE "MeatOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PROCESSING', 'CUTTING', 'PACKED', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MeatSubscriptionFreq" AS ENUM ('DAILY', 'ALTERNATE_DAY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MeatSubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED', 'COMPLETED');

-- CreateTable
CREATE TABLE "MeatProductProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "animalType" "MeatAnimalType" NOT NULL,
    "cutCategory" "MeatCutCategory" NOT NULL,
    "freshnessType" "MeatFreshnessType" NOT NULL DEFAULT 'FRESH_CHILLED',
    "slaughterMethod" "MeatSlaughterMethod" NOT NULL DEFAULT 'HALAL_HAND',
    "qualityGrade" "MeatQualityGrade" NOT NULL DEFAULT 'GRADE_A',
    "saleUnit" "MeatSaleUnit" NOT NULL DEFAULT 'KG',
    "pricePerKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pricePerPiece" DOUBLE PRECISION,
    "minOrderKg" DOUBLE PRECISION,
    "maxOrderKg" DOUBLE PRECISION,
    "weightVariancePct" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "isBoneless" BOOLEAN NOT NULL DEFAULT false,
    "isBoneIn" BOOLEAN NOT NULL DEFAULT false,
    "isSkinless" BOOLEAN NOT NULL DEFAULT true,
    "isMarinated" BOOLEAN NOT NULL DEFAULT false,
    "marinationType" TEXT,
    "isOrganic" BOOLEAN NOT NULL DEFAULT false,
    "isFreeRange" BOOLEAN NOT NULL DEFAULT false,
    "isGrainFed" BOOLEAN NOT NULL DEFAULT false,
    "isGrassFed" BOOLEAN NOT NULL DEFAULT false,
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "halalCertNumber" TEXT,
    "halalCertBy" TEXT,
    "halalCertExpiry" TIMESTAMP(3),
    "isHalalCertified" BOOLEAN NOT NULL DEFAULT true,
    "otherCerts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "farmName" TEXT,
    "farmLocation" TEXT,
    "slaughterhouseName" TEXT,
    "slaughterhouseLic" TEXT,
    "countryOfOrigin" TEXT,
    "breed" TEXT,
    "storageTempMin" DOUBLE PRECISION,
    "storageTempMax" DOUBLE PRECISION,
    "shelfLifeDays" INTEGER,
    "packagingType" TEXT,
    "batchNumber" TEXT,
    "animalAge" TEXT,
    "animalSex" TEXT,
    "cuttingStyle" TEXT,
    "cleaningLevel" TEXT,
    "packagingWeight" DOUBLE PRECISION,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "descriptionLong" TEXT,
    "cookingSuggestions" TEXT,
    "nutritionInfo" JSONB,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "isOnSale" BOOLEAN NOT NULL DEFAULT false,
    "totalSoldKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeatProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeatLiveAnimal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "tagNumber" TEXT NOT NULL,
    "animalType" "MeatAnimalType" NOT NULL,
    "breed" TEXT,
    "color" TEXT,
    "sex" TEXT,
    "ageMonths" INTEGER,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "purchasePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vendorId" TEXT,
    "vendorName" TEXT,
    "sourceName" TEXT,
    "vaccinationStatus" TEXT,
    "healthCertUrl" TEXT,
    "isHealthy" BOOLEAN NOT NULL DEFAULT true,
    "healthNotes" TEXT,
    "vetCheckedAt" TIMESTAMP(3),
    "feedingType" TEXT,
    "dailyFeedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "daysHeld" INTEGER NOT NULL DEFAULT 0,
    "totalFeedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isSlaughtered" BOOLEAN NOT NULL DEFAULT false,
    "slaughteredAt" TIMESTAMP(3),
    "slaughterMethod" "MeatSlaughterMethod",
    "slaughterCertBy" TEXT,
    "slaughterWeightKg" DOUBLE PRECISION,
    "meatYieldKg" DOUBLE PRECISION,
    "yieldPct" DOUBLE PRECISION,
    "isSold" BOOLEAN NOT NULL DEFAULT false,
    "soldPrice" DOUBLE PRECISION,
    "soldAt" TIMESTAMP(3),
    "soldToCustomer" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeatLiveAnimal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeatSlaughterLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "slaughterNumber" TEXT NOT NULL,
    "liveAnimalId" TEXT,
    "animalType" "MeatAnimalType" NOT NULL,
    "animalTag" TEXT,
    "slaughterDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slaughterTime" TEXT,
    "slaughterMethod" "MeatSlaughterMethod" NOT NULL,
    "slaughteredBy" TEXT,
    "slaughtererId" TEXT,
    "slaughtererCertNumber" TEXT,
    "witnessedBy" TEXT,
    "liveWeightKg" DOUBLE PRECISION NOT NULL,
    "dressedWeightKg" DOUBLE PRECISION,
    "yieldPct" DOUBLE PRECISION,
    "facilityName" TEXT,
    "facilityLicense" TEXT,
    "facilityAddress" TEXT,
    "isHalal" BOOLEAN NOT NULL DEFAULT true,
    "halalCertNumber" TEXT,
    "religiousAuthority" TEXT,
    "vetInspection" BOOLEAN NOT NULL DEFAULT false,
    "vetInspectorName" TEXT,
    "vetCertNumber" TEXT,
    "postMortemNotes" TEXT,
    "qualityGrade" "MeatQualityGrade",
    "temperature" DOUBLE PRECISION,
    "storageLocation" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeatSlaughterLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeatCuttingJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "jobNumber" TEXT NOT NULL,
    "slaughterLogId" TEXT,
    "butcherId" TEXT,
    "butcherName" TEXT,
    "inputWeightKg" DOUBLE PRECISION NOT NULL,
    "outputWeightKg" DOUBLE PRECISION,
    "wasteWeightKg" DOUBLE PRECISION,
    "yieldPct" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMin" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "cutsProduced" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeatCuttingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeatWeightOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "neededBy" TIMESTAMP(3),
    "scheduledDelivery" TIMESTAMP(3),
    "status" "MeatOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "isDelivery" BOOLEAN NOT NULL DEFAULT false,
    "deliveryAddress" TEXT,
    "deliveryCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryPersonId" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "occasion" TEXT,
    "specialInstructions" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "cuttingStyle" TEXT,
    "packagingPref" TEXT,
    "numberOfPackets" INTEGER,
    "createdById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeatWeightOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeatWeightOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "cutCategory" "MeatCutCategory",
    "requestedKg" DOUBLE PRECISION NOT NULL,
    "actualKg" DOUBLE PRECISION,
    "pricePerKg" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cuttingInstructions" TEXT,
    "packagingNotes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeatWeightOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeatSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "subscriptionNumber" TEXT NOT NULL,
    "status" "MeatSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "frequency" "MeatSubscriptionFreq" NOT NULL DEFAULT 'WEEKLY',
    "customDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "nextDeliveryDate" TIMESTAMP(3),
    "lastDeliveryDate" TIMESTAMP(3),
    "standardItems" JSONB NOT NULL,
    "totalMonthlyKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryAddress" TEXT NOT NULL,
    "deliveryTimeSlot" TEXT,
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "monthlyEstimate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "pausedAt" TIMESTAMP(3),
    "pauseReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeatSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeatQurbaniBooking" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerCnic" TEXT,
    "customerAddress" TEXT,
    "occasion" TEXT NOT NULL DEFAULT 'QURBANI',
    "animalType" "MeatAnimalType" NOT NULL,
    "animalPreference" TEXT,
    "shareCount" INTEGER NOT NULL DEFAULT 1,
    "shareNumber" INTEGER,
    "advanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalPrice" DOUBLE PRECISION,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PARTIAL',
    "slaughterDate" TIMESTAMP(3),
    "slaughterDay" INTEGER,
    "wantsMeatDelivery" BOOLEAN NOT NULL DEFAULT true,
    "deliveryPreference" TEXT NOT NULL DEFAULT 'SELF_PICKUP',
    "deliveryAddress" TEXT,
    "needsCharityShare" BOOLEAN NOT NULL DEFAULT false,
    "charityShareKg" DOUBLE PRECISION,
    "charityRecipient" TEXT,
    "cuttingStyle" TEXT,
    "packagingCount" INTEGER,
    "wantsSkin" BOOLEAN NOT NULL DEFAULT false,
    "wantsOffal" BOOLEAN NOT NULL DEFAULT true,
    "specialInstructions" TEXT,
    "liveAnimalId" TEXT,
    "slaughterLogId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeatQurbaniBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeatWholesaleAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditDays" INTEGER NOT NULL DEFAULT 30,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "specialPricing" JSONB,
    "requiresDelivery" BOOLEAN NOT NULL DEFAULT true,
    "deliveryDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "deliveryTimeSlot" TEXT,
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "billingAddress" TEXT,
    "deliveryAddress" TEXT,
    "gstNumber" TEXT,
    "ntnNumber" TEXT,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalPurchases" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOutstanding" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeatWholesaleAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeatProductProfile_productId_key" ON "MeatProductProfile"("productId");

-- CreateIndex
CREATE INDEX "MeatProductProfile_tenantId_idx" ON "MeatProductProfile"("tenantId");

-- CreateIndex
CREATE INDEX "MeatProductProfile_tenantId_animalType_idx" ON "MeatProductProfile"("tenantId", "animalType");

-- CreateIndex
CREATE INDEX "MeatProductProfile_tenantId_cutCategory_idx" ON "MeatProductProfile"("tenantId", "cutCategory");

-- CreateIndex
CREATE INDEX "MeatProductProfile_tenantId_freshnessType_idx" ON "MeatProductProfile"("tenantId", "freshnessType");

-- CreateIndex
CREATE INDEX "MeatLiveAnimal_tenantId_idx" ON "MeatLiveAnimal"("tenantId");

-- CreateIndex
CREATE INDEX "MeatLiveAnimal_tenantId_animalType_idx" ON "MeatLiveAnimal"("tenantId", "animalType");

-- CreateIndex
CREATE INDEX "MeatLiveAnimal_tenantId_isSlaughtered_idx" ON "MeatLiveAnimal"("tenantId", "isSlaughtered");

-- CreateIndex
CREATE UNIQUE INDEX "MeatLiveAnimal_tenantId_tagNumber_key" ON "MeatLiveAnimal"("tenantId", "tagNumber");

-- CreateIndex
CREATE INDEX "MeatSlaughterLog_tenantId_idx" ON "MeatSlaughterLog"("tenantId");

-- CreateIndex
CREATE INDEX "MeatSlaughterLog_tenantId_slaughterDate_idx" ON "MeatSlaughterLog"("tenantId", "slaughterDate");

-- CreateIndex
CREATE INDEX "MeatSlaughterLog_liveAnimalId_idx" ON "MeatSlaughterLog"("liveAnimalId");

-- CreateIndex
CREATE UNIQUE INDEX "MeatSlaughterLog_tenantId_slaughterNumber_key" ON "MeatSlaughterLog"("tenantId", "slaughterNumber");

-- CreateIndex
CREATE INDEX "MeatCuttingJob_tenantId_idx" ON "MeatCuttingJob"("tenantId");

-- CreateIndex
CREATE INDEX "MeatCuttingJob_slaughterLogId_idx" ON "MeatCuttingJob"("slaughterLogId");

-- CreateIndex
CREATE UNIQUE INDEX "MeatCuttingJob_tenantId_jobNumber_key" ON "MeatCuttingJob"("tenantId", "jobNumber");

-- CreateIndex
CREATE INDEX "MeatWeightOrder_tenantId_idx" ON "MeatWeightOrder"("tenantId");

-- CreateIndex
CREATE INDEX "MeatWeightOrder_tenantId_status_idx" ON "MeatWeightOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "MeatWeightOrder_customerId_idx" ON "MeatWeightOrder"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "MeatWeightOrder_tenantId_orderNumber_key" ON "MeatWeightOrder"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "MeatWeightOrderItem_orderId_idx" ON "MeatWeightOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "MeatSubscription_tenantId_idx" ON "MeatSubscription"("tenantId");

-- CreateIndex
CREATE INDEX "MeatSubscription_tenantId_status_idx" ON "MeatSubscription"("tenantId", "status");

-- CreateIndex
CREATE INDEX "MeatSubscription_customerId_idx" ON "MeatSubscription"("customerId");

-- CreateIndex
CREATE INDEX "MeatSubscription_nextDeliveryDate_idx" ON "MeatSubscription"("nextDeliveryDate");

-- CreateIndex
CREATE UNIQUE INDEX "MeatSubscription_tenantId_subscriptionNumber_key" ON "MeatSubscription"("tenantId", "subscriptionNumber");

-- CreateIndex
CREATE INDEX "MeatQurbaniBooking_tenantId_idx" ON "MeatQurbaniBooking"("tenantId");

-- CreateIndex
CREATE INDEX "MeatQurbaniBooking_tenantId_status_idx" ON "MeatQurbaniBooking"("tenantId", "status");

-- CreateIndex
CREATE INDEX "MeatQurbaniBooking_customerId_idx" ON "MeatQurbaniBooking"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "MeatQurbaniBooking_tenantId_bookingNumber_key" ON "MeatQurbaniBooking"("tenantId", "bookingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MeatWholesaleAccount_customerId_key" ON "MeatWholesaleAccount"("customerId");

-- CreateIndex
CREATE INDEX "MeatWholesaleAccount_tenantId_idx" ON "MeatWholesaleAccount"("tenantId");

-- CreateIndex
CREATE INDEX "MeatWholesaleAccount_tenantId_isActive_idx" ON "MeatWholesaleAccount"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MeatWholesaleAccount_tenantId_accountNumber_key" ON "MeatWholesaleAccount"("tenantId", "accountNumber");

-- AddForeignKey
ALTER TABLE "MeatWeightOrderItem" ADD CONSTRAINT "MeatWeightOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MeatWeightOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
