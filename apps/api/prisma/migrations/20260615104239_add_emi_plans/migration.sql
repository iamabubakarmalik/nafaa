-- CreateEnum
CREATE TYPE "EmiPlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmiInstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'WAIVED');

-- CreateTable
CREATE TABLE "EmiPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "saleId" TEXT,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "planNumber" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "downPayment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "financedAmount" DOUBLE PRECISION NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "installmentAmount" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingAmount" DOUBLE PRECISION NOT NULL,
    "status" "EmiPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmiPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmiInstallment" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "EmiInstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmiInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmiPlan_saleId_key" ON "EmiPlan"("saleId");

-- CreateIndex
CREATE INDEX "EmiPlan_tenantId_idx" ON "EmiPlan"("tenantId");

-- CreateIndex
CREATE INDEX "EmiPlan_customerId_idx" ON "EmiPlan"("customerId");

-- CreateIndex
CREATE INDEX "EmiPlan_status_idx" ON "EmiPlan"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EmiPlan_tenantId_planNumber_key" ON "EmiPlan"("tenantId", "planNumber");

-- CreateIndex
CREATE INDEX "EmiInstallment_planId_idx" ON "EmiInstallment"("planId");

-- CreateIndex
CREATE INDEX "EmiInstallment_status_idx" ON "EmiInstallment"("status");

-- CreateIndex
CREATE INDEX "EmiInstallment_dueDate_idx" ON "EmiInstallment"("dueDate");

-- AddForeignKey
ALTER TABLE "EmiPlan" ADD CONSTRAINT "EmiPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmiInstallment" ADD CONSTRAINT "EmiInstallment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "EmiPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
