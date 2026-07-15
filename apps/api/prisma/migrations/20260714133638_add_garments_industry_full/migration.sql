-- CreateEnum
CREATE TYPE "GarmentGender" AS ENUM ('MEN', 'WOMEN', 'BOYS', 'GIRLS', 'UNISEX', 'KIDS', 'BABY');

-- CreateEnum
CREATE TYPE "GarmentCategoryType" AS ENUM ('SHIRT', 'T_SHIRT', 'POLO', 'KURTA', 'KURTA_SHALWAR', 'SHALWAR_KAMEEZ', 'SUIT', 'THREE_PIECE', 'TWO_PIECE', 'WAISTCOAT', 'TROUSER', 'JEANS', 'SHORTS', 'SKIRT', 'TOP', 'FROCK', 'GOWN', 'ABAYA', 'HIJAB', 'DUPATTA', 'SAREE', 'LEHENGA', 'MAXI', 'JACKET', 'COAT', 'SWEATER', 'HOODIE', 'TRACK_SUIT', 'NIGHTWEAR', 'UNDERGARMENT', 'SOCKS', 'SHOES', 'SANDALS', 'ACCESSORY', 'FABRIC', 'OTHER');

-- CreateEnum
CREATE TYPE "GarmentSeason" AS ENUM ('SPRING', 'SUMMER', 'AUTUMN', 'WINTER', 'ALL_SEASON', 'EID_COLLECTION', 'WEDDING_COLLECTION', 'FESTIVE_COLLECTION', 'RAMADAN_COLLECTION', 'SCHOOL_COLLECTION');

-- CreateEnum
CREATE TYPE "GarmentFitType" AS ENUM ('SLIM', 'REGULAR', 'RELAXED', 'OVERSIZED', 'SKINNY', 'STRAIGHT', 'BOOTCUT', 'FLARED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GarmentFabricType" AS ENUM ('COTTON', 'LAWN', 'LINEN', 'KHADDAR', 'KARANDI', 'SILK', 'CHIFFON', 'ORGANZA', 'VELVET', 'DENIM', 'JERSEY', 'WOOL', 'POLYESTER', 'VISCOSE', 'CAMBRIC', 'NET', 'GEORGETTE', 'LEATHER', 'MIXED', 'OTHER');

-- CreateEnum
CREATE TYPE "GarmentWorkType" AS ENUM ('PLAIN', 'PRINTED', 'EMBROIDERED', 'HAND_EMBROIDERED', 'BLOCK_PRINTED', 'DIGITAL_PRINTED', 'SEQUIN_WORK', 'ZARI_WORK', 'MIRROR_WORK', 'PEARL_WORK', 'STONE_WORK', 'LACE_WORK', 'PATCH_WORK', 'OTHER');

-- CreateEnum
CREATE TYPE "GarmentOrderStatus" AS ENUM ('DRAFT', 'QUOTED', 'CONFIRMED', 'FABRIC_PENDING', 'CUTTING', 'STITCHING', 'EMBROIDERY', 'QUALITY_CHECK', 'READY', 'DELIVERED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "GarmentAlterationStatus" AS ENUM ('RECEIVED', 'MEASUREMENT_TAKEN', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GarmentReservationStatus" AS ENUM ('ACTIVE', 'CONVERTED_TO_SALE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GarmentLayawayStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'DEFAULTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "GarmentPaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "GarmentMeasurementUnit" AS ENUM ('INCH', 'CM');

-- CreateEnum
CREATE TYPE "GarmentPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "GarmentCollection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "season" "GarmentSeason" NOT NULL DEFAULT 'ALL_SEASON',
    "year" INTEGER,
    "launchDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "coverImageUrl" TEXT,
    "bannerImageUrl" TEXT,
    "colorTheme" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "totalProducts" INTEGER NOT NULL DEFAULT 0,
    "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarmentCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarmentSizeChart" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryType" "GarmentCategoryType",
    "gender" "GarmentGender",
    "unit" "GarmentMeasurementUnit" NOT NULL DEFAULT 'INCH',
    "description" TEXT,
    "rows" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarmentSizeChart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarmentProductProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "collectionId" TEXT,
    "sizeChartId" TEXT,
    "gender" "GarmentGender",
    "categoryType" "GarmentCategoryType",
    "season" "GarmentSeason" NOT NULL DEFAULT 'ALL_SEASON',
    "fabricType" "GarmentFabricType",
    "fabricBlend" TEXT,
    "workType" "GarmentWorkType" NOT NULL DEFAULT 'PLAIN',
    "fitType" "GarmentFitType" NOT NULL DEFAULT 'REGULAR',
    "neckline" TEXT,
    "sleeveType" TEXT,
    "sleeveLength" TEXT,
    "pattern" TEXT,
    "careInstructions" TEXT,
    "countryOfOrigin" TEXT,
    "manufacturer" TEXT,
    "designer" TEXT,
    "modelHeight" TEXT,
    "modelWearingSize" TEXT,
    "styleCode" TEXT,
    "lookBookUrl" TEXT,
    "videoUrl" TEXT,
    "isReadyMade" BOOLEAN NOT NULL DEFAULT true,
    "isStitchable" BOOLEAN NOT NULL DEFAULT false,
    "isFabricOnly" BOOLEAN NOT NULL DEFAULT false,
    "allowAlteration" BOOLEAN NOT NULL DEFAULT true,
    "allowReservation" BOOLEAN NOT NULL DEFAULT true,
    "allowLayaway" BOOLEAN NOT NULL DEFAULT false,
    "minAlterationDays" INTEGER,
    "defaultStitchingDays" INTEGER,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isOnSale" BOOLEAN NOT NULL DEFAULT false,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "totalReturns" INTEGER NOT NULL DEFAULT 0,
    "totalAlterations" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarmentProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarmentVariantProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "size" TEXT,
    "colorName" TEXT,
    "colorHex" TEXT,
    "colorFamily" TEXT,
    "skuSuffix" TEXT,
    "barcode" TEXT,
    "chest" DOUBLE PRECISION,
    "waist" DOUBLE PRECISION,
    "hip" DOUBLE PRECISION,
    "shoulder" DOUBLE PRECISION,
    "length" DOUBLE PRECISION,
    "sleeveLength" DOUBLE PRECISION,
    "inseam" DOUBLE PRECISION,
    "weightGrams" DOUBLE PRECISION,
    "fabricMeters" DOUBLE PRECISION,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isFeaturedColor" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarmentVariantProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarmentMeasurementProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "profileName" TEXT NOT NULL DEFAULT 'Default',
    "gender" "GarmentGender",
    "unit" "GarmentMeasurementUnit" NOT NULL DEFAULT 'INCH',
    "neck" DOUBLE PRECISION,
    "shoulder" DOUBLE PRECISION,
    "chest" DOUBLE PRECISION,
    "bust" DOUBLE PRECISION,
    "waist" DOUBLE PRECISION,
    "hip" DOUBLE PRECISION,
    "armhole" DOUBLE PRECISION,
    "bicep" DOUBLE PRECISION,
    "wrist" DOUBLE PRECISION,
    "sleeveLength" DOUBLE PRECISION,
    "shirtLength" DOUBLE PRECISION,
    "trouserLength" DOUBLE PRECISION,
    "inseam" DOUBLE PRECISION,
    "thigh" DOUBLE PRECISION,
    "knee" DOUBLE PRECISION,
    "bottom" DOUBLE PRECISION,
    "kurtaLength" DOUBLE PRECISION,
    "shalwarLength" DOUBLE PRECISION,
    "shalwarBottom" DOUBLE PRECISION,
    "daman" DOUBLE PRECISION,
    "postureNotes" TEXT,
    "fittingNotes" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "measuredById" TEXT,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarmentMeasurementProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarmentTailoringOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "measurementProfileId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerNotes" TEXT,
    "orderStatus" "GarmentOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "GarmentPriority" NOT NULL DEFAULT 'NORMAL',
    "paymentStatus" "GarmentPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "collectionId" TEXT,
    "tailorId" TEXT,
    "designerId" TEXT,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promisedDate" TIMESTAMP(3),
    "readyDate" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stitchingCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "embroideryCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "alterationCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fabricCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accessoryCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "designReferenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "designInstructions" TEXT,
    "internalNotes" TEXT,
    "qualityCheckNotes" TEXT,
    "qualityCheckedById" TEXT,
    "qualityCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarmentTailoringOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarmentTailoringOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "garmentName" TEXT NOT NULL,
    "categoryType" "GarmentCategoryType",
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "fabricProductId" TEXT,
    "fabricVariantId" TEXT,
    "fabricMeters" DOUBLE PRECISION,
    "fabricCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stitchingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "embroideryCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accessoryCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "size" TEXT,
    "colorName" TEXT,
    "designNotes" TEXT,
    "measurementSnapshot" JSONB,
    "referenceImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "itemStatus" "GarmentOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarmentTailoringOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarmentTailoringPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "receivedById" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GarmentTailoringPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarmentAlterationTicket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "ticketNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "saleId" TEXT,
    "productId" TEXT,
    "variantId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "garmentDescription" TEXT NOT NULL,
    "alterationType" TEXT NOT NULL,
    "alterationDetails" TEXT,
    "status" "GarmentAlterationStatus" NOT NULL DEFAULT 'RECEIVED',
    "priority" "GarmentPriority" NOT NULL DEFAULT 'NORMAL',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promisedDate" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "tailorId" TEXT,
    "charges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" "GarmentPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "beforeImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "afterImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarmentAlterationTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarmentReservation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "reservationNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "GarmentReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "convertedSaleId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarmentReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarmentLayawayPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "planNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "productId" TEXT,
    "variantId" TEXT,
    "tailoringOrderId" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "installmentCount" INTEGER NOT NULL DEFAULT 1,
    "installmentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextDueDate" TIMESTAMP(3),
    "finalDueDate" TIMESTAMP(3),
    "status" "GarmentLayawayStatus" NOT NULL DEFAULT 'ACTIVE',
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarmentLayawayPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarmentLayawayInstallment" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "installmentNo" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "GarmentPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarmentLayawayInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GarmentCollection_tenantId_idx" ON "GarmentCollection"("tenantId");

-- CreateIndex
CREATE INDEX "GarmentCollection_tenantId_isActive_idx" ON "GarmentCollection"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "GarmentCollection_tenantId_season_idx" ON "GarmentCollection"("tenantId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "GarmentCollection_tenantId_name_key" ON "GarmentCollection"("tenantId", "name");

-- CreateIndex
CREATE INDEX "GarmentSizeChart_tenantId_idx" ON "GarmentSizeChart"("tenantId");

-- CreateIndex
CREATE INDEX "GarmentSizeChart_tenantId_categoryType_idx" ON "GarmentSizeChart"("tenantId", "categoryType");

-- CreateIndex
CREATE UNIQUE INDEX "GarmentSizeChart_tenantId_name_key" ON "GarmentSizeChart"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "GarmentProductProfile_productId_key" ON "GarmentProductProfile"("productId");

-- CreateIndex
CREATE INDEX "GarmentProductProfile_tenantId_idx" ON "GarmentProductProfile"("tenantId");

-- CreateIndex
CREATE INDEX "GarmentProductProfile_tenantId_gender_idx" ON "GarmentProductProfile"("tenantId", "gender");

-- CreateIndex
CREATE INDEX "GarmentProductProfile_tenantId_categoryType_idx" ON "GarmentProductProfile"("tenantId", "categoryType");

-- CreateIndex
CREATE INDEX "GarmentProductProfile_tenantId_season_idx" ON "GarmentProductProfile"("tenantId", "season");

-- CreateIndex
CREATE INDEX "GarmentProductProfile_collectionId_idx" ON "GarmentProductProfile"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "GarmentVariantProfile_variantId_key" ON "GarmentVariantProfile"("variantId");

-- CreateIndex
CREATE INDEX "GarmentVariantProfile_tenantId_idx" ON "GarmentVariantProfile"("tenantId");

-- CreateIndex
CREATE INDEX "GarmentVariantProfile_productId_idx" ON "GarmentVariantProfile"("productId");

-- CreateIndex
CREATE INDEX "GarmentVariantProfile_tenantId_size_idx" ON "GarmentVariantProfile"("tenantId", "size");

-- CreateIndex
CREATE INDEX "GarmentVariantProfile_tenantId_colorFamily_idx" ON "GarmentVariantProfile"("tenantId", "colorFamily");

-- CreateIndex
CREATE INDEX "GarmentMeasurementProfile_tenantId_idx" ON "GarmentMeasurementProfile"("tenantId");

-- CreateIndex
CREATE INDEX "GarmentMeasurementProfile_customerId_idx" ON "GarmentMeasurementProfile"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "GarmentMeasurementProfile_tenantId_customerId_profileName_key" ON "GarmentMeasurementProfile"("tenantId", "customerId", "profileName");

-- CreateIndex
CREATE INDEX "GarmentTailoringOrder_tenantId_idx" ON "GarmentTailoringOrder"("tenantId");

-- CreateIndex
CREATE INDEX "GarmentTailoringOrder_tenantId_orderStatus_idx" ON "GarmentTailoringOrder"("tenantId", "orderStatus");

-- CreateIndex
CREATE INDEX "GarmentTailoringOrder_customerId_idx" ON "GarmentTailoringOrder"("customerId");

-- CreateIndex
CREATE INDEX "GarmentTailoringOrder_promisedDate_idx" ON "GarmentTailoringOrder"("promisedDate");

-- CreateIndex
CREATE UNIQUE INDEX "GarmentTailoringOrder_tenantId_orderNumber_key" ON "GarmentTailoringOrder"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "GarmentTailoringOrderItem_orderId_idx" ON "GarmentTailoringOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "GarmentTailoringOrderItem_productId_idx" ON "GarmentTailoringOrderItem"("productId");

-- CreateIndex
CREATE INDEX "GarmentTailoringOrderItem_fabricProductId_idx" ON "GarmentTailoringOrderItem"("fabricProductId");

-- CreateIndex
CREATE INDEX "GarmentTailoringPayment_orderId_idx" ON "GarmentTailoringPayment"("orderId");

-- CreateIndex
CREATE INDEX "GarmentAlterationTicket_tenantId_idx" ON "GarmentAlterationTicket"("tenantId");

-- CreateIndex
CREATE INDEX "GarmentAlterationTicket_tenantId_status_idx" ON "GarmentAlterationTicket"("tenantId", "status");

-- CreateIndex
CREATE INDEX "GarmentAlterationTicket_customerId_idx" ON "GarmentAlterationTicket"("customerId");

-- CreateIndex
CREATE INDEX "GarmentAlterationTicket_promisedDate_idx" ON "GarmentAlterationTicket"("promisedDate");

-- CreateIndex
CREATE UNIQUE INDEX "GarmentAlterationTicket_tenantId_ticketNumber_key" ON "GarmentAlterationTicket"("tenantId", "ticketNumber");

-- CreateIndex
CREATE INDEX "GarmentReservation_tenantId_idx" ON "GarmentReservation"("tenantId");

-- CreateIndex
CREATE INDEX "GarmentReservation_tenantId_status_idx" ON "GarmentReservation"("tenantId", "status");

-- CreateIndex
CREATE INDEX "GarmentReservation_productId_idx" ON "GarmentReservation"("productId");

-- CreateIndex
CREATE INDEX "GarmentReservation_customerId_idx" ON "GarmentReservation"("customerId");

-- CreateIndex
CREATE INDEX "GarmentReservation_expiresAt_idx" ON "GarmentReservation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "GarmentReservation_tenantId_reservationNumber_key" ON "GarmentReservation"("tenantId", "reservationNumber");

-- CreateIndex
CREATE INDEX "GarmentLayawayPlan_tenantId_idx" ON "GarmentLayawayPlan"("tenantId");

-- CreateIndex
CREATE INDEX "GarmentLayawayPlan_tenantId_status_idx" ON "GarmentLayawayPlan"("tenantId", "status");

-- CreateIndex
CREATE INDEX "GarmentLayawayPlan_customerId_idx" ON "GarmentLayawayPlan"("customerId");

-- CreateIndex
CREATE INDEX "GarmentLayawayPlan_nextDueDate_idx" ON "GarmentLayawayPlan"("nextDueDate");

-- CreateIndex
CREATE UNIQUE INDEX "GarmentLayawayPlan_tenantId_planNumber_key" ON "GarmentLayawayPlan"("tenantId", "planNumber");

-- CreateIndex
CREATE INDEX "GarmentLayawayInstallment_planId_idx" ON "GarmentLayawayInstallment"("planId");

-- CreateIndex
CREATE INDEX "GarmentLayawayInstallment_dueDate_idx" ON "GarmentLayawayInstallment"("dueDate");

-- CreateIndex
CREATE INDEX "GarmentLayawayInstallment_status_idx" ON "GarmentLayawayInstallment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GarmentLayawayInstallment_planId_installmentNo_key" ON "GarmentLayawayInstallment"("planId", "installmentNo");

-- AddForeignKey
ALTER TABLE "GarmentTailoringOrderItem" ADD CONSTRAINT "GarmentTailoringOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "GarmentTailoringOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarmentTailoringPayment" ADD CONSTRAINT "GarmentTailoringPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "GarmentTailoringOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarmentLayawayInstallment" ADD CONSTRAINT "GarmentLayawayInstallment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "GarmentLayawayPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
