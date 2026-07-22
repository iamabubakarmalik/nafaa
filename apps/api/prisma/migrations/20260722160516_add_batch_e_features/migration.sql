-- CreateEnum
CREATE TYPE "CartRecoveryStage" AS ENUM ('DETECTED', 'FIRST_REMINDER', 'SECOND_REMINDER', 'COUPON_OFFERED', 'RECOVERED', 'LOST');

-- CreateEnum
CREATE TYPE "TryBeforeBuyStatus" AS ENUM ('REQUESTED', 'APPROVED', 'DEPOSIT_PAID', 'DELIVERED_TO_HOME', 'IN_TRIAL', 'RETURNED', 'PURCHASED', 'DEPOSIT_FORFEITED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "B2BOrderStatus" AS ENUM ('DRAFT', 'QUOTED', 'NEGOTIATING', 'CONFIRMED', 'PACKED', 'IN_TRANSIT', 'DELIVERED', 'DISPUTED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "B2BAccountTier" AS ENUM ('STANDARD', 'PREFERRED', 'PARTNER', 'VIP');

-- CreateEnum
CREATE TYPE "PrayerName" AS ENUM ('FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA', 'JUMMAH');

-- CreateEnum
CREATE TYPE "AiConversationType" AS ENUM ('PRODUCT_SEARCH', 'OCCASION_SHOPPING', 'GIFT_ADVISOR', 'PRICE_COMPARISON', 'RECOMMENDATION', 'GENERAL_QUERY');

-- CreateTable
CREATE TABLE "cart_recovery_campaigns" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "cartValue" DECIMAL(12,2) NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "stage" "CartRecoveryStage" NOT NULL DEFAULT 'DETECTED',
    "firstReminderAt" TIMESTAMP(3),
    "secondReminderAt" TIMESTAMP(3),
    "couponOfferedAt" TIMESTAMP(3),
    "couponCode" TEXT,
    "couponDiscountPct" INTEGER,
    "recoveredAt" TIMESTAMP(3),
    "recoveredOrderId" TEXT,
    "lostAt" TIMESTAMP(3),
    "cartSnapshot" JSONB NOT NULL,
    "lastReminderChannel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_recovery_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "try_before_buy_requests" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "productImageUrl" TEXT,
    "productPrice" DECIMAL(12,2) NOT NULL,
    "depositAmount" DECIMAL(12,2) NOT NULL,
    "depositPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "TryBeforeBuyStatus" NOT NULL DEFAULT 'REQUESTED',
    "trialDays" INTEGER NOT NULL DEFAULT 3,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "depositPaidAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "trialStartedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "purchasedAt" TIMESTAMP(3),
    "purchaseOrderId" TEXT,
    "addressId" TEXT,
    "addressSnapshot" JSONB,
    "itemConditionOnReturn" TEXT,
    "photosOnReturn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "refundAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "forfeitedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "forfeitReason" TEXT,
    "customerNotes" TEXT,
    "shopNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "try_before_buy_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2b_accounts" (
    "id" TEXT NOT NULL,
    "buyerShopId" TEXT NOT NULL,
    "tier" "B2BAccountTier" NOT NULL DEFAULT 'STANDARD',
    "creditLimit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "creditUsed" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "creditDays" INTEGER NOT NULL DEFAULT 0,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "outstandingDue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cnicNumber" TEXT,
    "taxNumber" TEXT,
    "businessProofUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2b_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2b_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "buyerShopId" TEXT NOT NULL,
    "sellerShopId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "B2BOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paymentTerms" TEXT NOT NULL DEFAULT 'COD',
    "creditDays" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "expectedDeliveryAt" TIMESTAMP(3),
    "actualDeliveryAt" TIMESTAMP(3),
    "buyerNotes" TEXT,
    "sellerNotes" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2b_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2b_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "imageUrl" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "wholesalePrice" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "b2b_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prayer_schedules" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "fajr" TEXT NOT NULL,
    "sunrise" TEXT NOT NULL,
    "dhuhr" TEXT NOT NULL,
    "asr" TEXT NOT NULL,
    "maghrib" TEXT NOT NULL,
    "isha" TEXT NOT NULL,
    "jummah" TEXT,
    "hijriDate" TEXT,
    "isRamzan" BOOLEAN NOT NULL DEFAULT false,
    "isEid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prayer_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_prayer_configs" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "enablePrayerMode" BOOLEAN NOT NULL DEFAULT false,
    "pauseDuringPrayer" BOOLEAN NOT NULL DEFAULT true,
    "pauseMinutesBefore" INTEGER NOT NULL DEFAULT 5,
    "pauseMinutesAfter" INTEGER NOT NULL DEFAULT 30,
    "enabledPrayers" TEXT[] DEFAULT ARRAY['DHUHR', 'ASR', 'MAGHRIB', 'ISHA']::TEXT[],
    "ramzanModeActive" BOOLEAN NOT NULL DEFAULT false,
    "sehriDeliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sehriDeliverySlots" JSONB,
    "iftarBoostEnabled" BOOLEAN NOT NULL DEFAULT false,
    "jummahMode" BOOLEAN NOT NULL DEFAULT false,
    "jummahPauseFrom" TEXT DEFAULT '12:30',
    "jummahPauseTo" TEXT DEFAULT '14:30',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_prayer_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zakat_calculations" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "cashAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "goldGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "silverGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "investments" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "business" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "otherAssets" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "liabilities" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "nisabThreshold" DECIMAL(14,2) NOT NULL,
    "zakatDue" DECIMAL(14,2) NOT NULL,
    "goldRatePerGram" DECIMAL(10,2) NOT NULL,
    "isNisabMet" BOOLEAN NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paidTo" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zakat_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "sessionId" TEXT NOT NULL,
    "type" "AiConversationType" NOT NULL DEFAULT 'GENERAL_QUERY',
    "language" TEXT NOT NULL DEFAULT 'ur',
    "occasion" TEXT,
    "budget" DECIMAL(12,2),
    "intent" JSONB,
    "suggestedProducts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clickedProducts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "purchasedOrderId" TEXT,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "satisfaction" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversation_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_recommendations" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "category" TEXT,
    "isViewed" BOOLEAN NOT NULL DEFAULT false,
    "isClicked" BOOLEAN NOT NULL DEFAULT false,
    "isPurchased" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cart_recovery_campaigns_stage_idx" ON "cart_recovery_campaigns"("stage");

-- CreateIndex
CREATE INDEX "cart_recovery_campaigns_customerId_idx" ON "cart_recovery_campaigns"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_recovery_campaigns_customerId_stage_key" ON "cart_recovery_campaigns"("customerId", "stage");

-- CreateIndex
CREATE INDEX "try_before_buy_requests_customerId_status_idx" ON "try_before_buy_requests"("customerId", "status");

-- CreateIndex
CREATE INDEX "try_before_buy_requests_shopId_status_idx" ON "try_before_buy_requests"("shopId", "status");

-- CreateIndex
CREATE INDEX "try_before_buy_requests_trialEndsAt_idx" ON "try_before_buy_requests"("trialEndsAt");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_accounts_buyerShopId_key" ON "b2b_accounts"("buyerShopId");

-- CreateIndex
CREATE INDEX "b2b_accounts_tier_idx" ON "b2b_accounts"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_orders_orderNumber_key" ON "b2b_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "b2b_orders_buyerShopId_status_idx" ON "b2b_orders"("buyerShopId", "status");

-- CreateIndex
CREATE INDEX "b2b_orders_sellerShopId_status_idx" ON "b2b_orders"("sellerShopId", "status");

-- CreateIndex
CREATE INDEX "b2b_orders_status_idx" ON "b2b_orders"("status");

-- CreateIndex
CREATE INDEX "b2b_order_items_orderId_idx" ON "b2b_order_items"("orderId");

-- CreateIndex
CREATE INDEX "prayer_schedules_city_date_idx" ON "prayer_schedules"("city", "date");

-- CreateIndex
CREATE UNIQUE INDEX "prayer_schedules_city_date_key" ON "prayer_schedules"("city", "date");

-- CreateIndex
CREATE UNIQUE INDEX "shop_prayer_configs_shopId_key" ON "shop_prayer_configs"("shopId");

-- CreateIndex
CREATE INDEX "zakat_calculations_customerId_calculatedAt_idx" ON "zakat_calculations"("customerId", "calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ai_conversations_sessionId_key" ON "ai_conversations"("sessionId");

-- CreateIndex
CREATE INDEX "ai_conversations_customerId_createdAt_idx" ON "ai_conversations"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_conversations_sessionId_idx" ON "ai_conversations"("sessionId");

-- CreateIndex
CREATE INDEX "ai_conversation_messages_conversationId_createdAt_idx" ON "ai_conversation_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_recommendations_customerId_score_idx" ON "ai_recommendations"("customerId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "ai_recommendations_customerId_productId_key" ON "ai_recommendations"("customerId", "productId");

-- AddForeignKey
ALTER TABLE "b2b_order_items" ADD CONSTRAINT "b2b_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "b2b_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversation_messages" ADD CONSTRAINT "ai_conversation_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
