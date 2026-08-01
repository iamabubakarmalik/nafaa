-- CreateEnum
CREATE TYPE "FurnitureCategoryType" AS ENUM ('SOFA_SET', 'SOFA_L_SHAPE', 'SOFA_RECLINER', 'SOFA_BED', 'BED_SINGLE', 'BED_DOUBLE', 'BED_KING', 'BED_QUEEN', 'BED_BUNK', 'MATTRESS', 'WARDROBE', 'DRESSING_TABLE', 'DINING_TABLE', 'DINING_CHAIR', 'DINING_SET', 'CENTER_TABLE', 'SIDE_TABLE', 'OFFICE_DESK', 'OFFICE_CHAIR', 'BOOKSHELF', 'TV_CONSOLE', 'ENTERTAINMENT_UNIT', 'SHOE_RACK', 'CABINET', 'CUPBOARD', 'STUDY_TABLE', 'KIDS_FURNITURE', 'BABY_COT', 'OUTDOOR_FURNITURE', 'GARDEN_SET', 'BEAN_BAG', 'OTTOMAN', 'CUSTOM_FURNITURE', 'CURTAINS', 'RUG', 'DECOR', 'LIGHTING', 'MIRROR', 'OTHER');

-- CreateEnum
CREATE TYPE "FurnitureMaterialType" AS ENUM ('SOLID_WOOD_TEAK', 'SOLID_WOOD_SHEESHAM', 'SOLID_WOOD_ROSEWOOD', 'SOLID_WOOD_MANGO', 'ENGINEERED_WOOD', 'MDF', 'PARTICLE_BOARD', 'PLYWOOD', 'METAL_IRON', 'METAL_STEEL', 'METAL_ALUMINIUM', 'GLASS', 'MARBLE', 'GRANITE', 'RATTAN', 'BAMBOO', 'FABRIC_COTTON', 'FABRIC_LINEN', 'FABRIC_VELVET', 'LEATHER_GENUINE', 'LEATHER_FAUX', 'PLASTIC', 'ACRYLIC', 'MIXED', 'OTHER');

-- CreateEnum
CREATE TYPE "FurnitureConditionType" AS ENUM ('BRAND_NEW', 'DISPLAY_MODEL', 'FLOOR_MODEL', 'REFURBISHED', 'PRE_OWNED', 'CUSTOM_ORDER');

-- CreateEnum
CREATE TYPE "FurnitureOrderStatus" AS ENUM ('QUOTATION', 'DEPOSIT_PAID', 'IN_PRODUCTION', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'ASSEMBLED', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FurnitureDeliveryStatus" AS ENUM ('PENDING', 'SCHEDULED', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'ASSEMBLED', 'RESCHEDULED', 'FAILED', 'RETURNED');

-- CreateEnum
CREATE TYPE "OpticalCategoryType" AS ENUM ('FRAME_FULL_RIM', 'FRAME_HALF_RIM', 'FRAME_RIMLESS', 'FRAME_SPORTS', 'FRAME_KIDS', 'FRAME_READING', 'SUNGLASSES', 'SUNGLASSES_POLARIZED', 'SUNGLASSES_KIDS', 'LENS_SINGLE_VISION', 'LENS_BIFOCAL', 'LENS_PROGRESSIVE', 'LENS_PHOTOCHROMIC', 'LENS_BLUE_CUT', 'LENS_ANTI_GLARE', 'LENS_CYLINDRICAL', 'LENS_SPHERICAL', 'CONTACT_LENS_MONTHLY', 'CONTACT_LENS_DAILY', 'CONTACT_LENS_YEARLY', 'CONTACT_LENS_COLORED', 'CONTACT_LENS_TORIC', 'CONTACT_LENS_MULTIFOCAL', 'CLEANING_SOLUTION', 'LENS_CASE', 'ACCESSORY', 'OTHER');

-- CreateEnum
CREATE TYPE "OpticalFrameShape" AS ENUM ('ROUND', 'SQUARE', 'RECTANGLE', 'OVAL', 'CAT_EYE', 'AVIATOR', 'WAYFARER', 'BROWLINE', 'GEOMETRIC', 'BUTTERFLY', 'HEART', 'OTHER');

-- CreateEnum
CREATE TYPE "OpticalFrameMaterial" AS ENUM ('ACETATE', 'METAL', 'TITANIUM', 'STAINLESS_STEEL', 'PLASTIC', 'TR90', 'WOOD', 'ALUMINIUM', 'MIXED', 'OTHER');

-- CreateEnum
CREATE TYPE "OpticalGender" AS ENUM ('MENS', 'WOMENS', 'UNISEX', 'KIDS', 'KIDS_BOYS', 'KIDS_GIRLS');

-- CreateEnum
CREATE TYPE "OpticalPrescriptionType" AS ENUM ('MYOPIA', 'HYPEROPIA', 'ASTIGMATISM', 'PRESBYOPIA', 'READING', 'DISTANCE', 'BIFOCAL', 'PROGRESSIVE', 'COMPUTER', 'DRIVING', 'OTHER');

-- CreateEnum
CREATE TYPE "OpticalAppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "PetCategoryType" AS ENUM ('DOG_FOOD_DRY', 'DOG_FOOD_WET', 'DOG_TREATS', 'DOG_ACCESSORY', 'DOG_TOY', 'DOG_LEASH_COLLAR', 'DOG_BED', 'CAT_FOOD_DRY', 'CAT_FOOD_WET', 'CAT_TREATS', 'CAT_LITTER', 'CAT_ACCESSORY', 'CAT_TOY', 'CAT_BED', 'CAT_SCRATCH_POST', 'BIRD_FOOD', 'BIRD_CAGE', 'BIRD_ACCESSORY', 'FISH_FOOD', 'AQUARIUM_TANK', 'AQUARIUM_FILTER', 'AQUARIUM_DECOR', 'AQUARIUM_PLANT', 'AQUARIUM_HEATER', 'AQUARIUM_LIGHT', 'AQUARIUM_ACCESSORY', 'RABBIT_FOOD', 'RABBIT_ACCESSORY', 'HAMSTER_FOOD', 'HAMSTER_CAGE', 'REPTILE_FOOD', 'REPTILE_ACCESSORY', 'LIVE_ANIMAL_DOG', 'LIVE_ANIMAL_CAT', 'LIVE_ANIMAL_BIRD', 'LIVE_ANIMAL_FISH', 'LIVE_ANIMAL_RABBIT', 'LIVE_ANIMAL_HAMSTER', 'LIVE_ANIMAL_REPTILE', 'LIVE_ANIMAL_OTHER', 'VET_MEDICINE', 'VET_VACCINE', 'VET_DEWORMER', 'VET_SUPPLEMENT', 'VET_SHAMPOO', 'VET_GROOMING', 'VET_HYGIENE', 'TRAINING_TREATS', 'TRAINING_TOOL', 'CARRIER', 'TRANSPORT_CAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "PetSpeciesType" AS ENUM ('DOG', 'CAT', 'BIRD', 'FISH', 'RABBIT', 'HAMSTER', 'GUINEA_PIG', 'REPTILE', 'TURTLE', 'SNAKE', 'FERRET', 'OTHER');

-- CreateEnum
CREATE TYPE "PetLifeStage" AS ENUM ('PUPPY', 'KITTEN', 'ADULT', 'SENIOR', 'ALL_STAGES');

-- CreateEnum
CREATE TYPE "PetGroomingServiceType" AS ENUM ('BATH', 'HAIRCUT', 'FULL_GROOMING', 'NAIL_TRIMMING', 'EAR_CLEANING', 'TEETH_CLEANING', 'ANAL_GLAND', 'FLEA_TREATMENT', 'DEWORMING', 'DELUXE_PACKAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "PetGroomingStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PetSaleStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'RETURNED', 'DECEASED');

-- CreateEnum
CREATE TYPE "ToyCategoryType" AS ENUM ('EDUCATIONAL', 'LEARNING_TOY', 'STEM_TOY', 'PUZZLE', 'BOARD_GAME', 'CARD_GAME', 'ACTION_FIGURE', 'DOLL', 'BARBIE', 'STUFFED_ANIMAL', 'PLUSH_TOY', 'RC_CAR', 'RC_HELICOPTER', 'RC_DRONE', 'RC_BOAT', 'RC_OTHER', 'BUILDING_BLOCKS', 'LEGO_STYLE', 'MAGNETIC_TILES', 'ART_CRAFT', 'DRAWING_PAINTING', 'CLAY_DOUGH', 'MUSICAL_INSTRUMENT', 'MUSICAL_TOY', 'OUTDOOR_TOY', 'RIDE_ON', 'BIKE_KIDS', 'TRICYCLE', 'SCOOTER_KIDS', 'BALL', 'SPORTS_KIDS', 'BABY_TOY', 'RATTLE', 'TEETHER', 'ACTIVITY_GYM', 'BATH_TOY', 'PRETEND_PLAY', 'KITCHEN_PLAYSET', 'DOCTOR_PLAYSET', 'TOOL_PLAYSET', 'DRESS_UP', 'COSTUME', 'SCIENCE_KIT', 'ROBOTICS', 'ELECTRONICS_KIT', 'BOOK_KIDS', 'FLASH_CARDS', 'BIRTHDAY_PARTY', 'GIFT_PACK', 'COLLECTIBLE', 'OTHER');

-- CreateEnum
CREATE TYPE "ToyAgeGroup" AS ENUM ('NEWBORN_0_6M', 'INFANT_6_12M', 'TODDLER_1_2Y', 'TODDLER_2_3Y', 'PRESCHOOL_3_5Y', 'KIDS_5_8Y', 'KIDS_8_12Y', 'TWEEN_12_14Y', 'TEEN_14_PLUS', 'ALL_AGES');

-- CreateEnum
CREATE TYPE "ToyGenderTarget" AS ENUM ('BOYS', 'GIRLS', 'UNISEX', 'BABY');

-- CreateEnum
CREATE TYPE "ToySafetyCertification" AS ENUM ('CE', 'ASTM', 'EN71', 'ISO_8124', 'BIS', 'PSB', 'CPSC', 'NONE', 'OTHER');

-- CreateTable
CREATE TABLE "FurnitureProductProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "categoryType" "FurnitureCategoryType",
    "conditionType" "FurnitureConditionType" NOT NULL DEFAULT 'BRAND_NEW',
    "primaryMaterial" "FurnitureMaterialType",
    "secondaryMaterials" "FurnitureMaterialType"[] DEFAULT ARRAY[]::"FurnitureMaterialType"[],
    "modelNumber" TEXT,
    "collectionName" TEXT,
    "designerName" TEXT,
    "countryOfOrigin" TEXT,
    "brand" TEXT,
    "lengthCm" DOUBLE PRECISION,
    "widthCm" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "depthCm" DOUBLE PRECISION,
    "seatHeightCm" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "seatingCapacity" INTEGER,
    "storageCompartments" INTEGER,
    "drawersCount" INTEGER,
    "shelvesCount" INTEGER,
    "woodType" TEXT,
    "woodFinish" TEXT,
    "polishType" TEXT,
    "colorName" TEXT,
    "colorHex" TEXT,
    "upholsteryFabric" TEXT,
    "cushionFilling" TEXT,
    "cushionDensity" TEXT,
    "requiresAssembly" BOOLEAN NOT NULL DEFAULT true,
    "assemblyTimeMinutes" INTEGER,
    "assemblyPartsCount" INTEGER,
    "assemblyToolsIncluded" BOOLEAN NOT NULL DEFAULT false,
    "assemblyInstructionsUrl" TEXT,
    "assemblyChargeExtra" DOUBLE PRECISION,
    "isCustomizable" BOOLEAN NOT NULL DEFAULT false,
    "customizationOptions" JSONB,
    "customLeadTimeDays" INTEGER,
    "warrantyMonths" INTEGER NOT NULL DEFAULT 12,
    "warrantyType" TEXT,
    "careInstructions" TEXT,
    "isWaterResistant" BOOLEAN NOT NULL DEFAULT false,
    "isTermiteProof" BOOLEAN NOT NULL DEFAULT false,
    "requiresLargeVehicle" BOOLEAN NOT NULL DEFAULT true,
    "requiresMultipleHelpers" BOOLEAN NOT NULL DEFAULT true,
    "helpersNeeded" INTEGER NOT NULL DEFAULT 2,
    "deliveryChargeBase" DOUBLE PRECISION,
    "freeDeliveryRadius" DOUBLE PRECISION,
    "mrp" DOUBLE PRECISION,
    "costPrice" DOUBLE PRECISION,
    "wholesalePrice" DOUBLE PRECISION,
    "retailPrice" DOUBLE PRECISION,
    "discountedPrice" DOUBLE PRECISION,
    "emiStartingFrom" DOUBLE PRECISION,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "isCustomMade" BOOLEAN NOT NULL DEFAULT false,
    "isEcoFriendly" BOOLEAN NOT NULL DEFAULT false,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "showroomLocation" TEXT,
    "showroomFloor" TEXT,
    "displayZone" TEXT,
    "images3d" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ar_model_url" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FurnitureProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FurnitureCustomOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerAddress" TEXT,
    "customerCnic" TEXT,
    "productType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryType" "FurnitureCategoryType",
    "material" "FurnitureMaterialType",
    "woodType" TEXT,
    "colorRequested" TEXT,
    "polishRequested" TEXT,
    "upholsteryFabric" TEXT,
    "lengthCm" DOUBLE PRECISION,
    "widthCm" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "customDimensions" TEXT,
    "sketchUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "referenceImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "designNotes" TEXT,
    "quotedPrice" DOUBLE PRECISION NOT NULL,
    "finalPrice" DOUBLE PRECISION,
    "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositPaid" BOOLEAN NOT NULL DEFAULT false,
    "balanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedDays" INTEGER NOT NULL,
    "quotationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedDate" TIMESTAMP(3),
    "productionStartDate" TIMESTAMP(3),
    "productionEndDate" TIMESTAMP(3),
    "expectedDeliveryDate" TIMESTAMP(3),
    "actualDeliveryDate" TIMESTAMP(3),
    "status" "FurnitureOrderStatus" NOT NULL DEFAULT 'QUOTATION',
    "carpenterId" TEXT,
    "carpenterName" TEXT,
    "workshopLocation" TEXT,
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "progressPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "progressUpdates" JSONB,
    "deliveryAddress" TEXT,
    "deliveryCity" TEXT,
    "deliveryArea" TEXT,
    "requiresInstallation" BOOLEAN NOT NULL DEFAULT true,
    "installationCharge" DOUBLE PRECISION,
    "warrantyMonths" INTEGER NOT NULL DEFAULT 6,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FurnitureCustomOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FurnitureCarpenter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "cnic" TEXT,
    "address" TEXT,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "materialsExpertise" "FurnitureMaterialType"[] DEFAULT ARRAY[]::"FurnitureMaterialType"[],
    "experienceYears" INTEGER,
    "workshopLocation" TEXT,
    "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "workStartTime" TEXT NOT NULL DEFAULT '09:00',
    "workEndTime" TEXT NOT NULL DEFAULT '18:00',
    "dailyWage" DOUBLE PRECISION,
    "perProjectRate" DOUBLE PRECISION,
    "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProjects" INTEGER NOT NULL DEFAULT 0,
    "completedProjects" INTEGER NOT NULL DEFAULT 0,
    "activeProjects" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "photoUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FurnitureCarpenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FurnitureDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deliveryNumber" TEXT NOT NULL,
    "saleId" TEXT,
    "customOrderId" TEXT,
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "productNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "itemsCount" INTEGER NOT NULL DEFAULT 1,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "city" TEXT,
    "area" TEXT,
    "landmark" TEXT,
    "floorNumber" INTEGER,
    "hasLift" BOOLEAN,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "scheduledDate" TIMESTAMP(3),
    "scheduledSlot" TEXT,
    "vehicleType" TEXT,
    "vehicleNumber" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "helpersCount" INTEGER NOT NULL DEFAULT 2,
    "dispatchedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "assembledAt" TIMESTAMP(3),
    "status" "FurnitureDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "deliveryCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loadingCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unloadingCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "floorCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "assemblyCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requiresAssembly" BOOLEAN NOT NULL DEFAULT true,
    "assemblyIncluded" BOOLEAN NOT NULL DEFAULT true,
    "assemblyTimeSpent" INTEGER,
    "assemblyNotes" TEXT,
    "receivedByName" TEXT,
    "receivedByCnic" TEXT,
    "signatureUrl" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customerRating" INTEGER,
    "customerFeedback" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FurnitureDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpticalProductProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "categoryType" "OpticalCategoryType",
    "frameShape" "OpticalFrameShape",
    "frameMaterial" "OpticalFrameMaterial",
    "gender" "OpticalGender",
    "brand" TEXT,
    "modelNumber" TEXT,
    "collectionName" TEXT,
    "frameSizeMm" INTEGER,
    "bridgeSizeMm" INTEGER,
    "templeLengthMm" INTEGER,
    "lensWidthMm" INTEGER,
    "lensHeightMm" INTEGER,
    "frameWeightG" DOUBLE PRECISION,
    "colorName" TEXT,
    "colorHex" TEXT,
    "frameColorOptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lensType" TEXT,
    "lensMaterial" TEXT,
    "lensIndex" TEXT,
    "lensCoatings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hasBlueCut" BOOLEAN NOT NULL DEFAULT false,
    "hasAntiGlare" BOOLEAN NOT NULL DEFAULT false,
    "hasUvProtection" BOOLEAN NOT NULL DEFAULT false,
    "isPolarized" BOOLEAN NOT NULL DEFAULT false,
    "isPhotochromic" BOOLEAN NOT NULL DEFAULT false,
    "isContactLens" BOOLEAN NOT NULL DEFAULT false,
    "clDuration" TEXT,
    "clWaterContent" TEXT,
    "clBaseCurve" TEXT,
    "clDiameter" TEXT,
    "clUvProtection" BOOLEAN NOT NULL DEFAULT false,
    "clForAstigmatism" BOOLEAN NOT NULL DEFAULT false,
    "supportsMinSph" DOUBLE PRECISION,
    "supportsMaxSph" DOUBLE PRECISION,
    "supportsMinCyl" DOUBLE PRECISION,
    "supportsMaxCyl" DOUBLE PRECISION,
    "supportsProgressive" BOOLEAN NOT NULL DEFAULT false,
    "warrantyMonths" INTEGER NOT NULL DEFAULT 6,
    "warrantyType" TEXT,
    "mrp" DOUBLE PRECISION,
    "costPrice" DOUBLE PRECISION,
    "retailPrice" DOUBLE PRECISION,
    "discountedPrice" DOUBLE PRECISION,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "isDesigner" BOOLEAN NOT NULL DEFAULT false,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "imageUrls3d" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tryOnUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpticalProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpticalPrescription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "prescriptionNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerAge" INTEGER,
    "customerGender" TEXT,
    "prescribedBy" TEXT,
    "doctorName" TEXT,
    "clinicName" TEXT,
    "prescriptionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "prescriptionType" "OpticalPrescriptionType",
    "rightSph" DOUBLE PRECISION,
    "rightCyl" DOUBLE PRECISION,
    "rightAxis" INTEGER,
    "rightAdd" DOUBLE PRECISION,
    "rightPrism" DOUBLE PRECISION,
    "rightPd" DOUBLE PRECISION,
    "rightVa" TEXT,
    "leftSph" DOUBLE PRECISION,
    "leftCyl" DOUBLE PRECISION,
    "leftAxis" INTEGER,
    "leftAdd" DOUBLE PRECISION,
    "leftPrism" DOUBLE PRECISION,
    "leftPd" DOUBLE PRECISION,
    "leftVa" TEXT,
    "pupilDistance" DOUBLE PRECISION,
    "segHeight" DOUBLE PRECISION,
    "clRightBaseCurve" TEXT,
    "clLeftBaseCurve" TEXT,
    "clRightDiameter" TEXT,
    "clLeftDiameter" TEXT,
    "notes" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpticalPrescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpticalEyeTest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "testNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerAge" INTEGER,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "scheduledSlot" TEXT,
    "status" "OpticalAppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "optometristId" TEXT,
    "optometristName" TEXT,
    "testStartedAt" TIMESTAMP(3),
    "testCompletedAt" TIMESTAMP(3),
    "testDurationMinutes" INTEGER,
    "chiefComplaint" TEXT,
    "medicalHistory" TEXT,
    "currentMedications" TEXT,
    "familyEyeHistory" TEXT,
    "rightSph" DOUBLE PRECISION,
    "rightCyl" DOUBLE PRECISION,
    "rightAxis" INTEGER,
    "rightAdd" DOUBLE PRECISION,
    "rightVa" TEXT,
    "leftSph" DOUBLE PRECISION,
    "leftCyl" DOUBLE PRECISION,
    "leftAxis" INTEGER,
    "leftAdd" DOUBLE PRECISION,
    "leftVa" TEXT,
    "pupilDistance" DOUBLE PRECISION,
    "intraocularPressure" TEXT,
    "colorVisionTest" TEXT,
    "depthPerceptionTest" TEXT,
    "peripheralVisionTest" TEXT,
    "fundusExamination" TEXT,
    "diagnosis" TEXT,
    "recommendation" TEXT,
    "prescriptionIssued" BOOLEAN NOT NULL DEFAULT false,
    "prescriptionId" TEXT,
    "testFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isWaivedOff" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" TEXT,
    "requiresFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" TIMESTAMP(3),
    "followUpReason" TEXT,
    "notes" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpticalEyeTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpticalOptometrist" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qualification" TEXT,
    "registrationNumber" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearsExperience" INTEGER,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "workStartTime" TEXT NOT NULL DEFAULT '10:00',
    "workEndTime" TEXT NOT NULL DEFAULT '20:00',
    "consultationFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "followUpFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTests" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "photoUrl" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpticalOptometrist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpticalLensOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "prescriptionId" TEXT,
    "frameProductId" TEXT,
    "frameName" TEXT NOT NULL,
    "lensType" TEXT NOT NULL,
    "lensMaterial" TEXT,
    "lensIndex" TEXT,
    "lensCoatings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rightSph" DOUBLE PRECISION,
    "rightCyl" DOUBLE PRECISION,
    "rightAxis" INTEGER,
    "rightAdd" DOUBLE PRECISION,
    "leftSph" DOUBLE PRECISION,
    "leftCyl" DOUBLE PRECISION,
    "leftAxis" INTEGER,
    "leftAdd" DOUBLE PRECISION,
    "pupilDistance" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ORDERED',
    "labName" TEXT,
    "labOrderRef" TEXT,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "fittedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "framePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lensPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fittingCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fittingNotes" TEXT,
    "qcNotes" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpticalLensOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetProductProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "categoryType" "PetCategoryType",
    "species" "PetSpeciesType",
    "lifeStage" "PetLifeStage" NOT NULL DEFAULT 'ALL_STAGES',
    "brand" TEXT,
    "breedSpecific" TEXT,
    "weightGrams" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "packSize" TEXT,
    "flavor" TEXT,
    "proteinSource" TEXT,
    "proteinPct" DOUBLE PRECISION,
    "fatPct" DOUBLE PRECISION,
    "fiberPct" DOUBLE PRECISION,
    "moisturePct" DOUBLE PRECISION,
    "ingredients" TEXT,
    "isGrainFree" BOOLEAN NOT NULL DEFAULT false,
    "isOrganic" BOOLEAN NOT NULL DEFAULT false,
    "isHypoallergenic" BOOLEAN NOT NULL DEFAULT false,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "suitedForBreedSizes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "suitedForAges" TEXT,
    "size" TEXT,
    "dimensions" TEXT,
    "color" TEXT,
    "material" TEXT,
    "tankCapacityLiters" DOUBLE PRECISION,
    "tankShape" TEXT,
    "filterCapacity" TEXT,
    "wattage" TEXT,
    "isPrescriptionOnly" BOOLEAN NOT NULL DEFAULT false,
    "activeIngredient" TEXT,
    "dosageForm" TEXT,
    "dosageStrength" TEXT,
    "administrationRoute" TEXT,
    "storageInstructions" TEXT,
    "expiryDate" TIMESTAMP(3),
    "batchNumber" TEXT,
    "mrp" DOUBLE PRECISION,
    "costPrice" DOUBLE PRECISION,
    "retailPrice" DOUBLE PRECISION,
    "discountedPrice" DOUBLE PRECISION,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "isOnSale" BOOLEAN NOT NULL DEFAULT false,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetLiveAnimal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "animalNumber" TEXT NOT NULL,
    "species" "PetSpeciesType" NOT NULL,
    "breed" TEXT,
    "subBreed" TEXT,
    "name" TEXT,
    "gender" TEXT,
    "ageMonths" INTEGER,
    "color" TEXT,
    "weightKg" DOUBLE PRECISION,
    "birthDate" TIMESTAMP(3),
    "acquiredDate" TIMESTAMP(3),
    "sourceType" TEXT,
    "sourceName" TEXT,
    "isVaccinated" BOOLEAN NOT NULL DEFAULT false,
    "vaccinationDetails" TEXT,
    "isDewormed" BOOLEAN NOT NULL DEFAULT false,
    "dewormingDetails" TEXT,
    "hasHealthCertificate" BOOLEAN NOT NULL DEFAULT false,
    "healthNotes" TEXT,
    "medicalHistory" JSONB,
    "status" "PetSaleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "costPrice" DOUBLE PRECISION,
    "askingPrice" DOUBLE PRECISION NOT NULL,
    "soldPrice" DOUBLE PRECISION,
    "soldAt" TIMESTAMP(3),
    "soldToCustomerId" TEXT,
    "soldToCustomerName" TEXT,
    "currentCage" TEXT,
    "feedingSchedule" TEXT,
    "specialNeeds" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videoUrl" TEXT,
    "notes" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetLiveAnimal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetGroomingAppointment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appointmentNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "petName" TEXT NOT NULL,
    "petSpecies" "PetSpeciesType" NOT NULL,
    "petBreed" TEXT,
    "petAgeMonths" INTEGER,
    "petWeightKg" DOUBLE PRECISION,
    "petTemperament" TEXT,
    "petAllergies" TEXT,
    "petSpecialInstructions" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "scheduledSlot" TEXT,
    "serviceType" "PetGroomingServiceType" NOT NULL,
    "additionalServices" "PetGroomingServiceType"[] DEFAULT ARRAY[]::"PetGroomingServiceType"[],
    "serviceDescription" TEXT,
    "status" "PetGroomingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "groomerId" TEXT,
    "groomerName" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "serviceFee" DOUBLE PRECISION NOT NULL,
    "additionalCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalFee" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "photosBeforeUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photosAfterUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customerRating" INTEGER,
    "customerFeedback" TEXT,
    "groomerNotes" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetGroomingAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetGroomer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "cnic" TEXT,
    "specializations" "PetSpeciesType"[] DEFAULT ARRAY[]::"PetSpeciesType"[],
    "serviceTypes" "PetGroomingServiceType"[] DEFAULT ARRAY[]::"PetGroomingServiceType"[],
    "experienceYears" INTEGER,
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "workStartTime" TEXT NOT NULL DEFAULT '10:00',
    "workEndTime" TEXT NOT NULL DEFAULT '19:00',
    "perServiceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAppointments" INTEGER NOT NULL DEFAULT 0,
    "completedAppointments" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetGroomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToyProductProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "categoryType" "ToyCategoryType",
    "ageGroup" "ToyAgeGroup" NOT NULL DEFAULT 'ALL_AGES',
    "ageGroups" "ToyAgeGroup"[] DEFAULT ARRAY[]::"ToyAgeGroup"[],
    "ageMinYears" DOUBLE PRECISION,
    "ageMaxYears" DOUBLE PRECISION,
    "genderTarget" "ToyGenderTarget" NOT NULL DEFAULT 'UNISEX',
    "brand" TEXT,
    "characterFranchise" TEXT,
    "themeCategory" TEXT,
    "isEducational" BOOLEAN NOT NULL DEFAULT false,
    "learningAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "developmentSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cognitiveCategory" TEXT,
    "material" TEXT,
    "materialsUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "colorName" TEXT,
    "colorHex" TEXT,
    "size" TEXT,
    "dimensions" TEXT,
    "weightGrams" DOUBLE PRECISION,
    "numberOfPieces" INTEGER,
    "requiresBatteries" BOOLEAN NOT NULL DEFAULT false,
    "batteriesIncluded" BOOLEAN NOT NULL DEFAULT false,
    "batteryType" TEXT,
    "batteryQuantity" INTEGER,
    "isRemoteControlled" BOOLEAN NOT NULL DEFAULT false,
    "rcRange" TEXT,
    "rcChargingTime" TEXT,
    "rcRunTime" TEXT,
    "rcFrequency" TEXT,
    "safetyCertifications" "ToySafetyCertification"[] DEFAULT ARRAY[]::"ToySafetyCertification"[],
    "safetyWarnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "chokingHazard" BOOLEAN NOT NULL DEFAULT false,
    "smallPartsWarning" BOOLEAN NOT NULL DEFAULT false,
    "isNonToxic" BOOLEAN NOT NULL DEFAULT true,
    "isBpaFree" BOOLEAN NOT NULL DEFAULT false,
    "isPhthalateFree" BOOLEAN NOT NULL DEFAULT false,
    "playerCount" TEXT,
    "playDurationMinutes" INTEGER,
    "isMultiplayer" BOOLEAN NOT NULL DEFAULT false,
    "hasSound" BOOLEAN NOT NULL DEFAULT false,
    "hasLights" BOOLEAN NOT NULL DEFAULT false,
    "hasMotor" BOOLEAN NOT NULL DEFAULT false,
    "isCollectible" BOOLEAN NOT NULL DEFAULT false,
    "languagesSupported" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isMontessoriApproved" BOOLEAN NOT NULL DEFAULT false,
    "isWaldorfApproved" BOOLEAN NOT NULL DEFAULT false,
    "mrp" DOUBLE PRECISION,
    "costPrice" DOUBLE PRECISION,
    "retailPrice" DOUBLE PRECISION,
    "discountedPrice" DOUBLE PRECISION,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "isBirthdayGift" BOOLEAN NOT NULL DEFAULT false,
    "isEidGift" BOOLEAN NOT NULL DEFAULT false,
    "isChristmasGift" BOOLEAN NOT NULL DEFAULT false,
    "warrantyMonths" INTEGER NOT NULL DEFAULT 0,
    "hasReplacementParts" BOOLEAN NOT NULL DEFAULT false,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "giftWrapAvailable" BOOLEAN NOT NULL DEFAULT true,
    "giftMessageAvailable" BOOLEAN NOT NULL DEFAULT true,
    "videoUrl" TEXT,
    "instructionUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToyProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToyGiftPack" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "targetAgeGroup" "ToyAgeGroup",
    "targetGender" "ToyGenderTarget",
    "occasion" TEXT,
    "items" JSONB NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "giftPackPrice" DOUBLE PRECISION NOT NULL,
    "savings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "savingsPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isGiftWrapped" BOOLEAN NOT NULL DEFAULT true,
    "includesCard" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isSeasonal" BOOLEAN NOT NULL DEFAULT false,
    "seasonName" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToyGiftPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToyBirthdayReminder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "childName" TEXT NOT NULL,
    "childBirthDate" TIMESTAMP(3) NOT NULL,
    "childGender" "ToyGenderTarget",
    "childInterests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "parentRelation" TEXT,
    "favoriteCategories" "ToyCategoryType"[] DEFAULT ARRAY[]::"ToyCategoryType"[],
    "budgetRange" TEXT,
    "lastPurchaseDate" TIMESTAMP(3),
    "lastGiftGiven" TEXT,
    "totalPurchases" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 7,
    "lastReminderSent" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToyBirthdayReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FurnitureProductProfile_productId_key" ON "FurnitureProductProfile"("productId");

-- CreateIndex
CREATE INDEX "FurnitureProductProfile_tenantId_idx" ON "FurnitureProductProfile"("tenantId");

-- CreateIndex
CREATE INDEX "FurnitureProductProfile_tenantId_categoryType_idx" ON "FurnitureProductProfile"("tenantId", "categoryType");

-- CreateIndex
CREATE INDEX "FurnitureCustomOrder_tenantId_idx" ON "FurnitureCustomOrder"("tenantId");

-- CreateIndex
CREATE INDEX "FurnitureCustomOrder_tenantId_status_idx" ON "FurnitureCustomOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "FurnitureCustomOrder_customerId_idx" ON "FurnitureCustomOrder"("customerId");

-- CreateIndex
CREATE INDEX "FurnitureCustomOrder_carpenterId_idx" ON "FurnitureCustomOrder"("carpenterId");

-- CreateIndex
CREATE UNIQUE INDEX "FurnitureCustomOrder_tenantId_orderNumber_key" ON "FurnitureCustomOrder"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "FurnitureCarpenter_tenantId_idx" ON "FurnitureCarpenter"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "FurnitureCarpenter_tenantId_employeeCode_key" ON "FurnitureCarpenter"("tenantId", "employeeCode");

-- CreateIndex
CREATE INDEX "FurnitureDelivery_tenantId_idx" ON "FurnitureDelivery"("tenantId");

-- CreateIndex
CREATE INDEX "FurnitureDelivery_tenantId_status_idx" ON "FurnitureDelivery"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FurnitureDelivery_tenantId_deliveryNumber_key" ON "FurnitureDelivery"("tenantId", "deliveryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OpticalProductProfile_productId_key" ON "OpticalProductProfile"("productId");

-- CreateIndex
CREATE INDEX "OpticalProductProfile_tenantId_idx" ON "OpticalProductProfile"("tenantId");

-- CreateIndex
CREATE INDEX "OpticalProductProfile_tenantId_categoryType_idx" ON "OpticalProductProfile"("tenantId", "categoryType");

-- CreateIndex
CREATE INDEX "OpticalPrescription_tenantId_idx" ON "OpticalPrescription"("tenantId");

-- CreateIndex
CREATE INDEX "OpticalPrescription_customerId_idx" ON "OpticalPrescription"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "OpticalPrescription_tenantId_prescriptionNumber_key" ON "OpticalPrescription"("tenantId", "prescriptionNumber");

-- CreateIndex
CREATE INDEX "OpticalEyeTest_tenantId_idx" ON "OpticalEyeTest"("tenantId");

-- CreateIndex
CREATE INDEX "OpticalEyeTest_customerId_idx" ON "OpticalEyeTest"("customerId");

-- CreateIndex
CREATE INDEX "OpticalEyeTest_optometristId_idx" ON "OpticalEyeTest"("optometristId");

-- CreateIndex
CREATE INDEX "OpticalEyeTest_appointmentDate_idx" ON "OpticalEyeTest"("appointmentDate");

-- CreateIndex
CREATE UNIQUE INDEX "OpticalEyeTest_tenantId_testNumber_key" ON "OpticalEyeTest"("tenantId", "testNumber");

-- CreateIndex
CREATE INDEX "OpticalOptometrist_tenantId_idx" ON "OpticalOptometrist"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "OpticalOptometrist_tenantId_employeeCode_key" ON "OpticalOptometrist"("tenantId", "employeeCode");

-- CreateIndex
CREATE INDEX "OpticalLensOrder_tenantId_idx" ON "OpticalLensOrder"("tenantId");

-- CreateIndex
CREATE INDEX "OpticalLensOrder_customerId_idx" ON "OpticalLensOrder"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "OpticalLensOrder_tenantId_orderNumber_key" ON "OpticalLensOrder"("tenantId", "orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PetProductProfile_productId_key" ON "PetProductProfile"("productId");

-- CreateIndex
CREATE INDEX "PetProductProfile_tenantId_idx" ON "PetProductProfile"("tenantId");

-- CreateIndex
CREATE INDEX "PetProductProfile_tenantId_categoryType_idx" ON "PetProductProfile"("tenantId", "categoryType");

-- CreateIndex
CREATE INDEX "PetProductProfile_tenantId_species_idx" ON "PetProductProfile"("tenantId", "species");

-- CreateIndex
CREATE INDEX "PetLiveAnimal_tenantId_idx" ON "PetLiveAnimal"("tenantId");

-- CreateIndex
CREATE INDEX "PetLiveAnimal_tenantId_species_idx" ON "PetLiveAnimal"("tenantId", "species");

-- CreateIndex
CREATE INDEX "PetLiveAnimal_tenantId_status_idx" ON "PetLiveAnimal"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PetLiveAnimal_tenantId_animalNumber_key" ON "PetLiveAnimal"("tenantId", "animalNumber");

-- CreateIndex
CREATE INDEX "PetGroomingAppointment_tenantId_idx" ON "PetGroomingAppointment"("tenantId");

-- CreateIndex
CREATE INDEX "PetGroomingAppointment_tenantId_status_idx" ON "PetGroomingAppointment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PetGroomingAppointment_customerId_idx" ON "PetGroomingAppointment"("customerId");

-- CreateIndex
CREATE INDEX "PetGroomingAppointment_groomerId_idx" ON "PetGroomingAppointment"("groomerId");

-- CreateIndex
CREATE INDEX "PetGroomingAppointment_scheduledDate_idx" ON "PetGroomingAppointment"("scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "PetGroomingAppointment_tenantId_appointmentNumber_key" ON "PetGroomingAppointment"("tenantId", "appointmentNumber");

-- CreateIndex
CREATE INDEX "PetGroomer_tenantId_idx" ON "PetGroomer"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PetGroomer_tenantId_employeeCode_key" ON "PetGroomer"("tenantId", "employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "ToyProductProfile_productId_key" ON "ToyProductProfile"("productId");

-- CreateIndex
CREATE INDEX "ToyProductProfile_tenantId_idx" ON "ToyProductProfile"("tenantId");

-- CreateIndex
CREATE INDEX "ToyProductProfile_tenantId_categoryType_idx" ON "ToyProductProfile"("tenantId", "categoryType");

-- CreateIndex
CREATE INDEX "ToyProductProfile_tenantId_ageGroup_idx" ON "ToyProductProfile"("tenantId", "ageGroup");

-- CreateIndex
CREATE INDEX "ToyProductProfile_tenantId_genderTarget_idx" ON "ToyProductProfile"("tenantId", "genderTarget");

-- CreateIndex
CREATE INDEX "ToyGiftPack_tenantId_idx" ON "ToyGiftPack"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ToyGiftPack_tenantId_name_key" ON "ToyGiftPack"("tenantId", "name");

-- CreateIndex
CREATE INDEX "ToyBirthdayReminder_tenantId_idx" ON "ToyBirthdayReminder"("tenantId");

-- CreateIndex
CREATE INDEX "ToyBirthdayReminder_customerId_idx" ON "ToyBirthdayReminder"("customerId");
