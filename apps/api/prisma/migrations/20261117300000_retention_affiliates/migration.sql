-- Retention and affiliates: WhatsApp campaigns sent one by one, review
-- requests with a public rating link, online loyalty and referral records,
-- and influencer / affiliate codes with their payouts. Additive only; new
-- tables, no backfill needed.

CREATE TABLE IF NOT EXISTS "online_campaigns" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "segment" TEXT NOT NULL,
  "template" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "code" TEXT,
  "link" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "online_campaigns_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "online_campaigns_tenantId_createdAt_idx" ON "online_campaigns"("tenantId", "createdAt");

CREATE TABLE IF NOT EXISTS "online_campaign_recipients" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "phoneKey" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "sentAt" TIMESTAMP(3),
  "sentById" TEXT,
  "replied" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "online_campaign_recipients_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "online_campaign_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "online_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "online_campaign_recipients_campaignId_phoneKey_key" ON "online_campaign_recipients"("campaignId", "phoneKey");
CREATE INDEX IF NOT EXISTS "online_campaign_recipients_campaignId_status_idx" ON "online_campaign_recipients"("campaignId", "status");
CREATE INDEX IF NOT EXISTS "online_campaign_recipients_tenantId_phoneKey_idx" ON "online_campaign_recipients"("tenantId", "phoneKey");

CREATE TABLE IF NOT EXISTS "online_reviews" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "channelOrderId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "orderNo" TEXT,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "sentAt" TIMESTAMP(3),
  "rating" INTEGER,
  "comment" TEXT,
  "ratedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "online_reviews_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "online_reviews_channelOrderId_key" ON "online_reviews"("channelOrderId");
CREATE UNIQUE INDEX IF NOT EXISTS "online_reviews_token_key" ON "online_reviews"("token");
CREATE INDEX IF NOT EXISTS "online_reviews_tenantId_createdAt_idx" ON "online_reviews"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "online_reviews_tenantId_ratedAt_idx" ON "online_reviews"("tenantId", "ratedAt");

CREATE TABLE IF NOT EXISTS "customer_referrals" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_referrals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "customer_referrals_tenantId_code_key" ON "customer_referrals"("tenantId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "customer_referrals_tenantId_customerId_key" ON "customer_referrals"("tenantId", "customerId");

CREATE TABLE IF NOT EXISTS "online_loyalty_entries" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "channelOrderId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 0,
  "referralId" TEXT,
  "friendPhoneKey" TEXT,
  "discount" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "online_loyalty_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "online_loyalty_entries_channelOrderId_kind_key" ON "online_loyalty_entries"("channelOrderId", "kind");
CREATE INDEX IF NOT EXISTS "online_loyalty_entries_tenantId_kind_createdAt_idx" ON "online_loyalty_entries"("tenantId", "kind", "createdAt");
CREATE INDEX IF NOT EXISTS "online_loyalty_entries_referralId_idx" ON "online_loyalty_entries"("referralId");

CREATE TABLE IF NOT EXISTS "affiliates" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "kind" TEXT NOT NULL DEFAULT 'INFLUENCER',
  "platform" TEXT,
  "handle" TEXT,
  "slug" TEXT NOT NULL,
  "codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "commissionType" TEXT NOT NULL DEFAULT 'PERCENT',
  "commissionValue" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "affiliates_tenantId_slug_key" ON "affiliates"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "affiliates_tenantId_active_idx" ON "affiliates"("tenantId", "active");

CREATE TABLE IF NOT EXISTS "affiliate_payouts" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "affiliateId" TEXT NOT NULL,
  "periodFrom" TIMESTAMP(3) NOT NULL,
  "periodTo" TIMESTAMP(3) NOT NULL,
  "orders" INTEGER NOT NULL DEFAULT 0,
  "sales" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paymentMethod" TEXT NOT NULL,
  "expenseId" TEXT,
  "expenseNumber" TEXT,
  "note" TEXT,
  "paidById" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "affiliate_payouts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "affiliate_payouts_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "affiliate_payouts_tenantId_affiliateId_idx" ON "affiliate_payouts"("tenantId", "affiliateId");

CREATE TABLE IF NOT EXISTS "affiliate_orders" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "affiliateId" TEXT NOT NULL,
  "channelOrderId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "orderTotal" DOUBLE PRECISION,
  "commission" DOUBLE PRECISION,
  "payoutId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "affiliate_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "affiliate_orders_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_orders_tenantId_channelOrderId_key" ON "affiliate_orders"("tenantId", "channelOrderId");
CREATE INDEX IF NOT EXISTS "affiliate_orders_affiliateId_idx" ON "affiliate_orders"("affiliateId");
CREATE INDEX IF NOT EXISTS "affiliate_orders_payoutId_idx" ON "affiliate_orders"("payoutId");
