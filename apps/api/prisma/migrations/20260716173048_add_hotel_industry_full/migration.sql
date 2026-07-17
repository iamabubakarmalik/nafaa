-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('SINGLE', 'DOUBLE', 'TWIN', 'TRIPLE', 'QUAD', 'FAMILY', 'SUITE', 'DELUXE', 'EXECUTIVE', 'PRESIDENTIAL', 'DORMITORY', 'STUDIO', 'APARTMENT', 'VILLA', 'BUNGALOW', 'TENT', 'CABIN', 'OTHER');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE', 'OUT_OF_ORDER', 'BLOCKED');

-- CreateEnum
CREATE TYPE "BedType" AS ENUM ('SINGLE_BED', 'DOUBLE_BED', 'QUEEN_BED', 'KING_BED', 'SOFA_BED', 'BUNK_BED', 'TWIN_BEDS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "HotelBookingStatus" AS ENUM ('INQUIRY', 'QUOTED', 'TENTATIVE', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW', 'CANCELLED', 'EXTENDED');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('DIRECT', 'WALK_IN', 'PHONE', 'WEBSITE', 'BOOKING_COM', 'AGODA', 'EXPEDIA', 'AIRBNB', 'TRAVEL_AGENT', 'CORPORATE', 'GOVT', 'REFERRAL', 'OTHER');

-- CreateEnum
CREATE TYPE "GuestIdType" AS ENUM ('CNIC', 'PASSPORT', 'DRIVING_LICENSE', 'NADRA', 'NIC', 'IQAMA', 'OTHER');

-- CreateEnum
CREATE TYPE "HousekeepingStatus" AS ENUM ('DIRTY', 'CLEAN', 'INSPECTED', 'OUT_OF_ORDER', 'MAINTENANCE_REQUIRED');

-- CreateEnum
CREATE TYPE "MealPlan" AS ENUM ('ROOM_ONLY', 'BED_BREAKFAST', 'HALF_BOARD', 'FULL_BOARD', 'ALL_INCLUSIVE');

-- CreateEnum
CREATE TYPE "FolioChargeType" AS ENUM ('ROOM', 'FOOD', 'BEVERAGE', 'LAUNDRY', 'SPA', 'MINIBAR', 'TELEPHONE', 'INTERNET', 'PARKING', 'TAX', 'SERVICE_CHARGE', 'DAMAGE', 'MISCELLANEOUS', 'DISCOUNT', 'REFUND');

-- CreateTable
CREATE TABLE "HotelRoomType" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RoomType" NOT NULL DEFAULT 'DOUBLE',
    "description" TEXT,
    "maxAdults" INTEGER NOT NULL DEFAULT 2,
    "maxChildren" INTEGER NOT NULL DEFAULT 0,
    "maxOccupancy" INTEGER NOT NULL DEFAULT 2,
    "bedType" "BedType" NOT NULL DEFAULT 'DOUBLE_BED',
    "bedCount" INTEGER NOT NULL DEFAULT 1,
    "extraBedAllowed" BOOLEAN NOT NULL DEFAULT false,
    "extraBedPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sizeSqft" DOUBLE PRECISION,
    "sizeSqm" DOUBLE PRECISION,
    "basePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weekendPrice" DOUBLE PRECISION,
    "peakPrice" DOUBLE PRECISION,
    "offSeasonPrice" DOUBLE PRECISION,
    "hourlyPrice" DOUBLE PRECISION,
    "hasAC" BOOLEAN NOT NULL DEFAULT true,
    "hasHeater" BOOLEAN NOT NULL DEFAULT false,
    "hasTV" BOOLEAN NOT NULL DEFAULT true,
    "hasWifi" BOOLEAN NOT NULL DEFAULT true,
    "hasBalcony" BOOLEAN NOT NULL DEFAULT false,
    "hasKitchen" BOOLEAN NOT NULL DEFAULT false,
    "hasBathtub" BOOLEAN NOT NULL DEFAULT false,
    "hasSafe" BOOLEAN NOT NULL DEFAULT false,
    "hasMinibar" BOOLEAN NOT NULL DEFAULT false,
    "isPetFriendly" BOOLEAN NOT NULL DEFAULT false,
    "isSmoking" BOOLEAN NOT NULL DEFAULT false,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelRoomType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelRoom" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "floor" TEXT,
    "building" TEXT,
    "wing" TEXT,
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "housekeepingStatus" "HousekeepingStatus" NOT NULL DEFAULT 'CLEAN',
    "customPrice" DOUBLE PRECISION,
    "customNotes" TEXT,
    "lastCleanedAt" TIMESTAMP(3),
    "lastInspectedAt" TIMESTAMP(3),
    "maintenanceUntil" TIMESTAMP(3),
    "maintenanceNotes" TEXT,
    "viewType" TEXT,
    "facing" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelGuest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "guestNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "title" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "altPhone" TEXT,
    "idType" "GuestIdType",
    "idNumber" TEXT,
    "idExpiryDate" TIMESTAMP(3),
    "idFrontUrl" TEXT,
    "idBackUrl" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "nationality" TEXT,
    "language" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "zipCode" TEXT,
    "companyName" TEXT,
    "designation" TEXT,
    "gstNumber" TEXT,
    "isVIP" BOOLEAN NOT NULL DEFAULT false,
    "vipLevel" TEXT,
    "loyaltyNumber" TEXT,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "preferences" JSONB,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dietaryRestrictions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialRequests" TEXT,
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "blacklistReason" TEXT,
    "totalStays" INTEGER NOT NULL DEFAULT 0,
    "totalNights" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastStayAt" TIMESTAMP(3),
    "photoUrl" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelBooking" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "bookingNumber" TEXT NOT NULL,
    "confirmationCode" TEXT,
    "primaryGuestId" TEXT,
    "guestName" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL,
    "guestEmail" TEXT,
    "totalAdults" INTEGER NOT NULL DEFAULT 1,
    "totalChildren" INTEGER NOT NULL DEFAULT 0,
    "checkInDate" TIMESTAMP(3) NOT NULL,
    "checkOutDate" TIMESTAMP(3) NOT NULL,
    "nights" INTEGER NOT NULL DEFAULT 1,
    "actualCheckIn" TIMESTAMP(3),
    "actualCheckOut" TIMESTAMP(3),
    "earlyCheckIn" BOOLEAN NOT NULL DEFAULT false,
    "lateCheckOut" BOOLEAN NOT NULL DEFAULT false,
    "source" "BookingSource" NOT NULL DEFAULT 'DIRECT',
    "sourceRef" TEXT,
    "bookedBy" TEXT,
    "agentName" TEXT,
    "agentCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mealPlan" "MealPlan" NOT NULL DEFAULT 'ROOM_ONLY',
    "status" "HotelBookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "roomTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serviceCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "extraCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advancePaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "specialRequests" TEXT,
    "arrivalTime" TEXT,
    "purposeOfVisit" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "checkedInBy" TEXT,
    "checkedOutBy" TEXT,
    "cancelledBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelBookedRoom" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "roomId" TEXT,
    "roomTypeId" TEXT NOT NULL,
    "roomNumber" TEXT,
    "ratePerNight" DOUBLE PRECISION NOT NULL,
    "totalNights" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "extraBeds" INTEGER NOT NULL DEFAULT 0,
    "isComplimentary" BOOLEAN NOT NULL DEFAULT false,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HotelBookedRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelFolioCharge" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "chargeNumber" TEXT NOT NULL,
    "chargeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chargeType" "FolioChargeType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "postedById" TEXT,
    "isVoid" BOOLEAN NOT NULL DEFAULT false,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HotelFolioCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelHousekeepingTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "taskNumber" TEXT NOT NULL,
    "roomId" TEXT,
    "roomNumber" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMin" INTEGER,
    "assignedTo" TEXT,
    "assignedName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "checklist" JSONB,
    "suppliesUsed" JSONB,
    "notes" TEXT,
    "issueFound" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelHousekeepingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelRatePlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "planType" TEXT NOT NULL,
    "mealPlan" "MealPlan" NOT NULL DEFAULT 'ROOM_ONLY',
    "isPercentage" BOOLEAN NOT NULL DEFAULT false,
    "adjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minNights" INTEGER,
    "maxNights" INTEGER,
    "applicableDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "advanceBookingDays" INTEGER,
    "cancellationHours" INTEGER,
    "applicableRoomTypeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applicableSources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelRatePlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HotelRoomType_tenantId_idx" ON "HotelRoomType"("tenantId");

-- CreateIndex
CREATE INDEX "HotelRoomType_tenantId_isActive_idx" ON "HotelRoomType"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "HotelRoomType_tenantId_code_key" ON "HotelRoomType"("tenantId", "code");

-- CreateIndex
CREATE INDEX "HotelRoom_tenantId_idx" ON "HotelRoom"("tenantId");

-- CreateIndex
CREATE INDEX "HotelRoom_tenantId_status_idx" ON "HotelRoom"("tenantId", "status");

-- CreateIndex
CREATE INDEX "HotelRoom_roomTypeId_idx" ON "HotelRoom"("roomTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "HotelRoom_tenantId_roomNumber_key" ON "HotelRoom"("tenantId", "roomNumber");

-- CreateIndex
CREATE INDEX "HotelGuest_tenantId_idx" ON "HotelGuest"("tenantId");

-- CreateIndex
CREATE INDEX "HotelGuest_phone_idx" ON "HotelGuest"("phone");

-- CreateIndex
CREATE INDEX "HotelGuest_email_idx" ON "HotelGuest"("email");

-- CreateIndex
CREATE INDEX "HotelGuest_idNumber_idx" ON "HotelGuest"("idNumber");

-- CreateIndex
CREATE UNIQUE INDEX "HotelGuest_tenantId_guestNumber_key" ON "HotelGuest"("tenantId", "guestNumber");

-- CreateIndex
CREATE INDEX "HotelBooking_tenantId_idx" ON "HotelBooking"("tenantId");

-- CreateIndex
CREATE INDEX "HotelBooking_tenantId_status_idx" ON "HotelBooking"("tenantId", "status");

-- CreateIndex
CREATE INDEX "HotelBooking_primaryGuestId_idx" ON "HotelBooking"("primaryGuestId");

-- CreateIndex
CREATE INDEX "HotelBooking_checkInDate_idx" ON "HotelBooking"("checkInDate");

-- CreateIndex
CREATE INDEX "HotelBooking_checkOutDate_idx" ON "HotelBooking"("checkOutDate");

-- CreateIndex
CREATE UNIQUE INDEX "HotelBooking_tenantId_bookingNumber_key" ON "HotelBooking"("tenantId", "bookingNumber");

-- CreateIndex
CREATE INDEX "HotelBookedRoom_bookingId_idx" ON "HotelBookedRoom"("bookingId");

-- CreateIndex
CREATE INDEX "HotelBookedRoom_roomId_idx" ON "HotelBookedRoom"("roomId");

-- CreateIndex
CREATE INDEX "HotelFolioCharge_bookingId_idx" ON "HotelFolioCharge"("bookingId");

-- CreateIndex
CREATE INDEX "HotelFolioCharge_chargeDate_idx" ON "HotelFolioCharge"("chargeDate");

-- CreateIndex
CREATE INDEX "HotelHousekeepingTask_tenantId_idx" ON "HotelHousekeepingTask"("tenantId");

-- CreateIndex
CREATE INDEX "HotelHousekeepingTask_tenantId_status_idx" ON "HotelHousekeepingTask"("tenantId", "status");

-- CreateIndex
CREATE INDEX "HotelHousekeepingTask_roomId_idx" ON "HotelHousekeepingTask"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "HotelHousekeepingTask_tenantId_taskNumber_key" ON "HotelHousekeepingTask"("tenantId", "taskNumber");

-- CreateIndex
CREATE INDEX "HotelRatePlan_tenantId_idx" ON "HotelRatePlan"("tenantId");

-- CreateIndex
CREATE INDEX "HotelRatePlan_tenantId_isActive_idx" ON "HotelRatePlan"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "HotelRatePlan_tenantId_code_key" ON "HotelRatePlan"("tenantId", "code");

-- AddForeignKey
ALTER TABLE "HotelRoom" ADD CONSTRAINT "HotelRoom_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "HotelRoomType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelBookedRoom" ADD CONSTRAINT "HotelBookedRoom_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "HotelBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelFolioCharge" ADD CONSTRAINT "HotelFolioCharge_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "HotelBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
