-- Online orders: selling costs per order and the "post to expenses" setting.
--
-- Additive only. Every new column is nullable and starts empty:
--   * courierCharge, codFee, gatewayFee, packagingCost, rtoCost: the order's
--     selling costs once known (courier booking reply, settlement statement,
--     typed by hand, or frozen when posted as an expense). Null means not
--     known yet; screens then estimate from the shop's rate card.
--   * costsPostedAt: when the costs were posted as an expense ("Online selling
--     costs"), so they reach the P&L once.
-- Index on (tenantId, trackingNumber) for matching settlement statements by CN.
--
-- Backfill: shops that exist today may already enter courier charges as
-- expenses by hand, so automatic posting starts OFF for them. Shops created
-- after this migration have no row and get the ON default.

ALTER TABLE "channel_orders" ADD COLUMN IF NOT EXISTS "courierCharge" DOUBLE PRECISION;
ALTER TABLE "channel_orders" ADD COLUMN IF NOT EXISTS "codFee" DOUBLE PRECISION;
ALTER TABLE "channel_orders" ADD COLUMN IF NOT EXISTS "gatewayFee" DOUBLE PRECISION;
ALTER TABLE "channel_orders" ADD COLUMN IF NOT EXISTS "packagingCost" DOUBLE PRECISION;
ALTER TABLE "channel_orders" ADD COLUMN IF NOT EXISTS "rtoCost" DOUBLE PRECISION;
ALTER TABLE "channel_orders" ADD COLUMN IF NOT EXISTS "costsPostedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "channel_orders_tenantId_trackingNumber_idx" ON "channel_orders"("tenantId", "trackingNumber");

INSERT INTO "SystemSetting" ("id", "key", "value", "category", "isPublic", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'online_order_costs:' || t."id", '{"postExpenses":false}', 'online_orders', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant" t
ON CONFLICT ("key") DO NOTHING;
