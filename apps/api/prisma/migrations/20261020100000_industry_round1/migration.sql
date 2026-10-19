-- Industry round 1: restaurant, garments, electronics, mobile.
--
-- 1. Restaurant
--    - TenantSettings.serviceChargePct: shop-wide dine-in service charge.
--    - RecipeIngredient.wastagePercent: loss on top of the recipe quantity.
--    - RecipeSizeFactor: how much of a recipe each size (variant) uses.
--    - RestaurantMenuAvailability: a dish switched off ("86") at one branch,
--      optionally until a set time.
--    - ModifierOption.ingredient*: raw material an add-on uses up.
--    - RestaurantOrderItem.happyHourRuleId: the happy-hour rule that priced
--      a line.
-- 2. Garments
--    - GarmentCollection.salePercent, GarmentProductProfile.regularPrice,
--      GarmentVariantProfile.regularPrice: collection sales that can be
--      undone.
--    - TenantSettings.exchangeDays: exchange window.
--    - ShopStock.reserved: pieces held for customers, per branch and
--      variant.
-- 3. Electronics: more ElectronicsCategoryType values. They are not used
--    in this file, so ADD VALUE is safe inside the migration transaction.
-- 4. Mobile
--    - UsedPhone (tenantId, imei1) is no longer unique, so a phone sold
--      earlier can be bought back. The unique index becomes a plain index.
--    - RepairTicket.warrantyOfId: a warranty return points at the earlier
--      repair.
--
-- Additive only: new columns are nullable or have a default, new tables
-- start empty, and no existing row is changed. Safe to run more than once.

-- ─── Restaurant ───────────────────────────────────────────────────────

ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "serviceChargePct" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "RecipeIngredient" ADD COLUMN IF NOT EXISTS "wastagePercent" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "RecipeSizeFactor" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "factor" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecipeSizeFactor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RecipeSizeFactor_recipeId_variantId_key" ON "RecipeSizeFactor"("recipeId", "variantId");
CREATE INDEX IF NOT EXISTS "RecipeSizeFactor_tenantId_idx" ON "RecipeSizeFactor"("tenantId");
CREATE INDEX IF NOT EXISTS "RecipeSizeFactor_variantId_idx" ON "RecipeSizeFactor"("variantId");

DO $$ BEGIN
  ALTER TABLE "RecipeSizeFactor" ADD CONSTRAINT "RecipeSizeFactor_recipeId_fkey"
    FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "RecipeSizeFactor" ADD CONSTRAINT "RecipeSizeFactor_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "RestaurantMenuAvailability" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "menuItemId" TEXT NOT NULL,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "until" TIMESTAMP(3),
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestaurantMenuAvailability_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RestaurantMenuAvailability_shopId_menuItemId_key" ON "RestaurantMenuAvailability"("shopId", "menuItemId");
CREATE INDEX IF NOT EXISTS "RestaurantMenuAvailability_tenantId_idx" ON "RestaurantMenuAvailability"("tenantId");
CREATE INDEX IF NOT EXISTS "RestaurantMenuAvailability_menuItemId_idx" ON "RestaurantMenuAvailability"("menuItemId");

DO $$ BEGIN
  ALTER TABLE "RestaurantMenuAvailability" ADD CONSTRAINT "RestaurantMenuAvailability_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "RestaurantMenuAvailability" ADD CONSTRAINT "RestaurantMenuAvailability_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "RestaurantMenuAvailability" ADD CONSTRAINT "RestaurantMenuAvailability_menuItemId_fkey"
    FOREIGN KEY ("menuItemId") REFERENCES "RestaurantMenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ModifierOption" ADD COLUMN IF NOT EXISTS "ingredientProductId" TEXT;
ALTER TABLE "ModifierOption" ADD COLUMN IF NOT EXISTS "ingredientQty" DOUBLE PRECISION;
ALTER TABLE "ModifierOption" ADD COLUMN IF NOT EXISTS "ingredientUnit" TEXT;
CREATE INDEX IF NOT EXISTS "ModifierOption_ingredientProductId_idx" ON "ModifierOption"("ingredientProductId");

DO $$ BEGIN
  ALTER TABLE "ModifierOption" ADD CONSTRAINT "ModifierOption_ingredientProductId_fkey"
    FOREIGN KEY ("ingredientProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "RestaurantOrderItem" ADD COLUMN IF NOT EXISTS "happyHourRuleId" TEXT;
CREATE INDEX IF NOT EXISTS "RestaurantOrderItem_happyHourRuleId_idx" ON "RestaurantOrderItem"("happyHourRuleId");

DO $$ BEGIN
  ALTER TABLE "RestaurantOrderItem" ADD CONSTRAINT "RestaurantOrderItem_happyHourRuleId_fkey"
    FOREIGN KEY ("happyHourRuleId") REFERENCES "HappyHourRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Garments ─────────────────────────────────────────────────────────

ALTER TABLE "GarmentCollection" ADD COLUMN IF NOT EXISTS "salePercent" DOUBLE PRECISION;
ALTER TABLE "GarmentProductProfile" ADD COLUMN IF NOT EXISTS "regularPrice" DOUBLE PRECISION;
ALTER TABLE "GarmentVariantProfile" ADD COLUMN IF NOT EXISTS "regularPrice" DOUBLE PRECISION;

ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "exchangeDays" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ShopStock" ADD COLUMN IF NOT EXISTS "reserved" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- ─── Electronics ──────────────────────────────────────────────────────
-- Placed before OTHER so the database order matches the schema.

ALTER TYPE "ElectronicsCategoryType" ADD VALUE IF NOT EXISTS 'TV' BEFORE 'OTHER';
ALTER TYPE "ElectronicsCategoryType" ADD VALUE IF NOT EXISTS 'LAPTOP' BEFORE 'OTHER';
ALTER TYPE "ElectronicsCategoryType" ADD VALUE IF NOT EXISTS 'TABLET' BEFORE 'OTHER';
ALTER TYPE "ElectronicsCategoryType" ADD VALUE IF NOT EXISTS 'DESKTOP' BEFORE 'OTHER';
ALTER TYPE "ElectronicsCategoryType" ADD VALUE IF NOT EXISTS 'PRINTER' BEFORE 'OTHER';
ALTER TYPE "ElectronicsCategoryType" ADD VALUE IF NOT EXISTS 'GAMING_CONSOLE' BEFORE 'OTHER';
ALTER TYPE "ElectronicsCategoryType" ADD VALUE IF NOT EXISTS 'HOME_THEATER' BEFORE 'OTHER';
ALTER TYPE "ElectronicsCategoryType" ADD VALUE IF NOT EXISTS 'UPS' BEFORE 'OTHER';

-- ─── Mobile ───────────────────────────────────────────────────────────

DROP INDEX IF EXISTS "UsedPhone_tenantId_imei1_key";
CREATE INDEX IF NOT EXISTS "UsedPhone_tenantId_imei1_idx" ON "UsedPhone"("tenantId", "imei1");

ALTER TABLE "RepairTicket" ADD COLUMN IF NOT EXISTS "warrantyOfId" TEXT;
CREATE INDEX IF NOT EXISTS "RepairTicket_warrantyOfId_idx" ON "RepairTicket"("warrantyOfId");

DO $$ BEGIN
  ALTER TABLE "RepairTicket" ADD CONSTRAINT "RepairTicket_warrantyOfId_fkey"
    FOREIGN KEY ("warrantyOfId") REFERENCES "RepairTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
