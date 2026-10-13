-- Batches follow real stock.
--
-- 1. ProductBatch.shopId: the branch whose shelf holds the batch. Existing
--    batches go to the branch holding the most stock of that item (the
--    variant's row first, then any row of the product), else the tenant's
--    main shop. Quantities are not changed here; the repair of old batch
--    totals is a separate, owner-approved step.
-- 2. SaleItemBatch: how much of a sale line came out of each batch, so a
--    return or void puts it back into the same batch.
-- 3. StockTransferItemBatch: batches a transfer took from the sending
--    branch, with the batch details, so the receiving branch gets the same
--    batch (and a cancel puts it back).
--
-- Additive only. Safe to run more than once.

ALTER TABLE "ProductBatch" ADD COLUMN IF NOT EXISTS "shopId" TEXT;

UPDATE "ProductBatch" b
SET "shopId" = pick."shopId"
FROM (
  SELECT b2."id",
         COALESCE(
           (SELECT ss."shopId"
              FROM "ShopStock" ss JOIN "Shop" sh ON sh."id" = ss."shopId"
             WHERE ss."productId" = b2."productId"
               AND ss."variantId" IS NOT DISTINCT FROM b2."variantId"
               AND sh."tenantId" = b2."tenantId"
             ORDER BY ss."stock" DESC, sh."isMain" DESC, sh."createdAt" ASC
             LIMIT 1),
           (SELECT ss."shopId"
              FROM "ShopStock" ss JOIN "Shop" sh ON sh."id" = ss."shopId"
             WHERE ss."productId" = b2."productId"
               AND sh."tenantId" = b2."tenantId"
             ORDER BY ss."stock" DESC, sh."isMain" DESC, sh."createdAt" ASC
             LIMIT 1),
           (SELECT sh."id"
              FROM "Shop" sh
             WHERE sh."tenantId" = b2."tenantId"
             ORDER BY sh."isActive" DESC, sh."isMain" DESC, sh."createdAt" ASC
             LIMIT 1)
         ) AS "shopId"
    FROM "ProductBatch" b2
   WHERE b2."shopId" IS NULL
) pick
WHERE b."id" = pick."id"
  AND pick."shopId" IS NOT NULL;

DO $$ BEGIN
  ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "ProductBatch_shopId_productId_variantId_idx" ON "ProductBatch"("shopId", "productId", "variantId");
CREATE INDEX IF NOT EXISTS "ProductBatch_tenantId_shopId_expiryDate_idx" ON "ProductBatch"("tenantId", "shopId", "expiryDate");

CREATE TABLE IF NOT EXISTS "SaleItemBatch" (
  "id" TEXT NOT NULL,
  "saleItemId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "returnedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SaleItemBatch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SaleItemBatch_saleItemId_idx" ON "SaleItemBatch"("saleItemId");
CREATE INDEX IF NOT EXISTS "SaleItemBatch_batchId_idx" ON "SaleItemBatch"("batchId");

DO $$ BEGIN
  ALTER TABLE "SaleItemBatch" ADD CONSTRAINT "SaleItemBatch_saleItemId_fkey"
    FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SaleItemBatch" ADD CONSTRAINT "SaleItemBatch_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "ProductBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "StockTransferItemBatch" (
  "id" TEXT NOT NULL,
  "transferItemId" TEXT NOT NULL,
  "batchId" TEXT,
  "batchNumber" TEXT NOT NULL,
  "expiryDate" TIMESTAMP(3),
  "manufactureDate" TIMESTAMP(3),
  "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quantity" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockTransferItemBatch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "StockTransferItemBatch_transferItemId_idx" ON "StockTransferItemBatch"("transferItemId");
CREATE INDEX IF NOT EXISTS "StockTransferItemBatch_batchId_idx" ON "StockTransferItemBatch"("batchId");

DO $$ BEGIN
  ALTER TABLE "StockTransferItemBatch" ADD CONSTRAINT "StockTransferItemBatch_transferItemId_fkey"
    FOREIGN KEY ("transferItemId") REFERENCES "StockTransferItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "StockTransferItemBatch" ADD CONSTRAINT "StockTransferItemBatch_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "ProductBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
