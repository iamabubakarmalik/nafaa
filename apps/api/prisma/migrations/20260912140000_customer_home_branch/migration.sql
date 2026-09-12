-- ═══════════════════════════════════════════════════════════════
-- CUSTOMER HOME BRANCH
-- ═══════════════════════════════════════════════════════════════
-- One customer record stays shared across the whole tenant — the same person
-- walking into any branch is the same person, with one balance, one loyalty
-- pot and one credit limit. What each branch wants is its OWN LIST, not its own
-- copy of the person.
--
-- `Customer.shopId` is that: the branch the customer belongs to. A branch's
-- list is "customers registered here, plus anyone who has actually transacted
-- here", so a freshly added customer shows up immediately and a walk-in from
-- another branch appears the moment they buy something.

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "shopId" TEXT;

-- ─── Backfill ──────────────────────────────────────────────────
-- 1. Where the customer has bought something, their earliest sale's branch is
--    the truest answer to "whose customer is this".
UPDATE "Customer" c
SET "shopId" = first_sale."shopId"
FROM (
  SELECT DISTINCT ON ("customerId") "customerId", "shopId"
  FROM "Sale"
  WHERE "customerId" IS NOT NULL AND "shopId" IS NOT NULL
  ORDER BY "customerId", "soldAt" ASC
) first_sale
WHERE first_sale."customerId" = c."id" AND c."shopId" IS NULL;

-- 2. No sales but khata activity — use the branch that opened the khata.
UPDATE "Customer" c
SET "shopId" = first_ledger."shopId"
FROM (
  SELECT DISTINCT ON ("customerId") "customerId", "shopId"
  FROM "CustomerLedger"
  WHERE "shopId" IS NOT NULL
  ORDER BY "customerId", "createdAt" ASC
) first_ledger
WHERE first_ledger."customerId" = c."id" AND c."shopId" IS NULL;

-- 3. Everyone else goes to the tenant's main shop — that is where they were
--    added back when there was only one.
UPDATE "Customer" c
SET "shopId" = home."shopId"
FROM (
  SELECT DISTINCT ON ("tenantId") "tenantId", "id" AS "shopId"
  FROM "Shop"
  WHERE "isActive" = true
  ORDER BY "tenantId",
           "isMain" DESC,
           (CASE WHEN "type" = 'SHOP' THEN 0 ELSE 1 END),
           "createdAt" ASC
) home
WHERE home."tenantId" = c."tenantId" AND c."shopId" IS NULL;

-- ─── Indexes + FK ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "Customer_shopId_idx"          ON "Customer"("shopId");
CREATE INDEX IF NOT EXISTS "Customer_tenantId_shopId_idx" ON "Customer"("tenantId", "shopId");

DO $$ BEGIN
  ALTER TABLE "Customer" ADD CONSTRAINT "Customer_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
