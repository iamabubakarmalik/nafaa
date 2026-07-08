-- AlterTable
ALTER TABLE "StockAdjustment" ADD COLUMN     "carpetRollId" TEXT,
ADD COLUMN     "imeiId" TEXT,
ADD COLUMN     "variantId" TEXT;

-- CreateIndex
CREATE INDEX "StockAdjustment_variantId_idx" ON "StockAdjustment"("variantId");

-- CreateIndex
CREATE INDEX "StockAdjustment_carpetRollId_idx" ON "StockAdjustment"("carpetRollId");

-- CreateIndex
CREATE INDEX "StockAdjustment_imeiId_idx" ON "StockAdjustment"("imeiId");

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_carpetRollId_fkey" FOREIGN KEY ("carpetRollId") REFERENCES "CarpetRoll"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_imeiId_fkey" FOREIGN KEY ("imeiId") REFERENCES "ProductImei"("id") ON DELETE SET NULL ON UPDATE CASCADE;
