-- Marketing hub: ad sets on spend rows, order attribution (UTM, referrer,
-- landing page, discount codes), campaign matching rules and the Meta
-- Conversions API event log. Additive only.

ALTER TABLE "AdSpend" ADD COLUMN IF NOT EXISTS "adSet" TEXT;

ALTER TABLE "channel_orders"
  ADD COLUMN IF NOT EXISTS "utmSource" TEXT,
  ADD COLUMN IF NOT EXISTS "utmMedium" TEXT,
  ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT,
  ADD COLUMN IF NOT EXISTS "utmContent" TEXT,
  ADD COLUMN IF NOT EXISTS "utmTerm" TEXT,
  ADD COLUMN IF NOT EXISTS "trafficSource" TEXT,
  ADD COLUMN IF NOT EXISTS "referrer" TEXT,
  ADD COLUMN IF NOT EXISTS "landingPage" TEXT,
  ADD COLUMN IF NOT EXISTS "discountCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "channel_orders_tenantId_utmCampaign_idx" ON "channel_orders"("tenantId", "utmCampaign");
CREATE INDEX IF NOT EXISTS "channel_orders_tenantId_trafficSource_idx" ON "channel_orders"("tenantId", "trafficSource");

-- Backfill: orders typed in by the shop already say where they came from.
UPDATE "channel_orders" co
SET "utmSource" = lower(co.metadata->>'source'),
    "trafficSource" = CASE upper(co.metadata->>'source')
      WHEN 'FACEBOOK' THEN 'META'
      WHEN 'INSTAGRAM' THEN 'META'
      WHEN 'TIKTOK' THEN 'TIKTOK'
      WHEN 'WHATSAPP' THEN 'WHATSAPP'
      WHEN 'PHONE' THEN 'PHONE'
      ELSE 'DIRECT' END
FROM "integrations" i
WHERE i.id = co."integrationId"
  AND i.type::text = 'MANUAL'
  AND co."trafficSource" IS NULL
  AND co.metadata ? 'source';

CREATE TABLE IF NOT EXISTS "ad_campaigns" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "utmCampaign" TEXT,
  "discountCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "dailyBudget" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "note" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ad_campaigns_tenantId_platform_name_key" ON "ad_campaigns"("tenantId", "platform", "name");
CREATE INDEX IF NOT EXISTS "ad_campaigns_tenantId_status_idx" ON "ad_campaigns"("tenantId", "status");

CREATE TABLE IF NOT EXISTS "meta_capi_events" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "orderId" TEXT,
  "checkoutId" TEXT,
  "value" DOUBLE PRECISION,
  "currency" TEXT NOT NULL DEFAULT 'PKR',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "lastError" TEXT,
  "testCode" TEXT,
  "response" JSONB,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "meta_capi_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "meta_capi_events_tenantId_eventId_key" ON "meta_capi_events"("tenantId", "eventId");
CREATE INDEX IF NOT EXISTS "meta_capi_events_tenantId_createdAt_idx" ON "meta_capi_events"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "meta_capi_events_status_nextAttemptAt_idx" ON "meta_capi_events"("status", "nextAttemptAt");
