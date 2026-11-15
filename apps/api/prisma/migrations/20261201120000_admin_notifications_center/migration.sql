-- Admin notification center: category (who may see it), dedupe key with an
-- occurrence count, and the time of the latest occurrence. Additive only;
-- existing rows are backfilled from their type, link and entity type.

-- AlterTable
ALTER TABLE "AdminNotification"
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN "dedupeKey" TEXT,
  ADD COLUMN "occurrences" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "lastAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill
UPDATE "AdminNotification" SET "lastAt" = "createdAt";

UPDATE "AdminNotification" SET "category" = CASE
  WHEN "type" IN ('NEW_TENANT', 'TENANT_SUSPENDED', 'REFERRAL_CONVERTED') THEN 'shops'
  WHEN "entityType" = 'DELETION_REQUESTS' OR "link" LIKE '/deletion-requests%' OR "link" LIKE '/tenants%' THEN 'shops'
  WHEN "type" IN ('NEW_PAYMENT', 'PAYMENT_APPROVED', 'PAYMENT_REJECTED', 'SUBSCRIPTION_EXPIRING', 'SUBSCRIPTION_CANCELLED', 'HIGH_VALUE_PAYMENT') THEN 'billing'
  WHEN "link" LIKE '/setups%' OR "link" LIKE '/billing%' OR "link" LIKE '/invoices%' OR "link" LIKE '/subscriptions%' THEN 'billing'
  WHEN "type" IN ('SYSTEM_ALERT', 'ERROR') THEN 'system'
  ELSE 'general'
END;

-- CreateIndex
CREATE INDEX "AdminNotification_category_idx" ON "AdminNotification"("category");
CREATE INDEX "AdminNotification_lastAt_idx" ON "AdminNotification"("lastAt");
CREATE INDEX "AdminNotification_dedupeKey_createdAt_idx" ON "AdminNotification"("dedupeKey", "createdAt");
