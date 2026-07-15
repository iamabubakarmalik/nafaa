/*
  Warnings:

  - You are about to drop the column `completedSaleId` on the `SalonAppointment` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `SalonAppointment` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `SalonAppointment` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `SalonAppointment` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `SalonAppointment` table. All the data in the column will be lost.
  - You are about to drop the column `serviceName` on the `SalonAppointment` table. All the data in the column will be lost.
  - You are about to drop the column `serviceProductId` on the `SalonAppointment` table. All the data in the column will be lost.
  - You are about to drop the column `staffId` on the `SalonAppointment` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `SalonAppointment` table. All the data in the column will be lost.
  - The `status` column on the `SalonAppointment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `scheduledEnd` to the `SalonAppointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduledStart` to the `SalonAppointment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SalonServiceCategory" AS ENUM ('HAIR_CUT', 'HAIR_COLOR', 'HAIR_TREATMENT', 'HAIR_STYLING', 'BEARD_SHAVE', 'FACIAL', 'MAKEUP', 'BRIDAL_MAKEUP', 'PARTY_MAKEUP', 'MANICURE', 'PEDICURE', 'NAIL_ART', 'WAXING', 'THREADING', 'MASSAGE', 'BODY_TREATMENT', 'SPA_PACKAGE', 'MEHNDI', 'HAIR_EXTENSION', 'KERATIN', 'BOTOX', 'OTHER');

-- CreateEnum
CREATE TYPE "SalonAppointmentStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "SalonMembershipTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SalonMembershipStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PAUSED');

-- CreateEnum
CREATE TYPE "SalonPackageStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SalonStaffRole" AS ENUM ('STYLIST', 'COLORIST', 'BEAUTICIAN', 'MAKEUP_ARTIST', 'NAIL_TECH', 'MASSAGE_THERAPIST', 'MEHNDI_ARTIST', 'APPRENTICE', 'RECEPTIONIST', 'MANAGER', 'OTHER');

-- CreateEnum
CREATE TYPE "SalonCommissionType" AS ENUM ('NONE', 'PERCENTAGE', 'FIXED_PER_SERVICE', 'TIERED', 'HYBRID');

-- DropForeignKey
ALTER TABLE "SalonAppointment" DROP CONSTRAINT "SalonAppointment_tenantId_fkey";

-- DropIndex
DROP INDEX "SalonAppointment_completedSaleId_key";

-- DropIndex
DROP INDEX "SalonAppointment_staffId_idx";

-- DropIndex
DROP INDEX "SalonAppointment_tenantId_startTime_idx";

-- AlterTable
ALTER TABLE "SalonAppointment" DROP COLUMN "completedSaleId",
DROP COLUMN "duration",
DROP COLUMN "endTime",
DROP COLUMN "notes",
DROP COLUMN "price",
DROP COLUMN "serviceName",
DROP COLUMN "serviceProductId",
DROP COLUMN "staffId",
DROP COLUMN "startTime",
ADD COLUMN     "actualEnd" TIMESTAMP(3),
ADD COLUMN     "actualStart" TIMESTAMP(3),
ADD COLUMN     "arrivedAt" TIMESTAMP(3),
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerFeedback" TEXT,
ADD COLUMN     "customerNotes" TEXT,
ADD COLUMN     "customerRating" INTEGER,
ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "membershipId" TEXT,
ADD COLUMN     "packageId" TEXT,
ADD COLUMN     "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "reminderSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderSentAt" TIMESTAMP(3),
ADD COLUMN     "saleId" TEXT,
ADD COLUMN     "scheduledEnd" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "scheduledStart" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "serviceCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "tip" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "customerName" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "SalonAppointmentStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "SalonAppointmentLegacy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "customerId" TEXT,
    "staffId" TEXT,
    "serviceProductId" TEXT,
    "appointmentNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "serviceName" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "completedSaleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalonAppointmentLegacy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonService" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" "SalonServiceCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountPrice" DOUBLE PRECISION,
    "costPrice" DOUBLE PRECISION,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "bufferBefore" INTEGER NOT NULL DEFAULT 0,
    "bufferAfter" INTEGER NOT NULL DEFAULT 0,
    "forMen" BOOLEAN NOT NULL DEFAULT true,
    "forWomen" BOOLEAN NOT NULL DEFAULT true,
    "forKids" BOOLEAN NOT NULL DEFAULT false,
    "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionFixed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalonService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonStaffProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "role" "SalonStaffRole" NOT NULL DEFAULT 'STYLIST',
    "specialization" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experienceYears" INTEGER,
    "bio" TEXT,
    "photoUrl" TEXT,
    "commissionType" "SalonCommissionType" NOT NULL DEFAULT 'NONE',
    "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionFixed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "workStartTime" TEXT NOT NULL DEFAULT '09:00',
    "workEndTime" TEXT NOT NULL DEFAULT '21:00',
    "breakStartTime" TEXT,
    "breakEndTime" TEXT,
    "isBookable" BOOLEAN NOT NULL DEFAULT true,
    "maxDailyBookings" INTEGER,
    "bookingBuffer" INTEGER NOT NULL DEFAULT 0,
    "totalAppointments" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalonStaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonStaffService" (
    "id" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "customPrice" DOUBLE PRECISION,
    "customDuration" INTEGER,
    "customCommissionPct" DOUBLE PRECISION,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalonStaffService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonAppointmentService" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "staffProfileId" TEXT,
    "staffName" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "actualDurationMinutes" INTEGER,
    "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionPaid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "productsUsed" JSONB,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalonAppointmentService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonMembershipPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "SalonMembershipTier" NOT NULL DEFAULT 'SILVER',
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 365,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freeServiceCount" INTEGER NOT NULL DEFAULT 0,
    "freeServiceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priorityBooking" BOOLEAN NOT NULL DEFAULT false,
    "freeConsultation" BOOLEAN NOT NULL DEFAULT false,
    "birthdayBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "colorTheme" TEXT,
    "iconUrl" TEXT,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "totalSubscribers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalonMembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "membershipNumber" TEXT NOT NULL,
    "status" "SalonMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "usedServices" INTEGER NOT NULL DEFAULT 0,
    "totalSaved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalonMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonPackage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "originalPrice" DOUBLE PRECISION,
    "services" JSONB NOT NULL,
    "totalSessions" INTEGER NOT NULL,
    "validityDays" INTEGER NOT NULL DEFAULT 90,
    "imageUrl" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalonPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonPackagePurchase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "purchaseNumber" TEXT NOT NULL,
    "status" "SalonPackageStatus" NOT NULL DEFAULT 'ACTIVE',
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "sessionsUsed" INTEGER NOT NULL DEFAULT 0,
    "sessionsRemaining" INTEGER NOT NULL DEFAULT 0,
    "usageLog" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalonPackagePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonCustomerProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "hairType" TEXT,
    "hairLength" TEXT,
    "hairColor" TEXT,
    "hairTexture" TEXT,
    "skinType" TEXT,
    "skinTone" TEXT,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredStaffId" TEXT,
    "preferredServices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "favoriteBrands" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medicalConditions" TEXT,
    "medications" TEXT,
    "pregnancyStatus" TEXT,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastVisitAt" TIMESTAMP(3),
    "avgRating" DOUBLE PRECISION,
    "notes" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalonCustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalonAppointmentLegacy_completedSaleId_key" ON "SalonAppointmentLegacy"("completedSaleId");

-- CreateIndex
CREATE INDEX "SalonAppointmentLegacy_tenantId_idx" ON "SalonAppointmentLegacy"("tenantId");

-- CreateIndex
CREATE INDEX "SalonAppointmentLegacy_tenantId_startTime_idx" ON "SalonAppointmentLegacy"("tenantId", "startTime");

-- CreateIndex
CREATE INDEX "SalonAppointmentLegacy_tenantId_status_idx" ON "SalonAppointmentLegacy"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SalonAppointmentLegacy_staffId_idx" ON "SalonAppointmentLegacy"("staffId");

-- CreateIndex
CREATE INDEX "SalonAppointmentLegacy_customerId_idx" ON "SalonAppointmentLegacy"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "SalonAppointmentLegacy_tenantId_appointmentNumber_key" ON "SalonAppointmentLegacy"("tenantId", "appointmentNumber");

-- CreateIndex
CREATE INDEX "SalonService_tenantId_idx" ON "SalonService"("tenantId");

-- CreateIndex
CREATE INDEX "SalonService_tenantId_category_idx" ON "SalonService"("tenantId", "category");

-- CreateIndex
CREATE INDEX "SalonService_tenantId_isActive_idx" ON "SalonService"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SalonService_tenantId_name_key" ON "SalonService"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SalonStaffProfile_staffId_key" ON "SalonStaffProfile"("staffId");

-- CreateIndex
CREATE INDEX "SalonStaffProfile_tenantId_idx" ON "SalonStaffProfile"("tenantId");

-- CreateIndex
CREATE INDEX "SalonStaffProfile_tenantId_role_idx" ON "SalonStaffProfile"("tenantId", "role");

-- CreateIndex
CREATE INDEX "SalonStaffService_staffProfileId_idx" ON "SalonStaffService"("staffProfileId");

-- CreateIndex
CREATE INDEX "SalonStaffService_serviceId_idx" ON "SalonStaffService"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "SalonStaffService_staffProfileId_serviceId_key" ON "SalonStaffService"("staffProfileId", "serviceId");

-- CreateIndex
CREATE INDEX "SalonAppointmentService_appointmentId_idx" ON "SalonAppointmentService"("appointmentId");

-- CreateIndex
CREATE INDEX "SalonAppointmentService_serviceId_idx" ON "SalonAppointmentService"("serviceId");

-- CreateIndex
CREATE INDEX "SalonAppointmentService_staffProfileId_idx" ON "SalonAppointmentService"("staffProfileId");

-- CreateIndex
CREATE INDEX "SalonMembershipPlan_tenantId_idx" ON "SalonMembershipPlan"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SalonMembershipPlan_tenantId_name_key" ON "SalonMembershipPlan"("tenantId", "name");

-- CreateIndex
CREATE INDEX "SalonMembership_tenantId_idx" ON "SalonMembership"("tenantId");

-- CreateIndex
CREATE INDEX "SalonMembership_tenantId_status_idx" ON "SalonMembership"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SalonMembership_customerId_idx" ON "SalonMembership"("customerId");

-- CreateIndex
CREATE INDEX "SalonMembership_expiryDate_idx" ON "SalonMembership"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "SalonMembership_tenantId_membershipNumber_key" ON "SalonMembership"("tenantId", "membershipNumber");

-- CreateIndex
CREATE INDEX "SalonPackage_tenantId_idx" ON "SalonPackage"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SalonPackage_tenantId_name_key" ON "SalonPackage"("tenantId", "name");

-- CreateIndex
CREATE INDEX "SalonPackagePurchase_tenantId_idx" ON "SalonPackagePurchase"("tenantId");

-- CreateIndex
CREATE INDEX "SalonPackagePurchase_tenantId_status_idx" ON "SalonPackagePurchase"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SalonPackagePurchase_customerId_idx" ON "SalonPackagePurchase"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "SalonPackagePurchase_tenantId_purchaseNumber_key" ON "SalonPackagePurchase"("tenantId", "purchaseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SalonCustomerProfile_customerId_key" ON "SalonCustomerProfile"("customerId");

-- CreateIndex
CREATE INDEX "SalonCustomerProfile_tenantId_idx" ON "SalonCustomerProfile"("tenantId");

-- CreateIndex
CREATE INDEX "SalonCustomerProfile_customerId_idx" ON "SalonCustomerProfile"("customerId");

-- CreateIndex
CREATE INDEX "SalonAppointment_tenantId_status_idx" ON "SalonAppointment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SalonAppointment_scheduledStart_idx" ON "SalonAppointment"("scheduledStart");

-- AddForeignKey
ALTER TABLE "SalonAppointmentLegacy" ADD CONSTRAINT "SalonAppointmentLegacy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonStaffService" ADD CONSTRAINT "SalonStaffService_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "SalonStaffProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonAppointment" ADD CONSTRAINT "SalonAppointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonAppointmentService" ADD CONSTRAINT "SalonAppointmentService_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "SalonAppointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonMembership" ADD CONSTRAINT "SalonMembership_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SalonMembershipPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonPackagePurchase" ADD CONSTRAINT "SalonPackagePurchase_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SalonPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
