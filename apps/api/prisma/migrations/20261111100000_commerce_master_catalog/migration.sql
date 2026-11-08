-- Commerce phase 2: Nafaa as the master catalog.
-- Additive only: existing links stay listed with no allocation (current behaviour).

ALTER TABLE "product_channel_mappings"
  ADD COLUMN IF NOT EXISTS "listed" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "allocQty" INTEGER,
  ADD COLUMN IF NOT EXISTS "compareAtPrice" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "lastPush" JSONB;

CREATE TABLE IF NOT EXISTS "catalog_jobs" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "integrationId" TEXT,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "total" INTEGER NOT NULL DEFAULT 0,
  "done" INTEGER NOT NULL DEFAULT 0,
  "failed" INTEGER NOT NULL DEFAULT 0,
  "cursor" INTEGER NOT NULL DEFAULT 0,
  "items" JSONB,
  "params" JSONB,
  "errors" JSONB,
  "createdById" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "heartbeatAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "catalog_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "catalog_jobs_tenantId_createdAt_idx" ON "catalog_jobs"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "catalog_jobs_status_idx" ON "catalog_jobs"("status");
