-- CreateEnum
CREATE TYPE "DairyProductType" AS ENUM ('FRESH_MILK', 'BUFFALO_MILK', 'COW_MILK', 'GOAT_MILK', 'MIXED_MILK', 'BOILED_MILK', 'RAW_MILK', 'YOGURT', 'DAHI', 'LASSI', 'BUTTER_MILK', 'BUTTER', 'MAKHAN', 'DESI_GHEE', 'CREAM', 'MALAI', 'KHOA', 'MAWA', 'PANEER', 'CHEESE', 'KHEER', 'RABRI', 'KULFI', 'SWEETS', 'ICE_CREAM', 'MILK_POWDER', 'OTHER');

-- CreateEnum
CREATE TYPE "DairyUnit" AS ENUM ('LITER', 'KG', 'GRAM', 'PIECE', 'PLATE', 'CUP', 'BOTTLE', 'PACKET', 'KATTA', 'KILO', 'MAAN', 'SEER');

-- CreateEnum
CREATE TYPE "DairyMilkQuality" AS ENUM ('A_GRADE', 'B_GRADE', 'C_GRADE', 'REJECTED');

-- CreateEnum
CREATE TYPE "DairyDeliveryFrequency" AS ENUM ('DAILY', 'ALTERNATE_DAY', 'WEEKLY', 'ON_DEMAND', 'MORNING_ONLY', 'EVENING_ONLY', 'MORNING_EVENING');

-- CreateEnum
CREATE TYPE "DairyDeliverySlot" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT');

-- CreateEnum
CREATE TYPE "DairyRouteStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "DairyKhataStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED', 'DEFAULTED');

-- CreateEnum
CREATE TYPE "DairyBillingCycle" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "DairyDeliveryStatus" AS ENUM ('SCHEDULED', 'DELIVERED', 'SKIPPED', 'MISSED', 'RETURNED', 'CANCELLED');

-- CreateTable
CREATE TABLE "DairyProduct" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productType" "DairyProductType" NOT NULL DEFAULT 'FRESH_MILK',
    "unit" "DairyUnit" NOT NULL DEFAULT 'LITER',
    "fatContent" DOUBLE PRECISION,
    "snfContent" DOUBLE PRECISION,
    "proteinContent" DOUBLE PRECISION,
    "waterAdded" BOOLEAN NOT NULL DEFAULT false,
    "quality" "DairyMilkQuality",
    "isPasteurized" BOOLEAN NOT NULL DEFAULT false,
    "isHomogenized" BOOLEAN NOT NULL DEFAULT false,
    "isRaw" BOOLEAN NOT NULL DEFAULT false,
    "isOrganic" BOOLEAN NOT NULL DEFAULT false,
    "isFresh" BOOLEAN NOT NULL DEFAULT true,
    "productionDate" TIMESTAMP(3),
    "bestBeforeHours" INTEGER,
    "shelfLifeHours" INTEGER,
    "requiresRefrigeration" BOOLEAN NOT NULL DEFAULT true,
    "storageTempMin" DOUBLE PRECISION,
    "storageTempMax" DOUBLE PRECISION,
    "farmSource" TEXT,
    "cattleType" TEXT,
    "morningPrice" DOUBLE PRECISION,
    "eveningPrice" DOUBLE PRECISION,
    "bulkPrice" DOUBLE PRECISION,
    "minBulkQty" DOUBLE PRECISION,
    "wholesalePrice" DOUBLE PRECISION,
    "retailPrice" DOUBLE PRECISION,
    "homeDeliveryPrice" DOUBLE PRECISION,
    "availableMorning" BOOLEAN NOT NULL DEFAULT true,
    "availableEvening" BOOLEAN NOT NULL DEFAULT true,
    "homeDeliveryAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "totalSold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DairyProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DairyFarmer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "farmerNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fatherName" TEXT,
    "cnic" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "village" TEXT,
    "city" TEXT,
    "cattleCount" INTEGER,
    "buffaloCount" INTEGER,
    "cowCount" INTEGER,
    "goatCount" INTEGER,
    "totalCapacityLiters" DOUBLE PRECISION,
    "ratePerLiter" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fatBonusRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentCycle" "DairyBillingCycle" NOT NULL DEFAULT 'WEEKLY',
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSupplied" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgFatContent" DOUBLE PRECISION,
    "avgSnfContent" DOUBLE PRECISION,
    "qualityRating" DOUBLE PRECISION,
    "lastSupplyDate" TIMESTAMP(3),
    "lastPaymentDate" TIMESTAMP(3),
    "photoUrl" TEXT,
    "cnicFrontUrl" TEXT,
    "cnicBackUrl" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DairyFarmer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DairyFarmerSupply" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "supplyDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slot" "DairyDeliverySlot" NOT NULL DEFAULT 'MORNING',
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" "DairyUnit" NOT NULL DEFAULT 'LITER',
    "fatContent" DOUBLE PRECISION,
    "snfContent" DOUBLE PRECISION,
    "quality" "DairyMilkQuality",
    "ratePerLiter" DOUBLE PRECISION NOT NULL,
    "fatBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "receivedByStaffId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DairyFarmerSupply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DairyRoute" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "routeNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "assignedStaffId" TEXT,
    "vehicleType" TEXT,
    "vehicleNumber" TEXT,
    "slot" "DairyDeliverySlot" NOT NULL DEFAULT 'MORNING',
    "status" "DairyRouteStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalCustomers" INTEGER NOT NULL DEFAULT 0,
    "totalDailyLiters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startTime" TEXT,
    "estimatedDurationMin" INTEGER,
    "areaName" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DairyRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DairyCustomer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "routeId" TEXT,
    "customerNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "cnic" TEXT,
    "address" TEXT,
    "city" TEXT,
    "area" TEXT,
    "landmark" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "deliveryFrequency" "DairyDeliveryFrequency" NOT NULL DEFAULT 'DAILY',
    "morningQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "eveningQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "productPreference" TEXT,
    "containerType" TEXT,
    "customRate" DOUBLE PRECISION,
    "billingCycle" "DairyBillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPurchases" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPayments" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advancePayment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "missedDeliveries" INTEGER NOT NULL DEFAULT 0,
    "lastDeliveryDate" TIMESTAMP(3),
    "lastPaymentDate" TIMESTAMP(3),
    "status" "DairyKhataStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedFrom" TIMESTAMP(3),
    "pausedTo" TIMESTAMP(3),
    "notes" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DairyCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DairyDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dairyCustomerId" TEXT NOT NULL,
    "routeId" TEXT,
    "deliveryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slot" "DairyDeliverySlot" NOT NULL DEFAULT 'MORNING',
    "scheduledQty" DOUBLE PRECISION NOT NULL,
    "deliveredQty" DOUBLE PRECISION NOT NULL,
    "returnedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" "DairyUnit" NOT NULL DEFAULT 'LITER',
    "status" "DairyDeliveryStatus" NOT NULL DEFAULT 'SCHEDULED',
    "skipReason" TEXT,
    "ratePerLiter" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveredByStaffId" TEXT,
    "containerReturned" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),
    "notes" TEXT,
    "customerSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DairyDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DairyMonthlyBill" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dairyCustomerId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "cycleStartDate" TIMESTAMP(3) NOT NULL,
    "cycleEndDate" TIMESTAMP(3) NOT NULL,
    "totalLiters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "isPrinted" BOOLEAN NOT NULL DEFAULT false,
    "sentToCustomer" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "notes" TEXT,
    "handledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DairyMonthlyBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DairyQualityTest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "testNumber" TEXT NOT NULL,
    "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceName" TEXT,
    "fatContent" DOUBLE PRECISION,
    "snfContent" DOUBLE PRECISION,
    "proteinContent" DOUBLE PRECISION,
    "lactoseContent" DOUBLE PRECISION,
    "waterContent" DOUBLE PRECISION,
    "phLevel" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "adulterationDetected" BOOLEAN NOT NULL DEFAULT false,
    "adulterationTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quality" "DairyMilkQuality",
    "passed" BOOLEAN NOT NULL DEFAULT true,
    "actionTaken" TEXT,
    "testedByStaffId" TEXT,
    "testMethod" TEXT,
    "notes" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DairyQualityTest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DairyProduct_productId_key" ON "DairyProduct"("productId");

-- CreateIndex
CREATE INDEX "DairyProduct_tenantId_idx" ON "DairyProduct"("tenantId");

-- CreateIndex
CREATE INDEX "DairyProduct_tenantId_productType_idx" ON "DairyProduct"("tenantId", "productType");

-- CreateIndex
CREATE INDEX "DairyFarmer_tenantId_idx" ON "DairyFarmer"("tenantId");

-- CreateIndex
CREATE INDEX "DairyFarmer_tenantId_isActive_idx" ON "DairyFarmer"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DairyFarmer_tenantId_farmerNumber_key" ON "DairyFarmer"("tenantId", "farmerNumber");

-- CreateIndex
CREATE INDEX "DairyFarmerSupply_tenantId_idx" ON "DairyFarmerSupply"("tenantId");

-- CreateIndex
CREATE INDEX "DairyFarmerSupply_farmerId_idx" ON "DairyFarmerSupply"("farmerId");

-- CreateIndex
CREATE INDEX "DairyFarmerSupply_supplyDate_idx" ON "DairyFarmerSupply"("supplyDate");

-- CreateIndex
CREATE INDEX "DairyRoute_tenantId_idx" ON "DairyRoute"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "DairyRoute_tenantId_routeNumber_key" ON "DairyRoute"("tenantId", "routeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DairyCustomer_customerId_key" ON "DairyCustomer"("customerId");

-- CreateIndex
CREATE INDEX "DairyCustomer_tenantId_idx" ON "DairyCustomer"("tenantId");

-- CreateIndex
CREATE INDEX "DairyCustomer_tenantId_status_idx" ON "DairyCustomer"("tenantId", "status");

-- CreateIndex
CREATE INDEX "DairyCustomer_routeId_idx" ON "DairyCustomer"("routeId");

-- CreateIndex
CREATE UNIQUE INDEX "DairyCustomer_tenantId_customerNumber_key" ON "DairyCustomer"("tenantId", "customerNumber");

-- CreateIndex
CREATE INDEX "DairyDelivery_tenantId_idx" ON "DairyDelivery"("tenantId");

-- CreateIndex
CREATE INDEX "DairyDelivery_dairyCustomerId_idx" ON "DairyDelivery"("dairyCustomerId");

-- CreateIndex
CREATE INDEX "DairyDelivery_deliveryDate_idx" ON "DairyDelivery"("deliveryDate");

-- CreateIndex
CREATE INDEX "DairyDelivery_tenantId_status_idx" ON "DairyDelivery"("tenantId", "status");

-- CreateIndex
CREATE INDEX "DairyMonthlyBill_tenantId_idx" ON "DairyMonthlyBill"("tenantId");

-- CreateIndex
CREATE INDEX "DairyMonthlyBill_dairyCustomerId_idx" ON "DairyMonthlyBill"("dairyCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "DairyMonthlyBill_tenantId_billNumber_key" ON "DairyMonthlyBill"("tenantId", "billNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DairyMonthlyBill_dairyCustomerId_month_year_key" ON "DairyMonthlyBill"("dairyCustomerId", "month", "year");

-- CreateIndex
CREATE INDEX "DairyQualityTest_tenantId_idx" ON "DairyQualityTest"("tenantId");

-- CreateIndex
CREATE INDEX "DairyQualityTest_testedAt_idx" ON "DairyQualityTest"("testedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DairyQualityTest_tenantId_testNumber_key" ON "DairyQualityTest"("tenantId", "testNumber");

-- AddForeignKey
ALTER TABLE "DairyFarmerSupply" ADD CONSTRAINT "DairyFarmerSupply_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "DairyFarmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DairyCustomer" ADD CONSTRAINT "DairyCustomer_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "DairyRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DairyDelivery" ADD CONSTRAINT "DairyDelivery_dairyCustomerId_fkey" FOREIGN KEY ("dairyCustomerId") REFERENCES "DairyCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
