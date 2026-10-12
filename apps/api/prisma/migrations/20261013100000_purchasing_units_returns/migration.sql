-- Purchasing: buy in any unit (carton, box, pack), buy raw materials,
-- order then receive (in parts), return goods to the supplier.

ALTER TYPE "PurchaseStatus" ADD VALUE IF NOT EXISTS 'PARTIAL';
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'PURCHASE_RETURN';

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isRawMaterial" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Purchase"
  ADD COLUMN "supplierInvoiceNo" TEXT,
  ADD COLUMN "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "receivedValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "returnedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "dueDate" TIMESTAMP(3),
  ADD COLUMN "expectedAt" TIMESTAMP(3),
  ADD COLUMN "receivedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelReason" TEXT;

-- Every existing purchase was received in full when it was made.
UPDATE "Purchase" SET "receivedValue" = "total", "receivedAt" = "purchasedAt" WHERE "status" = 'RECEIVED';

ALTER TABLE "PurchaseItem"
  ALTER COLUMN "productId" DROP NOT NULL,
  ADD COLUMN "variantId" TEXT,
  ADD COLUMN "ingredientId" TEXT,
  ADD COLUMN "itemName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "unitId" TEXT,
  ADD COLUMN "unitName" TEXT NOT NULL DEFAULT 'pcs',
  ADD COLUMN "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN "baseQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "receivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "returnedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "batchNo" TEXT,
  ADD COLUMN "expiryDate" TIMESTAMP(3);

-- Old lines were in the product's base unit.
UPDATE "PurchaseItem" pi SET
  "baseQuantity" = pi."quantity",
  "unitName" = COALESCE(p."unit", 'pcs'),
  "itemName" = COALESCE(p."name", '')
FROM "Product" p WHERE p."id" = pi."productId";
UPDATE "PurchaseItem" pi SET "receivedQty" = pi."baseQuantity"
FROM "Purchase" pu WHERE pu."id" = pi."purchaseId" AND pu."status" = 'RECEIVED';

ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_ingredientId_fkey"
  FOREIGN KEY ("ingredientId") REFERENCES "BakeryIngredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "PurchaseItem_ingredientId_idx" ON "PurchaseItem"("ingredientId");

CREATE TABLE "PurchaseReturn" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "purchaseId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "shopId" TEXT,
  "createdById" TEXT,
  "returnNumber" TEXT NOT NULL,
  "total" DOUBLE PRECISION NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseReturn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PurchaseReturn_tenantId_returnNumber_key" ON "PurchaseReturn"("tenantId", "returnNumber");
CREATE INDEX "PurchaseReturn_tenantId_idx" ON "PurchaseReturn"("tenantId");
CREATE INDEX "PurchaseReturn_purchaseId_idx" ON "PurchaseReturn"("purchaseId");
ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_purchaseId_fkey"
  FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PurchaseReturnItem" (
  "id" TEXT NOT NULL,
  "returnId" TEXT NOT NULL,
  "purchaseItemId" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "PurchaseReturnItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PurchaseReturnItem_returnId_idx" ON "PurchaseReturnItem"("returnId");
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_returnId_fkey"
  FOREIGN KEY ("returnId") REFERENCES "PurchaseReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_purchaseItemId_fkey"
  FOREIGN KEY ("purchaseItemId") REFERENCES "PurchaseItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
