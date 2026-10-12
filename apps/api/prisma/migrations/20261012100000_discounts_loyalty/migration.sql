-- Discounts and loyalty, safe for existing shops: every column is new and
-- either nullable or has a default that keeps today's behaviour.
--
--  DiscountCode.perCustomerLimit / shopIds  — per-customer use limit and
--      branch scope; NULL / empty = no limit, every branch (as today).
--  Sale.codeDiscount / loyaltyDiscount      — rupees from the code and from
--      points, kept apart for reports; 0 for old sales.
--  LoyaltyTransaction.shopId / saleId       — branch and bill of an entry,
--      used to reverse points when a bill is voided; NULL for old entries.
--  TenantSettings loyalty limits            — defaults mean "no limit".

ALTER TABLE "DiscountCode" ADD COLUMN "perCustomerLimit" INTEGER;
ALTER TABLE "DiscountCode" ADD COLUMN "shopIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Sale" ADD COLUMN "codeDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Sale" ADD COLUMN "loyaltyDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "LoyaltyTransaction" ADD COLUMN "shopId" TEXT;
ALTER TABLE "LoyaltyTransaction" ADD COLUMN "saleId" TEXT;
CREATE INDEX "LoyaltyTransaction_tenantId_createdAt_idx" ON "LoyaltyTransaction"("tenantId", "createdAt");
CREATE INDEX "LoyaltyTransaction_saleId_idx" ON "LoyaltyTransaction"("saleId");

ALTER TABLE "TenantSettings" ADD COLUMN "loyaltyMinRedeem" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TenantSettings" ADD COLUMN "loyaltyMaxRedeemPercent" DOUBLE PRECISION NOT NULL DEFAULT 100;
ALTER TABLE "TenantSettings" ADD COLUMN "loyaltyExpiryDays" INTEGER NOT NULL DEFAULT 0;
