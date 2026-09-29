-- Website ke har variant ko Nafaa ke variant se jorna (size / color alag alag).
-- Additive: purane links "productId:-" key ke saath waise hi chalte rehte hain.

ALTER TABLE "product_channel_mappings"
  ADD COLUMN "variantId" TEXT,
  ADD COLUMN "linkKey" TEXT,
  ADD COLUMN "externalTitle" TEXT,
  ADD COLUMN "externalImage" TEXT;

UPDATE "product_channel_mappings" SET "linkKey" = "productId" || ':-' WHERE "linkKey" IS NULL;
ALTER TABLE "product_channel_mappings" ALTER COLUMN "linkKey" SET NOT NULL;

DROP INDEX IF EXISTS "product_channel_mappings_integrationId_productId_key";
CREATE UNIQUE INDEX "product_channel_mappings_integrationId_linkKey_key" ON "product_channel_mappings"("integrationId", "linkKey");
CREATE INDEX "product_channel_mappings_integrationId_productId_idx" ON "product_channel_mappings"("integrationId", "productId");
CREATE INDEX "product_channel_mappings_integrationId_externalProductId_idx" ON "product_channel_mappings"("integrationId", "externalProductId");
CREATE INDEX "product_channel_mappings_integrationId_externalVariantId_idx" ON "product_channel_mappings"("integrationId", "externalVariantId");

ALTER TABLE "product_channel_mappings"
  ADD CONSTRAINT "product_channel_mappings_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
