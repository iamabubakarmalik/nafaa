-- Extend NotificationChannel enum BEFORE using its new values
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PUSH' AND enumtypid = 'public."NotificationChannel"'::regtype) THEN
        ALTER TYPE "NotificationChannel" ADD VALUE 'PUSH';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'IN_APP' AND enumtypid = 'public."NotificationChannel"'::regtype) THEN
        ALTER TYPE "NotificationChannel" ADD VALUE 'IN_APP';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'WHATSAPP' AND enumtypid = 'public."NotificationChannel"'::regtype) THEN
        ALTER TYPE "NotificationChannel" ADD VALUE 'WHATSAPP';
    END IF;
END $$;

COMMIT;

-- CreateEnum
CREATE TYPE "MarketplaceAuthProvider" AS ENUM ('PHONE_OTP', 'EMAIL_PASSWORD', 'GOOGLE', 'FACEBOOK', 'APPLE');

-- CreateEnum
CREATE TYPE "MarketplaceOrderStatus" AS ENUM ('DRAFT', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'DISPUTED', 'RETURNED');

-- CreateEnum
CREATE TYPE "MarketplacePaymentMethod" AS ENUM ('COD', 'CARD', 'JAZZCASH', 'EASYPAISA', 'NAYAPAY', 'SADAPAY', 'RAAST', 'BANK_TRANSFER', 'WALLET', 'SPLIT');

-- CreateEnum
CREATE TYPE "MarketplacePaymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "BargainStatus" AS ENUM ('PENDING', 'COUNTER_OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "GroupBuyStatus" AS ENUM ('ACTIVE', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LiveShopStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('PRODUCT', 'SHOP', 'RIDER', 'ORDER');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ShopVerificationLevel" AS ENUM ('UNVERIFIED', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'CASHBACK', 'REFUND', 'REFERRAL_BONUS', 'PROMOTIONAL');

-- CreateTable
CREATE TABLE "marketplace_customers" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerifiedAt" TIMESTAMP(3),
    "email" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "CustomerGender",
    "authProvider" "MarketplaceAuthProvider" NOT NULL DEFAULT 'PHONE_OTP',
    "googleId" TEXT,
    "facebookId" TEXT,
    "appleId" TEXT,
    "language" TEXT NOT NULL DEFAULT 'ur',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "walletBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "referralCode" TEXT NOT NULL,
    "referredById" TEXT,
    "defaultAddressId" TEXT,
    "lastKnownLat" DOUBLE PRECISION,
    "lastKnownLng" DOUBLE PRECISION,
    "lastKnownCity" TEXT,
    "marketingEmails" BOOLEAN NOT NULL DEFAULT true,
    "marketingSms" BOOLEAN NOT NULL DEFAULT true,
    "marketingPush" BOOLEAN NOT NULL DEFAULT true,
    "marketingWhatsapp" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "bannedAt" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "registeredIp" TEXT,
    "deviceInfo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "landmark" TEXT,
    "city" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "province" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Pakistan',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "addressType" TEXT NOT NULL DEFAULT 'HOME',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "deliveryNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_saved_cards" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "cardBrand" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "expiryMonth" INTEGER NOT NULL,
    "expiryYear" INTEGER NOT NULL,
    "holderName" TEXT NOT NULL,
    "gatewayToken" TEXT NOT NULL,
    "gatewayProvider" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_saved_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_otp_codes" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_sessions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "deviceFingerprint" TEXT,
    "deviceName" TEXT,
    "location" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_login_history" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "success" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceName" TEXT,
    "location" TEXT,
    "isNewDevice" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_login_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_push_tokens" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "deviceInfo" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_follows_shop" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_follows_shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_views" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "productId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,

    CONSTRAINT "product_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_search_history" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "query" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "filters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_search_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_marketplace_profiles" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "publicName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "galleryUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publicPhone" TEXT,
    "publicEmail" TEXT,
    "websiteUrl" TEXT,
    "whatsappNumber" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "area" TEXT,
    "province" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "industry" TEXT NOT NULL,
    "subCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isListedOnMarketplace" BOOLEAN NOT NULL DEFAULT false,
    "listedAt" TIMESTAMP(3),
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "pausedReason" TEXT,
    "verificationLevel" "ShopVerificationLevel" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "cnicNumber" TEXT,
    "businessRegNumber" TEXT,
    "taxNumber" TEXT,
    "documents" JSONB,
    "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "completedOrders" INTEGER NOT NULL DEFAULT 0,
    "cancelledOrders" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTimeMinutes" INTEGER,
    "avgPreparationMinutes" INTEGER,
    "offersDelivery" BOOLEAN NOT NULL DEFAULT true,
    "offersPickup" BOOLEAN NOT NULL DEFAULT true,
    "offersDineIn" BOOLEAN NOT NULL DEFAULT false,
    "deliveryRadiusKm" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "freeDeliveryAbove" DECIMAL(10,2),
    "minOrderAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxOrderAmount" DECIMAL(10,2),
    "estimatedDeliveryMinutes" INTEGER DEFAULT 30,
    "estimatedPickupMinutes" INTEGER DEFAULT 15,
    "acceptsCod" BOOLEAN NOT NULL DEFAULT true,
    "acceptsCard" BOOLEAN NOT NULL DEFAULT false,
    "acceptsJazzcash" BOOLEAN NOT NULL DEFAULT false,
    "acceptsEasypaisa" BOOLEAN NOT NULL DEFAULT false,
    "acceptsRaast" BOOLEAN NOT NULL DEFAULT false,
    "acceptsWallet" BOOLEAN NOT NULL DEFAULT true,
    "bargainEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bargainMinPercent" INTEGER DEFAULT 80,
    "groupBuyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "auctionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "liveShopEnabled" BOOLEAN NOT NULL DEFAULT false,
    "workingHours" JSONB,
    "holidayDates" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[],
    "prayerTimeMode" BOOLEAN NOT NULL DEFAULT false,
    "ramzanScheduleActive" BOOLEAN NOT NULL DEFAULT false,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_marketplace_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_marketplace_profiles" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isListedOnMarketplace" BOOLEAN NOT NULL DEFAULT false,
    "listedAt" TIMESTAMP(3),
    "publicName" TEXT NOT NULL,
    "publicDescription" TEXT,
    "publicPrice" DECIMAL(12,2) NOT NULL,
    "compareAtPrice" DECIMAL(12,2),
    "publicImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publicVideos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "marketplaceCategory" TEXT,
    "marketplaceSubCategory" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "availableFrom" TIMESTAMP(3),
    "availableUntil" TIMESTAMP(3),
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "wishlistCount" INTEGER NOT NULL DEFAULT 0,
    "bargainEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bargainMinPrice" DECIMAL(12,2),
    "groupBuyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "auctionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_marketplace_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_carts" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_cart_lines" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "variantName" TEXT,
    "imageUrl" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "modifiers" JSONB,
    "bargainId" TEXT,
    "groupBuyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_cart_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "MarketplaceOrderStatus" NOT NULL DEFAULT 'PENDING',
    "deliveryType" "DeliveryType" NOT NULL DEFAULT 'HOME_DELIVERY',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "serviceFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tipAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "walletUsed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "loyaltyPointsUsed" INTEGER NOT NULL DEFAULT 0,
    "loyaltyDiscount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "paymentMethod" "MarketplacePaymentMethod" NOT NULL,
    "paymentStatus" "MarketplacePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentGatewayRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "addressId" TEXT,
    "addressSnapshot" JSONB,
    "deliverySlotStart" TIMESTAMP(3),
    "deliverySlotEnd" TIMESTAMP(3),
    "estimatedDeliveryAt" TIMESTAMP(3),
    "actualDeliveryAt" TIMESTAMP(3),
    "riderId" TEXT,
    "riderName" TEXT,
    "riderPhone" TEXT,
    "couponCode" TEXT,
    "couponDiscount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "customerNotes" TEXT,
    "shopNotes" TEXT,
    "cancelReason" TEXT,
    "cancelledBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "isRated" BOOLEAN NOT NULL DEFAULT false,
    "shopRating" INTEGER,
    "riderRating" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'APP',
    "isGuestOrder" BOOLEAN NOT NULL DEFAULT false,
    "splitPaymentGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "variantName" TEXT,
    "imageUrl" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "modifiers" JSONB,
    "bargainId" TEXT,

    CONSTRAINT "marketplace_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "MarketplaceOrderStatus" NOT NULL,
    "note" TEXT,
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_items" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_reviews" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "reviewType" "ReviewType" NOT NULL,
    "orderId" TEXT,
    "productId" TEXT,
    "shopId" TEXT,
    "riderId" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videoUrl" TEXT,
    "qualityRating" INTEGER,
    "packagingRating" INTEGER,
    "deliveryRating" INTEGER,
    "valueRating" INTEGER,
    "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "hiddenReason" TEXT,
    "moderatedBy" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "unhelpfulCount" INTEGER NOT NULL DEFAULT 0,
    "replyFromShop" TEXT,
    "replyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_votes" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "isHelpful" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_notifications" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "actionUrl" TEXT,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pushSent" BOOLEAN NOT NULL DEFAULT false,
    "smsSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "whatsappSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_wallet_txns" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_wallet_txns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "shopId" TEXT,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "rating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderId" TEXT,
    "customerId" TEXT,
    "message" TEXT NOT NULL,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bargains" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "originalPrice" DECIMAL(12,2) NOT NULL,
    "customerOffer" DECIMAL(12,2) NOT NULL,
    "currentOffer" DECIMAL(12,2) NOT NULL,
    "finalPrice" DECIMAL(12,2),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "BargainStatus" NOT NULL DEFAULT 'PENDING',
    "offerCount" INTEGER NOT NULL DEFAULT 1,
    "maxOffers" INTEGER NOT NULL DEFAULT 3,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bargains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bargain_messages" (
    "id" TEXT NOT NULL,
    "bargainId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "customerId" TEXT,
    "message" TEXT,
    "offeredPrice" DECIMAL(12,2),
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bargain_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_buys" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "imageUrl" TEXT,
    "regularPrice" DECIMAL(12,2) NOT NULL,
    "groupPrice" DECIMAL(12,2) NOT NULL,
    "minParticipants" INTEGER NOT NULL DEFAULT 5,
    "maxParticipants" INTEGER,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "status" "GroupBuyStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reachedTargetAt" TIMESTAMP(3),
    "cancelledReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_buys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_buy_participants" (
    "id" TEXT NOT NULL,
    "groupBuyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL(12,2) NOT NULL,
    "orderId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_buy_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auctions" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videoUrl" TEXT,
    "startingPrice" DECIMAL(12,2) NOT NULL,
    "reservePrice" DECIMAL(12,2),
    "bidIncrement" DECIMAL(12,2) NOT NULL DEFAULT 100,
    "currentPrice" DECIMAL(12,2) NOT NULL,
    "bidCount" INTEGER NOT NULL DEFAULT 0,
    "status" "AuctionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "autoExtendOnBid" BOOLEAN NOT NULL DEFAULT true,
    "extendedUntil" TIMESTAMP(3),
    "winnerId" TEXT,
    "winningBidId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_bids" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "isAutoBid" BOOLEAN NOT NULL DEFAULT false,
    "maxAutoBid" DECIMAL(12,2),
    "isRetracted" BOOLEAN NOT NULL DEFAULT false,
    "retractedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_shops" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "streamUrl" TEXT,
    "streamKey" TEXT,
    "recordingUrl" TEXT,
    "status" "LiveShopStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "peakViewerCount" INTEGER NOT NULL DEFAULT 0,
    "totalViewers" INTEGER NOT NULL DEFAULT 0,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "featuredProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_shop_viewers" (
    "id" TEXT NOT NULL,
    "liveShopId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "watchTimeSec" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "live_shop_viewers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_shop_messages" (
    "id" TEXT NOT NULL,
    "liveShopId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "customerId" TEXT,
    "message" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_shop_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_customers_phone_key" ON "marketplace_customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_customers_email_key" ON "marketplace_customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_customers_googleId_key" ON "marketplace_customers"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_customers_facebookId_key" ON "marketplace_customers"("facebookId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_customers_appleId_key" ON "marketplace_customers"("appleId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_customers_referralCode_key" ON "marketplace_customers"("referralCode");

-- CreateIndex
CREATE INDEX "marketplace_customers_phone_idx" ON "marketplace_customers"("phone");

-- CreateIndex
CREATE INDEX "marketplace_customers_email_idx" ON "marketplace_customers"("email");

-- CreateIndex
CREATE INDEX "marketplace_customers_lastActiveAt_idx" ON "marketplace_customers"("lastActiveAt");

-- CreateIndex
CREATE INDEX "marketplace_customers_referralCode_idx" ON "marketplace_customers"("referralCode");

-- CreateIndex
CREATE INDEX "customer_addresses_customerId_idx" ON "customer_addresses"("customerId");

-- CreateIndex
CREATE INDEX "customer_addresses_customerId_isDefault_idx" ON "customer_addresses"("customerId", "isDefault");

-- CreateIndex
CREATE INDEX "customer_saved_cards_customerId_idx" ON "customer_saved_cards"("customerId");

-- CreateIndex
CREATE INDEX "customer_otp_codes_phone_purpose_idx" ON "customer_otp_codes"("phone", "purpose");

-- CreateIndex
CREATE INDEX "customer_otp_codes_email_purpose_idx" ON "customer_otp_codes"("email", "purpose");

-- CreateIndex
CREATE INDEX "customer_otp_codes_expiresAt_idx" ON "customer_otp_codes"("expiresAt");

-- CreateIndex
CREATE INDEX "customer_sessions_customerId_idx" ON "customer_sessions"("customerId");

-- CreateIndex
CREATE INDEX "customer_sessions_expiresAt_idx" ON "customer_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "customer_login_history_customerId_createdAt_idx" ON "customer_login_history"("customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "customer_push_tokens_token_key" ON "customer_push_tokens"("token");

-- CreateIndex
CREATE INDEX "customer_push_tokens_customerId_idx" ON "customer_push_tokens"("customerId");

-- CreateIndex
CREATE INDEX "customer_follows_shop_shopId_idx" ON "customer_follows_shop"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_follows_shop_customerId_shopId_key" ON "customer_follows_shop"("customerId", "shopId");

-- CreateIndex
CREATE INDEX "product_views_customerId_viewedAt_idx" ON "product_views"("customerId", "viewedAt");

-- CreateIndex
CREATE INDEX "product_views_productId_idx" ON "product_views"("productId");

-- CreateIndex
CREATE INDEX "customer_search_history_customerId_createdAt_idx" ON "customer_search_history"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "customer_search_history_query_idx" ON "customer_search_history"("query");

-- CreateIndex
CREATE UNIQUE INDEX "shop_marketplace_profiles_shopId_key" ON "shop_marketplace_profiles"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "shop_marketplace_profiles_slug_key" ON "shop_marketplace_profiles"("slug");

-- CreateIndex
CREATE INDEX "shop_marketplace_profiles_shopId_idx" ON "shop_marketplace_profiles"("shopId");

-- CreateIndex
CREATE INDEX "shop_marketplace_profiles_tenantId_idx" ON "shop_marketplace_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "shop_marketplace_profiles_slug_idx" ON "shop_marketplace_profiles"("slug");

-- CreateIndex
CREATE INDEX "shop_marketplace_profiles_isListedOnMarketplace_isOpen_idx" ON "shop_marketplace_profiles"("isListedOnMarketplace", "isOpen");

-- CreateIndex
CREATE INDEX "shop_marketplace_profiles_city_area_idx" ON "shop_marketplace_profiles"("city", "area");

-- CreateIndex
CREATE INDEX "shop_marketplace_profiles_industry_idx" ON "shop_marketplace_profiles"("industry");

-- CreateIndex
CREATE INDEX "shop_marketplace_profiles_ratingAverage_idx" ON "shop_marketplace_profiles"("ratingAverage");

-- CreateIndex
CREATE UNIQUE INDEX "product_marketplace_profiles_productId_key" ON "product_marketplace_profiles"("productId");

-- CreateIndex
CREATE INDEX "product_marketplace_profiles_shopId_isListedOnMarketplace_idx" ON "product_marketplace_profiles"("shopId", "isListedOnMarketplace");

-- CreateIndex
CREATE INDEX "product_marketplace_profiles_marketplaceCategory_idx" ON "product_marketplace_profiles"("marketplaceCategory");

-- CreateIndex
CREATE INDEX "product_marketplace_profiles_totalSold_idx" ON "product_marketplace_profiles"("totalSold");

-- CreateIndex
CREATE INDEX "product_marketplace_profiles_ratingAverage_idx" ON "product_marketplace_profiles"("ratingAverage");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_carts_customerId_key" ON "marketplace_carts"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_cart_lines_bargainId_key" ON "marketplace_cart_lines"("bargainId");

-- CreateIndex
CREATE INDEX "marketplace_cart_lines_cartId_idx" ON "marketplace_cart_lines"("cartId");

-- CreateIndex
CREATE INDEX "marketplace_cart_lines_shopId_idx" ON "marketplace_cart_lines"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_orders_orderNumber_key" ON "marketplace_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "marketplace_orders_customerId_status_idx" ON "marketplace_orders"("customerId", "status");

-- CreateIndex
CREATE INDEX "marketplace_orders_shopId_status_idx" ON "marketplace_orders"("shopId", "status");

-- CreateIndex
CREATE INDEX "marketplace_orders_tenantId_createdAt_idx" ON "marketplace_orders"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "marketplace_orders_orderNumber_idx" ON "marketplace_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "marketplace_orders_riderId_idx" ON "marketplace_orders"("riderId");

-- CreateIndex
CREATE INDEX "marketplace_order_items_orderId_idx" ON "marketplace_order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_status_history_orderId_idx" ON "order_status_history"("orderId");

-- CreateIndex
CREATE INDEX "wishlist_items_customerId_idx" ON "wishlist_items"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_customerId_productId_key" ON "wishlist_items"("customerId", "productId");

-- CreateIndex
CREATE INDEX "marketplace_reviews_customerId_idx" ON "marketplace_reviews"("customerId");

-- CreateIndex
CREATE INDEX "marketplace_reviews_productId_idx" ON "marketplace_reviews"("productId");

-- CreateIndex
CREATE INDEX "marketplace_reviews_shopId_idx" ON "marketplace_reviews"("shopId");

-- CreateIndex
CREATE INDEX "marketplace_reviews_orderId_idx" ON "marketplace_reviews"("orderId");

-- CreateIndex
CREATE INDEX "marketplace_reviews_rating_idx" ON "marketplace_reviews"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "review_votes_reviewId_customerId_key" ON "review_votes"("reviewId", "customerId");

-- CreateIndex
CREATE INDEX "customer_notifications_customerId_isRead_idx" ON "customer_notifications"("customerId", "isRead");

-- CreateIndex
CREATE INDEX "customer_notifications_customerId_createdAt_idx" ON "customer_notifications"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "customer_wallet_txns_customerId_createdAt_idx" ON "customer_wallet_txns"("customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticketNumber_key" ON "support_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "support_tickets_customerId_status_idx" ON "support_tickets"("customerId", "status");

-- CreateIndex
CREATE INDEX "support_tickets_status_priority_idx" ON "support_tickets"("status", "priority");

-- CreateIndex
CREATE INDEX "support_messages_ticketId_idx" ON "support_messages"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "bargains_orderId_key" ON "bargains"("orderId");

-- CreateIndex
CREATE INDEX "bargains_customerId_status_idx" ON "bargains"("customerId", "status");

-- CreateIndex
CREATE INDEX "bargains_shopId_status_idx" ON "bargains"("shopId", "status");

-- CreateIndex
CREATE INDEX "bargains_productId_idx" ON "bargains"("productId");

-- CreateIndex
CREATE INDEX "bargains_expiresAt_idx" ON "bargains"("expiresAt");

-- CreateIndex
CREATE INDEX "bargain_messages_bargainId_idx" ON "bargain_messages"("bargainId");

-- CreateIndex
CREATE INDEX "group_buys_shopId_status_idx" ON "group_buys"("shopId", "status");

-- CreateIndex
CREATE INDEX "group_buys_status_expiresAt_idx" ON "group_buys"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "group_buy_participants_customerId_idx" ON "group_buy_participants"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "group_buy_participants_groupBuyId_customerId_key" ON "group_buy_participants"("groupBuyId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "auctions_winningBidId_key" ON "auctions"("winningBidId");

-- CreateIndex
CREATE INDEX "auctions_shopId_status_idx" ON "auctions"("shopId", "status");

-- CreateIndex
CREATE INDEX "auctions_status_startsAt_endsAt_idx" ON "auctions"("status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "auction_bids_auctionId_amount_idx" ON "auction_bids"("auctionId", "amount");

-- CreateIndex
CREATE INDEX "auction_bids_customerId_idx" ON "auction_bids"("customerId");

-- CreateIndex
CREATE INDEX "live_shops_shopId_status_idx" ON "live_shops"("shopId", "status");

-- CreateIndex
CREATE INDEX "live_shops_status_scheduledAt_idx" ON "live_shops"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "live_shop_viewers_liveShopId_idx" ON "live_shop_viewers"("liveShopId");

-- CreateIndex
CREATE UNIQUE INDEX "live_shop_viewers_liveShopId_customerId_key" ON "live_shop_viewers"("liveShopId", "customerId");

-- CreateIndex
CREATE INDEX "live_shop_messages_liveShopId_createdAt_idx" ON "live_shop_messages"("liveShopId", "createdAt");

-- AddForeignKey
ALTER TABLE "marketplace_customers" ADD CONSTRAINT "marketplace_customers_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "marketplace_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_saved_cards" ADD CONSTRAINT "customer_saved_cards_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_otp_codes" ADD CONSTRAINT "customer_otp_codes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_login_history" ADD CONSTRAINT "customer_login_history_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_push_tokens" ADD CONSTRAINT "customer_push_tokens_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_follows_shop" ADD CONSTRAINT "customer_follows_shop_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_follows_shop" ADD CONSTRAINT "customer_follows_shop_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_views" ADD CONSTRAINT "product_views_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_search_history" ADD CONSTRAINT "customer_search_history_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_marketplace_profiles" ADD CONSTRAINT "shop_marketplace_profiles_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_marketplace_profiles" ADD CONSTRAINT "shop_marketplace_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_marketplace_profiles" ADD CONSTRAINT "product_marketplace_profiles_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_marketplace_profiles" ADD CONSTRAINT "product_marketplace_profiles_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_marketplace_profiles" ADD CONSTRAINT "product_marketplace_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_carts" ADD CONSTRAINT "marketplace_carts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_cart_lines" ADD CONSTRAINT "marketplace_cart_lines_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "marketplace_carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "customer_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_order_items" ADD CONSTRAINT "marketplace_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "marketplace_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "marketplace_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "marketplace_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product_marketplace_profiles"("productId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shop_marketplace_profiles"("shopId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "marketplace_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notifications" ADD CONSTRAINT "customer_notifications_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_wallet_txns" ADD CONSTRAINT "customer_wallet_txns_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bargains" ADD CONSTRAINT "bargains_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bargains" ADD CONSTRAINT "bargains_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bargains" ADD CONSTRAINT "bargains_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bargain_messages" ADD CONSTRAINT "bargain_messages_bargainId_fkey" FOREIGN KEY ("bargainId") REFERENCES "bargains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bargain_messages" ADD CONSTRAINT "bargain_messages_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_buys" ADD CONSTRAINT "group_buys_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_buys" ADD CONSTRAINT "group_buys_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_buy_participants" ADD CONSTRAINT "group_buy_participants_groupBuyId_fkey" FOREIGN KEY ("groupBuyId") REFERENCES "group_buys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_buy_participants" ADD CONSTRAINT "group_buy_participants_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_shops" ADD CONSTRAINT "live_shops_shopProfile_fkey" FOREIGN KEY ("shopId") REFERENCES "shop_marketplace_profiles"("shopId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_shop_viewers" ADD CONSTRAINT "live_shop_viewers_liveShopId_fkey" FOREIGN KEY ("liveShopId") REFERENCES "live_shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_shop_viewers" ADD CONSTRAINT "live_shop_viewers_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_shop_messages" ADD CONSTRAINT "live_shop_messages_liveShopId_fkey" FOREIGN KEY ("liveShopId") REFERENCES "live_shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_shop_messages" ADD CONSTRAINT "live_shop_messages_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "marketplace_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
