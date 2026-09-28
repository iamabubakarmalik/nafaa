-- Online orders: sale ka source + channel order ki timeline.
-- Sab additive hai. Purani sales DEFAULT 'POS' se khud backfill ho jati hain.

-- CreateEnum
CREATE TYPE "SaleSource" AS ENUM ('POS', 'WEBSITE', 'DARAZ', 'FOODPANDA', 'SHOPIFY', 'MARKETPLACE');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "source" "SaleSource" NOT NULL DEFAULT 'POS',
ADD COLUMN "sourceRef" TEXT;

-- Pehle se online se bani sales (convertToSale "CH-" number deta tha)
UPDATE "Sale" s
SET "source" = CASE i."type"
    WHEN 'DARAZ' THEN 'DARAZ'::"SaleSource"
    WHEN 'FOODPANDA' THEN 'FOODPANDA'::"SaleSource"
    WHEN 'SHOPIFY' THEN 'SHOPIFY'::"SaleSource"
    ELSE 'WEBSITE'::"SaleSource"
  END,
  "sourceRef" = COALESCE(co."externalOrderNumber", co."externalOrderId")
FROM "channel_orders" co
JOIN "integrations" i ON i."id" = co."integrationId"
WHERE co."nafaaSaleId" = s."id";

-- CreateIndex
CREATE INDEX "Sale_tenantId_source_soldAt_idx" ON "Sale"("tenantId", "source", "soldAt");

-- AlterTable
ALTER TABLE "channel_orders" ADD COLUMN "acceptedAt" TIMESTAMP(3),
ADD COLUMN "dispatchedAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancelReason" TEXT,
ADD COLUMN "paymentReceivedAt" TIMESTAMP(3),
ADD COLUMN "courierName" TEXT,
ADD COLUMN "trackingNumber" TEXT;

-- Pehle se confirm hue orders ka acceptedAt
UPDATE "channel_orders" SET "acceptedAt" = "processedAt" WHERE "nafaaSaleId" IS NOT NULL AND "acceptedAt" IS NULL;

-- CreateIndex
CREATE INDEX "channel_orders_tenantId_receivedAt_idx" ON "channel_orders"("tenantId", "receivedAt");
