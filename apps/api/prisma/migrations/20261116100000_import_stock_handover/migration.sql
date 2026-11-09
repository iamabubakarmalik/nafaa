-- Stock handover on import and linking (additive; existing links keep working).
-- stockHold: link waits for the merchant to pick Nafaa or channel stock before any push.
-- tracksStock: whether the channel counts stock for the item (null = not seen yet).
ALTER TABLE "product_channel_mappings" ADD COLUMN IF NOT EXISTS "stockHold" JSONB;
ALTER TABLE "product_channel_mappings" ADD COLUMN IF NOT EXISTS "tracksStock" BOOLEAN;
