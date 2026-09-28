-- Ek dukaan ke kai sales channels (do WooCommerce sites, Shopify, apni website).
-- Sirf unique pabandi hat-ti hai — koi data nahi badalta.
DROP INDEX IF EXISTS "integrations_tenantId_type_key";
CREATE INDEX IF NOT EXISTS "integrations_tenantId_type_idx" ON "integrations"("tenantId", "type");
