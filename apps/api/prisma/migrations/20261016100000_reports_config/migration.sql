-- Settings → Reports (fiscal year, default period, comparison, round-off,
-- figures staff may see, daily summary channels/recipients/lines).
ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "reportsConfig" JSONB;

-- Business day of the last automatic daily summary, so a shop gets one per day.
ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "dailySummarySentDay" TEXT;
