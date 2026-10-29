-- Wholesale and distribution: settings, price lists, routes, trade schemes,
-- sales orders, load sheets, field collections and visits.
--
-- Additive only. Nothing existing changes:
--   * Plan.featureDistribution starts false on every plan (a paid feature the
--     admin turns on per plan).
--   * New nullable columns on Customer (price list, route, credit days, STRN,
--     licence, GPS) and SaleItem (pack, scheme) start empty, so every existing
--     customer and bill reads exactly as before. No backfill is needed.
--   * Ten new tables; distribution stays off for every business until the
--     owner switches it on (DistributionSettings.enabled).
-- The distribution.* permissions are defaults for new managers; existing
-- managers are granted them separately, with the owner's approval. Owners
-- always have them. Safe to run more than once.

ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "featureDistribution" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "priceListId" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "routeId" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "routeSeq" INTEGER;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "creditDays" INTEGER;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "businessName" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "strn" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "licenseNo" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "licenseExpiry" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
CREATE INDEX IF NOT EXISTS "Customer_tenantId_routeId_idx" ON "Customer"("tenantId", "routeId");

ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "unitName" TEXT;
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "unitQty" DOUBLE PRECISION;
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "conversionRate" DOUBLE PRECISION;
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "schemeId" TEXT;

-- ── Settings ──
CREATE TABLE IF NOT EXISTS "DistributionSettings" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "creditMode" TEXT NOT NULL DEFAULT 'WARN_THEN_PIN',
  "requireCheckIn" BOOLEAN NOT NULL DEFAULT false,
  "checkInRadiusM" INTEGER NOT NULL DEFAULT 150,
  "orderPrefix" TEXT NOT NULL DEFAULT 'SO-',
  "loadSheetPrefix" TEXT NOT NULL DEFAULT 'LS-',
  "orderSeq" INTEGER NOT NULL DEFAULT 0,
  "loadSheetSeq" INTEGER NOT NULL DEFAULT 0,
  "recoveryNeedsVerify" BOOLEAN NOT NULL DEFAULT true,
  "defaultPriceListId" TEXT,
  "defaultShopId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DistributionSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DistributionSettings_tenantId_key" ON "DistributionSettings"("tenantId");

-- ── Price lists ──
CREATE TABLE IF NOT EXISTS "PriceList" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "basedOn" TEXT NOT NULL DEFAULT 'WHOLESALE',
  "adjustPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PriceList_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PriceList_tenantId_name_key" ON "PriceList"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "PriceList_tenantId_isActive_idx" ON "PriceList"("tenantId", "isActive");

CREATE TABLE IF NOT EXISTS "PriceListItem" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "priceListId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "unitId" TEXT,
  "price" DOUBLE PRECISION NOT NULL,
  "minQty" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PriceListItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PriceListItem_priceListId_idx" ON "PriceListItem"("priceListId");
CREATE INDEX IF NOT EXISTS "PriceListItem_tenantId_productId_idx" ON "PriceListItem"("tenantId", "productId");
-- One price per list, product, variant and pack (NULL variant/pack count as one value).
CREATE UNIQUE INDEX IF NOT EXISTS "PriceListItem_list_product_variant_unit_key"
  ON "PriceListItem"("priceListId", "productId", COALESCE("variantId", ''), COALESCE("unitId", ''));

-- ── Routes ──
CREATE TABLE IF NOT EXISTS "DistRoute" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shopId" TEXT,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "area" TEXT,
  "visitDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  "bookerId" TEXT,
  "deliveryUserId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DistRoute_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DistRoute_tenantId_name_key" ON "DistRoute"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "DistRoute_tenantId_isActive_idx" ON "DistRoute"("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "DistRoute_tenantId_bookerId_idx" ON "DistRoute"("tenantId", "bookerId");

-- ── Trade schemes ──
CREATE TABLE IF NOT EXISTS "TradeScheme" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "supplierId" TEXT,
  "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "brandIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "priceListIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "buyQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "buyUnitName" TEXT,
  "freeQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "freeProductId" TEXT,
  "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "slabs" JSONB,
  "minOrderValue" DOUBLE PRECISION,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "isClaimable" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TradeScheme_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TradeScheme_tenantId_isActive_idx" ON "TradeScheme"("tenantId", "isActive");

-- ── Sales orders ──
CREATE TABLE IF NOT EXISTS "SalesOrder" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "clientRef" TEXT,
  "customerId" TEXT NOT NULL,
  "routeId" TEXT,
  "shopId" TEXT,
  "bookedById" TEXT NOT NULL,
  "priceListId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'BOOKED',
  "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "schemeDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "gpsAccuracy" DOUBLE PRECISION,
  "deliveryDate" TIMESTAMP(3),
  "note" TEXT,
  "creditWarning" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "invoiceError" TEXT,
  "cancelReason" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "saleId" TEXT,
  "invoicedAt" TIMESTAMP(3),
  "loadSheetId" TEXT,
  "deliveryStatus" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "cashCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "returnsValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "returnId" TEXT,
  "returnReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SalesOrder_saleId_key" ON "SalesOrder"("saleId");
CREATE UNIQUE INDEX IF NOT EXISTS "SalesOrder_tenantId_orderNumber_key" ON "SalesOrder"("tenantId", "orderNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "SalesOrder_tenantId_clientRef_key" ON "SalesOrder"("tenantId", "clientRef");
CREATE INDEX IF NOT EXISTS "SalesOrder_tenantId_status_idx" ON "SalesOrder"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "SalesOrder_tenantId_bookedAt_idx" ON "SalesOrder"("tenantId", "bookedAt");
CREATE INDEX IF NOT EXISTS "SalesOrder_tenantId_customerId_idx" ON "SalesOrder"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "SalesOrder_tenantId_bookedById_bookedAt_idx" ON "SalesOrder"("tenantId", "bookedById", "bookedAt");
CREATE INDEX IF NOT EXISTS "SalesOrder_tenantId_routeId_idx" ON "SalesOrder"("tenantId", "routeId");
CREATE INDEX IF NOT EXISTS "SalesOrder_loadSheetId_idx" ON "SalesOrder"("loadSheetId");

CREATE TABLE IF NOT EXISTS "SalesOrderItem" (
  "id" TEXT NOT NULL,
  "salesOrderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "unitId" TEXT,
  "unitName" TEXT,
  "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "qty" DOUBLE PRECISION NOT NULL,
  "baseQty" DOUBLE PRECISION NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "schemeDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL,
  "schemeId" TEXT,
  "schemeNote" TEXT,
  "freeBaseQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "freeProductId" TEXT,
  "saleItemId" TEXT,
  "freeSaleItemId" TEXT,
  "deliveredBaseQty" DOUBLE PRECISION,
  "deliveredFreeQty" DOUBLE PRECISION,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "SalesOrderItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SalesOrderItem_salesOrderId_idx" ON "SalesOrderItem"("salesOrderId");
CREATE INDEX IF NOT EXISTS "SalesOrderItem_productId_idx" ON "SalesOrderItem"("productId");

-- ── Load sheets ──
CREATE TABLE IF NOT EXISTS "LoadSheet" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "shopId" TEXT,
  "routeId" TEXT,
  "deliveryUserId" TEXT,
  "driverName" TEXT,
  "vehicleNo" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "invoiceCount" INTEGER NOT NULL DEFAULT 0,
  "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "expectedCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "collectedCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "recoveryCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "handedIn" DOUBLE PRECISION,
  "returnsValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "shortAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "note" TEXT,
  "dispatchedAt" TIMESTAMP(3),
  "settledById" TEXT,
  "settledAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoadSheet_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LoadSheet_tenantId_number_key" ON "LoadSheet"("tenantId", "number");
CREATE INDEX IF NOT EXISTS "LoadSheet_tenantId_status_idx" ON "LoadSheet"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "LoadSheet_tenantId_date_idx" ON "LoadSheet"("tenantId", "date");

-- ── Field collections ──
CREATE TABLE IF NOT EXISTS "DistCollection" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "loadSheetId" TEXT,
  "saleId" TEXT,
  "salesOrderId" TEXT,
  "kind" TEXT NOT NULL DEFAULT 'RECOVERY',
  "amount" DOUBLE PRECISION NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'CASH',
  "reference" TEXT,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "ledgerId" TEXT,
  "shopId" TEXT,
  "collectedById" TEXT NOT NULL,
  "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedById" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "rejectReason" TEXT,
  "clientRef" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DistCollection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DistCollection_tenantId_clientRef_key" ON "DistCollection"("tenantId", "clientRef");
CREATE INDEX IF NOT EXISTS "DistCollection_tenantId_status_idx" ON "DistCollection"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "DistCollection_tenantId_customerId_idx" ON "DistCollection"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "DistCollection_tenantId_collectedById_collectedAt_idx" ON "DistCollection"("tenantId", "collectedById", "collectedAt");
CREATE INDEX IF NOT EXISTS "DistCollection_loadSheetId_idx" ON "DistCollection"("loadSheetId");

-- ── Visits ──
CREATE TABLE IF NOT EXISTS "DistVisit" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "routeId" TEXT,
  "userId" TEXT NOT NULL,
  "checkInAt" TIMESTAMP(3) NOT NULL,
  "checkOutAt" TIMESTAMP(3),
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "accuracyM" DOUBLE PRECISION,
  "distanceM" DOUBLE PRECISION,
  "withinRadius" BOOLEAN,
  "outcome" TEXT NOT NULL,
  "noOrderReason" TEXT,
  "note" TEXT,
  "salesOrderId" TEXT,
  "photoUrl" TEXT,
  "clientRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DistVisit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DistVisit_tenantId_clientRef_key" ON "DistVisit"("tenantId", "clientRef");
CREATE INDEX IF NOT EXISTS "DistVisit_tenantId_userId_checkInAt_idx" ON "DistVisit"("tenantId", "userId", "checkInAt");
CREATE INDEX IF NOT EXISTS "DistVisit_tenantId_customerId_idx" ON "DistVisit"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "DistVisit_tenantId_routeId_checkInAt_idx" ON "DistVisit"("tenantId", "routeId", "checkInAt");

-- ── Foreign keys: tenant (cascade) and parent rows (cascade) ──
DO $$ BEGIN
  ALTER TABLE "DistributionSettings" ADD CONSTRAINT "DistributionSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PriceList" ADD CONSTRAINT "PriceList_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "DistRoute" ADD CONSTRAINT "DistRoute_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TradeScheme" ADD CONSTRAINT "TradeScheme_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LoadSheet" ADD CONSTRAINT "LoadSheet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "DistCollection" ADD CONSTRAINT "DistCollection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "DistVisit" ADD CONSTRAINT "DistVisit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
