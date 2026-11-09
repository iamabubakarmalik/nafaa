-- Stock forecast snapshots and the customer portal (links + requests). Additive only.

CREATE TABLE IF NOT EXISTS "StockForecastSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "rows" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockForecastSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "StockForecastSnapshot_tenantId_scopeKey_key" ON "StockForecastSnapshot"("tenantId", "scopeKey");
CREATE INDEX IF NOT EXISTS "StockForecastSnapshot_computedAt_idx" ON "StockForecastSnapshot"("computedAt");

CREATE TABLE IF NOT EXISTS "CustomerPortalLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "channelOrderId" TEXT,
    "phone" TEXT,
    "createdById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "lastOpenedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerPortalLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerPortalLink_token_key" ON "CustomerPortalLink"("token");
CREATE INDEX IF NOT EXISTS "CustomerPortalLink_tenantId_channelOrderId_idx" ON "CustomerPortalLink"("tenantId", "channelOrderId");
CREATE INDEX IF NOT EXISTS "CustomerPortalLink_tenantId_phone_idx" ON "CustomerPortalLink"("tenantId", "phone");

CREATE TABLE IF NOT EXISTS "CustomerPortalRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "channelOrderId" TEXT NOT NULL,
    "linkId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT,
    "note" TEXT,
    "items" JSONB,
    "photos" JSONB,
    "pickup" JSONB,
    "address" JSONB,
    "decisionNote" TEXT,
    "refundNote" TEXT,
    "refundAmount" DOUBLE PRECISION,
    "resultOrderId" TEXT,
    "pickupCourier" TEXT,
    "pickupTracking" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerPortalRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CustomerPortalRequest_tenantId_status_createdAt_idx" ON "CustomerPortalRequest"("tenantId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "CustomerPortalRequest_channelOrderId_idx" ON "CustomerPortalRequest"("channelOrderId");
