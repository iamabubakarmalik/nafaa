-- Social media studio: content calendar posts (additive; no existing table changes).
CREATE TABLE IF NOT EXISTS "social_posts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "code" TEXT NOT NULL,
    "title" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'POST',
    "scheduledAt" TIMESTAMP(3),
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "caption" TEXT NOT NULL DEFAULT '',
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "media" JSONB,
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "links" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "remindMinutes" INTEGER NOT NULL DEFAULT 0,
    "reminderSentAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "postUrls" JSONB,
    "festivalKey" TEXT,
    "aiMade" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "assignedToId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "social_posts_tenantId_code_key" ON "social_posts"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "social_posts_tenantId_scheduledAt_idx" ON "social_posts"("tenantId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "social_posts_tenantId_status_idx" ON "social_posts"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "social_posts_scheduledAt_reminderSentAt_idx" ON "social_posts"("scheduledAt", "reminderSentAt");
