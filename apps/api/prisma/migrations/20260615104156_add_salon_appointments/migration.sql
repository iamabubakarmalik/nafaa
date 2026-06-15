-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "SalonAppointment" (
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

    CONSTRAINT "SalonAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalonAppointment_completedSaleId_key" ON "SalonAppointment"("completedSaleId");

-- CreateIndex
CREATE INDEX "SalonAppointment_tenantId_idx" ON "SalonAppointment"("tenantId");

-- CreateIndex
CREATE INDEX "SalonAppointment_tenantId_startTime_idx" ON "SalonAppointment"("tenantId", "startTime");

-- CreateIndex
CREATE INDEX "SalonAppointment_tenantId_status_idx" ON "SalonAppointment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SalonAppointment_staffId_idx" ON "SalonAppointment"("staffId");

-- CreateIndex
CREATE INDEX "SalonAppointment_customerId_idx" ON "SalonAppointment"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "SalonAppointment_tenantId_appointmentNumber_key" ON "SalonAppointment"("tenantId", "appointmentNumber");

-- AddForeignKey
ALTER TABLE "SalonAppointment" ADD CONSTRAINT "SalonAppointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
