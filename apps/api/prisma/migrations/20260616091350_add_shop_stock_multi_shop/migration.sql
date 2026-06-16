-- CreateTable
CREATE TABLE "ShopStock" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lowStockAlert" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "shopPrice" DOUBLE PRECISION,
    "shopCostPrice" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopStock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopStock_tenantId_idx" ON "ShopStock"("tenantId");

-- CreateIndex
CREATE INDEX "ShopStock_shopId_idx" ON "ShopStock"("shopId");

-- CreateIndex
CREATE INDEX "ShopStock_productId_idx" ON "ShopStock"("productId");

-- CreateIndex
CREATE INDEX "ShopStock_variantId_idx" ON "ShopStock"("variantId");

-- CreateIndex
CREATE INDEX "ShopStock_shopId_productId_idx" ON "ShopStock"("shopId", "productId");

-- CreateIndex
CREATE INDEX "ShopStock_shopId_stock_idx" ON "ShopStock"("shopId", "stock");

-- CreateIndex
CREATE UNIQUE INDEX "ShopStock_shopId_productId_variantId_key" ON "ShopStock"("shopId", "productId", "variantId");

-- AddForeignKey
ALTER TABLE "ShopStock" ADD CONSTRAINT "ShopStock_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopStock" ADD CONSTRAINT "ShopStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopStock" ADD CONSTRAINT "ShopStock_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
