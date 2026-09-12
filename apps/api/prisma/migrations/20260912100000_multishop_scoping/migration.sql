-- ═══════════════════════════════════════════════════════════════
-- MULTI-SHOP SCOPING
-- 1. Add shopId to the core transactional tables
-- 2. Backfill existing rows to each tenant's main shop
-- 3. Reconcile ShopStock against Product.stock (single source of truth)
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. COLUMNS ────────────────────────────────────────────────
ALTER TABLE "Purchase"        ADD COLUMN IF NOT EXISTS "shopId" TEXT;
ALTER TABLE "Expense"         ADD COLUMN IF NOT EXISTS "shopId" TEXT;
ALTER TABLE "CustomerLedger"  ADD COLUMN IF NOT EXISTS "shopId" TEXT;
ALTER TABLE "StockMovement"   ADD COLUMN IF NOT EXISTS "shopId" TEXT;
ALTER TABLE "StockAdjustment" ADD COLUMN IF NOT EXISTS "shopId" TEXT;
ALTER TABLE "SaleReturn"      ADD COLUMN IF NOT EXISTS "shopId" TEXT;

-- ─── 2. BACKFILL → tenant's main shop (fallback: oldest SHOP) ──
-- Resolve one "home" shop per tenant: isMain first, then type=SHOP, then anything.
CREATE TEMP TABLE _tenant_home_shop AS
SELECT DISTINCT ON ("tenantId") "tenantId", "id" AS "shopId"
FROM "Shop"
WHERE "isActive" = true
ORDER BY "tenantId",
         "isMain" DESC,
         (CASE WHEN "type" = 'SHOP' THEN 0 ELSE 1 END),
         "createdAt" ASC;

UPDATE "Purchase" t SET "shopId" = h."shopId"
  FROM _tenant_home_shop h WHERE h."tenantId" = t."tenantId" AND t."shopId" IS NULL;

UPDATE "Expense" t SET "shopId" = h."shopId"
  FROM _tenant_home_shop h WHERE h."tenantId" = t."tenantId" AND t."shopId" IS NULL;

UPDATE "StockMovement" t SET "shopId" = h."shopId"
  FROM _tenant_home_shop h WHERE h."tenantId" = t."tenantId" AND t."shopId" IS NULL;

UPDATE "StockAdjustment" t SET "shopId" = h."shopId"
  FROM _tenant_home_shop h WHERE h."tenantId" = t."tenantId" AND t."shopId" IS NULL;

-- SaleReturn inherits the shop of its parent sale where known, else home shop.
UPDATE "SaleReturn" r SET "shopId" = s."shopId"
  FROM "Sale" s WHERE s."id" = r."saleId" AND s."shopId" IS NOT NULL AND r."shopId" IS NULL;
UPDATE "SaleReturn" t SET "shopId" = h."shopId"
  FROM _tenant_home_shop h WHERE h."tenantId" = t."tenantId" AND t."shopId" IS NULL;

-- CustomerLedger: a SALE-referenced entry belongs to that sale's shop; rest → home shop.
UPDATE "CustomerLedger" l SET "shopId" = s."shopId"
  FROM "Sale" s
  WHERE s."saleNumber" = l."reference"
    AND s."tenantId" = l."tenantId"
    AND s."shopId" IS NOT NULL
    AND l."shopId" IS NULL;
UPDATE "CustomerLedger" t SET "shopId" = h."shopId"
  FROM _tenant_home_shop h WHERE h."tenantId" = t."tenantId" AND t."shopId" IS NULL;

-- Sales that were never tagged (pre-multishop) also go to the home shop.
UPDATE "Sale" t SET "shopId" = h."shopId"
  FROM _tenant_home_shop h WHERE h."tenantId" = t."tenantId" AND t."shopId" IS NULL;

-- ─── 3. STOCK RECONCILE ────────────────────────────────────────
-- Product.stock has been the de-facto global total (purchases wrote here only),
-- while ShopStock was written by sales/transfers. Anything present globally but
-- not accounted for in any ShopStock row is untracked → park it in the home shop.
--
-- Every product with a gap gets it parked, variant products included.
--
-- It is tempting to skip variant products (their branch rows are per-variant, so
-- the parked units land on a variantId-NULL row that POS will not offer under a
-- specific variant). But skipping leaves Product.stock ABOVE the sum of its
-- branch rows, and the first applyStockDelta() on that product would then
-- silently recache it downwards — the shopkeeper would watch stock drop on its
-- own, days later, with no explanation. Parking keeps the count intact and makes
-- the fix an explicit stock adjustment the shopkeeper chooses to make.
--
-- The rule this upholds: the migration never reduces anybody's stock.
CREATE TEMP TABLE _stock_gap AS
SELECT p."id"            AS "productId",
       p."tenantId"      AS "tenantId",
       h."shopId"        AS "shopId",
       p."stock"         AS "globalStock",
       COALESCE(ss."sum", 0) AS "shopSum"
FROM "Product" p
JOIN _tenant_home_shop h ON h."tenantId" = p."tenantId"
LEFT JOIN (
  SELECT "productId", SUM("stock") AS "sum"
  FROM "ShopStock"
  GROUP BY "productId"
) ss ON ss."productId" = p."id"
WHERE p."stock" > COALESCE(ss."sum", 0);

-- 3a. top up existing home-shop rows
UPDATE "ShopStock" s
SET "stock" = s."stock" + (g."globalStock" - g."shopSum")
FROM _stock_gap g
WHERE s."productId" = g."productId"
  AND s."shopId"    = g."shopId"
  AND s."variantId" IS NULL;

-- 3b. create home-shop rows that don't exist yet
INSERT INTO "ShopStock" ("id", "tenantId", "shopId", "productId", "variantId", "stock", "lowStockAlert", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), g."tenantId", g."shopId", g."productId", NULL,
       (g."globalStock" - g."shopSum"), 5, true, NOW(), NOW()
FROM _stock_gap g
WHERE NOT EXISTS (
  SELECT 1 FROM "ShopStock" s
  WHERE s."productId" = g."productId" AND s."shopId" = g."shopId" AND s."variantId" IS NULL
);

-- 3c. Product.stock now mirrors SUM(ShopStock) across every branch and variant,
--     exactly as recacheProductStock() does at runtime.
UPDATE "Product" p
SET "stock" = ss."sum"
FROM (
  SELECT "productId", SUM("stock") AS "sum"
  FROM "ShopStock"
  GROUP BY "productId"
) ss
WHERE ss."productId" = p."id";

-- 3d. same treatment for variants
UPDATE "ProductVariant" v
SET "stock" = ss."sum"
FROM (
  SELECT "variantId", SUM("stock") AS "sum"
  FROM "ShopStock"
  WHERE "variantId" IS NOT NULL
  GROUP BY "variantId"
) ss
WHERE ss."variantId" = v."id";

DROP TABLE _stock_gap;
DROP TABLE _tenant_home_shop;

-- ─── 4. INDEXES + FOREIGN KEYS ─────────────────────────────────
CREATE INDEX IF NOT EXISTS "Purchase_shopId_idx"                  ON "Purchase"("shopId");
CREATE INDEX IF NOT EXISTS "Purchase_tenantId_shopId_idx"         ON "Purchase"("tenantId", "shopId");
CREATE INDEX IF NOT EXISTS "Expense_shopId_idx"                   ON "Expense"("shopId");
CREATE INDEX IF NOT EXISTS "Expense_tenantId_shopId_idx"          ON "Expense"("tenantId", "shopId");
CREATE INDEX IF NOT EXISTS "CustomerLedger_shopId_idx"            ON "CustomerLedger"("shopId");
CREATE INDEX IF NOT EXISTS "CustomerLedger_tenantId_shopId_idx"   ON "CustomerLedger"("tenantId", "shopId");
CREATE INDEX IF NOT EXISTS "StockMovement_shopId_idx"             ON "StockMovement"("shopId");
CREATE INDEX IF NOT EXISTS "StockMovement_tenantId_shopId_idx"    ON "StockMovement"("tenantId", "shopId");
CREATE INDEX IF NOT EXISTS "StockAdjustment_shopId_idx"           ON "StockAdjustment"("shopId");
CREATE INDEX IF NOT EXISTS "StockAdjustment_tenantId_shopId_idx"  ON "StockAdjustment"("tenantId", "shopId");
CREATE INDEX IF NOT EXISTS "SaleReturn_shopId_idx"                ON "SaleReturn"("shopId");
CREATE INDEX IF NOT EXISTS "SaleReturn_tenantId_shopId_idx"       ON "SaleReturn"("tenantId", "shopId");

DO $$ BEGIN
  ALTER TABLE "Purchase"        ADD CONSTRAINT "Purchase_shopId_fkey"        FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Expense"         ADD CONSTRAINT "Expense_shopId_fkey"         FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CustomerLedger"  ADD CONSTRAINT "CustomerLedger_shopId_fkey"  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "StockMovement"   ADD CONSTRAINT "StockMovement_shopId_fkey"   FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SaleReturn"      ADD CONSTRAINT "SaleReturn_shopId_fkey"      FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
