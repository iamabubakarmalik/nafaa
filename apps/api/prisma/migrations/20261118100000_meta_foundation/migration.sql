-- Meta (Facebook / Instagram) foundation: the connection per business,
-- the unified inbox (conversations, messages, comments), catalog sync state
-- and log, data deletion requests, and auto-publish columns on social posts.
-- Additive only: new tables and new columns with defaults; no backfill needed.

ALTER TABLE "social_posts" ADD COLUMN IF NOT EXISTS "autoPublish" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "social_posts" ADD COLUMN IF NOT EXISTS "publishState" JSONB;
CREATE INDEX IF NOT EXISTS "social_posts_autoPublish_scheduledAt_idx" ON "social_posts"("autoPublish", "scheduledAt");

CREATE TABLE IF NOT EXISTS "meta_connections" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "connectedById" TEXT,
  "metaUserId" TEXT,
  "metaUserName" TEXT,
  "userToken" TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "pages" JSONB,
  "adAccounts" JSONB,
  "businesses" JSONB,
  "catalogs" JSONB,
  "pageId" TEXT,
  "igUserId" TEXT,
  "adAccountId" TEXT,
  "businessId" TEXT,
  "catalogId" TEXT,
  "wabaId" TEXT,
  "waPhoneNumberId" TEXT,
  "autoPublish" BOOLEAN NOT NULL DEFAULT true,
  "inboxEnabled" BOOLEAN NOT NULL DEFAULT true,
  "catalogSync" BOOLEAN NOT NULL DEFAULT false,
  "catalogSyncedAt" TIMESTAMP(3),
  "webhooksAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'CONNECTED',
  "lastError" TEXT,
  "lastErrorAt" TIMESTAMP(3),
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "meta_connections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "meta_connections_tenantId_key" ON "meta_connections"("tenantId");
CREATE INDEX IF NOT EXISTS "meta_connections_metaUserId_idx" ON "meta_connections"("metaUserId");
CREATE INDEX IF NOT EXISTS "meta_connections_pageId_idx" ON "meta_connections"("pageId");
CREATE INDEX IF NOT EXISTS "meta_connections_igUserId_idx" ON "meta_connections"("igUserId");

CREATE TABLE IF NOT EXISTS "meta_conversations" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "participantName" TEXT,
  "participantUsername" TEXT,
  "lastText" TEXT,
  "lastMessageAt" TIMESTAMP(3),
  "lastInboundAt" TIMESTAMP(3),
  "unread" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "phone" TEXT,
  "customerId" TEXT,
  "channelOrderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "meta_conversations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "meta_conversations_tenantId_platform_accountId_participantId_key" ON "meta_conversations"("tenantId", "platform", "accountId", "participantId");
CREATE INDEX IF NOT EXISTS "meta_conversations_tenantId_lastMessageAt_idx" ON "meta_conversations"("tenantId", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "meta_conversations_tenantId_status_idx" ON "meta_conversations"("tenantId", "status");

CREATE TABLE IF NOT EXISTS "meta_messages" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "externalId" TEXT,
  "direction" TEXT NOT NULL,
  "text" TEXT,
  "attachments" JSONB,
  "sentAt" TIMESTAMP(3) NOT NULL,
  "sentById" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SENT',
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "meta_messages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "meta_messages_tenantId_externalId_key" ON "meta_messages"("tenantId", "externalId");
CREATE INDEX IF NOT EXISTS "meta_messages_conversationId_sentAt_idx" ON "meta_messages"("conversationId", "sentAt");
DO $$ BEGIN
  ALTER TABLE "meta_messages" ADD CONSTRAINT "meta_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "meta_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "meta_comments" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "objectId" TEXT,
  "parentId" TEXT,
  "authorId" TEXT,
  "authorName" TEXT,
  "text" TEXT,
  "permalink" TEXT,
  "commentedAt" TIMESTAMP(3) NOT NULL,
  "hidden" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  "fromShop" BOOLEAN NOT NULL DEFAULT false,
  "repliedAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "socialPostId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "meta_comments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "meta_comments_tenantId_externalId_key" ON "meta_comments"("tenantId", "externalId");
CREATE INDEX IF NOT EXISTS "meta_comments_tenantId_commentedAt_idx" ON "meta_comments"("tenantId", "commentedAt");
CREATE INDEX IF NOT EXISTS "meta_comments_tenantId_objectId_idx" ON "meta_comments"("tenantId", "objectId");

CREATE TABLE IF NOT EXISTS "meta_catalog_items" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "catalogId" TEXT NOT NULL,
  "retailerId" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "meta_catalog_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "meta_catalog_items_tenantId_catalogId_retailerId_key" ON "meta_catalog_items"("tenantId", "catalogId", "retailerId");

CREATE TABLE IF NOT EXISTS "meta_catalog_syncs" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "catalogId" TEXT NOT NULL,
  "trigger" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "sent" INTEGER NOT NULL DEFAULT 0,
  "removed" INTEGER NOT NULL DEFAULT 0,
  "failed" INTEGER NOT NULL DEFAULT 0,
  "unchanged" INTEGER NOT NULL DEFAULT 0,
  "handles" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "errors" JSONB,
  "message" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "meta_catalog_syncs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "meta_catalog_syncs_tenantId_startedAt_idx" ON "meta_catalog_syncs"("tenantId", "startedAt");

CREATE TABLE IF NOT EXISTS "meta_data_deletions" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "metaUserId" TEXT NOT NULL,
  "tenantIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "meta_data_deletions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "meta_data_deletions_code_key" ON "meta_data_deletions"("code");
