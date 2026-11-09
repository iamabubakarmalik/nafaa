-- Channel sync source: a held price decision per link, a per-product sync history,
-- and products marked to be made on a channel. Additive only: existing links start
-- with no hold, the history and the marks start empty.

ALTER TABLE "product_channel_mappings" ADD COLUMN IF NOT EXISTS "priceHold" JSONB;

CREATE TABLE IF NOT EXISTS "channel_sync_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "mappingId" TEXT,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "field" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "target" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "note" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "channel_sync_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "channel_sync_logs_tenantId_productId_createdAt_idx" ON "channel_sync_logs"("tenantId", "productId", "createdAt");
CREATE INDEX IF NOT EXISTS "channel_sync_logs_integrationId_createdAt_idx" ON "channel_sync_logs"("integrationId", "createdAt");

CREATE TABLE IF NOT EXISTS "channel_publish_marks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "lastError" TEXT,
    CONSTRAINT "channel_publish_marks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "channel_publish_marks_integrationId_productId_key" ON "channel_publish_marks"("integrationId", "productId");
CREATE INDEX IF NOT EXISTS "channel_publish_marks_tenantId_integrationId_publishedAt_idx" ON "channel_publish_marks"("tenantId", "integrationId", "publishedAt");
