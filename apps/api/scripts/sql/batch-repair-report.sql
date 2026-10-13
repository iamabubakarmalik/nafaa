-- READ-ONLY. Run after migration 20261019100000_batch_tracking.
-- One row per branch item whose batches add up to more (or less) than its branch stock.
-- excess > 0: batches show more than the shelf (to repair). excess < 0: stock with no batch (normal for old stock).
WITH b AS (
  SELECT "tenantId", "shopId", "productId", "variantId",
         SUM(quantity) AS batch_qty, COUNT(*) AS batches
    FROM "ProductBatch"
   WHERE "isActive" AND quantity > 0
   GROUP BY 1, 2, 3, 4
), s AS (
  SELECT "shopId", "productId", "variantId", SUM(stock) AS stock
    FROM "ShopStock" GROUP BY 1, 2, 3
)
SELECT t.name AS business, sh.name AS branch, p.name AS product, v.name AS variant,
       p."hasVariants" AS has_variants, b.batches, round(b.batch_qty::numeric, 4) AS batch_qty,
       round(COALESCE(s.stock, 0)::numeric, 4) AS branch_stock,
       round((b.batch_qty - GREATEST(COALESCE(s.stock, 0), 0))::numeric, 4) AS excess
  FROM b
  JOIN "Tenant" t ON t.id = b."tenantId"
  JOIN "Product" p ON p.id = b."productId"
  LEFT JOIN "ProductVariant" v ON v.id = b."variantId"
  LEFT JOIN "Shop" sh ON sh.id = b."shopId"
  LEFT JOIN s ON s."shopId" = b."shopId" AND s."productId" = b."productId" AND s."variantId" IS NOT DISTINCT FROM b."variantId"
 WHERE abs(b.batch_qty - GREATEST(COALESCE(s.stock, 0), 0)) > 0.0001
 ORDER BY t.name, sh.name, p.name;

-- Batches that sales can never reach: no-variant batches on a product sold by variant,
-- and batches with no branch (tenant had no shop at migration time). Left out of the repair.
SELECT t.name, p.name, b."batchNumber", b.quantity, b."shopId" IS NULL AS no_branch
  FROM "ProductBatch" b JOIN "Product" p ON p.id = b."productId" JOIN "Tenant" t ON t.id = b."tenantId"
 WHERE b."isActive" AND b.quantity > 0
   AND (b."shopId" IS NULL OR (b."variantId" IS NULL AND p."hasVariants"));
