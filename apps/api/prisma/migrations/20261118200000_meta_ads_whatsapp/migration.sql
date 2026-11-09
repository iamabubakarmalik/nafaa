-- Meta ads management and WhatsApp Cloud API (additive only).

-- WhatsApp: the access now comes from the Facebook connection; the old
-- hand-typed token columns become optional. New settings per event.
ALTER TABLE "whatsapp_configs" ALTER COLUMN "accessToken" DROP NOT NULL;
ALTER TABLE "whatsapp_configs" ALTER COLUMN "verifyToken" DROP NOT NULL;
ALTER TABLE "whatsapp_configs"
  ADD COLUMN IF NOT EXISTS "displayPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "qualityRating" TEXT,
  ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS "sendConfirm" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "confirmCodOnly" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "sendDispatched" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "sendDelivered" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lastError" TEXT,
  ADD COLUMN IF NOT EXISTS "lastErrorAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "whatsapp_configs_phoneNumberId_idx" ON "whatsapp_configs"("phoneNumberId");

ALTER TABLE "whatsapp_templates"
  ADD COLUMN IF NOT EXISTS "templateKey" TEXT,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "rejectedReason" TEXT,
  ADD COLUMN IF NOT EXISTS "syncedAt" TIMESTAMP(3);
-- Rows approved under the old setup keep their state.
UPDATE "whatsapp_templates" SET "status" = 'APPROVED' WHERE "isApproved" = true AND "status" = 'DRAFT';

ALTER TABLE "whatsapp_messages"
  ADD COLUMN IF NOT EXISTS "direction" TEXT NOT NULL DEFAULT 'OUT',
  ADD COLUMN IF NOT EXISTS "orderId" TEXT,
  ADD COLUMN IF NOT EXISTS "event" TEXT,
  ADD COLUMN IF NOT EXISTS "waId" TEXT,
  ADD COLUMN IF NOT EXISTS "customerName" TEXT,
  ADD COLUMN IF NOT EXISTS "category" TEXT,
  ADD COLUMN IF NOT EXISTS "payload" TEXT,
  ADD COLUMN IF NOT EXISTS "contextId" TEXT;
CREATE INDEX IF NOT EXISTS "whatsapp_messages_tenantId_orderId_idx" ON "whatsapp_messages"("tenantId", "orderId");
CREATE INDEX IF NOT EXISTS "whatsapp_messages_metaMessageId_idx" ON "whatsapp_messages"("metaMessageId");
CREATE INDEX IF NOT EXISTS "whatsapp_messages_tenantId_direction_createdAt_idx" ON "whatsapp_messages"("tenantId", "direction", "createdAt");

-- Ads: campaigns read from Meta keep their id.
ALTER TABLE "ad_campaigns"
  ADD COLUMN IF NOT EXISTS "externalId" TEXT,
  ADD COLUMN IF NOT EXISTS "adAccountId" TEXT;
CREATE INDEX IF NOT EXISTS "ad_campaigns_tenantId_externalId_idx" ON "ad_campaigns"("tenantId", "externalId");

CREATE TABLE IF NOT EXISTS "meta_ad_settings" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "autoPull" BOOLEAN NOT NULL DEFAULT true,
  "fxRate" DOUBLE PRECISION,
  "maxChangePct" INTEGER NOT NULL DEFAULT 30,
  "maxActionsPerDay" INTEGER NOT NULL DEFAULT 10,
  "lastPullAt" TIMESTAMP(3),
  "lastPullError" TEXT,
  "lastRulesRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "meta_ad_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "meta_ad_settings_tenantId_key" ON "meta_ad_settings"("tenantId");

CREATE TABLE IF NOT EXISTS "meta_ad_rules" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "threshold" DOUBLE PRECISION NOT NULL,
  "days" INTEGER NOT NULL DEFAULT 3,
  "pct" INTEGER NOT NULL DEFAULT 0,
  "minSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "campaignIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "mode" TEXT NOT NULL DEFAULT 'SUGGEST',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "meta_ad_rules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "meta_ad_rules_tenantId_enabled_idx" ON "meta_ad_rules"("tenantId", "enabled");

CREATE TABLE IF NOT EXISTS "meta_ad_actions" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "ruleId" TEXT,
  "adAccountId" TEXT NOT NULL,
  "objectType" TEXT NOT NULL DEFAULT 'CAMPAIGN',
  "objectId" TEXT NOT NULL,
  "objectName" TEXT,
  "action" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "changePct" DOUBLE PRECISION,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "status" TEXT NOT NULL DEFAULT 'SUGGESTED',
  "reason" JSONB,
  "error" TEXT,
  "day" TEXT NOT NULL,
  "createdById" TEXT,
  "appliedAt" TIMESTAMP(3),
  "appliedById" TEXT,
  "undoneAt" TIMESTAMP(3),
  "undoneById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "meta_ad_actions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "meta_ad_actions_tenantId_createdAt_idx" ON "meta_ad_actions"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "meta_ad_actions_tenantId_status_day_idx" ON "meta_ad_actions"("tenantId", "status", "day");
CREATE INDEX IF NOT EXISTS "meta_ad_actions_tenantId_objectId_idx" ON "meta_ad_actions"("tenantId", "objectId");
