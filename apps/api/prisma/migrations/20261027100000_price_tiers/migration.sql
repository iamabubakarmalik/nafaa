-- Price tiers: a retail, wholesale and credit (udhaar) price per product,
-- chosen at the counter and stored on each sale line.
-- Additive only: nullable columns, no backfill of sale data. A null tier on a
-- sale line means retail; older lines carry no wholesale marker, so they stay
-- null and reports count them as retail.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "creditPrice" DOUBLE PRECISION;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "creditPrice" DOUBLE PRECISION;
ALTER TABLE "ProductUnit" ADD COLUMN IF NOT EXISTS "creditPrice" DOUBLE PRECISION;
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "priceTier" TEXT;
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "retailPrice" DOUBLE PRECISION;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "priceTier" TEXT;

-- The new permission `pos.price_tier` is a manager default for new users;
-- existing managers are granted it separately, with the owner's approval.
