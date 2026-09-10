-- Electronics serial ab kisi shop se juda hota hai, aur sale ki line se bhi.

-- AlterTable
ALTER TABLE "ElectronicsSerialTracking" ADD COLUMN "shopId" TEXT;
ALTER TABLE "ElectronicsSerialTracking" ADD COLUMN "saleItemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicsSerialTracking_saleItemId_key" ON "ElectronicsSerialTracking"("saleItemId");
CREATE INDEX "ElectronicsSerialTracking_shopId_idx" ON "ElectronicsSerialTracking"("shopId");
CREATE INDEX "ElectronicsSerialTracking_tenantId_shopId_status_idx" ON "ElectronicsSerialTracking"("tenantId", "shopId", "status");

-- BACKFILL: purane serials ko unke tenant ki pehli active shop se joro,
-- taake mojooda ginti waisi hi rahe jaisi ab tak thi.
UPDATE "ElectronicsSerialTracking" es
SET "shopId" = (
  SELECT s."id" FROM "Shop" s
  WHERE s."tenantId" = es."tenantId" AND s."isActive" = true
  ORDER BY s."createdAt" ASC
  LIMIT 1
)
WHERE es."shopId" IS NULL;
