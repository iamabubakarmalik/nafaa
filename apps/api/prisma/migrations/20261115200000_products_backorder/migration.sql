-- Sell when out of stock (backorder) per product, size and channel link.
-- Additive only: every column is nullable, so existing products keep their
-- current behaviour and Nafaa leaves each channel's own setting alone until
-- the owner switches backorder on or off.

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "backorder" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "backorderMax" INTEGER,
  ADD COLUMN IF NOT EXISTS "backorderLeadDays" INTEGER,
  ADD COLUMN IF NOT EXISTS "backorderNote" TEXT;

ALTER TABLE "ProductVariant"
  ADD COLUMN IF NOT EXISTS "backorder" BOOLEAN;

ALTER TABLE "product_channel_mappings"
  ADD COLUMN IF NOT EXISTS "backorder" BOOLEAN;
