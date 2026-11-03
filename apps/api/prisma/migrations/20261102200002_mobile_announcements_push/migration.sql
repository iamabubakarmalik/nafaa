-- Mobile app announcements (in-app banners) and push broadcasts sent from the
-- admin panel. Texts are stored as {en, ur, roman}.
--
-- Additive only. Two new tables with no links to existing data; nothing
-- existing changes and no backfill is needed. Remote app settings (releases,
-- maintenance, feature switches) live in SystemSetting under "mobile:config"
-- and need no table. Safe to run more than once.

CREATE TABLE IF NOT EXISTS "MobileAnnouncement" (
  "id" TEXT NOT NULL,
  "title" JSONB NOT NULL,
  "body" JSONB NOT NULL,
  "tone" TEXT NOT NULL DEFAULT 'info',
  "ctaLabel" JSONB,
  "ctaLink" TEXT,
  "audience" TEXT NOT NULL DEFAULT 'all',
  "planSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "industries" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "tenantIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "minVersion" TEXT,
  "maxVersion" TEXT,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "dismissible" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MobileAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MobileAnnouncement_isActive_idx" ON "MobileAnnouncement"("isActive");

CREATE TABLE IF NOT EXISTS "MobilePushBroadcast" (
  "id" TEXT NOT NULL,
  "title" JSONB NOT NULL,
  "body" JSONB NOT NULL,
  "deepLink" TEXT,
  "audience" TEXT NOT NULL DEFAULT 'all',
  "planSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "industries" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "tenantIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "minVersion" TEXT,
  "maxVersion" TEXT,
  "includeOlderApp" BOOLEAN NOT NULL DEFAULT true,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "audienceCount" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "dryRun" BOOLEAN NOT NULL DEFAULT false,
  "error" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "MobilePushBroadcast_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MobilePushBroadcast_createdAt_idx" ON "MobilePushBroadcast"("createdAt");
