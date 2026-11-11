-- Partner portal. Additive only: one new enum value, new enums and tables,
-- and three nullable columns on Tenant. No existing row changes.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PARTNER';

CREATE TYPE "PartnerType" AS ENUM ('REFERRAL', 'FIELD_AGENT', 'RESELLER', 'TRAINER', 'EMPLOYEE');
CREATE TYPE "PartnerStatus" AS ENUM ('APPLIED', 'ACTIVE', 'SUSPENDED', 'REJECTED');
CREATE TYPE "PartnerLeadStage" AS ENUM ('VISITED', 'DEMO', 'SIGNED_UP', 'ACTIVATED', 'PAID', 'LOST');
CREATE TYPE "PartnerEarningKind" AS ENUM ('SIGNUP_BONUS', 'ACTIVATION_BONUS', 'RECURRING', 'OVERRIDE', 'SLAB_BONUS', 'ADJUSTMENT');
CREATE TYPE "PartnerEarningStatus" AS ENUM ('PENDING', 'PAYABLE', 'PAID', 'REVERSED');
CREATE TYPE "PartnerPayoutStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PAID', 'REJECTED');

ALTER TABLE "Tenant" ADD COLUMN "partnerId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "partnerAttributedAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "partnerSource" TEXT;

CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL DEFAULT 'REFERRAL',
    "status" "PartnerStatus" NOT NULL DEFAULT 'APPLIED',
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "cnic" TEXT,
    "city" TEXT,
    "territory" TEXT,
    "isManager" BOOLEAN NOT NULL DEFAULT false,
    "managerId" TEXT,
    "planId" TEXT,
    "salary" DOUBLE PRECISION,
    "incentivesOn" BOOLEAN NOT NULL DEFAULT true,
    "payoutMethod" TEXT,
    "payoutAccount" TEXT,
    "payoutTitle" TEXT,
    "bankName" TEXT,
    "notes" TEXT,
    "rejectReason" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "signupBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activationBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activationSales" INTEGER NOT NULL DEFAULT 20,
    "activationDays" INTEGER NOT NULL DEFAULT 30,
    "recurringPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recurringMonths" INTEGER NOT NULL DEFAULT 0,
    "managerOverridePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clawbackDays" INTEGER NOT NULL DEFAULT 30,
    "slabs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartnerPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerLead" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "ownerName" TEXT,
    "phone" TEXT NOT NULL,
    "category" TEXT,
    "city" TEXT,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "interest" TEXT,
    "stage" "PartnerLeadStage" NOT NULL DEFAULT 'VISITED',
    "lostReason" TEXT,
    "followUpAt" TIMESTAMP(3),
    "notes" TEXT,
    "tenantId" TEXT,
    "lockedUntil" TIMESTAMP(3) NOT NULL,
    "signedUpAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartnerLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerVisit" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "clientId" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "photoUrl" TEXT,
    "note" TEXT,
    "visitedAt" TIMESTAMP(3) NOT NULL,
    "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "review" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerVisit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerEarning" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "tenantId" TEXT,
    "kind" "PartnerEarningKind" NOT NULL,
    "status" "PartnerEarningStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "sourceRef" TEXT,
    "availableAt" TIMESTAMP(3) NOT NULL,
    "reversedReason" TEXT,
    "payoutId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartnerEarning_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerPayout" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PartnerPayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "method" TEXT,
    "account" TEXT,
    "accountTitle" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "rejectReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "paidAt" TIMESTAMP(3),
    CONSTRAINT "PartnerPayout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerTarget" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "signups" INTEGER NOT NULL DEFAULT 0,
    "activations" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartnerTarget_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Tenant_partnerId_idx" ON "Tenant"("partnerId");
CREATE UNIQUE INDEX "Partner_userId_key" ON "Partner"("userId");
CREATE UNIQUE INDEX "Partner_code_key" ON "Partner"("code");
CREATE UNIQUE INDEX "Partner_phone_key" ON "Partner"("phone");
CREATE INDEX "Partner_status_idx" ON "Partner"("status");
CREATE INDEX "Partner_type_idx" ON "Partner"("type");
CREATE INDEX "Partner_managerId_idx" ON "Partner"("managerId");
CREATE INDEX "Partner_city_idx" ON "Partner"("city");
CREATE INDEX "PartnerLead_partnerId_stage_idx" ON "PartnerLead"("partnerId", "stage");
CREATE INDEX "PartnerLead_phone_idx" ON "PartnerLead"("phone");
CREATE INDEX "PartnerLead_tenantId_idx" ON "PartnerLead"("tenantId");
CREATE INDEX "PartnerLead_followUpAt_idx" ON "PartnerLead"("followUpAt");
CREATE UNIQUE INDEX "PartnerVisit_clientId_key" ON "PartnerVisit"("clientId");
CREATE INDEX "PartnerVisit_partnerId_visitedAt_idx" ON "PartnerVisit"("partnerId", "visitedAt");
CREATE INDEX "PartnerVisit_leadId_idx" ON "PartnerVisit"("leadId");
CREATE INDEX "PartnerVisit_visitedAt_idx" ON "PartnerVisit"("visitedAt");
CREATE UNIQUE INDEX "PartnerEarning_sourceRef_key" ON "PartnerEarning"("sourceRef");
CREATE INDEX "PartnerEarning_partnerId_status_idx" ON "PartnerEarning"("partnerId", "status");
CREATE INDEX "PartnerEarning_status_availableAt_idx" ON "PartnerEarning"("status", "availableAt");
CREATE INDEX "PartnerEarning_tenantId_idx" ON "PartnerEarning"("tenantId");
CREATE INDEX "PartnerPayout_partnerId_status_idx" ON "PartnerPayout"("partnerId", "status");
CREATE INDEX "PartnerPayout_status_idx" ON "PartnerPayout"("status");
CREATE UNIQUE INDEX "PartnerTarget_partnerId_month_key" ON "PartnerTarget"("partnerId", "month");

ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PartnerPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartnerLead" ADD CONSTRAINT "PartnerLead_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerVisit" ADD CONSTRAINT "PartnerVisit_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerVisit" ADD CONSTRAINT "PartnerVisit_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "PartnerLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerEarning" ADD CONSTRAINT "PartnerEarning_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerEarning" ADD CONSTRAINT "PartnerEarning_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "PartnerPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartnerPayout" ADD CONSTRAINT "PartnerPayout_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerTarget" ADD CONSTRAINT "PartnerTarget_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
