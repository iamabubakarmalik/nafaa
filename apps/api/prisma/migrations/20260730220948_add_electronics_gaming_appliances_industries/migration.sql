-- CreateEnum
CREATE TYPE "ElectronicsCategoryType" AS ENUM ('CABLE', 'CHARGER', 'POWER_BANK', 'HEADPHONE', 'EARBUD', 'SPEAKER', 'BLUETOOTH_SPEAKER', 'SMARTWATCH', 'FITNESS_BAND', 'DRONE', 'CAMERA', 'DSLR', 'ACTION_CAMERA', 'WEBCAM', 'KEYBOARD', 'MOUSE', 'MONITOR', 'LAPTOP_ACCESSORY', 'PHONE_ACCESSORY', 'CAR_ACCESSORY', 'SMART_HOME', 'LED_LIGHT', 'ROUTER', 'MEMORY_CARD', 'USB_DRIVE', 'HARD_DRIVE', 'SSD', 'ADAPTER', 'CONVERTER', 'SCREEN_PROTECTOR', 'MOBILE_CASE', 'TABLET_ACCESSORY', 'VR_HEADSET', 'PROJECTOR', 'MICROPHONE', 'TRIPOD', 'GIMBAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ElectronicsConditionType" AS ENUM ('BRAND_NEW', 'OPEN_BOX', 'REFURBISHED', 'USED', 'DAMAGED', 'FOR_PARTS');

-- CreateEnum
CREATE TYPE "ElectronicsWarrantyStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'VOID', 'CLAIMED', 'IN_REPAIR', 'NO_WARRANTY');

-- CreateEnum
CREATE TYPE "ElectronicsSerialStatus" AS ENUM ('IN_STOCK', 'SOLD', 'RESERVED', 'RETURNED', 'IN_REPAIR', 'DEFECTIVE', 'LOST');

-- CreateEnum
CREATE TYPE "GamingCategoryType" AS ENUM ('CONSOLE_PS5', 'CONSOLE_PS4', 'CONSOLE_XBOX_SERIES', 'CONSOLE_XBOX_ONE', 'CONSOLE_NINTENDO_SWITCH', 'CONSOLE_HANDHELD', 'CONSOLE_RETRO', 'GAME_DISC', 'GAME_DIGITAL', 'GAME_COLLECTOR_EDITION', 'CONTROLLER', 'HEADSET_GAMING', 'KEYBOARD_GAMING', 'MOUSE_GAMING', 'MOUSEPAD', 'CHAIR_GAMING', 'DESK_GAMING', 'MONITOR_GAMING', 'PC_PREBUILT', 'PC_CUSTOM_BUILD', 'CPU', 'GPU', 'RAM', 'MOTHERBOARD', 'PSU', 'STORAGE_SSD', 'STORAGE_HDD', 'COOLING', 'PC_CASE', 'RGB_ACCESSORY', 'STREAMING_GEAR', 'CAPTURE_CARD', 'VR_HEADSET', 'DIGITAL_TOPUP', 'DIGITAL_SUBSCRIPTION', 'GIFT_CARD', 'MERCHANDISE', 'OTHER');

-- CreateEnum
CREATE TYPE "GamingConditionType" AS ENUM ('NEW_SEALED', 'OPEN_BOX', 'PRE_OWNED', 'REFURBISHED', 'TRADE_IN');

-- CreateEnum
CREATE TYPE "GamingConsolePlatform" AS ENUM ('PS5', 'PS4', 'XBOX_SERIES_X', 'XBOX_SERIES_S', 'XBOX_ONE', 'NINTENDO_SWITCH', 'PC', 'STEAM_DECK', 'MOBILE', 'RETRO', 'MULTI', 'OTHER');

-- CreateEnum
CREATE TYPE "GamingRentalStatus" AS ENUM ('RESERVED', 'ACTIVE', 'RETURNED', 'OVERDUE', 'DAMAGED', 'LOST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GamingTopupProvider" AS ENUM ('PSN', 'XBOX_LIVE', 'NINTENDO', 'STEAM', 'EPIC_GAMES', 'GOOGLE_PLAY', 'APPLE_STORE', 'ITUNES', 'ROBUX', 'FORTNITE_VBUCKS', 'PUBG_UC', 'MOBILE_LEGENDS_DIAMONDS', 'FREE_FIRE_DIAMONDS', 'DISCORD_NITRO', 'NETFLIX', 'SPOTIFY', 'OTHER');

-- CreateEnum
CREATE TYPE "GamingCafeSessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GamingStationType" AS ENUM ('PC_STATION', 'PS5_STATION', 'PS4_STATION', 'XBOX_STATION', 'SIMULATOR', 'VR_STATION', 'MULTIPLAYER_BOOTH', 'PRIVATE_ROOM', 'OTHER');

-- CreateEnum
CREATE TYPE "ApplianceCategoryType" AS ENUM ('REFRIGERATOR', 'DEEP_FREEZER', 'AIR_CONDITIONER_SPLIT', 'AIR_CONDITIONER_WINDOW', 'AIR_CONDITIONER_PORTABLE', 'AIR_CONDITIONER_INVERTER', 'WASHING_MACHINE_TOP_LOAD', 'WASHING_MACHINE_FRONT_LOAD', 'WASHING_MACHINE_TWIN_TUB', 'DRYER', 'DISHWASHER', 'LED_TV', 'SMART_TV', 'QLED_TV', 'OLED_TV', 'MICROWAVE_OVEN', 'OTG_OVEN', 'ELECTRIC_STOVE', 'GAS_STOVE', 'RANGE_HOOD', 'WATER_DISPENSER', 'WATER_PURIFIER', 'GEYSER_ELECTRIC', 'GEYSER_GAS', 'AIR_COOLER', 'AIR_PURIFIER', 'ROOM_HEATER', 'VACUUM_CLEANER', 'CHIMNEY', 'BLENDER', 'JUICER', 'IRON_STEAM', 'IRON_DRY', 'FAN_CEILING', 'FAN_PEDESTAL', 'UPS', 'SOLAR_PANEL', 'SOLAR_INVERTER', 'BATTERY', 'GENERATOR', 'OTHER');

-- CreateEnum
CREATE TYPE "ApplianceEnergyRating" AS ENUM ('FIVE_STAR', 'FOUR_STAR', 'THREE_STAR', 'TWO_STAR', 'ONE_STAR', 'NOT_RATED', 'INVERTER');

-- CreateEnum
CREATE TYPE "ApplianceInstallationStatus" AS ENUM ('PENDING', 'SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'RESCHEDULED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "ApplianceServiceType" AS ENUM ('INSTALLATION', 'DEMO', 'INSPECTION', 'REPAIR', 'MAINTENANCE', 'DEEP_CLEANING', 'GAS_REFILL', 'WARRANTY_CLAIM', 'AMC_VISIT', 'RELOCATION', 'UNINSTALLATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ApplianceServiceStatus" AS ENUM ('REQUESTED', 'SCHEDULED', 'TECHNICIAN_ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'COMPLETED', 'PENDING_PARTS', 'CANCELLED', 'UNRESOLVED');

-- CreateEnum
CREATE TYPE "ApplianceAmcType" AS ENUM ('BASIC', 'STANDARD', 'PREMIUM', 'COMPREHENSIVE');

-- CreateEnum
CREATE TYPE "ApplianceAmcStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'RENEWED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "ElectronicsBrand" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "countryOfOrigin" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "authorizedDealer" BOOLEAN NOT NULL DEFAULT false,
    "dealerCode" TEXT,
    "supportContact" TEXT,
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

    CONSTRAINT "ElectronicsBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectronicsProductProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "brandId" TEXT,
    "categoryType" "ElectronicsCategoryType",
    "conditionType" "ElectronicsConditionType" NOT NULL DEFAULT 'BRAND_NEW',
    "modelNumber" TEXT,
    "partNumber" TEXT,
    "colorName" TEXT,
    "colorHex" TEXT,
    "connectivity" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "powerRating" TEXT,
    "batteryCapacity" TEXT,
    "batteryLifeHours" DOUBLE PRECISION,
    "chargingTimeMinutes" INTEGER,
    "operatingRange" TEXT,
    "waterResistance" TEXT,
    "screenSize" TEXT,
    "resolution" TEXT,
    "refreshRate" TEXT,
    "compatibleWith" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "compatibleOS" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weightGrams" DOUBLE PRECISION,
    "lengthMm" DOUBLE PRECISION,
    "widthMm" DOUBLE PRECISION,
    "heightMm" DOUBLE PRECISION,
    "warrantyMonths" INTEGER NOT NULL DEFAULT 0,
    "warrantyType" TEXT,
    "hasInternationalWarranty" BOOLEAN NOT NULL DEFAULT false,
    "requiresSerial" BOOLEAN NOT NULL DEFAULT false,
    "hasImei" BOOLEAN NOT NULL DEFAULT false,
    "boxContents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hasManual" BOOLEAN NOT NULL DEFAULT true,
    "hasWarrantyCard" BOOLEAN NOT NULL DEFAULT true,
    "mrp" DOUBLE PRECISION,
    "costPrice" DOUBLE PRECISION,
    "wholesalePrice" DOUBLE PRECISION,
    "retailPrice" DOUBLE PRECISION,
    "onlinePrice" DOUBLE PRECISION,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectronicsProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectronicsSerialTracking" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "imei" TEXT,
    "imei2" TEXT,
    "macAddress" TEXT,
    "status" "ElectronicsSerialStatus" NOT NULL DEFAULT 'IN_STOCK',
    "purchasePrice" DOUBLE PRECISION,
    "purchaseDate" TIMESTAMP(3),
    "supplierRef" TEXT,
    "soldPrice" DOUBLE PRECISION,
    "soldAt" TIMESTAMP(3),
    "soldToCustomerId" TEXT,
    "saleId" TEXT,
    "invoiceNumber" TEXT,
    "warrantyStartDate" TIMESTAMP(3),
    "warrantyEndDate" TIMESTAMP(3),
    "warrantyStatus" "ElectronicsWarrantyStatus" NOT NULL DEFAULT 'NO_WARRANTY',
    "batteryHealthPct" DOUBLE PRECISION,
    "screenCondition" TEXT,
    "physicalCondition" TEXT,
    "functionalStatus" TEXT,
    "notes" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectronicsSerialTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectronicsWarrantyClaim" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "serialTrackingId" TEXT,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "invoiceNumber" TEXT,
    "serialNumber" TEXT,
    "imei" TEXT,
    "claimDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issueDescription" TEXT NOT NULL,
    "issueCategory" TEXT,
    "status" "ElectronicsWarrantyStatus" NOT NULL DEFAULT 'ACTIVE',
    "receivedAt" TIMESTAMP(3),
    "diagnosedAt" TIMESTAMP(3),
    "diagnosis" TEXT,
    "resolution" TEXT,
    "sentToBrand" BOOLEAN NOT NULL DEFAULT false,
    "brandRef" TEXT,
    "brandContactedAt" TIMESTAMP(3),
    "brandResponse" TEXT,
    "isChargeable" BOOLEAN NOT NULL DEFAULT false,
    "repairCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidByCustomer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidByBrand" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resolvedAt" TIMESTAMP(3),
    "resolutionType" TEXT,
    "replacementSerialNumber" TEXT,
    "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "internalNotes" TEXT,
    "handledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectronicsWarrantyClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectronicsBundle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "items" JSONB NOT NULL,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "bundlePrice" DOUBLE PRECISION NOT NULL,
    "savings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "savingsPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectronicsBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamingProductProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "categoryType" "GamingCategoryType",
    "platform" "GamingConsolePlatform" NOT NULL DEFAULT 'MULTI',
    "conditionType" "GamingConditionType" NOT NULL DEFAULT 'NEW_SEALED',
    "publisher" TEXT,
    "developer" TEXT,
    "genre" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ageRating" TEXT,
    "playerCount" TEXT,
    "onlineMultiplayer" BOOLEAN NOT NULL DEFAULT false,
    "requiresInternet" BOOLEAN NOT NULL DEFAULT false,
    "gameFileSize" TEXT,
    "releaseDate" TIMESTAMP(3),
    "region" TEXT,
    "language" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "storageCapacity" TEXT,
    "memoryRam" TEXT,
    "processor" TEXT,
    "graphicsCard" TEXT,
    "displaySpec" TEXT,
    "includedAccessories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "numberOfControllers" INTEGER NOT NULL DEFAULT 1,
    "gpuModel" TEXT,
    "cpuModel" TEXT,
    "ramSpec" TEXT,
    "formFactor" TEXT,
    "power" TEXT,
    "socket" TEXT,
    "chipset" TEXT,
    "isRentable" BOOLEAN NOT NULL DEFAULT false,
    "rentalPricePerHour" DOUBLE PRECISION,
    "rentalPricePerDay" DOUBLE PRECISION,
    "rentalDeposit" DOUBLE PRECISION,
    "mrp" DOUBLE PRECISION,
    "costPrice" DOUBLE PRECISION,
    "retailPrice" DOUBLE PRECISION,
    "discountedPrice" DOUBLE PRECISION,
    "usedPrice" DOUBLE PRECISION,
    "tradeInValue" DOUBLE PRECISION,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isNewRelease" BOOLEAN NOT NULL DEFAULT false,
    "isPreOrder" BOOLEAN NOT NULL DEFAULT false,
    "preOrderReleaseDate" TIMESTAMP(3),
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "totalRented" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "coverImageUrl" TEXT,
    "trailerUrl" TEXT,
    "screenshots" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamingProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamingRental" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rentalNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerCnic" TEXT,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "serialNumber" TEXT,
    "status" "GamingRentalStatus" NOT NULL DEFAULT 'RESERVED',
    "rentalStartDate" TIMESTAMP(3) NOT NULL,
    "rentalEndDate" TIMESTAMP(3) NOT NULL,
    "actualReturnDate" TIMESTAMP(3),
    "daysRented" INTEGER NOT NULL,
    "hoursRented" INTEGER,
    "pricePerDay" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositRefunded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conditionAtCheckout" TEXT,
    "conditionAtReturn" TEXT,
    "damageFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lateFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "photosAtCheckout" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photosAtReturn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customerSignatureUrl" TEXT,
    "guarantorName" TEXT,
    "guarantorPhone" TEXT,
    "securityDocument" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamingRental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamingDigitalTopup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "topupNumber" TEXT NOT NULL,
    "provider" "GamingTopupProvider" NOT NULL,
    "topupType" TEXT NOT NULL,
    "denominationValue" DOUBLE PRECISION NOT NULL,
    "denominationCurrency" TEXT NOT NULL DEFAULT 'USD',
    "cardCode" TEXT,
    "cardPin" TEXT,
    "cardSerial" TEXT,
    "costPrice" DOUBLE PRECISION NOT NULL,
    "sellingPrice" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isRedeemed" BOOLEAN NOT NULL DEFAULT false,
    "redeemedAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "soldToCustomerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "deliveredVia" TEXT,
    "deliveryReference" TEXT,
    "expiryDate" TIMESTAMP(3),
    "regionRestriction" TEXT,
    "notes" TEXT,
    "supplierRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamingDigitalTopup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamingStation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stationNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stationType" "GamingStationType" NOT NULL,
    "location" TEXT,
    "platform" "GamingConsolePlatform",
    "specifications" TEXT,
    "installedGames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pricePerHour" DOUBLE PRECISION NOT NULL,
    "pricePerHalfHour" DOUBLE PRECISION,
    "peakHourPrice" DOUBLE PRECISION,
    "offPeakPrice" DOUBLE PRECISION,
    "minimumMinutes" INTEGER NOT NULL DEFAULT 15,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isUnderMaintenance" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceNotes" TEXT,
    "totalHoursUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamingStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamingCafeSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "sessionNumber" TEXT NOT NULL,
    "status" "GamingCafeSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "customerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "playerCount" INTEGER NOT NULL DEFAULT 1,
    "gameSelected" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" TIMESTAMP(3),
    "resumedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "totalPauseMinutes" INTEGER NOT NULL DEFAULT 0,
    "actualMinutes" INTEGER,
    "billableMinutes" INTEGER,
    "ratePerHour" DOUBLE PRECISION NOT NULL,
    "baseAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "foodCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "additionalCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "isTournamentMatch" BOOLEAN NOT NULL DEFAULT false,
    "tournamentId" TEXT,
    "notes" TEXT,
    "handledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamingCafeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamingTournament" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tournamentNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "gameName" TEXT NOT NULL,
    "platform" "GamingConsolePlatform" NOT NULL,
    "format" TEXT,
    "maxParticipants" INTEGER NOT NULL,
    "currentParticipants" INTEGER NOT NULL DEFAULT 0,
    "entryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prizePool" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "firstPrize" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "secondPrize" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "thirdPrize" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "scheduledEndDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "winnerName" TEXT,
    "runnerUpName" TEXT,
    "bannerUrl" TEXT,
    "rules" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamingTournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplianceBrand" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "countryOfOrigin" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "authorizedDealer" BOOLEAN NOT NULL DEFAULT false,
    "dealerCode" TEXT,
    "serviceCenter" TEXT,
    "serviceContact" TEXT,
    "serviceEmail" TEXT,
    "warrantyPolicy" TEXT,
    "installationIncluded" BOOLEAN NOT NULL DEFAULT false,
    "demoIncluded" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalProducts" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplianceBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplianceProductProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "brandId" TEXT,
    "categoryType" "ApplianceCategoryType",
    "modelNumber" TEXT,
    "modelYear" INTEGER,
    "colorName" TEXT,
    "colorHex" TEXT,
    "capacity" TEXT,
    "powerConsumption" TEXT,
    "voltage" TEXT,
    "frequency" TEXT,
    "weightKg" DOUBLE PRECISION,
    "dimensions" TEXT,
    "energyRating" "ApplianceEnergyRating",
    "bee_rating" TEXT,
    "isEnergyStar" BOOLEAN NOT NULL DEFAULT false,
    "isInverter" BOOLEAN NOT NULL DEFAULT false,
    "acTonnage" TEXT,
    "acType" TEXT,
    "coolingCapacity" TEXT,
    "heatingCapacity" TEXT,
    "refrigerantType" TEXT,
    "eer" TEXT,
    "fridgeCapacityLiters" DOUBLE PRECISION,
    "refrigeratorType" TEXT,
    "doorCount" INTEGER,
    "compressorType" TEXT,
    "washingCapacityKg" DOUBLE PRECISION,
    "washingType" TEXT,
    "rpm" INTEGER,
    "numberOfPrograms" INTEGER,
    "screenSizeInch" DOUBLE PRECISION,
    "displayType" TEXT,
    "resolution" TEXT,
    "refreshRate" TEXT,
    "smartOS" TEXT,
    "hdmiPorts" INTEGER,
    "usbPorts" INTEGER,
    "warrantyMonths" INTEGER NOT NULL DEFAULT 12,
    "compressorWarrantyMonths" INTEGER,
    "motorWarrantyMonths" INTEGER,
    "warrantyType" TEXT,
    "requiresInstallation" BOOLEAN NOT NULL DEFAULT true,
    "installationCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "installationCovered" BOOLEAN NOT NULL DEFAULT false,
    "installationTimeHours" DOUBLE PRECISION,
    "requiresPlumbing" BOOLEAN NOT NULL DEFAULT false,
    "requiresGasConnection" BOOLEAN NOT NULL DEFAULT false,
    "requiresElectrician" BOOLEAN NOT NULL DEFAULT false,
    "requiresLargeVehicle" BOOLEAN NOT NULL DEFAULT false,
    "freeDelivery" BOOLEAN NOT NULL DEFAULT false,
    "deliveryChargePerKm" DOUBLE PRECISION,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "smartFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "safetyFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "boxContents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mrp" DOUBLE PRECISION,
    "costPrice" DOUBLE PRECISION,
    "wholesalePrice" DOUBLE PRECISION,
    "retailPrice" DOUBLE PRECISION,
    "emiStartingFrom" DOUBLE PRECISION,
    "cashDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requiresSerial" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplianceProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplianceSerialTracking" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "modelNumber" TEXT,
    "batchNumber" TEXT,
    "manufactureDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "purchasePrice" DOUBLE PRECISION,
    "purchaseDate" TIMESTAMP(3),
    "supplierRef" TEXT,
    "soldPrice" DOUBLE PRECISION,
    "soldAt" TIMESTAMP(3),
    "soldToCustomerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "saleId" TEXT,
    "invoiceNumber" TEXT,
    "deliveryAddress" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "deliveredBy" TEXT,
    "installationRequired" BOOLEAN NOT NULL DEFAULT true,
    "installationStatus" "ApplianceInstallationStatus" NOT NULL DEFAULT 'PENDING',
    "installationScheduledFor" TIMESTAMP(3),
    "installedAt" TIMESTAMP(3),
    "installedByTechnicianId" TEXT,
    "warrantyStartDate" TIMESTAMP(3),
    "warrantyEndDate" TIMESTAMP(3),
    "compressorWarrantyEndDate" TIMESTAMP(3),
    "motorWarrantyEndDate" TIMESTAMP(3),
    "notes" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplianceSerialTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplianceInstallation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "installationNumber" TEXT NOT NULL,
    "serialTrackingId" TEXT,
    "saleId" TEXT,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "serialNumber" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerAddress" TEXT NOT NULL,
    "city" TEXT,
    "area" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "landmark" TEXT,
    "serviceType" "ApplianceServiceType" NOT NULL DEFAULT 'INSTALLATION',
    "status" "ApplianceInstallationStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledDate" TIMESTAMP(3),
    "scheduledTimeSlot" TEXT,
    "technicianId" TEXT,
    "technicianName" TEXT,
    "technicianPhone" TEXT,
    "arrivedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "hasProperElectricConnection" BOOLEAN,
    "hasProperPlumbing" BOOLEAN,
    "hasProperGasConnection" BOOLEAN,
    "wallSpaceAvailable" BOOLEAN,
    "drainageAvailable" BOOLEAN,
    "additionalMaterialUsed" JSONB,
    "materialsCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "visitCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidByCustomer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "covered_underWarranty" BOOLEAN NOT NULL DEFAULT false,
    "demoGiven" BOOLEAN NOT NULL DEFAULT false,
    "demoNotes" TEXT,
    "customerSignatureUrl" TEXT,
    "photosBeforeUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photosAfterUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customerRating" INTEGER,
    "customerFeedback" TEXT,
    "installationCertificateNumber" TEXT,
    "internalNotes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplianceInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplianceServiceRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "serialTrackingId" TEXT,
    "serialNumber" TEXT,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerAddress" TEXT NOT NULL,
    "city" TEXT,
    "area" TEXT,
    "serviceType" "ApplianceServiceType" NOT NULL,
    "status" "ApplianceServiceStatus" NOT NULL DEFAULT 'REQUESTED',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "reportedIssue" TEXT NOT NULL,
    "issueCategory" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledDate" TIMESTAMP(3),
    "scheduledTimeSlot" TEXT,
    "technicianId" TEXT,
    "technicianName" TEXT,
    "technicianPhone" TEXT,
    "enRouteAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "workStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "diagnosedIssue" TEXT,
    "workDone" TEXT,
    "partsReplaced" JSONB,
    "visitCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "partsCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coveredUnderWarranty" BOOLEAN NOT NULL DEFAULT false,
    "coveredUnderAmc" BOOLEAN NOT NULL DEFAULT false,
    "warrantyClaimNumber" TEXT,
    "amcContractNumber" TEXT,
    "requiresFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" TIMESTAMP(3),
    "followUpReason" TEXT,
    "customerRating" INTEGER,
    "customerFeedback" TEXT,
    "photosBeforeUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photosAfterUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customerSignatureUrl" TEXT,
    "serviceCertificate" TEXT,
    "internalNotes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplianceServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplianceTechnician" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "cnic" TEXT,
    "address" TEXT,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "brandsExpertise" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categoriesExpertise" "ApplianceCategoryType"[] DEFAULT ARRAY[]::"ApplianceCategoryType"[],
    "experienceYears" INTEGER,
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "workStartTime" TEXT NOT NULL DEFAULT '09:00',
    "workEndTime" TEXT NOT NULL DEFAULT '18:00',
    "currentZone" TEXT,
    "visitChargeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalJobs" INTEGER NOT NULL DEFAULT 0,
    "completedJobs" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "photoUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplianceTechnician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplianceAmcContract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "amcType" "ApplianceAmcType" NOT NULL DEFAULT 'STANDARD',
    "status" "ApplianceAmcStatus" NOT NULL DEFAULT 'ACTIVE',
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerAddress" TEXT,
    "productId" TEXT,
    "productName" TEXT,
    "serialNumber" TEXT,
    "serialTrackingId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "contractValue" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freeVisitsAllowed" INTEGER NOT NULL,
    "freeVisitsUsed" INTEGER NOT NULL DEFAULT 0,
    "freePartsAllowed" BOOLEAN NOT NULL DEFAULT false,
    "laborCovered" BOOLEAN NOT NULL DEFAULT true,
    "gasRefillCovered" BOOLEAN NOT NULL DEFAULT false,
    "emergencyCallsAllowed" INTEGER,
    "servicesIncluded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "servicesExcluded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exclusions" TEXT,
    "totalVisitsUsed" INTEGER NOT NULL DEFAULT 0,
    "totalPartsClaimed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLaborSaved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "renewalReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "documentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplianceAmcContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplianceDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deliveryNumber" TEXT NOT NULL,
    "saleId" TEXT,
    "serialTrackingIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "city" TEXT,
    "area" TEXT,
    "landmark" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "floorNumber" INTEGER,
    "hasLift" BOOLEAN,
    "scheduledDate" TIMESTAMP(3),
    "scheduledSlot" TEXT,
    "vehicleNumber" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "helperCount" INTEGER,
    "dispatchedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "deliveryCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loadingCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unloadingCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "floorCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requiresInstallation" BOOLEAN NOT NULL DEFAULT true,
    "installationLinked" BOOLEAN NOT NULL DEFAULT false,
    "receivedByName" TEXT,
    "receivedByCnic" TEXT,
    "signatureUrl" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplianceDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ElectronicsBrand_tenantId_idx" ON "ElectronicsBrand"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicsBrand_tenantId_name_key" ON "ElectronicsBrand"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicsProductProfile_productId_key" ON "ElectronicsProductProfile"("productId");

-- CreateIndex
CREATE INDEX "ElectronicsProductProfile_tenantId_idx" ON "ElectronicsProductProfile"("tenantId");

-- CreateIndex
CREATE INDEX "ElectronicsProductProfile_tenantId_categoryType_idx" ON "ElectronicsProductProfile"("tenantId", "categoryType");

-- CreateIndex
CREATE INDEX "ElectronicsProductProfile_brandId_idx" ON "ElectronicsProductProfile"("brandId");

-- CreateIndex
CREATE INDEX "ElectronicsSerialTracking_tenantId_idx" ON "ElectronicsSerialTracking"("tenantId");

-- CreateIndex
CREATE INDEX "ElectronicsSerialTracking_tenantId_status_idx" ON "ElectronicsSerialTracking"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ElectronicsSerialTracking_productId_idx" ON "ElectronicsSerialTracking"("productId");

-- CreateIndex
CREATE INDEX "ElectronicsSerialTracking_imei_idx" ON "ElectronicsSerialTracking"("imei");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicsSerialTracking_tenantId_serialNumber_key" ON "ElectronicsSerialTracking"("tenantId", "serialNumber");

-- CreateIndex
CREATE INDEX "ElectronicsWarrantyClaim_tenantId_idx" ON "ElectronicsWarrantyClaim"("tenantId");

-- CreateIndex
CREATE INDEX "ElectronicsWarrantyClaim_tenantId_status_idx" ON "ElectronicsWarrantyClaim"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ElectronicsWarrantyClaim_customerId_idx" ON "ElectronicsWarrantyClaim"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicsWarrantyClaim_tenantId_claimNumber_key" ON "ElectronicsWarrantyClaim"("tenantId", "claimNumber");

-- CreateIndex
CREATE INDEX "ElectronicsBundle_tenantId_idx" ON "ElectronicsBundle"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicsBundle_tenantId_name_key" ON "ElectronicsBundle"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "GamingProductProfile_productId_key" ON "GamingProductProfile"("productId");

-- CreateIndex
CREATE INDEX "GamingProductProfile_tenantId_idx" ON "GamingProductProfile"("tenantId");

-- CreateIndex
CREATE INDEX "GamingProductProfile_tenantId_categoryType_idx" ON "GamingProductProfile"("tenantId", "categoryType");

-- CreateIndex
CREATE INDEX "GamingProductProfile_tenantId_platform_idx" ON "GamingProductProfile"("tenantId", "platform");

-- CreateIndex
CREATE INDEX "GamingRental_tenantId_idx" ON "GamingRental"("tenantId");

-- CreateIndex
CREATE INDEX "GamingRental_tenantId_status_idx" ON "GamingRental"("tenantId", "status");

-- CreateIndex
CREATE INDEX "GamingRental_customerId_idx" ON "GamingRental"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "GamingRental_tenantId_rentalNumber_key" ON "GamingRental"("tenantId", "rentalNumber");

-- CreateIndex
CREATE INDEX "GamingDigitalTopup_tenantId_idx" ON "GamingDigitalTopup"("tenantId");

-- CreateIndex
CREATE INDEX "GamingDigitalTopup_tenantId_provider_idx" ON "GamingDigitalTopup"("tenantId", "provider");

-- CreateIndex
CREATE INDEX "GamingDigitalTopup_soldToCustomerId_idx" ON "GamingDigitalTopup"("soldToCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "GamingDigitalTopup_tenantId_topupNumber_key" ON "GamingDigitalTopup"("tenantId", "topupNumber");

-- CreateIndex
CREATE INDEX "GamingStation_tenantId_idx" ON "GamingStation"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "GamingStation_tenantId_stationNumber_key" ON "GamingStation"("tenantId", "stationNumber");

-- CreateIndex
CREATE INDEX "GamingCafeSession_tenantId_idx" ON "GamingCafeSession"("tenantId");

-- CreateIndex
CREATE INDEX "GamingCafeSession_tenantId_status_idx" ON "GamingCafeSession"("tenantId", "status");

-- CreateIndex
CREATE INDEX "GamingCafeSession_stationId_idx" ON "GamingCafeSession"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "GamingCafeSession_tenantId_sessionNumber_key" ON "GamingCafeSession"("tenantId", "sessionNumber");

-- CreateIndex
CREATE INDEX "GamingTournament_tenantId_idx" ON "GamingTournament"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "GamingTournament_tenantId_tournamentNumber_key" ON "GamingTournament"("tenantId", "tournamentNumber");

-- CreateIndex
CREATE INDEX "ApplianceBrand_tenantId_idx" ON "ApplianceBrand"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplianceBrand_tenantId_name_key" ON "ApplianceBrand"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ApplianceProductProfile_productId_key" ON "ApplianceProductProfile"("productId");

-- CreateIndex
CREATE INDEX "ApplianceProductProfile_tenantId_idx" ON "ApplianceProductProfile"("tenantId");

-- CreateIndex
CREATE INDEX "ApplianceProductProfile_tenantId_categoryType_idx" ON "ApplianceProductProfile"("tenantId", "categoryType");

-- CreateIndex
CREATE INDEX "ApplianceProductProfile_brandId_idx" ON "ApplianceProductProfile"("brandId");

-- CreateIndex
CREATE INDEX "ApplianceSerialTracking_tenantId_idx" ON "ApplianceSerialTracking"("tenantId");

-- CreateIndex
CREATE INDEX "ApplianceSerialTracking_productId_idx" ON "ApplianceSerialTracking"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplianceSerialTracking_tenantId_serialNumber_key" ON "ApplianceSerialTracking"("tenantId", "serialNumber");

-- CreateIndex
CREATE INDEX "ApplianceInstallation_tenantId_idx" ON "ApplianceInstallation"("tenantId");

-- CreateIndex
CREATE INDEX "ApplianceInstallation_tenantId_status_idx" ON "ApplianceInstallation"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ApplianceInstallation_customerId_idx" ON "ApplianceInstallation"("customerId");

-- CreateIndex
CREATE INDEX "ApplianceInstallation_technicianId_idx" ON "ApplianceInstallation"("technicianId");

-- CreateIndex
CREATE INDEX "ApplianceInstallation_scheduledDate_idx" ON "ApplianceInstallation"("scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "ApplianceInstallation_tenantId_installationNumber_key" ON "ApplianceInstallation"("tenantId", "installationNumber");

-- CreateIndex
CREATE INDEX "ApplianceServiceRequest_tenantId_idx" ON "ApplianceServiceRequest"("tenantId");

-- CreateIndex
CREATE INDEX "ApplianceServiceRequest_tenantId_status_idx" ON "ApplianceServiceRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ApplianceServiceRequest_customerId_idx" ON "ApplianceServiceRequest"("customerId");

-- CreateIndex
CREATE INDEX "ApplianceServiceRequest_technicianId_idx" ON "ApplianceServiceRequest"("technicianId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplianceServiceRequest_tenantId_requestNumber_key" ON "ApplianceServiceRequest"("tenantId", "requestNumber");

-- CreateIndex
CREATE INDEX "ApplianceTechnician_tenantId_idx" ON "ApplianceTechnician"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplianceTechnician_tenantId_employeeCode_key" ON "ApplianceTechnician"("tenantId", "employeeCode");

-- CreateIndex
CREATE INDEX "ApplianceAmcContract_tenantId_idx" ON "ApplianceAmcContract"("tenantId");

-- CreateIndex
CREATE INDEX "ApplianceAmcContract_tenantId_status_idx" ON "ApplianceAmcContract"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ApplianceAmcContract_customerId_idx" ON "ApplianceAmcContract"("customerId");

-- CreateIndex
CREATE INDEX "ApplianceAmcContract_expiryDate_idx" ON "ApplianceAmcContract"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "ApplianceAmcContract_tenantId_contractNumber_key" ON "ApplianceAmcContract"("tenantId", "contractNumber");

-- CreateIndex
CREATE INDEX "ApplianceDelivery_tenantId_idx" ON "ApplianceDelivery"("tenantId");

-- CreateIndex
CREATE INDEX "ApplianceDelivery_tenantId_status_idx" ON "ApplianceDelivery"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ApplianceDelivery_tenantId_deliveryNumber_key" ON "ApplianceDelivery"("tenantId", "deliveryNumber");

-- AddForeignKey
ALTER TABLE "GamingCafeSession" ADD CONSTRAINT "GamingCafeSession_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "GamingStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
