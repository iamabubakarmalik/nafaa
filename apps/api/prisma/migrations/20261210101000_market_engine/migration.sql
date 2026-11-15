-- Nafaa Market engine. Additive only: new nullable columns, no existing row
-- changes. A shop with no "gate" falls back to its POS industry at runtime.

-- Which Market section the shop appears in (FOOD, GROCERY, PHARMACY,
-- SHOPPING, BOOKING, WHOLESALE), the shop's per-flow switches, and the
-- NAFAA_MARKET sales channel its orders use.
ALTER TABLE "shop_marketplace_profiles" ADD COLUMN IF NOT EXISTS "gate" TEXT;
ALTER TABLE "shop_marketplace_profiles" ADD COLUMN IF NOT EXISTS "flowSettings" JSONB;
ALTER TABLE "shop_marketplace_profiles" ADD COLUMN IF NOT EXISTS "integrationId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "shop_marketplace_profiles_integrationId_key" ON "shop_marketplace_profiles"("integrationId");
CREATE INDEX IF NOT EXISTS "shop_marketplace_profiles_gate_idx" ON "shop_marketplace_profiles"("gate");

-- The Online Orders record behind each Market order (status and bill come
-- from it) and customer uploads such as a prescription photo.
ALTER TABLE "marketplace_orders" ADD COLUMN IF NOT EXISTS "channelOrderId" TEXT;
ALTER TABLE "marketplace_orders" ADD COLUMN IF NOT EXISTS "attachments" JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_orders_channelOrderId_key" ON "marketplace_orders"("channelOrderId");

-- Per-line choices from the category flow (cake message, booking slot,
-- substitute preference) on cart lines and order lines.
ALTER TABLE "marketplace_cart_lines" ADD COLUMN IF NOT EXISTS "options" JSONB;
ALTER TABLE "marketplace_order_items" ADD COLUMN IF NOT EXISTS "options" JSONB;
