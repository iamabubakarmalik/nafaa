-- Indexes for the phone's delta download (GET /sync/pull): rows of one business
-- (or one branch's stock) in updatedAt order, read page by page.
--
-- Additive only: three indexes, no data changes. Building them takes a short
-- write lock on Product, Customer and ShopStock (seconds at current sizes).
-- Safe to run more than once.

CREATE INDEX IF NOT EXISTS "Product_tenantId_updatedAt_id_idx" ON "Product"("tenantId", "updatedAt", "id");
CREATE INDEX IF NOT EXISTS "Customer_tenantId_updatedAt_id_idx" ON "Customer"("tenantId", "updatedAt", "id");
CREATE INDEX IF NOT EXISTS "ShopStock_shopId_updatedAt_idx" ON "ShopStock"("shopId", "updatedAt");
