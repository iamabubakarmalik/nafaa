-- CreateEnum
CREATE TYPE "MktRiderStatus" AS ENUM ('OFFLINE', 'AVAILABLE', 'ON_DELIVERY', 'BREAK', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MktRiderVehicleType" AS ENUM ('MOTORBIKE', 'BICYCLE', 'CAR', 'ON_FOOT');

-- CreateEnum
CREATE TYPE "MktDeliveryAssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'PICKED_UP', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PromoType" AS ENUM ('COUPON', 'FLASH_SALE', 'BUNDLE', 'HAPPY_HOUR', 'BANNER', 'BOGO');

-- CreateEnum
CREATE TYPE "PromoStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PromoDiscountType" AS ENUM ('PERCENT', 'FIXED', 'FREE_SHIPPING', 'BUY_X_GET_Y');

-- CreateEnum
CREATE TYPE "PromoScope" AS ENUM ('MARKETPLACE_WIDE', 'SHOP', 'CATEGORY', 'PRODUCT', 'FIRST_ORDER', 'RETURNING_CUSTOMER');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('SMS', 'EMAIL', 'WHATSAPP', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'PAUSED', 'FAILED');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LoyaltyTierLevel" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "SubscriptionFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM_DAYS');

-- CreateEnum
CREATE TYPE "CustomerSubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


-- AlterTable
ALTER TABLE "marketplace_orders" ALTER COLUMN "deliveryType" SET DEFAULT 'DELIVERY';

-- CreateTable
CREATE TABLE "mkt_riders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "cnic" TEXT,
    "passwordHash" TEXT,
    "avatarUrl" TEXT,
    "vehicleType" "MktRiderVehicleType" NOT NULL DEFAULT 'MOTORBIKE',
    "vehicleNumber" TEXT,
    "licenseNumber" TEXT,
    "licenseExpiryDate" TIMESTAMP(3),
    "status" "MktRiderStatus" NOT NULL DEFAULT 'OFFLINE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "lastLocationAt" TIMESTAMP(3),
    "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "completedDeliveries" INTEGER NOT NULL DEFAULT 0,
    "cancelledDeliveries" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mkt_riders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_rider_sessions" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "deviceInfo" JSONB,
    "ipAddress" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mkt_rider_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_delivery_assignments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "status" "MktDeliveryAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "pickupLat" DOUBLE PRECISION,
    "pickupLng" DOUBLE PRECISION,
    "dropoffLat" DOUBLE PRECISION,
    "dropoffLng" DOUBLE PRECISION,
    "distanceKm" DOUBLE PRECISION,
    "estimatedMinutes" INTEGER,
    "actualMinutes" INTEGER,
    "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "riderCommission" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tip" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "rejectReason" TEXT,
    "cancelReason" TEXT,
    "proofOfDeliveryUrl" TEXT,
    "otpCode" TEXT,
    "otpVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mkt_delivery_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_rider_location_history" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "orderId" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mkt_rider_location_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_delivery_zones" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "polygonGeoJson" JSONB NOT NULL,
    "baseFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "perKmFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "freeAbove" DECIMAL(12,2),
    "minOrder" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mkt_delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "shopId" TEXT,
    "type" "PromoType" NOT NULL,
    "status" "PromoStatus" NOT NULL DEFAULT 'DRAFT',
    "scope" "PromoScope" NOT NULL DEFAULT 'SHOP',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "imageUrl" TEXT,
    "bannerUrl" TEXT,
    "discountType" "PromoDiscountType" NOT NULL,
    "discountValue" DECIMAL(12,2) NOT NULL,
    "maxDiscount" DECIMAL(12,2),
    "minOrderAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "couponCode" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "requiresLogin" BOOLEAN NOT NULL DEFAULT true,
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "perCustomerLimit" INTEGER DEFAULT 1,
    "targetProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludedProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "buyQty" INTEGER,
    "getQty" INTEGER,
    "getDiscountPercent" INTEGER,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isFlashSale" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_redemptions" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "discountAmount" DECIMAL(12,2) NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_campaigns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "templateId" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "targetSegment" TEXT NOT NULL,
    "segmentFilters" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "openedCount" INTEGER NOT NULL DEFAULT 0,
    "clickedCount" INTEGER NOT NULL DEFAULT 0,
    "customSubject" TEXT,
    "customBody" TEXT,
    "variables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_logs" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "tenantId" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "toPhone" TEXT,
    "toEmail" TEXT,
    "customerId" TEXT,
    "templateSlug" TEXT,
    "subject" TEXT,
    "body" TEXT,
    "status" TEXT NOT NULL,
    "providerRef" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),

    CONSTRAINT "message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "customerId" TEXT,
    "channel" "MessageChannel" NOT NULL,
    "externalHandle" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessagePreview" TEXT,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "assignedTo" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderId" TEXT,
    "body" TEXT NOT NULL,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "channel" "MessageChannel" NOT NULL,
    "providerRef" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_tier_configs" (
    "id" TEXT NOT NULL,
    "level" "LoyaltyTierLevel" NOT NULL,
    "displayName" TEXT NOT NULL,
    "minLifetimeSpend" DECIMAL(12,2) NOT NULL,
    "minOrdersCount" INTEGER NOT NULL DEFAULT 0,
    "pointsMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "cashbackPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freeDeliveryAbove" DECIMAL(10,2),
    "prioritySupport" BOOLEAN NOT NULL DEFAULT false,
    "earlyAccessDrops" BOOLEAN NOT NULL DEFAULT false,
    "birthdayBonusPoints" INTEGER NOT NULL DEFAULT 0,
    "exclusiveDeals" BOOLEAN NOT NULL DEFAULT false,
    "badgeColor" TEXT,
    "badgeIcon" TEXT,
    "perksJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_tier_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_loyalty_states" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "currentTier" "LoyaltyTierLevel" NOT NULL DEFAULT 'BRONZE',
    "lifetimeSpend" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "lifetimeOrders" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "pointsThisYear" INTEGER NOT NULL DEFAULT 0,
    "tierAchievedAt" TIMESTAMP(3),
    "tierExpiresAt" TIMESTAMP(3),
    "nextTier" "LoyaltyTierLevel",
    "progressToNext" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountToNextTier" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_loyalty_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_tier_history" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "fromTier" "LoyaltyTierLevel",
    "toTier" "LoyaltyTierLevel" NOT NULL,
    "reason" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_tier_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_subscriptions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "addressId" TEXT,
    "frequency" "SubscriptionFrequency" NOT NULL,
    "customDays" INTEGER,
    "status" "CustomerSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "nextDeliveryAt" TIMESTAMP(3) NOT NULL,
    "lastDeliveredAt" TIMESTAMP(3),
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentMethod" "MarketplacePaymentMethod" NOT NULL,
    "pausedUntil" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_items" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "imageUrl" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "subscription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_deliveries" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "orderId" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "skippedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mkt_riders_phone_key" ON "mkt_riders"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "mkt_riders_email_key" ON "mkt_riders"("email");

-- CreateIndex
CREATE INDEX "mkt_riders_tenantId_status_idx" ON "mkt_riders"("tenantId", "status");

-- CreateIndex
CREATE INDEX "mkt_riders_shopId_idx" ON "mkt_riders"("shopId");

-- CreateIndex
CREATE INDEX "mkt_riders_currentLat_currentLng_idx" ON "mkt_riders"("currentLat", "currentLng");

-- CreateIndex
CREATE INDEX "mkt_rider_sessions_riderId_idx" ON "mkt_rider_sessions"("riderId");

-- CreateIndex
CREATE INDEX "mkt_delivery_assignments_riderId_status_idx" ON "mkt_delivery_assignments"("riderId", "status");

-- CreateIndex
CREATE INDEX "mkt_delivery_assignments_orderId_idx" ON "mkt_delivery_assignments"("orderId");

-- CreateIndex
CREATE INDEX "mkt_delivery_assignments_tenantId_status_idx" ON "mkt_delivery_assignments"("tenantId", "status");

-- CreateIndex
CREATE INDEX "mkt_rider_location_history_riderId_recordedAt_idx" ON "mkt_rider_location_history"("riderId", "recordedAt");

-- CreateIndex
CREATE INDEX "mkt_rider_location_history_orderId_idx" ON "mkt_rider_location_history"("orderId");

-- CreateIndex
CREATE INDEX "mkt_delivery_zones_tenantId_idx" ON "mkt_delivery_zones"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_slug_key" ON "promotions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_couponCode_key" ON "promotions"("couponCode");

-- CreateIndex
CREATE INDEX "promotions_tenantId_status_idx" ON "promotions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "promotions_shopId_status_idx" ON "promotions"("shopId", "status");

-- CreateIndex
CREATE INDEX "promotions_status_startsAt_endsAt_idx" ON "promotions"("status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "promotions_couponCode_idx" ON "promotions"("couponCode");

-- CreateIndex
CREATE INDEX "promotions_type_isFlashSale_idx" ON "promotions"("type", "isFlashSale");

-- CreateIndex
CREATE INDEX "promo_redemptions_promotionId_customerId_idx" ON "promo_redemptions"("promotionId", "customerId");

-- CreateIndex
CREATE INDEX "promo_redemptions_customerId_redeemedAt_idx" ON "promo_redemptions"("customerId", "redeemedAt");

-- CreateIndex
CREATE INDEX "message_templates_tenantId_channel_idx" ON "message_templates"("tenantId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_tenantId_slug_key" ON "message_templates"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "message_campaigns_tenantId_status_idx" ON "message_campaigns"("tenantId", "status");

-- CreateIndex
CREATE INDEX "message_campaigns_status_scheduledAt_idx" ON "message_campaigns"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "message_logs_tenantId_sentAt_idx" ON "message_logs"("tenantId", "sentAt");

-- CreateIndex
CREATE INDEX "message_logs_customerId_idx" ON "message_logs"("customerId");

-- CreateIndex
CREATE INDEX "message_logs_campaignId_idx" ON "message_logs"("campaignId");

-- CreateIndex
CREATE INDEX "conversations_tenantId_status_idx" ON "conversations"("tenantId", "status");

-- CreateIndex
CREATE INDEX "conversations_customerId_idx" ON "conversations"("customerId");

-- CreateIndex
CREATE INDEX "conversations_lastMessageAt_idx" ON "conversations"("lastMessageAt");

-- CreateIndex
CREATE INDEX "conversation_messages_conversationId_createdAt_idx" ON "conversation_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_tier_configs_level_key" ON "loyalty_tier_configs"("level");

-- CreateIndex
CREATE UNIQUE INDEX "customer_loyalty_states_customerId_key" ON "customer_loyalty_states"("customerId");

-- CreateIndex
CREATE INDEX "customer_loyalty_states_currentTier_idx" ON "customer_loyalty_states"("currentTier");

-- CreateIndex
CREATE INDEX "loyalty_tier_history_stateId_changedAt_idx" ON "loyalty_tier_history"("stateId", "changedAt");

-- CreateIndex
CREATE INDEX "customer_subscriptions_customerId_status_idx" ON "customer_subscriptions"("customerId", "status");

-- CreateIndex
CREATE INDEX "customer_subscriptions_nextDeliveryAt_status_idx" ON "customer_subscriptions"("nextDeliveryAt", "status");

-- CreateIndex
CREATE INDEX "subscription_items_subscriptionId_idx" ON "subscription_items"("subscriptionId");

-- CreateIndex
CREATE INDEX "subscription_deliveries_subscriptionId_scheduledFor_idx" ON "subscription_deliveries"("subscriptionId", "scheduledFor");

-- RenameForeignKey
ALTER TABLE "live_shops" RENAME CONSTRAINT "live_shops_shopProfile_fkey" TO "live_shops_shopId_fkey";

-- AddForeignKey
ALTER TABLE "Rider" ADD CONSTRAINT "Rider_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_shops" ADD CONSTRAINT "live_shops_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_riders" ADD CONSTRAINT "mkt_riders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_riders" ADD CONSTRAINT "mkt_riders_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_rider_sessions" ADD CONSTRAINT "mkt_rider_sessions_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "mkt_riders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_delivery_assignments" ADD CONSTRAINT "mkt_delivery_assignments_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "mkt_riders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_rider_location_history" ADD CONSTRAINT "mkt_rider_location_history_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "mkt_riders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_delivery_zones" ADD CONSTRAINT "mkt_delivery_zones_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_campaigns" ADD CONSTRAINT "message_campaigns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_campaigns" ADD CONSTRAINT "message_campaigns_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "message_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_tier_history" ADD CONSTRAINT "loyalty_tier_history_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "customer_loyalty_states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "customer_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_deliveries" ADD CONSTRAINT "subscription_deliveries_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "customer_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
