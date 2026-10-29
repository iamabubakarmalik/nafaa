-- Ads spend log ("Ads ka kharcha") for ROAS and profit after ads.
--
-- Additive only: one new table, nothing existing changes. Safe to run more
-- than once.
--
-- Each row is one day's spend on one platform (META, TIKTOK, GOOGLE, OTHER),
-- typed in or imported from an ads manager CSV. `day` is the shop's business
-- day (YYYY-MM-DD). `importKey` stops the same CSV row being imported twice.
-- When `postExpense` is true the row is carried into the P&L by one PAID
-- expense per day, platform and branch (Expense.sourceType 'AD_SPEND'); the
-- row keeps that expense's id in `expenseId`.

CREATE TABLE IF NOT EXISTS "AdSpend" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shopId" TEXT,
  "day" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "campaign" TEXT,
  "integrationId" TEXT,
  "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "orders" INTEGER,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "importKey" TEXT,
  "postExpense" BOOLEAN NOT NULL DEFAULT true,
  "expenseId" TEXT,
  "note" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdSpend_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AdSpend_tenantId_day_idx" ON "AdSpend"("tenantId", "day");
CREATE INDEX IF NOT EXISTS "AdSpend_tenantId_platform_day_idx" ON "AdSpend"("tenantId", "platform", "day");
CREATE UNIQUE INDEX IF NOT EXISTS "AdSpend_tenantId_importKey_key" ON "AdSpend"("tenantId", "importKey");

DO $$ BEGIN
  ALTER TABLE "AdSpend" ADD CONSTRAINT "AdSpend_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
