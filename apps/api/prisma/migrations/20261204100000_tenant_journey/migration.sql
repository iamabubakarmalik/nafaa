-- Merchant journey: where each shop came from and which Nafaa apps it uses.
-- Additive only: one new table and new nullable columns on "User" and
-- "Session". No existing rows change. Existing shops are filled by
-- apps/api/scripts/backfill-tenant-journey.ts (run separately, report first).

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenWebAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenDesktopAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenAndroidAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenIosAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "platform" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "appVersion" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "tenant_journey" (
    "tenantId" TEXT NOT NULL,
    "signupPlatform" TEXT,
    "signupAppVersion" TEXT,
    "signupUserAgent" TEXT,
    "signupMethod" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "ftSource" TEXT,
    "ftMedium" TEXT,
    "ftCampaign" TEXT,
    "ftTerm" TEXT,
    "ftContent" TEXT,
    "cta" TEXT,
    "referrerDomain" TEXT,
    "referralCode" TEXT,
    "landingPage" TEXT,
    "inferred" BOOLEAN NOT NULL DEFAULT false,
    "signupRecordedAt" TIMESTAMP(3),
    "lastSeenWebAt" TIMESTAMP(3),
    "lastSeenDesktopAt" TIMESTAMP(3),
    "lastSeenAndroidAt" TIMESTAMP(3),
    "lastSeenIosAt" TIMESTAMP(3),
    "firstSeenAndroidAt" TIMESTAMP(3),
    "firstSeenIosAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_journey_pkey" PRIMARY KEY ("tenantId")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tenant_journey_signupPlatform_idx" ON "tenant_journey"("signupPlatform");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tenant_journey_utmSource_idx" ON "tenant_journey"("utmSource");

-- AddForeignKey
ALTER TABLE "tenant_journey" ADD CONSTRAINT "tenant_journey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
