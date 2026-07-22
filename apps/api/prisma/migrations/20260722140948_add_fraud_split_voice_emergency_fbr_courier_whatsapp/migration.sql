-- CreateEnum
CREATE TYPE "FraudRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FraudActionTaken" AS ENUM ('NONE', 'FLAGGED', 'BLOCKED', 'MANUAL_REVIEW', 'BANNED', 'REFUND_HELD');

-- CreateEnum
CREATE TYPE "SplitPaymentStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'FULLY_PAID', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SplitParticipantStatus" AS ENUM ('INVITED', 'ACCEPTED', 'PAID', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EmergencyDeliveryStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "FbrPosStatus" AS ENUM ('PENDING', 'SUBMITTED', 'ACKNOWLEDGED', 'REJECTED', 'RETRY_REQUIRED');

-- CreateEnum
CREATE TYPE "CourierProvider" AS ENUM ('POSTEX', 'LEOPARDS', 'TCS', 'MNP', 'DAEWOO', 'BLUE_EX', 'RIDER', 'MANUAL');

-- CreateEnum
CREATE TYPE "CourierShipmentStatus" AS ENUM ('CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'CANCELLED', 'FAILED', 'ON_HOLD');

-- CreateTable
CREATE TABLE "fraud_checks" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "customerId" TEXT,
    "tenantId" TEXT,
    "riskLevel" "FraudRiskLevel" NOT NULL DEFAULT 'LOW',
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "triggeredRules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reasons" JSONB,
    "ipAddress" TEXT,
    "deviceId" TEXT,
    "actionTaken" "FraudActionTaken" NOT NULL DEFAULT 'NONE',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "condition" JSONB NOT NULL,
    "action" "FraudActionTaken" NOT NULL DEFAULT 'FLAGGED',
    "scoreImpact" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fraud_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_fingerprints" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "customerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ipAddresses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userAgent" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "suspiciousScore" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "device_fingerprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "split_payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "SplitPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "shareLinkToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "split_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "split_payment_participants" (
    "id" TEXT NOT NULL,
    "splitId" TEXT NOT NULL,
    "customerId" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "shareAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "SplitParticipantStatus" NOT NULL DEFAULT 'INVITED',
    "paymentRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "split_payment_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_search_logs" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "audioUrl" TEXT,
    "transcript" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ur',
    "detectedIntent" TEXT,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "clickedResult" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_search_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_deliveries" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "status" "EmergencyDeliveryStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promisedByMinutes" INTEGER NOT NULL DEFAULT 30,
    "promisedByAt" TIMESTAMP(3) NOT NULL,
    "actualDeliveredAt" TIMESTAMP(3),
    "surchargeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "refundIfLate" BOOLEAN NOT NULL DEFAULT true,
    "wasLate" BOOLEAN NOT NULL DEFAULT false,
    "compensationAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "riderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fbr_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "posId" TEXT NOT NULL,
    "ntn" TEXT NOT NULL,
    "strn" TEXT,
    "apiToken" TEXT NOT NULL,
    "apiEndpoint" TEXT NOT NULL DEFAULT 'https://gw.fbr.gov.pk/imsp/v1/api/inv/postinvoicedata_sb',
    "isSandbox" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "totalInvoicesSent" INTEGER NOT NULL DEFAULT 0,
    "totalRejected" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fbr_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fbr_invoice_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "saleId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "fbrInvoiceRef" TEXT,
    "fbrQrCode" TEXT,
    "status" "FbrPosStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "response" JSONB,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fbr_invoice_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "CourierProvider" NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiSecret" TEXT,
    "merchantCode" TEXT,
    "pickupAddress" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSandbox" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_shipments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "CourierProvider" NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "courierRef" TEXT,
    "status" "CourierShipmentStatus" NOT NULL DEFAULT 'CREATED',
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "cnValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "codAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "weightKg" DOUBLE PRECISION,
    "pieces" INTEGER NOT NULL DEFAULT 1,
    "destinationCity" TEXT,
    "originCity" TEXT,
    "labelUrl" TEXT,
    "lastEvent" TEXT,
    "lastEventAt" TIMESTAMP(3),
    "events" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "businessId" TEXT,
    "accessToken" TEXT NOT NULL,
    "verifyToken" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT,
    "totalMessagesSent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en_US',
    "category" TEXT NOT NULL DEFAULT 'MARKETING',
    "bodyText" TEXT NOT NULL,
    "headerText" TEXT,
    "footerText" TEXT,
    "buttons" JSONB,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metaTemplateId" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "toPhone" TEXT NOT NULL,
    "templateSlug" TEXT,
    "body" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "metaMessageId" TEXT,
    "errorMessage" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fraud_checks_entityType_entityId_idx" ON "fraud_checks"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "fraud_checks_customerId_idx" ON "fraud_checks"("customerId");

-- CreateIndex
CREATE INDEX "fraud_checks_riskLevel_idx" ON "fraud_checks"("riskLevel");

-- CreateIndex
CREATE INDEX "fraud_checks_createdAt_idx" ON "fraud_checks"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "fraud_rules_name_key" ON "fraud_rules"("name");

-- CreateIndex
CREATE UNIQUE INDEX "fraud_rules_slug_key" ON "fraud_rules"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "device_fingerprints_fingerprint_key" ON "device_fingerprints"("fingerprint");

-- CreateIndex
CREATE INDEX "device_fingerprints_fingerprint_idx" ON "device_fingerprints"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "split_payments_orderId_key" ON "split_payments"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "split_payments_shareLinkToken_key" ON "split_payments"("shareLinkToken");

-- CreateIndex
CREATE INDEX "split_payments_initiatorId_idx" ON "split_payments"("initiatorId");

-- CreateIndex
CREATE INDEX "split_payments_status_idx" ON "split_payments"("status");

-- CreateIndex
CREATE INDEX "split_payment_participants_splitId_idx" ON "split_payment_participants"("splitId");

-- CreateIndex
CREATE INDEX "split_payment_participants_customerId_idx" ON "split_payment_participants"("customerId");

-- CreateIndex
CREATE INDEX "voice_search_logs_customerId_createdAt_idx" ON "voice_search_logs"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "voice_search_logs_language_idx" ON "voice_search_logs"("language");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_deliveries_orderId_key" ON "emergency_deliveries"("orderId");

-- CreateIndex
CREATE INDEX "emergency_deliveries_status_promisedByAt_idx" ON "emergency_deliveries"("status", "promisedByAt");

-- CreateIndex
CREATE INDEX "emergency_deliveries_customerId_idx" ON "emergency_deliveries"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "fbr_configs_tenantId_key" ON "fbr_configs"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "fbr_invoice_logs_saleId_key" ON "fbr_invoice_logs"("saleId");

-- CreateIndex
CREATE INDEX "fbr_invoice_logs_tenantId_status_idx" ON "fbr_invoice_logs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "fbr_invoice_logs_saleId_idx" ON "fbr_invoice_logs"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "courier_configs_tenantId_provider_key" ON "courier_configs"("tenantId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "courier_shipments_orderId_key" ON "courier_shipments"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "courier_shipments_trackingNumber_key" ON "courier_shipments"("trackingNumber");

-- CreateIndex
CREATE INDEX "courier_shipments_tenantId_status_idx" ON "courier_shipments"("tenantId", "status");

-- CreateIndex
CREATE INDEX "courier_shipments_trackingNumber_idx" ON "courier_shipments"("trackingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_configs_tenantId_key" ON "whatsapp_configs"("tenantId");

-- CreateIndex
CREATE INDEX "whatsapp_templates_tenantId_idx" ON "whatsapp_templates"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_templates_tenantId_slug_key" ON "whatsapp_templates"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "whatsapp_messages_tenantId_createdAt_idx" ON "whatsapp_messages"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_messages_toPhone_idx" ON "whatsapp_messages"("toPhone");

-- AddForeignKey
ALTER TABLE "split_payment_participants" ADD CONSTRAINT "split_payment_participants_splitId_fkey" FOREIGN KEY ("splitId") REFERENCES "split_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
