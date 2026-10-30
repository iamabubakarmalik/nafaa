-- Distribution phase 2: vans (van = WAREHOUSE shop), market returns,
-- principal claims, cheques / PDC, targets, mix schemes, stock
-- reservation of approved orders, and commission by brand / principal.
--
-- Additive only: new tables and nullable or defaulted columns. Existing
-- rows keep their meaning (isMix false, no reservation, no claim, empty
-- brand / principal filters on commission rules), so the shared sales path
-- and every business with distribution off behave exactly as before.
-- Safe to run more than once.

-- Existing tables
ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "brandIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CommissionRule" ADD COLUMN IF NOT EXISTS "supplierIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "DistributionSettings" ADD COLUMN IF NOT EXISTS "returnSeq" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DistributionSettings" ADD COLUMN IF NOT EXISTS "claimSeq" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "TradeScheme" ADD COLUMN IF NOT EXISTS "isMix" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SalesOrder" ADD COLUMN IF NOT EXISTS "vanSessionId" TEXT;
ALTER TABLE "SalesOrder" ADD COLUMN IF NOT EXISTS "reservation" JSONB;
ALTER TABLE "SalesOrder" ADD COLUMN IF NOT EXISTS "reservedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "SalesOrder_vanSessionId_idx" ON "SalesOrder"("vanSessionId");

ALTER TABLE "SalesOrderItem" ADD COLUMN IF NOT EXISTS "claimId" TEXT;
CREATE INDEX IF NOT EXISTS "SalesOrderItem_claimId_idx" ON "SalesOrderItem"("claimId");

ALTER TABLE "DistCollection" ADD COLUMN IF NOT EXISTS "chequeId" TEXT;
ALTER TABLE "DistCollection" ADD COLUMN IF NOT EXISTS "vanSessionId" TEXT;
CREATE INDEX IF NOT EXISTS "DistCollection_vanSessionId_idx" ON "DistCollection"("vanSessionId");

-- Vans
CREATE TABLE IF NOT EXISTS "DistVan" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "vehicleNo" TEXT,
  "shopId" TEXT NOT NULL,
  "homeShopId" TEXT,
  "salesmanId" TEXT,
  "routeId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DistVan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DistVan_shopId_key" ON "DistVan"("shopId");
CREATE UNIQUE INDEX IF NOT EXISTS "DistVan_tenantId_name_key" ON "DistVan"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "DistVan_tenantId_isActive_idx" ON "DistVan"("tenantId", "isActive");

CREATE TABLE IF NOT EXISTS "DistVanSession" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "vanId" TEXT NOT NULL,
  "dayKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "salesmanId" TEXT,
  "openingStock" JSONB,
  "loadTransferIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "unloadTransferId" TEXT,
  "reconciliation" JSONB,
  "varianceRef" TEXT,
  "expectedCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "handedIn" DOUBLE PRECISION,
  "shortAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "openedById" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedById" TEXT,
  "closedAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DistVanSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DistVanSession_tenantId_vanId_status_idx" ON "DistVanSession"("tenantId", "vanId", "status");
CREATE INDEX IF NOT EXISTS "DistVanSession_tenantId_dayKey_idx" ON "DistVanSession"("tenantId", "dayKey");
DO $$ BEGIN
  ALTER TABLE "DistVanSession" ADD CONSTRAINT "DistVanSession_vanId_fkey" FOREIGN KEY ("vanId") REFERENCES "DistVan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- One open day per van at a time.
CREATE UNIQUE INDEX IF NOT EXISTS "DistVanSession_one_open_per_van" ON "DistVanSession"("vanId") WHERE "status" = 'OPEN';

-- Market returns
CREATE TABLE IF NOT EXISTS "DistMarketReturn" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "clientRef" TEXT,
  "customerId" TEXT NOT NULL,
  "routeId" TEXT,
  "shopId" TEXT,
  "vanSessionId" TEXT,
  "collectedById" TEXT NOT NULL,
  "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "creditedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectReason" TEXT,
  "saleReturnIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "ledgerId" TEXT,
  "note" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DistMarketReturn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DistMarketReturn_tenantId_number_key" ON "DistMarketReturn"("tenantId", "number");
CREATE UNIQUE INDEX IF NOT EXISTS "DistMarketReturn_tenantId_clientRef_key" ON "DistMarketReturn"("tenantId", "clientRef");
CREATE INDEX IF NOT EXISTS "DistMarketReturn_tenantId_status_idx" ON "DistMarketReturn"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "DistMarketReturn_tenantId_customerId_idx" ON "DistMarketReturn"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "DistMarketReturn_tenantId_collectedAt_idx" ON "DistMarketReturn"("tenantId", "collectedAt");

CREATE TABLE IF NOT EXISTS "DistMarketReturnItem" (
  "id" TEXT NOT NULL,
  "marketReturnId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "unitId" TEXT,
  "unitName" TEXT,
  "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "qty" DOUBLE PRECISION NOT NULL,
  "baseQty" DOUBLE PRECISION NOT NULL,
  "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "costValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "condition" TEXT NOT NULL DEFAULT 'GOOD',
  "reason" TEXT,
  "batchNo" TEXT,
  "expiryDate" TIMESTAMP(3),
  "claimable" BOOLEAN NOT NULL DEFAULT false,
  "supplierId" TEXT,
  "matchedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "claimId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "DistMarketReturnItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DistMarketReturnItem_marketReturnId_idx" ON "DistMarketReturnItem"("marketReturnId");
CREATE INDEX IF NOT EXISTS "DistMarketReturnItem_claimId_idx" ON "DistMarketReturnItem"("claimId");
DO $$ BEGIN
  ALTER TABLE "DistMarketReturnItem" ADD CONSTRAINT "DistMarketReturnItem_marketReturnId_fkey" FOREIGN KEY ("marketReturnId") REFERENCES "DistMarketReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Principals and claims
CREATE TABLE IF NOT EXISTS "DistPrincipalBrand" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DistPrincipalBrand_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DistPrincipalBrand_tenantId_brandId_key" ON "DistPrincipalBrand"("tenantId", "brandId");
CREATE INDEX IF NOT EXISTS "DistPrincipalBrand_tenantId_supplierId_idx" ON "DistPrincipalBrand"("tenantId", "supplierId");

CREATE TABLE IF NOT EXISTS "DistClaim" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "fromKey" TEXT NOT NULL,
  "toKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "schemeDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "freeGoodsValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "returnsValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lines" JSONB,
  "reference" TEXT,
  "submittedAt" TIMESTAMP(3),
  "submittedById" TEXT,
  "receivedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "receivedAt" TIMESTAMP(3),
  "incomeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "note" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DistClaim_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DistClaim_tenantId_number_key" ON "DistClaim"("tenantId", "number");
CREATE INDEX IF NOT EXISTS "DistClaim_tenantId_supplierId_status_idx" ON "DistClaim"("tenantId", "supplierId", "status");

-- Cheques
CREATE TABLE IF NOT EXISTS "DistCheque" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "collectionId" TEXT,
  "bankName" TEXT NOT NULL,
  "chequeNo" TEXT NOT NULL,
  "chequeDate" TIMESTAMP(3) NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "receivedById" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "depositedAt" TIMESTAMP(3),
  "moneyAccountId" TEXT,
  "clearedAt" TIMESTAMP(3),
  "bouncedAt" TIMESTAMP(3),
  "bounceReason" TEXT,
  "bounceLedgerId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DistCheque_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DistCheque_collectionId_key" ON "DistCheque"("collectionId");
CREATE INDEX IF NOT EXISTS "DistCheque_tenantId_status_idx" ON "DistCheque"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "DistCheque_tenantId_chequeDate_idx" ON "DistCheque"("tenantId", "chequeDate");
CREATE INDEX IF NOT EXISTS "DistCheque_tenantId_customerId_idx" ON "DistCheque"("tenantId", "customerId");

-- Targets
CREATE TABLE IF NOT EXISTS "DistTarget" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "userId" TEXT,
  "routeId" TEXT,
  "brandId" TEXT,
  "supplierId" TEXT,
  "metric" TEXT NOT NULL DEFAULT 'VALUE',
  "target" DOUBLE PRECISION NOT NULL,
  "unitName" TEXT,
  "note" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DistTarget_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DistTarget_tenantId_period_idx" ON "DistTarget"("tenantId", "period");
CREATE INDEX IF NOT EXISTS "DistTarget_tenantId_userId_idx" ON "DistTarget"("tenantId", "userId");
