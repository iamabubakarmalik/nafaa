-- Used phone bhi ab dusri shop bheja ja sakta hai.

-- AlterEnum: rah me wali haalat (kahin nahi bikta)
ALTER TYPE "UsedPhoneStatus" ADD VALUE IF NOT EXISTS 'IN_TRANSIT';

-- AlterTable
ALTER TABLE "StockTransferItem" ADD COLUMN "usedPhoneId" TEXT;

-- Used phone bhejte waqt product nahi hota
ALTER TABLE "StockTransferItem" ALTER COLUMN "productId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "StockTransferItem_usedPhoneId_idx" ON "StockTransferItem"("usedPhoneId");

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_usedPhoneId_fkey" FOREIGN KEY ("usedPhoneId") REFERENCES "UsedPhone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
