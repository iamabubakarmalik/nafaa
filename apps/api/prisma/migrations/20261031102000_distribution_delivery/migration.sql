-- Distribution: the delivery man's report from the phone.
--
-- Additive only: one new table. The phone records what happened to each
-- invoice on the trip (delivered, partly returned, returned; cash taken);
-- the office settlement screen fills itself from it and the cash is counted
-- once, when the office settles. Existing load sheets and orders are not
-- touched. Safe to run more than once.

CREATE TABLE IF NOT EXISTS "DistDeliveryReport" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "loadSheetId" TEXT NOT NULL,
  "salesOrderId" TEXT NOT NULL,
  "reportedById" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "lines" JSONB,
  "cashCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "method" TEXT NOT NULL DEFAULT 'CASH',
  "returnReason" TEXT,
  "note" TEXT,
  "reportedAt" TIMESTAMP(3) NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "accuracyM" DOUBLE PRECISION,
  "clientRef" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "settledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DistDeliveryReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DistDeliveryReport_tenantId_salesOrderId_key" ON "DistDeliveryReport"("tenantId", "salesOrderId");
CREATE UNIQUE INDEX IF NOT EXISTS "DistDeliveryReport_tenantId_clientRef_key" ON "DistDeliveryReport"("tenantId", "clientRef");
CREATE INDEX IF NOT EXISTS "DistDeliveryReport_tenantId_loadSheetId_idx" ON "DistDeliveryReport"("tenantId", "loadSheetId");

DO $$ BEGIN
  ALTER TABLE "DistDeliveryReport" ADD CONSTRAINT "DistDeliveryReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
