-- Admin can pause a shop (with an optional end date and a reason). Additive only.
ALTER TABLE "Tenant" ADD COLUMN "pausedAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "pausedUntil" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "pauseReason" TEXT;
-- Shops already marked SUSPENDED become paused (suspend never blocked them before).
UPDATE "Tenant" SET "pausedAt" = CURRENT_TIMESTAMP WHERE "status" = 'SUSPENDED' AND "pausedAt" IS NULL;
