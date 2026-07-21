-- CreateEnum
CREATE TYPE "BakeryCategory" AS ENUM ('CAKE', 'CUPCAKE', 'PASTRY', 'BREAD', 'BUN', 'ROLL', 'BISCUIT', 'COOKIE', 'DONUT', 'MUFFIN', 'CROISSANT', 'DANISH', 'PATTY', 'PUFF', 'PIZZA', 'SANDWICH', 'BURGER', 'TART', 'PIE', 'CHEESECAKE', 'DESSERT', 'BROWNIE', 'MACARON', 'SWEETS', 'BARFI', 'LADDU', 'GULAB_JAMUN', 'RASMALAI', 'KHEER', 'CUSTOM_CAKE', 'WEDDING_CAKE', 'BIRTHDAY_CAKE', 'ANNIVERSARY_CAKE', 'BEVERAGE', 'ICE_CREAM', 'OTHER');

-- CreateEnum
CREATE TYPE "BakerySize" AS ENUM ('MINI', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE', 'HALF_KG', 'ONE_KG', 'ONE_HALF_KG', 'TWO_KG', 'THREE_KG', 'FIVE_KG', 'TEN_KG', 'SLICE', 'DOZEN', 'HALF_DOZEN', 'TRAY', 'BOX', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CakeShape" AS ENUM ('ROUND', 'SQUARE', 'RECTANGLE', 'HEART', 'OVAL', 'TIER_2', 'TIER_3', 'TIER_4', 'TIER_5', 'NUMBER', 'LETTER', 'CHARACTER', 'CUSTOM_SHAPE');

-- CreateEnum
CREATE TYPE "CakeFlavor" AS ENUM ('VANILLA', 'CHOCOLATE', 'STRAWBERRY', 'BLACK_FOREST', 'RED_VELVET', 'PINEAPPLE', 'MANGO', 'BUTTERSCOTCH', 'COFFEE', 'CARAMEL', 'BLUEBERRY', 'RASPBERRY', 'LEMON', 'ORANGE', 'BANANA', 'CARROT', 'FRUIT', 'TIRAMISU', 'OREO', 'KITKAT', 'FERRERO_ROCHER', 'NUTELLA', 'CHEESECAKE', 'ICE_CREAM', 'MIXED', 'CUSTOM_FLAVOR');

-- CreateEnum
CREATE TYPE "CreamType" AS ENUM ('BUTTERCREAM', 'WHIPPED_CREAM', 'FRESH_CREAM', 'GANACHE', 'FONDANT', 'CREAM_CHEESE', 'ROYAL_ICING', 'MERINGUE', 'MOUSSE', 'MIRROR_GLAZE', 'OTHER');

-- CreateEnum
CREATE TYPE "BakeryOrderStatus" AS ENUM ('DRAFT', 'QUOTED', 'CONFIRMED', 'DEPOSIT_PAID', 'IN_PRODUCTION', 'BAKING', 'DECORATING', 'QUALITY_CHECK', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'BAKING', 'COOLING', 'DECORATING', 'QUALITY_CHECK', 'COMPLETED', 'FAILED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('SELF_PICKUP', 'HOME_DELIVERY', 'VENUE_DELIVERY', 'COURIER');

-- CreateEnum
CREATE TYPE "FreshnessStatus" AS ENUM ('FRESH', 'DAY_OLD', 'NEAR_EXPIRY', 'EXPIRED', 'DISCARDED');

-- CreateTable
CREATE TABLE "BakeryProductProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "category" "BakeryCategory" NOT NULL,
    "defaultSize" "BakerySize",
    "defaultShape" "CakeShape",
    "defaultFlavor" "CakeFlavor",
    "defaultCreamType" "CreamType",
    "pricePerKg" DOUBLE PRECISION,
    "pricePerPiece" DOUBLE PRECISION,
    "pricePerDozen" DOUBLE PRECISION,
    "pricePerSlice" DOUBLE PRECISION,
    "pricePerBox" DOUBLE PRECISION,
    "pricePerTray" DOUBLE PRECISION,
    "weightGrams" DOUBLE PRECISION,
    "servingSize" INTEGER,
    "numberOfSlices" INTEGER,
    "isCustomizable" BOOLEAN NOT NULL DEFAULT false,
    "isCakeCustomizable" BOOLEAN NOT NULL DEFAULT false,
    "allowsMessageOnCake" BOOLEAN NOT NULL DEFAULT true,
    "allowsPhotoOnCake" BOOLEAN NOT NULL DEFAULT false,
    "allowsCustomShape" BOOLEAN NOT NULL DEFAULT false,
    "allowsFlavorChoice" BOOLEAN NOT NULL DEFAULT false,
    "allowsSizeChoice" BOOLEAN NOT NULL DEFAULT false,
    "prepTimeHours" DOUBLE PRECISION,
    "advanceOrderHours" INTEGER DEFAULT 24,
    "minOrderQty" INTEGER NOT NULL DEFAULT 1,
    "maxOrderQty" INTEGER,
    "shelfLifeHours" INTEGER,
    "shelfLifeDays" INTEGER,
    "requiresRefrigeration" BOOLEAN NOT NULL DEFAULT false,
    "storageTempMin" DOUBLE PRECISION,
    "storageTempMax" DOUBLE PRECISION,
    "bestConsumedWithin" TEXT,
    "ingredients" JSONB,
    "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "containsEgg" BOOLEAN NOT NULL DEFAULT true,
    "containsNuts" BOOLEAN NOT NULL DEFAULT false,
    "containsGluten" BOOLEAN NOT NULL DEFAULT true,
    "containsDairy" BOOLEAN NOT NULL DEFAULT true,
    "isEggless" BOOLEAN NOT NULL DEFAULT false,
    "isVegan" BOOLEAN NOT NULL DEFAULT false,
    "isSugarFree" BOOLEAN NOT NULL DEFAULT false,
    "isHalal" BOOLEAN NOT NULL DEFAULT true,
    "dietaryBadges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nutritionInfo" JSONB,
    "caloriesPerServing" INTEGER,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "variationImages" JSONB,
    "descriptionLong" TEXT,
    "ingredientList" TEXT,
    "servingSuggestions" TEXT,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "isSeasonalItem" BOOLEAN NOT NULL DEFAULT false,
    "seasonName" TEXT,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BakeryProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BakeryCakeOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "productId" TEXT,
    "productName" TEXT,
    "category" "BakeryCategory" NOT NULL DEFAULT 'CUSTOM_CAKE',
    "size" "BakerySize" NOT NULL,
    "customWeightKg" DOUBLE PRECISION,
    "shape" "CakeShape" NOT NULL DEFAULT 'ROUND',
    "customShapeDesc" TEXT,
    "flavor" "CakeFlavor" NOT NULL,
    "customFlavorDesc" TEXT,
    "creamType" "CreamType",
    "numberOrLetter" TEXT,
    "numberOfTiers" INTEGER NOT NULL DEFAULT 1,
    "tierDetails" JSONB,
    "messageOnCake" TEXT,
    "messageColor" TEXT,
    "hasPhotoOnCake" BOOLEAN NOT NULL DEFAULT false,
    "photoUrl" TEXT,
    "hasEdibleImage" BOOLEAN NOT NULL DEFAULT false,
    "designReferenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "designInstructions" TEXT,
    "colorTheme" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "decorativeItems" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "candlesRequired" INTEGER,
    "candleType" TEXT,
    "cakeStand" BOOLEAN NOT NULL DEFAULT false,
    "cakeKnife" BOOLEAN NOT NULL DEFAULT false,
    "occasion" TEXT NOT NULL,
    "celebrantName" TEXT,
    "celebrantAge" INTEGER,
    "eventDate" TIMESTAMP(3),
    "eventTime" TEXT,
    "eventVenue" TEXT,
    "isEggless" BOOLEAN NOT NULL DEFAULT false,
    "isSugarFree" BOOLEAN NOT NULL DEFAULT false,
    "isVegan" BOOLEAN NOT NULL DEFAULT false,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dietaryNotes" TEXT,
    "deliveryType" "DeliveryType" NOT NULL DEFAULT 'SELF_PICKUP',
    "neededBy" TIMESTAMP(3) NOT NULL,
    "deliveryDate" TIMESTAMP(3),
    "deliveryTime" TEXT,
    "deliveryAddress" TEXT,
    "deliveryLandmark" TEXT,
    "deliveryCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryPersonId" TEXT,
    "status" "BakeryOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "productionStatus" "ProductionStatus",
    "assignedBakerId" TEXT,
    "assignedDecoratorId" TEXT,
    "basePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customizationCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "photoCakeCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advanceRequired" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advancePaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "confirmedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "customerRating" INTEGER,
    "customerFeedback" TEXT,
    "finalPhotoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialInstructions" TEXT,
    "internalNotes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BakeryCakeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BakeryProductionPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "planNumber" TEXT NOT NULL,
    "planDate" TIMESTAMP(3) NOT NULL,
    "shift" TEXT,
    "headBakerId" TEXT,
    "status" "ProductionStatus" NOT NULL DEFAULT 'PLANNED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "completedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BakeryProductionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BakeryProductionItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "category" "BakeryCategory",
    "cakeOrderId" TEXT,
    "plannedQty" INTEGER NOT NULL,
    "producedQty" INTEGER NOT NULL DEFAULT 0,
    "failedQty" INTEGER NOT NULL DEFAULT 0,
    "bakerId" TEXT,
    "bakerName" TEXT,
    "status" "ProductionStatus" NOT NULL DEFAULT 'PLANNED',
    "batchNumber" TEXT,
    "ovenNumber" TEXT,
    "bakingStartTime" TIMESTAMP(3),
    "bakingEndTime" TIMESTAMP(3),
    "bakingTempC" DOUBLE PRECISION,
    "bakingDurationMin" INTEGER,
    "qualityGrade" TEXT,
    "qualityCheckBy" TEXT,
    "qualityNotes" TEXT,
    "ingredientsUsed" JSONB,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BakeryProductionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BakeryIngredient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT,
    "brand" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxStock" DOUBLE PRECISION,
    "reorderLevel" DOUBLE PRECISION,
    "costPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPurchaseDate" TIMESTAMP(3),
    "lastPurchasePrice" DOUBLE PRECISION,
    "lastVendorName" TEXT,
    "shelfLifeDays" INTEGER,
    "storageMethod" TEXT,
    "requiresRefrigeration" BOOLEAN NOT NULL DEFAULT false,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "isOrganic" BOOLEAN NOT NULL DEFAULT false,
    "isImported" BOOLEAN NOT NULL DEFAULT false,
    "countryOfOrigin" TEXT,
    "supplierName" TEXT,
    "supplierPhone" TEXT,
    "totalPurchased" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalConsumed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWasted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BakeryIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BakeryIngredientTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "costPerUnit" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "productionItemId" TEXT,
    "cakeOrderId" TEXT,
    "batchNumber" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "performedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BakeryIngredientTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BakeryFreshnessLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "batchNumber" TEXT,
    "productionDate" TIMESTAMP(3) NOT NULL,
    "bestBefore" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "initialQty" INTEGER NOT NULL,
    "currentQty" INTEGER NOT NULL,
    "soldQty" INTEGER NOT NULL DEFAULT 0,
    "wastedQty" INTEGER NOT NULL DEFAULT 0,
    "discountedQty" INTEGER NOT NULL DEFAULT 0,
    "status" "FreshnessStatus" NOT NULL DEFAULT 'FRESH',
    "discardedAt" TIMESTAMP(3),
    "discardReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BakeryFreshnessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BakeryBulkOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "organizationName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "orderType" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventTime" TEXT,
    "venue" TEXT,
    "totalGuests" INTEGER,
    "totalItems" INTEGER NOT NULL,
    "items" JSONB NOT NULL,
    "quotedPrice" DOUBLE PRECISION NOT NULL,
    "finalPrice" DOUBLE PRECISION,
    "advancePaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'QUOTED',
    "status" "BakeryOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "requiresDelivery" BOOLEAN NOT NULL DEFAULT true,
    "deliveryAddress" TEXT,
    "requiresSetup" BOOLEAN NOT NULL DEFAULT false,
    "setupTime" TEXT,
    "specialInstructions" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BakeryBulkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BakeryProductProfile_productId_key" ON "BakeryProductProfile"("productId");

-- CreateIndex
CREATE INDEX "BakeryProductProfile_tenantId_idx" ON "BakeryProductProfile"("tenantId");

-- CreateIndex
CREATE INDEX "BakeryProductProfile_tenantId_category_idx" ON "BakeryProductProfile"("tenantId", "category");

-- CreateIndex
CREATE INDEX "BakeryCakeOrder_tenantId_idx" ON "BakeryCakeOrder"("tenantId");

-- CreateIndex
CREATE INDEX "BakeryCakeOrder_tenantId_status_idx" ON "BakeryCakeOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "BakeryCakeOrder_customerId_idx" ON "BakeryCakeOrder"("customerId");

-- CreateIndex
CREATE INDEX "BakeryCakeOrder_neededBy_idx" ON "BakeryCakeOrder"("neededBy");

-- CreateIndex
CREATE INDEX "BakeryCakeOrder_eventDate_idx" ON "BakeryCakeOrder"("eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "BakeryCakeOrder_tenantId_orderNumber_key" ON "BakeryCakeOrder"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "BakeryProductionPlan_tenantId_idx" ON "BakeryProductionPlan"("tenantId");

-- CreateIndex
CREATE INDEX "BakeryProductionPlan_tenantId_planDate_idx" ON "BakeryProductionPlan"("tenantId", "planDate");

-- CreateIndex
CREATE UNIQUE INDEX "BakeryProductionPlan_tenantId_planNumber_key" ON "BakeryProductionPlan"("tenantId", "planNumber");

-- CreateIndex
CREATE INDEX "BakeryProductionItem_planId_idx" ON "BakeryProductionItem"("planId");

-- CreateIndex
CREATE INDEX "BakeryProductionItem_cakeOrderId_idx" ON "BakeryProductionItem"("cakeOrderId");

-- CreateIndex
CREATE INDEX "BakeryIngredient_tenantId_idx" ON "BakeryIngredient"("tenantId");

-- CreateIndex
CREATE INDEX "BakeryIngredient_tenantId_category_idx" ON "BakeryIngredient"("tenantId", "category");

-- CreateIndex
CREATE INDEX "BakeryIngredient_tenantId_isActive_idx" ON "BakeryIngredient"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BakeryIngredient_tenantId_name_key" ON "BakeryIngredient"("tenantId", "name");

-- CreateIndex
CREATE INDEX "BakeryIngredientTransaction_tenantId_idx" ON "BakeryIngredientTransaction"("tenantId");

-- CreateIndex
CREATE INDEX "BakeryIngredientTransaction_ingredientId_idx" ON "BakeryIngredientTransaction"("ingredientId");

-- CreateIndex
CREATE INDEX "BakeryFreshnessLog_tenantId_idx" ON "BakeryFreshnessLog"("tenantId");

-- CreateIndex
CREATE INDEX "BakeryFreshnessLog_tenantId_status_idx" ON "BakeryFreshnessLog"("tenantId", "status");

-- CreateIndex
CREATE INDEX "BakeryFreshnessLog_bestBefore_idx" ON "BakeryFreshnessLog"("bestBefore");

-- CreateIndex
CREATE INDEX "BakeryFreshnessLog_productId_idx" ON "BakeryFreshnessLog"("productId");

-- CreateIndex
CREATE INDEX "BakeryBulkOrder_tenantId_idx" ON "BakeryBulkOrder"("tenantId");

-- CreateIndex
CREATE INDEX "BakeryBulkOrder_eventDate_idx" ON "BakeryBulkOrder"("eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "BakeryBulkOrder_tenantId_orderNumber_key" ON "BakeryBulkOrder"("tenantId", "orderNumber");

-- AddForeignKey
ALTER TABLE "BakeryProductionItem" ADD CONSTRAINT "BakeryProductionItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BakeryProductionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BakeryIngredientTransaction" ADD CONSTRAINT "BakeryIngredientTransaction_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "BakeryIngredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
