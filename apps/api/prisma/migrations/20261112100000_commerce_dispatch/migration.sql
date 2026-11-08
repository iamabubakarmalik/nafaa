-- Commerce phase 3: dispatch. Additive only: a new table for courier loadsheets.

CREATE TABLE IF NOT EXISTS "courier_loadsheets" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "courierCode" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "orderIds" JSONB NOT NULL,
  "trackingNumbers" JSONB NOT NULL,
  "parcels" INTEGER NOT NULL DEFAULT 0,
  "pieces" INTEGER NOT NULL DEFAULT 0,
  "codTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "source" TEXT NOT NULL DEFAULT 'NAFAA',
  "externalRef" TEXT,
  "apiError" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "courier_loadsheets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "courier_loadsheets_tenantId_day_idx" ON "courier_loadsheets"("tenantId", "day");
CREATE INDEX IF NOT EXISTS "courier_loadsheets_tenantId_courierCode_day_idx" ON "courier_loadsheets"("tenantId", "courierCode", "day");
