-- CreateEnum
CREATE TYPE "SportsCategoryType" AS ENUM ('CRICKET_BAT', 'CRICKET_BALL', 'CRICKET_HELMET', 'CRICKET_PADS', 'CRICKET_GLOVES', 'CRICKET_KIT_BAG', 'CRICKET_STUMPS', 'CRICKET_JERSEY', 'CRICKET_SHOES', 'CRICKET_GUARD', 'FOOTBALL', 'FOOTBALL_JERSEY', 'FOOTBALL_SHOES', 'FOOTBALL_KIT', 'SHIN_GUARDS', 'GOALKEEPER_GLOVES', 'GOAL_POST', 'BASKETBALL', 'BASKETBALL_JERSEY', 'BASKETBALL_SHOES', 'BASKETBALL_HOOP', 'VOLLEYBALL', 'VOLLEYBALL_NET', 'NETBALL', 'BADMINTON_RACKET', 'BADMINTON_SHUTTLECOCK', 'TENNIS_RACKET', 'TENNIS_BALL', 'TABLE_TENNIS_BAT', 'TABLE_TENNIS_BALL', 'SQUASH_RACKET', 'DUMBBELL', 'BARBELL', 'WEIGHT_PLATE', 'KETTLEBELL', 'BENCH_PRESS', 'TREADMILL', 'EXERCISE_BIKE', 'ELLIPTICAL', 'ROWING_MACHINE', 'YOGA_MAT', 'RESISTANCE_BAND', 'SKIPPING_ROPE', 'BOXING_GLOVES', 'PUNCHING_BAG', 'PROTEIN_SUPPLEMENT', 'GYM_ACCESSORY', 'SWIMMING_GOGGLES', 'SWIMSUIT', 'SWIMMING_CAP', 'CAMPING_TENT', 'SLEEPING_BAG', 'HIKING_BAG', 'CYCLING_HELMET', 'BICYCLE', 'TROPHY', 'MEDAL', 'WHISTLE', 'STOPWATCH', 'UMPIRE_GEAR', 'OTHER');

-- CreateEnum
CREATE TYPE "SportsBrandTier" AS ENUM ('PREMIUM', 'MID_RANGE', 'ECONOMY', 'LOCAL');

-- CreateEnum
CREATE TYPE "SportsAgeGroup" AS ENUM ('KIDS', 'YOUTH', 'ADULT', 'SENIOR', 'UNIVERSAL');

-- CreateEnum
CREATE TYPE "SportsGenderTarget" AS ENUM ('MALE', 'FEMALE', 'UNISEX', 'KIDS');

-- CreateEnum
CREATE TYPE "TeamOrderStatus" AS ENUM ('DRAFT', 'QUOTED', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CosmeticsCategoryType" AS ENUM ('FOUNDATION', 'CONCEALER', 'POWDER', 'BLUSH', 'BRONZER', 'HIGHLIGHTER', 'EYESHADOW', 'EYELINER', 'MASCARA', 'EYEBROW', 'LIPSTICK', 'LIP_GLOSS', 'LIP_LINER', 'LIP_BALM', 'MAKEUP_PALETTE', 'MAKEUP_BRUSH', 'MAKEUP_REMOVER', 'FACE_WASH', 'CLEANSER', 'TONER', 'SERUM', 'MOISTURIZER', 'DAY_CREAM', 'NIGHT_CREAM', 'EYE_CREAM', 'FACE_MASK', 'SHEET_MASK', 'EXFOLIATOR', 'SUNSCREEN', 'BODY_LOTION', 'BODY_WASH', 'BODY_SCRUB', 'BODY_OIL', 'HAND_CREAM', 'FOOT_CREAM', 'PERFUME', 'EAU_DE_TOILETTE', 'BODY_MIST', 'DEODORANT', 'ATTAR', 'FRAGRANCE_GIFT_SET', 'SHAMPOO', 'CONDITIONER', 'HAIR_OIL', 'HAIR_MASK', 'HAIR_SERUM', 'HAIR_COLOR', 'HAIR_STYLING', 'NAIL_POLISH', 'NAIL_REMOVER', 'NAIL_ART', 'NAIL_TOOLS', 'SHAVING_CREAM', 'AFTER_SHAVE', 'BEARD_OIL', 'BEARD_TRIMMER', 'HAIR_DRYER', 'STRAIGHTENER', 'CURLING_IRON', 'BEAUTY_TOOL', 'SOAP', 'BATH_BOMB', 'GIFT_SET', 'OTHER');

-- CreateEnum
CREATE TYPE "CosmeticsSkinType" AS ENUM ('DRY', 'OILY', 'COMBINATION', 'NORMAL', 'SENSITIVE', 'ACNE_PRONE', 'MATURE', 'ALL_TYPES');

-- CreateEnum
CREATE TYPE "CosmeticsSkinTone" AS ENUM ('FAIR', 'LIGHT', 'MEDIUM', 'TAN', 'DEEP', 'DARK', 'UNIVERSAL');

-- CreateEnum
CREATE TYPE "CosmeticsFinish" AS ENUM ('MATTE', 'DEWY', 'SATIN', 'GLOSSY', 'SHIMMER', 'NATURAL', 'METALLIC');

-- CreateEnum
CREATE TYPE "FloristCategoryType" AS ENUM ('ROSE_RED', 'ROSE_WHITE', 'ROSE_PINK', 'ROSE_YELLOW', 'ROSE_MIXED', 'TULIP', 'LILY', 'ORCHID', 'SUNFLOWER', 'CARNATION', 'GERBERA', 'CHRYSANTHEMUM', 'DAISY', 'JASMINE', 'MARIGOLD', 'IRIS', 'HYDRANGEA', 'PEONY', 'ANTHURIUM', 'BIRD_OF_PARADISE', 'BABY_BREATH', 'GREENERY_FILLER', 'BOUQUET_BIRTHDAY', 'BOUQUET_ANNIVERSARY', 'BOUQUET_WEDDING', 'BOUQUET_ROMANCE', 'BOUQUET_CONDOLENCE', 'BOUQUET_GET_WELL', 'BOUQUET_CONGRATULATIONS', 'BOUQUET_MIXED', 'BASKET_ARRANGEMENT', 'VASE_ARRANGEMENT', 'BOX_ARRANGEMENT', 'TABLE_CENTREPIECE', 'STANDING_ARRANGEMENT', 'WEDDING_GARLAND', 'BRIDAL_BOUQUET', 'BOUTONNIERE', 'CAR_DECORATION', 'STAGE_DECORATION', 'MEHNDI_DECORATION', 'FUNERAL_WREATH', 'SYMPATHY_ARRANGEMENT', 'POTTED_PLANT_INDOOR', 'POTTED_PLANT_OUTDOOR', 'SUCCULENT', 'BONSAI', 'AIR_PLANT', 'CHOCOLATE_BOX', 'TEDDY_BEAR', 'BALLOON', 'GREETING_CARD', 'GIFT_ITEM', 'VASE_EMPTY', 'RIBBON', 'WRAPPING_PAPER', 'FLORAL_FOAM', 'OTHER');

-- CreateEnum
CREATE TYPE "FloristFreshnessGrade" AS ENUM ('A_PREMIUM', 'B_STANDARD', 'C_ECONOMY', 'IMPORTED', 'LOCAL');

-- CreateEnum
CREATE TYPE "FloristOrderType" AS ENUM ('WALK_IN', 'DELIVERY', 'EVENT', 'WEDDING', 'SUBSCRIPTION', 'CORPORATE');

-- CreateEnum
CREATE TYPE "FloristOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'IN_PREPARATION', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FloristDeliveryTimeSlot" AS ENUM ('MORNING_9_12', 'AFTERNOON_12_3', 'EVENING_3_6', 'NIGHT_6_9', 'URGENT', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "ShoeCategoryType" AS ENUM ('MENS_SNEAKERS', 'MENS_FORMAL', 'MENS_LOAFERS', 'MENS_BOOTS', 'MENS_SANDALS', 'MENS_SLIPPERS', 'MENS_SPORTS', 'MENS_KHUSSA', 'MENS_PESHAWARI', 'WOMENS_HEELS', 'WOMENS_FLATS', 'WOMENS_SNEAKERS', 'WOMENS_BOOTS', 'WOMENS_SANDALS', 'WOMENS_SLIPPERS', 'WOMENS_KHUSSA', 'WOMENS_WEDGES', 'KIDS_SNEAKERS', 'KIDS_SCHOOL', 'KIDS_SPORTS', 'KIDS_CASUAL', 'KIDS_SANDALS', 'BABY_SHOES', 'RUNNING_SHOES', 'BASKETBALL_SHOES', 'FOOTBALL_STUDS', 'CRICKET_SPIKES', 'TRAINING_SHOES', 'RAIN_BOOTS', 'SAFETY_SHOES', 'WORK_BOOTS', 'HIKING_BOOTS', 'BRIDAL_SHOES', 'SHOE_LACE', 'SHOE_POLISH', 'SHOE_INSOLE', 'SHOE_HORN', 'SHOE_CLEANER', 'SHOE_CARE_KIT', 'SOCK', 'OTHER');

-- CreateEnum
CREATE TYPE "ShoeSizeSystem" AS ENUM ('UK', 'US', 'EU', 'CM', 'KIDS');

-- CreateEnum
CREATE TYPE "ShoeWidth" AS ENUM ('NARROW', 'REGULAR', 'WIDE', 'EXTRA_WIDE');

-- CreateEnum
CREATE TYPE "ShoeGender" AS ENUM ('MEN', 'WOMEN', 'UNISEX', 'BOYS', 'GIRLS', 'BABY');

-- CreateTable
CREATE TABLE "SportsBrand" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "countryOfOrigin" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "brandTier" "SportsBrandTier" NOT NULL DEFAULT 'MID_RANGE',
    "authorizedDealer" BOOLEAN NOT NULL DEFAULT false,
    "dealerCode" TEXT,
    "supportPhone" TEXT,
    "supportEmail" TEXT,
    "warrantyPolicy" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalProducts" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportsBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportsProductProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "brandId" TEXT,
    "categoryType" "SportsCategoryType",
    "sport" TEXT,
    "ageGroup" "SportsAgeGroup" NOT NULL DEFAULT 'ADULT',
    "genderTarget" "SportsGenderTarget" NOT NULL DEFAULT 'UNISEX',
    "batWood" TEXT,
    "batWeightGrams" DOUBLE PRECISION,
    "batGrade" TEXT,
    "batSize" TEXT,
    "handleType" TEXT,
    "ballType" TEXT,
    "ballWeight" TEXT,
    "ballCircumference" TEXT,
    "ballMaterial" TEXT,
    "size" TEXT,
    "material" TEXT,
    "fit" TEXT,
    "hasCustomization" BOOLEAN NOT NULL DEFAULT false,
    "shoeSize" TEXT,
    "soleType" TEXT,
    "studType" TEXT,
    "weight" TEXT,
    "maxUserWeight" TEXT,
    "dimensions" TEXT,
    "powerRating" TEXT,
    "motorType" TEXT,
    "foldable" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "colorHex" TEXT,
    "material2" TEXT,
    "countryOfMake" TEXT,
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isTeamOrderable" BOOLEAN NOT NULL DEFAULT false,
    "minTeamOrder" INTEGER,
    "bulkDiscountPct" DOUBLE PRECISION,
    "customizationOptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "warrantyMonths" INTEGER NOT NULL DEFAULT 0,
    "warrantyType" TEXT,
    "mrp" DOUBLE PRECISION,
    "costPrice" DOUBLE PRECISION,
    "wholesalePrice" DOUBLE PRECISION,
    "retailPrice" DOUBLE PRECISION,
    "teamPrice" DOUBLE PRECISION,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "isProfessional" BOOLEAN NOT NULL DEFAULT false,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "careInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportsProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportsTeamOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "organization" TEXT,
    "city" TEXT,
    "address" TEXT,
    "status" "TeamOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "items" JSONB NOT NULL,
    "totalQuantity" INTEGER NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hasCustomJerseys" BOOLEAN NOT NULL DEFAULT false,
    "customizationDetails" TEXT,
    "playerNames" JSONB,
    "playerNumbers" JSONB,
    "teamLogoUrl" TEXT,
    "advancePaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "quotedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "expectedDeliveryDate" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "quotationUrl" TEXT,
    "invoiceUrl" TEXT,
    "poNumber" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "handledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportsTeamOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportsRepairService" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemBrand" TEXT,
    "itemDescription" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimatedReadyAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advancePaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "repairType" TEXT,
    "workDone" TEXT,
    "partsUsed" JSONB,
    "photosBeforeUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photosAfterUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "receiptSignatureUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportsRepairService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CosmeticsBrand" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "countryOfOrigin" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isCrueltyFree" BOOLEAN NOT NULL DEFAULT false,
    "isVegan" BOOLEAN NOT NULL DEFAULT false,
    "isOrganic" BOOLEAN NOT NULL DEFAULT false,
    "isHalalCertified" BOOLEAN NOT NULL DEFAULT false,
    "isDermatologistTested" BOOLEAN NOT NULL DEFAULT false,
    "authorizedDealer" BOOLEAN NOT NULL DEFAULT false,
    "dealerCode" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalProducts" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CosmeticsBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CosmeticsProductProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "brandId" TEXT,
    "categoryType" "CosmeticsCategoryType",
    "shadeName" TEXT,
    "shadeCode" TEXT,
    "shadeHex" TEXT,
    "finish" "CosmeticsFinish",
    "skinType" "CosmeticsSkinType"[] DEFAULT ARRAY[]::"CosmeticsSkinType"[],
    "skinTone" "CosmeticsSkinTone"[] DEFAULT ARRAY[]::"CosmeticsSkinTone"[],
    "skinConcerns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sizeMl" DOUBLE PRECISION,
    "sizeGrams" DOUBLE PRECISION,
    "sizeDisplay" TEXT,
    "keyIngredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fullIngredients" TEXT,
    "spfRating" TEXT,
    "isCrueltyFree" BOOLEAN NOT NULL DEFAULT false,
    "isVegan" BOOLEAN NOT NULL DEFAULT false,
    "isOrganic" BOOLEAN NOT NULL DEFAULT false,
    "isHypoallergenic" BOOLEAN NOT NULL DEFAULT false,
    "isFragranceFree" BOOLEAN NOT NULL DEFAULT false,
    "isSulfateFree" BOOLEAN NOT NULL DEFAULT false,
    "isParabenFree" BOOLEAN NOT NULL DEFAULT false,
    "isNoncomedogenic" BOOLEAN NOT NULL DEFAULT false,
    "isHalalCertified" BOOLEAN NOT NULL DEFAULT false,
    "isDermatologistTested" BOOLEAN NOT NULL DEFAULT false,
    "fragranceFamily" TEXT,
    "topNotes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "middleNotes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "baseNotes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "longevityHours" TEXT,
    "sillage" TEXT,
    "season" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "occasion" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "howToUse" TEXT,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "warnings" TEXT,
    "requiresBatchTracking" BOOLEAN NOT NULL DEFAULT true,
    "shelfLifeMonths" INTEGER,
    "mrp" DOUBLE PRECISION,
    "costPrice" DOUBLE PRECISION,
    "wholesalePrice" DOUBLE PRECISION,
    "retailPrice" DOUBLE PRECISION,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "isLimitedEdition" BOOLEAN NOT NULL DEFAULT false,
    "isViral" BOOLEAN NOT NULL DEFAULT false,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CosmeticsProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CosmeticsBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "manufactureDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL,
    "currentStock" INTEGER NOT NULL,
    "costPrice" DOUBLE PRECISION,
    "supplierRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CosmeticsBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CosmeticsGiftBundle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "occasion" TEXT,
    "items" JSONB NOT NULL,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "bundlePrice" DOUBLE PRECISION NOT NULL,
    "savings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hasGiftWrap" BOOLEAN NOT NULL DEFAULT false,
    "giftWrapCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "includesGreetingCard" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CosmeticsGiftBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CosmeticsLoyaltyMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberCode" TEXT NOT NULL,
    "customerId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "skinType" "CosmeticsSkinType",
    "skinConcerns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "favoriteFragranceFamilies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tier" TEXT NOT NULL DEFAULT 'BRONZE',
    "pointsBalance" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPurchases" INTEGER NOT NULL DEFAULT 0,
    "lastPurchaseAt" TIMESTAMP(3),
    "birthdayOfferSent" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CosmeticsLoyaltyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FloristProductProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "categoryType" "FloristCategoryType",
    "freshnessGrade" "FloristFreshnessGrade" NOT NULL DEFAULT 'A_PREMIUM',
    "flowerType" TEXT,
    "color" TEXT,
    "colorHex" TEXT,
    "stemLengthCm" DOUBLE PRECISION,
    "isImported" BOOLEAN NOT NULL DEFAULT false,
    "origin" TEXT,
    "season" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "arrivalDate" TIMESTAMP(3),
    "freshUntil" TIMESTAMP(3),
    "daysToWither" INTEGER,
    "isPreArranged" BOOLEAN NOT NULL DEFAULT false,
    "bouquetSize" TEXT,
    "stemCount" INTEGER,
    "composition" JSONB,
    "wrapType" TEXT,
    "ribbonColor" TEXT,
    "hasVase" BOOLEAN NOT NULL DEFAULT false,
    "occasions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "meaning" TEXT,
    "careInstructions" TEXT,
    "isCustomizable" BOOLEAN NOT NULL DEFAULT false,
    "customizationOptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minLeadTimeHours" INTEGER,
    "mrp" DOUBLE PRECISION,
    "costPrice" DOUBLE PRECISION,
    "wholesalePrice" DOUBLE PRECISION,
    "retailPrice" DOUBLE PRECISION,
    "weddingPrice" DOUBLE PRECISION,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isSeasonalSpecial" BOOLEAN NOT NULL DEFAULT false,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FloristProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FloristOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "orderType" "FloristOrderType" NOT NULL DEFAULT 'WALK_IN',
    "status" "FloristOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "senderName" TEXT,
    "recipientName" TEXT,
    "recipientPhone" TEXT,
    "deliveryAddress" TEXT,
    "city" TEXT,
    "area" TEXT,
    "landmark" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "messageCard" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "items" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wrappingCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advancePaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "deliveryTimeSlot" "FloristDeliveryTimeSlot",
    "scheduledDeliveryDate" TIMESTAMP(3),
    "scheduledDeliveryTime" TEXT,
    "actualDeliveryTime" TIMESTAMP(3),
    "deliveredBy" TEXT,
    "deliveryPhotoUrl" TEXT,
    "deliveredToName" TEXT,
    "eventDate" TIMESTAMP(3),
    "eventName" TEXT,
    "eventVenue" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringFrequency" TEXT,
    "preparedBy" TEXT,
    "preparedAt" TIMESTAMP(3),
    "qcCheckedBy" TEXT,
    "notes" TEXT,
    "specialInstructions" TEXT,
    "internalNotes" TEXT,
    "handledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FloristOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FloristWeddingContract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "brideName" TEXT NOT NULL,
    "groomName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "weddingDate" TIMESTAMP(3) NOT NULL,
    "ceremonyVenue" TEXT,
    "receptionVenue" TEXT,
    "city" TEXT,
    "includesBridalBouquet" BOOLEAN NOT NULL DEFAULT true,
    "includesBridesmaidBouquets" BOOLEAN NOT NULL DEFAULT false,
    "bridesmaidCount" INTEGER,
    "includesBoutonnieres" BOOLEAN NOT NULL DEFAULT false,
    "boutonniereCount" INTEGER,
    "includesGarlands" BOOLEAN NOT NULL DEFAULT true,
    "garlandCount" INTEGER,
    "includesCarDecoration" BOOLEAN NOT NULL DEFAULT false,
    "includesStageDecoration" BOOLEAN NOT NULL DEFAULT false,
    "includesMehndiSetup" BOOLEAN NOT NULL DEFAULT false,
    "includesTableCentrepieces" BOOLEAN NOT NULL DEFAULT false,
    "centrepieceCount" INTEGER,
    "colorTheme" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "primaryFlowers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "styleInspiration" TEXT,
    "moodBoardUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quotedAmount" DOUBLE PRECISION NOT NULL,
    "advanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'QUOTED',
    "quotedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "siteVisitDate" TIMESTAMP(3),
    "setupStartTime" TIMESTAMP(3),
    "contractUrl" TEXT,
    "quotationUrl" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "handledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FloristWeddingContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FloristSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "bouquetType" TEXT NOT NULL,
    "pricePerDelivery" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextDeliveryDate" TIMESTAMP(3),
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "completedDeliveries" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "preferences" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FloristSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoeBrand" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "countryOfOrigin" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isSportsBrand" BOOLEAN NOT NULL DEFAULT false,
    "isLocal" BOOLEAN NOT NULL DEFAULT false,
    "authorizedDealer" BOOLEAN NOT NULL DEFAULT false,
    "dealerCode" TEXT,
    "warrantyPolicy" TEXT,
    "returnPolicy" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalProducts" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoeBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoeProductProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "brandId" TEXT,
    "categoryType" "ShoeCategoryType",
    "gender" "ShoeGender" NOT NULL DEFAULT 'UNISEX',
    "ageGroup" TEXT,
    "modelName" TEXT,
    "modelCode" TEXT,
    "collection" TEXT,
    "season" TEXT,
    "upperMaterial" TEXT,
    "soleMaterial" TEXT,
    "innerMaterial" TEXT,
    "liningMaterial" TEXT,
    "colorName" TEXT,
    "colorHex" TEXT,
    "patternType" TEXT,
    "closureType" TEXT,
    "toeShape" TEXT,
    "heelHeight" TEXT,
    "heelType" TEXT,
    "soleType" TEXT,
    "sizeSystem" "ShoeSizeSystem" NOT NULL DEFAULT 'UK',
    "availableSizes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "width" "ShoeWidth" NOT NULL DEFAULT 'REGULAR',
    "runsLarge" BOOLEAN NOT NULL DEFAULT false,
    "runsSmall" BOOLEAN NOT NULL DEFAULT false,
    "sizingNotes" TEXT,
    "isWaterproof" BOOLEAN NOT NULL DEFAULT false,
    "isBreathable" BOOLEAN NOT NULL DEFAULT false,
    "hasAirCushion" BOOLEAN NOT NULL DEFAULT false,
    "hasArchSupport" BOOLEAN NOT NULL DEFAULT false,
    "isOrthopedic" BOOLEAN NOT NULL DEFAULT false,
    "isVegan" BOOLEAN NOT NULL DEFAULT false,
    "isHandmade" BOOLEAN NOT NULL DEFAULT false,
    "sport" TEXT,
    "playingSurface" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "careInstructions" TEXT,
    "cleaningRecommendation" TEXT,
    "warrantyMonths" INTEGER NOT NULL DEFAULT 0,
    "warrantyDetails" TEXT,
    "includesBox" BOOLEAN NOT NULL DEFAULT true,
    "includesDustBag" BOOLEAN NOT NULL DEFAULT false,
    "includesExtraLaces" BOOLEAN NOT NULL DEFAULT false,
    "boxColor" TEXT,
    "mrp" DOUBLE PRECISION,
    "costPrice" DOUBLE PRECISION,
    "wholesalePrice" DOUBLE PRECISION,
    "retailPrice" DOUBLE PRECISION,
    "memberPrice" DOUBLE PRECISION,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "isBridal" BOOLEAN NOT NULL DEFAULT false,
    "isEidSpecial" BOOLEAN NOT NULL DEFAULT false,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoeProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoeSizeVariant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "sizeSystem" "ShoeSizeSystem" NOT NULL DEFAULT 'UK',
    "width" "ShoeWidth" NOT NULL DEFAULT 'REGULAR',
    "sku" TEXT,
    "barcode" TEXT,
    "boxNumber" TEXT,
    "shelfLocation" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "lowStockAlert" INTEGER NOT NULL DEFAULT 1,
    "priceOverride" DOUBLE PRECISION,
    "costOverride" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoeSizeVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoeSizeChart" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" TEXT,
    "gender" "ShoeGender" NOT NULL DEFAULT 'UNISEX',
    "categoryType" "ShoeCategoryType",
    "mappings" JSONB NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoeSizeChart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoeTryOnRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "requestedSizes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "colorPreference" TEXT,
    "gender" "ShoeGender",
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "purchasedSize" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoeTryOnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoeExchange" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "exchangeNumber" TEXT NOT NULL,
    "originalSaleId" TEXT,
    "originalInvoice" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "originalSize" TEXT NOT NULL,
    "newSize" TEXT NOT NULL,
    "colorChanged" BOOLEAN NOT NULL DEFAULT false,
    "originalColor" TEXT,
    "newColor" TEXT,
    "reason" TEXT NOT NULL,
    "reasonCategory" TEXT,
    "priceDifference" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refundIssued" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "additionalCharged" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "handledById" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoeExchange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SportsBrand_tenantId_idx" ON "SportsBrand"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SportsBrand_tenantId_name_key" ON "SportsBrand"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SportsProductProfile_productId_key" ON "SportsProductProfile"("productId");

-- CreateIndex
CREATE INDEX "SportsProductProfile_tenantId_idx" ON "SportsProductProfile"("tenantId");

-- CreateIndex
CREATE INDEX "SportsProductProfile_tenantId_categoryType_idx" ON "SportsProductProfile"("tenantId", "categoryType");

-- CreateIndex
CREATE INDEX "SportsProductProfile_brandId_idx" ON "SportsProductProfile"("brandId");

-- CreateIndex
CREATE INDEX "SportsTeamOrder_tenantId_idx" ON "SportsTeamOrder"("tenantId");

-- CreateIndex
CREATE INDEX "SportsTeamOrder_tenantId_status_idx" ON "SportsTeamOrder"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SportsTeamOrder_tenantId_orderNumber_key" ON "SportsTeamOrder"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "SportsRepairService_tenantId_idx" ON "SportsRepairService"("tenantId");

-- CreateIndex
CREATE INDEX "SportsRepairService_tenantId_status_idx" ON "SportsRepairService"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SportsRepairService_tenantId_serviceNumber_key" ON "SportsRepairService"("tenantId", "serviceNumber");

-- CreateIndex
CREATE INDEX "CosmeticsBrand_tenantId_idx" ON "CosmeticsBrand"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CosmeticsBrand_tenantId_name_key" ON "CosmeticsBrand"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CosmeticsProductProfile_productId_key" ON "CosmeticsProductProfile"("productId");

-- CreateIndex
CREATE INDEX "CosmeticsProductProfile_tenantId_idx" ON "CosmeticsProductProfile"("tenantId");

-- CreateIndex
CREATE INDEX "CosmeticsProductProfile_tenantId_categoryType_idx" ON "CosmeticsProductProfile"("tenantId", "categoryType");

-- CreateIndex
CREATE INDEX "CosmeticsProductProfile_brandId_idx" ON "CosmeticsProductProfile"("brandId");

-- CreateIndex
CREATE INDEX "CosmeticsBatch_tenantId_idx" ON "CosmeticsBatch"("tenantId");

-- CreateIndex
CREATE INDEX "CosmeticsBatch_expiryDate_idx" ON "CosmeticsBatch"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "CosmeticsBatch_tenantId_productId_batchNumber_key" ON "CosmeticsBatch"("tenantId", "productId", "batchNumber");

-- CreateIndex
CREATE INDEX "CosmeticsGiftBundle_tenantId_idx" ON "CosmeticsGiftBundle"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CosmeticsGiftBundle_tenantId_name_key" ON "CosmeticsGiftBundle"("tenantId", "name");

-- CreateIndex
CREATE INDEX "CosmeticsLoyaltyMember_tenantId_idx" ON "CosmeticsLoyaltyMember"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CosmeticsLoyaltyMember_tenantId_memberCode_key" ON "CosmeticsLoyaltyMember"("tenantId", "memberCode");

-- CreateIndex
CREATE UNIQUE INDEX "CosmeticsLoyaltyMember_tenantId_phone_key" ON "CosmeticsLoyaltyMember"("tenantId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "FloristProductProfile_productId_key" ON "FloristProductProfile"("productId");

-- CreateIndex
CREATE INDEX "FloristProductProfile_tenantId_idx" ON "FloristProductProfile"("tenantId");

-- CreateIndex
CREATE INDEX "FloristProductProfile_tenantId_categoryType_idx" ON "FloristProductProfile"("tenantId", "categoryType");

-- CreateIndex
CREATE INDEX "FloristOrder_tenantId_idx" ON "FloristOrder"("tenantId");

-- CreateIndex
CREATE INDEX "FloristOrder_tenantId_status_idx" ON "FloristOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "FloristOrder_tenantId_orderType_idx" ON "FloristOrder"("tenantId", "orderType");

-- CreateIndex
CREATE INDEX "FloristOrder_scheduledDeliveryDate_idx" ON "FloristOrder"("scheduledDeliveryDate");

-- CreateIndex
CREATE UNIQUE INDEX "FloristOrder_tenantId_orderNumber_key" ON "FloristOrder"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "FloristWeddingContract_tenantId_idx" ON "FloristWeddingContract"("tenantId");

-- CreateIndex
CREATE INDEX "FloristWeddingContract_weddingDate_idx" ON "FloristWeddingContract"("weddingDate");

-- CreateIndex
CREATE UNIQUE INDEX "FloristWeddingContract_tenantId_contractNumber_key" ON "FloristWeddingContract"("tenantId", "contractNumber");

-- CreateIndex
CREATE INDEX "FloristSubscription_tenantId_idx" ON "FloristSubscription"("tenantId");

-- CreateIndex
CREATE INDEX "FloristSubscription_tenantId_status_idx" ON "FloristSubscription"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FloristSubscription_tenantId_subscriptionNumber_key" ON "FloristSubscription"("tenantId", "subscriptionNumber");

-- CreateIndex
CREATE INDEX "ShoeBrand_tenantId_idx" ON "ShoeBrand"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ShoeBrand_tenantId_name_key" ON "ShoeBrand"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ShoeProductProfile_productId_key" ON "ShoeProductProfile"("productId");

-- CreateIndex
CREATE INDEX "ShoeProductProfile_tenantId_idx" ON "ShoeProductProfile"("tenantId");

-- CreateIndex
CREATE INDEX "ShoeProductProfile_tenantId_categoryType_idx" ON "ShoeProductProfile"("tenantId", "categoryType");

-- CreateIndex
CREATE INDEX "ShoeProductProfile_brandId_idx" ON "ShoeProductProfile"("brandId");

-- CreateIndex
CREATE INDEX "ShoeSizeVariant_tenantId_idx" ON "ShoeSizeVariant"("tenantId");

-- CreateIndex
CREATE INDEX "ShoeSizeVariant_productId_idx" ON "ShoeSizeVariant"("productId");

-- CreateIndex
CREATE INDEX "ShoeSizeVariant_sku_idx" ON "ShoeSizeVariant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ShoeSizeVariant_tenantId_productId_size_sizeSystem_width_key" ON "ShoeSizeVariant"("tenantId", "productId", "size", "sizeSystem", "width");

-- CreateIndex
CREATE INDEX "ShoeSizeChart_tenantId_idx" ON "ShoeSizeChart"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ShoeSizeChart_tenantId_name_key" ON "ShoeSizeChart"("tenantId", "name");

-- CreateIndex
CREATE INDEX "ShoeTryOnRequest_tenantId_idx" ON "ShoeTryOnRequest"("tenantId");

-- CreateIndex
CREATE INDEX "ShoeTryOnRequest_tenantId_status_idx" ON "ShoeTryOnRequest"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ShoeTryOnRequest_tenantId_requestNumber_key" ON "ShoeTryOnRequest"("tenantId", "requestNumber");

-- CreateIndex
CREATE INDEX "ShoeExchange_tenantId_idx" ON "ShoeExchange"("tenantId");

-- CreateIndex
CREATE INDEX "ShoeExchange_tenantId_status_idx" ON "ShoeExchange"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ShoeExchange_tenantId_exchangeNumber_key" ON "ShoeExchange"("tenantId", "exchangeNumber");
