-- CreateEnum
CREATE TYPE "RestaurantOrderMode" AS ENUM ('DINE_IN', 'TAKEAWAY', 'DELIVERY', 'DRIVE_THRU', 'ROOM_SERVICE', 'PICKUP');

-- CreateEnum
CREATE TYPE "RestaurantOrderStatus" AS ENUM ('DRAFT', 'PLACED', 'CONFIRMED', 'COOKING', 'READY', 'SERVED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "RestaurantTableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "SpiceLevel" AS ENUM ('NONE', 'MILD', 'MEDIUM', 'HOT', 'EXTRA_HOT');

-- CreateEnum
CREATE TYPE "DietaryTag" AS ENUM ('VEGETARIAN', 'VEGAN', 'HALAL', 'GLUTEN_FREE', 'DAIRY_FREE', 'NUT_FREE', 'SPICY', 'CONTAINS_EGG', 'CONTAINS_SEAFOOD', 'BEEF', 'CHICKEN', 'MUTTON');

-- CreateEnum
CREATE TYPE "ModifierType" AS ENUM ('ADDON', 'VARIATION', 'REMOVAL', 'SPICE_LEVEL', 'COOKING_STYLE', 'NOTE');

-- CreateEnum
CREATE TYPE "RiderStatus" AS ENUM ('ACTIVE', 'BUSY', 'OFFLINE', 'ON_BREAK', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RiderDeliveryStatus" AS ENUM ('PENDING', 'ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'ARRIVED', 'DELIVERED', 'FAILED', 'RETURNED');

-- CreateEnum
CREATE TYPE "KotStatus" AS ENUM ('PENDING', 'PRINTED', 'ACKNOWLEDGED', 'COOKING', 'READY', 'SERVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "RestaurantMenuItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "prepTimeMinutes" INTEGER,
    "cookingInstructions" TEXT,
    "chefSpecial" BOOLEAN NOT NULL DEFAULT false,
    "bestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isSpicy" BOOLEAN NOT NULL DEFAULT false,
    "spiceLevel" "SpiceLevel",
    "calories" INTEGER,
    "servingSize" TEXT,
    "servesPeople" INTEGER DEFAULT 1,
    "dietaryTags" "DietaryTag"[] DEFAULT ARRAY[]::"DietaryTag"[],
    "allergenInfo" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "availableFrom" TEXT,
    "availableTo" TEXT,
    "availableDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "highlightColor" TEXT,
    "tagLine" TEXT,
    "totalOrdered" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ModifierType" NOT NULL DEFAULT 'ADDON',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "minSelections" INTEGER NOT NULL DEFAULT 0,
    "maxSelections" INTEGER NOT NULL DEFAULT 1,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModifierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierOption" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "modifierGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emoji" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModifierOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemModifier" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "modifierGroupId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MenuItemModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "yieldQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "yieldUnit" TEXT NOT NULL DEFAULT 'portion',
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "preparationSteps" TEXT,
    "cookingTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientProductId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "costPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantTableV2" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "tableNumber" TEXT NOT NULL,
    "tableName" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "minCapacity" INTEGER NOT NULL DEFAULT 1,
    "maxCapacity" INTEGER NOT NULL DEFAULT 8,
    "section" TEXT,
    "floor" TEXT,
    "location" TEXT,
    "shape" TEXT,
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "status" "RestaurantTableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "isReservable" BOOLEAN NOT NULL DEFAULT true,
    "isSmokingAllowed" BOOLEAN NOT NULL DEFAULT false,
    "isAcRoom" BOOLEAN NOT NULL DEFAULT true,
    "isFamilyArea" BOOLEAN NOT NULL DEFAULT false,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "minOrderAmount" DOUBLE PRECISION,
    "currentOrderId" TEXT,
    "occupiedAt" TIMESTAMP(3),
    "reservedAt" TIMESTAMP(3),
    "reservedFor" TIMESTAMP(3),
    "reservedByName" TEXT,
    "reservedByPhone" TEXT,
    "reservationNote" TEXT,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgTurnoverMinutes" DOUBLE PRECISION,
    "qrCodeUrl" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantTableV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "tableId" TEXT,
    "customerId" TEXT,
    "riderId" TEXT,
    "waiterId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "mode" "RestaurantOrderMode" NOT NULL,
    "status" "RestaurantOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "numberOfGuests" INTEGER,
    "specialRequests" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serviceCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serviceChargePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "packagingFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tip" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "placedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cookingStartedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "servedAt" TIMESTAMP(3),
    "outForDeliveryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "estimatedPrepTime" INTEGER,
    "estimatedDeliveryTime" TIMESTAMP(3),
    "deliveryAddress" TEXT,
    "deliveryLat" DOUBLE PRECISION,
    "deliveryLng" DOUBLE PRECISION,
    "deliveryDistance" DOUBLE PRECISION,
    "deliveryNotes" TEXT,
    "deliveryStatus" "RiderDeliveryStatus",
    "kotPrintedAt" TIMESTAMP(3),
    "kotPrintCount" INTEGER NOT NULL DEFAULT 0,
    "isSplitBill" BOOLEAN NOT NULL DEFAULT false,
    "parentOrderId" TEXT,
    "saleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "basePrice" DOUBLE PRECISION NOT NULL,
    "modifierTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "itemDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "specialInstructions" TEXT,
    "spiceLevel" "SpiceLevel",
    "cookingNote" TEXT,
    "status" "RestaurantOrderStatus" NOT NULL DEFAULT 'PLACED',
    "courseNumber" INTEGER,
    "isComplimentary" BOOLEAN NOT NULL DEFAULT false,
    "isReturned" BOOLEAN NOT NULL DEFAULT false,
    "returnReason" TEXT,
    "sentToKitchenAt" TIMESTAMP(3),
    "cookingStartedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "servedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantOrderItemModifier" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "modifierOptionId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestaurantOrderItemModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kotNumber" TEXT NOT NULL,
    "station" TEXT,
    "status" "KotStatus" NOT NULL DEFAULT 'PENDING',
    "itemIds" TEXT[],
    "itemsSnapshot" JSONB NOT NULL,
    "printedAt" TIMESTAMP(3),
    "printedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "cookingStartedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "servedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,
    "priority" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantOrderPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paidBy" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestaurantOrderPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rider" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "cnic" TEXT,
    "email" TEXT,
    "avatarUrl" TEXT,
    "vehicleType" TEXT,
    "vehicleNumber" TEXT,
    "licenseNumber" TEXT,
    "status" "RiderStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "lastLocationUpdate" TIMESTAMP(3),
    "isEmployee" BOOLEAN NOT NULL DEFAULT true,
    "commissionType" TEXT,
    "commissionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "baseSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "totalDistance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "totalTips" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryTracking" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "riderId" TEXT,
    "status" "RiderDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "assignedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "onTheWayAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "pickupLat" DOUBLE PRECISION,
    "pickupLng" DOUBLE PRECISION,
    "dropoffLat" DOUBLE PRECISION,
    "dropoffLng" DOUBLE PRECISION,
    "distanceKm" DOUBLE PRECISION,
    "estimatedMinutes" INTEGER,
    "actualMinutes" INTEGER,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riderCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerTip" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerRating" INTEGER,
    "customerFeedback" TEXT,
    "proofPhotoUrl" TEXT,
    "signatureUrl" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitchenStation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "printerName" TEXT,
    "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitchenStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaiterAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tableIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "section" TEXT,
    "shiftStart" TIMESTAMP(3),
    "shiftEnd" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaiterAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HappyHourRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" DOUBLE PRECISION NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minOrderAmount" DOUBLE PRECISION,
    "maxDiscount" DOUBLE PRECISION,
    "orderModes" "RestaurantOrderMode"[] DEFAULT ARRAY[]::"RestaurantOrderMode"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "totalUsage" INTEGER NOT NULL DEFAULT 0,
    "totalSaved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HappyHourRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantMenuItem_productId_key" ON "RestaurantMenuItem"("productId");

-- CreateIndex
CREATE INDEX "RestaurantMenuItem_tenantId_idx" ON "RestaurantMenuItem"("tenantId");

-- CreateIndex
CREATE INDEX "RestaurantMenuItem_tenantId_isAvailable_idx" ON "RestaurantMenuItem"("tenantId", "isAvailable");

-- CreateIndex
CREATE INDEX "RestaurantMenuItem_tenantId_bestSeller_idx" ON "RestaurantMenuItem"("tenantId", "bestSeller");

-- CreateIndex
CREATE INDEX "RestaurantMenuItem_tenantId_chefSpecial_idx" ON "RestaurantMenuItem"("tenantId", "chefSpecial");

-- CreateIndex
CREATE INDEX "ModifierGroup_tenantId_idx" ON "ModifierGroup"("tenantId");

-- CreateIndex
CREATE INDEX "ModifierGroup_tenantId_isActive_idx" ON "ModifierGroup"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "ModifierOption_tenantId_idx" ON "ModifierOption"("tenantId");

-- CreateIndex
CREATE INDEX "ModifierOption_modifierGroupId_idx" ON "ModifierOption"("modifierGroupId");

-- CreateIndex
CREATE INDEX "MenuItemModifier_menuItemId_idx" ON "MenuItemModifier"("menuItemId");

-- CreateIndex
CREATE INDEX "MenuItemModifier_modifierGroupId_idx" ON "MenuItemModifier"("modifierGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemModifier_menuItemId_modifierGroupId_key" ON "MenuItemModifier"("menuItemId", "modifierGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_menuItemId_key" ON "Recipe"("menuItemId");

-- CreateIndex
CREATE INDEX "Recipe_tenantId_idx" ON "Recipe"("tenantId");

-- CreateIndex
CREATE INDEX "RecipeIngredient_recipeId_idx" ON "RecipeIngredient"("recipeId");

-- CreateIndex
CREATE INDEX "RecipeIngredient_ingredientProductId_idx" ON "RecipeIngredient"("ingredientProductId");

-- CreateIndex
CREATE INDEX "RestaurantTableV2_tenantId_idx" ON "RestaurantTableV2"("tenantId");

-- CreateIndex
CREATE INDEX "RestaurantTableV2_tenantId_status_idx" ON "RestaurantTableV2"("tenantId", "status");

-- CreateIndex
CREATE INDEX "RestaurantTableV2_tenantId_section_idx" ON "RestaurantTableV2"("tenantId", "section");

-- CreateIndex
CREATE INDEX "RestaurantTableV2_shopId_idx" ON "RestaurantTableV2"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantTableV2_tenantId_tableNumber_key" ON "RestaurantTableV2"("tenantId", "tableNumber");

-- CreateIndex
CREATE INDEX "RestaurantOrder_tenantId_idx" ON "RestaurantOrder"("tenantId");

-- CreateIndex
CREATE INDEX "RestaurantOrder_tenantId_status_idx" ON "RestaurantOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "RestaurantOrder_tenantId_mode_idx" ON "RestaurantOrder"("tenantId", "mode");

-- CreateIndex
CREATE INDEX "RestaurantOrder_tableId_idx" ON "RestaurantOrder"("tableId");

-- CreateIndex
CREATE INDEX "RestaurantOrder_customerId_idx" ON "RestaurantOrder"("customerId");

-- CreateIndex
CREATE INDEX "RestaurantOrder_riderId_idx" ON "RestaurantOrder"("riderId");

-- CreateIndex
CREATE INDEX "RestaurantOrder_createdAt_idx" ON "RestaurantOrder"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantOrder_tenantId_orderNumber_key" ON "RestaurantOrder"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "RestaurantOrderItem_orderId_idx" ON "RestaurantOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "RestaurantOrderItem_productId_idx" ON "RestaurantOrderItem"("productId");

-- CreateIndex
CREATE INDEX "RestaurantOrderItem_status_idx" ON "RestaurantOrderItem"("status");

-- CreateIndex
CREATE INDEX "RestaurantOrderItemModifier_orderItemId_idx" ON "RestaurantOrderItemModifier"("orderItemId");

-- CreateIndex
CREATE INDEX "RestaurantOrderItemModifier_modifierOptionId_idx" ON "RestaurantOrderItemModifier"("modifierOptionId");

-- CreateIndex
CREATE INDEX "Kot_tenantId_idx" ON "Kot"("tenantId");

-- CreateIndex
CREATE INDEX "Kot_orderId_idx" ON "Kot"("orderId");

-- CreateIndex
CREATE INDEX "Kot_status_idx" ON "Kot"("status");

-- CreateIndex
CREATE INDEX "Kot_station_idx" ON "Kot"("station");

-- CreateIndex
CREATE UNIQUE INDEX "Kot_tenantId_kotNumber_key" ON "Kot"("tenantId", "kotNumber");

-- CreateIndex
CREATE INDEX "RestaurantOrderPayment_orderId_idx" ON "RestaurantOrderPayment"("orderId");

-- CreateIndex
CREATE INDEX "Rider_tenantId_idx" ON "Rider"("tenantId");

-- CreateIndex
CREATE INDEX "Rider_tenantId_status_idx" ON "Rider"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Rider_tenantId_isActive_idx" ON "Rider"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryTracking_orderId_key" ON "DeliveryTracking"("orderId");

-- CreateIndex
CREATE INDEX "DeliveryTracking_riderId_idx" ON "DeliveryTracking"("riderId");

-- CreateIndex
CREATE INDEX "DeliveryTracking_status_idx" ON "DeliveryTracking"("status");

-- CreateIndex
CREATE INDEX "KitchenStation_tenantId_idx" ON "KitchenStation"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "KitchenStation_tenantId_name_key" ON "KitchenStation"("tenantId", "name");

-- CreateIndex
CREATE INDEX "WaiterAssignment_tenantId_idx" ON "WaiterAssignment"("tenantId");

-- CreateIndex
CREATE INDEX "WaiterAssignment_tenantId_isActive_idx" ON "WaiterAssignment"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "HappyHourRule_tenantId_idx" ON "HappyHourRule"("tenantId");

-- CreateIndex
CREATE INDEX "HappyHourRule_tenantId_isActive_idx" ON "HappyHourRule"("tenantId", "isActive");

-- AddForeignKey
ALTER TABLE "RestaurantMenuItem" ADD CONSTRAINT "RestaurantMenuItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierOption" ADD CONSTRAINT "ModifierOption_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemModifier" ADD CONSTRAINT "MenuItemModifier_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "RestaurantMenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemModifier" ADD CONSTRAINT "MenuItemModifier_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "RestaurantMenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_ingredientProductId_fkey" FOREIGN KEY ("ingredientProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "RestaurantTableV2"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrderItem" ADD CONSTRAINT "RestaurantOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrderItem" ADD CONSTRAINT "RestaurantOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrderItemModifier" ADD CONSTRAINT "RestaurantOrderItemModifier_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "RestaurantOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrderItemModifier" ADD CONSTRAINT "RestaurantOrderItemModifier_modifierOptionId_fkey" FOREIGN KEY ("modifierOptionId") REFERENCES "ModifierOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kot" ADD CONSTRAINT "Kot_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrderPayment" ADD CONSTRAINT "RestaurantOrderPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTracking" ADD CONSTRAINT "DeliveryTracking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTracking" ADD CONSTRAINT "DeliveryTracking_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
