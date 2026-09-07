/*
  Warnings:

  - A unique constraint covering the columns `[usedPhoneId]` on the table `SaleItem` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "productType" TEXT;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "usedPhoneId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SaleItem_usedPhoneId_key" ON "SaleItem"("usedPhoneId");

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_usedPhoneId_fkey" FOREIGN KEY ("usedPhoneId") REFERENCES "UsedPhone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
