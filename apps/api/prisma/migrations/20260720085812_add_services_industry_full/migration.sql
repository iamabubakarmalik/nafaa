-- CreateEnum
CREATE TYPE "ServiceBusinessType" AS ENUM ('ELECTRICIAN', 'PLUMBER', 'AC_TECHNICIAN', 'APPLIANCE_REPAIR', 'MOBILE_REPAIR', 'COMPUTER_REPAIR', 'IT_SERVICES', 'CLEANING', 'PEST_CONTROL', 'CARPENTRY', 'PAINTING', 'MASONRY', 'WELDING', 'GLASS_WORK', 'CCTV_INSTALLATION', 'SOLAR_INSTALLATION', 'GENERATOR_SERVICE', 'UPS_SERVICE', 'WATER_TANK_CLEANING', 'HOME_MAINTENANCE', 'OFFICE_MAINTENANCE', 'AUTOMOBILE_MECHANIC', 'MOTORCYCLE_MECHANIC', 'MOVERS_PACKERS', 'INTERIOR_DESIGN', 'LANDSCAPING', 'HVAC', 'ELEVATOR_MAINTENANCE', 'FIRE_SAFETY', 'SECURITY_SYSTEMS', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('INSTALLATION', 'REPAIR', 'MAINTENANCE', 'INSPECTION', 'CLEANING_SERVICE', 'UPGRADE', 'REPLACEMENT', 'DIAGNOSTIC', 'EMERGENCY', 'CONSULTATION', 'AMC_VISIT', 'WARRANTY_CLAIM', 'RETURN_VISIT', 'OTHER_SERVICE');

-- CreateEnum
CREATE TYPE "ServiceJobStatus" AS ENUM ('DRAFT', 'ENQUIRY', 'QUOTED', 'CONFIRMED', 'SCHEDULED', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'PAUSED', 'AWAITING_PARTS', 'AWAITING_APPROVAL', 'QUALITY_CHECK', 'COMPLETED', 'UNABLE_TO_COMPLETE', 'RESCHEDULED', 'CANCELLED', 'WARRANTY_HOLD', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ServicePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "TechnicianStatus" AS ENUM ('AVAILABLE', 'ON_JOB', 'ON_BREAK', 'OFF_DUTY', 'ON_LEAVE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "TechnicianLevel" AS ENUM ('APPRENTICE', 'JUNIOR', 'SENIOR', 'EXPERT', 'MASTER', 'SUPERVISOR', 'MANAGER');

-- CreateEnum
CREATE TYPE "ServiceLocationType" AS ENUM ('CUSTOMER_HOME', 'CUSTOMER_OFFICE', 'CUSTOMER_SHOP', 'IN_SHOP', 'ONLINE_REMOTE', 'FIELD_SITE', 'OTHER');

-- CreateEnum
CREATE TYPE "AmcStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED', 'RENEWAL_DUE');

-- CreateEnum
CREATE TYPE "AmcType" AS ENUM ('BASIC', 'STANDARD', 'PREMIUM', 'COMPREHENSIVE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WarrantyType" AS ENUM ('MANUFACTURER', 'SERVICE_PROVIDER', 'EXTENDED', 'PARTS_ONLY', 'LABOR_ONLY', 'FULL', 'NONE');

-- CreateEnum
CREATE TYPE "ServiceChargeType" AS ENUM ('FIXED', 'HOURLY', 'PER_VISIT', 'DISTANCE_BASED', 'COMPLEXITY_BASED', 'QUOTE_BASED', 'FREE_UNDER_WARRANTY', 'FREE_UNDER_AMC');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'REVISED');

-- CreateTable
CREATE TABLE "ServiceCatalog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "category" "ServiceCategory" NOT NULL DEFAULT 'REPAIR',
    "businessType" "ServiceBusinessType",
    "chargeType" "ServiceChargeType" NOT NULL DEFAULT 'FIXED',
    "baseCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "visitCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxCharge" DOUBLE PRECISION,
    "emergencyCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weekendCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nightCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outOfCityCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedDurationMin" INTEGER NOT NULL DEFAULT 60,
    "minDurationMin" INTEGER,
    "maxDurationMin" INTEGER,
    "requiredSkillLevel" "TechnicianLevel" NOT NULL DEFAULT 'JUNIOR',
    "requiredTools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredParts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiresLicense" BOOLEAN NOT NULL DEFAULT false,
    "licenseType" TEXT,
    "warrantyDays" INTEGER NOT NULL DEFAULT 0,
    "warrantyType" "WarrantyType" NOT NULL DEFAULT 'NONE',
    "warrantyTerms" TEXT,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "isRemoteAvailable" BOOLEAN NOT NULL DEFAULT false,
    "requiresQuote" BOOLEAN NOT NULL DEFAULT false,
    "requiresAdvance" BOOLEAN NOT NULL DEFAULT false,
    "advancePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videoUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalJobs" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "avgDurationMin" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTechnicianProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "employeeCode" TEXT,
    "level" "TechnicianLevel" NOT NULL DEFAULT 'JUNIOR',
    "status" "TechnicianStatus" NOT NULL DEFAULT 'AVAILABLE',
    "primarySkill" "ServiceBusinessType",
    "secondarySkills" "ServiceBusinessType"[] DEFAULT ARRAY[]::"ServiceBusinessType"[],
    "certifications" JSONB,
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "bio" TEXT,
    "photoUrl" TEXT,
    "cnicNumber" TEXT,
    "licenseNumber" TEXT,
    "licenseExpiryDate" TIMESTAMP(3),
    "drivingLicense" TEXT,
    "vehicleAssigned" TEXT,
    "vehicleNumber" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "serviceAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "homeCity" TEXT,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "lastLocationAt" TIMESTAMP(3),
    "maxTravelKm" INTEGER,
    "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "workStartTime" TEXT NOT NULL DEFAULT '08:00',
    "workEndTime" TEXT NOT NULL DEFAULT '20:00',
    "breakStartTime" TEXT,
    "breakEndTime" TEXT,
    "isAvailableForEmergency" BOOLEAN NOT NULL DEFAULT false,
    "isAvailableWeekends" BOOLEAN NOT NULL DEFAULT true,
    "isAvailableNights" BOOLEAN NOT NULL DEFAULT false,
    "commissionType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fixedPerJob" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlySalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performanceBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDailyJobs" INTEGER,
    "maxOngoingJobs" INTEGER NOT NULL DEFAULT 3,
    "bookingBufferMin" INTEGER NOT NULL DEFAULT 30,
    "totalJobs" INTEGER NOT NULL DEFAULT 0,
    "completedJobs" INTEGER NOT NULL DEFAULT 0,
    "cancelledJobs" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "onTimePct" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "completionPct" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceTechnicianProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTechnicianSkill" (
    "id" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "skillLevel" "TechnicianLevel" NOT NULL DEFAULT 'JUNIOR',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "customRate" DOUBLE PRECISION,
    "customDuration" INTEGER,
    "certifiedAt" TIMESTAMP(3),
    "certifiedBy" TEXT,
    "totalJobs" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceTechnicianSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "jobNumber" TEXT NOT NULL,
    "ticketNumber" TEXT,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerAltPhone" TEXT,
    "customerEmail" TEXT,
    "customerType" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "serviceId" TEXT,
    "serviceName" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL DEFAULT 'REPAIR',
    "businessType" "ServiceBusinessType",
    "priority" "ServicePriority" NOT NULL DEFAULT 'NORMAL',
    "status" "ServiceJobStatus" NOT NULL DEFAULT 'ENQUIRY',
    "problemDescription" TEXT NOT NULL,
    "customerReportedIssue" TEXT,
    "urgencyReason" TEXT,
    "brand" TEXT,
    "modelNumber" TEXT,
    "serialNumber" TEXT,
    "yearPurchased" INTEGER,
    "purchasedFrom" TEXT,
    "underWarranty" BOOLEAN NOT NULL DEFAULT false,
    "warrantyType" "WarrantyType",
    "warrantyExpiryDate" TIMESTAMP(3),
    "amcId" TEXT,
    "locationType" "ServiceLocationType" NOT NULL DEFAULT 'CUSTOMER_HOME',
    "serviceAddress" TEXT,
    "city" TEXT,
    "area" TEXT,
    "landmark" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "entryInstructions" TEXT,
    "requestedDate" TIMESTAMP(3),
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "preferredTimeSlot" TEXT,
    "assignedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "enRouteAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "resumedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "primaryTechnicianId" TEXT,
    "assistantTechnicianIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supervisorId" TEXT,
    "visitCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "labourCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "partsCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transportCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emergencyCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "advanceRequired" BOOLEAN NOT NULL DEFAULT false,
    "advanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advanceCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jobWarrantyDays" INTEGER NOT NULL DEFAULT 0,
    "jobWarrantyExpiryDate" TIMESTAMP(3),
    "jobWarrantyTerms" TEXT,
    "needsReturnVisit" BOOLEAN NOT NULL DEFAULT false,
    "returnVisitReason" TEXT,
    "returnVisitDate" TIMESTAMP(3),
    "parentJobId" TEXT,
    "workCompletionSignatureUrl" TEXT,
    "customerSatisfaction" TEXT,
    "customerRating" INTEGER,
    "customerFeedback" TEXT,
    "wouldRecommend" BOOLEAN,
    "beforePhotoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "duringPhotoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "afterPhotoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "technicianNotes" TEXT,
    "internalNotes" TEXT,
    "quotedBy" TEXT,
    "createdById" TEXT,
    "cancellationReason" TEXT,
    "followUpDate" TIMESTAMP(3),
    "followUpDone" BOOLEAN NOT NULL DEFAULT false,
    "followUpNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceJobPart" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "productId" TEXT,
    "partName" TEXT NOT NULL,
    "partNumber" TEXT,
    "brand" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isCustomerSupplied" BOOLEAN NOT NULL DEFAULT false,
    "isUnderWarranty" BOOLEAN NOT NULL DEFAULT false,
    "warrantyDays" INTEGER NOT NULL DEFAULT 0,
    "serialNumber" TEXT,
    "notes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceJobPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceJobTimeLog" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "technicianId" TEXT,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "ServiceJobTimeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceJobStatusHistory" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "fromStatus" "ServiceJobStatus",
    "toStatus" "ServiceJobStatus" NOT NULL,
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "notes" TEXT,

    CONSTRAINT "ServiceJobStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceQuote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "serviceId" TEXT,
    "serviceName" TEXT NOT NULL,
    "problemDescription" TEXT NOT NULL,
    "siteVisitRequired" BOOLEAN NOT NULL DEFAULT false,
    "siteVisitCompleted" BOOLEAN NOT NULL DEFAULT false,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "labourCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "partsCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "visitCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineItems" JSONB,
    "validUntil" TIMESTAMP(3),
    "termsConditions" TEXT,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "convertedJobId" TEXT,
    "createdById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAmc" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amcNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "type" "AmcType" NOT NULL DEFAULT 'STANDARD',
    "status" "AmcStatus" NOT NULL DEFAULT 'ACTIVE',
    "coveredItems" JSONB NOT NULL,
    "coveredServiceTypes" "ServiceBusinessType"[] DEFAULT ARRAY[]::"ServiceBusinessType"[],
    "numberOfVisits" INTEGER NOT NULL DEFAULT 4,
    "visitsUsed" INTEGER NOT NULL DEFAULT 0,
    "visitsRemaining" INTEGER NOT NULL DEFAULT 4,
    "includesParts" BOOLEAN NOT NULL DEFAULT false,
    "includesLabour" BOOLEAN NOT NULL DEFAULT true,
    "partsCapAmount" DOUBLE PRECISION,
    "emergencyIncluded" BOOLEAN NOT NULL DEFAULT false,
    "emergencyDiscountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contractValue" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMode" TEXT,
    "paymentInstallments" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 30,
    "serviceAddress" TEXT NOT NULL,
    "city" TEXT,
    "numberOfSites" INTEGER NOT NULL DEFAULT 1,
    "contractDocUrl" TEXT,
    "termsConditions" TEXT,
    "specialConditions" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "refundAmount" DOUBLE PRECISION,
    "createdById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceAmc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAmcVisit" (
    "id" TEXT NOT NULL,
    "amcId" TEXT NOT NULL,
    "visitNumber" INTEGER NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "technicianId" TEXT,
    "serviceJobId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "visitType" TEXT NOT NULL DEFAULT 'MAINTENANCE',
    "checklistCompleted" JSONB,
    "workDone" TEXT,
    "partsReplaced" JSONB,
    "recommendations" TEXT,
    "customerRating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceAmcVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceWarrantyClaim" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "originalJobId" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "claimType" "WarrantyType" NOT NULL DEFAULT 'SERVICE_PROVIDER',
    "claimDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issueDescription" TEXT NOT NULL,
    "originalServiceDate" TIMESTAMP(3),
    "warrantyExpiryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "newJobId" TEXT,
    "resolutionType" TEXT,
    "resolutionNotes" TEXT,
    "costToCompany" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceWarrantyClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCustomerProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "propertyType" TEXT,
    "propertySize" TEXT,
    "ownershipType" TEXT,
    "preferredTechnicianId" TEXT,
    "preferredTimeSlot" TEXT,
    "paymentPreference" TEXT,
    "assetsOwned" JSONB,
    "emergencyAccessInstructions" TEXT,
    "hasSecurityGuard" BOOLEAN NOT NULL DEFAULT false,
    "hasPets" BOOLEAN NOT NULL DEFAULT false,
    "petDetails" TEXT,
    "gateCode" TEXT,
    "buildingName" TEXT,
    "floorNumber" TEXT,
    "flatNumber" TEXT,
    "preferredContact" TEXT NOT NULL DEFAULT 'PHONE',
    "bestTimeToCall" TEXT,
    "totalJobs" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastServiceAt" TIMESTAMP(3),
    "avgRating" DOUBLE PRECISION,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "hasActiveAmc" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceZone" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "centerLat" DOUBLE PRECISION,
    "centerLng" DOUBLE PRECISION,
    "radiusKm" DOUBLE PRECISION,
    "travelCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emergencyChargeExtra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minEmergencyChargeThreshold" DOUBLE PRECISION,
    "defaultTravelTimeMin" INTEGER NOT NULL DEFAULT 30,
    "activeHours" TEXT NOT NULL DEFAULT '24x7',
    "isEmergencyServed" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceZone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceCatalog_tenantId_idx" ON "ServiceCatalog"("tenantId");

-- CreateIndex
CREATE INDEX "ServiceCatalog_tenantId_category_idx" ON "ServiceCatalog"("tenantId", "category");

-- CreateIndex
CREATE INDEX "ServiceCatalog_tenantId_businessType_idx" ON "ServiceCatalog"("tenantId", "businessType");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCatalog_tenantId_name_key" ON "ServiceCatalog"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceTechnicianProfile_staffId_key" ON "ServiceTechnicianProfile"("staffId");

-- CreateIndex
CREATE INDEX "ServiceTechnicianProfile_tenantId_idx" ON "ServiceTechnicianProfile"("tenantId");

-- CreateIndex
CREATE INDEX "ServiceTechnicianProfile_tenantId_status_idx" ON "ServiceTechnicianProfile"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ServiceTechnicianProfile_tenantId_primarySkill_idx" ON "ServiceTechnicianProfile"("tenantId", "primarySkill");

-- CreateIndex
CREATE INDEX "ServiceTechnicianSkill_technicianId_idx" ON "ServiceTechnicianSkill"("technicianId");

-- CreateIndex
CREATE INDEX "ServiceTechnicianSkill_serviceId_idx" ON "ServiceTechnicianSkill"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceTechnicianSkill_technicianId_serviceId_key" ON "ServiceTechnicianSkill"("technicianId", "serviceId");

-- CreateIndex
CREATE INDEX "ServiceJob_tenantId_idx" ON "ServiceJob"("tenantId");

-- CreateIndex
CREATE INDEX "ServiceJob_tenantId_status_idx" ON "ServiceJob"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ServiceJob_tenantId_priority_idx" ON "ServiceJob"("tenantId", "priority");

-- CreateIndex
CREATE INDEX "ServiceJob_customerId_idx" ON "ServiceJob"("customerId");

-- CreateIndex
CREATE INDEX "ServiceJob_primaryTechnicianId_idx" ON "ServiceJob"("primaryTechnicianId");

-- CreateIndex
CREATE INDEX "ServiceJob_scheduledStart_idx" ON "ServiceJob"("scheduledStart");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceJob_tenantId_jobNumber_key" ON "ServiceJob"("tenantId", "jobNumber");

-- CreateIndex
CREATE INDEX "ServiceJobPart_jobId_idx" ON "ServiceJobPart"("jobId");

-- CreateIndex
CREATE INDEX "ServiceJobTimeLog_jobId_idx" ON "ServiceJobTimeLog"("jobId");

-- CreateIndex
CREATE INDEX "ServiceJobTimeLog_technicianId_idx" ON "ServiceJobTimeLog"("technicianId");

-- CreateIndex
CREATE INDEX "ServiceJobStatusHistory_jobId_idx" ON "ServiceJobStatusHistory"("jobId");

-- CreateIndex
CREATE INDEX "ServiceQuote_tenantId_idx" ON "ServiceQuote"("tenantId");

-- CreateIndex
CREATE INDEX "ServiceQuote_tenantId_status_idx" ON "ServiceQuote"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ServiceQuote_customerId_idx" ON "ServiceQuote"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceQuote_tenantId_quoteNumber_key" ON "ServiceQuote"("tenantId", "quoteNumber");

-- CreateIndex
CREATE INDEX "ServiceAmc_tenantId_idx" ON "ServiceAmc"("tenantId");

-- CreateIndex
CREATE INDEX "ServiceAmc_tenantId_status_idx" ON "ServiceAmc"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ServiceAmc_customerId_idx" ON "ServiceAmc"("customerId");

-- CreateIndex
CREATE INDEX "ServiceAmc_endDate_idx" ON "ServiceAmc"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceAmc_tenantId_amcNumber_key" ON "ServiceAmc"("tenantId", "amcNumber");

-- CreateIndex
CREATE INDEX "ServiceAmcVisit_amcId_idx" ON "ServiceAmcVisit"("amcId");

-- CreateIndex
CREATE INDEX "ServiceAmcVisit_scheduledDate_idx" ON "ServiceAmcVisit"("scheduledDate");

-- CreateIndex
CREATE INDEX "ServiceWarrantyClaim_tenantId_idx" ON "ServiceWarrantyClaim"("tenantId");

-- CreateIndex
CREATE INDEX "ServiceWarrantyClaim_tenantId_status_idx" ON "ServiceWarrantyClaim"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceWarrantyClaim_tenantId_claimNumber_key" ON "ServiceWarrantyClaim"("tenantId", "claimNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCustomerProfile_customerId_key" ON "ServiceCustomerProfile"("customerId");

-- CreateIndex
CREATE INDEX "ServiceCustomerProfile_tenantId_idx" ON "ServiceCustomerProfile"("tenantId");

-- CreateIndex
CREATE INDEX "ServiceCustomerProfile_customerId_idx" ON "ServiceCustomerProfile"("customerId");

-- CreateIndex
CREATE INDEX "ServiceZone_tenantId_idx" ON "ServiceZone"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceZone_tenantId_name_key" ON "ServiceZone"("tenantId", "name");

-- AddForeignKey
ALTER TABLE "ServiceTechnicianSkill" ADD CONSTRAINT "ServiceTechnicianSkill_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "ServiceTechnicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJobPart" ADD CONSTRAINT "ServiceJobPart_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ServiceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJobTimeLog" ADD CONSTRAINT "ServiceJobTimeLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ServiceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceJobStatusHistory" ADD CONSTRAINT "ServiceJobStatusHistory_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ServiceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAmcVisit" ADD CONSTRAINT "ServiceAmcVisit_amcId_fkey" FOREIGN KEY ("amcId") REFERENCES "ServiceAmc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
