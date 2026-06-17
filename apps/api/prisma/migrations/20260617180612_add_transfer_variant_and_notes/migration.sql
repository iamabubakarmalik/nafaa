-- AlterTable
ALTER TABLE "StockTransferItem" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "variantId" TEXT;

-- CreateIndex
CREATE INDEX "StockTransferItem_carpetRollId_idx" ON "StockTransferItem"("carpetRollId");
