-- Commerce phase 1: orders board, manual orders. Additive only.

-- One integration per tenant holds orders typed in by the shop.
ALTER TYPE "IntegrationType" ADD VALUE IF NOT EXISTS 'MANUAL';

ALTER TABLE "channel_orders"
  ADD COLUMN IF NOT EXISTS "stage" TEXT,
  ADD COLUMN IF NOT EXISTS "assignedToId" TEXT,
  ADD COLUMN IF NOT EXISTS "followUpAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "followUpNote" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "replacementOfId" TEXT,
  ADD COLUMN IF NOT EXISTS "mergedIntoId" TEXT,
  ADD COLUMN IF NOT EXISTS "weightKg" DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "channel_orders_tenantId_stage_idx" ON "channel_orders"("tenantId", "stage");
CREATE INDEX IF NOT EXISTS "channel_orders_tenantId_assignedToId_idx" ON "channel_orders"("tenantId", "assignedToId");
CREATE INDEX IF NOT EXISTS "channel_orders_tenantId_followUpAt_idx" ON "channel_orders"("tenantId", "followUpAt");
CREATE INDEX IF NOT EXISTS "channel_orders_tenantId_deletedAt_idx" ON "channel_orders"("tenantId", "deletedAt");
