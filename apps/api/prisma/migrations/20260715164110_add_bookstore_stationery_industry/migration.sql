-- CreateEnum
CREATE TYPE "BookCategory" AS ENUM ('TEXTBOOK', 'REFERENCE', 'GUIDE', 'WORKBOOK', 'EXAM_PREP', 'DICTIONARY', 'ATLAS', 'ENCYCLOPEDIA', 'NOVEL', 'SHORT_STORY', 'POETRY', 'DRAMA', 'FANTASY', 'MYSTERY', 'ROMANCE', 'THRILLER', 'SCIENCE_FICTION', 'HISTORICAL_FICTION', 'BIOGRAPHY', 'AUTOBIOGRAPHY', 'HISTORY', 'PHILOSOPHY', 'RELIGION', 'SELF_HELP', 'BUSINESS', 'ECONOMICS', 'SCIENCE', 'TECHNOLOGY', 'COOKING', 'TRAVEL', 'ART_BOOK', 'MUSIC_BOOK', 'CHILDREN', 'PICTURE_BOOK', 'ACTIVITY_BOOK', 'COLORING_BOOK', 'STORYBOOK', 'COMICS', 'MANGA', 'QURAN', 'HADITH', 'SEERAH', 'FIQH', 'ISLAMIC_HISTORY', 'ISLAMIC_STUDIES', 'DUA_BOOK', 'URDU', 'ENGLISH_LANGUAGE', 'ARABIC', 'OTHER_LANGUAGE', 'MAGAZINE', 'NEWSPAPER', 'JOURNAL', 'OTHER');

-- CreateEnum
CREATE TYPE "StationeryCategory" AS ENUM ('PEN_BALLPOINT', 'PEN_GEL', 'PEN_FOUNTAIN', 'PEN_MARKER', 'PENCIL_HB', 'PENCIL_COLOR', 'PENCIL_MECHANICAL', 'HIGHLIGHTER', 'CRAYON', 'CHALK', 'NOTEBOOK', 'REGISTER', 'DIARY', 'SKETCHBOOK', 'PAD', 'LOOSE_PAPER', 'GRAPH_PAPER', 'ENVELOPE', 'LETTER_HEAD', 'CHART_PAPER', 'CARD_PAPER', 'STICKY_NOTES', 'ERASER', 'SHARPENER', 'RULER', 'SCALE', 'COMPASS', 'PROTRACTOR', 'DIVIDER', 'GEOMETRY_BOX', 'CALCULATOR', 'SCISSORS', 'STAPLER', 'PUNCHER', 'CLIPBOARD', 'GLUE', 'GUM', 'TAPE', 'DOUBLE_TAPE', 'MASKING_TAPE', 'FILE_FOLDER', 'BINDER', 'ENVELOPE_FILE', 'BOX_FILE', 'ARCH_FILE', 'CLIP', 'PAPER_CLIP', 'STAMP_PAD', 'STAMP', 'MARKER_PERMANENT', 'MARKER_WHITEBOARD', 'WHITEBOARD', 'DUSTER', 'PAPER_TRAY', 'SCHOOL_BAG', 'LUNCH_BOX', 'WATER_BOTTLE', 'PENCIL_POUCH', 'BOOK_COVER', 'BOOK_MARK', 'BADGE', 'ID_CARD_HOLDER', 'OTHER');

-- CreateEnum
CREATE TYPE "ArtSupplyCategory" AS ENUM ('CANVAS_ROLL', 'CANVAS_STRETCHED', 'CANVAS_PANEL', 'DRAWING_PAPER', 'WATERCOLOR_PAPER', 'ACRYLIC_PAPER', 'OIL_PAPER', 'SKETCH_PAPER', 'PASTEL_PAPER', 'ACRYLIC_PAINT', 'OIL_PAINT', 'WATERCOLOR_PAINT', 'POSTER_PAINT', 'FABRIC_PAINT', 'GLASS_PAINT', 'GOUACHE', 'TEMPERA', 'SPRAY_PAINT', 'ENAMEL_PAINT', 'BRUSH_FLAT', 'BRUSH_ROUND', 'BRUSH_FILBERT', 'BRUSH_FAN', 'BRUSH_LINER', 'BRUSH_SET', 'PALETTE_KNIFE', 'CHARCOAL', 'PASTEL_OIL', 'PASTEL_CHALK', 'PASTEL_SOFT', 'GRAPHITE', 'CONTE', 'INK_DRAWING', 'CALLIGRAPHY_INK', 'ACRYLIC_MEDIUM', 'OIL_MEDIUM', 'LINSEED_OIL', 'TURPENTINE', 'GESSO', 'VARNISH', 'EASEL', 'PALETTE', 'CANVAS_STRETCHER', 'MAHL_STICK', 'ORIGAMI_PAPER', 'CARDBOARD', 'FOAM_SHEET', 'GLITTER', 'BEADS', 'RIBBON', 'CLAY', 'MODELING_CLAY', 'POLYMER_CLAY', 'PLASTER', 'CALLIGRAPHY_PEN', 'QALAM', 'DAWAT', 'CALLIGRAPHY_INK_BLACK', 'OTHER');

-- CreateEnum
CREATE TYPE "BookCondition" AS ENUM ('NEW', 'USED_LIKE_NEW', 'USED_GOOD', 'USED_ACCEPTABLE', 'OLD_STOCK', 'DAMAGED');

-- CreateEnum
CREATE TYPE "BookBinding" AS ENUM ('HARDCOVER', 'PAPERBACK', 'SPIRAL', 'RING', 'STAPLED', 'LEATHER', 'EBOOK', 'AUDIOBOOK');

-- CreateEnum
CREATE TYPE "SchoolListStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BookRentalStatus" AS ENUM ('ACTIVE', 'RETURNED', 'OVERDUE', 'LOST', 'DAMAGED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Publisher" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "country" TEXT,
    "city" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "contactPerson" TEXT,
    "logoUrl" TEXT,
    "description" TEXT,
    "defaultDiscountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentTerms" TEXT,
    "creditDays" INTEGER NOT NULL DEFAULT 0,
    "totalBooks" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publisher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Author" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "penName" TEXT,
    "nationality" TEXT,
    "bornYear" INTEGER,
    "diedYear" INTEGER,
    "bio" TEXT,
    "photoUrl" TEXT,
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalBooks" INTEGER NOT NULL DEFAULT 0,
    "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "isbn10" TEXT,
    "isbn13" TEXT,
    "publisherBookCode" TEXT,
    "barcode" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "originalTitle" TEXT,
    "category" "BookCategory" NOT NULL DEFAULT 'OTHER',
    "subCategory" TEXT,
    "binding" "BookBinding" NOT NULL DEFAULT 'PAPERBACK',
    "condition" "BookCondition" NOT NULL DEFAULT 'NEW',
    "publisherId" TEXT,
    "edition" TEXT,
    "editionNumber" INTEGER,
    "publishYear" INTEGER,
    "reprintYear" INTEGER,
    "language" TEXT NOT NULL DEFAULT 'English',
    "pageCount" INTEGER,
    "weightGrams" DOUBLE PRECISION,
    "dimensions" TEXT,
    "paperQuality" TEXT,
    "description" TEXT,
    "tableOfContents" TEXT,
    "synopsis" TEXT,
    "isTextbook" BOOLEAN NOT NULL DEFAULT false,
    "grade" TEXT,
    "classLevel" TEXT,
    "subject" TEXT,
    "board" TEXT,
    "curriculum" TEXT,
    "mrp" DOUBLE PRECISION,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isAwardWinner" BOOLEAN NOT NULL DEFAULT false,
    "awardName" TEXT,
    "avgRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "totalRented" INTEGER NOT NULL DEFAULT 0,
    "isRentable" BOOLEAN NOT NULL DEFAULT false,
    "rentalPricePerWeek" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rentalDeposit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookAuthor" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'AUTHOR',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationeryProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "category" "StationeryCategory" NOT NULL DEFAULT 'OTHER',
    "subCategory" TEXT,
    "brand" TEXT,
    "color" TEXT,
    "size" TEXT,
    "weight" DOUBLE PRECISION,
    "dimensions" TEXT,
    "material" TEXT,
    "packSize" INTEGER,
    "packUnit" TEXT,
    "itemsPerPack" INTEGER,
    "isFastMoving" BOOLEAN NOT NULL DEFAULT false,
    "isSchoolItem" BOOLEAN NOT NULL DEFAULT false,
    "isOfficeItem" BOOLEAN NOT NULL DEFAULT false,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StationeryProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtSupplyProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "category" "ArtSupplyCategory" NOT NULL DEFAULT 'OTHER',
    "subCategory" TEXT,
    "brand" TEXT,
    "color" TEXT,
    "colorCode" TEXT,
    "size" TEXT,
    "grade" TEXT,
    "weight" DOUBLE PRECISION,
    "volume" TEXT,
    "dimensions" TEXT,
    "suitableFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isProfessional" BOOLEAN NOT NULL DEFAULT false,
    "isBeginner" BOOLEAN NOT NULL DEFAULT false,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtSupplyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" TEXT,
    "board" TEXT,
    "medium" TEXT,
    "address" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "principalName" TEXT,
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditDays" INTEGER NOT NULL DEFAULT 0,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "logoUrl" TEXT,
    "notes" TEXT,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outstandingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolBookList" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "section" TEXT,
    "medium" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "SchoolListStatus" NOT NULL DEFAULT 'DRAFT',
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bundlePrice" DOUBLE PRECISION,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolBookList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolBookListItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "productId" TEXT,
    "itemName" TEXT NOT NULL,
    "itemType" TEXT NOT NULL DEFAULT 'BOOK',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subject" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolBookListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookRental" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "rentalNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerCnic" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "rentalPrice" DOUBLE PRECISION NOT NULL,
    "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "actualReturnDate" TIMESTAMP(3),
    "status" "BookRentalStatus" NOT NULL DEFAULT 'ACTIVE',
    "fineAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finePerDay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conditionOnIssue" TEXT,
    "conditionOnReturn" TEXT,
    "damageNotes" TEXT,
    "notes" TEXT,
    "issuedById" TEXT,
    "returnedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookRental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerReadingList" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Wishlist',
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerReadingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerReadingListItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "notes" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerReadingListItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Publisher_tenantId_idx" ON "Publisher"("tenantId");

-- CreateIndex
CREATE INDEX "Publisher_tenantId_isActive_idx" ON "Publisher"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Publisher_tenantId_name_key" ON "Publisher"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Author_tenantId_idx" ON "Author"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Author_tenantId_name_key" ON "Author"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "BookProfile_productId_key" ON "BookProfile"("productId");

-- CreateIndex
CREATE INDEX "BookProfile_tenantId_idx" ON "BookProfile"("tenantId");

-- CreateIndex
CREATE INDEX "BookProfile_tenantId_category_idx" ON "BookProfile"("tenantId", "category");

-- CreateIndex
CREATE INDEX "BookProfile_tenantId_isbn13_idx" ON "BookProfile"("tenantId", "isbn13");

-- CreateIndex
CREATE INDEX "BookProfile_tenantId_isbn10_idx" ON "BookProfile"("tenantId", "isbn10");

-- CreateIndex
CREATE INDEX "BookProfile_tenantId_board_grade_idx" ON "BookProfile"("tenantId", "board", "grade");

-- CreateIndex
CREATE INDEX "BookProfile_publisherId_idx" ON "BookProfile"("publisherId");

-- CreateIndex
CREATE INDEX "BookAuthor_bookId_idx" ON "BookAuthor"("bookId");

-- CreateIndex
CREATE INDEX "BookAuthor_authorId_idx" ON "BookAuthor"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "BookAuthor_bookId_authorId_role_key" ON "BookAuthor"("bookId", "authorId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "StationeryProfile_productId_key" ON "StationeryProfile"("productId");

-- CreateIndex
CREATE INDEX "StationeryProfile_tenantId_idx" ON "StationeryProfile"("tenantId");

-- CreateIndex
CREATE INDEX "StationeryProfile_tenantId_category_idx" ON "StationeryProfile"("tenantId", "category");

-- CreateIndex
CREATE INDEX "StationeryProfile_tenantId_brand_idx" ON "StationeryProfile"("tenantId", "brand");

-- CreateIndex
CREATE UNIQUE INDEX "ArtSupplyProfile_productId_key" ON "ArtSupplyProfile"("productId");

-- CreateIndex
CREATE INDEX "ArtSupplyProfile_tenantId_idx" ON "ArtSupplyProfile"("tenantId");

-- CreateIndex
CREATE INDEX "ArtSupplyProfile_tenantId_category_idx" ON "ArtSupplyProfile"("tenantId", "category");

-- CreateIndex
CREATE INDEX "ArtSupplyProfile_tenantId_brand_idx" ON "ArtSupplyProfile"("tenantId", "brand");

-- CreateIndex
CREATE INDEX "School_tenantId_idx" ON "School"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "School_tenantId_name_key" ON "School"("tenantId", "name");

-- CreateIndex
CREATE INDEX "SchoolBookList_tenantId_idx" ON "SchoolBookList"("tenantId");

-- CreateIndex
CREATE INDEX "SchoolBookList_schoolId_idx" ON "SchoolBookList"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolBookList_tenantId_session_idx" ON "SchoolBookList"("tenantId", "session");

-- CreateIndex
CREATE INDEX "SchoolBookListItem_listId_idx" ON "SchoolBookListItem"("listId");

-- CreateIndex
CREATE INDEX "SchoolBookListItem_productId_idx" ON "SchoolBookListItem"("productId");

-- CreateIndex
CREATE INDEX "BookRental_tenantId_idx" ON "BookRental"("tenantId");

-- CreateIndex
CREATE INDEX "BookRental_tenantId_status_idx" ON "BookRental"("tenantId", "status");

-- CreateIndex
CREATE INDEX "BookRental_customerId_idx" ON "BookRental"("customerId");

-- CreateIndex
CREATE INDEX "BookRental_dueDate_idx" ON "BookRental"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "BookRental_tenantId_rentalNumber_key" ON "BookRental"("tenantId", "rentalNumber");

-- CreateIndex
CREATE INDEX "CustomerReadingList_tenantId_idx" ON "CustomerReadingList"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerReadingList_customerId_idx" ON "CustomerReadingList"("customerId");

-- CreateIndex
CREATE INDEX "CustomerReadingListItem_listId_idx" ON "CustomerReadingListItem"("listId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerReadingListItem_listId_productId_key" ON "CustomerReadingListItem"("listId", "productId");

-- AddForeignKey
ALTER TABLE "BookProfile" ADD CONSTRAINT "BookProfile_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookAuthor" ADD CONSTRAINT "BookAuthor_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "BookProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookAuthor" ADD CONSTRAINT "BookAuthor_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolBookList" ADD CONSTRAINT "SchoolBookList_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolBookListItem" ADD CONSTRAINT "SchoolBookListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "SchoolBookList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReadingListItem" ADD CONSTRAINT "CustomerReadingListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "CustomerReadingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
