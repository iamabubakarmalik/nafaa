-- Stock operations: who moved stock, which variant, at what cost; stock
-- counts and write-off value on adjustments; part receipt and audit on
-- transfers; shop-wide barcode label design. All columns are new and
-- nullable or defaulted, so existing rows keep working.

ALTER TABLE "StockMovement"
  ADD COLUMN "variantId" TEXT,
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "unitCost" DOUBLE PRECISION;
CREATE INDEX "StockMovement_tenantId_type_createdAt_idx" ON "StockMovement"("tenantId", "type", "createdAt");
CREATE INDEX "StockMovement_tenantId_productId_createdAt_idx" ON "StockMovement"("tenantId", "productId", "createdAt");

ALTER TABLE "StockAdjustment"
  ADD COLUMN "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "groupRef" TEXT,
  ADD COLUMN "systemQty" DOUBLE PRECISION,
  ADD COLUMN "countedQty" DOUBLE PRECISION;

ALTER TABLE "StockTransfer"
  ADD COLUMN "receivedById" TEXT,
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelledById" TEXT,
  ADD COLUMN "cancelReason" TEXT,
  ADD COLUMN "value" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "StockTransferItem"
  ADD COLUMN "receivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Transfers already received arrived in full.
UPDATE "StockTransferItem" i SET "receivedQty" = i."quantity"
FROM "StockTransfer" t WHERE t."id" = i."transferId" AND t."status" = 'RECEIVED';

ALTER TABLE "TenantSettings" ADD COLUMN "labelConfig" JSONB;
