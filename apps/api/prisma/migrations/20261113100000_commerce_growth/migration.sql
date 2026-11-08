-- Commerce phase 4: abandoned checkouts. Additive only; a new table, no backfill needed.

CREATE TABLE IF NOT EXISTS "abandoned_checkouts" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shopId" TEXT,
  "integrationId" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "name" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "phoneKey" TEXT,
  "customerEmail" TEXT,
  "customerCity" TEXT,
  "items" JSONB NOT NULL,
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT,
  "recoveryUrl" TEXT,
  "abandonedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "contactedAt" TIMESTAMP(3),
  "contactedById" TEXT,
  "contactCount" INTEGER NOT NULL DEFAULT 0,
  "recoveredOrderId" TEXT,
  "recoveredAt" TIMESTAMP(3),
  "recoveredValue" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "abandoned_checkouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "abandoned_checkouts_integrationId_externalId_key" ON "abandoned_checkouts"("integrationId", "externalId");
CREATE INDEX IF NOT EXISTS "abandoned_checkouts_tenantId_abandonedAt_idx" ON "abandoned_checkouts"("tenantId", "abandonedAt");
CREATE INDEX IF NOT EXISTS "abandoned_checkouts_tenantId_phoneKey_idx" ON "abandoned_checkouts"("tenantId", "phoneKey");
