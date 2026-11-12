-- Nafaa Stores (website builder). Additive only: one enum value and new tables.

-- AlterEnum
ALTER TYPE "IntegrationType" ADD VALUE IF NOT EXISTS 'NAFAA_STORE';

-- CreateTable
CREATE TABLE "nafaa_stores" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "shopId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "themeId" TEXT NOT NULL DEFAULT 'fashion',
    "passwordHash" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "checkout" JSONB NOT NULL DEFAULT '{}',
    "shipping" JSONB NOT NULL DEFAULT '{}',
    "policies" JSONB NOT NULL DEFAULT '{}',
    "migration" JSONB,
    "launchedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspendReason" TEXT,
    "forcedPassword" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nafaa_stores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_theme_versions" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "doc" JSONB NOT NULL,
    "note" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "store_theme_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_pages" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'CUSTOM',
    "bodyHtml" TEXT NOT NULL DEFAULT '',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "store_pages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_menus" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "store_menus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_collections" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "descriptionHtml" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'MANUAL',
    "rules" JSONB,
    "sort" TEXT NOT NULL DEFAULT 'manual',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "externalId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "store_collections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_collection_products" (
    "collectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "store_collection_products_pkey" PRIMARY KEY ("collectionId","productId")
);

CREATE TABLE "store_products" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "visible" BOOLEAN,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "webDescription" TEXT,
    "imageOrder" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "badges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relatedProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "compareAtPrice" DOUBLE PRECISION,
    "tabs" JSONB,
    "sizeChart" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "store_products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_redirects" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromPath" TEXT NOT NULL,
    "toPath" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "hits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "store_redirects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_domains" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "redirectTo" TEXT,
    "records" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "store_domains_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_customers" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "addresses" JSONB NOT NULL DEFAULT '[]',
    "acceptsMarketing" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'CHECKOUT',
    "externalId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "store_customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_otps" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "store_otps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_carts" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "lines" JSONB NOT NULL DEFAULT '[]',
    "contact" JSONB,
    "address" JSONB,
    "notes" TEXT,
    "couponCode" TEXT,
    "shippingRateId" TEXT,
    "paymentMethod" TEXT,
    "attribution" JSONB,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "channelOrderId" TEXT,
    "abandonedSentAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "store_carts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_blog_posts" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "blog" TEXT NOT NULL DEFAULT 'news',
    "handle" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL DEFAULT '',
    "excerpt" TEXT,
    "imageUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "author" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "externalId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "store_blog_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_analytics_daily" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "productViews" INTEGER NOT NULL DEFAULT 0,
    "addToCart" INTEGER NOT NULL DEFAULT 0,
    "checkouts" INTEGER NOT NULL DEFAULT 0,
    "purchases" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sources" JSONB NOT NULL DEFAULT '{}',
    "devices" JSONB NOT NULL DEFAULT '{}',
    "products" JSONB NOT NULL DEFAULT '{}',
    "searches" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "store_analytics_daily_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_abuse_reports" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "reporterName" TEXT,
    "contact" TEXT,
    "pageUrl" TEXT,
    "ipHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "adminNote" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "store_abuse_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nafaa_stores_status_idx" ON "nafaa_stores"("status");
CREATE INDEX "store_abuse_reports_status_createdAt_idx" ON "store_abuse_reports"("status", "createdAt");
CREATE INDEX "store_abuse_reports_storeId_idx" ON "store_abuse_reports"("storeId");
CREATE UNIQUE INDEX "nafaa_stores_integrationId_key" ON "nafaa_stores"("integrationId");
CREATE UNIQUE INDEX "nafaa_stores_slug_key" ON "nafaa_stores"("slug");
CREATE INDEX "nafaa_stores_tenantId_idx" ON "nafaa_stores"("tenantId");
CREATE INDEX "store_theme_versions_storeId_status_idx" ON "store_theme_versions"("storeId", "status");
CREATE INDEX "store_theme_versions_storeId_version_idx" ON "store_theme_versions"("storeId", "version");
CREATE UNIQUE INDEX "store_pages_storeId_handle_key" ON "store_pages"("storeId", "handle");
CREATE INDEX "store_pages_tenantId_idx" ON "store_pages"("tenantId");
CREATE UNIQUE INDEX "store_menus_storeId_handle_key" ON "store_menus"("storeId", "handle");
CREATE UNIQUE INDEX "store_collections_storeId_handle_key" ON "store_collections"("storeId", "handle");
CREATE INDEX "store_collections_tenantId_idx" ON "store_collections"("tenantId");
CREATE INDEX "store_collection_products_productId_idx" ON "store_collection_products"("productId");
CREATE UNIQUE INDEX "store_products_storeId_productId_key" ON "store_products"("storeId", "productId");
CREATE UNIQUE INDEX "store_products_storeId_handle_key" ON "store_products"("storeId", "handle");
CREATE INDEX "store_products_storeId_visible_idx" ON "store_products"("storeId", "visible");
CREATE UNIQUE INDEX "store_redirects_storeId_fromPath_key" ON "store_redirects"("storeId", "fromPath");
CREATE UNIQUE INDEX "store_domains_hostname_key" ON "store_domains"("hostname");
CREATE INDEX "store_domains_storeId_idx" ON "store_domains"("storeId");
CREATE INDEX "store_domains_status_idx" ON "store_domains"("status");
CREATE UNIQUE INDEX "store_customers_storeId_phone_key" ON "store_customers"("storeId", "phone");
CREATE UNIQUE INDEX "store_customers_storeId_email_key" ON "store_customers"("storeId", "email");
CREATE INDEX "store_customers_tenantId_idx" ON "store_customers"("tenantId");
CREATE INDEX "store_otps_storeId_target_createdAt_idx" ON "store_otps"("storeId", "target", "createdAt");
CREATE INDEX "store_otps_expiresAt_idx" ON "store_otps"("expiresAt");
CREATE UNIQUE INDEX "store_carts_token_key" ON "store_carts"("token");
CREATE INDEX "store_carts_storeId_status_lastActivityAt_idx" ON "store_carts"("storeId", "status", "lastActivityAt");
CREATE UNIQUE INDEX "store_blog_posts_storeId_blog_handle_key" ON "store_blog_posts"("storeId", "blog", "handle");
CREATE INDEX "store_blog_posts_storeId_publishedAt_idx" ON "store_blog_posts"("storeId", "publishedAt");
CREATE UNIQUE INDEX "store_analytics_daily_storeId_day_key" ON "store_analytics_daily"("storeId", "day");

-- AddForeignKey
ALTER TABLE "store_theme_versions" ADD CONSTRAINT "store_theme_versions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "nafaa_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_pages" ADD CONSTRAINT "store_pages_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "nafaa_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_menus" ADD CONSTRAINT "store_menus_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "nafaa_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_collections" ADD CONSTRAINT "store_collections_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "nafaa_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_collection_products" ADD CONSTRAINT "store_collection_products_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "store_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_products" ADD CONSTRAINT "store_products_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "nafaa_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_redirects" ADD CONSTRAINT "store_redirects_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "nafaa_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_domains" ADD CONSTRAINT "store_domains_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "nafaa_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_customers" ADD CONSTRAINT "store_customers_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "nafaa_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_carts" ADD CONSTRAINT "store_carts_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "nafaa_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_blog_posts" ADD CONSTRAINT "store_blog_posts_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "nafaa_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_analytics_daily" ADD CONSTRAINT "store_analytics_daily_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "nafaa_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_abuse_reports" ADD CONSTRAINT "store_abuse_reports_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "nafaa_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
