-- CreateIndex
CREATE INDEX "CarpetRollMovement_saleItemId_idx" ON "CarpetRollMovement"("saleItemId");

-- AddForeignKey
ALTER TABLE "CarpetRollMovement" ADD CONSTRAINT "CarpetRollMovement_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
