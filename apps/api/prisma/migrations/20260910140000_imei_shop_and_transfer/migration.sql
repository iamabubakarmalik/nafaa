-- IMEI ab kisi shop se juda hota hai, aur transfer item me device ja sakta hai.

-- AlterTable
ALTER TABLE "ProductImei" ADD COLUMN "shopId" TEXT;

-- AlterTable
ALTER TABLE "StockTransferItem" ADD COLUMN "imeiId" TEXT;

-- CreateIndex
CREATE INDEX "ProductImei_shopId_idx" ON "ProductImei"("shopId");

-- CreateIndex
CREATE INDEX "StockTransferItem_imeiId_idx" ON "StockTransferItem"("imeiId");

-- AddForeignKey
ALTER TABLE "ProductImei" ADD CONSTRAINT "ProductImei_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_imeiId_fkey" FOREIGN KEY ("imeiId") REFERENCES "ProductImei"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- BACKFILL: purane IMEIs ko unke tenant ki pehli active shop se joro.
-- Yehi wo shop hai jise ab tak code "first shop" maan kar istemal kar raha tha,
-- is liye mojooda hisab kitab waisa hi rahega.
UPDATE "ProductImei" pi
SET "shopId" = (
  SELECT s."id" FROM "Shop" s
  WHERE s."tenantId" = pi."tenantId" AND s."isActive" = true
  ORDER BY s."createdAt" ASC
  LIMIT 1
)
WHERE pi."shopId" IS NULL;
