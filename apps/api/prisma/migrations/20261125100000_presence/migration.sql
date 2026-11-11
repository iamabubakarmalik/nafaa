-- Presence for the admin panel: when each user and shop was last active and
-- from which app. Additive (nullable columns + index), backfilled from the
-- last sign-in and the last sale so existing shops show a sensible value.

ALTER TABLE "User" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "lastSeenVia" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "lastActiveAt" TIMESTAMP(3);
CREATE INDEX "Tenant_lastActiveAt_idx" ON "Tenant"("lastActiveAt");

UPDATE "User" SET "lastSeenAt" = "lastLoginAt" WHERE "lastSeenAt" IS NULL AND "lastLoginAt" IS NOT NULL;

UPDATE "Tenant" t SET "lastActiveAt" = x.at
FROM (
  SELECT t2.id, GREATEST(
    (SELECT MAX(u."lastLoginAt") FROM "User" u WHERE u."tenantId" = t2.id),
    (SELECT MAX(s."soldAt") FROM "Sale" s WHERE s."tenantId" = t2.id)
  ) AS at
  FROM "Tenant" t2
) x
WHERE t.id = x.id AND t."lastActiveAt" IS NULL AND x.at IS NOT NULL;
