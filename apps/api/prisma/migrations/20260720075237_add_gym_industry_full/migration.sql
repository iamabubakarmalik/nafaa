-- CreateEnum
CREATE TYPE "GymMembershipPlanType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'LIFETIME', 'PAY_PER_VISIT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GymMembershipStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'PAUSED', 'CANCELLED', 'PENDING_PAYMENT', 'FROZEN');

-- CreateEnum
CREATE TYPE "GymMemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "GymGoal" AS ENUM ('WEIGHT_LOSS', 'MUSCLE_GAIN', 'BODY_BUILDING', 'STRENGTH', 'ENDURANCE', 'CARDIO', 'FLEXIBILITY', 'REHABILITATION', 'GENERAL_FITNESS', 'COMPETITION_PREP', 'WEIGHT_GAIN', 'TONING', 'OTHER');

-- CreateEnum
CREATE TYPE "GymTrainerRole" AS ENUM ('HEAD_TRAINER', 'PERSONAL_TRAINER', 'YOGA_INSTRUCTOR', 'ZUMBA_INSTRUCTOR', 'CROSSFIT_COACH', 'CARDIO_COACH', 'STRENGTH_COACH', 'NUTRITIONIST', 'PHYSIOTHERAPIST', 'MMA_COACH', 'BOXING_COACH', 'DANCE_INSTRUCTOR', 'OTHER');

-- CreateEnum
CREATE TYPE "GymClassType" AS ENUM ('YOGA', 'ZUMBA', 'AEROBICS', 'CROSSFIT', 'HIIT', 'SPINNING', 'BOXING', 'KICKBOXING', 'MMA', 'KARATE', 'DANCE', 'PILATES', 'STRETCHING', 'BOOTCAMP', 'MEDITATION', 'BODY_PUMP', 'OTHER');

-- CreateEnum
CREATE TYPE "GymClassStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "GymAttendanceMethod" AS ENUM ('MANUAL', 'BIOMETRIC', 'RFID_CARD', 'QR_CODE', 'MOBILE_APP', 'FACIAL_RECOGNITION');

-- CreateEnum
CREATE TYPE "GymEquipmentStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_ORDER', 'RESERVED', 'RETIRED');

-- CreateEnum
CREATE TYPE "GymEquipmentCategory" AS ENUM ('CARDIO', 'STRENGTH', 'FREE_WEIGHTS', 'MACHINES', 'FUNCTIONAL', 'YOGA_MAT', 'BOXING', 'CROSSFIT', 'ACCESSORIES', 'OTHER');

-- CreateEnum
CREATE TYPE "BodyMeasurementType" AS ENUM ('WEIGHT', 'HEIGHT', 'BMI', 'BODY_FAT', 'MUSCLE_MASS', 'CHEST', 'WAIST', 'HIPS', 'BICEPS', 'THIGHS', 'CALVES', 'NECK', 'SHOULDERS', 'FOREARMS', 'BLOOD_PRESSURE', 'RESTING_HEART_RATE');

-- CreateTable
CREATE TABLE "GymMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "shopId" TEXT,
    "memberNumber" TEXT NOT NULL,
    "rfidCard" TEXT,
    "biometricId" TEXT,
    "qrCode" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "bloodGroup" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelation" TEXT,
    "heightCm" DOUBLE PRECISION,
    "currentWeightKg" DOUBLE PRECISION,
    "targetWeightKg" DOUBLE PRECISION,
    "bodyFatPct" DOUBLE PRECISION,
    "muscleMassPct" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "primaryGoal" "GymGoal" NOT NULL DEFAULT 'GENERAL_FITNESS',
    "secondaryGoals" "GymGoal"[] DEFAULT ARRAY[]::"GymGoal"[],
    "fitnessLevel" TEXT,
    "experienceYears" DOUBLE PRECISION,
    "medicalConditions" TEXT,
    "injuries" TEXT,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medications" TEXT,
    "doctorClearance" BOOLEAN NOT NULL DEFAULT false,
    "doctorClearanceUrl" TEXT,
    "preferredWorkoutTime" TEXT,
    "preferredTrainerId" TEXT,
    "workoutDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "dietaryPreferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photoUrl" TEXT,
    "bio" TEXT,
    "notes" TEXT,
    "status" "GymMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVisitAt" TIMESTAMP(3),
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "referredById" TEXT,
    "referralCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymMembershipPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "planType" "GymMembershipPlanType" NOT NULL DEFAULT 'MONTHLY',
    "price" DOUBLE PRECISION NOT NULL,
    "registrationFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "securityDeposit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "visitLimit" INTEGER,
    "isUnlimited" BOOLEAN NOT NULL DEFAULT true,
    "accessAllHours" BOOLEAN NOT NULL DEFAULT false,
    "accessTimeStart" TEXT,
    "accessTimeEnd" TEXT,
    "accessDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6, 0]::INTEGER[],
    "includesPersonalTraining" BOOLEAN NOT NULL DEFAULT false,
    "personalTrainingSessions" INTEGER NOT NULL DEFAULT 0,
    "includesClasses" BOOLEAN NOT NULL DEFAULT true,
    "classesLimit" INTEGER,
    "includesNutritionPlan" BOOLEAN NOT NULL DEFAULT false,
    "includesLockerFacility" BOOLEAN NOT NULL DEFAULT false,
    "includesTowelService" BOOLEAN NOT NULL DEFAULT false,
    "includesSteamSauna" BOOLEAN NOT NULL DEFAULT false,
    "includesSwimmingPool" BOOLEAN NOT NULL DEFAULT false,
    "includesGuestPasses" INTEGER NOT NULL DEFAULT 0,
    "allowFreeze" BOOLEAN NOT NULL DEFAULT false,
    "maxFreezeDays" INTEGER NOT NULL DEFAULT 0,
    "freezeFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "colorTheme" TEXT,
    "iconUrl" TEXT,
    "imageUrl" TEXT,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "totalSubscribers" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymMembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymMemberMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "membershipNumber" TEXT NOT NULL,
    "status" "GymMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "actualEndDate" TIMESTAMP(3),
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "visitsUsed" INTEGER NOT NULL DEFAULT 0,
    "visitsRemaining" INTEGER,
    "classesUsed" INTEGER NOT NULL DEFAULT 0,
    "ptSessionsUsed" INTEGER NOT NULL DEFAULT 0,
    "guestPassesUsed" INTEGER NOT NULL DEFAULT 0,
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "frozenAt" TIMESTAMP(3),
    "frozenUntil" TIMESTAMP(3),
    "frozenReason" TEXT,
    "totalFrozenDays" INTEGER NOT NULL DEFAULT 0,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "renewalReminded" BOOLEAN NOT NULL DEFAULT false,
    "parentMembershipId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymMemberMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymTrainer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "shopId" TEXT,
    "trainerNumber" TEXT NOT NULL,
    "role" "GymTrainerRole" NOT NULL DEFAULT 'PERSONAL_TRAINER',
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experienceYears" DOUBLE PRECISION,
    "bio" TEXT,
    "photoUrl" TEXT,
    "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "perSessionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyPackageRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionFixed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "workStartTime" TEXT NOT NULL DEFAULT '06:00',
    "workEndTime" TEXT NOT NULL DEFAULT '22:00',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "maxDailyClients" INTEGER,
    "totalClients" INTEGER NOT NULL DEFAULT 0,
    "activeClients" INTEGER NOT NULL DEFAULT 0,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "socialMedia" JSONB,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymTrainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymClass" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "trainerId" TEXT,
    "name" TEXT NOT NULL,
    "classType" "GymClassType" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrencePattern" TEXT,
    "recurrenceDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "recurrenceEndDate" TIMESTAMP(3),
    "maxParticipants" INTEGER NOT NULL DEFAULT 20,
    "minParticipants" INTEGER NOT NULL DEFAULT 1,
    "currentEnrolled" INTEGER NOT NULL DEFAULT 0,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "dropInPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "memberPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "location" TEXT,
    "roomName" TEXT,
    "difficultyLevel" TEXT,
    "targetAudience" TEXT,
    "status" "GymClassStatus" NOT NULL DEFAULT 'SCHEDULED',
    "cancelledReason" TEXT,
    "imageUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymClassBooking" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "rating" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymClassBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymPersonalTraining" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "sessionNumber" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "focusArea" TEXT,
    "workoutPlan" JSONB,
    "exercisesPerformed" JSONB,
    "caloriesBurned" DOUBLE PRECISION,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isFromPackage" BOOLEAN NOT NULL DEFAULT false,
    "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "memberRating" INTEGER,
    "memberFeedback" TEXT,
    "trainerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymPersonalTraining_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymAttendance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "memberId" TEXT NOT NULL,
    "checkInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "method" "GymAttendanceMethod" NOT NULL DEFAULT 'MANUAL',
    "entryPoint" TEXT,
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "guestName" TEXT,
    "guestPhone" TEXT,
    "invitedByMemberId" TEXT,
    "membershipId" TEXT,
    "checkedInById" TEXT,
    "notes" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymBodyMeasurement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "measurementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "measuredById" TEXT,
    "weightKg" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "bodyFatPct" DOUBLE PRECISION,
    "muscleMassPct" DOUBLE PRECISION,
    "visceralFat" DOUBLE PRECISION,
    "waterPct" DOUBLE PRECISION,
    "boneMassKg" DOUBLE PRECISION,
    "metabolicAge" INTEGER,
    "bmr" DOUBLE PRECISION,
    "chestCm" DOUBLE PRECISION,
    "waistCm" DOUBLE PRECISION,
    "hipsCm" DOUBLE PRECISION,
    "bicepsCm" DOUBLE PRECISION,
    "thighsCm" DOUBLE PRECISION,
    "calvesCm" DOUBLE PRECISION,
    "neckCm" DOUBLE PRECISION,
    "shouldersCm" DOUBLE PRECISION,
    "forearmsCm" DOUBLE PRECISION,
    "bloodPressure" TEXT,
    "restingHeartRate" INTEGER,
    "frontPhotoUrl" TEXT,
    "sidePhotoUrl" TEXT,
    "backPhotoUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymBodyMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymWorkoutSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMinutes" INTEGER,
    "caloriesBurned" DOUBLE PRECISION,
    "workoutType" TEXT,
    "focusArea" TEXT,
    "intensity" TEXT,
    "exercises" JSONB,
    "totalSets" INTEGER NOT NULL DEFAULT 0,
    "totalReps" INTEGER NOT NULL DEFAULT 0,
    "totalWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "memberRating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymWorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymEquipment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "equipmentNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "GymEquipmentCategory" NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" DOUBLE PRECISION,
    "vendorName" TEXT,
    "warrantyExpiry" TIMESTAMP(3),
    "location" TEXT,
    "roomName" TEXT,
    "status" "GymEquipmentStatus" NOT NULL DEFAULT 'AVAILABLE',
    "lastMaintenanceDate" TIMESTAMP(3),
    "nextMaintenanceDate" TIMESTAMP(3),
    "maintenanceIntervalDays" INTEGER,
    "totalMaintenanceCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "manualUrl" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymDietPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "trainerId" TEXT,
    "planName" TEXT NOT NULL,
    "planType" TEXT,
    "goal" "GymGoal" NOT NULL DEFAULT 'GENERAL_FITNESS',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "durationDays" INTEGER,
    "targetCalories" DOUBLE PRECISION,
    "proteinGrams" DOUBLE PRECISION,
    "carbsGrams" DOUBLE PRECISION,
    "fatsGrams" DOUBLE PRECISION,
    "meals" JSONB,
    "restrictions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supplements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymDietPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GymMember_customerId_key" ON "GymMember"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "GymMember_referralCode_key" ON "GymMember"("referralCode");

-- CreateIndex
CREATE INDEX "GymMember_tenantId_idx" ON "GymMember"("tenantId");

-- CreateIndex
CREATE INDEX "GymMember_tenantId_status_idx" ON "GymMember"("tenantId", "status");

-- CreateIndex
CREATE INDEX "GymMember_customerId_idx" ON "GymMember"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "GymMember_tenantId_memberNumber_key" ON "GymMember"("tenantId", "memberNumber");

-- CreateIndex
CREATE INDEX "GymMembershipPlan_tenantId_idx" ON "GymMembershipPlan"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "GymMembershipPlan_tenantId_name_key" ON "GymMembershipPlan"("tenantId", "name");

-- CreateIndex
CREATE INDEX "GymMemberMembership_tenantId_idx" ON "GymMemberMembership"("tenantId");

-- CreateIndex
CREATE INDEX "GymMemberMembership_memberId_idx" ON "GymMemberMembership"("memberId");

-- CreateIndex
CREATE INDEX "GymMemberMembership_tenantId_status_idx" ON "GymMemberMembership"("tenantId", "status");

-- CreateIndex
CREATE INDEX "GymMemberMembership_endDate_idx" ON "GymMemberMembership"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "GymMemberMembership_tenantId_membershipNumber_key" ON "GymMemberMembership"("tenantId", "membershipNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GymTrainer_staffId_key" ON "GymTrainer"("staffId");

-- CreateIndex
CREATE INDEX "GymTrainer_tenantId_idx" ON "GymTrainer"("tenantId");

-- CreateIndex
CREATE INDEX "GymTrainer_tenantId_role_idx" ON "GymTrainer"("tenantId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "GymTrainer_tenantId_trainerNumber_key" ON "GymTrainer"("tenantId", "trainerNumber");

-- CreateIndex
CREATE INDEX "GymClass_tenantId_idx" ON "GymClass"("tenantId");

-- CreateIndex
CREATE INDEX "GymClass_tenantId_classType_idx" ON "GymClass"("tenantId", "classType");

-- CreateIndex
CREATE INDEX "GymClass_scheduledStart_idx" ON "GymClass"("scheduledStart");

-- CreateIndex
CREATE INDEX "GymClassBooking_tenantId_idx" ON "GymClassBooking"("tenantId");

-- CreateIndex
CREATE INDEX "GymClassBooking_memberId_idx" ON "GymClassBooking"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "GymClassBooking_classId_memberId_key" ON "GymClassBooking"("classId", "memberId");

-- CreateIndex
CREATE INDEX "GymPersonalTraining_tenantId_idx" ON "GymPersonalTraining"("tenantId");

-- CreateIndex
CREATE INDEX "GymPersonalTraining_memberId_idx" ON "GymPersonalTraining"("memberId");

-- CreateIndex
CREATE INDEX "GymPersonalTraining_trainerId_idx" ON "GymPersonalTraining"("trainerId");

-- CreateIndex
CREATE UNIQUE INDEX "GymPersonalTraining_tenantId_sessionNumber_key" ON "GymPersonalTraining"("tenantId", "sessionNumber");

-- CreateIndex
CREATE INDEX "GymAttendance_tenantId_idx" ON "GymAttendance"("tenantId");

-- CreateIndex
CREATE INDEX "GymAttendance_memberId_idx" ON "GymAttendance"("memberId");

-- CreateIndex
CREATE INDEX "GymAttendance_checkInAt_idx" ON "GymAttendance"("checkInAt");

-- CreateIndex
CREATE INDEX "GymBodyMeasurement_tenantId_idx" ON "GymBodyMeasurement"("tenantId");

-- CreateIndex
CREATE INDEX "GymBodyMeasurement_memberId_idx" ON "GymBodyMeasurement"("memberId");

-- CreateIndex
CREATE INDEX "GymBodyMeasurement_measurementDate_idx" ON "GymBodyMeasurement"("measurementDate");

-- CreateIndex
CREATE INDEX "GymWorkoutSession_tenantId_idx" ON "GymWorkoutSession"("tenantId");

-- CreateIndex
CREATE INDEX "GymWorkoutSession_memberId_idx" ON "GymWorkoutSession"("memberId");

-- CreateIndex
CREATE INDEX "GymWorkoutSession_sessionDate_idx" ON "GymWorkoutSession"("sessionDate");

-- CreateIndex
CREATE INDEX "GymEquipment_tenantId_idx" ON "GymEquipment"("tenantId");

-- CreateIndex
CREATE INDEX "GymEquipment_tenantId_category_idx" ON "GymEquipment"("tenantId", "category");

-- CreateIndex
CREATE INDEX "GymEquipment_tenantId_status_idx" ON "GymEquipment"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GymEquipment_tenantId_equipmentNumber_key" ON "GymEquipment"("tenantId", "equipmentNumber");

-- CreateIndex
CREATE INDEX "GymDietPlan_tenantId_idx" ON "GymDietPlan"("tenantId");

-- CreateIndex
CREATE INDEX "GymDietPlan_memberId_idx" ON "GymDietPlan"("memberId");

-- AddForeignKey
ALTER TABLE "GymMemberMembership" ADD CONSTRAINT "GymMemberMembership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "GymMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymMemberMembership" ADD CONSTRAINT "GymMemberMembership_planId_fkey" FOREIGN KEY ("planId") REFERENCES "GymMembershipPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClass" ADD CONSTRAINT "GymClass_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "GymTrainer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassBooking" ADD CONSTRAINT "GymClassBooking_classId_fkey" FOREIGN KEY ("classId") REFERENCES "GymClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassBooking" ADD CONSTRAINT "GymClassBooking_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "GymMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymPersonalTraining" ADD CONSTRAINT "GymPersonalTraining_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "GymTrainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAttendance" ADD CONSTRAINT "GymAttendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "GymMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymBodyMeasurement" ADD CONSTRAINT "GymBodyMeasurement_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "GymMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymWorkoutSession" ADD CONSTRAINT "GymWorkoutSession_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "GymMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
