-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('PENDING', 'VERIFIED', 'PARTIALLY_DISPENSED', 'DISPENSED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PrescriptionType" AS ENUM ('WALK_IN', 'ONLINE', 'REFILL', 'HOSPITAL', 'INSURANCE', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "DrugScheduleClass" AS ENUM ('OTC', 'SCHEDULE_G', 'SCHEDULE_H', 'SCHEDULE_X', 'CONTROLLED', 'NARCOTIC', 'PSYCHOTROPIC');

-- CreateEnum
CREATE TYPE "StorageCondition" AS ENUM ('ROOM_TEMPERATURE', 'COOL', 'REFRIGERATED', 'FROZEN', 'CONTROLLED_ROOM', 'PROTECT_FROM_LIGHT', 'PROTECT_FROM_MOISTURE');

-- CreateEnum
CREATE TYPE "RefillFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'AS_NEEDED');

-- CreateTable
CREATE TABLE "Salt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "code" TEXT,
    "category" TEXT,
    "description" TEXT,
    "standardDose" TEXT,
    "maxDailyDose" TEXT,
    "routeOfAdmin" TEXT,
    "isPregnancySafe" BOOLEAN NOT NULL DEFAULT true,
    "isLactationSafe" BOOLEAN NOT NULL DEFAULT true,
    "isPediatricSafe" BOOLEAN NOT NULL DEFAULT true,
    "minAgeYears" INTEGER,
    "contraindications" TEXT,
    "sideEffects" TEXT,
    "warnings" TEXT,
    "scheduleClass" "DrugScheduleClass" NOT NULL DEFAULT 'OTC',
    "requiresPrescription" BOOLEAN NOT NULL DEFAULT false,
    "isNarcotic" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Salt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSalt" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "saltId" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "strengthValue" DOUBLE PRECISION,
    "strengthUnit" TEXT,
    "isMainSalt" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSalt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrugInteraction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "saltAId" TEXT NOT NULL,
    "saltBId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "clinicalEffect" TEXT,
    "management" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrugInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyMedicine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "approvalDate" TIMESTAMP(3),
    "dosageForm" TEXT,
    "packSize" TEXT,
    "packUnit" TEXT,
    "manufacturer" TEXT,
    "countryOfOrigin" TEXT,
    "importedBy" TEXT,
    "indication" TEXT,
    "mechanismOfAction" TEXT,
    "pharmacokinetics" TEXT,
    "storageCondition" "StorageCondition" NOT NULL DEFAULT 'ROOM_TEMPERATURE',
    "storageInstructions" TEXT,
    "requiresColdChain" BOOLEAN NOT NULL DEFAULT false,
    "minTemperature" DOUBLE PRECISION,
    "maxTemperature" DOUBLE PRECISION,
    "scheduleClass" "DrugScheduleClass" NOT NULL DEFAULT 'OTC',
    "requiresPrescription" BOOLEAN NOT NULL DEFAULT false,
    "isNarcotic" BOOLEAN NOT NULL DEFAULT false,
    "isRefrigerated" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "shape" TEXT,
    "markings" TEXT,
    "isGeneric" BOOLEAN NOT NULL DEFAULT false,
    "brandTier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyMedicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineSubstitute" (
    "id" TEXT NOT NULL,
    "mainMedicineId" TEXT NOT NULL,
    "substituteMedicineId" TEXT NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "priceDifference" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicineSubstitute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "cnic" TEXT,
    "registrationNumber" TEXT NOT NULL,
    "qualification" TEXT,
    "specialization" TEXT,
    "yearsOfExperience" INTEGER,
    "clinicName" TEXT,
    "clinicAddress" TEXT,
    "hospitalAffiliation" TEXT,
    "consultationFee" DOUBLE PRECISION,
    "commissionType" TEXT DEFAULT 'NONE',
    "commissionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrescriptions" INTEGER NOT NULL DEFAULT 0,
    "totalBusiness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "bloodGroup" TEXT,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "gender" TEXT,
    "chronicConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentMedications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pastSurgeries" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyRelation" TEXT,
    "hasInsurance" BOOLEAN NOT NULL DEFAULT false,
    "insuranceProvider" TEXT,
    "insuranceNumber" TEXT,
    "insuranceExpiry" TIMESTAMP(3),
    "medicalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "customerId" TEXT,
    "doctorId" TEXT,
    "saleId" TEXT,
    "prescriptionNumber" TEXT NOT NULL,
    "type" "PrescriptionType" NOT NULL DEFAULT 'WALK_IN',
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'PENDING',
    "doctorName" TEXT,
    "doctorRegNumber" TEXT,
    "doctorSpeciality" TEXT,
    "hospitalName" TEXT,
    "patientName" TEXT,
    "patientAge" INTEGER,
    "patientGender" TEXT,
    "patientPhone" TEXT,
    "patientCnic" TEXT,
    "patientWeight" DOUBLE PRECISION,
    "prescriptionDate" TIMESTAMP(3),
    "diagnosis" TEXT,
    "chiefComplaint" TEXT,
    "vitals" JSONB,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scannedText" TEXT,
    "isRefillable" BOOLEAN NOT NULL DEFAULT false,
    "refillsAllowed" INTEGER NOT NULL DEFAULT 0,
    "refillsUsed" INTEGER NOT NULL DEFAULT 0,
    "refillFrequency" "RefillFrequency",
    "nextRefillDate" TIMESTAMP(3),
    "isInsuranceClaim" BOOLEAN NOT NULL DEFAULT false,
    "insuranceProvider" TEXT,
    "insuranceApprovalCode" TEXT,
    "insuranceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "dispensedById" TEXT,
    "dispensedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionItem" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "productId" TEXT,
    "batchId" TEXT,
    "medicineName" TEXT NOT NULL,
    "saltName" TEXT,
    "strength" TEXT,
    "dose" TEXT,
    "frequency" TEXT,
    "duration" TEXT,
    "route" TEXT,
    "instructions" TEXT,
    "prescribedQty" DOUBLE PRECISION NOT NULL,
    "dispensedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'tablet',
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isDispensed" BOOLEAN NOT NULL DEFAULT false,
    "isSubstituted" BOOLEAN NOT NULL DEFAULT false,
    "substituteFor" TEXT,
    "isOutOfStock" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlledSubstanceLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    "saleId" TEXT,
    "prescriptionId" TEXT,
    "logNumber" TEXT NOT NULL,
    "logDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logType" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "openingBalance" DOUBLE PRECISION NOT NULL,
    "closingBalance" DOUBLE PRECISION NOT NULL,
    "patientName" TEXT,
    "patientCnic" TEXT,
    "patientPhone" TEXT,
    "patientAddress" TEXT,
    "doctorName" TEXT,
    "doctorRegNumber" TEXT,
    "prescriptionNumber" TEXT,
    "dispensedBy" TEXT,
    "supervisedBy" TEXT,
    "notes" TEXT,
    "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isReversed" BOOLEAN NOT NULL DEFAULT false,
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ControlledSubstanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefillReminder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT,
    "prescriptionId" TEXT,
    "medicineName" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "reminderType" TEXT NOT NULL DEFAULT 'SMS',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefillReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemperatureLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "logDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperature" DOUBLE PRECISION NOT NULL,
    "humidity" DOUBLE PRECISION,
    "unit" TEXT NOT NULL DEFAULT 'celsius',
    "location" TEXT,
    "isWithinRange" BOOLEAN NOT NULL DEFAULT true,
    "minLimit" DOUBLE PRECISION,
    "maxLimit" DOUBLE PRECISION,
    "recordedBy" TEXT,
    "automated" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "alertSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemperatureLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Salt_tenantId_idx" ON "Salt"("tenantId");

-- CreateIndex
CREATE INDEX "Salt_tenantId_scheduleClass_idx" ON "Salt"("tenantId", "scheduleClass");

-- CreateIndex
CREATE INDEX "Salt_name_idx" ON "Salt"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Salt_tenantId_name_key" ON "Salt"("tenantId", "name");

-- CreateIndex
CREATE INDEX "ProductSalt_productId_idx" ON "ProductSalt"("productId");

-- CreateIndex
CREATE INDEX "ProductSalt_saltId_idx" ON "ProductSalt"("saltId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSalt_productId_saltId_key" ON "ProductSalt"("productId", "saltId");

-- CreateIndex
CREATE INDEX "DrugInteraction_tenantId_idx" ON "DrugInteraction"("tenantId");

-- CreateIndex
CREATE INDEX "DrugInteraction_severity_idx" ON "DrugInteraction"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "DrugInteraction_saltAId_saltBId_key" ON "DrugInteraction"("saltAId", "saltBId");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyMedicine_productId_key" ON "PharmacyMedicine"("productId");

-- CreateIndex
CREATE INDEX "PharmacyMedicine_tenantId_idx" ON "PharmacyMedicine"("tenantId");

-- CreateIndex
CREATE INDEX "PharmacyMedicine_productId_idx" ON "PharmacyMedicine"("productId");

-- CreateIndex
CREATE INDEX "PharmacyMedicine_tenantId_scheduleClass_idx" ON "PharmacyMedicine"("tenantId", "scheduleClass");

-- CreateIndex
CREATE INDEX "PharmacyMedicine_registrationNumber_idx" ON "PharmacyMedicine"("registrationNumber");

-- CreateIndex
CREATE INDEX "MedicineSubstitute_mainMedicineId_idx" ON "MedicineSubstitute"("mainMedicineId");

-- CreateIndex
CREATE INDEX "MedicineSubstitute_substituteMedicineId_idx" ON "MedicineSubstitute"("substituteMedicineId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicineSubstitute_mainMedicineId_substituteMedicineId_key" ON "MedicineSubstitute"("mainMedicineId", "substituteMedicineId");

-- CreateIndex
CREATE INDEX "Doctor_tenantId_idx" ON "Doctor"("tenantId");

-- CreateIndex
CREATE INDEX "Doctor_tenantId_isActive_idx" ON "Doctor"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "Doctor_specialization_idx" ON "Doctor"("specialization");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_tenantId_registrationNumber_key" ON "Doctor"("tenantId", "registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_customerId_key" ON "PatientProfile"("customerId");

-- CreateIndex
CREATE INDEX "PatientProfile_tenantId_idx" ON "PatientProfile"("tenantId");

-- CreateIndex
CREATE INDEX "PatientProfile_customerId_idx" ON "PatientProfile"("customerId");

-- CreateIndex
CREATE INDEX "Prescription_tenantId_idx" ON "Prescription"("tenantId");

-- CreateIndex
CREATE INDEX "Prescription_tenantId_status_idx" ON "Prescription"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Prescription_customerId_idx" ON "Prescription"("customerId");

-- CreateIndex
CREATE INDEX "Prescription_doctorId_idx" ON "Prescription"("doctorId");

-- CreateIndex
CREATE INDEX "Prescription_prescriptionDate_idx" ON "Prescription"("prescriptionDate");

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_tenantId_prescriptionNumber_key" ON "Prescription"("tenantId", "prescriptionNumber");

-- CreateIndex
CREATE INDEX "PrescriptionItem_prescriptionId_idx" ON "PrescriptionItem"("prescriptionId");

-- CreateIndex
CREATE INDEX "PrescriptionItem_productId_idx" ON "PrescriptionItem"("productId");

-- CreateIndex
CREATE INDEX "ControlledSubstanceLog_tenantId_idx" ON "ControlledSubstanceLog"("tenantId");

-- CreateIndex
CREATE INDEX "ControlledSubstanceLog_tenantId_logDate_idx" ON "ControlledSubstanceLog"("tenantId", "logDate");

-- CreateIndex
CREATE INDEX "ControlledSubstanceLog_productId_idx" ON "ControlledSubstanceLog"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ControlledSubstanceLog_tenantId_logNumber_key" ON "ControlledSubstanceLog"("tenantId", "logNumber");

-- CreateIndex
CREATE INDEX "RefillReminder_tenantId_idx" ON "RefillReminder"("tenantId");

-- CreateIndex
CREATE INDEX "RefillReminder_tenantId_status_idx" ON "RefillReminder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "RefillReminder_customerId_idx" ON "RefillReminder"("customerId");

-- CreateIndex
CREATE INDEX "RefillReminder_scheduledFor_idx" ON "RefillReminder"("scheduledFor");

-- CreateIndex
CREATE INDEX "TemperatureLog_tenantId_idx" ON "TemperatureLog"("tenantId");

-- CreateIndex
CREATE INDEX "TemperatureLog_tenantId_logDate_idx" ON "TemperatureLog"("tenantId", "logDate");

-- CreateIndex
CREATE INDEX "TemperatureLog_shopId_idx" ON "TemperatureLog"("shopId");

-- AddForeignKey
ALTER TABLE "ProductSalt" ADD CONSTRAINT "ProductSalt_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSalt" ADD CONSTRAINT "ProductSalt_saltId_fkey" FOREIGN KEY ("saltId") REFERENCES "Salt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrugInteraction" ADD CONSTRAINT "DrugInteraction_saltAId_fkey" FOREIGN KEY ("saltAId") REFERENCES "Salt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrugInteraction" ADD CONSTRAINT "DrugInteraction_saltBId_fkey" FOREIGN KEY ("saltBId") REFERENCES "Salt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyMedicine" ADD CONSTRAINT "PharmacyMedicine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineSubstitute" ADD CONSTRAINT "MedicineSubstitute_mainMedicineId_fkey" FOREIGN KEY ("mainMedicineId") REFERENCES "PharmacyMedicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineSubstitute" ADD CONSTRAINT "MedicineSubstitute_substituteMedicineId_fkey" FOREIGN KEY ("substituteMedicineId") REFERENCES "PharmacyMedicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
