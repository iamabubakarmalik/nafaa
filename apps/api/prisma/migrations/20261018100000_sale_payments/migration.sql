-- Split tender, khata payment method and trade-in.
--
-- 1. PaymentMethod gets TRADE_IN: goods taken toward a bill (old gold, a used
--    phone). It is paid on the bill but never drawer cash or bank money.
-- 2. CustomerLedger.paymentMethod: how a khata collection was paid. Old rows
--    stay null and keep counting as cash, exactly as before.
-- 3. SalePayment: one row per method used on a bill. Every existing live bill
--    gets one row of paidAmount − changeAmount with its own method, so every
--    report that now reads the rows shows the same figures as before.
--
-- Additive only. TRADE_IN is not used in this file, so ADD VALUE is safe
-- inside the migration transaction. Safe to run more than once.

ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'TRADE_IN';

ALTER TABLE "CustomerLedger" ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod";

CREATE TABLE IF NOT EXISTS "SalePayment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "shopId" TEXT,
  "method" "PaymentMethod" NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "reference" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalePayment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SalePayment_saleId_idx" ON "SalePayment"("saleId");
CREATE INDEX IF NOT EXISTS "SalePayment_tenantId_method_idx" ON "SalePayment"("tenantId", "method");

DO $$ BEGIN
  ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_saleId_fkey"
    FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- One row per live bill that took money: paidAmount − changeAmount, by the
-- bill's own method, dated when the bill was made. Bills with nothing paid
-- (full udhaar) get no row. Bills that already have rows are skipped, so a
-- second run adds nothing.
INSERT INTO "SalePayment" ("id", "tenantId", "saleId", "shopId", "method", "amount", "createdAt")
SELECT gen_random_uuid()::text, s."tenantId", s."id", s."shopId", s."paymentMethod",
       s."paidAmount" - s."changeAmount", s."soldAt"
FROM "Sale" s
WHERE s."status" <> 'VOIDED'
  AND s."paidAmount" - s."changeAmount" > 0
  AND NOT EXISTS (SELECT 1 FROM "SalePayment" p WHERE p."saleId" = s."id");
