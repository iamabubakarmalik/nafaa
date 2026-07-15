-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'SUV', 'VAN', 'PICKUP', 'TRUCK', 'BUS', 'MOTORCYCLE', 'SCOOTER', 'RICKSHAW', 'TRACTOR', 'BICYCLE', 'ATV', 'BOAT', 'OTHER');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('PETROL', 'DIESEL', 'CNG', 'LPG', 'HYBRID', 'ELECTRIC', 'OTHER');

-- CreateEnum
CREATE TYPE "TransmissionType" AS ENUM ('MANUAL', 'AUTOMATIC', 'CVT', 'DCT', 'SEMI_AUTO');

-- CreateEnum
CREATE TYPE "PartCategory" AS ENUM ('ENGINE', 'TRANSMISSION', 'BRAKES', 'SUSPENSION', 'ELECTRICAL', 'BATTERY', 'COOLING', 'EXHAUST', 'FUEL_SYSTEM', 'BODY', 'INTERIOR', 'LIGHTING', 'TIRES_WHEELS', 'FILTERS', 'OILS_FLUIDS', 'BELTS_HOSES', 'IGNITION', 'AC_HEATING', 'STEERING', 'DRIVETRAIN', 'BEARINGS', 'GASKETS', 'SENSORS', 'ACCESSORIES', 'TOOLS', 'CONSUMABLES', 'OTHER');

-- CreateEnum
CREATE TYPE "PartCondition" AS ENUM ('NEW', 'USED', 'REFURBISHED', 'GENUINE', 'OEM', 'AFTERMARKET', 'LOCAL');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'QUOTED', 'APPROVED', 'IN_PROGRESS', 'WAITING_PARTS', 'WAITING_APPROVAL', 'READY_FOR_TEST', 'QUALITY_CHECK', 'COMPLETED', 'DELIVERED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "JobPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('GENERAL_SERVICE', 'OIL_CHANGE', 'TUNE_UP', 'MAJOR_SERVICE', 'MINOR_SERVICE', 'REPAIR', 'DIAGNOSTIC', 'BODY_WORK', 'PAINT', 'ELECTRICAL', 'AC_SERVICE', 'TIRE_CHANGE', 'BATTERY_CHANGE', 'BRAKE_SERVICE', 'ENGINE_REBUILD', 'TRANSMISSION_REPAIR', 'DENTING_PAINTING', 'WHEEL_ALIGNMENT', 'ACCIDENT_REPAIR', 'INSPECTION', 'MODIFICATION', 'DETAILING', 'WASHING', 'OTHER');

-- CreateEnum
CREATE TYPE "WarrantyStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'VOID', 'CLAIMED', 'NONE');

-- CreateTable
CREATE TABLE "VehicleMake" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "logoUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "makeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL DEFAULT 'CAR',
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "engineOptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerVehicle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "chassisNumber" TEXT,
    "engineNumber" TEXT,
    "makeId" TEXT,
    "modelId" TEXT,
    "makeName" TEXT,
    "modelName" TEXT,
    "vehicleType" "VehicleType" NOT NULL DEFAULT 'CAR',
    "year" INTEGER,
    "color" TEXT,
    "fuelType" "FuelType" NOT NULL DEFAULT 'PETROL',
    "transmission" "TransmissionType" NOT NULL DEFAULT 'MANUAL',
    "engineCC" INTEGER,
    "odometerKm" INTEGER,
    "ownerName" TEXT,
    "ownerPhone" TEXT,
    "ownerCnic" TEXT,
    "insuranceProvider" TEXT,
    "insurancePolicyNumber" TEXT,
    "insuranceExpiry" TIMESTAMP(3),
    "tokenTaxExpiry" TIMESTAMP(3),
    "fitnessExpiry" TIMESTAMP(3),
    "documentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredMechanicId" TEXT,
    "notes" TEXT,
    "totalServices" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastServiceAt" TIMESTAMP(3),
    "lastOdometerKm" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoPartProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "partNumber" TEXT,
    "oemNumber" TEXT,
    "alternateNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" "PartCategory" NOT NULL DEFAULT 'OTHER',
    "subCategory" TEXT,
    "condition" "PartCondition" NOT NULL DEFAULT 'NEW',
    "brand" TEXT,
    "countryOfOrigin" TEXT,
    "manufacturer" TEXT,
    "weightGrams" DOUBLE PRECISION,
    "dimensions" TEXT,
    "color" TEXT,
    "material" TEXT,
    "warrantyMonths" INTEGER NOT NULL DEFAULT 0,
    "warrantyKm" INTEGER,
    "warrantyNotes" TEXT,
    "installationMinutes" INTEGER,
    "requiresSpecialTool" BOOLEAN NOT NULL DEFAULT false,
    "installationDifficulty" TEXT,
    "compatibility" JSONB,
    "minStockAlert" INTEGER NOT NULL DEFAULT 0,
    "isFastMoving" BOOLEAN NOT NULL DEFAULT false,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "totalInstalled" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoPartProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "jobNumber" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "JobPriority" NOT NULL DEFAULT 'NORMAL',
    "jobType" "JobType" NOT NULL DEFAULT 'GENERAL_SERVICE',
    "vehicleId" TEXT,
    "registrationNumber" TEXT,
    "makeName" TEXT,
    "modelName" TEXT,
    "year" INTEGER,
    "odometerKm" INTEGER,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerComplaint" TEXT,
    "diagnosis" TEXT,
    "workDescription" TEXT,
    "recommendations" TEXT,
    "primaryMechanicId" TEXT,
    "assistantMechanicIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bayNumber" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promisedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "fuelLevel" TEXT,
    "hasSpareTire" BOOLEAN NOT NULL DEFAULT false,
    "hasToolkit" BOOLEAN NOT NULL DEFAULT false,
    "externalDamages" TEXT,
    "inspectionImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "testDriveRequired" BOOLEAN NOT NULL DEFAULT false,
    "testDriveNotes" TEXT,
    "testDriveDoneAt" TIMESTAMP(3),
    "testDriveByMechanicId" TEXT,
    "laborTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "partsTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "externalTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "warrantyStatus" "WarrantyStatus" NOT NULL DEFAULT 'NONE',
    "warrantyMonths" INTEGER NOT NULL DEFAULT 0,
    "warrantyKm" INTEGER,
    "warrantyExpiry" TIMESTAMP(3),
    "warrantyNotes" TEXT,
    "isInsuranceClaim" BOOLEAN NOT NULL DEFAULT false,
    "insuranceProvider" TEXT,
    "insuranceClaimNumber" TEXT,
    "insuranceApproved" BOOLEAN NOT NULL DEFAULT false,
    "insuranceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerRating" INTEGER,
    "customerFeedback" TEXT,
    "internalNotes" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopJobLabor" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "jobType" "JobType",
    "mechanicId" TEXT,
    "mechanicName" TEXT,
    "hours" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "ratePerHour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkshopJobLabor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopJobPart" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "partName" TEXT NOT NULL,
    "partNumber" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "condition" "PartCondition" NOT NULL DEFAULT 'NEW',
    "isCustomerSupplied" BOOLEAN NOT NULL DEFAULT false,
    "warrantyMonths" INTEGER NOT NULL DEFAULT 0,
    "warrantyKm" INTEGER,
    "installedByMechanicId" TEXT,
    "installedAt" TIMESTAMP(3),
    "notes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkshopJobPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopJobExternal" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "vendorName" TEXT,
    "vendorPhone" TEXT,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "markup" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkshopJobExternal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopJobPayment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "receivedById" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkshopJobPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopJobStatusLog" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "fromStatus" "JobStatus",
    "toStatus" "JobStatus" NOT NULL,
    "notes" TEXT,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkshopJobStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MechanicProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "specialization" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearsOfExperience" INTEGER,
    "bio" TEXT,
    "photoUrl" TEXT,
    "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "workStartTime" TEXT NOT NULL DEFAULT '09:00',
    "workEndTime" TEXT NOT NULL DEFAULT '18:00',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "currentJobId" TEXT,
    "totalJobs" INTEGER NOT NULL DEFAULT 0,
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MechanicProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleServiceReminder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "dueOdometerKm" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),
    "autoCreated" BOOLEAN NOT NULL DEFAULT false,
    "fromJobId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleServiceReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleMake_tenantId_idx" ON "VehicleMake"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleMake_tenantId_name_key" ON "VehicleMake"("tenantId", "name");

-- CreateIndex
CREATE INDEX "VehicleModel_tenantId_idx" ON "VehicleModel"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleModel_makeId_idx" ON "VehicleModel"("makeId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_tenantId_makeId_name_key" ON "VehicleModel"("tenantId", "makeId", "name");

-- CreateIndex
CREATE INDEX "CustomerVehicle_tenantId_idx" ON "CustomerVehicle"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerVehicle_customerId_idx" ON "CustomerVehicle"("customerId");

-- CreateIndex
CREATE INDEX "CustomerVehicle_tenantId_insuranceExpiry_idx" ON "CustomerVehicle"("tenantId", "insuranceExpiry");

-- CreateIndex
CREATE INDEX "CustomerVehicle_tenantId_tokenTaxExpiry_idx" ON "CustomerVehicle"("tenantId", "tokenTaxExpiry");

-- CreateIndex
CREATE INDEX "CustomerVehicle_tenantId_fitnessExpiry_idx" ON "CustomerVehicle"("tenantId", "fitnessExpiry");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerVehicle_tenantId_registrationNumber_key" ON "CustomerVehicle"("tenantId", "registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AutoPartProfile_productId_key" ON "AutoPartProfile"("productId");

-- CreateIndex
CREATE INDEX "AutoPartProfile_tenantId_idx" ON "AutoPartProfile"("tenantId");

-- CreateIndex
CREATE INDEX "AutoPartProfile_tenantId_category_idx" ON "AutoPartProfile"("tenantId", "category");

-- CreateIndex
CREATE INDEX "AutoPartProfile_tenantId_partNumber_idx" ON "AutoPartProfile"("tenantId", "partNumber");

-- CreateIndex
CREATE INDEX "AutoPartProfile_tenantId_oemNumber_idx" ON "AutoPartProfile"("tenantId", "oemNumber");

-- CreateIndex
CREATE INDEX "WorkshopJob_tenantId_idx" ON "WorkshopJob"("tenantId");

-- CreateIndex
CREATE INDEX "WorkshopJob_tenantId_status_idx" ON "WorkshopJob"("tenantId", "status");

-- CreateIndex
CREATE INDEX "WorkshopJob_vehicleId_idx" ON "WorkshopJob"("vehicleId");

-- CreateIndex
CREATE INDEX "WorkshopJob_customerId_idx" ON "WorkshopJob"("customerId");

-- CreateIndex
CREATE INDEX "WorkshopJob_primaryMechanicId_idx" ON "WorkshopJob"("primaryMechanicId");

-- CreateIndex
CREATE INDEX "WorkshopJob_promisedAt_idx" ON "WorkshopJob"("promisedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopJob_tenantId_jobNumber_key" ON "WorkshopJob"("tenantId", "jobNumber");

-- CreateIndex
CREATE INDEX "WorkshopJobLabor_jobId_idx" ON "WorkshopJobLabor"("jobId");

-- CreateIndex
CREATE INDEX "WorkshopJobLabor_mechanicId_idx" ON "WorkshopJobLabor"("mechanicId");

-- CreateIndex
CREATE INDEX "WorkshopJobPart_jobId_idx" ON "WorkshopJobPart"("jobId");

-- CreateIndex
CREATE INDEX "WorkshopJobPart_productId_idx" ON "WorkshopJobPart"("productId");

-- CreateIndex
CREATE INDEX "WorkshopJobExternal_jobId_idx" ON "WorkshopJobExternal"("jobId");

-- CreateIndex
CREATE INDEX "WorkshopJobPayment_jobId_idx" ON "WorkshopJobPayment"("jobId");

-- CreateIndex
CREATE INDEX "WorkshopJobStatusLog_jobId_idx" ON "WorkshopJobStatusLog"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "MechanicProfile_staffId_key" ON "MechanicProfile"("staffId");

-- CreateIndex
CREATE INDEX "MechanicProfile_tenantId_idx" ON "MechanicProfile"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleServiceReminder_tenantId_idx" ON "VehicleServiceReminder"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleServiceReminder_tenantId_status_idx" ON "VehicleServiceReminder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "VehicleServiceReminder_vehicleId_idx" ON "VehicleServiceReminder"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleServiceReminder_dueDate_idx" ON "VehicleServiceReminder"("dueDate");

-- AddForeignKey
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_makeId_fkey" FOREIGN KEY ("makeId") REFERENCES "VehicleMake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopJobLabor" ADD CONSTRAINT "WorkshopJobLabor_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "WorkshopJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopJobPart" ADD CONSTRAINT "WorkshopJobPart_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "WorkshopJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopJobExternal" ADD CONSTRAINT "WorkshopJobExternal_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "WorkshopJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopJobPayment" ADD CONSTRAINT "WorkshopJobPayment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "WorkshopJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopJobStatusLog" ADD CONSTRAINT "WorkshopJobStatusLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "WorkshopJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
