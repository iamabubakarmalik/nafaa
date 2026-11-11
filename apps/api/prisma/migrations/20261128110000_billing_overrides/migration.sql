-- Admin per-shop billing deals: extra features and limit overrides. Additive only.
ALTER TABLE "Tenant" ADD COLUMN "extraFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Tenant" ADD COLUMN "limitOverrides" JSONB;

-- The trial is not a plan to buy; keep it off public price lists (admin can change this).
UPDATE "Plan" SET "isPublic" = false WHERE "slug" = 'free-trial';
