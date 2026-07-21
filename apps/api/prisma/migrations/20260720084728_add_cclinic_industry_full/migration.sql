-- CreateEnum
CREATE TYPE "ClinicSpecialty" AS ENUM ('GENERAL_PRACTITIONER', 'FAMILY_PHYSICIAN', 'INTERNAL_MEDICINE', 'PEDIATRICIAN', 'GYNECOLOGIST', 'OBSTETRICIAN', 'DENTIST', 'ORTHODONTIST', 'DERMATOLOGIST', 'CARDIOLOGIST', 'NEUROLOGIST', 'PSYCHIATRIST', 'PSYCHOLOGIST', 'ORTHOPEDIC', 'ENT_SPECIALIST', 'OPHTHALMOLOGIST', 'UROLOGIST', 'NEPHROLOGIST', 'ENDOCRINOLOGIST', 'GASTROENTEROLOGIST', 'PULMONOLOGIST', 'ONCOLOGIST', 'RADIOLOGIST', 'PATHOLOGIST', 'ANESTHESIOLOGIST', 'SURGEON', 'PLASTIC_SURGEON', 'PHYSIOTHERAPIST', 'NUTRITIONIST', 'DIETITIAN', 'HOMEOPATH', 'HAKEEM', 'AYURVEDIC', 'ACUPUNCTURIST', 'VETERINARY', 'MIDWIFE', 'NURSE_PRACTITIONER', 'OTHER');

-- CreateEnum
CREATE TYPE "ClinicVisitType" AS ENUM ('FIRST_VISIT', 'FOLLOW_UP', 'CONSULTATION', 'EMERGENCY', 'ROUTINE_CHECKUP', 'VACCINATION', 'PROCEDURE', 'SURGERY', 'DENTAL_CHECKUP', 'ANTENATAL', 'POSTNATAL', 'PHYSIO_SESSION', 'COUNSELING', 'TELEMEDICINE', 'HOME_VISIT', 'OTHER');

-- CreateEnum
CREATE TYPE "ClinicAppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'ARRIVED', 'IN_CONSULTATION', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "ClinicPrescriptionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISPENSED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ClinicLabTestStatus" AS ENUM ('ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'REPORTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ClinicVaccineStatus" AS ENUM ('DUE', 'ADMINISTERED', 'DELAYED', 'SKIPPED', 'CONTRAINDICATED');

-- CreateEnum
CREATE TYPE "ClinicBloodGroup" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ClinicGender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_SAY');

-- CreateTable
CREATE TABLE "ClinicDoctorProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "title" TEXT,
    "fullName" TEXT NOT NULL,
    "qualifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialties" "ClinicSpecialty"[],
    "subSpecialty" TEXT,
    "yearsOfExperience" INTEGER,
    "bio" TEXT,
    "photoUrl" TEXT,
    "signatureUrl" TEXT,
    "pmcNumber" TEXT,
    "licenseNumber" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "registeredWith" TEXT,
    "consultationFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "followUpFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "followUpDays" INTEGER NOT NULL DEFAULT 7,
    "telemedicineFee" DOUBLE PRECISION,
    "homeVisitFee" DOUBLE PRECISION,
    "emergencyFee" DOUBLE PRECISION,
    "slotDurationMin" INTEGER NOT NULL DEFAULT 15,
    "bufferMin" INTEGER NOT NULL DEFAULT 0,
    "maxDailyPatients" INTEGER,
    "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "workStartTime" TEXT NOT NULL DEFAULT '09:00',
    "workEndTime" TEXT NOT NULL DEFAULT '21:00',
    "breakStartTime" TEXT,
    "breakEndTime" TEXT,
    "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "languages" TEXT[] DEFAULT ARRAY['English', 'Urdu']::TEXT[],
    "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "proceduresOffered" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "acceptsTelemedicine" BOOLEAN NOT NULL DEFAULT false,
    "acceptsHomeVisit" BOOLEAN NOT NULL DEFAULT false,
    "acceptsEmergency" BOOLEAN NOT NULL DEFAULT false,
    "totalPatients" INTEGER NOT NULL DEFAULT 0,
    "totalAppointments" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicDoctorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicPatientProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "mrn" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "fatherOrHusbandName" TEXT,
    "cnic" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "ClinicGender",
    "bloodGroup" "ClinicBloodGroup",
    "maritalStatus" TEXT,
    "occupation" TEXT,
    "religion" TEXT,
    "nationality" TEXT,
    "photoUrl" TEXT,
    "phonePrimary" TEXT,
    "phoneAlternate" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelation" TEXT,
    "heightCm" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "waistCm" DOUBLE PRECISION,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "chronicConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentMedications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pastSurgeries" TEXT,
    "familyHistory" TEXT,
    "smokingStatus" TEXT,
    "alcoholStatus" TEXT,
    "isPregnant" BOOLEAN,
    "gravidaPara" TEXT,
    "lmpDate" TIMESTAMP(3),
    "edd" TIMESTAMP(3),
    "menstrualCycle" TEXT,
    "pediatricianId" TEXT,
    "vaccinationStatus" TEXT,
    "motherName" TEXT,
    "birthWeight" DOUBLE PRECISION,
    "birthType" TEXT,
    "hasInsurance" BOOLEAN NOT NULL DEFAULT false,
    "insuranceProvider" TEXT,
    "insuranceNumber" TEXT,
    "insuranceExpiry" TIMESTAMP(3),
    "cardUrl" TEXT,
    "preferredDoctorId" TEXT,
    "preferredLanguage" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVisitAt" TIMESTAMP(3),
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outstandingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicPatientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicAppointment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "appointmentNumber" TEXT NOT NULL,
    "tokenNumber" INTEGER,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "status" "ClinicAppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "visitType" "ClinicVisitType" NOT NULL DEFAULT 'FIRST_VISIT',
    "isTelemedicine" BOOLEAN NOT NULL DEFAULT false,
    "isHomeVisit" BOOLEAN NOT NULL DEFAULT false,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "arrivedAt" TIMESTAMP(3),
    "consultationStart" TIMESTAMP(3),
    "consultationEnd" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "chiefComplaint" TEXT,
    "reasonForVisit" TEXT,
    "patientNotes" TEXT,
    "consultationFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "smsReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "patientRating" INTEGER,
    "patientFeedback" TEXT,
    "videoRoomId" TEXT,
    "videoRoomUrl" TEXT,
    "internalNotes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicVitals" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "bpSystolic" INTEGER,
    "bpDiastolic" INTEGER,
    "pulseRate" INTEGER,
    "respiratoryRate" INTEGER,
    "temperatureC" DOUBLE PRECISION,
    "temperatureF" DOUBLE PRECISION,
    "spo2" DOUBLE PRECISION,
    "bloodSugar" DOUBLE PRECISION,
    "bloodSugarType" TEXT,
    "heightCm" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "headCircumferenceCm" DOUBLE PRECISION,
    "waistCm" DOUBLE PRECISION,
    "painScore" INTEGER,
    "glasgowScore" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicVitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicEncounter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "historyOfIllness" TEXT,
    "reviewOfSystems" TEXT,
    "physicalExamination" TEXT,
    "provisionalDiagnosis" TEXT,
    "finalDiagnosis" TEXT,
    "icd10Codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "differentialDiagnosis" TEXT,
    "advice" TEXT,
    "dietaryAdvice" TEXT,
    "activityAdvice" TEXT,
    "warningSigns" TEXT,
    "followUpAdvice" TEXT,
    "followUpDate" TIMESTAMP(3),
    "referredTo" TEXT,
    "referralNotes" TEXT,
    "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicEncounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicPrescription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "prescriptionNumber" TEXT NOT NULL,
    "status" "ClinicPrescriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "isDigital" BOOLEAN NOT NULL DEFAULT true,
    "pdfUrl" TEXT,
    "generalInstructions" TEXT,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicPrescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicPrescriptionItem" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "drugId" TEXT,
    "drugName" TEXT NOT NULL,
    "strength" TEXT,
    "form" TEXT,
    "dose" TEXT,
    "frequency" TEXT,
    "route" TEXT,
    "durationDays" INTEGER,
    "quantity" TEXT,
    "beforeMeal" BOOLEAN,
    "afterMeal" BOOLEAN,
    "atBedtime" BOOLEAN,
    "emptyStomach" BOOLEAN,
    "instructions" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicPrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicLabOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "encounterId" TEXT,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "ClinicLabTestStatus" NOT NULL DEFAULT 'ORDERED',
    "labName" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'ROUTINE',
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sampleCollectedAt" TIMESTAMP(3),
    "reportedAt" TIMESTAMP(3),
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "reportUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicLabOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicLabTest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "testCode" TEXT,
    "category" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "result" TEXT,
    "referenceRange" TEXT,
    "unit" TEXT,
    "isAbnormal" BOOLEAN,
    "isCritical" BOOLEAN,
    "performedBy" TEXT,
    "reportedAt" TIMESTAMP(3),
    "reportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicLabTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicVaccination" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "vaccineCode" TEXT,
    "scheduleName" TEXT,
    "doseNumber" INTEGER,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "administeredAt" TIMESTAMP(3),
    "administeredBy" TEXT,
    "batchNumber" TEXT,
    "manufacturer" TEXT,
    "expiryDate" TIMESTAMP(3),
    "siteAdministered" TEXT,
    "routeAdministered" TEXT,
    "status" "ClinicVaccineStatus" NOT NULL DEFAULT 'DUE',
    "adverseReactions" TEXT,
    "notes" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicVaccination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicDentalRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "appointmentId" TEXT,
    "toothNumber" TEXT NOT NULL,
    "toothSystem" TEXT NOT NULL DEFAULT 'FDI',
    "surface" TEXT,
    "condition" TEXT NOT NULL,
    "treatment" TEXT,
    "procedureCode" TEXT,
    "color" TEXT,
    "notes" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicDentalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicAntenatalVisit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "visitNumber" INTEGER NOT NULL,
    "gestationWeeks" INTEGER,
    "gestationDays" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "bpSystolic" INTEGER,
    "bpDiastolic" INTEGER,
    "fundalHeightCm" DOUBLE PRECISION,
    "fetalHeartRate" INTEGER,
    "fetalPosition" TEXT,
    "fetalMovements" TEXT,
    "urineProtein" TEXT,
    "urineSugar" TEXT,
    "edema" TEXT,
    "ultrasoundNotes" TEXT,
    "ultrasoundUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "advice" TEXT,
    "nextVisitDate" TIMESTAMP(3),
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicAntenatalVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicPhysioSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "sessionNumber" INTEGER NOT NULL,
    "totalSessionsPrescribed" INTEGER,
    "diagnosis" TEXT,
    "chiefComplaint" TEXT,
    "painScore" INTEGER,
    "romNotes" TEXT,
    "exercisesPerformed" JSONB,
    "modalitiesUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "durationMin" INTEGER,
    "progressNotes" TEXT,
    "homeExercises" TEXT,
    "nextSessionDate" TIMESTAMP(3),
    "sessionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicPhysioSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicReferral" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "referringDoctorId" TEXT NOT NULL,
    "encounterId" TEXT,
    "referralNumber" TEXT NOT NULL,
    "referredTo" TEXT NOT NULL,
    "referredToSpecialty" TEXT,
    "reason" TEXT NOT NULL,
    "urgency" TEXT NOT NULL DEFAULT 'ROUTINE',
    "clinicalSummary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "responseNotes" TEXT,
    "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicRoom" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "roomNumber" TEXT NOT NULL,
    "roomName" TEXT,
    "roomType" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isOccupied" BOOLEAN NOT NULL DEFAULT false,
    "currentPatientId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicService" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationMin" INTEGER NOT NULL DEFAULT 15,
    "requiresDoctor" BOOLEAN NOT NULL DEFAULT true,
    "requiresRoom" BOOLEAN NOT NULL DEFAULT false,
    "requiresPrep" BOOLEAN NOT NULL DEFAULT false,
    "prepInstructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClinicDoctorProfile_staffId_key" ON "ClinicDoctorProfile"("staffId");

-- CreateIndex
CREATE INDEX "ClinicDoctorProfile_tenantId_idx" ON "ClinicDoctorProfile"("tenantId");

-- CreateIndex
CREATE INDEX "ClinicDoctorProfile_tenantId_isActive_idx" ON "ClinicDoctorProfile"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicPatientProfile_customerId_key" ON "ClinicPatientProfile"("customerId");

-- CreateIndex
CREATE INDEX "ClinicPatientProfile_tenantId_idx" ON "ClinicPatientProfile"("tenantId");

-- CreateIndex
CREATE INDEX "ClinicPatientProfile_tenantId_isActive_idx" ON "ClinicPatientProfile"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "ClinicPatientProfile_customerId_idx" ON "ClinicPatientProfile"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicPatientProfile_tenantId_mrn_key" ON "ClinicPatientProfile"("tenantId", "mrn");

-- CreateIndex
CREATE INDEX "ClinicAppointment_tenantId_idx" ON "ClinicAppointment"("tenantId");

-- CreateIndex
CREATE INDEX "ClinicAppointment_tenantId_status_idx" ON "ClinicAppointment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ClinicAppointment_patientId_idx" ON "ClinicAppointment"("patientId");

-- CreateIndex
CREATE INDEX "ClinicAppointment_doctorId_idx" ON "ClinicAppointment"("doctorId");

-- CreateIndex
CREATE INDEX "ClinicAppointment_scheduledStart_idx" ON "ClinicAppointment"("scheduledStart");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicAppointment_tenantId_appointmentNumber_key" ON "ClinicAppointment"("tenantId", "appointmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicVitals_appointmentId_key" ON "ClinicVitals"("appointmentId");

-- CreateIndex
CREATE INDEX "ClinicVitals_patientId_idx" ON "ClinicVitals"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicEncounter_appointmentId_key" ON "ClinicEncounter"("appointmentId");

-- CreateIndex
CREATE INDEX "ClinicEncounter_tenantId_idx" ON "ClinicEncounter"("tenantId");

-- CreateIndex
CREATE INDEX "ClinicEncounter_patientId_idx" ON "ClinicEncounter"("patientId");

-- CreateIndex
CREATE INDEX "ClinicEncounter_doctorId_idx" ON "ClinicEncounter"("doctorId");

-- CreateIndex
CREATE INDEX "ClinicPrescription_tenantId_idx" ON "ClinicPrescription"("tenantId");

-- CreateIndex
CREATE INDEX "ClinicPrescription_patientId_idx" ON "ClinicPrescription"("patientId");

-- CreateIndex
CREATE INDEX "ClinicPrescription_doctorId_idx" ON "ClinicPrescription"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicPrescription_tenantId_prescriptionNumber_key" ON "ClinicPrescription"("tenantId", "prescriptionNumber");

-- CreateIndex
CREATE INDEX "ClinicPrescriptionItem_prescriptionId_idx" ON "ClinicPrescriptionItem"("prescriptionId");

-- CreateIndex
CREATE INDEX "ClinicLabOrder_tenantId_idx" ON "ClinicLabOrder"("tenantId");

-- CreateIndex
CREATE INDEX "ClinicLabOrder_patientId_idx" ON "ClinicLabOrder"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicLabOrder_tenantId_orderNumber_key" ON "ClinicLabOrder"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "ClinicLabTest_orderId_idx" ON "ClinicLabTest"("orderId");

-- CreateIndex
CREATE INDEX "ClinicVaccination_tenantId_idx" ON "ClinicVaccination"("tenantId");

-- CreateIndex
CREATE INDEX "ClinicVaccination_patientId_idx" ON "ClinicVaccination"("patientId");

-- CreateIndex
CREATE INDEX "ClinicVaccination_status_idx" ON "ClinicVaccination"("status");

-- CreateIndex
CREATE INDEX "ClinicVaccination_dueDate_idx" ON "ClinicVaccination"("dueDate");

-- CreateIndex
CREATE INDEX "ClinicDentalRecord_tenantId_idx" ON "ClinicDentalRecord"("tenantId");

-- CreateIndex
CREATE INDEX "ClinicDentalRecord_patientId_idx" ON "ClinicDentalRecord"("patientId");

-- CreateIndex
CREATE INDEX "ClinicDentalRecord_toothNumber_idx" ON "ClinicDentalRecord"("toothNumber");

-- CreateIndex
CREATE INDEX "ClinicAntenatalVisit_tenantId_idx" ON "ClinicAntenatalVisit"("tenantId");

-- CreateIndex
CREATE INDEX "ClinicAntenatalVisit_patientId_idx" ON "ClinicAntenatalVisit"("patientId");

-- CreateIndex
CREATE INDEX "ClinicPhysioSession_tenantId_idx" ON "ClinicPhysioSession"("tenantId");

-- CreateIndex
CREATE INDEX "ClinicPhysioSession_patientId_idx" ON "ClinicPhysioSession"("patientId");

-- CreateIndex
CREATE INDEX "ClinicPhysioSession_therapistId_idx" ON "ClinicPhysioSession"("therapistId");

-- CreateIndex
CREATE INDEX "ClinicReferral_tenantId_idx" ON "ClinicReferral"("tenantId");

-- CreateIndex
CREATE INDEX "ClinicReferral_patientId_idx" ON "ClinicReferral"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicReferral_tenantId_referralNumber_key" ON "ClinicReferral"("tenantId", "referralNumber");

-- CreateIndex
CREATE INDEX "ClinicRoom_tenantId_idx" ON "ClinicRoom"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicRoom_tenantId_roomNumber_key" ON "ClinicRoom"("tenantId", "roomNumber");

-- CreateIndex
CREATE INDEX "ClinicService_tenantId_idx" ON "ClinicService"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicService_tenantId_name_key" ON "ClinicService"("tenantId", "name");

-- AddForeignKey
ALTER TABLE "ClinicVitals" ADD CONSTRAINT "ClinicVitals_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "ClinicAppointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicEncounter" ADD CONSTRAINT "ClinicEncounter_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "ClinicAppointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicPrescription" ADD CONSTRAINT "ClinicPrescription_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "ClinicEncounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicPrescriptionItem" ADD CONSTRAINT "ClinicPrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "ClinicPrescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicLabOrder" ADD CONSTRAINT "ClinicLabOrder_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "ClinicEncounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicLabTest" ADD CONSTRAINT "ClinicLabTest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ClinicLabOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
