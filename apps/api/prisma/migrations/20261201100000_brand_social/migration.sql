-- Nafaa Social (admin): Nafaa's own social accounts, posts, media library and results.
-- Additive only: five new tables, no changes to existing ones.

-- CreateTable
CREATE TABLE "brand_social_accounts" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT,
    "profileUrl" TEXT,
    "avatarUrl" TEXT,
    "externalId" TEXT NOT NULL,
    "accessTokenEnc" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'MANUAL',
    "autoPublish" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "lastError" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "connectedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "brand_social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_social_posts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'POST',
    "pillar" TEXT,
    "campaign" TEXT,
    "caption" TEXT NOT NULL DEFAULT '',
    "captions" JSONB NOT NULL DEFAULT '{}',
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "firstComment" TEXT,
    "link" TEXT,
    "media" JSONB NOT NULL DEFAULT '[]',
    "assetIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scheduledAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishState" JSONB NOT NULL DEFAULT '{}',
    "nextRunAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectReason" TEXT,
    "aiMade" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "insightsAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "brand_social_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_social_assets" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "durationSec" DOUBLE PRECISION,
    "bytes" INTEGER,
    "mime" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "folder" TEXT,
    "storageKey" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brand_social_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_social_post_metrics" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "plays" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "engagement" INTEGER NOT NULL DEFAULT 0,
    "raw" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "brand_social_post_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_social_account_days" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "followers" INTEGER,
    "reach" INTEGER,
    "impressions" INTEGER,
    "profileViews" INTEGER,
    "websiteClicks" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "brand_social_account_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_social_accounts_platform_externalId_key" ON "brand_social_accounts"("platform", "externalId");
CREATE INDEX "brand_social_accounts_status_idx" ON "brand_social_accounts"("status");

CREATE UNIQUE INDEX "brand_social_posts_code_key" ON "brand_social_posts"("code");
CREATE INDEX "brand_social_posts_status_nextRunAt_idx" ON "brand_social_posts"("status", "nextRunAt");
CREATE INDEX "brand_social_posts_scheduledAt_idx" ON "brand_social_posts"("scheduledAt");
CREATE INDEX "brand_social_posts_publishedAt_idx" ON "brand_social_posts"("publishedAt");
CREATE INDEX "brand_social_posts_campaign_idx" ON "brand_social_posts"("campaign");

CREATE INDEX "brand_social_assets_folder_idx" ON "brand_social_assets"("folder");
CREATE INDEX "brand_social_assets_createdAt_idx" ON "brand_social_assets"("createdAt");

CREATE UNIQUE INDEX "brand_social_post_metrics_postId_platform_day_key" ON "brand_social_post_metrics"("postId", "platform", "day");
CREATE INDEX "brand_social_post_metrics_day_idx" ON "brand_social_post_metrics"("day");

CREATE UNIQUE INDEX "brand_social_account_days_accountId_day_key" ON "brand_social_account_days"("accountId", "day");
CREATE INDEX "brand_social_account_days_day_idx" ON "brand_social_account_days"("day");

-- AddForeignKey
ALTER TABLE "brand_social_post_metrics" ADD CONSTRAINT "brand_social_post_metrics_postId_fkey" FOREIGN KEY ("postId") REFERENCES "brand_social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "brand_social_account_days" ADD CONSTRAINT "brand_social_account_days_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "brand_social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
