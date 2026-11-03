-- Mobile app devices: one row per installed copy of the 2.0 app, kept fresh by
-- the app's heartbeat, plus the business days each device was used (for the
-- active-devices chart in the admin panel).
--
-- Additive only. Two new tables; nothing existing changes and no backfill is
-- needed. Both stay empty until the 2.0 app is released. Safe to run more
-- than once.

CREATE TABLE IF NOT EXISTS "MobileDevice" (
  "id" TEXT NOT NULL,
  "installId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "appVersion" TEXT NOT NULL,
  "buildNumber" TEXT,
  "runtimeVersion" TEXT,
  "updateId" TEXT,
  "osVersion" TEXT,
  "deviceModel" TEXT,
  "deviceBrand" TEXT,
  "language" TEXT,
  "pushToken" TEXT,
  "country" TEXT,
  "sessions" INTEGER NOT NULL DEFAULT 1,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MobileDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MobileDevice_installId_key" ON "MobileDevice"("installId");
CREATE INDEX IF NOT EXISTS "MobileDevice_tenantId_idx" ON "MobileDevice"("tenantId");
CREATE INDEX IF NOT EXISTS "MobileDevice_userId_idx" ON "MobileDevice"("userId");
CREATE INDEX IF NOT EXISTS "MobileDevice_lastSeenAt_idx" ON "MobileDevice"("lastSeenAt");
CREATE INDEX IF NOT EXISTS "MobileDevice_firstSeenAt_idx" ON "MobileDevice"("firstSeenAt");
CREATE INDEX IF NOT EXISTS "MobileDevice_platform_appVersion_idx" ON "MobileDevice"("platform", "appVersion");
CREATE INDEX IF NOT EXISTS "MobileDevice_pushToken_idx" ON "MobileDevice"("pushToken");

DO $$ BEGIN
  ALTER TABLE "MobileDevice" ADD CONSTRAINT "MobileDevice_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MobileDevice" ADD CONSTRAINT "MobileDevice_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "MobileDeviceDay" (
  "deviceId" TEXT NOT NULL,
  "day" DATE NOT NULL,
  "tenantId" TEXT NOT NULL,
  CONSTRAINT "MobileDeviceDay_pkey" PRIMARY KEY ("deviceId", "day")
);

CREATE INDEX IF NOT EXISTS "MobileDeviceDay_day_idx" ON "MobileDeviceDay"("day");

DO $$ BEGIN
  ALTER TABLE "MobileDeviceDay" ADD CONSTRAINT "MobileDeviceDay_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "MobileDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
