-- Landed cost on purchases: freight, customs/duty, clearing agent, local
-- transport and other costs paid to people other than the supplier. They are
-- spread over the bill's lines (by value, quantity or weight) and become part
-- of the stock cost of those items, so they reach the P&L through the cost of
-- goods sold, never as an expense.
--
-- Additive only. Existing purchases get zero landed cost and no rows, so their
-- stock cost and supplier khata are unchanged. Safe to run more than once.
--
--   Purchase.landedCost            total of the purchase's landed cost rows (Rs)
--   Purchase.landedCostMethod      VALUE, QTY or WEIGHT; null = none added yet
--   PurchaseItem.landedCost        the line's share of that total (Rs)
--   PurchaseItem.weightKg          the line's total weight, for the WEIGHT method
--   PurchaseLandedCost             one row per cost, with the foreign amount and
--                                  exchange rate when it was paid in a foreign
--                                  currency; afterReceipt marks costs added
--                                  once goods were already in stock

ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "landedCost" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "landedCostMethod" TEXT;
ALTER TABLE "PurchaseItem" ADD COLUMN IF NOT EXISTS "landedCost" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "PurchaseItem" ADD COLUMN IF NOT EXISTS "weightKg" DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS "PurchaseLandedCost" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "purchaseId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "label" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT,
  "foreignAmount" DOUBLE PRECISION,
  "exchangeRate" DOUBLE PRECISION,
  "paidTo" TEXT,
  "method" TEXT NOT NULL DEFAULT 'VALUE',
  "afterReceipt" BOOLEAN NOT NULL DEFAULT false,
  "soldShare" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseLandedCost_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PurchaseLandedCost_purchaseId_idx" ON "PurchaseLandedCost"("purchaseId");
CREATE INDEX IF NOT EXISTS "PurchaseLandedCost_tenantId_createdAt_idx" ON "PurchaseLandedCost"("tenantId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "PurchaseLandedCost" ADD CONSTRAINT "PurchaseLandedCost_purchaseId_fkey"
    FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
