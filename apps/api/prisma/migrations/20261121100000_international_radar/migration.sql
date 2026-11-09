-- International storefront prices and the international shipping flag. Additive only.
-- Existing products default to "ships abroad"; international selling stays off until a shop turns it on.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "shipsAbroad" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "CountryPrice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL DEFAULT '',
    "price" DOUBLE PRECISION NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CountryPrice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CountryPrice_integrationId_country_productId_variantKey_key" ON "CountryPrice"("integrationId", "country", "productId", "variantKey");
CREATE INDEX IF NOT EXISTS "CountryPrice_tenantId_integrationId_country_idx" ON "CountryPrice"("tenantId", "integrationId", "country");
CREATE INDEX IF NOT EXISTS "CountryPrice_productId_idx" ON "CountryPrice"("productId");
