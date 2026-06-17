-- AlterTable
ALTER TABLE "StockTransferItem" ADD COLUMN     "carpetRollId" TEXT;

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_carpetRollId_fkey" FOREIGN KEY ("carpetRollId") REFERENCES "CarpetRoll"("id") ON DELETE SET NULL ON UPDATE CASCADE;
