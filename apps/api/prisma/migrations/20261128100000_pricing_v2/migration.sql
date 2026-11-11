-- Pricing v2: plans + add-ons. Additive only.
-- New: AddOn, TenantAddOn, InvoiceItem tables; Plan.features/isFree; Tenant.billingGrandfatherUntil.
-- Backfill: every existing shop keeps every feature for 3 months; plan contents filled in;
-- plan limits only ever raised; a new Free plan and the add-on catalog are added.

CREATE TYPE "AddOnKind" AS ENUM ('FLAT', 'PER_UNIT', 'ONE_TIME');
CREATE TYPE "TenantAddOnStatus" AS ENUM ('ACTIVE', 'PENDING_PAYMENT', 'PAST_DUE', 'CANCELLED');

ALTER TABLE "Plan" ADD COLUMN "features" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Plan" ADD COLUMN "isFree" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN "billingGrandfatherUntil" TIMESTAMP(3);

CREATE TABLE "AddOn" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "kind" "AddOnKind" NOT NULL DEFAULT 'FLAT',
    "priceMonthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitLabel" TEXT,
    "grantsFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "grantsLimits" JSONB,
    "bundleKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availableOnPlans" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "comingSoon" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AddOn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantAddOn" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "TenantAddOnStatus" NOT NULL DEFAULT 'ACTIVE',
    "unitPrice" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'USER',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "paymentDueAt" TIMESTAMP(3),
    "freeUntil" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TenantAddOn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AddOn_key_key" ON "AddOn"("key");
CREATE UNIQUE INDEX "TenantAddOn_tenantId_addOnId_key" ON "TenantAddOn"("tenantId", "addOnId");
CREATE INDEX "TenantAddOn_status_idx" ON "TenantAddOn"("status");
CREATE INDEX "TenantAddOn_paymentDueAt_idx" ON "TenantAddOn"("paymentDueAt");
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

ALTER TABLE "TenantAddOn" ADD CONSTRAINT "TenantAddOn_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantAddOn" ADD CONSTRAINT "TenantAddOn_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Backfill: existing shops keep everything for 3 months ───
UPDATE "Tenant" SET "billingGrandfatherUntil" = CURRENT_TIMESTAMP + INTERVAL '3 months' WHERE "billingGrandfatherUntil" IS NULL;

-- ─── Plan contents (limits only raised, prices untouched) ───
UPDATE "Plan" SET "features" = ARRAY['pos','khata','inventory','returns','barcode','cash_register','reports','offline','profit_report','expenses','whatsapp_receipt','backup','ai','loyalty','discount_rules','promotions','stock_transfer','purchase_orders','exports','approvals','hr','multi_shop','branding','api','priority_support']
  , "maxProducts" = GREATEST("maxProducts", 999999), "maxSalesPerMonth" = GREATEST("maxSalesPerMonth", 999999),
  "maxUsers" = GREATEST("maxUsers", 10), "maxShops" = GREATEST("maxShops", 3), "trialDays" = 7
  WHERE "slug" = 'free-trial';
UPDATE "Plan" SET "features" = ARRAY['pos','khata','inventory','returns','barcode','cash_register','reports','offline','profit_report','expenses','whatsapp_receipt','backup','ai'],
  "maxProducts" = GREATEST("maxProducts", 5000), "maxSalesPerMonth" = GREATEST("maxSalesPerMonth", 999999)
  WHERE "slug" = 'basic';
UPDATE "Plan" SET "features" = ARRAY['pos','khata','inventory','returns','barcode','cash_register','reports','offline','profit_report','expenses','whatsapp_receipt','backup','ai','loyalty','discount_rules','promotions','stock_transfer','purchase_orders','exports','approvals','hr','multi_shop'],
  "maxProducts" = GREATEST("maxProducts", 999999), "maxSalesPerMonth" = GREATEST("maxSalesPerMonth", 999999)
  WHERE "slug" = 'pro';
UPDATE "Plan" SET "features" = ARRAY['pos','khata','inventory','returns','barcode','cash_register','reports','offline','profit_report','expenses','whatsapp_receipt','backup','ai','loyalty','discount_rules','promotions','stock_transfer','purchase_orders','exports','approvals','hr','multi_shop','branding','api','priority_support'],
  "maxProducts" = GREATEST("maxProducts", 999999), "maxSalesPerMonth" = GREATEST("maxSalesPerMonth", 999999),
  "maxUsers" = GREATEST("maxUsers", 999999), "maxShops" = GREATEST("maxShops", 999999)
  WHERE "slug" = 'enterprise';
UPDATE "Plan" SET "features" = ARRAY['pos','khata','inventory','returns','barcode','cash_register','reports','offline']
  WHERE "features" = ARRAY[]::TEXT[] OR "features" IS NULL;

-- ─── Free plan for very small shops ───
INSERT INTO "Plan" ("id", "name", "slug", "description", "priceMonthly", "priceQuarterly", "priceYearly", "trialDays", "isActive", "isPublic", "sortOrder",
  "maxProducts", "maxUsers", "maxShops", "maxSalesPerMonth", "features", "isFree", "createdAt", "updatedAt")
SELECT 'plan_free', 'Free', 'free', 'Choti dukaan ke liye hamesha muft: 1 dukaan, 1 user, 300 bill mahana.', 0, 0, 0, 0, true, true, 0,
  100, 1, 1, 300, ARRAY['pos','khata','inventory','returns','barcode','cash_register','reports','offline'], true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Plan" WHERE "slug" = 'free' OR "name" = 'Free');

-- ─── Add-on catalog ───
INSERT INTO "AddOn" ("id", "key", "name", "description", "category", "kind", "priceMonthly", "unitLabel", "grantsFeatures", "grantsLimits", "bundleKeys", "isPublic", "comingSoon", "sortOrder", "updatedAt") VALUES
  ('addon_shopify', 'shopify', 'Shopify', 'Shopify store ke orders aur stock Nafaa se jude rahein.', 'integrations', 'FLAT', 1000, NULL, ARRAY['integration.shopify'], NULL, ARRAY[]::TEXT[], true, false, 10, CURRENT_TIMESTAMP),
  ('addon_woocommerce', 'woocommerce', 'WooCommerce', 'WordPress/WooCommerce website ke orders aur stock.', 'integrations', 'FLAT', 1000, NULL, ARRAY['integration.woocommerce'], NULL, ARRAY[]::TEXT[], true, false, 11, CURRENT_TIMESTAMP),
  ('addon_daraz', 'daraz', 'Daraz', 'Daraz ke orders aur stock ek jagah.', 'integrations', 'FLAT', 1000, NULL, ARRAY['integration.daraz'], NULL, ARRAY[]::TEXT[], true, false, 12, CURRENT_TIMESTAMP),
  ('addon_website', 'website', 'Apni website / API', 'Apni banayi website ko Nafaa se jodein.', 'integrations', 'FLAT', 1000, NULL, ARRAY['integration.website'], NULL, ARRAY[]::TEXT[], true, false, 13, CURRENT_TIMESTAMP),
  ('addon_foodpanda', 'foodpanda', 'Foodpanda', 'Foodpanda ke orders seedha kitchen aur POS me.', 'integrations', 'FLAT', 2500, NULL, ARRAY['integration.foodpanda'], NULL, ARRAY[]::TEXT[], true, true, 14, CURRENT_TIMESTAMP),
  ('addon_courier', 'courier', 'Courier pack', 'TCS, Leopards aur CallCourier booking aur tracking.', 'integrations', 'FLAT', 1000, NULL, ARRAY['courier'], NULL, ARRAY[]::TEXT[], true, false, 15, CURRENT_TIMESTAMP),
  ('addon_online_seller', 'online_seller_bundle', 'Online Seller Bundle', 'Shopify + WooCommerce + Daraz + Courier ek saath, 1,000 ki bachat.', 'integrations', 'FLAT', 3000, NULL, ARRAY['integration.shopify','integration.woocommerce','integration.daraz','courier'], NULL, ARRAY['shopify','woocommerce','daraz','courier'], true, false, 16, CURRENT_TIMESTAMP),
  ('addon_online_store', 'online_store', 'Nafaa Online Store', 'WhatsApp/Instagram orders, order desk aur payment links.', 'sales', 'FLAT', 1500, NULL, ARRAY['online_store'], NULL, ARRAY[]::TEXT[], true, false, 20, CURRENT_TIMESTAMP),
  ('addon_meta', 'meta', 'Facebook aur Instagram', 'Catalog, ads aur sales ki tracking.', 'sales', 'FLAT', 1500, NULL, ARRAY['meta'], NULL, ARRAY[]::TEXT[], true, false, 21, CURRENT_TIMESTAMP),
  ('addon_distribution', 'distribution', 'Distribution / Wholesale', 'Routes, booker app, load sheets aur recoveries. Har booker ka alag.', 'operations', 'FLAT', 2500, NULL, ARRAY['distribution'], NULL, ARRAY[]::TEXT[], true, false, 30, CURRENT_TIMESTAMP),
  ('addon_booker', 'booker', 'Booker login', 'Distribution ke liye har booker ka login.', 'operations', 'PER_UNIT', 500, 'booker', ARRAY[]::TEXT[], '{"bookers":1}'::jsonb, ARRAY[]::TEXT[], true, false, 31, CURRENT_TIMESTAMP),
  ('addon_fbr', 'fbr', 'FBR / tax', 'FBR aur provincial tax ko bill khud jayein.', 'operations', 'FLAT', 1000, NULL, ARRAY['fbr'], NULL, ARRAY[]::TEXT[], true, false, 32, CURRENT_TIMESTAMP),
  ('addon_accounting', 'accounting', 'Accounting sync', 'Bikri accounting software me khud jaye.', 'operations', 'FLAT', 1000, NULL, ARRAY['accounting'], NULL, ARRAY[]::TEXT[], true, false, 33, CURRENT_TIMESTAMP),
  ('addon_extra_shop', 'extra_shop', 'Extra dukaan / branch', 'Plan se zyada dukaan.', 'capacity', 'PER_UNIT', 1000, 'shop', ARRAY['multi_shop'], '{"shops":1}'::jsonb, ARRAY[]::TEXT[], true, false, 40, CURRENT_TIMESTAMP),
  ('addon_extra_user', 'extra_user', 'Extra user', 'Plan se zyada staff login.', 'capacity', 'PER_UNIT', 300, 'user', ARRAY[]::TEXT[], '{"users":1}'::jsonb, ARRAY[]::TEXT[], true, false, 41, CURRENT_TIMESTAMP),
  ('addon_ai_plus', 'ai_plus', 'Nafaa AI Plus', 'Nafaa AI se zyada sawal aur reports.', 'capacity', 'FLAT', 1000, NULL, ARRAY['ai','ai_plus'], NULL, ARRAY[]::TEXT[], true, false, 42, CURRENT_TIMESTAMP),
  ('addon_setup', 'setup', 'Setup aur training', 'Hamari team products daalti hai aur staff ko sikhati hai. Ek dafa.', 'services', 'ONE_TIME', 5000, NULL, ARRAY[]::TEXT[], NULL, ARRAY[]::TEXT[], true, false, 50, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Add-ons are for paid plans only (not Free).
UPDATE "AddOn" SET "availableOnPlans" = ARRAY['basic','pro','enterprise'] WHERE "availableOnPlans" = ARRAY[]::TEXT[];
