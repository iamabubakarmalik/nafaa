-- CreateEnum
CREATE TYPE "ShopType" AS ENUM ('SHOP', 'WAREHOUSE', 'GODOWN');

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "type" "ShopType" NOT NULL DEFAULT 'SHOP';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "shopId" TEXT;

-- CreateIndex
CREATE INDEX "User_shopId_idx" ON "User"("shopId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
