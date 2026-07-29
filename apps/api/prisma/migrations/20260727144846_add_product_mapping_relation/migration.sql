-- CreateIndex
CREATE INDEX "product_channel_mappings_productId_idx" ON "product_channel_mappings"("productId");

-- AddForeignKey
ALTER TABLE "product_channel_mappings" ADD CONSTRAINT "product_channel_mappings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
