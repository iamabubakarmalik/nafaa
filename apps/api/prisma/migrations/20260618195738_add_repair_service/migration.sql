-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('RECEIVED', 'DIAGNOSED', 'AWAITING_APPROVAL', 'AWAITING_PARTS', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED', 'UNREPAIRABLE');

-- CreateEnum
CREATE TYPE "RepairPriority" AS ENUM ('NORMAL', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "RepairPaymentStatus" AS ENUM ('PENDING', 'ADVANCE_PAID', 'FULLY_PAID');

-- CreateTable
CREATE TABLE "RepairTicket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "ticketNumber" TEXT NOT NULL,
    "imei1" TEXT,
    "imei2" TEXT,
    "serialNumber" TEXT,
    "deviceBrand" TEXT NOT NULL,
    "deviceModel" TEXT NOT NULL,
    "deviceColor" TEXT,
    "passcode" TEXT,
    "hasSimCard" BOOLEAN NOT NULL DEFAULT false,
    "hasMemoryCard" BOOLEAN NOT NULL DEFAULT false,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerCnic" TEXT,
    "customerAddress" TEXT,
    "reportedIssue" TEXT NOT NULL,
    "diagnosedIssue" TEXT,
    "diagnosisNotes" TEXT,
    "recommendedActions" TEXT,
    "status" "RepairStatus" NOT NULL DEFAULT 'RECEIVED',
    "priority" "RepairPriority" NOT NULL DEFAULT 'NORMAL',
    "paymentStatus" "RepairPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "partsCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advancePaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diagnosedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "estimatedReadyAt" TIMESTAMP(3),
    "technicianId" TEXT,
    "technicianName" TEXT,
    "beforePhotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "afterPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "signatureUrl" TEXT,
    "smsNotificationsSent" INTEGER NOT NULL DEFAULT 0,
    "lastSmsSentAt" TIMESTAMP(3),
    "notes" TEXT,
    "warrantyDays" INTEGER NOT NULL DEFAULT 7,
    "warrantyEnds" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairPart" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "productId" TEXT,
    "partName" TEXT NOT NULL,
    "partNumber" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairStatusLog" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fromStatus" "RepairStatus",
    "toStatus" "RepairStatus" NOT NULL,
    "note" TEXT,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairPayment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "RepairPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RepairTicket_tenantId_idx" ON "RepairTicket"("tenantId");

-- CreateIndex
CREATE INDEX "RepairTicket_tenantId_status_idx" ON "RepairTicket"("tenantId", "status");

-- CreateIndex
CREATE INDEX "RepairTicket_tenantId_priority_idx" ON "RepairTicket"("tenantId", "priority");

-- CreateIndex
CREATE INDEX "RepairTicket_customerId_idx" ON "RepairTicket"("customerId");

-- CreateIndex
CREATE INDEX "RepairTicket_shopId_idx" ON "RepairTicket"("shopId");

-- CreateIndex
CREATE INDEX "RepairTicket_imei1_idx" ON "RepairTicket"("imei1");

-- CreateIndex
CREATE UNIQUE INDEX "RepairTicket_tenantId_ticketNumber_key" ON "RepairTicket"("tenantId", "ticketNumber");

-- CreateIndex
CREATE INDEX "RepairPart_ticketId_idx" ON "RepairPart"("ticketId");

-- CreateIndex
CREATE INDEX "RepairPart_productId_idx" ON "RepairPart"("productId");

-- CreateIndex
CREATE INDEX "RepairStatusLog_ticketId_idx" ON "RepairStatusLog"("ticketId");

-- CreateIndex
CREATE INDEX "RepairStatusLog_changedAt_idx" ON "RepairStatusLog"("changedAt");

-- CreateIndex
CREATE INDEX "RepairPayment_ticketId_idx" ON "RepairPayment"("ticketId");

-- AddForeignKey
ALTER TABLE "RepairTicket" ADD CONSTRAINT "RepairTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairTicket" ADD CONSTRAINT "RepairTicket_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairTicket" ADD CONSTRAINT "RepairTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairPart" ADD CONSTRAINT "RepairPart_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "RepairTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairPart" ADD CONSTRAINT "RepairPart_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairStatusLog" ADD CONSTRAINT "RepairStatusLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "RepairTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairPayment" ADD CONSTRAINT "RepairPayment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "RepairTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
