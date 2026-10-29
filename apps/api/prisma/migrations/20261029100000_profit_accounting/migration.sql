-- Profit accounting: profit on khata bills when the money comes in, other
-- income (company incentives, scheme claims, commission, rent, interest),
-- and stock gains next to stock losses.
--
-- Additive only. New tables start empty; new columns are nullable.
--   * SaleSettlement rows are filled by scripts/backfill-sale-settlements.ts
--     and kept up to date by the app. A bill without rows counts its whole
--     profit on the bill day, which is how every bill counted before.
--   * StockAdjustment.profitEffect is null on older rows; reports classify
--     those by type (ADJUSTMENT_IN = gain, DAMAGE / LOSS / ADJUSTMENT_OUT =
--     loss), exactly as before.
--   * The new permissions income.view, income.manage and
--     stock_adjustments.correct are role defaults for new users; existing
--     managers are granted them separately, with the owner's approval.

DO $$ BEGIN
  CREATE TYPE "StockProfitEffect" AS ENUM ('LOSS', 'GAIN', 'NONE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SettlementKind" AS ENUM ('UPFRONT', 'PAYMENT', 'WRITE_OFF');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "IncomeReceivedVia" AS ENUM ('CASH_DRAWER', 'ACCOUNT', 'SUPPLIER_KHATA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Stock adjustments: the reason picked from the fixed list and its profit effect.
ALTER TABLE "StockAdjustment" ADD COLUMN IF NOT EXISTS "reasonCode" TEXT;
ALTER TABLE "StockAdjustment" ADD COLUMN IF NOT EXISTS "profitEffect" "StockProfitEffect";

-- Settled parts of khata bills.
CREATE TABLE IF NOT EXISTS "SaleSettlement" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shopId" TEXT,
  "saleId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "customerLedgerId" TEXT,
  "kind" "SettlementKind" NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "profitRealised" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "settledAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SaleSettlement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SaleSettlement_tenantId_settledAt_idx" ON "SaleSettlement"("tenantId", "settledAt");
CREATE INDEX IF NOT EXISTS "SaleSettlement_saleId_idx" ON "SaleSettlement"("saleId");
CREATE INDEX IF NOT EXISTS "SaleSettlement_customerId_idx" ON "SaleSettlement"("customerId");
DO $$ BEGIN
  ALTER TABLE "SaleSettlement" ADD CONSTRAINT "SaleSettlement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SaleSettlement" ADD CONSTRAINT "SaleSettlement_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SaleSettlement" ADD CONSTRAINT "SaleSettlement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Which khata each customer's settlement rows were built from.
CREATE TABLE IF NOT EXISTS "SaleSettlementSync" (
  "customerId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "builtAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SaleSettlementSync_pkey" PRIMARY KEY ("customerId")
);
CREATE INDEX IF NOT EXISTS "SaleSettlementSync_tenantId_idx" ON "SaleSettlementSync"("tenantId");
DO $$ BEGIN
  ALTER TABLE "SaleSettlementSync" ADD CONSTRAINT "SaleSettlementSync_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Other income and the shop's own income categories.
CREATE TABLE IF NOT EXISTS "OtherIncomeCategory" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#10b981',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OtherIncomeCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OtherIncomeCategory_tenantId_name_key" ON "OtherIncomeCategory"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "OtherIncomeCategory_tenantId_idx" ON "OtherIncomeCategory"("tenantId");
DO $$ BEGIN
  ALTER TABLE "OtherIncomeCategory" ADD CONSTRAINT "OtherIncomeCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "OtherIncome" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shopId" TEXT,
  "incomeNumber" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'OTHER',
  "categoryId" TEXT,
  "title" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "incomeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "supplierId" TEXT,
  "receivedVia" "IncomeReceivedVia" NOT NULL DEFAULT 'CASH_DRAWER',
  "moneyAccountId" TEXT,
  "moneyEntryId" TEXT,
  "supplierLedgerId" TEXT,
  "note" TEXT,
  "repeatMonthly" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OtherIncome_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OtherIncome_tenantId_incomeNumber_key" ON "OtherIncome"("tenantId", "incomeNumber");
CREATE INDEX IF NOT EXISTS "OtherIncome_tenantId_incomeDate_idx" ON "OtherIncome"("tenantId", "incomeDate");
CREATE INDEX IF NOT EXISTS "OtherIncome_tenantId_shopId_idx" ON "OtherIncome"("tenantId", "shopId");
CREATE INDEX IF NOT EXISTS "OtherIncome_supplierId_idx" ON "OtherIncome"("supplierId");
DO $$ BEGIN
  ALTER TABLE "OtherIncome" ADD CONSTRAINT "OtherIncome_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "OtherIncome" ADD CONSTRAINT "OtherIncome_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "OtherIncome" ADD CONSTRAINT "OtherIncome_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "OtherIncomeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "OtherIncome" ADD CONSTRAINT "OtherIncome_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "OtherIncome" ADD CONSTRAINT "OtherIncome_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
