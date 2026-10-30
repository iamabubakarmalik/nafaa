-- Trade network: shops on Nafaa order from their distributor or wholesaler on
-- Nafaa, and orders, deliveries, receiving and payments flow between the two
-- accounts through a link record.
--
-- Additive only. Nothing existing changes:
--   * SalesOrder.source is a new nullable column; existing orders stay null
--     (booked in the field or office). No backfill is needed.
--   * Five new tables. They stay empty until a business sends or approves a
--     link request.
-- The trade.* permissions are defaults for new managers only; owners always
-- have them. Safe to run more than once.

ALTER TABLE "SalesOrder" ADD COLUMN IF NOT EXISTS "source" TEXT;

CREATE TABLE IF NOT EXISTS "TradeLink" (
  "id" TEXT NOT NULL,
  "sellerTenantId" TEXT NOT NULL,
  "buyerTenantId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedVia" TEXT NOT NULL DEFAULT 'CODE',
  "requestedById" TEXT,
  "requestNote" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedById" TEXT,
  "decidedAt" TIMESTAMP(3),
  "rejectReason" TEXT,
  "activatedAt" TIMESTAMP(3),
  "closedBy" TEXT,
  "customerId" TEXT,
  "supplierId" TEXT,
  "bookedById" TEXT,
  "autoReceive" BOOLEAN NOT NULL DEFAULT false,
  "receiveShopId" TEXT,
  "paymentsScanAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TradeLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TradeLink_sellerTenantId_buyerTenantId_key" ON "TradeLink"("sellerTenantId", "buyerTenantId");
CREATE INDEX IF NOT EXISTS "TradeLink_buyerTenantId_status_idx" ON "TradeLink"("buyerTenantId", "status");
CREATE INDEX IF NOT EXISTS "TradeLink_sellerTenantId_status_idx" ON "TradeLink"("sellerTenantId", "status");

CREATE TABLE IF NOT EXISTS "TradeProfile" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "inviteCode" TEXT NOT NULL,
  "acceptRequests" BOOLEAN NOT NULL DEFAULT true,
  "listed" BOOLEAN NOT NULL DEFAULT false,
  "displayName" TEXT,
  "phone" TEXT,
  "city" TEXT,
  "area" TEXT,
  "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "brands" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "about" TEXT,
  "minOrderValue" DOUBLE PRECISION,
  "catalogScope" TEXT NOT NULL DEFAULT 'ALL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TradeProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TradeProfile_tenantId_key" ON "TradeProfile"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "TradeProfile_inviteCode_key" ON "TradeProfile"("inviteCode");
CREATE INDEX IF NOT EXISTS "TradeProfile_listed_city_idx" ON "TradeProfile"("listed", "city");

CREATE TABLE IF NOT EXISTS "TradeOrder" (
  "id" TEXT NOT NULL,
  "linkId" TEXT NOT NULL,
  "buyerTenantId" TEXT NOT NULL,
  "sellerTenantId" TEXT NOT NULL,
  "clientRef" TEXT,
  "salesOrderId" TEXT,
  "orderNumber" TEXT,
  "placedById" TEXT,
  "status" TEXT NOT NULL DEFAULT 'BOOKED',
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "invoiceNumber" TEXT,
  "invoiceTotal" DOUBLE PRECISION,
  "returnsValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "deliveredValue" DOUBLE PRECISION,
  "cashAtDelivery" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "note" TEXT,
  "lines" JSONB,
  "receiveState" TEXT NOT NULL DEFAULT 'NONE',
  "purchaseId" TEXT,
  "receivedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "invoicedAt" TIMESTAMP(3),
  "loadedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "syncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TradeOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TradeOrder_salesOrderId_key" ON "TradeOrder"("salesOrderId");
CREATE UNIQUE INDEX IF NOT EXISTS "TradeOrder_purchaseId_key" ON "TradeOrder"("purchaseId");
CREATE UNIQUE INDEX IF NOT EXISTS "TradeOrder_buyerTenantId_clientRef_key" ON "TradeOrder"("buyerTenantId", "clientRef");
CREATE INDEX IF NOT EXISTS "TradeOrder_buyerTenantId_createdAt_idx" ON "TradeOrder"("buyerTenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "TradeOrder_sellerTenantId_createdAt_idx" ON "TradeOrder"("sellerTenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "TradeOrder_linkId_status_idx" ON "TradeOrder"("linkId", "status");
CREATE INDEX IF NOT EXISTS "TradeOrder_status_idx" ON "TradeOrder"("status");

CREATE TABLE IF NOT EXISTS "TradeProductMap" (
  "id" TEXT NOT NULL,
  "linkId" TEXT NOT NULL,
  "buyerTenantId" TEXT NOT NULL,
  "sellerProductId" TEXT NOT NULL,
  "sellerVariantId" TEXT NOT NULL DEFAULT '',
  "buyerProductId" TEXT NOT NULL,
  "buyerVariantId" TEXT,
  "matchedBy" TEXT NOT NULL DEFAULT 'MANUAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TradeProductMap_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TradeProductMap_linkId_sellerProductId_sellerVariantId_key" ON "TradeProductMap"("linkId", "sellerProductId", "sellerVariantId");
CREATE INDEX IF NOT EXISTS "TradeProductMap_buyerTenantId_buyerProductId_idx" ON "TradeProductMap"("buyerTenantId", "buyerProductId");

CREATE TABLE IF NOT EXISTS "TradePayment" (
  "id" TEXT NOT NULL,
  "linkId" TEXT NOT NULL,
  "sellerTenantId" TEXT NOT NULL,
  "buyerTenantId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "amount" DOUBLE PRECISION NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'CASH',
  "reference" TEXT,
  "note" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tradeOrderId" TEXT,
  "sellerLedgerId" TEXT,
  "buyerLedgerId" TEXT,
  "recordedById" TEXT,
  "decidedById" TEXT,
  "decidedAt" TIMESTAMP(3),
  "disputeReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TradePayment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TradePayment_sellerLedgerId_key" ON "TradePayment"("sellerLedgerId");
CREATE UNIQUE INDEX IF NOT EXISTS "TradePayment_buyerLedgerId_key" ON "TradePayment"("buyerLedgerId");
CREATE INDEX IF NOT EXISTS "TradePayment_linkId_status_idx" ON "TradePayment"("linkId", "status");
CREATE INDEX IF NOT EXISTS "TradePayment_sellerTenantId_status_idx" ON "TradePayment"("sellerTenantId", "status");
CREATE INDEX IF NOT EXISTS "TradePayment_buyerTenantId_status_idx" ON "TradePayment"("buyerTenantId", "status");

DO $$ BEGIN
  ALTER TABLE "TradeOrder" ADD CONSTRAINT "TradeOrder_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "TradeLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TradeProductMap" ADD CONSTRAINT "TradeProductMap_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "TradeLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TradePayment" ADD CONSTRAINT "TradePayment_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "TradeLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
