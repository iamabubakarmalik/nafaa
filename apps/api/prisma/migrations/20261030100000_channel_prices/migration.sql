-- Online products: a per-link channel price and the last stock/price sync error.
--
-- Additive only. Both columns are nullable and start empty:
--   * priceOverride: a manual price for this product/size on this channel.
--     Null means the channel price rule (Integration.config.priceRule) applies,
--     and with no rule the Nafaa price, which is how prices were pushed before.
--   * syncError: the last push error for this link; null when the last push
--     worked or nothing was pushed yet.
-- The new permissions online_products.view and online_products.manage are
-- manager defaults for new users; existing managers are granted them
-- separately, with the owner's approval.

ALTER TABLE "product_channel_mappings" ADD COLUMN IF NOT EXISTS "priceOverride" DOUBLE PRECISION;
ALTER TABLE "product_channel_mappings" ADD COLUMN IF NOT EXISTS "syncError" TEXT;
