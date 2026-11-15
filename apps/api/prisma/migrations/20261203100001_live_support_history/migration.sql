-- Live support: keep everything for later checks.
--   history     earlier versions of an edited message
--   deletedBy   who deleted it (MERCHANT | ADMIN); the content stays, only hidden from the shop
--   purgedAt    a super admin removed the content for good; the row stays as a tombstone
-- Additive only: new nullable columns on a table added by 20261203100000.

ALTER TABLE "live_support_messages" ADD COLUMN "history" JSONB;
ALTER TABLE "live_support_messages" ADD COLUMN "deletedBy" TEXT;
ALTER TABLE "live_support_messages" ADD COLUMN "deletedById" TEXT;
ALTER TABLE "live_support_messages" ADD COLUMN "purgedAt" TIMESTAMP(3);
ALTER TABLE "live_support_messages" ADD COLUMN "purgedById" TEXT;
