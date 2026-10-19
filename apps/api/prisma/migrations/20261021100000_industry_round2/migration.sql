-- Industry round 2: bakery, salon, clinic, jewelry, autoparts.
--
-- 1. Bakery
--    - BakeryBulkOrder.shopId: the branch that took the order.
--    - BakeryProductionItem and BakeryFreshnessLog quantities change from
--      INTEGER to DECIMAL(12,3), so goods made by weight (12.5 kg) are not
--      rounded. Every existing whole number converts exactly.
-- 2. Salon
--    - SalonGiftVoucher: gift vouchers with a running balance.
--    - SalonService.productId: the product that carries the service on bills.
--    - SalonAppointment.source: booked, walk-in or counter.
--    - SalonAppointmentService.saleItemId, commissionPaidAt, payoutRef.
-- 3. Clinic
--    - ClinicPanel: a company that pays for its staff's visits, with
--      panelId on ClinicPatientProfile and ClinicAppointment.
--    - ClinicDentalRecord.isActive: dental records are hidden, not deleted.
--    - ClinicDoctorPayout: doctor share payments.
-- 4. Jewelry
--    - JewelryRepair: repairs with status, charge and advance.
--    - JewelryCustomOrder.goldAdvanceGrams, JewelryKarigar.paidLabour.
-- 5. Autoparts
--    - WorkshopJob.saleId: the bill raised at hand-over.
--    - CoreReturn: old parts taken back from the customer.
--
-- Additive only: new columns are nullable or have a default, new tables
-- start empty, and the bakery type change keeps every value. Safe to run
-- more than once.

-- ─── Bakery ───────────────────────────────────────────────────────────

ALTER TABLE "BakeryBulkOrder" ADD COLUMN IF NOT EXISTS "shopId" TEXT;
CREATE INDEX IF NOT EXISTS "BakeryBulkOrder_shopId_idx" ON "BakeryBulkOrder"("shopId");

DO $$ BEGIN
  ALTER TABLE "BakeryBulkOrder" ADD CONSTRAINT "BakeryBulkOrder_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "BakeryProductionItem"
  ALTER COLUMN "plannedQty" SET DATA TYPE DECIMAL(12,3) USING "plannedQty"::DECIMAL(12,3),
  ALTER COLUMN "producedQty" SET DATA TYPE DECIMAL(12,3) USING "producedQty"::DECIMAL(12,3),
  ALTER COLUMN "producedQty" SET DEFAULT 0,
  ALTER COLUMN "failedQty" SET DATA TYPE DECIMAL(12,3) USING "failedQty"::DECIMAL(12,3),
  ALTER COLUMN "failedQty" SET DEFAULT 0;

ALTER TABLE "BakeryFreshnessLog"
  ALTER COLUMN "initialQty" SET DATA TYPE DECIMAL(12,3) USING "initialQty"::DECIMAL(12,3),
  ALTER COLUMN "currentQty" SET DATA TYPE DECIMAL(12,3) USING "currentQty"::DECIMAL(12,3),
  ALTER COLUMN "soldQty" SET DATA TYPE DECIMAL(12,3) USING "soldQty"::DECIMAL(12,3),
  ALTER COLUMN "soldQty" SET DEFAULT 0,
  ALTER COLUMN "wastedQty" SET DATA TYPE DECIMAL(12,3) USING "wastedQty"::DECIMAL(12,3),
  ALTER COLUMN "wastedQty" SET DEFAULT 0,
  ALTER COLUMN "discountedQty" SET DATA TYPE DECIMAL(12,3) USING "discountedQty"::DECIMAL(12,3),
  ALTER COLUMN "discountedQty" SET DEFAULT 0;

-- ─── Salon ────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "SalonAppointmentSource" AS ENUM ('BOOKED', 'WALK_IN', 'COUNTER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SalonGiftVoucherStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SalonGiftVoucher" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shopId" TEXT,
  "code" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "balance" DOUBLE PRECISION NOT NULL,
  "customerId" TEXT,
  "saleId" TEXT,
  "expiryDate" TIMESTAMP(3),
  "status" "SalonGiftVoucherStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalonGiftVoucher_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SalonGiftVoucher_tenantId_code_key" ON "SalonGiftVoucher"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "SalonGiftVoucher_tenantId_idx" ON "SalonGiftVoucher"("tenantId");
CREATE INDEX IF NOT EXISTS "SalonGiftVoucher_customerId_idx" ON "SalonGiftVoucher"("customerId");

ALTER TABLE "SalonService" ADD COLUMN IF NOT EXISTS "productId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "SalonService_productId_key" ON "SalonService"("productId");

DO $$ BEGIN
  ALTER TABLE "SalonService" ADD CONSTRAINT "SalonService_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "SalonAppointment" ADD COLUMN IF NOT EXISTS "source" "SalonAppointmentSource" NOT NULL DEFAULT 'BOOKED';

ALTER TABLE "SalonAppointmentService" ADD COLUMN IF NOT EXISTS "commissionPaidAt" TIMESTAMP(3);
ALTER TABLE "SalonAppointmentService" ADD COLUMN IF NOT EXISTS "payoutRef" TEXT;
ALTER TABLE "SalonAppointmentService" ADD COLUMN IF NOT EXISTS "saleItemId" TEXT;

-- ─── Clinic ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ClinicPanel" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "customerId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicPanel_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ClinicPanel_tenantId_name_key" ON "ClinicPanel"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "ClinicPanel_tenantId_idx" ON "ClinicPanel"("tenantId");

ALTER TABLE "ClinicPatientProfile" ADD COLUMN IF NOT EXISTS "panelId" TEXT;
CREATE INDEX IF NOT EXISTS "ClinicPatientProfile_panelId_idx" ON "ClinicPatientProfile"("panelId");

DO $$ BEGIN
  ALTER TABLE "ClinicPatientProfile" ADD CONSTRAINT "ClinicPatientProfile_panelId_fkey"
    FOREIGN KEY ("panelId") REFERENCES "ClinicPanel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ClinicAppointment" ADD COLUMN IF NOT EXISTS "panelId" TEXT;
CREATE INDEX IF NOT EXISTS "ClinicAppointment_panelId_idx" ON "ClinicAppointment"("panelId");

DO $$ BEGIN
  ALTER TABLE "ClinicAppointment" ADD CONSTRAINT "ClinicAppointment_panelId_fkey"
    FOREIGN KEY ("panelId") REFERENCES "ClinicPanel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ClinicDentalRecord" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "ClinicDoctorPayout" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shopId" TEXT,
  "doctorId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "periodFrom" TIMESTAMP(3) NOT NULL,
  "periodTo" TIMESTAMP(3) NOT NULL,
  "expenseId" TEXT,
  "note" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicDoctorPayout_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ClinicDoctorPayout_tenantId_idx" ON "ClinicDoctorPayout"("tenantId");
CREATE INDEX IF NOT EXISTS "ClinicDoctorPayout_doctorId_idx" ON "ClinicDoctorPayout"("doctorId");

-- ─── Jewelry ──────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "JewelryRepairStatus" AS ENUM ('RECEIVED', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "JewelryRepair" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shopId" TEXT,
  "repairNumber" TEXT NOT NULL,
  "customerId" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "itemDescription" TEXT NOT NULL,
  "weightGrams" DOUBLE PRECISION,
  "karat" INTEGER,
  "status" "JewelryRepairStatus" NOT NULL DEFAULT 'RECEIVED',
  "promisedDate" TIMESTAMP(3),
  "charge" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "advance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "karigarId" TEXT,
  "saleId" TEXT,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JewelryRepair_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "JewelryRepair_tenantId_repairNumber_key" ON "JewelryRepair"("tenantId", "repairNumber");
CREATE INDEX IF NOT EXISTS "JewelryRepair_tenantId_idx" ON "JewelryRepair"("tenantId");
CREATE INDEX IF NOT EXISTS "JewelryRepair_tenantId_status_idx" ON "JewelryRepair"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "JewelryRepair_customerId_idx" ON "JewelryRepair"("customerId");

ALTER TABLE "JewelryCustomOrder" ADD COLUMN IF NOT EXISTS "goldAdvanceGrams" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "JewelryKarigar" ADD COLUMN IF NOT EXISTS "paidLabour" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- ─── Autoparts ────────────────────────────────────────────────────────

ALTER TABLE "WorkshopJob" ADD COLUMN IF NOT EXISTS "saleId" TEXT;
CREATE INDEX IF NOT EXISTS "WorkshopJob_saleId_idx" ON "WorkshopJob"("saleId");

DO $$ BEGIN
  CREATE TYPE "CoreReturnStatus" AS ENUM ('HELD', 'SENT_TO_SUPPLIER', 'SCRAPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CoreReturn" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shopId" TEXT,
  "saleId" TEXT,
  "jobId" TEXT,
  "productId" TEXT,
  "description" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "status" "CoreReturnStatus" NOT NULL DEFAULT 'HELD',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CoreReturn_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CoreReturn_tenantId_idx" ON "CoreReturn"("tenantId");
CREATE INDEX IF NOT EXISTS "CoreReturn_saleId_idx" ON "CoreReturn"("saleId");
