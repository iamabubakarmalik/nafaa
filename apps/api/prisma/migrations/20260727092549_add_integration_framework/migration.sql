-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('CUSTOM_WEBSITE', 'FOODPANDA', 'DARAZ', 'SHOPIFY', 'WOOCOMMERCE', 'TCS_COURIER', 'LEOPARDS_COURIER', 'CALLCOURIER', 'NAYAPAY', 'RAAST');

-- CreateEnum
CREATE TYPE "IntegrationCategory" AS ENUM ('SALES_CHANNEL', 'COURIER', 'PAYMENT', 'ACCOUNTING');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('PENDING', 'CONNECTED', 'DISCONNECTED', 'ERROR', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SyncDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCING', 'SUCCESS', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "type" "IntegrationType" NOT NULL,
    "category" "IntegrationCategory" NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'PENDING',
    "credentials" JSONB,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "webhookSecret" TEXT,
    "config" JSONB,
    "syncDirection" "SyncDirection" NOT NULL DEFAULT 'BIDIRECTIONAL',
    "autoSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncIntervalMin" INTEGER NOT NULL DEFAULT 15,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" "SyncStatus",
    "totalOrdersSynced" INTEGER NOT NULL DEFAULT 0,
    "totalProductsSynced" INTEGER NOT NULL DEFAULT 0,
    "totalErrors" INTEGER NOT NULL DEFAULT 0,
    "webhookUrl" TEXT,
    "webhookVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_orders" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "externalOrderId" TEXT NOT NULL,
    "externalOrderNumber" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "customerAddress" TEXT,
    "customerCity" TEXT,
    "customerLat" DOUBLE PRECISION,
    "customerLng" DOUBLE PRECISION,
    "items" JSONB NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "paymentMethod" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "orderStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "nafaaSaleId" TEXT,
    "nafaaOrderId" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "channel_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "direction" "SyncDirection" NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsSuccess" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "details" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT,
    "tenantId" TEXT,
    "source" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "url" TEXT,
    "headers" JSONB,
    "body" JSONB,
    "responseStatus" INTEGER,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_channel_mappings" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "externalProductId" TEXT,
    "externalVariantId" TEXT,
    "externalSku" TEXT,
    "externalUrl" TEXT,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncedAt" TIMESTAMP(3),
    "externalData" JSONB,

    CONSTRAINT "product_channel_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integrations_apiKey_key" ON "integrations"("apiKey");

-- CreateIndex
CREATE INDEX "integrations_tenantId_status_idx" ON "integrations"("tenantId", "status");

-- CreateIndex
CREATE INDEX "integrations_type_status_idx" ON "integrations"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_tenantId_type_key" ON "integrations"("tenantId", "type");

-- CreateIndex
CREATE INDEX "channel_orders_tenantId_orderStatus_idx" ON "channel_orders"("tenantId", "orderStatus");

-- CreateIndex
CREATE INDEX "channel_orders_integrationId_receivedAt_idx" ON "channel_orders"("integrationId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "channel_orders_integrationId_externalOrderId_key" ON "channel_orders"("integrationId", "externalOrderId");

-- CreateIndex
CREATE INDEX "sync_logs_integrationId_startedAt_idx" ON "sync_logs"("integrationId", "startedAt");

-- CreateIndex
CREATE INDEX "webhook_logs_integrationId_receivedAt_idx" ON "webhook_logs"("integrationId", "receivedAt");

-- CreateIndex
CREATE INDEX "webhook_logs_source_event_idx" ON "webhook_logs"("source", "event");

-- CreateIndex
CREATE INDEX "product_channel_mappings_integrationId_syncStatus_idx" ON "product_channel_mappings"("integrationId", "syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "product_channel_mappings_integrationId_productId_key" ON "product_channel_mappings"("integrationId", "productId");

-- AddForeignKey
ALTER TABLE "channel_orders" ADD CONSTRAINT "channel_orders_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_channel_mappings" ADD CONSTRAINT "product_channel_mappings_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
