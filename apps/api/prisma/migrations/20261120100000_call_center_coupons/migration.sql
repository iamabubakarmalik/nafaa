-- Call center call log and coupon automation codes. Additive only.

CREATE TABLE IF NOT EXISTS "OrderCall" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "channelOrderId" TEXT,
    "phoneKey" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "agentId" TEXT,
    "outcome" TEXT NOT NULL,
    "note" TEXT,
    "callBackAt" TIMESTAMP(3),
    "followUpDoneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderCall_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OrderCall_tenantId_createdAt_idx" ON "OrderCall"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "OrderCall_tenantId_channelOrderId_idx" ON "OrderCall"("tenantId", "channelOrderId");
CREATE INDEX IF NOT EXISTS "OrderCall_tenantId_phoneKey_idx" ON "OrderCall"("tenantId", "phoneKey");
CREATE INDEX IF NOT EXISTS "OrderCall_tenantId_callBackAt_idx" ON "OrderCall"("tenantId", "callBackAt");

CREATE TABLE IF NOT EXISTS "CommerceCoupon" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "minSubtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "phoneKey" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "abandonedCheckoutId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "usedOrderId" TEXT,
    "usedOrderTotal" DOUBLE PRECISION,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommerceCoupon_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CommerceCoupon_tenantId_code_idx" ON "CommerceCoupon"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "CommerceCoupon_tenantId_kind_createdAt_idx" ON "CommerceCoupon"("tenantId", "kind", "createdAt");
CREATE INDEX IF NOT EXISTS "CommerceCoupon_tenantId_phoneKey_idx" ON "CommerceCoupon"("tenantId", "phoneKey");
CREATE INDEX IF NOT EXISTS "CommerceCoupon_abandonedCheckoutId_idx" ON "CommerceCoupon"("abandonedCheckoutId");
