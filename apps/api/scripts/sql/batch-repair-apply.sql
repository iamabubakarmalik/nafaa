-- PROPOSAL, needs owner approval. Run after migration 20261019100000_batch_tracking.
-- Caps each branch item's batches at its branch stock: the excess is taken
-- off the earliest-expiring batches first (what FEFO sales would have done).
-- Batches that already fit, unreachable no-variant batches on variant
-- products, and batches with no branch are not touched.
BEGIN;

CREATE TABLE IF NOT EXISTS "ProductBatch_backup_20261019" AS SELECT * FROM "ProductBatch";

WITH s AS (
  SELECT "shopId", "productId", "variantId", GREATEST(SUM(stock), 0) AS stock
    FROM "ShopStock" GROUP BY 1, 2, 3
), g AS (
  SELECT b.id, b.quantity,
         SUM(b.quantity) OVER w_all - COALESCE(s.stock, 0) AS excess,
         COALESCE(SUM(b.quantity) OVER w_before, 0) AS taken_before
    FROM "ProductBatch" b
    JOIN "Product" p ON p.id = b."productId"
    LEFT JOIN s ON s."shopId" = b."shopId" AND s."productId" = b."productId" AND s."variantId" IS NOT DISTINCT FROM b."variantId"
   WHERE b."isActive" AND b.quantity > 0 AND b."shopId" IS NOT NULL
     AND NOT (b."variantId" IS NULL AND p."hasVariants")
  WINDOW w_all AS (PARTITION BY b."shopId", b."productId", b."variantId"),
         w_before AS (PARTITION BY b."shopId", b."productId", b."variantId"
                      ORDER BY b."expiryDate" ASC NULLS LAST, b."createdAt" ASC, b.id
                      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING)
)
UPDATE "ProductBatch" pb
   SET quantity = round((g.quantity - LEAST(g.quantity, g.excess - g.taken_before))::numeric, 4)::float8,
       "updatedAt" = now()
  FROM g
 WHERE pb.id = g.id
   AND g.excess > 0.0001
   AND g.excess - g.taken_before > 0.0001;

-- Check: should return no rows with excess > 0 (re-run repair-report.sql), then COMMIT; otherwise ROLLBACK.
-- COMMIT;
