-- Industry round 3: gym, hotel, appliances, dairy, services business.
--
-- 1. Gym
--    - GymLocker: lockers with member, monthly rent, dates and status.
--    - GymPersonalTrainingPackage: a block of PT sessions sold together.
--    - saleId on GymMemberMembership, GymPersonalTraining and
--      GymClassBooking, so the bill is found by id, not by bill number.
--    - isVoided on GymBodyMeasurement and GymWorkoutSession.
-- 2. Expenses
--    - Expense.sourceType and sourceId: the record that raised an expense
--      (e.g. a gym trainer payout), instead of matching by title.
-- 3. Hotel
--    - HotelFolioCharge.productId, unitCost, shopId: stock item charges,
--      kept as columns instead of text in "reference".
--    - HotelBooking.customerId: the khata a stay is billed to.
--    - HotelRoom.shopId: branch of each room.
--    - HotelNightAudit: one row per closed business day and branch.
-- 4. Appliances
--    - ApplianceSerialTracking.shopId: branch of each unit.
--    - ApplianceProductProfile.shopWarrantyMonths.
--    - ApplianceTradeIn: old appliances taken in trade.
--    - EmiPlan guarantor name, phone, CNIC and address.
-- 5. Dairy
--    - DairyFarmerPayment: payments to farmers by any method.
-- 6. Services business
--    - ServiceJob.returnedAmount.
--    - ServiceJobPart.returnedQty and returnedAmount.
--
-- Additive only: new columns are nullable or have a default, and new
-- tables start empty. Safe to run more than once.

-- ─── Gym ──────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "GymLockerStatus" AS ENUM ('FREE', 'OCCUPIED', 'MAINTENANCE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GymPersonalTrainingPackageStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "GymLocker" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shopId" TEXT,
  "number" TEXT NOT NULL,
  "memberId" TEXT,
  "monthlyRent" DOUBLE PRECISION NOT NULL,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "status" "GymLockerStatus" NOT NULL DEFAULT 'FREE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GymLocker_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "GymLocker_tenantId_number_key" ON "GymLocker"("tenantId", "number");
CREATE INDEX IF NOT EXISTS "GymLocker_tenantId_idx" ON "GymLocker"("tenantId");
CREATE INDEX IF NOT EXISTS "GymLocker_memberId_idx" ON "GymLocker"("memberId");

CREATE TABLE IF NOT EXISTS "GymPersonalTrainingPackage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shopId" TEXT,
  "memberId" TEXT NOT NULL,
  "trainerId" TEXT,
  "packageNumber" TEXT NOT NULL,
  "sessionsTotal" INTEGER NOT NULL,
  "sessionsUsed" INTEGER NOT NULL DEFAULT 0,
  "price" DOUBLE PRECISION NOT NULL,
  "saleId" TEXT,
  "status" "GymPersonalTrainingPackageStatus" NOT NULL DEFAULT 'ACTIVE',
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endDate" TIMESTAMP(3),
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GymPersonalTrainingPackage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "GymPersonalTrainingPackage_tenantId_packageNumber_key" ON "GymPersonalTrainingPackage"("tenantId", "packageNumber");
CREATE INDEX IF NOT EXISTS "GymPersonalTrainingPackage_tenantId_idx" ON "GymPersonalTrainingPackage"("tenantId");
CREATE INDEX IF NOT EXISTS "GymPersonalTrainingPackage_memberId_idx" ON "GymPersonalTrainingPackage"("memberId");
CREATE INDEX IF NOT EXISTS "GymPersonalTrainingPackage_trainerId_idx" ON "GymPersonalTrainingPackage"("trainerId");
CREATE INDEX IF NOT EXISTS "GymPersonalTrainingPackage_saleId_idx" ON "GymPersonalTrainingPackage"("saleId");

ALTER TABLE "GymMemberMembership" ADD COLUMN IF NOT EXISTS "saleId" TEXT;
CREATE INDEX IF NOT EXISTS "GymMemberMembership_saleId_idx" ON "GymMemberMembership"("saleId");

ALTER TABLE "GymPersonalTraining" ADD COLUMN IF NOT EXISTS "saleId" TEXT;
CREATE INDEX IF NOT EXISTS "GymPersonalTraining_saleId_idx" ON "GymPersonalTraining"("saleId");

ALTER TABLE "GymClassBooking" ADD COLUMN IF NOT EXISTS "saleId" TEXT;
CREATE INDEX IF NOT EXISTS "GymClassBooking_saleId_idx" ON "GymClassBooking"("saleId");

ALTER TABLE "GymBodyMeasurement" ADD COLUMN IF NOT EXISTS "isVoided" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "GymWorkoutSession" ADD COLUMN IF NOT EXISTS "isVoided" BOOLEAN NOT NULL DEFAULT false;

-- ─── Expenses ─────────────────────────────────────────────────────────

ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "sourceType" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "sourceId" TEXT;
CREATE INDEX IF NOT EXISTS "Expense_tenantId_sourceType_sourceId_idx" ON "Expense"("tenantId", "sourceType", "sourceId");

-- ─── Hotel ────────────────────────────────────────────────────────────

ALTER TABLE "HotelFolioCharge" ADD COLUMN IF NOT EXISTS "productId" TEXT;
ALTER TABLE "HotelFolioCharge" ADD COLUMN IF NOT EXISTS "unitCost" DOUBLE PRECISION;
ALTER TABLE "HotelFolioCharge" ADD COLUMN IF NOT EXISTS "shopId" TEXT;

ALTER TABLE "HotelBooking" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
CREATE INDEX IF NOT EXISTS "HotelBooking_customerId_idx" ON "HotelBooking"("customerId");

ALTER TABLE "HotelRoom" ADD COLUMN IF NOT EXISTS "shopId" TEXT;
CREATE INDEX IF NOT EXISTS "HotelRoom_shopId_idx" ON "HotelRoom"("shopId");

CREATE TABLE IF NOT EXISTS "HotelNightAudit" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shopId" TEXT,
  "businessDate" DATE NOT NULL,
  "occupiedRooms" INTEGER NOT NULL DEFAULT 0,
  "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "roomRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "adr" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "occupancyPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "closedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HotelNightAudit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "HotelNightAudit_tenantId_shopId_businessDate_key" ON "HotelNightAudit"("tenantId", "shopId", "businessDate");

-- ─── Appliances ───────────────────────────────────────────────────────

ALTER TABLE "ApplianceSerialTracking" ADD COLUMN IF NOT EXISTS "shopId" TEXT;
CREATE INDEX IF NOT EXISTS "ApplianceSerialTracking_shopId_idx" ON "ApplianceSerialTracking"("shopId");

ALTER TABLE "ApplianceProductProfile" ADD COLUMN IF NOT EXISTS "shopWarrantyMonths" INTEGER;

DO $$ BEGIN
  CREATE TYPE "ApplianceTradeInStatus" AS ENUM ('HELD', 'SOLD', 'SCRAPPED', 'RETURNED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ApplianceTradeIn" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shopId" TEXT,
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "brand" TEXT,
  "model" TEXT,
  "condition" TEXT,
  "value" DOUBLE PRECISION NOT NULL,
  "status" "ApplianceTradeInStatus" NOT NULL DEFAULT 'HELD',
  "saleId" TEXT,
  "customerId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplianceTradeIn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ApplianceTradeIn_tenantId_code_key" ON "ApplianceTradeIn"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "ApplianceTradeIn_tenantId_idx" ON "ApplianceTradeIn"("tenantId");
CREATE INDEX IF NOT EXISTS "ApplianceTradeIn_saleId_idx" ON "ApplianceTradeIn"("saleId");
CREATE INDEX IF NOT EXISTS "ApplianceTradeIn_customerId_idx" ON "ApplianceTradeIn"("customerId");

ALTER TABLE "EmiPlan" ADD COLUMN IF NOT EXISTS "guarantorName" TEXT;
ALTER TABLE "EmiPlan" ADD COLUMN IF NOT EXISTS "guarantorPhone" TEXT;
ALTER TABLE "EmiPlan" ADD COLUMN IF NOT EXISTS "guarantorCnic" TEXT;
ALTER TABLE "EmiPlan" ADD COLUMN IF NOT EXISTS "guarantorAddress" TEXT;

-- ─── Dairy ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "DairyFarmerPayment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shopId" TEXT,
  "farmerId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "method" TEXT NOT NULL,
  "reference" TEXT,
  "note" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DairyFarmerPayment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DairyFarmerPayment_tenantId_idx" ON "DairyFarmerPayment"("tenantId");
CREATE INDEX IF NOT EXISTS "DairyFarmerPayment_farmerId_idx" ON "DairyFarmerPayment"("farmerId");

-- ─── Services business ────────────────────────────────────────────────

ALTER TABLE "ServiceJob" ADD COLUMN IF NOT EXISTS "returnedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "ServiceJobPart" ADD COLUMN IF NOT EXISTS "returnedQty" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ServiceJobPart" ADD COLUMN IF NOT EXISTS "returnedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
