-- CreateEnum
CREATE TYPE "CustomerGender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "area" TEXT,
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "cnic" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "gender" "CustomerGender",
ADD COLUMN     "isVip" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "altPhone" TEXT,
ADD COLUMN     "area" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "cnic" TEXT,
ADD COLUMN     "contactPerson" TEXT,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "ntn" TEXT,
ADD COLUMN     "outstandingDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "totalPurchased" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Customer_tenantId_isVip_idx" ON "Customer"("tenantId", "isVip");
