-- How a business sells, asked at sign-up, and how much of distribution it uses.
--
-- Additive only, no backfill:
--   Tenant.businessModels: RETAIL / WHOLESALE / DISTRIBUTION / ONLINE picked at
--     sign-up or in Settings. Empty means not answered and is treated as retail,
--     so every existing business keeps today's screens.
--   DistributionSettings.mode: WHOLESALE (price lists, orders, credit,
--     recoveries) or FULL (adds routes, bookers, load sheets and delivery).
--     Existing rows get FULL, which is what they use today.
-- Safe to run more than once.

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "businessModels" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "DistributionSettings" ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT 'FULL';
