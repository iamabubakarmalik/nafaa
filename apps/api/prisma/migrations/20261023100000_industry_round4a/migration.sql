-- Industry round 4a: sports, shoes, bookstore.
--
-- 1. Sports
--    - SportsTeamOrder.shopId: branch that took the order.
--    - SportsTeamOrder.customerId: the khata the order is billed to.
--    - SportsRepairService.shopId: branch that took the repair.
-- 2. Shoes
--    - ShoeTryOnRequest.shopId: branch of each try-on request.
-- 3. Bookstore
--    - Publisher.supplierId: supplier record used for purchases.
--
-- Additive only: every new column is nullable, with no foreign keys.
-- Safe to run more than once.

-- ─── Sports ───────────────────────────────────────────────────────────

ALTER TABLE "SportsTeamOrder" ADD COLUMN IF NOT EXISTS "shopId" TEXT;
ALTER TABLE "SportsTeamOrder" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
CREATE INDEX IF NOT EXISTS "SportsTeamOrder_shopId_idx" ON "SportsTeamOrder"("shopId");
CREATE INDEX IF NOT EXISTS "SportsTeamOrder_customerId_idx" ON "SportsTeamOrder"("customerId");

ALTER TABLE "SportsRepairService" ADD COLUMN IF NOT EXISTS "shopId" TEXT;
CREATE INDEX IF NOT EXISTS "SportsRepairService_shopId_idx" ON "SportsRepairService"("shopId");

-- ─── Shoes ────────────────────────────────────────────────────────────

ALTER TABLE "ShoeTryOnRequest" ADD COLUMN IF NOT EXISTS "shopId" TEXT;
CREATE INDEX IF NOT EXISTS "ShoeTryOnRequest_shopId_idx" ON "ShoeTryOnRequest"("shopId");

-- ─── Bookstore ────────────────────────────────────────────────────────

ALTER TABLE "Publisher" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;
CREATE INDEX IF NOT EXISTS "Publisher_supplierId_idx" ON "Publisher"("supplierId");
