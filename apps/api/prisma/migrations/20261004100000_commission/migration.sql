-- Commission — bandon ka hissa
-- Sab kuch naya hai: koi maujooda table ya column nahi badla ja raha,
-- is liye chalti hui dukaanon ka data jyun ka tyun rehta hai.

CREATE TYPE "CommissionBasis" AS ENUM ('SALE', 'PROFIT', 'PER_BILL');
CREATE TYPE "CommissionValueType" AS ENUM ('PERCENT', 'FIXED');

CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT,
    "userId" TEXT,
    "basis" "CommissionBasis" NOT NULL,
    "valueType" "CommissionValueType" NOT NULL DEFAULT 'PERCENT',
    "value" DOUBLE PRECISION NOT NULL,
    "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minMonthlySale" DOUBLE PRECISION,
    "targetAmount" DOUBLE PRECISION,
    "targetBonus" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommissionEnrollment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "staffId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommissionPayout" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionPayout_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommissionRule_tenantId_idx" ON "CommissionRule"("tenantId");
CREATE INDEX "CommissionRule_tenantId_isActive_idx" ON "CommissionRule"("tenantId", "isActive");
CREATE INDEX "CommissionRule_userId_idx" ON "CommissionRule"("userId");

CREATE INDEX "CommissionEnrollment_tenantId_idx" ON "CommissionEnrollment"("tenantId");
CREATE INDEX "CommissionEnrollment_tenantId_isActive_idx" ON "CommissionEnrollment"("tenantId", "isActive");
CREATE UNIQUE INDEX "CommissionEnrollment_tenantId_userId_key" ON "CommissionEnrollment"("tenantId", "userId");

CREATE INDEX "CommissionPayout_tenantId_idx" ON "CommissionPayout"("tenantId");
CREATE INDEX "CommissionPayout_tenantId_period_idx" ON "CommissionPayout"("tenantId", "period");
CREATE UNIQUE INDEX "CommissionPayout_tenantId_userId_period_key" ON "CommissionPayout"("tenantId", "userId", "period");

ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommissionEnrollment" ADD CONSTRAINT "CommissionEnrollment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommissionEnrollment" ADD CONSTRAINT "CommissionEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommissionEnrollment" ADD CONSTRAINT "CommissionEnrollment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
