-- CreateEnum
CREATE TYPE "CarpetRollStatus" AS ENUM ('ACTIVE', 'FINISHED', 'DAMAGED', 'RESERVED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "CarpetCutPieceStatus" AS ENUM ('AVAILABLE', 'SOLD', 'DAMAGED', 'RESERVED');

-- CreateEnum
CREATE TYPE "CarpetRollSource" AS ENUM ('OPENING_STOCK', 'PURCHASE', 'TRANSFER_IN', 'RETURN', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CarpetCutPieceSource" AS ENUM ('LEFTOVER', 'CUSTOMER_RETURN', 'DAMAGED_ROLL', 'OPENING_STOCK', 'MANUAL');

-- CreateTable
CREATE TABLE "CarpetRoll" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "rollNumber" TEXT NOT NULL,
    "designCode" TEXT,
    "widthFt" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "widthInch" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "originalLengthFt" DOUBLE PRECISION NOT NULL,
    "remainingLengthFt" DOUBLE PRECISION NOT NULL,
    "originalSqft" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingSqft" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costPerSqft" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salePricePerSqft" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wholesalePricePerSqft" DOUBLE PRECISION,
    "status" "CarpetRollStatus" NOT NULL DEFAULT 'ACTIVE',
    "sourceType" "CarpetRollSource" NOT NULL DEFAULT 'OPENING_STOCK',
    "purchaseId" TEXT,
    "purchaseItemId" TEXT,
    "supplierId" TEXT,
    "rackNumber" TEXT,
    "notes" TEXT,
    "quality" TEXT,
    "pile" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarpetRoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarpetCutPiece" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "sourceRollId" TEXT,
    "sourceType" "CarpetCutPieceSource" NOT NULL DEFAULT 'LEFTOVER',
    "pieceCode" TEXT NOT NULL,
    "widthFt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "widthInch" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lengthFt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lengthInch" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSqft" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pricePerSqft" DOUBLE PRECISION,
    "status" "CarpetCutPieceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "condition" TEXT,
    "rackNumber" TEXT,
    "notes" TEXT,
    "saleItemId" TEXT,
    "soldAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarpetCutPiece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarpetRollMovement" (
    "id" TEXT NOT NULL,
    "rollId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "lengthFt" DOUBLE PRECISION NOT NULL,
    "sqft" DOUBLE PRECISION NOT NULL,
    "balanceLengthAfter" DOUBLE PRECISION NOT NULL,
    "balanceSqftAfter" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "saleId" TEXT,
    "saleItemId" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarpetRollMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarpetRoll_tenantId_idx" ON "CarpetRoll"("tenantId");

-- CreateIndex
CREATE INDEX "CarpetRoll_tenantId_status_idx" ON "CarpetRoll"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CarpetRoll_shopId_idx" ON "CarpetRoll"("shopId");

-- CreateIndex
CREATE INDEX "CarpetRoll_productId_idx" ON "CarpetRoll"("productId");

-- CreateIndex
CREATE INDEX "CarpetRoll_variantId_idx" ON "CarpetRoll"("variantId");

-- CreateIndex
CREATE INDEX "CarpetRoll_tenantId_shopId_status_idx" ON "CarpetRoll"("tenantId", "shopId", "status");

-- CreateIndex
CREATE INDEX "CarpetRoll_rollNumber_idx" ON "CarpetRoll"("rollNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CarpetRoll_tenantId_rollNumber_key" ON "CarpetRoll"("tenantId", "rollNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CarpetCutPiece_saleItemId_key" ON "CarpetCutPiece"("saleItemId");

-- CreateIndex
CREATE INDEX "CarpetCutPiece_tenantId_idx" ON "CarpetCutPiece"("tenantId");

-- CreateIndex
CREATE INDEX "CarpetCutPiece_tenantId_status_idx" ON "CarpetCutPiece"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CarpetCutPiece_shopId_idx" ON "CarpetCutPiece"("shopId");

-- CreateIndex
CREATE INDEX "CarpetCutPiece_productId_idx" ON "CarpetCutPiece"("productId");

-- CreateIndex
CREATE INDEX "CarpetCutPiece_sourceRollId_idx" ON "CarpetCutPiece"("sourceRollId");

-- CreateIndex
CREATE UNIQUE INDEX "CarpetCutPiece_tenantId_pieceCode_key" ON "CarpetCutPiece"("tenantId", "pieceCode");

-- CreateIndex
CREATE INDEX "CarpetRollMovement_rollId_idx" ON "CarpetRollMovement"("rollId");

-- CreateIndex
CREATE INDEX "CarpetRollMovement_tenantId_idx" ON "CarpetRollMovement"("tenantId");

-- CreateIndex
CREATE INDEX "CarpetRollMovement_tenantId_createdAt_idx" ON "CarpetRollMovement"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "CarpetRollMovement_saleId_idx" ON "CarpetRollMovement"("saleId");

-- AddForeignKey
ALTER TABLE "CarpetRoll" ADD CONSTRAINT "CarpetRoll_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarpetRoll" ADD CONSTRAINT "CarpetRoll_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarpetRoll" ADD CONSTRAINT "CarpetRoll_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarpetRoll" ADD CONSTRAINT "CarpetRoll_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarpetCutPiece" ADD CONSTRAINT "CarpetCutPiece_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarpetCutPiece" ADD CONSTRAINT "CarpetCutPiece_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarpetCutPiece" ADD CONSTRAINT "CarpetCutPiece_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarpetCutPiece" ADD CONSTRAINT "CarpetCutPiece_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarpetCutPiece" ADD CONSTRAINT "CarpetCutPiece_sourceRollId_fkey" FOREIGN KEY ("sourceRollId") REFERENCES "CarpetRoll"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarpetRollMovement" ADD CONSTRAINT "CarpetRollMovement_rollId_fkey" FOREIGN KEY ("rollId") REFERENCES "CarpetRoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
