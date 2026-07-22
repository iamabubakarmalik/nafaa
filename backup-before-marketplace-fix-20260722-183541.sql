--
-- PostgreSQL database dump
--

\restrict x08Jctv7BfXtdGuJNg1KUvffe8s2j7KoPQic5gcy8WddJV8tBcNU5qnGE6O1d3M

-- Dumped from database version 14.21 (Homebrew)
-- Dumped by pg_dump version 14.21 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AdminNotificationPriority; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."AdminNotificationPriority" AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);


ALTER TYPE public."AdminNotificationPriority" OWNER TO abubakarmalik;

--
-- Name: AdminNotificationType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."AdminNotificationType" AS ENUM (
    'NEW_TENANT',
    'NEW_PAYMENT',
    'PAYMENT_APPROVED',
    'PAYMENT_REJECTED',
    'SUBSCRIPTION_EXPIRING',
    'SUBSCRIPTION_CANCELLED',
    'REFERRAL_CONVERTED',
    'TENANT_SUSPENDED',
    'HIGH_VALUE_PAYMENT',
    'SYSTEM_ALERT',
    'USER_ACTION',
    'INFO',
    'WARNING',
    'ERROR',
    'SUCCESS'
);


ALTER TYPE public."AdminNotificationType" OWNER TO abubakarmalik;

--
-- Name: AgriCategory; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."AgriCategory" AS ENUM (
    'SEEDS',
    'FERTILIZER',
    'PESTICIDE',
    'HERBICIDE',
    'FUNGICIDE',
    'INSECTICIDE',
    'ANIMAL_FEED',
    'POULTRY_FEED',
    'CATTLE_FEED',
    'FISH_FEED',
    'VETERINARY_MEDICINE',
    'FARM_TOOLS',
    'IRRIGATION',
    'MACHINERY_PART',
    'MULCH_COVER',
    'GROWTH_HORMONE',
    'SOIL_CONDITIONER',
    'PLANT_NUTRIENT',
    'ORGANIC_INPUT',
    'OTHER'
);


ALTER TYPE public."AgriCategory" OWNER TO abubakarmalik;

--
-- Name: AgriOrderStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."AgriOrderStatus" AS ENUM (
    'DRAFT',
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'READY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'RETURNED',
    'CANCELLED'
);


ALTER TYPE public."AgriOrderStatus" OWNER TO abubakarmalik;

--
-- Name: AmcStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."AmcStatus" AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'CANCELLED',
    'SUSPENDED',
    'RENEWAL_DUE'
);


ALTER TYPE public."AmcStatus" OWNER TO abubakarmalik;

--
-- Name: AmcType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."AmcType" AS ENUM (
    'BASIC',
    'STANDARD',
    'PREMIUM',
    'COMPREHENSIVE',
    'CUSTOM'
);


ALTER TYPE public."AmcType" OWNER TO abubakarmalik;

--
-- Name: AppointmentStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."AppointmentStatus" AS ENUM (
    'SCHEDULED',
    'CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW'
);


ALTER TYPE public."AppointmentStatus" OWNER TO abubakarmalik;

--
-- Name: ArtSupplyCategory; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ArtSupplyCategory" AS ENUM (
    'CANVAS_ROLL',
    'CANVAS_STRETCHED',
    'CANVAS_PANEL',
    'DRAWING_PAPER',
    'WATERCOLOR_PAPER',
    'ACRYLIC_PAPER',
    'OIL_PAPER',
    'SKETCH_PAPER',
    'PASTEL_PAPER',
    'ACRYLIC_PAINT',
    'OIL_PAINT',
    'WATERCOLOR_PAINT',
    'POSTER_PAINT',
    'FABRIC_PAINT',
    'GLASS_PAINT',
    'GOUACHE',
    'TEMPERA',
    'SPRAY_PAINT',
    'ENAMEL_PAINT',
    'BRUSH_FLAT',
    'BRUSH_ROUND',
    'BRUSH_FILBERT',
    'BRUSH_FAN',
    'BRUSH_LINER',
    'BRUSH_SET',
    'PALETTE_KNIFE',
    'CHARCOAL',
    'PASTEL_OIL',
    'PASTEL_CHALK',
    'PASTEL_SOFT',
    'GRAPHITE',
    'CONTE',
    'INK_DRAWING',
    'CALLIGRAPHY_INK',
    'ACRYLIC_MEDIUM',
    'OIL_MEDIUM',
    'LINSEED_OIL',
    'TURPENTINE',
    'GESSO',
    'VARNISH',
    'EASEL',
    'PALETTE',
    'CANVAS_STRETCHER',
    'MAHL_STICK',
    'ORIGAMI_PAPER',
    'CARDBOARD',
    'FOAM_SHEET',
    'GLITTER',
    'BEADS',
    'RIBBON',
    'CLAY',
    'MODELING_CLAY',
    'POLYMER_CLAY',
    'PLASTER',
    'CALLIGRAPHY_PEN',
    'QALAM',
    'DAWAT',
    'CALLIGRAPHY_INK_BLACK',
    'OTHER'
);


ALTER TYPE public."ArtSupplyCategory" OWNER TO abubakarmalik;

--
-- Name: AttendanceStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."AttendanceStatus" AS ENUM (
    'PRESENT',
    'ABSENT',
    'LATE',
    'HALF_DAY',
    'ON_LEAVE',
    'HOLIDAY'
);


ALTER TYPE public."AttendanceStatus" OWNER TO abubakarmalik;

--
-- Name: AuctionStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."AuctionStatus" AS ENUM (
    'DRAFT',
    'SCHEDULED',
    'LIVE',
    'ENDED',
    'CANCELLED'
);


ALTER TYPE public."AuctionStatus" OWNER TO abubakarmalik;

--
-- Name: AuthProvider; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."AuthProvider" AS ENUM (
    'EMAIL',
    'GOOGLE',
    'HYBRID'
);


ALTER TYPE public."AuthProvider" OWNER TO abubakarmalik;

--
-- Name: BakeryCategory; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."BakeryCategory" AS ENUM (
    'CAKE',
    'CUPCAKE',
    'PASTRY',
    'BREAD',
    'BUN',
    'ROLL',
    'BISCUIT',
    'COOKIE',
    'DONUT',
    'MUFFIN',
    'CROISSANT',
    'DANISH',
    'PATTY',
    'PUFF',
    'PIZZA',
    'SANDWICH',
    'BURGER',
    'TART',
    'PIE',
    'CHEESECAKE',
    'DESSERT',
    'BROWNIE',
    'MACARON',
    'SWEETS',
    'BARFI',
    'LADDU',
    'GULAB_JAMUN',
    'RASMALAI',
    'KHEER',
    'CUSTOM_CAKE',
    'WEDDING_CAKE',
    'BIRTHDAY_CAKE',
    'ANNIVERSARY_CAKE',
    'BEVERAGE',
    'ICE_CREAM',
    'OTHER'
);


ALTER TYPE public."BakeryCategory" OWNER TO abubakarmalik;

--
-- Name: BakeryOrderStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."BakeryOrderStatus" AS ENUM (
    'DRAFT',
    'QUOTED',
    'CONFIRMED',
    'DEPOSIT_PAID',
    'IN_PRODUCTION',
    'BAKING',
    'DECORATING',
    'QUALITY_CHECK',
    'READY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED'
);


ALTER TYPE public."BakeryOrderStatus" OWNER TO abubakarmalik;

--
-- Name: BakerySize; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."BakerySize" AS ENUM (
    'MINI',
    'SMALL',
    'MEDIUM',
    'LARGE',
    'EXTRA_LARGE',
    'HALF_KG',
    'ONE_KG',
    'ONE_HALF_KG',
    'TWO_KG',
    'THREE_KG',
    'FIVE_KG',
    'TEN_KG',
    'SLICE',
    'DOZEN',
    'HALF_DOZEN',
    'TRAY',
    'BOX',
    'CUSTOM',
    'HALF_POUND',
    'ONE_POUND',
    'ONE_HALF_POUND',
    'TWO_POUND',
    'THREE_POUND',
    'FIVE_POUND'
);


ALTER TYPE public."BakerySize" OWNER TO abubakarmalik;

--
-- Name: BargainStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."BargainStatus" AS ENUM (
    'PENDING',
    'COUNTER_OFFERED',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED',
    'CONVERTED'
);


ALTER TYPE public."BargainStatus" OWNER TO abubakarmalik;

--
-- Name: BedType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."BedType" AS ENUM (
    'SINGLE_BED',
    'DOUBLE_BED',
    'QUEEN_BED',
    'KING_BED',
    'SOFA_BED',
    'BUNK_BED',
    'TWIN_BEDS',
    'CUSTOM'
);


ALTER TYPE public."BedType" OWNER TO abubakarmalik;

--
-- Name: BillingInterval; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."BillingInterval" AS ENUM (
    'MONTHLY',
    'QUARTERLY',
    'YEARLY'
);


ALTER TYPE public."BillingInterval" OWNER TO abubakarmalik;

--
-- Name: BodyMeasurementType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."BodyMeasurementType" AS ENUM (
    'WEIGHT',
    'HEIGHT',
    'BMI',
    'BODY_FAT',
    'MUSCLE_MASS',
    'CHEST',
    'WAIST',
    'HIPS',
    'BICEPS',
    'THIGHS',
    'CALVES',
    'NECK',
    'SHOULDERS',
    'FOREARMS',
    'BLOOD_PRESSURE',
    'RESTING_HEART_RATE'
);


ALTER TYPE public."BodyMeasurementType" OWNER TO abubakarmalik;

--
-- Name: BookBinding; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."BookBinding" AS ENUM (
    'HARDCOVER',
    'PAPERBACK',
    'SPIRAL',
    'RING',
    'STAPLED',
    'LEATHER',
    'EBOOK',
    'AUDIOBOOK'
);


ALTER TYPE public."BookBinding" OWNER TO abubakarmalik;

--
-- Name: BookCategory; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."BookCategory" AS ENUM (
    'TEXTBOOK',
    'REFERENCE',
    'GUIDE',
    'WORKBOOK',
    'EXAM_PREP',
    'DICTIONARY',
    'ATLAS',
    'ENCYCLOPEDIA',
    'NOVEL',
    'SHORT_STORY',
    'POETRY',
    'DRAMA',
    'FANTASY',
    'MYSTERY',
    'ROMANCE',
    'THRILLER',
    'SCIENCE_FICTION',
    'HISTORICAL_FICTION',
    'BIOGRAPHY',
    'AUTOBIOGRAPHY',
    'HISTORY',
    'PHILOSOPHY',
    'RELIGION',
    'SELF_HELP',
    'BUSINESS',
    'ECONOMICS',
    'SCIENCE',
    'TECHNOLOGY',
    'COOKING',
    'TRAVEL',
    'ART_BOOK',
    'MUSIC_BOOK',
    'CHILDREN',
    'PICTURE_BOOK',
    'ACTIVITY_BOOK',
    'COLORING_BOOK',
    'STORYBOOK',
    'COMICS',
    'MANGA',
    'QURAN',
    'HADITH',
    'SEERAH',
    'FIQH',
    'ISLAMIC_HISTORY',
    'ISLAMIC_STUDIES',
    'DUA_BOOK',
    'URDU',
    'ENGLISH_LANGUAGE',
    'ARABIC',
    'OTHER_LANGUAGE',
    'MAGAZINE',
    'NEWSPAPER',
    'JOURNAL',
    'OTHER'
);


ALTER TYPE public."BookCategory" OWNER TO abubakarmalik;

--
-- Name: BookCondition; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."BookCondition" AS ENUM (
    'NEW',
    'USED_LIKE_NEW',
    'USED_GOOD',
    'USED_ACCEPTABLE',
    'OLD_STOCK',
    'DAMAGED'
);


ALTER TYPE public."BookCondition" OWNER TO abubakarmalik;

--
-- Name: BookRentalStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."BookRentalStatus" AS ENUM (
    'ACTIVE',
    'RETURNED',
    'OVERDUE',
    'LOST',
    'DAMAGED',
    'CANCELLED'
);


ALTER TYPE public."BookRentalStatus" OWNER TO abubakarmalik;

--
-- Name: BookingPaymentType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."BookingPaymentType" AS ENUM (
    'ADVANCE',
    'ADDITIONAL',
    'REFUND'
);


ALTER TYPE public."BookingPaymentType" OWNER TO abubakarmalik;

--
-- Name: BookingSource; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."BookingSource" AS ENUM (
    'DIRECT',
    'WALK_IN',
    'PHONE',
    'WEBSITE',
    'BOOKING_COM',
    'AGODA',
    'EXPEDIA',
    'AIRBNB',
    'TRAVEL_AGENT',
    'CORPORATE',
    'GOVT',
    'REFERRAL',
    'OTHER'
);


ALTER TYPE public."BookingSource" OWNER TO abubakarmalik;

--
-- Name: BookingStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."BookingStatus" AS ENUM (
    'PENDING',
    'ADVANCE_PAID',
    'READY_FOR_PICKUP',
    'CONVERTED',
    'CANCELLED',
    'EXPIRED'
);


ALTER TYPE public."BookingStatus" OWNER TO abubakarmalik;

--
-- Name: BulkJobStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."BulkJobStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'PARTIAL'
);


ALTER TYPE public."BulkJobStatus" OWNER TO abubakarmalik;

--
-- Name: BulkJobType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."BulkJobType" AS ENUM (
    'PRODUCTS',
    'CUSTOMERS',
    'SUPPLIERS',
    'STOCK_ADJUSTMENT',
    'PRICE_UPDATE'
);


ALTER TYPE public."BulkJobType" OWNER TO abubakarmalik;

--
-- Name: CakeFlavor; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."CakeFlavor" AS ENUM (
    'VANILLA',
    'CHOCOLATE',
    'STRAWBERRY',
    'BLACK_FOREST',
    'RED_VELVET',
    'PINEAPPLE',
    'MANGO',
    'BUTTERSCOTCH',
    'COFFEE',
    'CARAMEL',
    'BLUEBERRY',
    'RASPBERRY',
    'LEMON',
    'ORANGE',
    'BANANA',
    'CARROT',
    'FRUIT',
    'TIRAMISU',
    'OREO',
    'KITKAT',
    'FERRERO_ROCHER',
    'NUTELLA',
    'CHEESECAKE',
    'ICE_CREAM',
    'MIXED',
    'CUSTOM_FLAVOR'
);


ALTER TYPE public."CakeFlavor" OWNER TO abubakarmalik;

--
-- Name: CakeShape; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."CakeShape" AS ENUM (
    'ROUND',
    'SQUARE',
    'RECTANGLE',
    'HEART',
    'OVAL',
    'TIER_2',
    'TIER_3',
    'TIER_4',
    'TIER_5',
    'NUMBER',
    'LETTER',
    'CHARACTER',
    'CUSTOM_SHAPE'
);


ALTER TYPE public."CakeShape" OWNER TO abubakarmalik;

--
-- Name: CarpetCutPieceSource; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."CarpetCutPieceSource" AS ENUM (
    'LEFTOVER',
    'CUSTOMER_RETURN',
    'DAMAGED_ROLL',
    'OPENING_STOCK',
    'MANUAL'
);


ALTER TYPE public."CarpetCutPieceSource" OWNER TO abubakarmalik;

--
-- Name: CarpetCutPieceStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."CarpetCutPieceStatus" AS ENUM (
    'AVAILABLE',
    'SOLD',
    'DAMAGED',
    'RESERVED'
);


ALTER TYPE public."CarpetCutPieceStatus" OWNER TO abubakarmalik;

--
-- Name: CarpetRollSource; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."CarpetRollSource" AS ENUM (
    'OPENING_STOCK',
    'PURCHASE',
    'TRANSFER_IN',
    'RETURN',
    'ADJUSTMENT'
);


ALTER TYPE public."CarpetRollSource" OWNER TO abubakarmalik;

--
-- Name: CarpetRollStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."CarpetRollStatus" AS ENUM (
    'ACTIVE',
    'FINISHED',
    'DAMAGED',
    'RESERVED',
    'TRANSFERRED'
);


ALTER TYPE public."CarpetRollStatus" OWNER TO abubakarmalik;

--
-- Name: CashRegisterStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."CashRegisterStatus" AS ENUM (
    'OPEN',
    'CLOSED'
);


ALTER TYPE public."CashRegisterStatus" OWNER TO abubakarmalik;

--
-- Name: CashTransactionType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."CashTransactionType" AS ENUM (
    'OPENING',
    'SALE',
    'EXPENSE',
    'CASH_IN',
    'CASH_OUT',
    'CLOSING',
    'REFUND'
);


ALTER TYPE public."CashTransactionType" OWNER TO abubakarmalik;

--
-- Name: ClinicAppointmentStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ClinicAppointmentStatus" AS ENUM (
    'SCHEDULED',
    'CONFIRMED',
    'ARRIVED',
    'IN_CONSULTATION',
    'COMPLETED',
    'NO_SHOW',
    'CANCELLED',
    'RESCHEDULED'
);


ALTER TYPE public."ClinicAppointmentStatus" OWNER TO abubakarmalik;

--
-- Name: ClinicBloodGroup; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ClinicBloodGroup" AS ENUM (
    'A_POS',
    'A_NEG',
    'B_POS',
    'B_NEG',
    'AB_POS',
    'AB_NEG',
    'O_POS',
    'O_NEG',
    'UNKNOWN'
);


ALTER TYPE public."ClinicBloodGroup" OWNER TO abubakarmalik;

--
-- Name: ClinicGender; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ClinicGender" AS ENUM (
    'MALE',
    'FEMALE',
    'OTHER',
    'PREFER_NOT_SAY'
);


ALTER TYPE public."ClinicGender" OWNER TO abubakarmalik;

--
-- Name: ClinicLabTestStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ClinicLabTestStatus" AS ENUM (
    'ORDERED',
    'SAMPLE_COLLECTED',
    'IN_PROGRESS',
    'COMPLETED',
    'REPORTED',
    'CANCELLED'
);


ALTER TYPE public."ClinicLabTestStatus" OWNER TO abubakarmalik;

--
-- Name: ClinicPrescriptionStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ClinicPrescriptionStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'DISPENSED',
    'EXPIRED',
    'CANCELLED'
);


ALTER TYPE public."ClinicPrescriptionStatus" OWNER TO abubakarmalik;

--
-- Name: ClinicSpecialty; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ClinicSpecialty" AS ENUM (
    'GENERAL_PRACTITIONER',
    'FAMILY_PHYSICIAN',
    'INTERNAL_MEDICINE',
    'PEDIATRICIAN',
    'GYNECOLOGIST',
    'OBSTETRICIAN',
    'DENTIST',
    'ORTHODONTIST',
    'DERMATOLOGIST',
    'CARDIOLOGIST',
    'NEUROLOGIST',
    'PSYCHIATRIST',
    'PSYCHOLOGIST',
    'ORTHOPEDIC',
    'ENT_SPECIALIST',
    'OPHTHALMOLOGIST',
    'UROLOGIST',
    'NEPHROLOGIST',
    'ENDOCRINOLOGIST',
    'GASTROENTEROLOGIST',
    'PULMONOLOGIST',
    'ONCOLOGIST',
    'RADIOLOGIST',
    'PATHOLOGIST',
    'ANESTHESIOLOGIST',
    'SURGEON',
    'PLASTIC_SURGEON',
    'PHYSIOTHERAPIST',
    'NUTRITIONIST',
    'DIETITIAN',
    'HOMEOPATH',
    'HAKEEM',
    'AYURVEDIC',
    'ACUPUNCTURIST',
    'VETERINARY',
    'MIDWIFE',
    'NURSE_PRACTITIONER',
    'OTHER'
);


ALTER TYPE public."ClinicSpecialty" OWNER TO abubakarmalik;

--
-- Name: ClinicVaccineStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ClinicVaccineStatus" AS ENUM (
    'DUE',
    'ADMINISTERED',
    'DELAYED',
    'SKIPPED',
    'CONTRAINDICATED'
);


ALTER TYPE public."ClinicVaccineStatus" OWNER TO abubakarmalik;

--
-- Name: ClinicVisitType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ClinicVisitType" AS ENUM (
    'FIRST_VISIT',
    'FOLLOW_UP',
    'CONSULTATION',
    'EMERGENCY',
    'ROUTINE_CHECKUP',
    'VACCINATION',
    'PROCEDURE',
    'SURGERY',
    'DENTAL_CHECKUP',
    'ANTENATAL',
    'POSTNATAL',
    'PHYSIO_SESSION',
    'COUNSELING',
    'TELEMEDICINE',
    'HOME_VISIT',
    'OTHER'
);


ALTER TYPE public."ClinicVisitType" OWNER TO abubakarmalik;

--
-- Name: ComboStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ComboStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'EXPIRED',
    'DRAFT'
);


ALTER TYPE public."ComboStatus" OWNER TO abubakarmalik;

--
-- Name: CreamType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."CreamType" AS ENUM (
    'BUTTERCREAM',
    'WHIPPED_CREAM',
    'FRESH_CREAM',
    'GANACHE',
    'FONDANT',
    'CREAM_CHEESE',
    'ROYAL_ICING',
    'MERINGUE',
    'MOUSSE',
    'MIRROR_GLAZE',
    'OTHER'
);


ALTER TYPE public."CreamType" OWNER TO abubakarmalik;

--
-- Name: CreditType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."CreditType" AS ENUM (
    'REFERRAL_BONUS',
    'PROMOTIONAL',
    'REFUND',
    'ADJUSTMENT'
);


ALTER TYPE public."CreditType" OWNER TO abubakarmalik;

--
-- Name: CustomerGender; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."CustomerGender" AS ENUM (
    'MALE',
    'FEMALE',
    'OTHER',
    'PREFER_NOT_TO_SAY'
);


ALTER TYPE public."CustomerGender" OWNER TO abubakarmalik;

--
-- Name: CustomerLedgerType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."CustomerLedgerType" AS ENUM (
    'SALE_CREDIT',
    'PAYMENT_RECEIVED',
    'ADJUSTMENT',
    'OPENING_BALANCE',
    'REFUND',
    'LOYALTY_REDEEMED'
);


ALTER TYPE public."CustomerLedgerType" OWNER TO abubakarmalik;

--
-- Name: DairyBillingCycle; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."DairyBillingCycle" AS ENUM (
    'DAILY',
    'WEEKLY',
    'BIWEEKLY',
    'MONTHLY',
    'QUARTERLY'
);


ALTER TYPE public."DairyBillingCycle" OWNER TO abubakarmalik;

--
-- Name: DairyDeliveryFrequency; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."DairyDeliveryFrequency" AS ENUM (
    'DAILY',
    'ALTERNATE_DAY',
    'WEEKLY',
    'ON_DEMAND',
    'MORNING_ONLY',
    'EVENING_ONLY',
    'MORNING_EVENING'
);


ALTER TYPE public."DairyDeliveryFrequency" OWNER TO abubakarmalik;

--
-- Name: DairyDeliverySlot; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."DairyDeliverySlot" AS ENUM (
    'MORNING',
    'AFTERNOON',
    'EVENING',
    'NIGHT'
);


ALTER TYPE public."DairyDeliverySlot" OWNER TO abubakarmalik;

--
-- Name: DairyDeliveryStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."DairyDeliveryStatus" AS ENUM (
    'SCHEDULED',
    'DELIVERED',
    'SKIPPED',
    'MISSED',
    'RETURNED',
    'CANCELLED'
);


ALTER TYPE public."DairyDeliveryStatus" OWNER TO abubakarmalik;

--
-- Name: DairyKhataStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."DairyKhataStatus" AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'CLOSED',
    'DEFAULTED'
);


ALTER TYPE public."DairyKhataStatus" OWNER TO abubakarmalik;

--
-- Name: DairyMilkQuality; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."DairyMilkQuality" AS ENUM (
    'A_GRADE',
    'B_GRADE',
    'C_GRADE',
    'REJECTED'
);


ALTER TYPE public."DairyMilkQuality" OWNER TO abubakarmalik;

--
-- Name: DairyProductType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."DairyProductType" AS ENUM (
    'FRESH_MILK',
    'BUFFALO_MILK',
    'COW_MILK',
    'GOAT_MILK',
    'MIXED_MILK',
    'BOILED_MILK',
    'RAW_MILK',
    'YOGURT',
    'DAHI',
    'LASSI',
    'BUTTER_MILK',
    'BUTTER',
    'MAKHAN',
    'DESI_GHEE',
    'CREAM',
    'MALAI',
    'KHOA',
    'MAWA',
    'PANEER',
    'CHEESE',
    'KHEER',
    'RABRI',
    'KULFI',
    'SWEETS',
    'ICE_CREAM',
    'MILK_POWDER',
    'OTHER'
);


ALTER TYPE public."DairyProductType" OWNER TO abubakarmalik;

--
-- Name: DairyRouteStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."DairyRouteStatus" AS ENUM (
    'ACTIVE',
    'PAUSED',
    'DISCONTINUED'
);


ALTER TYPE public."DairyRouteStatus" OWNER TO abubakarmalik;

--
-- Name: DairyUnit; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."DairyUnit" AS ENUM (
    'LITER',
    'KG',
    'GRAM',
    'PIECE',
    'PLATE',
    'CUP',
    'BOTTLE',
    'PACKET',
    'KATTA',
    'KILO',
    'MAAN',
    'SEER'
);


ALTER TYPE public."DairyUnit" OWNER TO abubakarmalik;

--
-- Name: DamageReasonCode; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."DamageReasonCode" AS ENUM (
    'EXPIRY',
    'BREAKAGE',
    'SPOILAGE',
    'PEST_DAMAGE',
    'WATER_DAMAGE',
    'THEFT',
    'MISHANDLING',
    'MANUFACTURING_DEFECT',
    'OTHER'
);


ALTER TYPE public."DamageReasonCode" OWNER TO abubakarmalik;

--
-- Name: DamageStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."DamageStatus" AS ENUM (
    'REPORTED',
    'APPROVED',
    'REJECTED',
    'WRITTEN_OFF'
);


ALTER TYPE public."DamageStatus" OWNER TO abubakarmalik;

--
-- Name: DeliveryStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."DeliveryStatus" AS ENUM (
    'QUEUED',
    'SENDING',
    'SENT',
    'DELIVERED',
    'FAILED',
    'BOUNCED'
);


ALTER TYPE public."DeliveryStatus" OWNER TO abubakarmalik;

--
-- Name: DeliveryType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."DeliveryType" AS ENUM (
    'SELF_PICKUP',
    'HOME_DELIVERY',
    'VENUE_DELIVERY',
    'COURIER'
);


ALTER TYPE public."DeliveryType" OWNER TO abubakarmalik;

--
-- Name: DietaryTag; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."DietaryTag" AS ENUM (
    'VEGETARIAN',
    'VEGAN',
    'HALAL',
    'GLUTEN_FREE',
    'DAIRY_FREE',
    'NUT_FREE',
    'SPICY',
    'CONTAINS_EGG',
    'CONTAINS_SEAFOOD',
    'BEEF',
    'CHICKEN',
    'MUTTON'
);


ALTER TYPE public."DietaryTag" OWNER TO abubakarmalik;

--
-- Name: DiscountType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."DiscountType" AS ENUM (
    'PERCENTAGE',
    'FIXED_AMOUNT'
);


ALTER TYPE public."DiscountType" OWNER TO abubakarmalik;

--
-- Name: DrugScheduleClass; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."DrugScheduleClass" AS ENUM (
    'OTC',
    'SCHEDULE_G',
    'SCHEDULE_H',
    'SCHEDULE_X',
    'CONTROLLED',
    'NARCOTIC',
    'PSYCHOTROPIC'
);


ALTER TYPE public."DrugScheduleClass" OWNER TO abubakarmalik;

--
-- Name: EmiInstallmentStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."EmiInstallmentStatus" AS ENUM (
    'PENDING',
    'PAID',
    'OVERDUE',
    'WAIVED'
);


ALTER TYPE public."EmiInstallmentStatus" OWNER TO abubakarmalik;

--
-- Name: EmiPlanStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."EmiPlanStatus" AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'DEFAULTED',
    'CANCELLED'
);


ALTER TYPE public."EmiPlanStatus" OWNER TO abubakarmalik;

--
-- Name: ExchangeType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ExchangeType" AS ENUM (
    'OLD_GOLD_EXCHANGE',
    'OLD_SILVER_EXCHANGE',
    'BROKEN_JEWELRY',
    'PURE_METAL_DEPOSIT',
    'COIN_EXCHANGE',
    'RESIZING',
    'REPAIR',
    'RENOVATION',
    'MELT_AND_REMAKE'
);


ALTER TYPE public."ExchangeType" OWNER TO abubakarmalik;

--
-- Name: ExpenseStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ExpenseStatus" AS ENUM (
    'PENDING',
    'PAID',
    'CANCELLED'
);


ALTER TYPE public."ExpenseStatus" OWNER TO abubakarmalik;

--
-- Name: FarmerAccountStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."FarmerAccountStatus" AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'DEFAULTED',
    'CLOSED',
    'PENDING_APPROVAL'
);


ALTER TYPE public."FarmerAccountStatus" OWNER TO abubakarmalik;

--
-- Name: FeedType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."FeedType" AS ENUM (
    'STARTER',
    'GROWER',
    'FINISHER',
    'LAYER',
    'BREEDER',
    'MILK_REPLACER',
    'MINERAL_MIX',
    'CONCENTRATE',
    'ROUGHAGE',
    'SILAGE',
    'HAY',
    'BRAN',
    'OIL_CAKE',
    'MOLASSES',
    'OTHER'
);


ALTER TYPE public."FeedType" OWNER TO abubakarmalik;

--
-- Name: FertilizerType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."FertilizerType" AS ENUM (
    'UREA',
    'DAP',
    'NPK',
    'POTASH',
    'ZINC',
    'SULFUR',
    'BORON',
    'MICRONUTRIENT',
    'ORGANIC',
    'BIO_FERTILIZER',
    'LIQUID',
    'FOLIAR',
    'OTHER'
);


ALTER TYPE public."FertilizerType" OWNER TO abubakarmalik;

--
-- Name: FolioChargeType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."FolioChargeType" AS ENUM (
    'ROOM',
    'FOOD',
    'BEVERAGE',
    'LAUNDRY',
    'SPA',
    'MINIBAR',
    'TELEPHONE',
    'INTERNET',
    'PARKING',
    'TAX',
    'SERVICE_CHARGE',
    'DAMAGE',
    'MISCELLANEOUS',
    'DISCOUNT',
    'REFUND'
);


ALTER TYPE public."FolioChargeType" OWNER TO abubakarmalik;

--
-- Name: FreshnessStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."FreshnessStatus" AS ENUM (
    'FRESH',
    'DAY_OLD',
    'NEAR_EXPIRY',
    'EXPIRED',
    'DISCARDED'
);


ALTER TYPE public."FreshnessStatus" OWNER TO abubakarmalik;

--
-- Name: FuelType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."FuelType" AS ENUM (
    'PETROL',
    'DIESEL',
    'CNG',
    'LPG',
    'HYBRID',
    'ELECTRIC',
    'OTHER'
);


ALTER TYPE public."FuelType" OWNER TO abubakarmalik;

--
-- Name: GarmentAlterationStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GarmentAlterationStatus" AS ENUM (
    'RECEIVED',
    'MEASUREMENT_TAKEN',
    'IN_PROGRESS',
    'READY',
    'DELIVERED',
    'CANCELLED'
);


ALTER TYPE public."GarmentAlterationStatus" OWNER TO abubakarmalik;

--
-- Name: GarmentCategoryType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GarmentCategoryType" AS ENUM (
    'SHIRT',
    'T_SHIRT',
    'POLO',
    'KURTA',
    'KURTA_SHALWAR',
    'SHALWAR_KAMEEZ',
    'SUIT',
    'THREE_PIECE',
    'TWO_PIECE',
    'WAISTCOAT',
    'TROUSER',
    'JEANS',
    'SHORTS',
    'SKIRT',
    'TOP',
    'FROCK',
    'GOWN',
    'ABAYA',
    'HIJAB',
    'DUPATTA',
    'SAREE',
    'LEHENGA',
    'MAXI',
    'JACKET',
    'COAT',
    'SWEATER',
    'HOODIE',
    'TRACK_SUIT',
    'NIGHTWEAR',
    'UNDERGARMENT',
    'SOCKS',
    'SHOES',
    'SANDALS',
    'ACCESSORY',
    'FABRIC',
    'OTHER'
);


ALTER TYPE public."GarmentCategoryType" OWNER TO abubakarmalik;

--
-- Name: GarmentFabricType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GarmentFabricType" AS ENUM (
    'COTTON',
    'LAWN',
    'LINEN',
    'KHADDAR',
    'KARANDI',
    'SILK',
    'CHIFFON',
    'ORGANZA',
    'VELVET',
    'DENIM',
    'JERSEY',
    'WOOL',
    'POLYESTER',
    'VISCOSE',
    'CAMBRIC',
    'NET',
    'GEORGETTE',
    'LEATHER',
    'MIXED',
    'OTHER'
);


ALTER TYPE public."GarmentFabricType" OWNER TO abubakarmalik;

--
-- Name: GarmentFitType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GarmentFitType" AS ENUM (
    'SLIM',
    'REGULAR',
    'RELAXED',
    'OVERSIZED',
    'SKINNY',
    'STRAIGHT',
    'BOOTCUT',
    'FLARED',
    'CUSTOM'
);


ALTER TYPE public."GarmentFitType" OWNER TO abubakarmalik;

--
-- Name: GarmentGender; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GarmentGender" AS ENUM (
    'MEN',
    'WOMEN',
    'BOYS',
    'GIRLS',
    'UNISEX',
    'KIDS',
    'BABY'
);


ALTER TYPE public."GarmentGender" OWNER TO abubakarmalik;

--
-- Name: GarmentLayawayStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GarmentLayawayStatus" AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'CANCELLED',
    'DEFAULTED',
    'REFUNDED'
);


ALTER TYPE public."GarmentLayawayStatus" OWNER TO abubakarmalik;

--
-- Name: GarmentMeasurementUnit; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GarmentMeasurementUnit" AS ENUM (
    'INCH',
    'CM'
);


ALTER TYPE public."GarmentMeasurementUnit" OWNER TO abubakarmalik;

--
-- Name: GarmentOrderStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GarmentOrderStatus" AS ENUM (
    'DRAFT',
    'QUOTED',
    'CONFIRMED',
    'FABRIC_PENDING',
    'CUTTING',
    'STITCHING',
    'EMBROIDERY',
    'QUALITY_CHECK',
    'READY',
    'DELIVERED',
    'CANCELLED',
    'ON_HOLD'
);


ALTER TYPE public."GarmentOrderStatus" OWNER TO abubakarmalik;

--
-- Name: GarmentPaymentStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GarmentPaymentStatus" AS ENUM (
    'UNPAID',
    'PARTIALLY_PAID',
    'PAID',
    'REFUNDED'
);


ALTER TYPE public."GarmentPaymentStatus" OWNER TO abubakarmalik;

--
-- Name: GarmentPriority; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GarmentPriority" AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);


ALTER TYPE public."GarmentPriority" OWNER TO abubakarmalik;

--
-- Name: GarmentReservationStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GarmentReservationStatus" AS ENUM (
    'ACTIVE',
    'CONVERTED_TO_SALE',
    'EXPIRED',
    'CANCELLED'
);


ALTER TYPE public."GarmentReservationStatus" OWNER TO abubakarmalik;

--
-- Name: GarmentSeason; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GarmentSeason" AS ENUM (
    'SPRING',
    'SUMMER',
    'AUTUMN',
    'WINTER',
    'ALL_SEASON',
    'EID_COLLECTION',
    'WEDDING_COLLECTION',
    'FESTIVE_COLLECTION',
    'RAMADAN_COLLECTION',
    'SCHOOL_COLLECTION'
);


ALTER TYPE public."GarmentSeason" OWNER TO abubakarmalik;

--
-- Name: GarmentWorkType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GarmentWorkType" AS ENUM (
    'PLAIN',
    'PRINTED',
    'EMBROIDERED',
    'HAND_EMBROIDERED',
    'BLOCK_PRINTED',
    'DIGITAL_PRINTED',
    'SEQUIN_WORK',
    'ZARI_WORK',
    'MIRROR_WORK',
    'PEARL_WORK',
    'STONE_WORK',
    'LACE_WORK',
    'PATCH_WORK',
    'OTHER'
);


ALTER TYPE public."GarmentWorkType" OWNER TO abubakarmalik;

--
-- Name: GemstoneType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GemstoneType" AS ENUM (
    'DIAMOND',
    'RUBY',
    'EMERALD',
    'SAPPHIRE',
    'PEARL',
    'OPAL',
    'TOPAZ',
    'AMETHYST',
    'AQUAMARINE',
    'GARNET',
    'TURQUOISE',
    'CORAL',
    'ONYX',
    'JADE',
    'MOONSTONE',
    'CITRINE',
    'TANZANITE',
    'ZIRCON',
    'CZ',
    'KUNDAN_STONE',
    'OTHER',
    'NONE'
);


ALTER TYPE public."GemstoneType" OWNER TO abubakarmalik;

--
-- Name: GroupBuyStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GroupBuyStatus" AS ENUM (
    'ACTIVE',
    'SUCCESS',
    'FAILED',
    'CANCELLED',
    'EXPIRED'
);


ALTER TYPE public."GroupBuyStatus" OWNER TO abubakarmalik;

--
-- Name: GuestIdType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GuestIdType" AS ENUM (
    'CNIC',
    'PASSPORT',
    'DRIVING_LICENSE',
    'NADRA',
    'NIC',
    'IQAMA',
    'OTHER'
);


ALTER TYPE public."GuestIdType" OWNER TO abubakarmalik;

--
-- Name: GymAttendanceMethod; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GymAttendanceMethod" AS ENUM (
    'MANUAL',
    'BIOMETRIC',
    'RFID_CARD',
    'QR_CODE',
    'MOBILE_APP',
    'FACIAL_RECOGNITION'
);


ALTER TYPE public."GymAttendanceMethod" OWNER TO abubakarmalik;

--
-- Name: GymClassStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GymClassStatus" AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'RESCHEDULED'
);


ALTER TYPE public."GymClassStatus" OWNER TO abubakarmalik;

--
-- Name: GymClassType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GymClassType" AS ENUM (
    'YOGA',
    'ZUMBA',
    'AEROBICS',
    'CROSSFIT',
    'HIIT',
    'SPINNING',
    'BOXING',
    'KICKBOXING',
    'MMA',
    'KARATE',
    'DANCE',
    'PILATES',
    'STRETCHING',
    'BOOTCAMP',
    'MEDITATION',
    'BODY_PUMP',
    'OTHER'
);


ALTER TYPE public."GymClassType" OWNER TO abubakarmalik;

--
-- Name: GymEquipmentCategory; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GymEquipmentCategory" AS ENUM (
    'CARDIO',
    'STRENGTH',
    'FREE_WEIGHTS',
    'MACHINES',
    'FUNCTIONAL',
    'YOGA_MAT',
    'BOXING',
    'CROSSFIT',
    'ACCESSORIES',
    'OTHER'
);


ALTER TYPE public."GymEquipmentCategory" OWNER TO abubakarmalik;

--
-- Name: GymEquipmentStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GymEquipmentStatus" AS ENUM (
    'AVAILABLE',
    'IN_USE',
    'MAINTENANCE',
    'OUT_OF_ORDER',
    'RESERVED',
    'RETIRED'
);


ALTER TYPE public."GymEquipmentStatus" OWNER TO abubakarmalik;

--
-- Name: GymGoal; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GymGoal" AS ENUM (
    'WEIGHT_LOSS',
    'MUSCLE_GAIN',
    'BODY_BUILDING',
    'STRENGTH',
    'ENDURANCE',
    'CARDIO',
    'FLEXIBILITY',
    'REHABILITATION',
    'GENERAL_FITNESS',
    'COMPETITION_PREP',
    'WEIGHT_GAIN',
    'TONING',
    'OTHER'
);


ALTER TYPE public."GymGoal" OWNER TO abubakarmalik;

--
-- Name: GymMemberStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GymMemberStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'BANNED'
);


ALTER TYPE public."GymMemberStatus" OWNER TO abubakarmalik;

--
-- Name: GymMembershipPlanType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GymMembershipPlanType" AS ENUM (
    'DAILY',
    'WEEKLY',
    'MONTHLY',
    'QUARTERLY',
    'HALF_YEARLY',
    'YEARLY',
    'LIFETIME',
    'PAY_PER_VISIT',
    'CUSTOM'
);


ALTER TYPE public."GymMembershipPlanType" OWNER TO abubakarmalik;

--
-- Name: GymMembershipStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GymMembershipStatus" AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'PAUSED',
    'CANCELLED',
    'PENDING_PAYMENT',
    'FROZEN'
);


ALTER TYPE public."GymMembershipStatus" OWNER TO abubakarmalik;

--
-- Name: GymTrainerRole; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."GymTrainerRole" AS ENUM (
    'HEAD_TRAINER',
    'PERSONAL_TRAINER',
    'YOGA_INSTRUCTOR',
    'ZUMBA_INSTRUCTOR',
    'CROSSFIT_COACH',
    'CARDIO_COACH',
    'STRENGTH_COACH',
    'NUTRITIONIST',
    'PHYSIOTHERAPIST',
    'MMA_COACH',
    'BOXING_COACH',
    'DANCE_INSTRUCTOR',
    'OTHER'
);


ALTER TYPE public."GymTrainerRole" OWNER TO abubakarmalik;

--
-- Name: HardwareBrandTier; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."HardwareBrandTier" AS ENUM (
    'PREMIUM',
    'STANDARD',
    'ECONOMY',
    'IMPORTED',
    'LOCAL'
);


ALTER TYPE public."HardwareBrandTier" OWNER TO abubakarmalik;

--
-- Name: HardwareCategoryType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."HardwareCategoryType" AS ENUM (
    'CEMENT',
    'STEEL_REBAR',
    'STEEL_SHEET',
    'STEEL_PIPE',
    'BRICKS',
    'BLOCKS',
    'SAND',
    'GRAVEL',
    'CRUSH',
    'TILES_FLOOR',
    'TILES_WALL',
    'MARBLE',
    'GRANITE',
    'SANITARY_WARE',
    'PLUMBING_PIPE',
    'PLUMBING_FITTING',
    'ELECTRIC_WIRE',
    'ELECTRIC_SWITCH',
    'ELECTRIC_CONDUIT',
    'PAINT',
    'PRIMER',
    'THINNER',
    'WOOD_LUMBER',
    'PLYWOOD',
    'MDF',
    'HARDWARE_TOOL',
    'POWER_TOOL',
    'HAND_TOOL',
    'FASTENER',
    'ADHESIVE',
    'WATERPROOFING',
    'INSULATION',
    'DOOR',
    'WINDOW',
    'GLASS',
    'ALUMINUM',
    'IRON_FABRICATION',
    'ROOFING',
    'SAFETY_EQUIPMENT',
    'OTHER'
);


ALTER TYPE public."HardwareCategoryType" OWNER TO abubakarmalik;

--
-- Name: HardwareCreditAccountStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."HardwareCreditAccountStatus" AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'CLOSED',
    'DEFAULTED',
    'OVERDUE'
);


ALTER TYPE public."HardwareCreditAccountStatus" OWNER TO abubakarmalik;

--
-- Name: HardwareCreditTransactionType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."HardwareCreditTransactionType" AS ENUM (
    'SALE',
    'PAYMENT',
    'ADJUSTMENT',
    'REFUND',
    'WRITE_OFF',
    'INTEREST',
    'OPENING_BALANCE'
);


ALTER TYPE public."HardwareCreditTransactionType" OWNER TO abubakarmalik;

--
-- Name: HardwareDeliveryStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."HardwareDeliveryStatus" AS ENUM (
    'PENDING',
    'SCHEDULED',
    'LOADED',
    'DISPATCHED',
    'IN_TRANSIT',
    'DELIVERED',
    'PARTIALLY_DELIVERED',
    'FAILED',
    'CANCELLED',
    'RETURNED'
);


ALTER TYPE public."HardwareDeliveryStatus" OWNER TO abubakarmalik;

--
-- Name: HardwareDeliveryVehicleType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."HardwareDeliveryVehicleType" AS ENUM (
    'PICKUP',
    'MINI_TRUCK',
    'TRUCK',
    'TRAILER',
    'DUMPER',
    'CRANE',
    'RICKSHAW',
    'MOTORCYCLE',
    'CUSTOMER_PICKUP',
    'OTHER'
);


ALTER TYPE public."HardwareDeliveryVehicleType" OWNER TO abubakarmalik;

--
-- Name: HardwareProjectStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."HardwareProjectStatus" AS ENUM (
    'PLANNING',
    'QUOTED',
    'APPROVED',
    'IN_PROGRESS',
    'ON_HOLD',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."HardwareProjectStatus" OWNER TO abubakarmalik;

--
-- Name: HardwareQuotationStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."HardwareQuotationStatus" AS ENUM (
    'DRAFT',
    'SENT',
    'VIEWED',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED',
    'CONVERTED',
    'REVISED'
);


ALTER TYPE public."HardwareQuotationStatus" OWNER TO abubakarmalik;

--
-- Name: HardwareUnit; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."HardwareUnit" AS ENUM (
    'BAG',
    'KG',
    'TON',
    'PIECE',
    'DOZEN',
    'CARTON',
    'METER',
    'FEET',
    'INCH',
    'SQFT',
    'SQMETER',
    'CUBIC_FEET',
    'CUBIC_METER',
    'LITER',
    'GALLON',
    'BUNDLE',
    'ROLL',
    'SHEET',
    'BOX',
    'SET',
    'TRIP'
);


ALTER TYPE public."HardwareUnit" OWNER TO abubakarmalik;

--
-- Name: HotelBookingStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."HotelBookingStatus" AS ENUM (
    'INQUIRY',
    'QUOTED',
    'TENTATIVE',
    'CONFIRMED',
    'CHECKED_IN',
    'CHECKED_OUT',
    'NO_SHOW',
    'CANCELLED',
    'EXTENDED'
);


ALTER TYPE public."HotelBookingStatus" OWNER TO abubakarmalik;

--
-- Name: HousekeepingStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."HousekeepingStatus" AS ENUM (
    'DIRTY',
    'CLEAN',
    'INSPECTED',
    'OUT_OF_ORDER',
    'MAINTENANCE_REQUIRED'
);


ALTER TYPE public."HousekeepingStatus" OWNER TO abubakarmalik;

--
-- Name: ImeiStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ImeiStatus" AS ENUM (
    'IN_STOCK',
    'SOLD',
    'RETURNED',
    'DAMAGED',
    'RESERVED',
    'LOST'
);


ALTER TYPE public."ImeiStatus" OWNER TO abubakarmalik;

--
-- Name: InvoiceStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."InvoiceStatus" AS ENUM (
    'DRAFT',
    'PENDING',
    'PAID',
    'OVERDUE',
    'CANCELLED',
    'REFUNDED'
);


ALTER TYPE public."InvoiceStatus" OWNER TO abubakarmalik;

--
-- Name: JewelryCategory; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."JewelryCategory" AS ENUM (
    'RING',
    'NECKLACE',
    'EARRINGS',
    'BANGLE',
    'BRACELET',
    'ANKLET',
    'PENDANT',
    'CHAIN',
    'NOSE_PIN',
    'NOSE_RING',
    'MAANG_TIKKA',
    'JHUMKA',
    'CHOKER',
    'MANGALSUTRA',
    'HAAR',
    'KUNDAN_SET',
    'BRIDAL_SET',
    'KADA',
    'PAYAL',
    'TOE_RING',
    'BROOCH',
    'CUFFLINK',
    'TIE_PIN',
    'WATCH',
    'COIN',
    'BAR',
    'BULLION',
    'BUTTON',
    'RAKHI',
    'OTHER'
);


ALTER TYPE public."JewelryCategory" OWNER TO abubakarmalik;

--
-- Name: JewelryMetalType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."JewelryMetalType" AS ENUM (
    'GOLD',
    'SILVER',
    'PLATINUM',
    'PALLADIUM',
    'ROSE_GOLD',
    'WHITE_GOLD',
    'IMITATION',
    'MIXED',
    'OTHER'
);


ALTER TYPE public."JewelryMetalType" OWNER TO abubakarmalik;

--
-- Name: JewelryOrderStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."JewelryOrderStatus" AS ENUM (
    'DRAFT',
    'QUOTED',
    'CONFIRMED',
    'DESIGNING',
    'METAL_ISSUED',
    'IN_PRODUCTION',
    'POLISHING',
    'QUALITY_CHECK',
    'HALLMARKING',
    'READY',
    'DELIVERED',
    'CANCELLED',
    'ON_HOLD'
);


ALTER TYPE public."JewelryOrderStatus" OWNER TO abubakarmalik;

--
-- Name: JewelryPurity; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."JewelryPurity" AS ENUM (
    'KARAT_24',
    'KARAT_22',
    'KARAT_21',
    'KARAT_18',
    'KARAT_14',
    'KARAT_10',
    'KARAT_9',
    'STERLING_925',
    'SILVER_999',
    'SILVER_925',
    'SILVER_800',
    'PLATINUM_950',
    'PLATINUM_900',
    'OTHER'
);


ALTER TYPE public."JewelryPurity" OWNER TO abubakarmalik;

--
-- Name: JewelryStyle; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."JewelryStyle" AS ENUM (
    'TRADITIONAL',
    'MODERN',
    'ANTIQUE',
    'BRIDAL',
    'DAILY_WEAR',
    'PARTY_WEAR',
    'KUNDAN',
    'POLKI',
    'MEENAKARI',
    'JADAU',
    'TEMPLE',
    'FILIGREE',
    'HANDMADE',
    'MACHINE_MADE',
    'ITALIAN',
    'TURKISH',
    'DUBAI',
    'INDIAN',
    'PAKISTANI',
    'CUSTOM',
    'OTHER'
);


ALTER TYPE public."JewelryStyle" OWNER TO abubakarmalik;

--
-- Name: JobPriority; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."JobPriority" AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT',
    'EMERGENCY'
);


ALTER TYPE public."JobPriority" OWNER TO abubakarmalik;

--
-- Name: JobStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."JobStatus" AS ENUM (
    'DRAFT',
    'QUOTED',
    'APPROVED',
    'IN_PROGRESS',
    'WAITING_PARTS',
    'WAITING_APPROVAL',
    'READY_FOR_TEST',
    'QUALITY_CHECK',
    'COMPLETED',
    'DELIVERED',
    'CANCELLED',
    'ON_HOLD'
);


ALTER TYPE public."JobStatus" OWNER TO abubakarmalik;

--
-- Name: JobType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."JobType" AS ENUM (
    'GENERAL_SERVICE',
    'OIL_CHANGE',
    'TUNE_UP',
    'MAJOR_SERVICE',
    'MINOR_SERVICE',
    'REPAIR',
    'DIAGNOSTIC',
    'BODY_WORK',
    'PAINT',
    'ELECTRICAL',
    'AC_SERVICE',
    'TIRE_CHANGE',
    'BATTERY_CHANGE',
    'BRAKE_SERVICE',
    'ENGINE_REBUILD',
    'TRANSMISSION_REPAIR',
    'DENTING_PAINTING',
    'WHEEL_ALIGNMENT',
    'ACCIDENT_REPAIR',
    'INSPECTION',
    'MODIFICATION',
    'DETAILING',
    'WASHING',
    'OTHER'
);


ALTER TYPE public."JobType" OWNER TO abubakarmalik;

--
-- Name: KotStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."KotStatus" AS ENUM (
    'PENDING',
    'PRINTED',
    'ACKNOWLEDGED',
    'COOKING',
    'READY',
    'SERVED',
    'CANCELLED'
);


ALTER TYPE public."KotStatus" OWNER TO abubakarmalik;

--
-- Name: LeaveStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."LeaveStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);


ALTER TYPE public."LeaveStatus" OWNER TO abubakarmalik;

--
-- Name: LeaveType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."LeaveType" AS ENUM (
    'CASUAL',
    'SICK',
    'ANNUAL',
    'UNPAID',
    'EMERGENCY',
    'MATERNITY',
    'OTHER'
);


ALTER TYPE public."LeaveType" OWNER TO abubakarmalik;

--
-- Name: LiveShopStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."LiveShopStatus" AS ENUM (
    'SCHEDULED',
    'LIVE',
    'ENDED',
    'CANCELLED'
);


ALTER TYPE public."LiveShopStatus" OWNER TO abubakarmalik;

--
-- Name: LoyaltyTransactionType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."LoyaltyTransactionType" AS ENUM (
    'EARNED',
    'REDEEMED',
    'EXPIRED',
    'ADJUSTMENT'
);


ALTER TYPE public."LoyaltyTransactionType" OWNER TO abubakarmalik;

--
-- Name: MarketplaceAuthProvider; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."MarketplaceAuthProvider" AS ENUM (
    'PHONE_OTP',
    'EMAIL_PASSWORD',
    'GOOGLE',
    'FACEBOOK',
    'APPLE'
);


ALTER TYPE public."MarketplaceAuthProvider" OWNER TO abubakarmalik;

--
-- Name: MarketplaceOrderStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."MarketplaceOrderStatus" AS ENUM (
    'DRAFT',
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED',
    'DISPUTED',
    'RETURNED'
);


ALTER TYPE public."MarketplaceOrderStatus" OWNER TO abubakarmalik;

--
-- Name: MarketplacePaymentMethod; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."MarketplacePaymentMethod" AS ENUM (
    'COD',
    'CARD',
    'JAZZCASH',
    'EASYPAISA',
    'NAYAPAY',
    'SADAPAY',
    'RAAST',
    'BANK_TRANSFER',
    'WALLET',
    'SPLIT'
);


ALTER TYPE public."MarketplacePaymentMethod" OWNER TO abubakarmalik;

--
-- Name: MarketplacePaymentStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."MarketplacePaymentStatus" AS ENUM (
    'PENDING',
    'PAID',
    'PARTIAL',
    'FAILED',
    'REFUNDED'
);


ALTER TYPE public."MarketplacePaymentStatus" OWNER TO abubakarmalik;

--
-- Name: MealPlan; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."MealPlan" AS ENUM (
    'ROOM_ONLY',
    'BED_BREAKFAST',
    'HALF_BOARD',
    'FULL_BOARD',
    'ALL_INCLUSIVE'
);


ALTER TYPE public."MealPlan" OWNER TO abubakarmalik;

--
-- Name: MeatAnimalType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."MeatAnimalType" AS ENUM (
    'BEEF',
    'MUTTON',
    'GOAT',
    'LAMB',
    'CHICKEN',
    'DUCK',
    'TURKEY',
    'QUAIL',
    'CAMEL',
    'BUFFALO',
    'FISH',
    'PRAWN',
    'OTHER'
);


ALTER TYPE public."MeatAnimalType" OWNER TO abubakarmalik;

--
-- Name: MeatCutCategory; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."MeatCutCategory" AS ENUM (
    'WHOLE_ANIMAL',
    'HALF_ANIMAL',
    'QUARTER',
    'PRIMAL_CUT',
    'RETAIL_CUT',
    'BONELESS',
    'WITH_BONE',
    'MINCE',
    'UNDERCUT',
    'RIBS',
    'CHOPS',
    'BREAST',
    'LEG',
    'THIGH',
    'WING',
    'DRUMSTICK',
    'LIVER',
    'KIDNEY',
    'HEART',
    'BRAIN',
    'TONGUE',
    'TROTTERS',
    'HEAD',
    'TAIL',
    'OFFAL',
    'BONES',
    'FAT',
    'SKIN',
    'OTHER'
);


ALTER TYPE public."MeatCutCategory" OWNER TO abubakarmalik;

--
-- Name: MeatFreshnessType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."MeatFreshnessType" AS ENUM (
    'LIVE',
    'FRESH_SLAUGHTERED',
    'FRESH_CHILLED',
    'FROZEN',
    'PREPARED',
    'PROCESSED',
    'MARINATED',
    'SMOKED',
    'DRIED',
    'CURED'
);


ALTER TYPE public."MeatFreshnessType" OWNER TO abubakarmalik;

--
-- Name: MeatOrderStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."MeatOrderStatus" AS ENUM (
    'DRAFT',
    'CONFIRMED',
    'PROCESSING',
    'CUTTING',
    'PACKED',
    'READY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED'
);


ALTER TYPE public."MeatOrderStatus" OWNER TO abubakarmalik;

--
-- Name: MeatQualityGrade; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."MeatQualityGrade" AS ENUM (
    'PREMIUM',
    'GRADE_A',
    'GRADE_B',
    'GRADE_C',
    'STANDARD',
    'ECONOMY'
);


ALTER TYPE public."MeatQualityGrade" OWNER TO abubakarmalik;

--
-- Name: MeatSaleUnit; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."MeatSaleUnit" AS ENUM (
    'KG',
    'GRAM',
    'POUND',
    'PIECE',
    'DOZEN',
    'WHOLE',
    'HALF',
    'QUARTER',
    'KILO_PACK'
);


ALTER TYPE public."MeatSaleUnit" OWNER TO abubakarmalik;

--
-- Name: MeatSlaughterMethod; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."MeatSlaughterMethod" AS ENUM (
    'HALAL_HAND',
    'HALAL_MACHINE',
    'KOSHER',
    'STANDARD',
    'ORGANIC',
    'FREE_RANGE',
    'OTHER'
);


ALTER TYPE public."MeatSlaughterMethod" OWNER TO abubakarmalik;

--
-- Name: MeatSubscriptionFreq; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."MeatSubscriptionFreq" AS ENUM (
    'DAILY',
    'ALTERNATE_DAY',
    'WEEKLY',
    'BIWEEKLY',
    'MONTHLY',
    'CUSTOM'
);


ALTER TYPE public."MeatSubscriptionFreq" OWNER TO abubakarmalik;

--
-- Name: MeatSubscriptionStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."MeatSubscriptionStatus" AS ENUM (
    'ACTIVE',
    'PAUSED',
    'CANCELLED',
    'EXPIRED',
    'COMPLETED'
);


ALTER TYPE public."MeatSubscriptionStatus" OWNER TO abubakarmalik;

--
-- Name: ModifierType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ModifierType" AS ENUM (
    'ADDON',
    'VARIATION',
    'REMOVAL',
    'SPICE_LEVEL',
    'COOKING_STYLE',
    'NOTE'
);


ALTER TYPE public."ModifierType" OWNER TO abubakarmalik;

--
-- Name: NotificationChannel; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."NotificationChannel" AS ENUM (
    'EMAIL',
    'SMS',
    'BOTH',
    'PUSH',
    'IN_APP',
    'WHATSAPP'
);


ALTER TYPE public."NotificationChannel" OWNER TO abubakarmalik;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."NotificationType" AS ENUM (
    'INFO',
    'SUCCESS',
    'WARNING',
    'ERROR',
    'LOW_STOCK',
    'NEW_SALE',
    'PAYMENT_RECEIVED',
    'REGISTER_OPENED',
    'REGISTER_CLOSED',
    'CREDIT_ALERT',
    'RETURN_PROCESSED',
    'SUBSCRIPTION_EXPIRING',
    'PAYMENT_APPROVED',
    'PAYMENT_REJECTED',
    'REFERRAL_EARNED',
    'REFERRAL_SIGNUP'
);


ALTER TYPE public."NotificationType" OWNER TO abubakarmalik;

--
-- Name: PartCategory; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."PartCategory" AS ENUM (
    'ENGINE',
    'TRANSMISSION',
    'BRAKES',
    'SUSPENSION',
    'ELECTRICAL',
    'BATTERY',
    'COOLING',
    'EXHAUST',
    'FUEL_SYSTEM',
    'BODY',
    'INTERIOR',
    'LIGHTING',
    'TIRES_WHEELS',
    'FILTERS',
    'OILS_FLUIDS',
    'BELTS_HOSES',
    'IGNITION',
    'AC_HEATING',
    'STEERING',
    'DRIVETRAIN',
    'BEARINGS',
    'GASKETS',
    'SENSORS',
    'ACCESSORIES',
    'TOOLS',
    'CONSUMABLES',
    'OTHER'
);


ALTER TYPE public."PartCategory" OWNER TO abubakarmalik;

--
-- Name: PartCondition; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."PartCondition" AS ENUM (
    'NEW',
    'USED',
    'REFURBISHED',
    'GENUINE',
    'OEM',
    'AFTERMARKET',
    'LOCAL'
);


ALTER TYPE public."PartCondition" OWNER TO abubakarmalik;

--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'CASH',
    'CARD',
    'BANK_TRANSFER',
    'JAZZCASH',
    'EASYPAISA'
);


ALTER TYPE public."PaymentMethod" OWNER TO abubakarmalik;

--
-- Name: PaymentProvider; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."PaymentProvider" AS ENUM (
    'MANUAL_BANK',
    'JAZZCASH',
    'EASYPAISA',
    'STRIPE',
    'CASH'
);


ALTER TYPE public."PaymentProvider" OWNER TO abubakarmalik;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'REFUNDED'
);


ALTER TYPE public."PaymentStatus" OWNER TO abubakarmalik;

--
-- Name: PrescriptionStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."PrescriptionStatus" AS ENUM (
    'PENDING',
    'VERIFIED',
    'PARTIALLY_DISPENSED',
    'DISPENSED',
    'REJECTED',
    'CANCELLED'
);


ALTER TYPE public."PrescriptionStatus" OWNER TO abubakarmalik;

--
-- Name: PrescriptionType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."PrescriptionType" AS ENUM (
    'WALK_IN',
    'ONLINE',
    'REFILL',
    'HOSPITAL',
    'INSURANCE',
    'EMERGENCY'
);


ALTER TYPE public."PrescriptionType" OWNER TO abubakarmalik;

--
-- Name: ProductionStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ProductionStatus" AS ENUM (
    'PLANNED',
    'IN_PROGRESS',
    'BAKING',
    'COOLING',
    'DECORATING',
    'QUALITY_CHECK',
    'COMPLETED',
    'FAILED',
    'ON_HOLD'
);


ALTER TYPE public."ProductionStatus" OWNER TO abubakarmalik;

--
-- Name: PtaStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."PtaStatus" AS ENUM (
    'APPROVED',
    'NON_PTA',
    'PATCH',
    'PENDING',
    'EXEMPT'
);


ALTER TYPE public."PtaStatus" OWNER TO abubakarmalik;

--
-- Name: PurchaseStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."PurchaseStatus" AS ENUM (
    'PENDING',
    'RECEIVED',
    'CANCELLED'
);


ALTER TYPE public."PurchaseStatus" OWNER TO abubakarmalik;

--
-- Name: QuoteStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."QuoteStatus" AS ENUM (
    'DRAFT',
    'SENT',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED',
    'REVISED'
);


ALTER TYPE public."QuoteStatus" OWNER TO abubakarmalik;

--
-- Name: ReferralStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ReferralStatus" AS ENUM (
    'PENDING',
    'CONVERTED',
    'PAID',
    'EXPIRED'
);


ALTER TYPE public."ReferralStatus" OWNER TO abubakarmalik;

--
-- Name: RefillFrequency; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."RefillFrequency" AS ENUM (
    'DAILY',
    'WEEKLY',
    'BIWEEKLY',
    'MONTHLY',
    'QUARTERLY',
    'AS_NEEDED'
);


ALTER TYPE public."RefillFrequency" OWNER TO abubakarmalik;

--
-- Name: RepairPaymentStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."RepairPaymentStatus" AS ENUM (
    'PENDING',
    'ADVANCE_PAID',
    'FULLY_PAID'
);


ALTER TYPE public."RepairPaymentStatus" OWNER TO abubakarmalik;

--
-- Name: RepairPriority; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."RepairPriority" AS ENUM (
    'NORMAL',
    'URGENT',
    'EMERGENCY'
);


ALTER TYPE public."RepairPriority" OWNER TO abubakarmalik;

--
-- Name: RepairStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."RepairStatus" AS ENUM (
    'RECEIVED',
    'DIAGNOSED',
    'AWAITING_APPROVAL',
    'AWAITING_PARTS',
    'IN_PROGRESS',
    'READY',
    'DELIVERED',
    'CANCELLED',
    'UNREPAIRABLE'
);


ALTER TYPE public."RepairStatus" OWNER TO abubakarmalik;

--
-- Name: RestaurantOrderMode; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."RestaurantOrderMode" AS ENUM (
    'DINE_IN',
    'TAKEAWAY',
    'DELIVERY',
    'DRIVE_THRU',
    'ROOM_SERVICE',
    'PICKUP'
);


ALTER TYPE public."RestaurantOrderMode" OWNER TO abubakarmalik;

--
-- Name: RestaurantOrderStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."RestaurantOrderStatus" AS ENUM (
    'DRAFT',
    'PLACED',
    'CONFIRMED',
    'COOKING',
    'READY',
    'SERVED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'ON_HOLD'
);


ALTER TYPE public."RestaurantOrderStatus" OWNER TO abubakarmalik;

--
-- Name: RestaurantTableStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."RestaurantTableStatus" AS ENUM (
    'AVAILABLE',
    'OCCUPIED',
    'RESERVED',
    'CLEANING',
    'OUT_OF_SERVICE'
);


ALTER TYPE public."RestaurantTableStatus" OWNER TO abubakarmalik;

--
-- Name: ReviewType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ReviewType" AS ENUM (
    'PRODUCT',
    'SHOP',
    'RIDER',
    'ORDER'
);


ALTER TYPE public."ReviewType" OWNER TO abubakarmalik;

--
-- Name: RiderDeliveryStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."RiderDeliveryStatus" AS ENUM (
    'PENDING',
    'ASSIGNED',
    'PICKED_UP',
    'ON_THE_WAY',
    'ARRIVED',
    'DELIVERED',
    'FAILED',
    'RETURNED'
);


ALTER TYPE public."RiderDeliveryStatus" OWNER TO abubakarmalik;

--
-- Name: RiderStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."RiderStatus" AS ENUM (
    'ACTIVE',
    'BUSY',
    'OFFLINE',
    'ON_BREAK',
    'INACTIVE'
);


ALTER TYPE public."RiderStatus" OWNER TO abubakarmalik;

--
-- Name: RoomStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."RoomStatus" AS ENUM (
    'AVAILABLE',
    'OCCUPIED',
    'RESERVED',
    'CLEANING',
    'MAINTENANCE',
    'OUT_OF_ORDER',
    'BLOCKED'
);


ALTER TYPE public."RoomStatus" OWNER TO abubakarmalik;

--
-- Name: RoomType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."RoomType" AS ENUM (
    'SINGLE',
    'DOUBLE',
    'TWIN',
    'TRIPLE',
    'QUAD',
    'FAMILY',
    'SUITE',
    'DELUXE',
    'EXECUTIVE',
    'PRESIDENTIAL',
    'DORMITORY',
    'STUDIO',
    'APARTMENT',
    'VILLA',
    'BUNGALOW',
    'TENT',
    'CABIN',
    'OTHER'
);


ALTER TYPE public."RoomType" OWNER TO abubakarmalik;

--
-- Name: SalaryPaymentStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."SalaryPaymentStatus" AS ENUM (
    'PENDING',
    'PAID',
    'PARTIAL',
    'CANCELLED'
);


ALTER TYPE public."SalaryPaymentStatus" OWNER TO abubakarmalik;

--
-- Name: SalaryType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."SalaryType" AS ENUM (
    'MONTHLY',
    'DAILY',
    'HOURLY',
    'PER_TASK',
    'COMMISSION',
    'HYBRID'
);


ALTER TYPE public."SalaryType" OWNER TO abubakarmalik;

--
-- Name: SaleStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."SaleStatus" AS ENUM (
    'COMPLETED',
    'VOIDED',
    'PARTIALLY_RETURNED',
    'FULLY_RETURNED'
);


ALTER TYPE public."SaleStatus" OWNER TO abubakarmalik;

--
-- Name: SalonAppointmentStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."SalonAppointmentStatus" AS ENUM (
    'DRAFT',
    'CONFIRMED',
    'ARRIVED',
    'IN_PROGRESS',
    'COMPLETED',
    'NO_SHOW',
    'CANCELLED',
    'RESCHEDULED'
);


ALTER TYPE public."SalonAppointmentStatus" OWNER TO abubakarmalik;

--
-- Name: SalonCommissionType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."SalonCommissionType" AS ENUM (
    'NONE',
    'PERCENTAGE',
    'FIXED_PER_SERVICE',
    'TIERED',
    'HYBRID'
);


ALTER TYPE public."SalonCommissionType" OWNER TO abubakarmalik;

--
-- Name: SalonMembershipStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."SalonMembershipStatus" AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'CANCELLED',
    'PAUSED'
);


ALTER TYPE public."SalonMembershipStatus" OWNER TO abubakarmalik;

--
-- Name: SalonMembershipTier; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."SalonMembershipTier" AS ENUM (
    'BRONZE',
    'SILVER',
    'GOLD',
    'PLATINUM',
    'DIAMOND',
    'CUSTOM'
);


ALTER TYPE public."SalonMembershipTier" OWNER TO abubakarmalik;

--
-- Name: SalonPackageStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."SalonPackageStatus" AS ENUM (
    'ACTIVE',
    'USED',
    'EXPIRED',
    'CANCELLED',
    'REFUNDED'
);


ALTER TYPE public."SalonPackageStatus" OWNER TO abubakarmalik;

--
-- Name: SalonServiceCategory; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."SalonServiceCategory" AS ENUM (
    'HAIR_CUT',
    'HAIR_COLOR',
    'HAIR_TREATMENT',
    'HAIR_STYLING',
    'BEARD_SHAVE',
    'FACIAL',
    'MAKEUP',
    'BRIDAL_MAKEUP',
    'PARTY_MAKEUP',
    'MANICURE',
    'PEDICURE',
    'NAIL_ART',
    'WAXING',
    'THREADING',
    'MASSAGE',
    'BODY_TREATMENT',
    'SPA_PACKAGE',
    'MEHNDI',
    'HAIR_EXTENSION',
    'KERATIN',
    'BOTOX',
    'OTHER'
);


ALTER TYPE public."SalonServiceCategory" OWNER TO abubakarmalik;

--
-- Name: SalonStaffRole; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."SalonStaffRole" AS ENUM (
    'STYLIST',
    'COLORIST',
    'BEAUTICIAN',
    'MAKEUP_ARTIST',
    'NAIL_TECH',
    'MASSAGE_THERAPIST',
    'MEHNDI_ARTIST',
    'APPRENTICE',
    'RECEPTIONIST',
    'MANAGER',
    'OTHER'
);


ALTER TYPE public."SalonStaffRole" OWNER TO abubakarmalik;

--
-- Name: SchoolListStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."SchoolListStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'CLOSED',
    'ARCHIVED'
);


ALTER TYPE public."SchoolListStatus" OWNER TO abubakarmalik;

--
-- Name: SeasonType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."SeasonType" AS ENUM (
    'KHARIF',
    'RABI',
    'ZAID',
    'ALL_SEASON',
    'SPRING',
    'SUMMER',
    'MONSOON',
    'WINTER'
);


ALTER TYPE public."SeasonType" OWNER TO abubakarmalik;

--
-- Name: SeedType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."SeedType" AS ENUM (
    'WHEAT',
    'RICE',
    'COTTON',
    'MAIZE',
    'SUGARCANE',
    'POTATO',
    'ONION',
    'TOMATO',
    'CHILLI',
    'PULSES',
    'VEGETABLES',
    'FRUITS',
    'FODDER',
    'OILSEEDS',
    'OTHER'
);


ALTER TYPE public."SeedType" OWNER TO abubakarmalik;

--
-- Name: ServiceBusinessType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ServiceBusinessType" AS ENUM (
    'ELECTRICIAN',
    'PLUMBER',
    'AC_TECHNICIAN',
    'APPLIANCE_REPAIR',
    'MOBILE_REPAIR',
    'COMPUTER_REPAIR',
    'IT_SERVICES',
    'CLEANING',
    'PEST_CONTROL',
    'CARPENTRY',
    'PAINTING',
    'MASONRY',
    'WELDING',
    'GLASS_WORK',
    'CCTV_INSTALLATION',
    'SOLAR_INSTALLATION',
    'GENERATOR_SERVICE',
    'UPS_SERVICE',
    'WATER_TANK_CLEANING',
    'HOME_MAINTENANCE',
    'OFFICE_MAINTENANCE',
    'AUTOMOBILE_MECHANIC',
    'MOTORCYCLE_MECHANIC',
    'MOVERS_PACKERS',
    'INTERIOR_DESIGN',
    'LANDSCAPING',
    'HVAC',
    'ELEVATOR_MAINTENANCE',
    'FIRE_SAFETY',
    'SECURITY_SYSTEMS',
    'OTHER'
);


ALTER TYPE public."ServiceBusinessType" OWNER TO abubakarmalik;

--
-- Name: ServiceCategory; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ServiceCategory" AS ENUM (
    'INSTALLATION',
    'REPAIR',
    'MAINTENANCE',
    'INSPECTION',
    'CLEANING_SERVICE',
    'UPGRADE',
    'REPLACEMENT',
    'DIAGNOSTIC',
    'EMERGENCY',
    'CONSULTATION',
    'AMC_VISIT',
    'WARRANTY_CLAIM',
    'RETURN_VISIT',
    'OTHER_SERVICE'
);


ALTER TYPE public."ServiceCategory" OWNER TO abubakarmalik;

--
-- Name: ServiceChargeType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ServiceChargeType" AS ENUM (
    'FIXED',
    'HOURLY',
    'PER_VISIT',
    'DISTANCE_BASED',
    'COMPLEXITY_BASED',
    'QUOTE_BASED',
    'FREE_UNDER_WARRANTY',
    'FREE_UNDER_AMC'
);


ALTER TYPE public."ServiceChargeType" OWNER TO abubakarmalik;

--
-- Name: ServiceJobStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ServiceJobStatus" AS ENUM (
    'DRAFT',
    'ENQUIRY',
    'QUOTED',
    'CONFIRMED',
    'SCHEDULED',
    'ASSIGNED',
    'DISPATCHED',
    'EN_ROUTE',
    'ARRIVED',
    'IN_PROGRESS',
    'PAUSED',
    'AWAITING_PARTS',
    'AWAITING_APPROVAL',
    'QUALITY_CHECK',
    'COMPLETED',
    'UNABLE_TO_COMPLETE',
    'RESCHEDULED',
    'CANCELLED',
    'WARRANTY_HOLD',
    'DISPUTED'
);


ALTER TYPE public."ServiceJobStatus" OWNER TO abubakarmalik;

--
-- Name: ServiceLocationType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ServiceLocationType" AS ENUM (
    'CUSTOMER_HOME',
    'CUSTOMER_OFFICE',
    'CUSTOMER_SHOP',
    'IN_SHOP',
    'ONLINE_REMOTE',
    'FIELD_SITE',
    'OTHER'
);


ALTER TYPE public."ServiceLocationType" OWNER TO abubakarmalik;

--
-- Name: ServicePriority; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ServicePriority" AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT',
    'EMERGENCY'
);


ALTER TYPE public."ServicePriority" OWNER TO abubakarmalik;

--
-- Name: ShopType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ShopType" AS ENUM (
    'SHOP',
    'WAREHOUSE',
    'GODOWN'
);


ALTER TYPE public."ShopType" OWNER TO abubakarmalik;

--
-- Name: ShopVerificationLevel; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."ShopVerificationLevel" AS ENUM (
    'UNVERIFIED',
    'BRONZE',
    'SILVER',
    'GOLD',
    'PLATINUM'
);


ALTER TYPE public."ShopVerificationLevel" OWNER TO abubakarmalik;

--
-- Name: SpiceLevel; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."SpiceLevel" AS ENUM (
    'NONE',
    'MILD',
    'MEDIUM',
    'HOT',
    'EXTRA_HOT'
);


ALTER TYPE public."SpiceLevel" OWNER TO abubakarmalik;

--
-- Name: StaffGender; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."StaffGender" AS ENUM (
    'MALE',
    'FEMALE',
    'OTHER'
);


ALTER TYPE public."StaffGender" OWNER TO abubakarmalik;

--
-- Name: StaffStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."StaffStatus" AS ENUM (
    'ACTIVE',
    'ON_LEAVE',
    'SUSPENDED',
    'TERMINATED',
    'RESIGNED'
);


ALTER TYPE public."StaffStatus" OWNER TO abubakarmalik;

--
-- Name: StationeryCategory; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."StationeryCategory" AS ENUM (
    'PEN_BALLPOINT',
    'PEN_GEL',
    'PEN_FOUNTAIN',
    'PEN_MARKER',
    'PENCIL_HB',
    'PENCIL_COLOR',
    'PENCIL_MECHANICAL',
    'HIGHLIGHTER',
    'CRAYON',
    'CHALK',
    'NOTEBOOK',
    'REGISTER',
    'DIARY',
    'SKETCHBOOK',
    'PAD',
    'LOOSE_PAPER',
    'GRAPH_PAPER',
    'ENVELOPE',
    'LETTER_HEAD',
    'CHART_PAPER',
    'CARD_PAPER',
    'STICKY_NOTES',
    'ERASER',
    'SHARPENER',
    'RULER',
    'SCALE',
    'COMPASS',
    'PROTRACTOR',
    'DIVIDER',
    'GEOMETRY_BOX',
    'CALCULATOR',
    'SCISSORS',
    'STAPLER',
    'PUNCHER',
    'CLIPBOARD',
    'GLUE',
    'GUM',
    'TAPE',
    'DOUBLE_TAPE',
    'MASKING_TAPE',
    'FILE_FOLDER',
    'BINDER',
    'ENVELOPE_FILE',
    'BOX_FILE',
    'ARCH_FILE',
    'CLIP',
    'PAPER_CLIP',
    'STAMP_PAD',
    'STAMP',
    'MARKER_PERMANENT',
    'MARKER_WHITEBOARD',
    'WHITEBOARD',
    'DUSTER',
    'PAPER_TRAY',
    'SCHOOL_BAG',
    'LUNCH_BOX',
    'WATER_BOTTLE',
    'PENCIL_POUCH',
    'BOOK_COVER',
    'BOOK_MARK',
    'BADGE',
    'ID_CARD_HOLDER',
    'OTHER'
);


ALTER TYPE public."StationeryCategory" OWNER TO abubakarmalik;

--
-- Name: StockMovementType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."StockMovementType" AS ENUM (
    'PURCHASE_IN',
    'SALE_OUT',
    'ADJUSTMENT_IN',
    'ADJUSTMENT_OUT',
    'RETURN_IN',
    'OPENING_BALANCE',
    'DAMAGE',
    'LOSS',
    'TRANSFER_IN',
    'TRANSFER_OUT'
);


ALTER TYPE public."StockMovementType" OWNER TO abubakarmalik;

--
-- Name: StorageCondition; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."StorageCondition" AS ENUM (
    'ROOM_TEMPERATURE',
    'COOL',
    'REFRIGERATED',
    'FROZEN',
    'CONTROLLED_ROOM',
    'PROTECT_FROM_LIGHT',
    'PROTECT_FROM_MOISTURE'
);


ALTER TYPE public."StorageCondition" OWNER TO abubakarmalik;

--
-- Name: SubscriptionStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."SubscriptionStatus" AS ENUM (
    'TRIAL',
    'ACTIVE',
    'PAST_DUE',
    'CANCELLED',
    'EXPIRED',
    'PENDING_PAYMENT'
);


ALTER TYPE public."SubscriptionStatus" OWNER TO abubakarmalik;

--
-- Name: SupportTicketPriority; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."SupportTicketPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);


ALTER TYPE public."SupportTicketPriority" OWNER TO abubakarmalik;

--
-- Name: SupportTicketStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."SupportTicketStatus" AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'WAITING_CUSTOMER',
    'RESOLVED',
    'CLOSED'
);


ALTER TYPE public."SupportTicketStatus" OWNER TO abubakarmalik;

--
-- Name: TableStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."TableStatus" AS ENUM (
    'AVAILABLE',
    'OCCUPIED',
    'RESERVED',
    'CLEANING',
    'OUT_OF_SERVICE'
);


ALTER TYPE public."TableStatus" OWNER TO abubakarmalik;

--
-- Name: TechnicianLevel; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."TechnicianLevel" AS ENUM (
    'APPRENTICE',
    'JUNIOR',
    'SENIOR',
    'EXPERT',
    'MASTER',
    'SUPERVISOR',
    'MANAGER'
);


ALTER TYPE public."TechnicianLevel" OWNER TO abubakarmalik;

--
-- Name: TechnicianStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."TechnicianStatus" AS ENUM (
    'AVAILABLE',
    'ON_JOB',
    'ON_BREAK',
    'OFF_DUTY',
    'ON_LEAVE',
    'UNAVAILABLE'
);


ALTER TYPE public."TechnicianStatus" OWNER TO abubakarmalik;

--
-- Name: TenantStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."TenantStatus" AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'TRIAL',
    'EXPIRED'
);


ALTER TYPE public."TenantStatus" OWNER TO abubakarmalik;

--
-- Name: TradeInSource; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."TradeInSource" AS ENUM (
    'CASH_BUYBACK',
    'EXCHANGE',
    'CONSIGNMENT'
);


ALTER TYPE public."TradeInSource" OWNER TO abubakarmalik;

--
-- Name: TransferStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."TransferStatus" AS ENUM (
    'PENDING',
    'IN_TRANSIT',
    'RECEIVED',
    'CANCELLED'
);


ALTER TYPE public."TransferStatus" OWNER TO abubakarmalik;

--
-- Name: TransmissionType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."TransmissionType" AS ENUM (
    'MANUAL',
    'AUTOMATIC',
    'CVT',
    'DCT',
    'SEMI_AUTO'
);


ALTER TYPE public."TransmissionType" OWNER TO abubakarmalik;

--
-- Name: UnitConversionType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."UnitConversionType" AS ENUM (
    'BASE',
    'PACK',
    'BOX',
    'DOZEN',
    'CARTON',
    'KG_TO_GRAM',
    'L_TO_ML',
    'CUSTOM'
);


ALTER TYPE public."UnitConversionType" OWNER TO abubakarmalik;

--
-- Name: UsedPhoneCondition; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."UsedPhoneCondition" AS ENUM (
    'EXCELLENT',
    'VERY_GOOD',
    'GOOD',
    'FAIR',
    'POOR'
);


ALTER TYPE public."UsedPhoneCondition" OWNER TO abubakarmalik;

--
-- Name: UsedPhoneStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."UsedPhoneStatus" AS ENUM (
    'PENDING_INSPECTION',
    'IN_STOCK',
    'REPAIRING',
    'SOLD',
    'RETURNED',
    'DISCARDED'
);


ALTER TYPE public."UsedPhoneStatus" OWNER TO abubakarmalik;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."UserRole" AS ENUM (
    'OWNER',
    'MANAGER',
    'CASHIER',
    'STAFF',
    'SUPER_ADMIN'
);


ALTER TYPE public."UserRole" OWNER TO abubakarmalik;

--
-- Name: VehicleType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."VehicleType" AS ENUM (
    'CAR',
    'SUV',
    'VAN',
    'PICKUP',
    'TRUCK',
    'BUS',
    'MOTORCYCLE',
    'SCOOTER',
    'RICKSHAW',
    'TRACTOR',
    'BICYCLE',
    'ATV',
    'BOAT',
    'OTHER'
);


ALTER TYPE public."VehicleType" OWNER TO abubakarmalik;

--
-- Name: WalletTransactionType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."WalletTransactionType" AS ENUM (
    'CREDIT',
    'DEBIT',
    'CASHBACK',
    'REFUND',
    'REFERRAL_BONUS',
    'PROMOTIONAL'
);


ALTER TYPE public."WalletTransactionType" OWNER TO abubakarmalik;

--
-- Name: WarrantyStatus; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."WarrantyStatus" AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'VOID',
    'CLAIMED',
    'NONE'
);


ALTER TYPE public."WarrantyStatus" OWNER TO abubakarmalik;

--
-- Name: WarrantyType; Type: TYPE; Schema: public; Owner: abubakarmalik
--

CREATE TYPE public."WarrantyType" AS ENUM (
    'MANUFACTURER',
    'SERVICE_PROVIDER',
    'EXTENDED',
    'PARTS_ONLY',
    'LABOR_ONLY',
    'FULL',
    'NONE'
);


ALTER TYPE public."WarrantyType" OWNER TO abubakarmalik;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ActivityLog; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ActivityLog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "userId" text,
    action text NOT NULL,
    "entityType" text,
    "entityId" text,
    description text NOT NULL,
    metadata jsonb,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ActivityLog" OWNER TO abubakarmalik;

--
-- Name: AdminNotification; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."AdminNotification" (
    id text NOT NULL,
    type public."AdminNotificationType" DEFAULT 'INFO'::public."AdminNotificationType" NOT NULL,
    priority public."AdminNotificationPriority" DEFAULT 'NORMAL'::public."AdminNotificationPriority" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    metadata jsonb,
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    "readById" text,
    "tenantId" text,
    "entityType" text,
    "entityId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AdminNotification" OWNER TO abubakarmalik;

--
-- Name: AgriBulkOrder; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."AgriBulkOrder" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "orderNumber" text NOT NULL,
    "farmerId" text,
    "customerId" text,
    "customerName" text,
    "customerPhone" text,
    "orderDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deliveryDate" timestamp(3) without time zone,
    status public."AgriOrderStatus" DEFAULT 'DRAFT'::public."AgriOrderStatus" NOT NULL,
    season public."SeasonType",
    "cropTarget" text,
    "landAreaAcres" double precision,
    "isDelivery" boolean DEFAULT false NOT NULL,
    "deliveryAddress" text,
    "deliveryCharges" double precision DEFAULT 0 NOT NULL,
    "transportType" text,
    "vehicleNumber" text,
    subtotal double precision DEFAULT 0 NOT NULL,
    "bulkDiscount" double precision DEFAULT 0 NOT NULL,
    "taxAmount" double precision DEFAULT 0 NOT NULL,
    "otherCharges" double precision DEFAULT 0 NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "paymentStatus" text DEFAULT 'UNPAID'::text NOT NULL,
    "paymentMethod" text,
    "isCredit" boolean DEFAULT false NOT NULL,
    "creditDueDate" timestamp(3) without time zone,
    "advisorNotes" text,
    "farmerNotes" text,
    "cancellationReason" text,
    "createdById" text,
    "deliveredBy" text,
    "cancelledAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AgriBulkOrder" OWNER TO abubakarmalik;

--
-- Name: AgriBulkOrderItem; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."AgriBulkOrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productId" text,
    "productName" text NOT NULL,
    category public."AgriCategory",
    quantity double precision NOT NULL,
    unit text NOT NULL,
    "pricePerUnit" double precision NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    "batchNumber" text,
    "expiryDate" timestamp(3) without time zone,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AgriBulkOrderItem" OWNER TO abubakarmalik;

--
-- Name: AgriCropAdvisory; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."AgriCropAdvisory" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "advisoryNumber" text NOT NULL,
    "farmerId" text,
    "advisorId" text,
    "advisorName" text,
    "cropName" text NOT NULL,
    "cropVariety" text,
    season public."SeasonType",
    "landAreaAcres" double precision,
    stage text,
    "sowingDate" timestamp(3) without time zone,
    "expectedHarvest" timestamp(3) without time zone,
    "currentIssues" text,
    "soilTestResult" jsonb,
    "waterTestResult" jsonb,
    recommendations jsonb,
    "productSuggestions" jsonb,
    "followUpDate" timestamp(3) without time zone,
    completed boolean DEFAULT false NOT NULL,
    notes text,
    "attachmentUrls" text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AgriCropAdvisory" OWNER TO abubakarmalik;

--
-- Name: AgriFarmer; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."AgriFarmer" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerId" text,
    "farmerNumber" text NOT NULL,
    "fullName" text NOT NULL,
    "fatherName" text,
    cnic text,
    phone text NOT NULL,
    "altPhone" text,
    village text,
    tehsil text,
    district text,
    province text,
    address text,
    landmark text,
    "landAreaAcres" double precision,
    "landAreaKanals" double precision,
    "landOwnership" text,
    "soilType" text,
    "waterSource" text,
    "irrigationType" text,
    "farmingType" text[] DEFAULT ARRAY[]::text[],
    "primaryCrops" text[] DEFAULT ARRAY[]::text[],
    livestock jsonb,
    "cnicFrontUrl" text,
    "cnicBackUrl" text,
    "landDocUrl" text,
    "photoUrl" text,
    "creditLimit" double precision DEFAULT 0 NOT NULL,
    "currentBalance" double precision DEFAULT 0 NOT NULL,
    "creditDays" integer DEFAULT 60 NOT NULL,
    "interestRate" double precision DEFAULT 0 NOT NULL,
    "currentSeason" public."SeasonType",
    "currentCrop" text,
    "totalOrders" integer DEFAULT 0 NOT NULL,
    "totalPurchases" double precision DEFAULT 0 NOT NULL,
    "totalOutstanding" double precision DEFAULT 0 NOT NULL,
    "totalPaid" double precision DEFAULT 0 NOT NULL,
    "lastPurchaseAt" timestamp(3) without time zone,
    status public."FarmerAccountStatus" DEFAULT 'ACTIVE'::public."FarmerAccountStatus" NOT NULL,
    "registeredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "suspendedAt" timestamp(3) without time zone,
    "suspensionReason" text,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AgriFarmer" OWNER TO abubakarmalik;

--
-- Name: AgriFarmerLedger; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."AgriFarmerLedger" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "farmerId" text NOT NULL,
    "entryNumber" text NOT NULL,
    "entryDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "entryType" text NOT NULL,
    description text NOT NULL,
    reference text,
    debit double precision DEFAULT 0 NOT NULL,
    credit double precision DEFAULT 0 NOT NULL,
    balance double precision DEFAULT 0 NOT NULL,
    "saleId" text,
    "paymentId" text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AgriFarmerLedger" OWNER TO abubakarmalik;

--
-- Name: AgriProductProfile; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."AgriProductProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    category public."AgriCategory" NOT NULL,
    "subCategory" text,
    "seedType" public."SeedType",
    "fertilizerType" public."FertilizerType",
    "feedType" public."FeedType",
    brand text,
    manufacturer text,
    "countryOfOrigin" text,
    "npkRatio" text,
    "activeIngredient" text,
    ingredients jsonb,
    concentration text,
    "packSize" text,
    "packUnit" text,
    "bagsPerTon" integer,
    "applicationRate" text,
    "applicationMethod" text,
    "applicationInterval" text,
    "targetCrops" text[] DEFAULT ARRAY[]::text[],
    "targetPests" text[] DEFAULT ARRAY[]::text[],
    "targetAnimals" text[] DEFAULT ARRAY[]::text[],
    season public."SeasonType",
    "suitableFor" text[] DEFAULT ARRAY[]::text[],
    "cropStage" text,
    "toxicityLevel" text,
    "ppePeriod" integer,
    "reEntryPeriod" integer,
    "warningLabel" text,
    "hazardClass" text,
    "isOrganic" boolean DEFAULT false NOT NULL,
    "organicCertNumber" text,
    "govtRegNumber" text,
    "govtRegExpiry" timestamp(3) without time zone,
    "shelfLifeMonths" integer,
    "storageTemp" text,
    "storageInstructions" text,
    "reorderLevel" double precision,
    "minStockAlert" double precision,
    "bulkDiscountThreshold" double precision,
    "bulkDiscountPct" double precision,
    "imageUrls" text[] DEFAULT ARRAY[]::text[],
    "descriptionLong" text,
    "usageInstructions" text,
    precautions text,
    "firstAid" text,
    "msdsUrl" text,
    "brochureUrl" text,
    "videoUrl" text,
    "isPopular" boolean DEFAULT false NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "isBestSeller" boolean DEFAULT false NOT NULL,
    "isSeasonal" boolean DEFAULT false NOT NULL,
    "isRestricted" boolean DEFAULT false NOT NULL,
    "requiresLicense" boolean DEFAULT false NOT NULL,
    "totalSold" double precision DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AgriProductProfile" OWNER TO abubakarmalik;

--
-- Name: AgriSeasonalPlan; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."AgriSeasonalPlan" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    season public."SeasonType" NOT NULL,
    year integer NOT NULL,
    "cropName" text NOT NULL,
    "sowingStart" timestamp(3) without time zone NOT NULL,
    "sowingEnd" timestamp(3) without time zone NOT NULL,
    "harvestStart" timestamp(3) without time zone NOT NULL,
    "harvestEnd" timestamp(3) without time zone NOT NULL,
    "recommendedProducts" jsonb,
    "applicationSchedule" jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AgriSeasonalPlan" OWNER TO abubakarmalik;

--
-- Name: AgriSubsidyClaim; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."AgriSubsidyClaim" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "farmerId" text NOT NULL,
    "claimNumber" text NOT NULL,
    "schemeName" text NOT NULL,
    "govtScheme" text,
    "productType" text NOT NULL,
    quantity double precision NOT NULL,
    "originalPrice" double precision NOT NULL,
    "subsidyAmount" double precision NOT NULL,
    "finalPrice" double precision NOT NULL,
    "farmerCnic" text,
    "cropTarget" text,
    "landAreaAcres" double precision,
    "documentsSubmitted" text[] DEFAULT ARRAY[]::text[],
    "approvedBy" text,
    "approvalDate" timestamp(3) without time zone,
    "disbursementDate" timestamp(3) without time zone,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "rejectionReason" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AgriSubsidyClaim" OWNER TO abubakarmalik;

--
-- Name: ArtSupplyProfile; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ArtSupplyProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    category public."ArtSupplyCategory" DEFAULT 'OTHER'::public."ArtSupplyCategory" NOT NULL,
    "subCategory" text,
    brand text,
    color text,
    "colorCode" text,
    size text,
    grade text,
    weight double precision,
    volume text,
    dimensions text,
    "suitableFor" text[] DEFAULT ARRAY[]::text[],
    "isProfessional" boolean DEFAULT false NOT NULL,
    "isBeginner" boolean DEFAULT false NOT NULL,
    "reorderLevel" integer DEFAULT 0 NOT NULL,
    "totalSold" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ArtSupplyProfile" OWNER TO abubakarmalik;

--
-- Name: Attendance; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Attendance" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "staffId" text NOT NULL,
    date date NOT NULL,
    "checkIn" timestamp(3) without time zone,
    "checkOut" timestamp(3) without time zone,
    "checkInPhotoUrl" text,
    "checkOutPhotoUrl" text,
    "checkInLocation" text,
    "checkOutLocation" text,
    status public."AttendanceStatus" DEFAULT 'PRESENT'::public."AttendanceStatus" NOT NULL,
    "workedHours" double precision DEFAULT 0 NOT NULL,
    "overtimeHours" double precision DEFAULT 0 NOT NULL,
    "isLate" boolean DEFAULT false NOT NULL,
    "lateMinutes" integer DEFAULT 0 NOT NULL,
    notes text,
    "markedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Attendance" OWNER TO abubakarmalik;

--
-- Name: Author; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Author" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    "penName" text,
    nationality text,
    "bornYear" integer,
    "diedYear" integer,
    bio text,
    "photoUrl" text,
    genres text[] DEFAULT ARRAY[]::text[],
    languages text[] DEFAULT ARRAY[]::text[],
    "totalBooks" integer DEFAULT 0 NOT NULL,
    "totalSales" double precision DEFAULT 0 NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Author" OWNER TO abubakarmalik;

--
-- Name: AutoPartProfile; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."AutoPartProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "partNumber" text,
    "oemNumber" text,
    "alternateNumbers" text[] DEFAULT ARRAY[]::text[],
    category public."PartCategory" DEFAULT 'OTHER'::public."PartCategory" NOT NULL,
    "subCategory" text,
    condition public."PartCondition" DEFAULT 'NEW'::public."PartCondition" NOT NULL,
    brand text,
    "countryOfOrigin" text,
    manufacturer text,
    "weightGrams" double precision,
    dimensions text,
    color text,
    material text,
    "warrantyMonths" integer DEFAULT 0 NOT NULL,
    "warrantyKm" integer,
    "warrantyNotes" text,
    "installationMinutes" integer,
    "requiresSpecialTool" boolean DEFAULT false NOT NULL,
    "installationDifficulty" text,
    compatibility jsonb,
    "minStockAlert" integer DEFAULT 0 NOT NULL,
    "isFastMoving" boolean DEFAULT false NOT NULL,
    "isCritical" boolean DEFAULT false NOT NULL,
    "totalSold" integer DEFAULT 0 NOT NULL,
    "totalInstalled" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AutoPartProfile" OWNER TO abubakarmalik;

--
-- Name: BakeryBulkOrder; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."BakeryBulkOrder" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "orderNumber" text NOT NULL,
    "customerId" text,
    "organizationName" text NOT NULL,
    "contactPerson" text,
    "contactPhone" text NOT NULL,
    "contactEmail" text,
    "orderType" text NOT NULL,
    "eventDate" timestamp(3) without time zone NOT NULL,
    "eventTime" text,
    venue text,
    "totalGuests" integer,
    "totalItems" integer NOT NULL,
    items jsonb NOT NULL,
    "quotedPrice" double precision NOT NULL,
    "finalPrice" double precision,
    "advancePaid" double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "paymentStatus" text DEFAULT 'QUOTED'::text NOT NULL,
    status public."BakeryOrderStatus" DEFAULT 'DRAFT'::public."BakeryOrderStatus" NOT NULL,
    "requiresDelivery" boolean DEFAULT true NOT NULL,
    "deliveryAddress" text,
    "requiresSetup" boolean DEFAULT false NOT NULL,
    "setupTime" text,
    "specialInstructions" text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BakeryBulkOrder" OWNER TO abubakarmalik;

--
-- Name: BakeryCakeOrder; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."BakeryCakeOrder" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "orderNumber" text NOT NULL,
    "customerId" text,
    "customerName" text NOT NULL,
    "customerPhone" text NOT NULL,
    "customerEmail" text,
    "productId" text,
    "productName" text,
    category public."BakeryCategory" DEFAULT 'CUSTOM_CAKE'::public."BakeryCategory" NOT NULL,
    size public."BakerySize" NOT NULL,
    "customWeightKg" double precision,
    shape public."CakeShape" DEFAULT 'ROUND'::public."CakeShape" NOT NULL,
    "customShapeDesc" text,
    flavor public."CakeFlavor" NOT NULL,
    "customFlavorDesc" text,
    "creamType" public."CreamType",
    "numberOrLetter" text,
    "numberOfTiers" integer DEFAULT 1 NOT NULL,
    "tierDetails" jsonb,
    "messageOnCake" text,
    "messageColor" text,
    "hasPhotoOnCake" boolean DEFAULT false NOT NULL,
    "photoUrl" text,
    "hasEdibleImage" boolean DEFAULT false NOT NULL,
    "designReferenceUrls" text[] DEFAULT ARRAY[]::text[],
    "designInstructions" text,
    "colorTheme" text,
    "primaryColor" text,
    "secondaryColor" text,
    "decorativeItems" text[] DEFAULT ARRAY[]::text[],
    "candlesRequired" integer,
    "candleType" text,
    "cakeStand" boolean DEFAULT false NOT NULL,
    "cakeKnife" boolean DEFAULT false NOT NULL,
    occasion text NOT NULL,
    "celebrantName" text,
    "celebrantAge" integer,
    "eventDate" timestamp(3) without time zone,
    "eventTime" text,
    "eventVenue" text,
    "isEggless" boolean DEFAULT false NOT NULL,
    "isSugarFree" boolean DEFAULT false NOT NULL,
    "isVegan" boolean DEFAULT false NOT NULL,
    allergies text[] DEFAULT ARRAY[]::text[],
    "dietaryNotes" text,
    "deliveryType" public."DeliveryType" DEFAULT 'SELF_PICKUP'::public."DeliveryType" NOT NULL,
    "neededBy" timestamp(3) without time zone NOT NULL,
    "deliveryDate" timestamp(3) without time zone,
    "deliveryTime" text,
    "deliveryAddress" text,
    "deliveryLandmark" text,
    "deliveryCharges" double precision DEFAULT 0 NOT NULL,
    "deliveryPersonId" text,
    status public."BakeryOrderStatus" DEFAULT 'DRAFT'::public."BakeryOrderStatus" NOT NULL,
    "productionStatus" public."ProductionStatus",
    "assignedBakerId" text,
    "assignedDecoratorId" text,
    "basePrice" double precision DEFAULT 0 NOT NULL,
    "customizationCharges" double precision DEFAULT 0 NOT NULL,
    "photoCakeCharges" double precision DEFAULT 0 NOT NULL,
    "taxAmount" double precision DEFAULT 0 NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    "advanceRequired" double precision DEFAULT 0 NOT NULL,
    "advancePaid" double precision DEFAULT 0 NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "paymentStatus" text DEFAULT 'UNPAID'::text NOT NULL,
    "confirmedAt" timestamp(3) without time zone,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "cancellationReason" text,
    "customerRating" integer,
    "customerFeedback" text,
    "finalPhotoUrls" text[] DEFAULT ARRAY[]::text[],
    "specialInstructions" text,
    "internalNotes" text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BakeryCakeOrder" OWNER TO abubakarmalik;

--
-- Name: BakeryFreshnessLog; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."BakeryFreshnessLog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "productId" text NOT NULL,
    "productName" text NOT NULL,
    "batchNumber" text,
    "productionDate" timestamp(3) without time zone NOT NULL,
    "bestBefore" timestamp(3) without time zone NOT NULL,
    "expiryDate" timestamp(3) without time zone,
    "initialQty" integer NOT NULL,
    "currentQty" integer NOT NULL,
    "soldQty" integer DEFAULT 0 NOT NULL,
    "wastedQty" integer DEFAULT 0 NOT NULL,
    "discountedQty" integer DEFAULT 0 NOT NULL,
    status public."FreshnessStatus" DEFAULT 'FRESH'::public."FreshnessStatus" NOT NULL,
    "discardedAt" timestamp(3) without time zone,
    "discardReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BakeryFreshnessLog" OWNER TO abubakarmalik;

--
-- Name: BakeryIngredient; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."BakeryIngredient" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    code text,
    brand text,
    unit text DEFAULT 'kg'::text NOT NULL,
    "currentStock" double precision DEFAULT 0 NOT NULL,
    "minStock" double precision DEFAULT 0 NOT NULL,
    "maxStock" double precision,
    "reorderLevel" double precision,
    "costPerUnit" double precision DEFAULT 0 NOT NULL,
    "lastPurchaseDate" timestamp(3) without time zone,
    "lastPurchasePrice" double precision,
    "lastVendorName" text,
    "shelfLifeDays" integer,
    "storageMethod" text,
    "requiresRefrigeration" boolean DEFAULT false NOT NULL,
    "isCritical" boolean DEFAULT false NOT NULL,
    "isOrganic" boolean DEFAULT false NOT NULL,
    "isImported" boolean DEFAULT false NOT NULL,
    "countryOfOrigin" text,
    "supplierName" text,
    "supplierPhone" text,
    "totalPurchased" double precision DEFAULT 0 NOT NULL,
    "totalConsumed" double precision DEFAULT 0 NOT NULL,
    "totalWasted" double precision DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "imageUrl" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BakeryIngredient" OWNER TO abubakarmalik;

--
-- Name: BakeryIngredientTransaction; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."BakeryIngredientTransaction" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "ingredientId" text NOT NULL,
    "transactionType" text NOT NULL,
    quantity double precision NOT NULL,
    unit text NOT NULL,
    "costPerUnit" double precision,
    "totalCost" double precision,
    "productionItemId" text,
    "cakeOrderId" text,
    "batchNumber" text,
    reason text,
    notes text,
    "performedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."BakeryIngredientTransaction" OWNER TO abubakarmalik;

--
-- Name: BakeryProductProfile; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."BakeryProductProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    category public."BakeryCategory" NOT NULL,
    "defaultSize" public."BakerySize",
    "defaultShape" public."CakeShape",
    "defaultFlavor" public."CakeFlavor",
    "defaultCreamType" public."CreamType",
    "pricePerKg" double precision,
    "pricePerPiece" double precision,
    "pricePerDozen" double precision,
    "pricePerSlice" double precision,
    "pricePerBox" double precision,
    "pricePerTray" double precision,
    "weightGrams" double precision,
    "servingSize" integer,
    "numberOfSlices" integer,
    "isCustomizable" boolean DEFAULT false NOT NULL,
    "isCakeCustomizable" boolean DEFAULT false NOT NULL,
    "allowsMessageOnCake" boolean DEFAULT true NOT NULL,
    "allowsPhotoOnCake" boolean DEFAULT false NOT NULL,
    "allowsCustomShape" boolean DEFAULT false NOT NULL,
    "allowsFlavorChoice" boolean DEFAULT false NOT NULL,
    "allowsSizeChoice" boolean DEFAULT false NOT NULL,
    "prepTimeHours" double precision,
    "advanceOrderHours" integer DEFAULT 24,
    "minOrderQty" integer DEFAULT 1 NOT NULL,
    "maxOrderQty" integer,
    "shelfLifeHours" integer,
    "shelfLifeDays" integer,
    "requiresRefrigeration" boolean DEFAULT false NOT NULL,
    "storageTempMin" double precision,
    "storageTempMax" double precision,
    "bestConsumedWithin" text,
    ingredients jsonb,
    allergens text[] DEFAULT ARRAY[]::text[],
    "containsEgg" boolean DEFAULT true NOT NULL,
    "containsNuts" boolean DEFAULT false NOT NULL,
    "containsGluten" boolean DEFAULT true NOT NULL,
    "containsDairy" boolean DEFAULT true NOT NULL,
    "isEggless" boolean DEFAULT false NOT NULL,
    "isVegan" boolean DEFAULT false NOT NULL,
    "isSugarFree" boolean DEFAULT false NOT NULL,
    "isHalal" boolean DEFAULT true NOT NULL,
    "dietaryBadges" text[] DEFAULT ARRAY[]::text[],
    "nutritionInfo" jsonb,
    "caloriesPerServing" integer,
    "imageUrls" text[] DEFAULT ARRAY[]::text[],
    "variationImages" jsonb,
    "descriptionLong" text,
    "ingredientList" text,
    "servingSuggestions" text,
    "isPopular" boolean DEFAULT false NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "isBestSeller" boolean DEFAULT false NOT NULL,
    "isNewArrival" boolean DEFAULT false NOT NULL,
    "isSeasonalItem" boolean DEFAULT false NOT NULL,
    "seasonName" text,
    "totalOrders" integer DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    "avgRating" double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "pricePerPound" double precision
);


ALTER TABLE public."BakeryProductProfile" OWNER TO abubakarmalik;

--
-- Name: BakeryProductionItem; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."BakeryProductionItem" (
    id text NOT NULL,
    "planId" text NOT NULL,
    "productId" text,
    "productName" text NOT NULL,
    category public."BakeryCategory",
    "cakeOrderId" text,
    "plannedQty" integer NOT NULL,
    "producedQty" integer DEFAULT 0 NOT NULL,
    "failedQty" integer DEFAULT 0 NOT NULL,
    "bakerId" text,
    "bakerName" text,
    status public."ProductionStatus" DEFAULT 'PLANNED'::public."ProductionStatus" NOT NULL,
    "batchNumber" text,
    "ovenNumber" text,
    "bakingStartTime" timestamp(3) without time zone,
    "bakingEndTime" timestamp(3) without time zone,
    "bakingTempC" double precision,
    "bakingDurationMin" integer,
    "qualityGrade" text,
    "qualityCheckBy" text,
    "qualityNotes" text,
    "ingredientsUsed" jsonb,
    "totalCost" double precision DEFAULT 0 NOT NULL,
    notes text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BakeryProductionItem" OWNER TO abubakarmalik;

--
-- Name: BakeryProductionPlan; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."BakeryProductionPlan" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "planNumber" text NOT NULL,
    "planDate" timestamp(3) without time zone NOT NULL,
    shift text,
    "headBakerId" text,
    status public."ProductionStatus" DEFAULT 'PLANNED'::public."ProductionStatus" NOT NULL,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "totalItems" integer DEFAULT 0 NOT NULL,
    "completedItems" integer DEFAULT 0 NOT NULL,
    "failedItems" integer DEFAULT 0 NOT NULL,
    "totalCost" double precision DEFAULT 0 NOT NULL,
    notes text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BakeryProductionPlan" OWNER TO abubakarmalik;

--
-- Name: BarcodeLabelBatch; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."BarcodeLabelBatch" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "userId" text NOT NULL,
    name text NOT NULL,
    layout text DEFAULT '30_per_sheet'::text NOT NULL,
    "paperSize" text DEFAULT 'A4'::text NOT NULL,
    "includePrice" boolean DEFAULT true NOT NULL,
    "includeName" boolean DEFAULT true NOT NULL,
    "includeShop" boolean DEFAULT true NOT NULL,
    "includeMrp" boolean DEFAULT false NOT NULL,
    "fontFamily" text DEFAULT 'monospace'::text NOT NULL,
    items jsonb NOT NULL,
    "totalLabels" integer DEFAULT 0 NOT NULL,
    "printedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."BarcodeLabelBatch" OWNER TO abubakarmalik;

--
-- Name: BookAuthor; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."BookAuthor" (
    id text NOT NULL,
    "bookId" text NOT NULL,
    "authorId" text NOT NULL,
    role text DEFAULT 'AUTHOR'::text NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."BookAuthor" OWNER TO abubakarmalik;

--
-- Name: BookProfile; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."BookProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    isbn10 text,
    isbn13 text,
    "publisherBookCode" text,
    barcode text,
    title text NOT NULL,
    subtitle text,
    "originalTitle" text,
    category public."BookCategory" DEFAULT 'OTHER'::public."BookCategory" NOT NULL,
    "subCategory" text,
    binding public."BookBinding" DEFAULT 'PAPERBACK'::public."BookBinding" NOT NULL,
    condition public."BookCondition" DEFAULT 'NEW'::public."BookCondition" NOT NULL,
    "publisherId" text,
    edition text,
    "editionNumber" integer,
    "publishYear" integer,
    "reprintYear" integer,
    language text DEFAULT 'English'::text NOT NULL,
    "pageCount" integer,
    "weightGrams" double precision,
    dimensions text,
    "paperQuality" text,
    description text,
    "tableOfContents" text,
    synopsis text,
    "isTextbook" boolean DEFAULT false NOT NULL,
    grade text,
    "classLevel" text,
    subject text,
    board text,
    curriculum text,
    mrp double precision,
    "discountPct" double precision DEFAULT 0 NOT NULL,
    "reorderLevel" integer DEFAULT 0 NOT NULL,
    "isBestSeller" boolean DEFAULT false NOT NULL,
    "isNewArrival" boolean DEFAULT false NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "isAwardWinner" boolean DEFAULT false NOT NULL,
    "awardName" text,
    "avgRating" double precision,
    "totalReviews" integer DEFAULT 0 NOT NULL,
    "totalSold" integer DEFAULT 0 NOT NULL,
    "totalRented" integer DEFAULT 0 NOT NULL,
    "isRentable" boolean DEFAULT false NOT NULL,
    "rentalPricePerWeek" double precision DEFAULT 0 NOT NULL,
    "rentalDeposit" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BookProfile" OWNER TO abubakarmalik;

--
-- Name: BookRental; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."BookRental" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "rentalNumber" text NOT NULL,
    "customerId" text,
    "productId" text NOT NULL,
    "variantId" text,
    "customerName" text,
    "customerPhone" text,
    "customerCnic" text,
    quantity integer DEFAULT 1 NOT NULL,
    "rentalPrice" double precision NOT NULL,
    "depositAmount" double precision DEFAULT 0 NOT NULL,
    "issuedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "returnedAt" timestamp(3) without time zone,
    "actualReturnDate" timestamp(3) without time zone,
    status public."BookRentalStatus" DEFAULT 'ACTIVE'::public."BookRentalStatus" NOT NULL,
    "fineAmount" double precision DEFAULT 0 NOT NULL,
    "finePerDay" double precision DEFAULT 0 NOT NULL,
    "conditionOnIssue" text,
    "conditionOnReturn" text,
    "damageNotes" text,
    notes text,
    "issuedById" text,
    "returnedToId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BookRental" OWNER TO abubakarmalik;

--
-- Name: Booking; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Booking" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "customerId" text NOT NULL,
    "createdById" text,
    "bookingNumber" text NOT NULL,
    status public."BookingStatus" DEFAULT 'PENDING'::public."BookingStatus" NOT NULL,
    subtotal double precision DEFAULT 0 NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    "serviceCharges" double precision DEFAULT 0 NOT NULL,
    "serviceChargesBreakdown" jsonb,
    total double precision DEFAULT 0 NOT NULL,
    "totalPaid" double precision DEFAULT 0 NOT NULL,
    "totalRefunded" double precision DEFAULT 0 NOT NULL,
    "balanceDue" double precision DEFAULT 0 NOT NULL,
    "expectedPickupAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    "convertedAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "cancelReason" text,
    "paymentMethod" public."PaymentMethod" DEFAULT 'CASH'::public."PaymentMethod" NOT NULL,
    notes text,
    "internalNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Booking" OWNER TO abubakarmalik;

--
-- Name: BookingItem; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."BookingItem" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    "productId" text NOT NULL,
    "variantId" text,
    "imeiId" text,
    "rollId" text,
    "cutPieceId" text,
    quantity double precision NOT NULL,
    price double precision NOT NULL,
    "costPrice" double precision DEFAULT 0 NOT NULL,
    "lineDiscount" double precision DEFAULT 0 NOT NULL,
    total double precision NOT NULL,
    "useWholesale" boolean DEFAULT false NOT NULL,
    "cutWidthFt" double precision,
    "cutLengthFt" double precision,
    "cutLengthInch" double precision,
    "cutSqft" double precision,
    note text,
    "internalNote" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."BookingItem" OWNER TO abubakarmalik;

--
-- Name: BookingPayment; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."BookingPayment" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    type public."BookingPaymentType" DEFAULT 'ADVANCE'::public."BookingPaymentType" NOT NULL,
    amount double precision NOT NULL,
    "paymentMethod" public."PaymentMethod" DEFAULT 'CASH'::public."PaymentMethod" NOT NULL,
    reference text,
    notes text,
    "createdById" text,
    "paidAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."BookingPayment" OWNER TO abubakarmalik;

--
-- Name: Brand; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Brand" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    "logoUrl" text,
    website text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Brand" OWNER TO abubakarmalik;

--
-- Name: BroadcastNotification; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."BroadcastNotification" (
    id text NOT NULL,
    "authorId" text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    "targetType" text DEFAULT 'ALL'::text NOT NULL,
    "targetTenantIds" text[] DEFAULT ARRAY[]::text[],
    "recipientCount" integer DEFAULT 0 NOT NULL,
    "sentAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."BroadcastNotification" OWNER TO abubakarmalik;

--
-- Name: BulkImportJob; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."BulkImportJob" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "userId" text NOT NULL,
    "jobType" public."BulkJobType" NOT NULL,
    "fileName" text NOT NULL,
    "fileUrl" text,
    "fileSize" integer,
    "totalRows" integer DEFAULT 0 NOT NULL,
    "processedRows" integer DEFAULT 0 NOT NULL,
    "successCount" integer DEFAULT 0 NOT NULL,
    "errorCount" integer DEFAULT 0 NOT NULL,
    "skipCount" integer DEFAULT 0 NOT NULL,
    errors jsonb,
    status public."BulkJobStatus" DEFAULT 'PENDING'::public."BulkJobStatus" NOT NULL,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    duration integer,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BulkImportJob" OWNER TO abubakarmalik;

--
-- Name: CarpetCutPiece; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."CarpetCutPiece" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "productId" text NOT NULL,
    "variantId" text,
    "sourceRollId" text,
    "sourceType" public."CarpetCutPieceSource" DEFAULT 'LEFTOVER'::public."CarpetCutPieceSource" NOT NULL,
    "pieceCode" text NOT NULL,
    "widthFt" double precision DEFAULT 0 NOT NULL,
    "widthInch" double precision DEFAULT 0 NOT NULL,
    "lengthFt" double precision DEFAULT 0 NOT NULL,
    "lengthInch" double precision DEFAULT 0 NOT NULL,
    "totalSqft" double precision DEFAULT 0 NOT NULL,
    "costAmount" double precision DEFAULT 0 NOT NULL,
    "salePrice" double precision DEFAULT 0 NOT NULL,
    "pricePerSqft" double precision,
    status public."CarpetCutPieceStatus" DEFAULT 'AVAILABLE'::public."CarpetCutPieceStatus" NOT NULL,
    condition text,
    "rackNumber" text,
    notes text,
    "saleItemId" text,
    "soldAt" timestamp(3) without time zone,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CarpetCutPiece" OWNER TO abubakarmalik;

--
-- Name: CarpetRoll; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."CarpetRoll" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "productId" text NOT NULL,
    "variantId" text,
    "rollNumber" text NOT NULL,
    "designCode" text,
    "widthFt" double precision DEFAULT 12 NOT NULL,
    "widthInch" double precision DEFAULT 0 NOT NULL,
    "originalLengthFt" double precision NOT NULL,
    "remainingLengthFt" double precision NOT NULL,
    "originalSqft" double precision DEFAULT 0 NOT NULL,
    "remainingSqft" double precision DEFAULT 0 NOT NULL,
    "costPerSqft" double precision DEFAULT 0 NOT NULL,
    "salePricePerSqft" double precision DEFAULT 0 NOT NULL,
    "wholesalePricePerSqft" double precision,
    status public."CarpetRollStatus" DEFAULT 'ACTIVE'::public."CarpetRollStatus" NOT NULL,
    "sourceType" public."CarpetRollSource" DEFAULT 'OPENING_STOCK'::public."CarpetRollSource" NOT NULL,
    "purchaseId" text,
    "purchaseItemId" text,
    "supplierId" text,
    "rackNumber" text,
    notes text,
    quality text,
    pile text,
    "receivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "finishedAt" timestamp(3) without time zone,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "originalLengthInch" double precision DEFAULT 0 NOT NULL,
    "remainingLengthInch" double precision DEFAULT 0 NOT NULL
);


ALTER TABLE public."CarpetRoll" OWNER TO abubakarmalik;

--
-- Name: CarpetRollMovement; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."CarpetRollMovement" (
    id text NOT NULL,
    "rollId" text NOT NULL,
    "tenantId" text NOT NULL,
    type text NOT NULL,
    "lengthFt" double precision NOT NULL,
    sqft double precision NOT NULL,
    "balanceLengthAfter" double precision NOT NULL,
    "balanceSqftAfter" double precision NOT NULL,
    reference text,
    "saleId" text,
    "saleItemId" text,
    note text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."CarpetRollMovement" OWNER TO abubakarmalik;

--
-- Name: CashRegister; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."CashRegister" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "openedById" text NOT NULL,
    "closedById" text,
    "registerNumber" text NOT NULL,
    status public."CashRegisterStatus" DEFAULT 'OPEN'::public."CashRegisterStatus" NOT NULL,
    "openingBalance" double precision DEFAULT 0 NOT NULL,
    "expectedBalance" double precision DEFAULT 0 NOT NULL,
    "closingBalance" double precision DEFAULT 0 NOT NULL,
    difference double precision DEFAULT 0 NOT NULL,
    "totalSales" double precision DEFAULT 0 NOT NULL,
    "totalCashIn" double precision DEFAULT 0 NOT NULL,
    "totalCashOut" double precision DEFAULT 0 NOT NULL,
    "totalExpenses" double precision DEFAULT 0 NOT NULL,
    notes text,
    "openedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "closedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CashRegister" OWNER TO abubakarmalik;

--
-- Name: CashTransaction; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."CashTransaction" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "cashRegisterId" text NOT NULL,
    "createdById" text,
    type public."CashTransactionType" NOT NULL,
    amount double precision NOT NULL,
    reason text,
    note text,
    reference text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."CashTransaction" OWNER TO abubakarmalik;

--
-- Name: Category; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Category" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#2c9466'::text NOT NULL,
    icon text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Category" OWNER TO abubakarmalik;

--
-- Name: ClinicAntenatalVisit; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ClinicAntenatalVisit" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "patientId" text NOT NULL,
    "appointmentId" text,
    "visitNumber" integer NOT NULL,
    "gestationWeeks" integer,
    "gestationDays" integer,
    "weightKg" double precision,
    "bpSystolic" integer,
    "bpDiastolic" integer,
    "fundalHeightCm" double precision,
    "fetalHeartRate" integer,
    "fetalPosition" text,
    "fetalMovements" text,
    "urineProtein" text,
    "urineSugar" text,
    edema text,
    "ultrasoundNotes" text,
    "ultrasoundUrls" text[] DEFAULT ARRAY[]::text[],
    advice text,
    "nextVisitDate" timestamp(3) without time zone,
    "visitDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ClinicAntenatalVisit" OWNER TO abubakarmalik;

--
-- Name: ClinicAppointment; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ClinicAppointment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "appointmentNumber" text NOT NULL,
    "tokenNumber" integer,
    "patientId" text NOT NULL,
    "doctorId" text NOT NULL,
    status public."ClinicAppointmentStatus" DEFAULT 'SCHEDULED'::public."ClinicAppointmentStatus" NOT NULL,
    "visitType" public."ClinicVisitType" DEFAULT 'FIRST_VISIT'::public."ClinicVisitType" NOT NULL,
    "isTelemedicine" boolean DEFAULT false NOT NULL,
    "isHomeVisit" boolean DEFAULT false NOT NULL,
    "isEmergency" boolean DEFAULT false NOT NULL,
    "scheduledStart" timestamp(3) without time zone NOT NULL,
    "scheduledEnd" timestamp(3) without time zone NOT NULL,
    "arrivedAt" timestamp(3) without time zone,
    "consultationStart" timestamp(3) without time zone,
    "consultationEnd" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "cancellationReason" text,
    "chiefComplaint" text,
    "reasonForVisit" text,
    "patientNotes" text,
    "consultationFee" double precision DEFAULT 0 NOT NULL,
    "otherCharges" double precision DEFAULT 0 NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    "taxAmount" double precision DEFAULT 0 NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "paymentStatus" text DEFAULT 'UNPAID'::text NOT NULL,
    "reminderSent" boolean DEFAULT false NOT NULL,
    "smsReminderSent" boolean DEFAULT false NOT NULL,
    "patientRating" integer,
    "patientFeedback" text,
    "videoRoomId" text,
    "videoRoomUrl" text,
    "internalNotes" text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ClinicAppointment" OWNER TO abubakarmalik;

--
-- Name: ClinicDentalRecord; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ClinicDentalRecord" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "patientId" text NOT NULL,
    "doctorId" text,
    "appointmentId" text,
    "toothNumber" text NOT NULL,
    "toothSystem" text DEFAULT 'FDI'::text NOT NULL,
    surface text,
    condition text NOT NULL,
    treatment text,
    "procedureCode" text,
    color text,
    notes text,
    "imageUrls" text[] DEFAULT ARRAY[]::text[],
    "performedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ClinicDentalRecord" OWNER TO abubakarmalik;

--
-- Name: ClinicDoctorProfile; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ClinicDoctorProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "staffId" text NOT NULL,
    title text,
    "fullName" text NOT NULL,
    qualifications text[] DEFAULT ARRAY[]::text[],
    specialties public."ClinicSpecialty"[],
    "subSpecialty" text,
    "yearsOfExperience" integer,
    bio text,
    "photoUrl" text,
    "signatureUrl" text,
    "pmcNumber" text,
    "licenseNumber" text,
    "licenseExpiry" timestamp(3) without time zone,
    "registeredWith" text,
    "consultationFee" double precision DEFAULT 0 NOT NULL,
    "followUpFee" double precision DEFAULT 0 NOT NULL,
    "followUpDays" integer DEFAULT 7 NOT NULL,
    "telemedicineFee" double precision,
    "homeVisitFee" double precision,
    "emergencyFee" double precision,
    "slotDurationMin" integer DEFAULT 15 NOT NULL,
    "bufferMin" integer DEFAULT 0 NOT NULL,
    "maxDailyPatients" integer,
    "workingDays" integer[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6],
    "workStartTime" text DEFAULT '09:00'::text NOT NULL,
    "workEndTime" text DEFAULT '21:00'::text NOT NULL,
    "breakStartTime" text,
    "breakEndTime" text,
    "commissionPct" double precision DEFAULT 0 NOT NULL,
    "commissionType" text DEFAULT 'PERCENTAGE'::text NOT NULL,
    languages text[] DEFAULT ARRAY['English'::text, 'Urdu'::text],
    services text[] DEFAULT ARRAY[]::text[],
    "proceduresOffered" text[] DEFAULT ARRAY[]::text[],
    "acceptsTelemedicine" boolean DEFAULT false NOT NULL,
    "acceptsHomeVisit" boolean DEFAULT false NOT NULL,
    "acceptsEmergency" boolean DEFAULT false NOT NULL,
    "totalPatients" integer DEFAULT 0 NOT NULL,
    "totalAppointments" integer DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    "avgRating" double precision,
    "totalReviews" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ClinicDoctorProfile" OWNER TO abubakarmalik;

--
-- Name: ClinicEncounter; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ClinicEncounter" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "appointmentId" text NOT NULL,
    "patientId" text NOT NULL,
    "doctorId" text NOT NULL,
    subjective text,
    objective text,
    assessment text,
    plan text,
    "historyOfIllness" text,
    "reviewOfSystems" text,
    "physicalExamination" text,
    "provisionalDiagnosis" text,
    "finalDiagnosis" text,
    "icd10Codes" text[] DEFAULT ARRAY[]::text[],
    "differentialDiagnosis" text,
    advice text,
    "dietaryAdvice" text,
    "activityAdvice" text,
    "warningSigns" text,
    "followUpAdvice" text,
    "followUpDate" timestamp(3) without time zone,
    "referredTo" text,
    "referralNotes" text,
    "attachmentUrls" text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ClinicEncounter" OWNER TO abubakarmalik;

--
-- Name: ClinicLabOrder; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ClinicLabOrder" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "encounterId" text,
    "patientId" text NOT NULL,
    "doctorId" text NOT NULL,
    "orderNumber" text NOT NULL,
    status public."ClinicLabTestStatus" DEFAULT 'ORDERED'::public."ClinicLabTestStatus" NOT NULL,
    "labName" text,
    urgency text DEFAULT 'ROUTINE'::text NOT NULL,
    "orderedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "sampleCollectedAt" timestamp(3) without time zone,
    "reportedAt" timestamp(3) without time zone,
    "totalCost" double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "paymentStatus" text DEFAULT 'UNPAID'::text NOT NULL,
    notes text,
    "reportUrls" text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ClinicLabOrder" OWNER TO abubakarmalik;

--
-- Name: ClinicLabTest; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ClinicLabTest" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "testName" text NOT NULL,
    "testCode" text,
    category text,
    price double precision DEFAULT 0 NOT NULL,
    result text,
    "referenceRange" text,
    unit text,
    "isAbnormal" boolean,
    "isCritical" boolean,
    "performedBy" text,
    "reportedAt" timestamp(3) without time zone,
    "reportUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ClinicLabTest" OWNER TO abubakarmalik;

--
-- Name: ClinicPatientProfile; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ClinicPatientProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerId" text NOT NULL,
    mrn text NOT NULL,
    "fullName" text NOT NULL,
    "fatherOrHusbandName" text,
    cnic text,
    "dateOfBirth" timestamp(3) without time zone,
    gender public."ClinicGender",
    "bloodGroup" public."ClinicBloodGroup",
    "maritalStatus" text,
    occupation text,
    religion text,
    nationality text,
    "photoUrl" text,
    "phonePrimary" text,
    "phoneAlternate" text,
    email text,
    address text,
    city text,
    "emergencyContactName" text,
    "emergencyContactPhone" text,
    "emergencyContactRelation" text,
    "heightCm" double precision,
    "weightKg" double precision,
    bmi double precision,
    "waistCm" double precision,
    allergies text[] DEFAULT ARRAY[]::text[],
    "chronicConditions" text[] DEFAULT ARRAY[]::text[],
    "currentMedications" text[] DEFAULT ARRAY[]::text[],
    "pastSurgeries" text,
    "familyHistory" text,
    "smokingStatus" text,
    "alcoholStatus" text,
    "isPregnant" boolean,
    "gravidaPara" text,
    "lmpDate" timestamp(3) without time zone,
    edd timestamp(3) without time zone,
    "menstrualCycle" text,
    "pediatricianId" text,
    "vaccinationStatus" text,
    "motherName" text,
    "birthWeight" double precision,
    "birthType" text,
    "hasInsurance" boolean DEFAULT false NOT NULL,
    "insuranceProvider" text,
    "insuranceNumber" text,
    "insuranceExpiry" timestamp(3) without time zone,
    "cardUrl" text,
    "preferredDoctorId" text,
    "preferredLanguage" text,
    "registeredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastVisitAt" timestamp(3) without time zone,
    "totalVisits" integer DEFAULT 0 NOT NULL,
    "totalSpent" double precision DEFAULT 0 NOT NULL,
    "outstandingBalance" double precision DEFAULT 0 NOT NULL,
    notes text,
    "photoUrls" text[] DEFAULT ARRAY[]::text[],
    "documentUrls" text[] DEFAULT ARRAY[]::text[],
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ClinicPatientProfile" OWNER TO abubakarmalik;

--
-- Name: ClinicPhysioSession; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ClinicPhysioSession" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "patientId" text NOT NULL,
    "therapistId" text NOT NULL,
    "appointmentId" text,
    "sessionNumber" integer NOT NULL,
    "totalSessionsPrescribed" integer,
    diagnosis text,
    "chiefComplaint" text,
    "painScore" integer,
    "romNotes" text,
    "exercisesPerformed" jsonb,
    "modalitiesUsed" text[] DEFAULT ARRAY[]::text[],
    "durationMin" integer,
    "progressNotes" text,
    "homeExercises" text,
    "nextSessionDate" timestamp(3) without time zone,
    "sessionDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ClinicPhysioSession" OWNER TO abubakarmalik;

--
-- Name: ClinicPrescription; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ClinicPrescription" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "encounterId" text NOT NULL,
    "patientId" text NOT NULL,
    "doctorId" text NOT NULL,
    "prescriptionNumber" text NOT NULL,
    status public."ClinicPrescriptionStatus" DEFAULT 'ACTIVE'::public."ClinicPrescriptionStatus" NOT NULL,
    "issuedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "validUntil" timestamp(3) without time zone,
    "isDigital" boolean DEFAULT true NOT NULL,
    "pdfUrl" text,
    "generalInstructions" text,
    "totalItems" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ClinicPrescription" OWNER TO abubakarmalik;

--
-- Name: ClinicPrescriptionItem; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ClinicPrescriptionItem" (
    id text NOT NULL,
    "prescriptionId" text NOT NULL,
    "drugId" text,
    "drugName" text NOT NULL,
    strength text,
    form text,
    dose text,
    frequency text,
    route text,
    "durationDays" integer,
    quantity text,
    "beforeMeal" boolean,
    "afterMeal" boolean,
    "atBedtime" boolean,
    "emptyStomach" boolean,
    instructions text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ClinicPrescriptionItem" OWNER TO abubakarmalik;

--
-- Name: ClinicReferral; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ClinicReferral" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "patientId" text NOT NULL,
    "referringDoctorId" text NOT NULL,
    "encounterId" text,
    "referralNumber" text NOT NULL,
    "referredTo" text NOT NULL,
    "referredToSpecialty" text,
    reason text NOT NULL,
    urgency text DEFAULT 'ROUTINE'::text NOT NULL,
    "clinicalSummary" text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "respondedAt" timestamp(3) without time zone,
    "responseNotes" text,
    "attachmentUrls" text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ClinicReferral" OWNER TO abubakarmalik;

--
-- Name: ClinicRoom; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ClinicRoom" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "roomNumber" text NOT NULL,
    "roomName" text,
    "roomType" text NOT NULL,
    capacity integer DEFAULT 1 NOT NULL,
    equipment text[] DEFAULT ARRAY[]::text[],
    "isOccupied" boolean DEFAULT false NOT NULL,
    "currentPatientId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ClinicRoom" OWNER TO abubakarmalik;

--
-- Name: ClinicService; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ClinicService" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    code text,
    category text NOT NULL,
    description text,
    price double precision DEFAULT 0 NOT NULL,
    "durationMin" integer DEFAULT 15 NOT NULL,
    "requiresDoctor" boolean DEFAULT true NOT NULL,
    "requiresRoom" boolean DEFAULT false NOT NULL,
    "requiresPrep" boolean DEFAULT false NOT NULL,
    "prepInstructions" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "totalBookings" integer DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ClinicService" OWNER TO abubakarmalik;

--
-- Name: ClinicVaccination; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ClinicVaccination" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "patientId" text NOT NULL,
    "vaccineName" text NOT NULL,
    "vaccineCode" text,
    "scheduleName" text,
    "doseNumber" integer,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "administeredAt" timestamp(3) without time zone,
    "administeredBy" text,
    "batchNumber" text,
    manufacturer text,
    "expiryDate" timestamp(3) without time zone,
    "siteAdministered" text,
    "routeAdministered" text,
    status public."ClinicVaccineStatus" DEFAULT 'DUE'::public."ClinicVaccineStatus" NOT NULL,
    "adverseReactions" text,
    notes text,
    "reminderSent" boolean DEFAULT false NOT NULL,
    "reminderSentAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ClinicVaccination" OWNER TO abubakarmalik;

--
-- Name: ClinicVitals; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ClinicVitals" (
    id text NOT NULL,
    "appointmentId" text NOT NULL,
    "patientId" text NOT NULL,
    "bpSystolic" integer,
    "bpDiastolic" integer,
    "pulseRate" integer,
    "respiratoryRate" integer,
    "temperatureC" double precision,
    "temperatureF" double precision,
    spo2 double precision,
    "bloodSugar" double precision,
    "bloodSugarType" text,
    "heightCm" double precision,
    "weightKg" double precision,
    bmi double precision,
    "headCircumferenceCm" double precision,
    "waistCm" double precision,
    "painScore" integer,
    "glasgowScore" integer,
    "recordedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "recordedById" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ClinicVitals" OWNER TO abubakarmalik;

--
-- Name: ControlledSubstanceLog; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ControlledSubstanceLog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "batchId" text,
    "saleId" text,
    "prescriptionId" text,
    "logNumber" text NOT NULL,
    "logDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "logType" text NOT NULL,
    quantity double precision NOT NULL,
    unit text NOT NULL,
    "openingBalance" double precision NOT NULL,
    "closingBalance" double precision NOT NULL,
    "patientName" text,
    "patientCnic" text,
    "patientPhone" text,
    "patientAddress" text,
    "doctorName" text,
    "doctorRegNumber" text,
    "prescriptionNumber" text,
    "dispensedBy" text,
    "supervisedBy" text,
    notes text,
    "attachmentUrls" text[] DEFAULT ARRAY[]::text[],
    "isReversed" boolean DEFAULT false NOT NULL,
    "reversalReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ControlledSubstanceLog" OWNER TO abubakarmalik;

--
-- Name: CreditTransaction; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."CreditTransaction" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    type public."CreditType" NOT NULL,
    amount double precision NOT NULL,
    "balanceAfter" double precision NOT NULL,
    reference text,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."CreditTransaction" OWNER TO abubakarmalik;

--
-- Name: Customer; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Customer" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    address text,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    balance double precision DEFAULT 0 NOT NULL,
    "creditLimit" double precision DEFAULT 0 NOT NULL,
    "loyaltyPoints" integer DEFAULT 0 NOT NULL,
    "totalSpent" double precision DEFAULT 0 NOT NULL,
    area text,
    "avatarUrl" text,
    city text,
    cnic text,
    "dateOfBirth" timestamp(3) without time zone,
    gender public."CustomerGender",
    "isVip" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Customer" OWNER TO abubakarmalik;

--
-- Name: CustomerLedger; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."CustomerLedger" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerId" text NOT NULL,
    "createdById" text,
    type public."CustomerLedgerType" NOT NULL,
    amount double precision NOT NULL,
    "balanceAfter" double precision NOT NULL,
    reference text,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."CustomerLedger" OWNER TO abubakarmalik;

--
-- Name: CustomerReadingList; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."CustomerReadingList" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerId" text NOT NULL,
    name text DEFAULT 'Wishlist'::text NOT NULL,
    description text,
    "isPublic" boolean DEFAULT false NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "totalItems" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CustomerReadingList" OWNER TO abubakarmalik;

--
-- Name: CustomerReadingListItem; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."CustomerReadingListItem" (
    id text NOT NULL,
    "listId" text NOT NULL,
    "productId" text NOT NULL,
    notes text,
    priority text DEFAULT 'NORMAL'::text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."CustomerReadingListItem" OWNER TO abubakarmalik;

--
-- Name: CustomerVehicle; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."CustomerVehicle" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerId" text NOT NULL,
    "registrationNumber" text NOT NULL,
    "chassisNumber" text,
    "engineNumber" text,
    "makeId" text,
    "modelId" text,
    "makeName" text,
    "modelName" text,
    "vehicleType" public."VehicleType" DEFAULT 'CAR'::public."VehicleType" NOT NULL,
    year integer,
    color text,
    "fuelType" public."FuelType" DEFAULT 'PETROL'::public."FuelType" NOT NULL,
    transmission public."TransmissionType" DEFAULT 'MANUAL'::public."TransmissionType" NOT NULL,
    "engineCC" integer,
    "odometerKm" integer,
    "ownerName" text,
    "ownerPhone" text,
    "ownerCnic" text,
    "insuranceProvider" text,
    "insurancePolicyNumber" text,
    "insuranceExpiry" timestamp(3) without time zone,
    "tokenTaxExpiry" timestamp(3) without time zone,
    "fitnessExpiry" timestamp(3) without time zone,
    "documentUrls" text[] DEFAULT ARRAY[]::text[],
    "photoUrls" text[] DEFAULT ARRAY[]::text[],
    "preferredMechanicId" text,
    notes text,
    "totalServices" integer DEFAULT 0 NOT NULL,
    "totalSpent" double precision DEFAULT 0 NOT NULL,
    "lastServiceAt" timestamp(3) without time zone,
    "lastOdometerKm" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CustomerVehicle" OWNER TO abubakarmalik;

--
-- Name: DairyCustomer; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."DairyCustomer" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerId" text,
    "routeId" text,
    "customerNumber" text NOT NULL,
    name text NOT NULL,
    phone text,
    cnic text,
    address text,
    city text,
    area text,
    landmark text,
    latitude double precision,
    longitude double precision,
    "deliveryFrequency" public."DairyDeliveryFrequency" DEFAULT 'DAILY'::public."DairyDeliveryFrequency" NOT NULL,
    "morningQuantity" double precision DEFAULT 0 NOT NULL,
    "eveningQuantity" double precision DEFAULT 0 NOT NULL,
    "productPreference" text,
    "containerType" text,
    "customRate" double precision,
    "billingCycle" public."DairyBillingCycle" DEFAULT 'MONTHLY'::public."DairyBillingCycle" NOT NULL,
    "currentBalance" double precision DEFAULT 0 NOT NULL,
    "totalPurchases" double precision DEFAULT 0 NOT NULL,
    "totalPayments" double precision DEFAULT 0 NOT NULL,
    "advancePayment" double precision DEFAULT 0 NOT NULL,
    "totalDeliveries" integer DEFAULT 0 NOT NULL,
    "missedDeliveries" integer DEFAULT 0 NOT NULL,
    "lastDeliveryDate" timestamp(3) without time zone,
    "lastPaymentDate" timestamp(3) without time zone,
    status public."DairyKhataStatus" DEFAULT 'ACTIVE'::public."DairyKhataStatus" NOT NULL,
    "startDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "pausedFrom" timestamp(3) without time zone,
    "pausedTo" timestamp(3) without time zone,
    notes text,
    "photoUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DairyCustomer" OWNER TO abubakarmalik;

--
-- Name: DairyDelivery; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."DairyDelivery" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "dairyCustomerId" text NOT NULL,
    "routeId" text,
    "deliveryDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    slot public."DairyDeliverySlot" DEFAULT 'MORNING'::public."DairyDeliverySlot" NOT NULL,
    "scheduledQty" double precision NOT NULL,
    "deliveredQty" double precision NOT NULL,
    "returnedQty" double precision DEFAULT 0 NOT NULL,
    unit public."DairyUnit" DEFAULT 'LITER'::public."DairyUnit" NOT NULL,
    status public."DairyDeliveryStatus" DEFAULT 'SCHEDULED'::public."DairyDeliveryStatus" NOT NULL,
    "skipReason" text,
    "ratePerLiter" double precision NOT NULL,
    "totalAmount" double precision NOT NULL,
    "isPaid" boolean DEFAULT false NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "deliveredByStaffId" text,
    "containerReturned" boolean DEFAULT false NOT NULL,
    "deliveredAt" timestamp(3) without time zone,
    notes text,
    "customerSignature" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DairyDelivery" OWNER TO abubakarmalik;

--
-- Name: DairyFarmer; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."DairyFarmer" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "farmerNumber" text NOT NULL,
    name text NOT NULL,
    "fatherName" text,
    cnic text,
    phone text,
    address text,
    village text,
    city text,
    "cattleCount" integer,
    "buffaloCount" integer,
    "cowCount" integer,
    "goatCount" integer,
    "totalCapacityLiters" double precision,
    "ratePerLiter" double precision DEFAULT 0 NOT NULL,
    "fatBonusRate" double precision DEFAULT 0 NOT NULL,
    "paymentCycle" public."DairyBillingCycle" DEFAULT 'WEEKLY'::public."DairyBillingCycle" NOT NULL,
    "currentBalance" double precision DEFAULT 0 NOT NULL,
    "totalSupplied" double precision DEFAULT 0 NOT NULL,
    "totalPaid" double precision DEFAULT 0 NOT NULL,
    "avgFatContent" double precision,
    "avgSnfContent" double precision,
    "qualityRating" double precision,
    "lastSupplyDate" timestamp(3) without time zone,
    "lastPaymentDate" timestamp(3) without time zone,
    "photoUrl" text,
    "cnicFrontUrl" text,
    "cnicBackUrl" text,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DairyFarmer" OWNER TO abubakarmalik;

--
-- Name: DairyFarmerSupply; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."DairyFarmerSupply" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "farmerId" text NOT NULL,
    "supplyDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    slot public."DairyDeliverySlot" DEFAULT 'MORNING'::public."DairyDeliverySlot" NOT NULL,
    quantity double precision NOT NULL,
    unit public."DairyUnit" DEFAULT 'LITER'::public."DairyUnit" NOT NULL,
    "fatContent" double precision,
    "snfContent" double precision,
    quality public."DairyMilkQuality",
    "ratePerLiter" double precision NOT NULL,
    "fatBonus" double precision DEFAULT 0 NOT NULL,
    "otherAdjustment" double precision DEFAULT 0 NOT NULL,
    "totalAmount" double precision NOT NULL,
    "isPaid" boolean DEFAULT false NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "receivedByStaffId" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DairyFarmerSupply" OWNER TO abubakarmalik;

--
-- Name: DairyMonthlyBill; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."DairyMonthlyBill" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "dairyCustomerId" text NOT NULL,
    "billNumber" text NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    "cycleStartDate" timestamp(3) without time zone NOT NULL,
    "cycleEndDate" timestamp(3) without time zone NOT NULL,
    "totalLiters" double precision DEFAULT 0 NOT NULL,
    "totalDeliveries" integer DEFAULT 0 NOT NULL,
    "totalAmount" double precision DEFAULT 0 NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "remainingAmount" double precision DEFAULT 0 NOT NULL,
    "openingBalance" double precision DEFAULT 0 NOT NULL,
    "closingBalance" double precision DEFAULT 0 NOT NULL,
    "isPaid" boolean DEFAULT false NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "paymentMethod" text,
    "paymentReference" text,
    "isPrinted" boolean DEFAULT false NOT NULL,
    "sentToCustomer" boolean DEFAULT false NOT NULL,
    "sentAt" timestamp(3) without time zone,
    notes text,
    "handledById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DairyMonthlyBill" OWNER TO abubakarmalik;

--
-- Name: DairyProduct; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."DairyProduct" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "productType" public."DairyProductType" DEFAULT 'FRESH_MILK'::public."DairyProductType" NOT NULL,
    unit public."DairyUnit" DEFAULT 'LITER'::public."DairyUnit" NOT NULL,
    "fatContent" double precision,
    "snfContent" double precision,
    "proteinContent" double precision,
    "waterAdded" boolean DEFAULT false NOT NULL,
    quality public."DairyMilkQuality",
    "isPasteurized" boolean DEFAULT false NOT NULL,
    "isHomogenized" boolean DEFAULT false NOT NULL,
    "isRaw" boolean DEFAULT false NOT NULL,
    "isOrganic" boolean DEFAULT false NOT NULL,
    "isFresh" boolean DEFAULT true NOT NULL,
    "productionDate" timestamp(3) without time zone,
    "bestBeforeHours" integer,
    "shelfLifeHours" integer,
    "requiresRefrigeration" boolean DEFAULT true NOT NULL,
    "storageTempMin" double precision,
    "storageTempMax" double precision,
    "farmSource" text,
    "cattleType" text,
    "morningPrice" double precision,
    "eveningPrice" double precision,
    "bulkPrice" double precision,
    "minBulkQty" double precision,
    "wholesalePrice" double precision,
    "retailPrice" double precision,
    "homeDeliveryPrice" double precision,
    "availableMorning" boolean DEFAULT true NOT NULL,
    "availableEvening" boolean DEFAULT true NOT NULL,
    "homeDeliveryAvailable" boolean DEFAULT true NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "isBestSeller" boolean DEFAULT false NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "totalSold" double precision DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DairyProduct" OWNER TO abubakarmalik;

--
-- Name: DairyQualityTest; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."DairyQualityTest" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "testNumber" text NOT NULL,
    "testedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "sourceType" text NOT NULL,
    "sourceId" text,
    "sourceName" text,
    "fatContent" double precision,
    "snfContent" double precision,
    "proteinContent" double precision,
    "lactoseContent" double precision,
    "waterContent" double precision,
    "phLevel" double precision,
    temperature double precision,
    "adulterationDetected" boolean DEFAULT false NOT NULL,
    "adulterationTypes" text[] DEFAULT ARRAY[]::text[],
    quality public."DairyMilkQuality",
    passed boolean DEFAULT true NOT NULL,
    "actionTaken" text,
    "testedByStaffId" text,
    "testMethod" text,
    notes text,
    "imageUrls" text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DairyQualityTest" OWNER TO abubakarmalik;

--
-- Name: DairyRoute; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."DairyRoute" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "routeNumber" text NOT NULL,
    name text NOT NULL,
    description text,
    "assignedStaffId" text,
    "vehicleType" text,
    "vehicleNumber" text,
    slot public."DairyDeliverySlot" DEFAULT 'MORNING'::public."DairyDeliverySlot" NOT NULL,
    status public."DairyRouteStatus" DEFAULT 'ACTIVE'::public."DairyRouteStatus" NOT NULL,
    "totalCustomers" integer DEFAULT 0 NOT NULL,
    "totalDailyLiters" double precision DEFAULT 0 NOT NULL,
    "startTime" text,
    "estimatedDurationMin" integer,
    "areaName" text,
    color text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DairyRoute" OWNER TO abubakarmalik;

--
-- Name: DamageLog; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."DamageLog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "productId" text NOT NULL,
    "variantId" text,
    "batchId" text,
    "unitId" text,
    "reportedById" text NOT NULL,
    "approvedById" text,
    "damageNumber" text NOT NULL,
    quantity double precision NOT NULL,
    "unitCost" double precision DEFAULT 0 NOT NULL,
    "costImpact" double precision DEFAULT 0 NOT NULL,
    "salvageValue" double precision DEFAULT 0 NOT NULL,
    "netLoss" double precision DEFAULT 0 NOT NULL,
    reason text NOT NULL,
    "reasonCode" public."DamageReasonCode" DEFAULT 'OTHER'::public."DamageReasonCode" NOT NULL,
    photos text[] DEFAULT ARRAY[]::text[],
    notes text,
    "supplierClaim" boolean DEFAULT false NOT NULL,
    "claimStatus" text,
    "claimAmount" double precision DEFAULT 0 NOT NULL,
    status public."DamageStatus" DEFAULT 'REPORTED'::public."DamageStatus" NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DamageLog" OWNER TO abubakarmalik;

--
-- Name: DeliveryTracking; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."DeliveryTracking" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "riderId" text,
    status public."RiderDeliveryStatus" DEFAULT 'PENDING'::public."RiderDeliveryStatus" NOT NULL,
    "assignedAt" timestamp(3) without time zone,
    "pickedUpAt" timestamp(3) without time zone,
    "onTheWayAt" timestamp(3) without time zone,
    "arrivedAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "pickupLat" double precision,
    "pickupLng" double precision,
    "dropoffLat" double precision,
    "dropoffLng" double precision,
    "distanceKm" double precision,
    "estimatedMinutes" integer,
    "actualMinutes" integer,
    "deliveryFee" double precision DEFAULT 0 NOT NULL,
    "riderCommission" double precision DEFAULT 0 NOT NULL,
    "customerTip" double precision DEFAULT 0 NOT NULL,
    "customerRating" integer,
    "customerFeedback" text,
    "proofPhotoUrl" text,
    "signatureUrl" text,
    "failureReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DeliveryTracking" OWNER TO abubakarmalik;

--
-- Name: DiscountCode; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."DiscountCode" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "createdById" text,
    code text NOT NULL,
    description text,
    type public."DiscountType" DEFAULT 'PERCENTAGE'::public."DiscountType" NOT NULL,
    value double precision NOT NULL,
    "minPurchase" double precision DEFAULT 0 NOT NULL,
    "maxDiscount" double precision,
    "usageLimit" integer,
    "usageCount" integer DEFAULT 0 NOT NULL,
    "validFrom" timestamp(3) without time zone,
    "validUntil" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DiscountCode" OWNER TO abubakarmalik;

--
-- Name: Doctor; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Doctor" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    cnic text,
    "registrationNumber" text NOT NULL,
    qualification text,
    specialization text,
    "yearsOfExperience" integer,
    "clinicName" text,
    "clinicAddress" text,
    "hospitalAffiliation" text,
    "consultationFee" double precision,
    "commissionType" text DEFAULT 'NONE'::text,
    "commissionValue" double precision DEFAULT 0 NOT NULL,
    "totalPrescriptions" integer DEFAULT 0 NOT NULL,
    "totalBusiness" double precision DEFAULT 0 NOT NULL,
    "totalCommission" double precision DEFAULT 0 NOT NULL,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Doctor" OWNER TO abubakarmalik;

--
-- Name: DrugInteraction; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."DrugInteraction" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "saltAId" text NOT NULL,
    "saltBId" text NOT NULL,
    severity text NOT NULL,
    description text NOT NULL,
    "clinicalEffect" text,
    management text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DrugInteraction" OWNER TO abubakarmalik;

--
-- Name: EmailLog; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."EmailLog" (
    id text NOT NULL,
    "tenantId" text,
    "templateSlug" text,
    "toEmail" text NOT NULL,
    "toName" text,
    subject text NOT NULL,
    "bodyHtml" text NOT NULL,
    "bodyText" text,
    variables jsonb,
    status public."DeliveryStatus" DEFAULT 'QUEUED'::public."DeliveryStatus" NOT NULL,
    "providerId" text,
    "errorMessage" text,
    "retryCount" integer DEFAULT 0 NOT NULL,
    "sentAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."EmailLog" OWNER TO abubakarmalik;

--
-- Name: EmailTemplate; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."EmailTemplate" (
    id text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    "bodyHtml" text NOT NULL,
    "bodyText" text,
    variables jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."EmailTemplate" OWNER TO abubakarmalik;

--
-- Name: EmiInstallment; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."EmiInstallment" (
    id text NOT NULL,
    "planId" text NOT NULL,
    "installmentNumber" integer NOT NULL,
    amount double precision NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "paidDate" timestamp(3) without time zone,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    status public."EmiInstallmentStatus" DEFAULT 'PENDING'::public."EmiInstallmentStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."EmiInstallment" OWNER TO abubakarmalik;

--
-- Name: EmiPlan; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."EmiPlan" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "saleId" text,
    "customerId" text NOT NULL,
    "customerName" text NOT NULL,
    "customerPhone" text,
    "planNumber" text NOT NULL,
    "totalAmount" double precision NOT NULL,
    "downPayment" double precision DEFAULT 0 NOT NULL,
    "financedAmount" double precision NOT NULL,
    "installmentCount" integer NOT NULL,
    "installmentAmount" double precision NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "remainingAmount" double precision NOT NULL,
    status public."EmiPlanStatus" DEFAULT 'ACTIVE'::public."EmiPlanStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."EmiPlan" OWNER TO abubakarmalik;

--
-- Name: Expense; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Expense" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "categoryId" text,
    "createdById" text,
    "expenseNumber" text NOT NULL,
    title text NOT NULL,
    description text,
    amount double precision NOT NULL,
    "paymentMethod" public."PaymentMethod" DEFAULT 'CASH'::public."PaymentMethod" NOT NULL,
    status public."ExpenseStatus" DEFAULT 'PAID'::public."ExpenseStatus" NOT NULL,
    "expenseDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Expense" OWNER TO abubakarmalik;

--
-- Name: ExpenseCategory; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ExpenseCategory" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#f59e0b'::text NOT NULL,
    icon text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ExpenseCategory" OWNER TO abubakarmalik;

--
-- Name: GarmentAlterationTicket; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GarmentAlterationTicket" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "ticketNumber" text NOT NULL,
    "customerId" text,
    "saleId" text,
    "productId" text,
    "variantId" text,
    "customerName" text,
    "customerPhone" text,
    "garmentDescription" text NOT NULL,
    "alterationType" text NOT NULL,
    "alterationDetails" text,
    status public."GarmentAlterationStatus" DEFAULT 'RECEIVED'::public."GarmentAlterationStatus" NOT NULL,
    priority public."GarmentPriority" DEFAULT 'NORMAL'::public."GarmentPriority" NOT NULL,
    "receivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "promisedDate" timestamp(3) without time zone,
    "readyAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "tailorId" text,
    charges double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "paymentStatus" public."GarmentPaymentStatus" DEFAULT 'UNPAID'::public."GarmentPaymentStatus" NOT NULL,
    "beforeImageUrls" text[] DEFAULT ARRAY[]::text[],
    "afterImageUrls" text[] DEFAULT ARRAY[]::text[],
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GarmentAlterationTicket" OWNER TO abubakarmalik;

--
-- Name: GarmentCollection; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GarmentCollection" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    name text NOT NULL,
    code text,
    description text,
    season public."GarmentSeason" DEFAULT 'ALL_SEASON'::public."GarmentSeason" NOT NULL,
    year integer,
    "launchDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    "coverImageUrl" text,
    "bannerImageUrl" text,
    "colorTheme" text,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "totalProducts" integer DEFAULT 0 NOT NULL,
    "totalSales" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GarmentCollection" OWNER TO abubakarmalik;

--
-- Name: GarmentLayawayInstallment; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GarmentLayawayInstallment" (
    id text NOT NULL,
    "planId" text NOT NULL,
    "installmentNo" integer NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    amount double precision NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    status public."GarmentPaymentStatus" DEFAULT 'UNPAID'::public."GarmentPaymentStatus" NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "paymentMethod" text,
    reference text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GarmentLayawayInstallment" OWNER TO abubakarmalik;

--
-- Name: GarmentLayawayPlan; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GarmentLayawayPlan" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "planNumber" text NOT NULL,
    "customerId" text,
    "customerName" text,
    "customerPhone" text,
    "productId" text,
    "variantId" text,
    "tailoringOrderId" text,
    "totalAmount" double precision NOT NULL,
    "depositAmount" double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "remainingAmount" double precision DEFAULT 0 NOT NULL,
    "installmentCount" integer DEFAULT 1 NOT NULL,
    "installmentAmount" double precision DEFAULT 0 NOT NULL,
    frequency text DEFAULT 'MONTHLY'::text NOT NULL,
    "startDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "nextDueDate" timestamp(3) without time zone,
    "finalDueDate" timestamp(3) without time zone,
    status public."GarmentLayawayStatus" DEFAULT 'ACTIVE'::public."GarmentLayawayStatus" NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "cancellationReason" text,
    notes text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GarmentLayawayPlan" OWNER TO abubakarmalik;

--
-- Name: GarmentMeasurementProfile; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GarmentMeasurementProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerId" text NOT NULL,
    "profileName" text DEFAULT 'Default'::text NOT NULL,
    gender public."GarmentGender",
    unit public."GarmentMeasurementUnit" DEFAULT 'INCH'::public."GarmentMeasurementUnit" NOT NULL,
    neck double precision,
    shoulder double precision,
    chest double precision,
    bust double precision,
    waist double precision,
    hip double precision,
    armhole double precision,
    bicep double precision,
    wrist double precision,
    "sleeveLength" double precision,
    "shirtLength" double precision,
    "trouserLength" double precision,
    inseam double precision,
    thigh double precision,
    knee double precision,
    bottom double precision,
    "kurtaLength" double precision,
    "shalwarLength" double precision,
    "shalwarBottom" double precision,
    daman double precision,
    "postureNotes" text,
    "fittingNotes" text,
    "imageUrls" text[] DEFAULT ARRAY[]::text[],
    "measuredById" text,
    "measuredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GarmentMeasurementProfile" OWNER TO abubakarmalik;

--
-- Name: GarmentProductProfile; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GarmentProductProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "collectionId" text,
    "sizeChartId" text,
    gender public."GarmentGender",
    "categoryType" public."GarmentCategoryType",
    season public."GarmentSeason" DEFAULT 'ALL_SEASON'::public."GarmentSeason" NOT NULL,
    "fabricType" public."GarmentFabricType",
    "fabricBlend" text,
    "workType" public."GarmentWorkType" DEFAULT 'PLAIN'::public."GarmentWorkType" NOT NULL,
    "fitType" public."GarmentFitType" DEFAULT 'REGULAR'::public."GarmentFitType" NOT NULL,
    neckline text,
    "sleeveType" text,
    "sleeveLength" text,
    pattern text,
    "careInstructions" text,
    "countryOfOrigin" text,
    manufacturer text,
    designer text,
    "modelHeight" text,
    "modelWearingSize" text,
    "styleCode" text,
    "lookBookUrl" text,
    "videoUrl" text,
    "isReadyMade" boolean DEFAULT true NOT NULL,
    "isStitchable" boolean DEFAULT false NOT NULL,
    "isFabricOnly" boolean DEFAULT false NOT NULL,
    "allowAlteration" boolean DEFAULT true NOT NULL,
    "allowReservation" boolean DEFAULT true NOT NULL,
    "allowLayaway" boolean DEFAULT false NOT NULL,
    "minAlterationDays" integer,
    "defaultStitchingDays" integer,
    "isNewArrival" boolean DEFAULT false NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "isBestSeller" boolean DEFAULT false NOT NULL,
    "isOnSale" boolean DEFAULT false NOT NULL,
    "totalSold" integer DEFAULT 0 NOT NULL,
    "totalReturns" integer DEFAULT 0 NOT NULL,
    "totalAlterations" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GarmentProductProfile" OWNER TO abubakarmalik;

--
-- Name: GarmentReservation; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GarmentReservation" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "reservationNumber" text NOT NULL,
    "customerId" text,
    "productId" text NOT NULL,
    "variantId" text,
    "customerName" text,
    "customerPhone" text,
    quantity double precision DEFAULT 1 NOT NULL,
    "unitPrice" double precision DEFAULT 0 NOT NULL,
    "depositAmount" double precision DEFAULT 0 NOT NULL,
    status public."GarmentReservationStatus" DEFAULT 'ACTIVE'::public."GarmentReservationStatus" NOT NULL,
    "reservedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "convertedSaleId" text,
    notes text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GarmentReservation" OWNER TO abubakarmalik;

--
-- Name: GarmentSizeChart; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GarmentSizeChart" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    "categoryType" public."GarmentCategoryType",
    gender public."GarmentGender",
    unit public."GarmentMeasurementUnit" DEFAULT 'INCH'::public."GarmentMeasurementUnit" NOT NULL,
    description text,
    rows jsonb NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GarmentSizeChart" OWNER TO abubakarmalik;

--
-- Name: GarmentTailoringOrder; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GarmentTailoringOrder" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "orderNumber" text NOT NULL,
    "customerId" text,
    "measurementProfileId" text,
    "customerName" text,
    "customerPhone" text,
    "customerNotes" text,
    "orderStatus" public."GarmentOrderStatus" DEFAULT 'DRAFT'::public."GarmentOrderStatus" NOT NULL,
    priority public."GarmentPriority" DEFAULT 'NORMAL'::public."GarmentPriority" NOT NULL,
    "paymentStatus" public."GarmentPaymentStatus" DEFAULT 'UNPAID'::public."GarmentPaymentStatus" NOT NULL,
    "collectionId" text,
    "tailorId" text,
    "designerId" text,
    "orderDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "promisedDate" timestamp(3) without time zone,
    "readyDate" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "cancellationReason" text,
    subtotal double precision DEFAULT 0 NOT NULL,
    "stitchingCharges" double precision DEFAULT 0 NOT NULL,
    "embroideryCharges" double precision DEFAULT 0 NOT NULL,
    "alterationCharges" double precision DEFAULT 0 NOT NULL,
    "fabricCharges" double precision DEFAULT 0 NOT NULL,
    "accessoryCharges" double precision DEFAULT 0 NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    "taxAmount" double precision DEFAULT 0 NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "designReferenceUrls" text[] DEFAULT ARRAY[]::text[],
    "designInstructions" text,
    "internalNotes" text,
    "qualityCheckNotes" text,
    "qualityCheckedById" text,
    "qualityCheckedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GarmentTailoringOrder" OWNER TO abubakarmalik;

--
-- Name: GarmentTailoringOrderItem; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GarmentTailoringOrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productId" text,
    "variantId" text,
    "garmentName" text NOT NULL,
    "categoryType" public."GarmentCategoryType",
    quantity double precision DEFAULT 1 NOT NULL,
    "fabricProductId" text,
    "fabricVariantId" text,
    "fabricMeters" double precision,
    "fabricCost" double precision DEFAULT 0 NOT NULL,
    "stitchingCost" double precision DEFAULT 0 NOT NULL,
    "embroideryCost" double precision DEFAULT 0 NOT NULL,
    "accessoryCost" double precision DEFAULT 0 NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    size text,
    "colorName" text,
    "designNotes" text,
    "measurementSnapshot" jsonb,
    "referenceImageUrls" text[] DEFAULT ARRAY[]::text[],
    "itemStatus" public."GarmentOrderStatus" DEFAULT 'DRAFT'::public."GarmentOrderStatus" NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GarmentTailoringOrderItem" OWNER TO abubakarmalik;

--
-- Name: GarmentTailoringPayment; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GarmentTailoringPayment" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    amount double precision NOT NULL,
    "paymentMethod" text NOT NULL,
    reference text,
    notes text,
    "receivedById" text,
    "paidAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."GarmentTailoringPayment" OWNER TO abubakarmalik;

--
-- Name: GarmentVariantProfile; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GarmentVariantProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "variantId" text NOT NULL,
    size text,
    "colorName" text,
    "colorHex" text,
    "colorFamily" text,
    "skuSuffix" text,
    barcode text,
    chest double precision,
    waist double precision,
    hip double precision,
    shoulder double precision,
    length double precision,
    "sleeveLength" double precision,
    inseam double precision,
    "weightGrams" double precision,
    "fabricMeters" double precision,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "isAvailable" boolean DEFAULT true NOT NULL,
    "isFeaturedColor" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GarmentVariantProfile" OWNER TO abubakarmalik;

--
-- Name: GymAttendance; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GymAttendance" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "memberId" text NOT NULL,
    "checkInAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "checkOutAt" timestamp(3) without time zone,
    "durationMinutes" integer,
    method public."GymAttendanceMethod" DEFAULT 'MANUAL'::public."GymAttendanceMethod" NOT NULL,
    "entryPoint" text,
    "isGuest" boolean DEFAULT false NOT NULL,
    "guestName" text,
    "guestPhone" text,
    "invitedByMemberId" text,
    "membershipId" text,
    "checkedInById" text,
    notes text,
    "photoUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."GymAttendance" OWNER TO abubakarmalik;

--
-- Name: GymBodyMeasurement; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GymBodyMeasurement" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "memberId" text NOT NULL,
    "measurementDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "measuredById" text,
    "weightKg" double precision,
    "heightCm" double precision,
    bmi double precision,
    "bodyFatPct" double precision,
    "muscleMassPct" double precision,
    "visceralFat" double precision,
    "waterPct" double precision,
    "boneMassKg" double precision,
    "metabolicAge" integer,
    bmr double precision,
    "chestCm" double precision,
    "waistCm" double precision,
    "hipsCm" double precision,
    "bicepsCm" double precision,
    "thighsCm" double precision,
    "calvesCm" double precision,
    "neckCm" double precision,
    "shouldersCm" double precision,
    "forearmsCm" double precision,
    "bloodPressure" text,
    "restingHeartRate" integer,
    "frontPhotoUrl" text,
    "sidePhotoUrl" text,
    "backPhotoUrl" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."GymBodyMeasurement" OWNER TO abubakarmalik;

--
-- Name: GymClass; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GymClass" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "trainerId" text,
    name text NOT NULL,
    "classType" public."GymClassType" DEFAULT 'OTHER'::public."GymClassType" NOT NULL,
    description text,
    "scheduledStart" timestamp(3) without time zone NOT NULL,
    "scheduledEnd" timestamp(3) without time zone NOT NULL,
    "actualStart" timestamp(3) without time zone,
    "actualEnd" timestamp(3) without time zone,
    "durationMinutes" integer DEFAULT 60 NOT NULL,
    "isRecurring" boolean DEFAULT false NOT NULL,
    "recurrencePattern" text,
    "recurrenceDays" integer[] DEFAULT ARRAY[]::integer[],
    "recurrenceEndDate" timestamp(3) without time zone,
    "maxParticipants" integer DEFAULT 20 NOT NULL,
    "minParticipants" integer DEFAULT 1 NOT NULL,
    "currentEnrolled" integer DEFAULT 0 NOT NULL,
    "isFree" boolean DEFAULT true NOT NULL,
    "dropInPrice" double precision DEFAULT 0 NOT NULL,
    "memberPrice" double precision DEFAULT 0 NOT NULL,
    location text,
    "roomName" text,
    "difficultyLevel" text,
    "targetAudience" text,
    status public."GymClassStatus" DEFAULT 'SCHEDULED'::public."GymClassStatus" NOT NULL,
    "cancelledReason" text,
    "imageUrl" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GymClass" OWNER TO abubakarmalik;

--
-- Name: GymClassBooking; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GymClassBooking" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "classId" text NOT NULL,
    "memberId" text NOT NULL,
    "bookingNumber" text NOT NULL,
    status text DEFAULT 'BOOKED'::text NOT NULL,
    "bookedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "checkedInAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "cancellationReason" text,
    price double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    attended boolean DEFAULT false NOT NULL,
    rating integer,
    feedback text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GymClassBooking" OWNER TO abubakarmalik;

--
-- Name: GymDietPlan; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GymDietPlan" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "memberId" text NOT NULL,
    "trainerId" text,
    "planName" text NOT NULL,
    "planType" text,
    goal public."GymGoal" DEFAULT 'GENERAL_FITNESS'::public."GymGoal" NOT NULL,
    "startDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endDate" timestamp(3) without time zone,
    "durationDays" integer,
    "targetCalories" double precision,
    "proteinGrams" double precision,
    "carbsGrams" double precision,
    "fatsGrams" double precision,
    meals jsonb,
    restrictions text[] DEFAULT ARRAY[]::text[],
    supplements text[] DEFAULT ARRAY[]::text[],
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GymDietPlan" OWNER TO abubakarmalik;

--
-- Name: GymEquipment; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GymEquipment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "equipmentNumber" text NOT NULL,
    name text NOT NULL,
    category public."GymEquipmentCategory" NOT NULL,
    brand text,
    model text,
    "serialNumber" text,
    "purchaseDate" timestamp(3) without time zone,
    "purchasePrice" double precision,
    "vendorName" text,
    "warrantyExpiry" timestamp(3) without time zone,
    location text,
    "roomName" text,
    status public."GymEquipmentStatus" DEFAULT 'AVAILABLE'::public."GymEquipmentStatus" NOT NULL,
    "lastMaintenanceDate" timestamp(3) without time zone,
    "nextMaintenanceDate" timestamp(3) without time zone,
    "maintenanceIntervalDays" integer,
    "totalMaintenanceCost" double precision DEFAULT 0 NOT NULL,
    "usageCount" integer DEFAULT 0 NOT NULL,
    "lastUsedAt" timestamp(3) without time zone,
    "imageUrls" text[] DEFAULT ARRAY[]::text[],
    "manualUrl" text,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GymEquipment" OWNER TO abubakarmalik;

--
-- Name: GymMember; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GymMember" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerId" text NOT NULL,
    "shopId" text,
    "memberNumber" text NOT NULL,
    "rfidCard" text,
    "biometricId" text,
    "qrCode" text,
    "dateOfBirth" timestamp(3) without time zone,
    gender text,
    "bloodGroup" text,
    "emergencyContactName" text,
    "emergencyContactPhone" text,
    "emergencyContactRelation" text,
    "heightCm" double precision,
    "currentWeightKg" double precision,
    "targetWeightKg" double precision,
    "bodyFatPct" double precision,
    "muscleMassPct" double precision,
    bmi double precision,
    "primaryGoal" public."GymGoal" DEFAULT 'GENERAL_FITNESS'::public."GymGoal" NOT NULL,
    "secondaryGoals" public."GymGoal"[] DEFAULT ARRAY[]::public."GymGoal"[],
    "fitnessLevel" text,
    "experienceYears" double precision,
    "medicalConditions" text,
    injuries text,
    allergies text[] DEFAULT ARRAY[]::text[],
    medications text,
    "doctorClearance" boolean DEFAULT false NOT NULL,
    "doctorClearanceUrl" text,
    "preferredWorkoutTime" text,
    "preferredTrainerId" text,
    "workoutDays" integer[] DEFAULT ARRAY[]::integer[],
    "dietaryPreferences" text[] DEFAULT ARRAY[]::text[],
    "photoUrl" text,
    bio text,
    notes text,
    status public."GymMemberStatus" DEFAULT 'ACTIVE'::public."GymMemberStatus" NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastVisitAt" timestamp(3) without time zone,
    "totalVisits" integer DEFAULT 0 NOT NULL,
    "totalSpent" double precision DEFAULT 0 NOT NULL,
    "currentStreak" integer DEFAULT 0 NOT NULL,
    "longestStreak" integer DEFAULT 0 NOT NULL,
    "referredById" text,
    "referralCode" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GymMember" OWNER TO abubakarmalik;

--
-- Name: GymMemberMembership; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GymMemberMembership" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "memberId" text NOT NULL,
    "planId" text NOT NULL,
    "membershipNumber" text NOT NULL,
    status public."GymMembershipStatus" DEFAULT 'ACTIVE'::public."GymMembershipStatus" NOT NULL,
    "startDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "actualEndDate" timestamp(3) without time zone,
    "totalPrice" double precision NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "balanceDue" double precision DEFAULT 0 NOT NULL,
    "paymentStatus" text DEFAULT 'UNPAID'::text NOT NULL,
    "visitsUsed" integer DEFAULT 0 NOT NULL,
    "visitsRemaining" integer,
    "classesUsed" integer DEFAULT 0 NOT NULL,
    "ptSessionsUsed" integer DEFAULT 0 NOT NULL,
    "guestPassesUsed" integer DEFAULT 0 NOT NULL,
    "isFrozen" boolean DEFAULT false NOT NULL,
    "frozenAt" timestamp(3) without time zone,
    "frozenUntil" timestamp(3) without time zone,
    "frozenReason" text,
    "totalFrozenDays" integer DEFAULT 0 NOT NULL,
    "cancelledAt" timestamp(3) without time zone,
    "cancellationReason" text,
    "refundAmount" double precision DEFAULT 0 NOT NULL,
    "autoRenew" boolean DEFAULT false NOT NULL,
    "renewalReminded" boolean DEFAULT false NOT NULL,
    "parentMembershipId" text,
    notes text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GymMemberMembership" OWNER TO abubakarmalik;

--
-- Name: GymMembershipPlan; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GymMembershipPlan" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    name text NOT NULL,
    code text,
    description text,
    "planType" public."GymMembershipPlanType" DEFAULT 'MONTHLY'::public."GymMembershipPlanType" NOT NULL,
    price double precision NOT NULL,
    "registrationFee" double precision DEFAULT 0 NOT NULL,
    "securityDeposit" double precision DEFAULT 0 NOT NULL,
    "durationDays" integer DEFAULT 30 NOT NULL,
    "visitLimit" integer,
    "isUnlimited" boolean DEFAULT true NOT NULL,
    "accessAllHours" boolean DEFAULT false NOT NULL,
    "accessTimeStart" text,
    "accessTimeEnd" text,
    "accessDays" integer[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6, 0],
    "includesPersonalTraining" boolean DEFAULT false NOT NULL,
    "personalTrainingSessions" integer DEFAULT 0 NOT NULL,
    "includesClasses" boolean DEFAULT true NOT NULL,
    "classesLimit" integer,
    "includesNutritionPlan" boolean DEFAULT false NOT NULL,
    "includesLockerFacility" boolean DEFAULT false NOT NULL,
    "includesTowelService" boolean DEFAULT false NOT NULL,
    "includesSteamSauna" boolean DEFAULT false NOT NULL,
    "includesSwimmingPool" boolean DEFAULT false NOT NULL,
    "includesGuestPasses" integer DEFAULT 0 NOT NULL,
    "allowFreeze" boolean DEFAULT false NOT NULL,
    "maxFreezeDays" integer DEFAULT 0 NOT NULL,
    "freezeFee" double precision DEFAULT 0 NOT NULL,
    "colorTheme" text,
    "iconUrl" text,
    "imageUrl" text,
    benefits text[] DEFAULT ARRAY[]::text[],
    "isFeatured" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "totalSubscribers" integer DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GymMembershipPlan" OWNER TO abubakarmalik;

--
-- Name: GymPersonalTraining; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GymPersonalTraining" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "memberId" text NOT NULL,
    "trainerId" text NOT NULL,
    "sessionNumber" text NOT NULL,
    "scheduledStart" timestamp(3) without time zone NOT NULL,
    "scheduledEnd" timestamp(3) without time zone NOT NULL,
    "actualStart" timestamp(3) without time zone,
    "actualEnd" timestamp(3) without time zone,
    "durationMinutes" integer DEFAULT 60 NOT NULL,
    status text DEFAULT 'SCHEDULED'::text NOT NULL,
    "cancelledAt" timestamp(3) without time zone,
    "cancellationReason" text,
    "focusArea" text,
    "workoutPlan" jsonb,
    "exercisesPerformed" jsonb,
    "caloriesBurned" double precision,
    price double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "isFromPackage" boolean DEFAULT false NOT NULL,
    "commissionAmount" double precision DEFAULT 0 NOT NULL,
    "memberRating" integer,
    "memberFeedback" text,
    "trainerNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GymPersonalTraining" OWNER TO abubakarmalik;

--
-- Name: GymTrainer; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GymTrainer" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "staffId" text NOT NULL,
    "shopId" text,
    "trainerNumber" text NOT NULL,
    role public."GymTrainerRole" DEFAULT 'PERSONAL_TRAINER'::public."GymTrainerRole" NOT NULL,
    specializations text[] DEFAULT ARRAY[]::text[],
    certifications text[] DEFAULT ARRAY[]::text[],
    "experienceYears" double precision,
    bio text,
    "photoUrl" text,
    "hourlyRate" double precision DEFAULT 0 NOT NULL,
    "perSessionRate" double precision DEFAULT 0 NOT NULL,
    "monthlyPackageRate" double precision DEFAULT 0 NOT NULL,
    "commissionPct" double precision DEFAULT 0 NOT NULL,
    "commissionFixed" double precision DEFAULT 0 NOT NULL,
    "workingDays" integer[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6],
    "workStartTime" text DEFAULT '06:00'::text NOT NULL,
    "workEndTime" text DEFAULT '22:00'::text NOT NULL,
    "isAvailable" boolean DEFAULT true NOT NULL,
    "maxDailyClients" integer,
    "totalClients" integer DEFAULT 0 NOT NULL,
    "activeClients" integer DEFAULT 0 NOT NULL,
    "totalSessions" integer DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    "totalCommission" double precision DEFAULT 0 NOT NULL,
    "avgRating" double precision,
    "totalReviews" integer DEFAULT 0 NOT NULL,
    "socialMedia" jsonb,
    languages text[] DEFAULT ARRAY[]::text[],
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GymTrainer" OWNER TO abubakarmalik;

--
-- Name: GymWorkoutSession; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."GymWorkoutSession" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "memberId" text NOT NULL,
    "sessionDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "durationMinutes" integer,
    "caloriesBurned" double precision,
    "workoutType" text,
    "focusArea" text,
    intensity text,
    exercises jsonb,
    "totalSets" integer DEFAULT 0 NOT NULL,
    "totalReps" integer DEFAULT 0 NOT NULL,
    "totalWeight" double precision DEFAULT 0 NOT NULL,
    notes text,
    "memberRating" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GymWorkoutSession" OWNER TO abubakarmalik;

--
-- Name: HappyHourRule; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."HappyHourRule" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    description text,
    "discountType" text DEFAULT 'PERCENTAGE'::text NOT NULL,
    "discountValue" double precision NOT NULL,
    "startTime" text NOT NULL,
    "endTime" text NOT NULL,
    "daysOfWeek" integer[] DEFAULT ARRAY[]::integer[],
    "validFrom" timestamp(3) without time zone,
    "validTo" timestamp(3) without time zone,
    "categoryIds" text[] DEFAULT ARRAY[]::text[],
    "productIds" text[] DEFAULT ARRAY[]::text[],
    "minOrderAmount" double precision,
    "maxDiscount" double precision,
    "orderModes" public."RestaurantOrderMode"[] DEFAULT ARRAY[]::public."RestaurantOrderMode"[],
    "isActive" boolean DEFAULT true NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "totalUsage" integer DEFAULT 0 NOT NULL,
    "totalSaved" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HappyHourRule" OWNER TO abubakarmalik;

--
-- Name: HardwareBrand; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."HardwareBrand" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    code text,
    tier public."HardwareBrandTier" DEFAULT 'STANDARD'::public."HardwareBrandTier" NOT NULL,
    "countryOfOrigin" text,
    description text,
    "logoUrl" text,
    "supplierContact" text,
    "supplierPhone" text,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "totalProducts" integer DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HardwareBrand" OWNER TO abubakarmalik;

--
-- Name: HardwareBulkPricing; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."HardwareBulkPricing" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "minQuantity" double precision NOT NULL,
    "maxQuantity" double precision,
    price double precision NOT NULL,
    discount double precision,
    "discountPct" double precision,
    label text,
    "isActive" boolean DEFAULT true NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HardwareBulkPricing" OWNER TO abubakarmalik;

--
-- Name: HardwareCreditAccount; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."HardwareCreditAccount" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "accountNumber" text NOT NULL,
    "customerId" text,
    "customerName" text NOT NULL,
    "customerPhone" text,
    "customerCnic" text,
    "businessName" text,
    "businessAddress" text,
    status public."HardwareCreditAccountStatus" DEFAULT 'ACTIVE'::public."HardwareCreditAccountStatus" NOT NULL,
    "creditLimit" double precision DEFAULT 0 NOT NULL,
    "creditDays" integer DEFAULT 30 NOT NULL,
    "interestRateMonthly" double precision DEFAULT 0 NOT NULL,
    "currentBalance" double precision DEFAULT 0 NOT NULL,
    "totalPurchases" double precision DEFAULT 0 NOT NULL,
    "totalPayments" double precision DEFAULT 0 NOT NULL,
    "totalWriteOffs" double precision DEFAULT 0 NOT NULL,
    "totalInterest" double precision DEFAULT 0 NOT NULL,
    "age0To30Days" double precision DEFAULT 0 NOT NULL,
    "age31To60Days" double precision DEFAULT 0 NOT NULL,
    "age61To90Days" double precision DEFAULT 0 NOT NULL,
    "ageOver90Days" double precision DEFAULT 0 NOT NULL,
    "guarantorName" text,
    "guarantorPhone" text,
    "guarantorCnic" text,
    "guarantorRelation" text,
    "chequeSecurity" text,
    "postDatedCheques" text[] DEFAULT ARRAY[]::text[],
    "referredBy" text,
    "openedByStaffId" text,
    "openingDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "closedAt" timestamp(3) without time zone,
    "lastPurchaseDate" timestamp(3) without time zone,
    "lastPaymentDate" timestamp(3) without time zone,
    "lastReminderDate" timestamp(3) without time zone,
    notes text,
    "documentsUrls" text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HardwareCreditAccount" OWNER TO abubakarmalik;

--
-- Name: HardwareCreditTransaction; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."HardwareCreditTransaction" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "accountId" text NOT NULL,
    "transactionNumber" text NOT NULL,
    "transactionType" public."HardwareCreditTransactionType" NOT NULL,
    "transactionDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    amount double precision NOT NULL,
    "runningBalance" double precision NOT NULL,
    "saleId" text,
    "deliveryId" text,
    "paymentMethod" text,
    "paymentReference" text,
    description text NOT NULL,
    notes text,
    "handledById" text,
    "attachmentUrls" text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."HardwareCreditTransaction" OWNER TO abubakarmalik;

--
-- Name: HardwareDelivery; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."HardwareDelivery" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "deliveryNumber" text NOT NULL,
    "saleId" text,
    "projectId" text,
    "quotationId" text,
    "customerId" text,
    "customerName" text NOT NULL,
    "customerPhone" text,
    "deliveryAddress" text NOT NULL,
    city text,
    area text,
    latitude double precision,
    longitude double precision,
    landmark text,
    "siteContactName" text,
    "siteContactPhone" text,
    status public."HardwareDeliveryStatus" DEFAULT 'PENDING'::public."HardwareDeliveryStatus" NOT NULL,
    "vehicleType" public."HardwareDeliveryVehicleType" DEFAULT 'TRUCK'::public."HardwareDeliveryVehicleType" NOT NULL,
    "vehicleNumber" text,
    "driverName" text,
    "driverPhone" text,
    "driverCnic" text,
    "helperName" text,
    "scheduledDate" timestamp(3) without time zone,
    "scheduledTime" text,
    "loadedAt" timestamp(3) without time zone,
    "dispatchedAt" timestamp(3) without time zone,
    "arrivedAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "cancellationReason" text,
    "distanceKm" double precision,
    "deliveryCharge" double precision DEFAULT 0 NOT NULL,
    "loadingCharge" double precision DEFAULT 0 NOT NULL,
    "unloadingCharge" double precision DEFAULT 0 NOT NULL,
    "laborCharge" double precision DEFAULT 0 NOT NULL,
    "tollCharge" double precision DEFAULT 0 NOT NULL,
    "totalCharges" double precision DEFAULT 0 NOT NULL,
    "receivedByName" text,
    "receivedByPhone" text,
    "receivedByCnic" text,
    "receiverSignatureUrl" text,
    "deliveryProofUrls" text[] DEFAULT ARRAY[]::text[],
    "gateEntryNumber" text,
    "loadingInstructions" text,
    "driverInstructions" text,
    "customerNotes" text,
    "internalNotes" text,
    "issueReported" text,
    "createdById" text,
    "dispatchedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HardwareDelivery" OWNER TO abubakarmalik;

--
-- Name: HardwareDeliveryItem; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."HardwareDeliveryItem" (
    id text NOT NULL,
    "deliveryId" text NOT NULL,
    "productId" text,
    "variantId" text,
    "itemName" text NOT NULL,
    brand text,
    "orderedQty" double precision NOT NULL,
    "loadedQty" double precision DEFAULT 0 NOT NULL,
    "deliveredQty" double precision DEFAULT 0 NOT NULL,
    "returnedQty" double precision DEFAULT 0 NOT NULL,
    "damagedQty" double precision DEFAULT 0 NOT NULL,
    unit public."HardwareUnit" DEFAULT 'PIECE'::public."HardwareUnit" NOT NULL,
    "unitPrice" double precision DEFAULT 0 NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    notes text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."HardwareDeliveryItem" OWNER TO abubakarmalik;

--
-- Name: HardwareProductProfile; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."HardwareProductProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "brandId" text,
    "categoryType" public."HardwareCategoryType",
    unit public."HardwareUnit" DEFAULT 'PIECE'::public."HardwareUnit" NOT NULL,
    "bulkUnit" public."HardwareUnit",
    "bulkQuantity" integer,
    "weightKg" double precision,
    "weightPerUnit" double precision,
    "volumePerUnit" double precision,
    "lengthMm" double precision,
    "widthMm" double precision,
    "heightMm" double precision,
    "diameterMm" double precision,
    "thicknessMm" double precision,
    grade text,
    diameter text,
    "gradeStrength" text,
    "bagWeight" double precision,
    "tileSize" text,
    "finishType" text,
    "piecesPerBox" integer,
    "sqftPerBox" double precision,
    "colorCode" text,
    "colorName" text,
    "finishSheen" text,
    coverage double precision,
    "litersPerCan" double precision,
    "minBulkQty" double precision,
    "bulkPrice" double precision,
    "wholesalePrice" double precision,
    "retailPrice" double precision,
    "cashPrice" double precision,
    "creditPrice" double precision,
    "requiresTruck" boolean DEFAULT false NOT NULL,
    "requiresCrane" boolean DEFAULT false NOT NULL,
    "canDeliverInCity" boolean DEFAULT true NOT NULL,
    "canDeliverIntercity" boolean DEFAULT true NOT NULL,
    "deliveryChargePerKm" double precision,
    "minDeliveryCharge" double precision,
    "requiresCoveredStorage" boolean DEFAULT false NOT NULL,
    "requiresDryStorage" boolean DEFAULT false NOT NULL,
    "shelfLifeMonths" integer,
    "hasIsoCertification" boolean DEFAULT false NOT NULL,
    "hasPsqcaCertification" boolean DEFAULT false NOT NULL,
    "certificationNumbers" text[] DEFAULT ARRAY[]::text[],
    "manufacturingLocation" text,
    "batchTraceable" boolean DEFAULT false NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "isBestSeller" boolean DEFAULT false NOT NULL,
    "isFastMoving" boolean DEFAULT false NOT NULL,
    "totalSold" double precision DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    "totalReturns" double precision DEFAULT 0 NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HardwareProductProfile" OWNER TO abubakarmalik;

--
-- Name: HardwareProject; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."HardwareProject" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "projectNumber" text NOT NULL,
    name text NOT NULL,
    description text,
    "customerId" text,
    "customerName" text NOT NULL,
    "customerPhone" text,
    "contractorName" text,
    "contractorPhone" text,
    "architectName" text,
    "siteAddress" text NOT NULL,
    city text,
    area text,
    latitude double precision,
    longitude double precision,
    "siteContactPhone" text,
    "projectType" text,
    "builtUpArea" double precision,
    floors integer,
    "startDate" timestamp(3) without time zone,
    "expectedEndDate" timestamp(3) without time zone,
    "actualEndDate" timestamp(3) without time zone,
    status public."HardwareProjectStatus" DEFAULT 'PLANNING'::public."HardwareProjectStatus" NOT NULL,
    "estimatedBudget" double precision,
    "totalQuoted" double precision DEFAULT 0 NOT NULL,
    "totalOrdered" double precision DEFAULT 0 NOT NULL,
    "totalDelivered" double precision DEFAULT 0 NOT NULL,
    "totalPaid" double precision DEFAULT 0 NOT NULL,
    "totalPending" double precision DEFAULT 0 NOT NULL,
    "creditLimit" double precision DEFAULT 0 NOT NULL,
    "creditDays" integer DEFAULT 0 NOT NULL,
    "imageUrls" text[] DEFAULT ARRAY[]::text[],
    "documentUrls" text[] DEFAULT ARRAY[]::text[],
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HardwareProject" OWNER TO abubakarmalik;

--
-- Name: HardwareQuotation; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."HardwareQuotation" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "quotationNumber" text NOT NULL,
    "projectId" text,
    "customerId" text,
    "customerName" text NOT NULL,
    "customerPhone" text,
    "customerEmail" text,
    "customerAddress" text,
    status public."HardwareQuotationStatus" DEFAULT 'DRAFT'::public."HardwareQuotationStatus" NOT NULL,
    "quotationDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "validUntil" timestamp(3) without time zone NOT NULL,
    "sentAt" timestamp(3) without time zone,
    "viewedAt" timestamp(3) without time zone,
    "respondedAt" timestamp(3) without time zone,
    "convertedAt" timestamp(3) without time zone,
    "convertedSaleId" text,
    subtotal double precision DEFAULT 0 NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    "discountPct" double precision DEFAULT 0 NOT NULL,
    "taxAmount" double precision DEFAULT 0 NOT NULL,
    "taxPct" double precision DEFAULT 0 NOT NULL,
    "deliveryCharges" double precision DEFAULT 0 NOT NULL,
    "laborCharges" double precision DEFAULT 0 NOT NULL,
    "otherCharges" double precision DEFAULT 0 NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    "paymentTerms" text,
    "deliveryTerms" text,
    "warrantyTerms" text,
    "specialTerms" text,
    "validityDays" integer DEFAULT 15 NOT NULL,
    "attachmentUrls" text[] DEFAULT ARRAY[]::text[],
    "internalNotes" text,
    "customerNotes" text,
    "revisionNumber" integer DEFAULT 1 NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HardwareQuotation" OWNER TO abubakarmalik;

--
-- Name: HardwareQuotationItem; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."HardwareQuotationItem" (
    id text NOT NULL,
    "quotationId" text NOT NULL,
    "productId" text,
    "variantId" text,
    "itemName" text NOT NULL,
    "itemDescription" text,
    brand text,
    specifications text,
    quantity double precision NOT NULL,
    unit public."HardwareUnit" DEFAULT 'PIECE'::public."HardwareUnit" NOT NULL,
    "unitPrice" double precision NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    "discountPct" double precision DEFAULT 0 NOT NULL,
    total double precision NOT NULL,
    "imageUrl" text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HardwareQuotationItem" OWNER TO abubakarmalik;

--
-- Name: HardwareReorderRule; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."HardwareReorderRule" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "minStock" double precision NOT NULL,
    "reorderPoint" double precision NOT NULL,
    "reorderQty" double precision NOT NULL,
    "maxStock" double precision,
    "preferredSupplier" text,
    "leadTimeDays" integer,
    "emergencyContact" text,
    "autoAlert" boolean DEFAULT true NOT NULL,
    "lastAlertAt" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HardwareReorderRule" OWNER TO abubakarmalik;

--
-- Name: HotelBookedRoom; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."HotelBookedRoom" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    "roomId" text,
    "roomTypeId" text NOT NULL,
    "roomNumber" text,
    "ratePerNight" double precision NOT NULL,
    "totalNights" integer NOT NULL,
    "totalAmount" double precision NOT NULL,
    adults integer DEFAULT 1 NOT NULL,
    children integer DEFAULT 0 NOT NULL,
    "extraBeds" integer DEFAULT 0 NOT NULL,
    "isComplimentary" boolean DEFAULT false NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."HotelBookedRoom" OWNER TO abubakarmalik;

--
-- Name: HotelBooking; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."HotelBooking" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "bookingNumber" text NOT NULL,
    "confirmationCode" text,
    "primaryGuestId" text,
    "guestName" text NOT NULL,
    "guestPhone" text NOT NULL,
    "guestEmail" text,
    "totalAdults" integer DEFAULT 1 NOT NULL,
    "totalChildren" integer DEFAULT 0 NOT NULL,
    "checkInDate" timestamp(3) without time zone NOT NULL,
    "checkOutDate" timestamp(3) without time zone NOT NULL,
    nights integer DEFAULT 1 NOT NULL,
    "actualCheckIn" timestamp(3) without time zone,
    "actualCheckOut" timestamp(3) without time zone,
    "earlyCheckIn" boolean DEFAULT false NOT NULL,
    "lateCheckOut" boolean DEFAULT false NOT NULL,
    source public."BookingSource" DEFAULT 'DIRECT'::public."BookingSource" NOT NULL,
    "sourceRef" text,
    "bookedBy" text,
    "agentName" text,
    "agentCommission" double precision DEFAULT 0 NOT NULL,
    "mealPlan" public."MealPlan" DEFAULT 'ROOM_ONLY'::public."MealPlan" NOT NULL,
    status public."HotelBookingStatus" DEFAULT 'CONFIRMED'::public."HotelBookingStatus" NOT NULL,
    "roomTotal" double precision DEFAULT 0 NOT NULL,
    "taxAmount" double precision DEFAULT 0 NOT NULL,
    "serviceCharge" double precision DEFAULT 0 NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    "extraCharges" double precision DEFAULT 0 NOT NULL,
    "grandTotal" double precision DEFAULT 0 NOT NULL,
    "advancePaid" double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "balanceAmount" double precision DEFAULT 0 NOT NULL,
    "paymentStatus" text DEFAULT 'UNPAID'::text NOT NULL,
    "specialRequests" text,
    "arrivalTime" text,
    "purposeOfVisit" text,
    "cancelledAt" timestamp(3) without time zone,
    "cancellationReason" text,
    "refundAmount" double precision DEFAULT 0 NOT NULL,
    "createdById" text,
    "checkedInBy" text,
    "checkedOutBy" text,
    "cancelledBy" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HotelBooking" OWNER TO abubakarmalik;

--
-- Name: HotelFolioCharge; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."HotelFolioCharge" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    "chargeNumber" text NOT NULL,
    "chargeDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "chargeType" public."FolioChargeType" NOT NULL,
    description text NOT NULL,
    quantity double precision DEFAULT 1 NOT NULL,
    "unitPrice" double precision NOT NULL,
    "taxAmount" double precision DEFAULT 0 NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    "totalAmount" double precision NOT NULL,
    reference text,
    "postedById" text,
    "isVoid" boolean DEFAULT false NOT NULL,
    "voidedAt" timestamp(3) without time zone,
    "voidReason" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."HotelFolioCharge" OWNER TO abubakarmalik;

--
-- Name: HotelGuest; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."HotelGuest" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "guestNumber" text NOT NULL,
    "customerId" text,
    title text,
    "firstName" text NOT NULL,
    "lastName" text,
    "fullName" text NOT NULL,
    email text,
    phone text NOT NULL,
    "altPhone" text,
    "idType" public."GuestIdType",
    "idNumber" text,
    "idExpiryDate" timestamp(3) without time zone,
    "idFrontUrl" text,
    "idBackUrl" text,
    "dateOfBirth" timestamp(3) without time zone,
    gender text,
    nationality text,
    language text,
    address text,
    city text,
    state text,
    country text,
    "zipCode" text,
    "companyName" text,
    designation text,
    "gstNumber" text,
    "isVIP" boolean DEFAULT false NOT NULL,
    "vipLevel" text,
    "loyaltyNumber" text,
    "loyaltyPoints" integer DEFAULT 0 NOT NULL,
    preferences jsonb,
    allergies text[] DEFAULT ARRAY[]::text[],
    "dietaryRestrictions" text[] DEFAULT ARRAY[]::text[],
    "specialRequests" text,
    "isBlacklisted" boolean DEFAULT false NOT NULL,
    "blacklistReason" text,
    "totalStays" integer DEFAULT 0 NOT NULL,
    "totalNights" integer DEFAULT 0 NOT NULL,
    "totalSpent" double precision DEFAULT 0 NOT NULL,
    "lastStayAt" timestamp(3) without time zone,
    "photoUrl" text,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HotelGuest" OWNER TO abubakarmalik;

--
-- Name: HotelHousekeepingTask; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."HotelHousekeepingTask" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "taskNumber" text NOT NULL,
    "roomId" text,
    "roomNumber" text NOT NULL,
    "taskType" text NOT NULL,
    priority text DEFAULT 'NORMAL'::text NOT NULL,
    "scheduledFor" timestamp(3) without time zone,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "durationMin" integer,
    "assignedTo" text,
    "assignedName" text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    checklist jsonb,
    "suppliesUsed" jsonb,
    notes text,
    "issueFound" text,
    "photoUrls" text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HotelHousekeepingTask" OWNER TO abubakarmalik;

--
-- Name: HotelRatePlan; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."HotelRatePlan" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "planType" text NOT NULL,
    "mealPlan" public."MealPlan" DEFAULT 'ROOM_ONLY'::public."MealPlan" NOT NULL,
    "isPercentage" boolean DEFAULT false NOT NULL,
    adjustment double precision DEFAULT 0 NOT NULL,
    "minNights" integer,
    "maxNights" integer,
    "applicableDays" integer[] DEFAULT ARRAY[]::integer[],
    "advanceBookingDays" integer,
    "cancellationHours" integer,
    "applicableRoomTypeIds" text[] DEFAULT ARRAY[]::text[],
    "applicableSources" text[] DEFAULT ARRAY[]::text[],
    "isActive" boolean DEFAULT true NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HotelRatePlan" OWNER TO abubakarmalik;

--
-- Name: HotelRoom; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."HotelRoom" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "roomTypeId" text NOT NULL,
    "roomNumber" text NOT NULL,
    floor text,
    building text,
    wing text,
    status public."RoomStatus" DEFAULT 'AVAILABLE'::public."RoomStatus" NOT NULL,
    "housekeepingStatus" public."HousekeepingStatus" DEFAULT 'CLEAN'::public."HousekeepingStatus" NOT NULL,
    "customPrice" double precision,
    "customNotes" text,
    "lastCleanedAt" timestamp(3) without time zone,
    "lastInspectedAt" timestamp(3) without time zone,
    "maintenanceUntil" timestamp(3) without time zone,
    "maintenanceNotes" text,
    "viewType" text,
    facing text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HotelRoom" OWNER TO abubakarmalik;

--
-- Name: HotelRoomType; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."HotelRoomType" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    type public."RoomType" DEFAULT 'DOUBLE'::public."RoomType" NOT NULL,
    description text,
    "maxAdults" integer DEFAULT 2 NOT NULL,
    "maxChildren" integer DEFAULT 0 NOT NULL,
    "maxOccupancy" integer DEFAULT 2 NOT NULL,
    "bedType" public."BedType" DEFAULT 'DOUBLE_BED'::public."BedType" NOT NULL,
    "bedCount" integer DEFAULT 1 NOT NULL,
    "extraBedAllowed" boolean DEFAULT false NOT NULL,
    "extraBedPrice" double precision DEFAULT 0 NOT NULL,
    "sizeSqft" double precision,
    "sizeSqm" double precision,
    "basePrice" double precision DEFAULT 0 NOT NULL,
    "weekendPrice" double precision,
    "peakPrice" double precision,
    "offSeasonPrice" double precision,
    "hourlyPrice" double precision,
    "hasAC" boolean DEFAULT true NOT NULL,
    "hasHeater" boolean DEFAULT false NOT NULL,
    "hasTV" boolean DEFAULT true NOT NULL,
    "hasWifi" boolean DEFAULT true NOT NULL,
    "hasBalcony" boolean DEFAULT false NOT NULL,
    "hasKitchen" boolean DEFAULT false NOT NULL,
    "hasBathtub" boolean DEFAULT false NOT NULL,
    "hasSafe" boolean DEFAULT false NOT NULL,
    "hasMinibar" boolean DEFAULT false NOT NULL,
    "isPetFriendly" boolean DEFAULT false NOT NULL,
    "isSmoking" boolean DEFAULT false NOT NULL,
    amenities text[] DEFAULT ARRAY[]::text[],
    "imageUrls" text[] DEFAULT ARRAY[]::text[],
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HotelRoomType" OWNER TO abubakarmalik;

--
-- Name: Invoice; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Invoice" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "subscriptionId" text,
    "invoiceNumber" text NOT NULL,
    status public."InvoiceStatus" DEFAULT 'PENDING'::public."InvoiceStatus" NOT NULL,
    subtotal double precision NOT NULL,
    tax double precision DEFAULT 0 NOT NULL,
    total double precision NOT NULL,
    "amountPaid" double precision DEFAULT 0 NOT NULL,
    "amountDue" double precision NOT NULL,
    currency text DEFAULT 'PKR'::text NOT NULL,
    description text,
    notes text,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "periodStart" timestamp(3) without time zone,
    "periodEnd" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Invoice" OWNER TO abubakarmalik;

--
-- Name: JewelryCustomOrder; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."JewelryCustomOrder" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "orderNumber" text NOT NULL,
    "customerId" text,
    "customerName" text NOT NULL,
    "customerPhone" text NOT NULL,
    "customerEmail" text,
    "orderDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "promisedDate" timestamp(3) without time zone,
    status public."JewelryOrderStatus" DEFAULT 'DRAFT'::public."JewelryOrderStatus" NOT NULL,
    category public."JewelryCategory" NOT NULL,
    "metalType" public."JewelryMetalType" NOT NULL,
    purity public."JewelryPurity" NOT NULL,
    style public."JewelryStyle" DEFAULT 'CUSTOM'::public."JewelryStyle" NOT NULL,
    "expectedGrossWeight" double precision NOT NULL,
    "expectedNetWeight" double precision,
    "expectedMakingCharges" double precision,
    "advancePayment" double precision DEFAULT 0 NOT NULL,
    "estimatedPrice" double precision NOT NULL,
    "finalPrice" double precision,
    "designDescription" text NOT NULL,
    "referenceImageUrls" text[] DEFAULT ARRAY[]::text[],
    "approvedDesignUrl" text,
    "hasGemstones" boolean DEFAULT false NOT NULL,
    "gemstonesRequired" jsonb,
    "hasEngraving" boolean DEFAULT false NOT NULL,
    "engravingText" text,
    "designedBy" text,
    "assignedKarigarId" text,
    "assignedKarigarName" text,
    "metalIssuedGrams" double precision,
    "metalIssuedDate" timestamp(3) without time zone,
    "metalReceivedGrams" double precision,
    "metalReceivedDate" timestamp(3) without time zone,
    "wastageGrams" double precision,
    "designStartedAt" timestamp(3) without time zone,
    "designApprovedAt" timestamp(3) without time zone,
    "productionStartedAt" timestamp(3) without time zone,
    "polishingStartedAt" timestamp(3) without time zone,
    "qualityCheckedAt" timestamp(3) without time zone,
    "hallmarkedAt" timestamp(3) without time zone,
    "readyAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "customerRating" integer,
    "customerFeedback" text,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "paymentStatus" text DEFAULT 'ADVANCE_PAID'::text NOT NULL,
    "hallmarkNumber" text,
    "certificateNumber" text,
    "internalNotes" text,
    "cancellationReason" text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."JewelryCustomOrder" OWNER TO abubakarmalik;

--
-- Name: JewelryExchange; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."JewelryExchange" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "exchangeNumber" text NOT NULL,
    "exchangeType" public."ExchangeType" NOT NULL,
    "customerId" text,
    "customerName" text NOT NULL,
    "customerPhone" text NOT NULL,
    "customerCnic" text,
    "exchangeDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "itemDescription" text NOT NULL,
    "metalType" public."JewelryMetalType" NOT NULL,
    "claimedPurity" public."JewelryPurity" NOT NULL,
    "grossWeight" double precision NOT NULL,
    "testedPurity" public."JewelryPurity",
    "netWeight" double precision,
    "stoneWeight" double precision DEFAULT 0 NOT NULL,
    "fineGoldEquivalent" double precision,
    "ratePerGram" double precision NOT NULL,
    "grossValue" double precision NOT NULL,
    deductions double precision DEFAULT 0 NOT NULL,
    "netValue" double precision NOT NULL,
    "meltingCharges" double precision DEFAULT 0 NOT NULL,
    "testingCharges" double precision DEFAULT 0 NOT NULL,
    "saleId" text,
    "usedAgainstOrderId" text,
    purpose text,
    "testingMethod" text,
    "testedBy" text,
    "witnessedBy" text,
    "photoUrls" text[] DEFAULT ARRAY[]::text[],
    "cnicPhotoUrl" text,
    notes text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."JewelryExchange" OWNER TO abubakarmalik;

--
-- Name: JewelryGemstone; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."JewelryGemstone" (
    id text NOT NULL,
    "jewelryProfileId" text NOT NULL,
    type public."GemstoneType" NOT NULL,
    count integer DEFAULT 1 NOT NULL,
    caret double precision NOT NULL,
    quality text,
    color text,
    clarity text,
    cut text,
    shape text,
    origin text,
    "isCertified" boolean DEFAULT false NOT NULL,
    "certificateNumber" text,
    "ratePerCaret" double precision,
    "totalValue" double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."JewelryGemstone" OWNER TO abubakarmalik;

--
-- Name: JewelryKarigar; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."JewelryKarigar" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "karigarNumber" text NOT NULL,
    "fullName" text NOT NULL,
    "fatherName" text,
    cnic text,
    phone text NOT NULL,
    address text,
    "photoUrl" text,
    specializations text[] DEFAULT ARRAY[]::text[],
    "yearsExperience" integer,
    "skillLevel" text,
    "hourlyRate" double precision,
    "perGramRate" double precision,
    "fixedRatePerPiece" double precision,
    "metalIssuedGrams" double precision DEFAULT 0 NOT NULL,
    "metalReturnedGrams" double precision DEFAULT 0 NOT NULL,
    "wastageGrams" double precision DEFAULT 0 NOT NULL,
    "outstandingGrams" double precision DEFAULT 0 NOT NULL,
    "totalOrders" integer DEFAULT 0 NOT NULL,
    "completedOrders" integer DEFAULT 0 NOT NULL,
    "totalEarnings" double precision DEFAULT 0 NOT NULL,
    "qualityRating" double precision,
    "isActive" boolean DEFAULT true NOT NULL,
    "isInHouse" boolean DEFAULT true NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."JewelryKarigar" OWNER TO abubakarmalik;

--
-- Name: JewelryMetalRate; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."JewelryMetalRate" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "metalType" public."JewelryMetalType" NOT NULL,
    purity public."JewelryPurity" NOT NULL,
    "ratePerGram" double precision NOT NULL,
    "ratePerTola" double precision,
    "ratePerOunce" double precision,
    "buyRate" double precision,
    "sellRate" double precision,
    "effectiveDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    source text,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."JewelryMetalRate" OWNER TO abubakarmalik;

--
-- Name: JewelryMetalStock; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."JewelryMetalStock" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "entryNumber" text NOT NULL,
    "entryDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "entryType" text NOT NULL,
    "metalType" public."JewelryMetalType" NOT NULL,
    purity public."JewelryPurity" NOT NULL,
    grams double precision NOT NULL,
    "balanceGrams" double precision DEFAULT 0 NOT NULL,
    "ratePerGram" double precision,
    "totalValue" double precision,
    source text,
    reference text,
    "karigarId" text,
    "saleId" text,
    "exchangeId" text,
    notes text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."JewelryMetalStock" OWNER TO abubakarmalik;

--
-- Name: JewelryProductProfile; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."JewelryProductProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "itemCode" text,
    "designNumber" text,
    category public."JewelryCategory" NOT NULL,
    "subCategory" text,
    style public."JewelryStyle" DEFAULT 'TRADITIONAL'::public."JewelryStyle" NOT NULL,
    "metalType" public."JewelryMetalType" NOT NULL,
    purity public."JewelryPurity" NOT NULL,
    "purityHallmark" text,
    "grossWeight" double precision NOT NULL,
    "netWeight" double precision NOT NULL,
    "stoneWeight" double precision DEFAULT 0 NOT NULL,
    "waxWeight" double precision DEFAULT 0 NOT NULL,
    "otherWeight" double precision DEFAULT 0 NOT NULL,
    size text,
    length double precision,
    width double precision,
    thickness double precision,
    "makingChargePerGram" double precision DEFAULT 0 NOT NULL,
    "makingChargeFixed" double precision DEFAULT 0 NOT NULL,
    "makingChargePct" double precision DEFAULT 0 NOT NULL,
    "wastagePct" double precision DEFAULT 0 NOT NULL,
    "wastageGrams" double precision DEFAULT 0 NOT NULL,
    "designerCharge" double precision DEFAULT 0 NOT NULL,
    "polishCharge" double precision DEFAULT 0 NOT NULL,
    "hallmarkCharge" double precision DEFAULT 0 NOT NULL,
    "otherCharges" double precision DEFAULT 0 NOT NULL,
    "hasStones" boolean DEFAULT false NOT NULL,
    "hasDiamond" boolean DEFAULT false NOT NULL,
    "hasGemstone" boolean DEFAULT false NOT NULL,
    "hasPearl" boolean DEFAULT false NOT NULL,
    "stoneCount" integer DEFAULT 0 NOT NULL,
    "stoneCaret" double precision,
    "stoneQuality" text,
    "stoneColor" text,
    "stoneClarity" text,
    "stoneCut" text,
    "hallmarkNumber" text,
    "hallmarkAuthority" text,
    "hallmarkDate" timestamp(3) without time zone,
    "bisNumber" text,
    "jewellerCode" text,
    "hallmarkPhotoUrl" text,
    "designerName" text,
    "karigarName" text,
    "workshopName" text,
    "countryOfOrigin" text,
    "isCustomOrder" boolean DEFAULT false NOT NULL,
    "isBespoke" boolean DEFAULT false NOT NULL,
    "isAntique" boolean DEFAULT false NOT NULL,
    "isCertified" boolean DEFAULT false NOT NULL,
    "certificateNumber" text,
    "certificateAuthority" text,
    "certificatePhotoUrl" text,
    "isBuyBackEligible" boolean DEFAULT true NOT NULL,
    "buyBackPct" double precision DEFAULT 90 NOT NULL,
    "isReturnable" boolean DEFAULT false NOT NULL,
    "returnDays" integer DEFAULT 0 NOT NULL,
    "currentValue" double precision,
    "lastValuationDate" timestamp(3) without time zone,
    "insuredValue" double precision,
    "insurancePolicyNumber" text,
    "insuranceExpiry" timestamp(3) without time zone,
    "imageUrls" text[] DEFAULT ARRAY[]::text[],
    "videoUrl" text,
    "descriptionLong" text,
    "careInstructions" text,
    "isPopular" boolean DEFAULT false NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "isBestSeller" boolean DEFAULT false NOT NULL,
    "isBridalCollection" boolean DEFAULT false NOT NULL,
    "isFestivalSpecial" boolean DEFAULT false NOT NULL,
    "totalSold" integer DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."JewelryProductProfile" OWNER TO abubakarmalik;

--
-- Name: JewelrySale; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."JewelrySale" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "invoiceNumber" text NOT NULL,
    "customerId" text,
    "customerName" text,
    "customerPhone" text,
    "customerCnic" text,
    "customerAddress" text,
    "saleDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public."JewelryOrderStatus" DEFAULT 'CONFIRMED'::public."JewelryOrderStatus" NOT NULL,
    "metalRateSnapshot" jsonb,
    "grossWeight" double precision NOT NULL,
    "netWeight" double precision NOT NULL,
    "metalValue" double precision NOT NULL,
    "makingCharges" double precision DEFAULT 0 NOT NULL,
    "wastageValue" double precision DEFAULT 0 NOT NULL,
    "polishCharges" double precision DEFAULT 0 NOT NULL,
    "hallmarkCharges" double precision DEFAULT 0 NOT NULL,
    "stoneValue" double precision DEFAULT 0 NOT NULL,
    "gstAmount" double precision DEFAULT 0 NOT NULL,
    "otherCharges" double precision DEFAULT 0 NOT NULL,
    subtotal double precision NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    total double precision NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "paymentStatus" text DEFAULT 'UNPAID'::text NOT NULL,
    "paymentMethod" text,
    "exchangeMetalGrams" double precision DEFAULT 0 NOT NULL,
    "exchangeMetalPurity" public."JewelryPurity",
    "exchangeValue" double precision DEFAULT 0 NOT NULL,
    "hallmarkVerified" boolean DEFAULT false NOT NULL,
    "hasCertificate" boolean DEFAULT false NOT NULL,
    "isReturned" boolean DEFAULT false NOT NULL,
    "returnedAt" timestamp(3) without time zone,
    "returnReason" text,
    "isExchanged" boolean DEFAULT false NOT NULL,
    "exchangedAt" timestamp(3) without time zone,
    "exchangeType" public."ExchangeType",
    "customerNotes" text,
    "internalNotes" text,
    "createdById" text,
    "cancelledAt" timestamp(3) without time zone,
    "cancellationReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."JewelrySale" OWNER TO abubakarmalik;

--
-- Name: JewelrySaleItem; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."JewelrySaleItem" (
    id text NOT NULL,
    "saleId" text NOT NULL,
    "productId" text,
    "productName" text NOT NULL,
    category public."JewelryCategory" NOT NULL,
    "metalType" public."JewelryMetalType" NOT NULL,
    purity public."JewelryPurity" NOT NULL,
    "ratePerGram" double precision NOT NULL,
    "grossWeight" double precision NOT NULL,
    "netWeight" double precision NOT NULL,
    "metalValue" double precision NOT NULL,
    "makingChargePerGram" double precision DEFAULT 0 NOT NULL,
    "makingChargeFixed" double precision DEFAULT 0 NOT NULL,
    "makingChargePct" double precision DEFAULT 0 NOT NULL,
    "makingTotal" double precision DEFAULT 0 NOT NULL,
    "wastagePct" double precision DEFAULT 0 NOT NULL,
    "wastageValue" double precision DEFAULT 0 NOT NULL,
    "polishCharges" double precision DEFAULT 0 NOT NULL,
    "hallmarkCharges" double precision DEFAULT 0 NOT NULL,
    "stoneValue" double precision DEFAULT 0 NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    "itemTotal" double precision NOT NULL,
    "hallmarkNumber" text,
    "certificateNumber" text,
    "itemPhotoUrl" text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."JewelrySaleItem" OWNER TO abubakarmalik;

--
-- Name: KitchenStation; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."KitchenStation" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    code text,
    "printerName" text,
    "categoryIds" text[] DEFAULT ARRAY[]::text[],
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."KitchenStation" OWNER TO abubakarmalik;

--
-- Name: Kot; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Kot" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "orderId" text NOT NULL,
    "kotNumber" text NOT NULL,
    station text,
    status public."KotStatus" DEFAULT 'PENDING'::public."KotStatus" NOT NULL,
    "itemIds" text[],
    "itemsSnapshot" jsonb NOT NULL,
    "printedAt" timestamp(3) without time zone,
    "printedBy" text,
    "acknowledgedAt" timestamp(3) without time zone,
    "cookingStartedAt" timestamp(3) without time zone,
    "readyAt" timestamp(3) without time zone,
    "servedAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    notes text,
    priority text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Kot" OWNER TO abubakarmalik;

--
-- Name: LoginHistory; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."LoginHistory" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tenantId" text NOT NULL,
    email text NOT NULL,
    success boolean DEFAULT true NOT NULL,
    "failureReason" text,
    "ipAddress" text,
    "userAgent" text,
    "deviceFingerprint" text,
    "deviceName" text,
    location text,
    "isNewDevice" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."LoginHistory" OWNER TO abubakarmalik;

--
-- Name: LoyaltyTransaction; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."LoyaltyTransaction" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerId" text NOT NULL,
    type public."LoyaltyTransactionType" NOT NULL,
    points integer NOT NULL,
    "balanceAfter" integer NOT NULL,
    reference text,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."LoyaltyTransaction" OWNER TO abubakarmalik;

--
-- Name: MeatCuttingJob; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."MeatCuttingJob" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "jobNumber" text NOT NULL,
    "slaughterLogId" text,
    "butcherId" text,
    "butcherName" text,
    "inputWeightKg" double precision NOT NULL,
    "outputWeightKg" double precision,
    "wasteWeightKg" double precision,
    "yieldPct" double precision,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "durationMin" integer,
    status text DEFAULT 'IN_PROGRESS'::text NOT NULL,
    "cutsProduced" jsonb,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MeatCuttingJob" OWNER TO abubakarmalik;

--
-- Name: MeatLiveAnimal; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."MeatLiveAnimal" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "tagNumber" text NOT NULL,
    "animalType" public."MeatAnimalType" NOT NULL,
    breed text,
    color text,
    sex text,
    "ageMonths" integer,
    "weightKg" double precision NOT NULL,
    "purchasePrice" double precision DEFAULT 0 NOT NULL,
    "purchaseDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "vendorId" text,
    "vendorName" text,
    "sourceName" text,
    "vaccinationStatus" text,
    "healthCertUrl" text,
    "isHealthy" boolean DEFAULT true NOT NULL,
    "healthNotes" text,
    "vetCheckedAt" timestamp(3) without time zone,
    "feedingType" text,
    "dailyFeedCost" double precision DEFAULT 0 NOT NULL,
    "daysHeld" integer DEFAULT 0 NOT NULL,
    "totalFeedCost" double precision DEFAULT 0 NOT NULL,
    "isSlaughtered" boolean DEFAULT false NOT NULL,
    "slaughteredAt" timestamp(3) without time zone,
    "slaughterMethod" public."MeatSlaughterMethod",
    "slaughterCertBy" text,
    "slaughterWeightKg" double precision,
    "meatYieldKg" double precision,
    "yieldPct" double precision,
    "isSold" boolean DEFAULT false NOT NULL,
    "soldPrice" double precision,
    "soldAt" timestamp(3) without time zone,
    "soldToCustomer" text,
    "photoUrls" text[] DEFAULT ARRAY[]::text[],
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MeatLiveAnimal" OWNER TO abubakarmalik;

--
-- Name: MeatProductProfile; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."MeatProductProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "animalType" public."MeatAnimalType" NOT NULL,
    "cutCategory" public."MeatCutCategory" NOT NULL,
    "freshnessType" public."MeatFreshnessType" DEFAULT 'FRESH_CHILLED'::public."MeatFreshnessType" NOT NULL,
    "slaughterMethod" public."MeatSlaughterMethod" DEFAULT 'HALAL_HAND'::public."MeatSlaughterMethod" NOT NULL,
    "qualityGrade" public."MeatQualityGrade" DEFAULT 'GRADE_A'::public."MeatQualityGrade" NOT NULL,
    "saleUnit" public."MeatSaleUnit" DEFAULT 'KG'::public."MeatSaleUnit" NOT NULL,
    "pricePerKg" double precision DEFAULT 0 NOT NULL,
    "pricePerPiece" double precision,
    "minOrderKg" double precision,
    "maxOrderKg" double precision,
    "weightVariancePct" double precision DEFAULT 5 NOT NULL,
    "isBoneless" boolean DEFAULT false NOT NULL,
    "isBoneIn" boolean DEFAULT false NOT NULL,
    "isSkinless" boolean DEFAULT true NOT NULL,
    "isMarinated" boolean DEFAULT false NOT NULL,
    "marinationType" text,
    "isOrganic" boolean DEFAULT false NOT NULL,
    "isFreeRange" boolean DEFAULT false NOT NULL,
    "isGrainFed" boolean DEFAULT false NOT NULL,
    "isGrassFed" boolean DEFAULT false NOT NULL,
    "isFrozen" boolean DEFAULT false NOT NULL,
    "halalCertNumber" text,
    "halalCertBy" text,
    "halalCertExpiry" timestamp(3) without time zone,
    "isHalalCertified" boolean DEFAULT true NOT NULL,
    "otherCerts" text[] DEFAULT ARRAY[]::text[],
    "farmName" text,
    "farmLocation" text,
    "slaughterhouseName" text,
    "slaughterhouseLic" text,
    "countryOfOrigin" text,
    breed text,
    "storageTempMin" double precision,
    "storageTempMax" double precision,
    "shelfLifeDays" integer,
    "packagingType" text,
    "batchNumber" text,
    "animalAge" text,
    "animalSex" text,
    "cuttingStyle" text,
    "cleaningLevel" text,
    "packagingWeight" double precision,
    "imageUrls" text[] DEFAULT ARRAY[]::text[],
    "descriptionLong" text,
    "cookingSuggestions" text,
    "nutritionInfo" jsonb,
    "isPopular" boolean DEFAULT false NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "isNewArrival" boolean DEFAULT false NOT NULL,
    "isOnSale" boolean DEFAULT false NOT NULL,
    "totalSoldKg" double precision DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MeatProductProfile" OWNER TO abubakarmalik;

--
-- Name: MeatQurbaniBooking; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."MeatQurbaniBooking" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "bookingNumber" text NOT NULL,
    "customerId" text,
    "customerName" text NOT NULL,
    "customerPhone" text NOT NULL,
    "customerCnic" text,
    "customerAddress" text,
    occasion text DEFAULT 'QURBANI'::text NOT NULL,
    "animalType" public."MeatAnimalType" NOT NULL,
    "animalPreference" text,
    "shareCount" integer DEFAULT 1 NOT NULL,
    "shareNumber" integer,
    "advanceAmount" double precision DEFAULT 0 NOT NULL,
    "finalPrice" double precision,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "paymentStatus" text DEFAULT 'PARTIAL'::text NOT NULL,
    "slaughterDate" timestamp(3) without time zone,
    "slaughterDay" integer,
    "wantsMeatDelivery" boolean DEFAULT true NOT NULL,
    "deliveryPreference" text DEFAULT 'SELF_PICKUP'::text NOT NULL,
    "deliveryAddress" text,
    "needsCharityShare" boolean DEFAULT false NOT NULL,
    "charityShareKg" double precision,
    "charityRecipient" text,
    "cuttingStyle" text,
    "packagingCount" integer,
    "wantsSkin" boolean DEFAULT false NOT NULL,
    "wantsOffal" boolean DEFAULT true NOT NULL,
    "specialInstructions" text,
    "liveAnimalId" text,
    "slaughterLogId" text,
    status text DEFAULT 'BOOKED'::text NOT NULL,
    "cancelledAt" timestamp(3) without time zone,
    "cancellationReason" text,
    "bookedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MeatQurbaniBooking" OWNER TO abubakarmalik;

--
-- Name: MeatSlaughterLog; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."MeatSlaughterLog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "slaughterNumber" text NOT NULL,
    "liveAnimalId" text,
    "animalType" public."MeatAnimalType" NOT NULL,
    "animalTag" text,
    "slaughterDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "slaughterTime" text,
    "slaughterMethod" public."MeatSlaughterMethod" NOT NULL,
    "slaughteredBy" text,
    "slaughtererId" text,
    "slaughtererCertNumber" text,
    "witnessedBy" text,
    "liveWeightKg" double precision NOT NULL,
    "dressedWeightKg" double precision,
    "yieldPct" double precision,
    "facilityName" text,
    "facilityLicense" text,
    "facilityAddress" text,
    "isHalal" boolean DEFAULT true NOT NULL,
    "halalCertNumber" text,
    "religiousAuthority" text,
    "vetInspection" boolean DEFAULT false NOT NULL,
    "vetInspectorName" text,
    "vetCertNumber" text,
    "postMortemNotes" text,
    "qualityGrade" public."MeatQualityGrade",
    temperature double precision,
    "storageLocation" text,
    "photoUrls" text[] DEFAULT ARRAY[]::text[],
    "documentUrls" text[] DEFAULT ARRAY[]::text[],
    notes text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MeatSlaughterLog" OWNER TO abubakarmalik;

--
-- Name: MeatSubscription; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."MeatSubscription" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerId" text NOT NULL,
    "subscriptionNumber" text NOT NULL,
    status public."MeatSubscriptionStatus" DEFAULT 'ACTIVE'::public."MeatSubscriptionStatus" NOT NULL,
    frequency public."MeatSubscriptionFreq" DEFAULT 'WEEKLY'::public."MeatSubscriptionFreq" NOT NULL,
    "customDays" integer[] DEFAULT ARRAY[]::integer[],
    "startDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endDate" timestamp(3) without time zone,
    "nextDeliveryDate" timestamp(3) without time zone,
    "lastDeliveryDate" timestamp(3) without time zone,
    "standardItems" jsonb NOT NULL,
    "totalMonthlyKg" double precision DEFAULT 0 NOT NULL,
    "discountPct" double precision DEFAULT 0 NOT NULL,
    "deliveryAddress" text NOT NULL,
    "deliveryTimeSlot" text,
    "contactPerson" text,
    "contactPhone" text,
    "billingCycle" text DEFAULT 'MONTHLY'::text NOT NULL,
    "monthlyEstimate" double precision DEFAULT 0 NOT NULL,
    "autoRenew" boolean DEFAULT true NOT NULL,
    "pausedAt" timestamp(3) without time zone,
    "pauseReason" text,
    "cancelledAt" timestamp(3) without time zone,
    "cancellationReason" text,
    "totalDeliveries" integer DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MeatSubscription" OWNER TO abubakarmalik;

--
-- Name: MeatWeightOrder; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."MeatWeightOrder" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "orderNumber" text NOT NULL,
    "customerId" text,
    "customerName" text,
    "customerPhone" text,
    "orderDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "neededBy" timestamp(3) without time zone,
    "scheduledDelivery" timestamp(3) without time zone,
    status public."MeatOrderStatus" DEFAULT 'DRAFT'::public."MeatOrderStatus" NOT NULL,
    "isDelivery" boolean DEFAULT false NOT NULL,
    "deliveryAddress" text,
    "deliveryCharges" double precision DEFAULT 0 NOT NULL,
    "deliveryPersonId" text,
    "deliveredAt" timestamp(3) without time zone,
    occasion text,
    "specialInstructions" text,
    subtotal double precision DEFAULT 0 NOT NULL,
    "taxAmount" double precision DEFAULT 0 NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "paymentStatus" text DEFAULT 'UNPAID'::text NOT NULL,
    "cuttingStyle" text,
    "packagingPref" text,
    "numberOfPackets" integer,
    "createdById" text,
    "cancelledAt" timestamp(3) without time zone,
    "cancellationReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MeatWeightOrder" OWNER TO abubakarmalik;

--
-- Name: MeatWeightOrderItem; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."MeatWeightOrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productId" text,
    "productName" text NOT NULL,
    "cutCategory" public."MeatCutCategory",
    "requestedKg" double precision NOT NULL,
    "actualKg" double precision,
    "pricePerKg" double precision NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    "cuttingInstructions" text,
    "packagingNotes" text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MeatWeightOrderItem" OWNER TO abubakarmalik;

--
-- Name: MeatWholesaleAccount; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."MeatWholesaleAccount" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerId" text NOT NULL,
    "accountNumber" text NOT NULL,
    "businessName" text NOT NULL,
    "businessType" text NOT NULL,
    "contractStart" timestamp(3) without time zone,
    "contractEnd" timestamp(3) without time zone,
    "creditLimit" double precision DEFAULT 0 NOT NULL,
    "currentBalance" double precision DEFAULT 0 NOT NULL,
    "creditDays" integer DEFAULT 30 NOT NULL,
    "discountPct" double precision DEFAULT 0 NOT NULL,
    "specialPricing" jsonb,
    "requiresDelivery" boolean DEFAULT true NOT NULL,
    "deliveryDays" integer[] DEFAULT ARRAY[]::integer[],
    "deliveryTimeSlot" text,
    "contactPerson" text,
    "contactPhone" text,
    "contactEmail" text,
    "billingAddress" text,
    "deliveryAddress" text,
    "gstNumber" text,
    "ntnNumber" text,
    "totalOrders" integer DEFAULT 0 NOT NULL,
    "totalPurchases" double precision DEFAULT 0 NOT NULL,
    "totalOutstanding" double precision DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MeatWholesaleAccount" OWNER TO abubakarmalik;

--
-- Name: MechanicProfile; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."MechanicProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "staffId" text NOT NULL,
    specialization text[] DEFAULT ARRAY[]::text[],
    certifications text[] DEFAULT ARRAY[]::text[],
    "yearsOfExperience" integer,
    bio text,
    "photoUrl" text,
    "hourlyRate" double precision DEFAULT 0 NOT NULL,
    "commissionPct" double precision DEFAULT 0 NOT NULL,
    "workingDays" integer[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6],
    "workStartTime" text DEFAULT '09:00'::text NOT NULL,
    "workEndTime" text DEFAULT '18:00'::text NOT NULL,
    "isAvailable" boolean DEFAULT true NOT NULL,
    "currentJobId" text,
    "totalJobs" integer DEFAULT 0 NOT NULL,
    "totalHours" double precision DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    "totalCommission" double precision DEFAULT 0 NOT NULL,
    "avgRating" double precision,
    "totalReviews" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MechanicProfile" OWNER TO abubakarmalik;

--
-- Name: MedicineSubstitute; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."MedicineSubstitute" (
    id text NOT NULL,
    "mainMedicineId" text NOT NULL,
    "substituteMedicineId" text NOT NULL,
    similarity double precision DEFAULT 1.0 NOT NULL,
    "priceDifference" double precision,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MedicineSubstitute" OWNER TO abubakarmalik;

--
-- Name: MenuItemModifier; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."MenuItemModifier" (
    id text NOT NULL,
    "menuItemId" text NOT NULL,
    "modifierGroupId" text NOT NULL,
    "isRequired" boolean DEFAULT false NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."MenuItemModifier" OWNER TO abubakarmalik;

--
-- Name: ModifierGroup; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ModifierGroup" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    description text,
    type public."ModifierType" DEFAULT 'ADDON'::public."ModifierType" NOT NULL,
    "isRequired" boolean DEFAULT false NOT NULL,
    "minSelections" integer DEFAULT 0 NOT NULL,
    "maxSelections" integer DEFAULT 1 NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ModifierGroup" OWNER TO abubakarmalik;

--
-- Name: ModifierOption; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ModifierOption" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "modifierGroupId" text NOT NULL,
    name text NOT NULL,
    "priceAdjustment" double precision DEFAULT 0 NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    emoji text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ModifierOption" OWNER TO abubakarmalik;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "userId" text,
    type public."NotificationType" DEFAULT 'INFO'::public."NotificationType" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Notification" OWNER TO abubakarmalik;

--
-- Name: NotificationPreference; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."NotificationPreference" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "emailEnabled" boolean DEFAULT true NOT NULL,
    "smsEnabled" boolean DEFAULT true NOT NULL,
    "emailWelcome" boolean DEFAULT true NOT NULL,
    "emailPayment" boolean DEFAULT true NOT NULL,
    "emailExpiry" boolean DEFAULT true NOT NULL,
    "emailLowStock" boolean DEFAULT true NOT NULL,
    "emailMarketing" boolean DEFAULT false NOT NULL,
    "smsPayment" boolean DEFAULT true NOT NULL,
    "smsExpiry" boolean DEFAULT true NOT NULL,
    "smsCritical" boolean DEFAULT true NOT NULL,
    "smsMarketing" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."NotificationPreference" OWNER TO abubakarmalik;

--
-- Name: OnboardingProgress; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."OnboardingProgress" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "userId" text NOT NULL,
    "currentStep" integer DEFAULT 1 NOT NULL,
    "completedSteps" integer[] DEFAULT ARRAY[]::integer[],
    "isCompleted" boolean DEFAULT false NOT NULL,
    "isSkipped" boolean DEFAULT false NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "businessType" text,
    "businessSize" text,
    city text,
    province text,
    "avatarUrl" text,
    "whatsappNumber" text,
    cnic text,
    "preferredLanguage" text,
    "shopAddress" text,
    "openTime" text,
    "closeTime" text,
    "workingDays" text[] DEFAULT ARRAY[]::text[],
    "taxNumber" text,
    "enabledCategories" text[] DEFAULT ARRAY[]::text[],
    "paymentMethods" text[] DEFAULT ARRAY['CASH'::text],
    "receiptTemplate" text,
    "lowStockThreshold" integer DEFAULT 10 NOT NULL,
    "productsAddedCount" integer DEFAULT 0 NOT NULL,
    "teamMembersAdded" integer DEFAULT 0 NOT NULL,
    "wantsTutorial" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    currency text DEFAULT 'PKR'::text NOT NULL,
    "dateOfBirth" timestamp(3) without time zone,
    "detectedCity" text,
    "detectedCountry" text,
    "detectedIp" text,
    "detectedProvince" text,
    "detectedTimezone" text,
    "enableTax" boolean DEFAULT false NOT NULL,
    "enabledFeatures" jsonb,
    gender text,
    latitude double precision,
    longitude double precision,
    "shopArea" text,
    "shopLandmark" text,
    "signupSource" text,
    "skipCount" integer DEFAULT 0 NOT NULL,
    "smartDefaults" jsonb,
    "subscribedToTips" boolean DEFAULT true NOT NULL,
    "taxRate" double precision DEFAULT 0 NOT NULL,
    "timeSpentSeconds" integer DEFAULT 0 NOT NULL,
    "usedSampleData" boolean DEFAULT false NOT NULL,
    "wantsSampleData" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."OnboardingProgress" OWNER TO abubakarmalik;

--
-- Name: OtpCode; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."OtpCode" (
    id text NOT NULL,
    "userId" text,
    email text,
    phone text,
    code text NOT NULL,
    purpose text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "verifiedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."OtpCode" OWNER TO abubakarmalik;

--
-- Name: PatientProfile; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."PatientProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerId" text NOT NULL,
    "dateOfBirth" timestamp(3) without time zone,
    "bloodGroup" text,
    height double precision,
    weight double precision,
    gender text,
    "chronicConditions" text[] DEFAULT ARRAY[]::text[],
    allergies text[] DEFAULT ARRAY[]::text[],
    "currentMedications" text[] DEFAULT ARRAY[]::text[],
    "pastSurgeries" text,
    "emergencyContactName" text,
    "emergencyContactPhone" text,
    "emergencyRelation" text,
    "hasInsurance" boolean DEFAULT false NOT NULL,
    "insuranceProvider" text,
    "insuranceNumber" text,
    "insuranceExpiry" timestamp(3) without time zone,
    "medicalNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PatientProfile" OWNER TO abubakarmalik;

--
-- Name: Payment; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "subscriptionId" text,
    "invoiceId" text,
    "uploadId" text,
    amount double precision NOT NULL,
    currency text DEFAULT 'PKR'::text NOT NULL,
    provider public."PaymentProvider" NOT NULL,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    reference text,
    "bankName" text,
    "accountNumber" text,
    "transactionId" text,
    "payerName" text,
    notes text,
    "rejectionReason" text,
    "approvedById" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedAt" timestamp(3) without time zone,
    "paidAt" timestamp(3) without time zone,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "stripePaymentIntentId" text
);


ALTER TABLE public."Payment" OWNER TO abubakarmalik;

--
-- Name: PharmacyMedicine; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."PharmacyMedicine" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "registrationNumber" text,
    "approvalDate" timestamp(3) without time zone,
    "dosageForm" text,
    "packSize" text,
    "packUnit" text,
    manufacturer text,
    "countryOfOrigin" text,
    "importedBy" text,
    indication text,
    "mechanismOfAction" text,
    pharmacokinetics text,
    "storageCondition" public."StorageCondition" DEFAULT 'ROOM_TEMPERATURE'::public."StorageCondition" NOT NULL,
    "storageInstructions" text,
    "requiresColdChain" boolean DEFAULT false NOT NULL,
    "minTemperature" double precision,
    "maxTemperature" double precision,
    "scheduleClass" public."DrugScheduleClass" DEFAULT 'OTC'::public."DrugScheduleClass" NOT NULL,
    "requiresPrescription" boolean DEFAULT false NOT NULL,
    "isNarcotic" boolean DEFAULT false NOT NULL,
    "isRefrigerated" boolean DEFAULT false NOT NULL,
    color text,
    shape text,
    markings text,
    "isGeneric" boolean DEFAULT false NOT NULL,
    "brandTier" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PharmacyMedicine" OWNER TO abubakarmalik;

--
-- Name: Plan; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Plan" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    "priceMonthly" double precision DEFAULT 0 NOT NULL,
    "priceQuarterly" double precision DEFAULT 0 NOT NULL,
    "priceYearly" double precision DEFAULT 0 NOT NULL,
    "trialDays" integer DEFAULT 7 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isPublic" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "maxProducts" integer DEFAULT 50 NOT NULL,
    "maxUsers" integer DEFAULT 2 NOT NULL,
    "maxShops" integer DEFAULT 1 NOT NULL,
    "maxSalesPerMonth" integer DEFAULT 500 NOT NULL,
    "featurePos" boolean DEFAULT true NOT NULL,
    "featureBarcodeScanner" boolean DEFAULT true NOT NULL,
    "featureMultiShop" boolean DEFAULT false NOT NULL,
    "featureReports" boolean DEFAULT true NOT NULL,
    "featureProfitReport" boolean DEFAULT false NOT NULL,
    "featureLoyalty" boolean DEFAULT false NOT NULL,
    "featureDiscounts" boolean DEFAULT false NOT NULL,
    "featureKhata" boolean DEFAULT true NOT NULL,
    "featureExports" boolean DEFAULT false NOT NULL,
    "featureBackup" boolean DEFAULT false NOT NULL,
    "featureNotifications" boolean DEFAULT true NOT NULL,
    "featureCashRegister" boolean DEFAULT true NOT NULL,
    "featureStockTransfer" boolean DEFAULT false NOT NULL,
    "featureReturns" boolean DEFAULT true NOT NULL,
    "featureSupport24x7" boolean DEFAULT false NOT NULL,
    "featureWhatsappReceipt" boolean DEFAULT false NOT NULL,
    "featureCustomBranding" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "stripePriceMonthlyId" text,
    "stripePriceQuarterlyId" text,
    "stripePriceYearlyId" text
);


ALTER TABLE public."Plan" OWNER TO abubakarmalik;

--
-- Name: PlatformDiscount; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."PlatformDiscount" (
    id text NOT NULL,
    code text NOT NULL,
    description text,
    type public."DiscountType" DEFAULT 'PERCENTAGE'::public."DiscountType" NOT NULL,
    value double precision NOT NULL,
    scope text DEFAULT 'PLAN'::text NOT NULL,
    "applicablePlans" text[] DEFAULT ARRAY[]::text[],
    "minPurchase" double precision DEFAULT 0 NOT NULL,
    "maxDiscount" double precision,
    "usageLimit" integer,
    "usageCount" integer DEFAULT 0 NOT NULL,
    "perTenantLimit" integer,
    "validFrom" timestamp(3) without time zone,
    "validUntil" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PlatformDiscount" OWNER TO abubakarmalik;

--
-- Name: Prescription; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Prescription" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "customerId" text,
    "doctorId" text,
    "saleId" text,
    "prescriptionNumber" text NOT NULL,
    type public."PrescriptionType" DEFAULT 'WALK_IN'::public."PrescriptionType" NOT NULL,
    status public."PrescriptionStatus" DEFAULT 'PENDING'::public."PrescriptionStatus" NOT NULL,
    "doctorName" text,
    "doctorRegNumber" text,
    "doctorSpeciality" text,
    "hospitalName" text,
    "patientName" text,
    "patientAge" integer,
    "patientGender" text,
    "patientPhone" text,
    "patientCnic" text,
    "patientWeight" double precision,
    "prescriptionDate" timestamp(3) without time zone,
    diagnosis text,
    "chiefComplaint" text,
    vitals jsonb,
    "imageUrls" text[] DEFAULT ARRAY[]::text[],
    "scannedText" text,
    "isRefillable" boolean DEFAULT false NOT NULL,
    "refillsAllowed" integer DEFAULT 0 NOT NULL,
    "refillsUsed" integer DEFAULT 0 NOT NULL,
    "refillFrequency" public."RefillFrequency",
    "nextRefillDate" timestamp(3) without time zone,
    "isInsuranceClaim" boolean DEFAULT false NOT NULL,
    "insuranceProvider" text,
    "insuranceApprovalCode" text,
    "insuranceAmount" double precision DEFAULT 0 NOT NULL,
    "verifiedById" text,
    "verifiedAt" timestamp(3) without time zone,
    "verificationNotes" text,
    "dispensedById" text,
    "dispensedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "totalAmount" double precision DEFAULT 0 NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Prescription" OWNER TO abubakarmalik;

--
-- Name: PrescriptionItem; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."PrescriptionItem" (
    id text NOT NULL,
    "prescriptionId" text NOT NULL,
    "productId" text,
    "batchId" text,
    "medicineName" text NOT NULL,
    "saltName" text,
    strength text,
    dose text,
    frequency text,
    duration text,
    route text,
    instructions text,
    "prescribedQty" double precision NOT NULL,
    "dispensedQty" double precision DEFAULT 0 NOT NULL,
    unit text DEFAULT 'tablet'::text NOT NULL,
    "unitPrice" double precision DEFAULT 0 NOT NULL,
    "totalPrice" double precision DEFAULT 0 NOT NULL,
    "isDispensed" boolean DEFAULT false NOT NULL,
    "isSubstituted" boolean DEFAULT false NOT NULL,
    "substituteFor" text,
    "isOutOfStock" boolean DEFAULT false NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PrescriptionItem" OWNER TO abubakarmalik;

--
-- Name: Product; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    sku text,
    barcode text,
    unit text DEFAULT 'pcs'::text NOT NULL,
    price double precision DEFAULT 0 NOT NULL,
    "costPrice" double precision DEFAULT 0 NOT NULL,
    stock double precision DEFAULT 0 NOT NULL,
    "lowStockAlert" double precision DEFAULT 5 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "categoryId" text,
    "brandId" text,
    description text,
    dimensions text,
    "expiryTracked" boolean DEFAULT false NOT NULL,
    "hasVariants" boolean DEFAULT false NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "metaDescription" text,
    "metaTitle" text,
    "shortDescription" text,
    slug text,
    "taxRate" double precision DEFAULT 0 NOT NULL,
    weight double precision,
    "weightUnit" text,
    "wholesalePrice" double precision
);


ALTER TABLE public."Product" OWNER TO abubakarmalik;

--
-- Name: ProductBatch; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ProductBatch" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "variantId" text,
    "batchNumber" text NOT NULL,
    "manufactureDate" timestamp(3) without time zone,
    "expiryDate" timestamp(3) without time zone,
    quantity double precision DEFAULT 0 NOT NULL,
    "costPrice" double precision DEFAULT 0 NOT NULL,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProductBatch" OWNER TO abubakarmalik;

--
-- Name: ProductCombo; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ProductCombo" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "categoryId" text,
    name text NOT NULL,
    slug text,
    sku text,
    barcode text,
    description text,
    "imageUrl" text,
    "comboPrice" double precision DEFAULT 0 NOT NULL,
    "originalTotal" double precision DEFAULT 0 NOT NULL,
    "savingsAmount" double precision DEFAULT 0 NOT NULL,
    "savingsPercentage" double precision DEFAULT 0 NOT NULL,
    status public."ComboStatus" DEFAULT 'ACTIVE'::public."ComboStatus" NOT NULL,
    "validFrom" timestamp(3) without time zone,
    "validTo" timestamp(3) without time zone,
    "maxPurchasePerCustomer" integer,
    "stockAvailable" integer,
    "soldCount" integer DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "tagLine" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProductCombo" OWNER TO abubakarmalik;

--
-- Name: ProductComboItem; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ProductComboItem" (
    id text NOT NULL,
    "comboId" text NOT NULL,
    "productId" text NOT NULL,
    "variantId" text,
    "unitId" text,
    quantity double precision DEFAULT 1 NOT NULL,
    "unitName" text,
    "originalPrice" double precision DEFAULT 0 NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ProductComboItem" OWNER TO abubakarmalik;

--
-- Name: ProductImage; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ProductImage" (
    id text NOT NULL,
    "productId" text NOT NULL,
    url text NOT NULL,
    thumbnail text,
    alt text,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "uploadId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ProductImage" OWNER TO abubakarmalik;

--
-- Name: ProductImei; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ProductImei" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "variantId" text,
    imei1 text NOT NULL,
    imei2 text,
    "serialNumber" text,
    status public."ImeiStatus" DEFAULT 'IN_STOCK'::public."ImeiStatus" NOT NULL,
    "costPrice" double precision DEFAULT 0 NOT NULL,
    "saleItemId" text,
    "soldAt" timestamp(3) without time zone,
    "soldPrice" double precision,
    "warrantyMonths" integer DEFAULT 12,
    "warrantyExpiry" timestamp(3) without time zone,
    "purchaseItemId" text,
    "purchasedAt" timestamp(3) without time zone,
    color text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "ptaStatus" public."PtaStatus" DEFAULT 'PENDING'::public."PtaStatus" NOT NULL,
    "ptaTaxDueAt" timestamp(3) without time zone,
    "ptaTaxPaid" double precision DEFAULT 0 NOT NULL,
    "ptaVerifiedAt" timestamp(3) without time zone
);


ALTER TABLE public."ProductImei" OWNER TO abubakarmalik;

--
-- Name: ProductSalt; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ProductSalt" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "saltId" text NOT NULL,
    strength text NOT NULL,
    "strengthValue" double precision,
    "strengthUnit" text,
    "isMainSalt" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ProductSalt" OWNER TO abubakarmalik;

--
-- Name: ProductTag; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ProductTag" (
    "productId" text NOT NULL,
    "tagId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ProductTag" OWNER TO abubakarmalik;

--
-- Name: ProductUnit; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ProductUnit" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "variantId" text,
    "unitName" text NOT NULL,
    "unitLabel" text,
    "conversionType" public."UnitConversionType" DEFAULT 'BASE'::public."UnitConversionType" NOT NULL,
    "conversionRate" double precision DEFAULT 1 NOT NULL,
    "isBase" boolean DEFAULT false NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    price double precision DEFAULT 0 NOT NULL,
    "costPrice" double precision DEFAULT 0 NOT NULL,
    "wholesalePrice" double precision,
    "mrpPrice" double precision,
    barcode text,
    sku text,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProductUnit" OWNER TO abubakarmalik;

--
-- Name: ProductVariant; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ProductVariant" (
    id text NOT NULL,
    "productId" text NOT NULL,
    name text NOT NULL,
    sku text,
    barcode text,
    color text,
    "colorHex" text,
    size text,
    weight double precision,
    unit text,
    price double precision NOT NULL,
    "costPrice" double precision DEFAULT 0 NOT NULL,
    "wholesalePrice" double precision,
    stock double precision DEFAULT 0 NOT NULL,
    "lowStockAlert" double precision DEFAULT 5 NOT NULL,
    "imageUrl" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProductVariant" OWNER TO abubakarmalik;

--
-- Name: Publisher; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Publisher" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    code text,
    country text,
    city text,
    website text,
    phone text,
    email text,
    "contactPerson" text,
    "logoUrl" text,
    description text,
    "defaultDiscountPct" double precision DEFAULT 0 NOT NULL,
    "paymentTerms" text,
    "creditDays" integer DEFAULT 0 NOT NULL,
    "totalBooks" integer DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Publisher" OWNER TO abubakarmalik;

--
-- Name: Purchase; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Purchase" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "supplierId" text NOT NULL,
    "createdById" text,
    "purchaseNumber" text NOT NULL,
    subtotal double precision NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    total double precision NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "paymentMethod" public."PaymentMethod" DEFAULT 'CASH'::public."PaymentMethod" NOT NULL,
    status public."PurchaseStatus" DEFAULT 'RECEIVED'::public."PurchaseStatus" NOT NULL,
    notes text,
    "purchasedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Purchase" OWNER TO abubakarmalik;

--
-- Name: PurchaseItem; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."PurchaseItem" (
    id text NOT NULL,
    "purchaseId" text NOT NULL,
    "productId" text NOT NULL,
    quantity double precision NOT NULL,
    "costPrice" double precision NOT NULL,
    total double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PurchaseItem" OWNER TO abubakarmalik;

--
-- Name: Recipe; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Recipe" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "menuItemId" text NOT NULL,
    "yieldQuantity" double precision DEFAULT 1 NOT NULL,
    "yieldUnit" text DEFAULT 'portion'::text NOT NULL,
    "totalCost" double precision DEFAULT 0 NOT NULL,
    "preparationSteps" text,
    "cookingTime" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Recipe" OWNER TO abubakarmalik;

--
-- Name: RecipeIngredient; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."RecipeIngredient" (
    id text NOT NULL,
    "recipeId" text NOT NULL,
    "ingredientProductId" text NOT NULL,
    quantity double precision NOT NULL,
    unit text NOT NULL,
    "costPerUnit" double precision DEFAULT 0 NOT NULL,
    "totalCost" double precision DEFAULT 0 NOT NULL,
    "isOptional" boolean DEFAULT false NOT NULL,
    notes text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RecipeIngredient" OWNER TO abubakarmalik;

--
-- Name: Referral; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Referral" (
    id text NOT NULL,
    "referrerTenantId" text NOT NULL,
    "refereeTenantId" text NOT NULL,
    code text NOT NULL,
    status public."ReferralStatus" DEFAULT 'PENDING'::public."ReferralStatus" NOT NULL,
    "rewardAmount" double precision DEFAULT 0 NOT NULL,
    "rewardPaid" boolean DEFAULT false NOT NULL,
    "rewardPaidAt" timestamp(3) without time zone,
    "convertedAt" timestamp(3) without time zone,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Referral" OWNER TO abubakarmalik;

--
-- Name: RefillReminder; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."RefillReminder" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerId" text NOT NULL,
    "productId" text,
    "prescriptionId" text,
    "medicineName" text NOT NULL,
    "scheduledFor" timestamp(3) without time zone NOT NULL,
    "reminderType" text DEFAULT 'SMS'::text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "sentAt" timestamp(3) without time zone,
    "acknowledgedAt" timestamp(3) without time zone,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RefillReminder" OWNER TO abubakarmalik;

--
-- Name: ReorderSuggestion; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ReorderSuggestion" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "productId" text NOT NULL,
    "variantId" text,
    "currentStock" double precision DEFAULT 0 NOT NULL,
    "reorderPoint" double precision DEFAULT 0 NOT NULL,
    "suggestedQuantity" double precision DEFAULT 0 NOT NULL,
    "avgDailySales" double precision DEFAULT 0 NOT NULL,
    "daysOfStockLeft" double precision DEFAULT 0 NOT NULL,
    "lastPurchasePrice" double precision DEFAULT 0 NOT NULL,
    "preferredSupplierId" text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ReorderSuggestion" OWNER TO abubakarmalik;

--
-- Name: RepairPart; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."RepairPart" (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    "productId" text,
    "partName" text NOT NULL,
    "partNumber" text,
    quantity double precision DEFAULT 1 NOT NULL,
    "unitCost" double precision DEFAULT 0 NOT NULL,
    "unitPrice" double precision DEFAULT 0 NOT NULL,
    "totalPrice" double precision DEFAULT 0 NOT NULL,
    source text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RepairPart" OWNER TO abubakarmalik;

--
-- Name: RepairPayment; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."RepairPayment" (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    amount double precision NOT NULL,
    "paymentMethod" public."PaymentMethod" DEFAULT 'CASH'::public."PaymentMethod" NOT NULL,
    reference text,
    notes text,
    "paidAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdById" text
);


ALTER TABLE public."RepairPayment" OWNER TO abubakarmalik;

--
-- Name: RepairStatusLog; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."RepairStatusLog" (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    "fromStatus" public."RepairStatus",
    "toStatus" public."RepairStatus" NOT NULL,
    note text,
    "changedById" text,
    "changedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RepairStatusLog" OWNER TO abubakarmalik;

--
-- Name: RepairTicket; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."RepairTicket" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "ticketNumber" text NOT NULL,
    imei1 text,
    imei2 text,
    "serialNumber" text,
    "deviceBrand" text NOT NULL,
    "deviceModel" text NOT NULL,
    "deviceColor" text,
    passcode text,
    "hasSimCard" boolean DEFAULT false NOT NULL,
    "hasMemoryCard" boolean DEFAULT false NOT NULL,
    "customerId" text,
    "customerName" text NOT NULL,
    "customerPhone" text NOT NULL,
    "customerCnic" text,
    "customerAddress" text,
    "reportedIssue" text NOT NULL,
    "diagnosedIssue" text,
    "diagnosisNotes" text,
    "recommendedActions" text,
    status public."RepairStatus" DEFAULT 'RECEIVED'::public."RepairStatus" NOT NULL,
    priority public."RepairPriority" DEFAULT 'NORMAL'::public."RepairPriority" NOT NULL,
    "paymentStatus" public."RepairPaymentStatus" DEFAULT 'PENDING'::public."RepairPaymentStatus" NOT NULL,
    "estimatedCost" double precision DEFAULT 0 NOT NULL,
    "partsCost" double precision DEFAULT 0 NOT NULL,
    "laborCost" double precision DEFAULT 0 NOT NULL,
    "totalCost" double precision DEFAULT 0 NOT NULL,
    "advancePaid" double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "balanceDue" double precision DEFAULT 0 NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    "receivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "diagnosedAt" timestamp(3) without time zone,
    "approvedAt" timestamp(3) without time zone,
    "startedAt" timestamp(3) without time zone,
    "readyAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "estimatedReadyAt" timestamp(3) without time zone,
    "technicianId" text,
    "technicianName" text,
    "beforePhotos" text[] DEFAULT ARRAY[]::text[],
    "afterPhotos" text[] DEFAULT ARRAY[]::text[],
    "signatureUrl" text,
    "smsNotificationsSent" integer DEFAULT 0 NOT NULL,
    "lastSmsSentAt" timestamp(3) without time zone,
    notes text,
    "warrantyDays" integer DEFAULT 7 NOT NULL,
    "warrantyEnds" timestamp(3) without time zone,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RepairTicket" OWNER TO abubakarmalik;

--
-- Name: RestaurantMenuItem; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."RestaurantMenuItem" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "prepTimeMinutes" integer,
    "cookingInstructions" text,
    "chefSpecial" boolean DEFAULT false NOT NULL,
    "bestSeller" boolean DEFAULT false NOT NULL,
    "isSpicy" boolean DEFAULT false NOT NULL,
    "spiceLevel" public."SpiceLevel",
    calories integer,
    "servingSize" text,
    "servesPeople" integer DEFAULT 1,
    "dietaryTags" public."DietaryTag"[] DEFAULT ARRAY[]::public."DietaryTag"[],
    "allergenInfo" text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "isAvailable" boolean DEFAULT true NOT NULL,
    "availableFrom" text,
    "availableTo" text,
    "availableDays" integer[] DEFAULT ARRAY[]::integer[],
    "imageUrl" text,
    "videoUrl" text,
    "highlightColor" text,
    "tagLine" text,
    "totalOrdered" integer DEFAULT 0 NOT NULL,
    "avgRating" double precision,
    "totalReviews" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RestaurantMenuItem" OWNER TO abubakarmalik;

--
-- Name: RestaurantOrder; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."RestaurantOrder" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "tableId" text,
    "customerId" text,
    "riderId" text,
    "waiterId" text,
    "orderNumber" text NOT NULL,
    mode public."RestaurantOrderMode" NOT NULL,
    status public."RestaurantOrderStatus" DEFAULT 'DRAFT'::public."RestaurantOrderStatus" NOT NULL,
    "customerName" text,
    "customerPhone" text,
    "customerAddress" text,
    "numberOfGuests" integer,
    "specialRequests" text,
    subtotal double precision DEFAULT 0 NOT NULL,
    "serviceCharge" double precision DEFAULT 0 NOT NULL,
    "serviceChargePct" double precision DEFAULT 0 NOT NULL,
    "taxAmount" double precision DEFAULT 0 NOT NULL,
    "taxPct" double precision DEFAULT 0 NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    "deliveryFee" double precision DEFAULT 0 NOT NULL,
    "packagingFee" double precision DEFAULT 0 NOT NULL,
    tip double precision DEFAULT 0 NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "placedAt" timestamp(3) without time zone,
    "confirmedAt" timestamp(3) without time zone,
    "cookingStartedAt" timestamp(3) without time zone,
    "readyAt" timestamp(3) without time zone,
    "servedAt" timestamp(3) without time zone,
    "outForDeliveryAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "cancellationReason" text,
    "estimatedPrepTime" integer,
    "estimatedDeliveryTime" timestamp(3) without time zone,
    "deliveryAddress" text,
    "deliveryLat" double precision,
    "deliveryLng" double precision,
    "deliveryDistance" double precision,
    "deliveryNotes" text,
    "deliveryStatus" public."RiderDeliveryStatus",
    "kotPrintedAt" timestamp(3) without time zone,
    "kotPrintCount" integer DEFAULT 0 NOT NULL,
    "isSplitBill" boolean DEFAULT false NOT NULL,
    "parentOrderId" text,
    "saleId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RestaurantOrder" OWNER TO abubakarmalik;

--
-- Name: RestaurantOrderItem; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."RestaurantOrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productId" text NOT NULL,
    "variantId" text,
    quantity double precision NOT NULL,
    unit text DEFAULT 'piece'::text NOT NULL,
    "basePrice" double precision NOT NULL,
    "modifierTotal" double precision DEFAULT 0 NOT NULL,
    "itemDiscount" double precision DEFAULT 0 NOT NULL,
    total double precision NOT NULL,
    "costPrice" double precision DEFAULT 0 NOT NULL,
    "specialInstructions" text,
    "spiceLevel" public."SpiceLevel",
    "cookingNote" text,
    status public."RestaurantOrderStatus" DEFAULT 'PLACED'::public."RestaurantOrderStatus" NOT NULL,
    "courseNumber" integer,
    "isComplimentary" boolean DEFAULT false NOT NULL,
    "isReturned" boolean DEFAULT false NOT NULL,
    "returnReason" text,
    "sentToKitchenAt" timestamp(3) without time zone,
    "cookingStartedAt" timestamp(3) without time zone,
    "readyAt" timestamp(3) without time zone,
    "servedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RestaurantOrderItem" OWNER TO abubakarmalik;

--
-- Name: RestaurantOrderItemModifier; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."RestaurantOrderItemModifier" (
    id text NOT NULL,
    "orderItemId" text NOT NULL,
    "modifierOptionId" text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    "priceAdjustment" double precision DEFAULT 0 NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RestaurantOrderItemModifier" OWNER TO abubakarmalik;

--
-- Name: RestaurantOrderPayment; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."RestaurantOrderPayment" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    amount double precision NOT NULL,
    "paymentMethod" text NOT NULL,
    "paidBy" text,
    reference text,
    notes text,
    "paidAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RestaurantOrderPayment" OWNER TO abubakarmalik;

--
-- Name: RestaurantTable; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."RestaurantTable" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "tableNumber" text NOT NULL,
    name text,
    capacity integer DEFAULT 4 NOT NULL,
    status public."TableStatus" DEFAULT 'AVAILABLE'::public."TableStatus" NOT NULL,
    floor text,
    zone text,
    notes text,
    "currentSaleId" text,
    "occupiedAt" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RestaurantTable" OWNER TO abubakarmalik;

--
-- Name: RestaurantTableV2; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."RestaurantTableV2" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "tableNumber" text NOT NULL,
    "tableName" text,
    capacity integer DEFAULT 4 NOT NULL,
    "minCapacity" integer DEFAULT 1 NOT NULL,
    "maxCapacity" integer DEFAULT 8 NOT NULL,
    section text,
    floor text,
    location text,
    shape text,
    "positionX" double precision,
    "positionY" double precision,
    status public."RestaurantTableStatus" DEFAULT 'AVAILABLE'::public."RestaurantTableStatus" NOT NULL,
    "isReservable" boolean DEFAULT true NOT NULL,
    "isSmokingAllowed" boolean DEFAULT false NOT NULL,
    "isAcRoom" boolean DEFAULT true NOT NULL,
    "isFamilyArea" boolean DEFAULT false NOT NULL,
    "isVip" boolean DEFAULT false NOT NULL,
    "minOrderAmount" double precision,
    "currentOrderId" text,
    "occupiedAt" timestamp(3) without time zone,
    "reservedAt" timestamp(3) without time zone,
    "reservedFor" timestamp(3) without time zone,
    "reservedByName" text,
    "reservedByPhone" text,
    "reservationNote" text,
    "totalOrders" integer DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    "avgTurnoverMinutes" double precision,
    "qrCodeUrl" text,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RestaurantTableV2" OWNER TO abubakarmalik;

--
-- Name: RetailQuickKey; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."RetailQuickKey" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "userId" text,
    "shopId" text,
    "productId" text,
    "comboId" text,
    "variantId" text,
    "unitId" text,
    label text NOT NULL,
    color text,
    icon text,
    "position" integer DEFAULT 0 NOT NULL,
    hotkey text,
    "group" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RetailQuickKey" OWNER TO abubakarmalik;

--
-- Name: Rider; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Rider" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    cnic text,
    email text,
    "avatarUrl" text,
    "vehicleType" text,
    "vehicleNumber" text,
    "licenseNumber" text,
    status public."RiderStatus" DEFAULT 'ACTIVE'::public."RiderStatus" NOT NULL,
    "currentLat" double precision,
    "currentLng" double precision,
    "lastLocationUpdate" timestamp(3) without time zone,
    "isEmployee" boolean DEFAULT true NOT NULL,
    "commissionType" text,
    "commissionValue" double precision DEFAULT 0 NOT NULL,
    "baseSalary" double precision DEFAULT 0 NOT NULL,
    "totalDeliveries" integer DEFAULT 0 NOT NULL,
    "totalDistance" double precision DEFAULT 0 NOT NULL,
    "avgRating" double precision,
    "totalTips" double precision DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Rider" OWNER TO abubakarmalik;

--
-- Name: SalaryPayment; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SalaryPayment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "staffId" text NOT NULL,
    "paymentNumber" text NOT NULL,
    "periodStart" date NOT NULL,
    "periodEnd" date NOT NULL,
    "baseSalary" double precision DEFAULT 0 NOT NULL,
    "daysWorked" double precision DEFAULT 0 NOT NULL,
    "hoursWorked" double precision DEFAULT 0 NOT NULL,
    "overtimePay" double precision DEFAULT 0 NOT NULL,
    "commissionEarned" double precision DEFAULT 0 NOT NULL,
    bonuses double precision DEFAULT 0 NOT NULL,
    advances double precision DEFAULT 0 NOT NULL,
    "leaveDeduction" double precision DEFAULT 0 NOT NULL,
    "lateDeduction" double precision DEFAULT 0 NOT NULL,
    "otherDeductions" double precision DEFAULT 0 NOT NULL,
    "grossAmount" double precision DEFAULT 0 NOT NULL,
    "totalDeductions" double precision DEFAULT 0 NOT NULL,
    "netAmount" double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "balanceAmount" double precision DEFAULT 0 NOT NULL,
    "paymentMethod" public."PaymentMethod" DEFAULT 'CASH'::public."PaymentMethod" NOT NULL,
    status public."SalaryPaymentStatus" DEFAULT 'PENDING'::public."SalaryPaymentStatus" NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "paidById" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SalaryPayment" OWNER TO abubakarmalik;

--
-- Name: Sale; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Sale" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerId" text,
    "createdById" text,
    "saleNumber" text NOT NULL,
    subtotal double precision NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    total double precision NOT NULL,
    "paidAmount" double precision NOT NULL,
    "changeAmount" double precision DEFAULT 0 NOT NULL,
    "paymentMethod" public."PaymentMethod" DEFAULT 'CASH'::public."PaymentMethod" NOT NULL,
    status public."SaleStatus" DEFAULT 'COMPLETED'::public."SaleStatus" NOT NULL,
    "soldAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "costOfGoods" double precision DEFAULT 0 NOT NULL,
    "creditAmount" double precision DEFAULT 0 NOT NULL,
    "cashRegisterId" text,
    "shopId" text,
    "discountCode" text,
    "discountCodeId" text,
    "loyaltyEarned" integer DEFAULT 0 NOT NULL,
    "loyaltyUsed" integer DEFAULT 0 NOT NULL,
    "refundedAmount" double precision DEFAULT 0 NOT NULL,
    "serviceCharges" double precision DEFAULT 0 NOT NULL,
    "serviceChargesBreakdown" jsonb,
    "bookingId" text
);


ALTER TABLE public."Sale" OWNER TO abubakarmalik;

--
-- Name: SaleItem; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SaleItem" (
    id text NOT NULL,
    "saleId" text NOT NULL,
    "productId" text NOT NULL,
    quantity double precision NOT NULL,
    price double precision NOT NULL,
    total double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "costPrice" double precision DEFAULT 0 NOT NULL,
    "returnedQty" double precision DEFAULT 0 NOT NULL,
    note text,
    "internalNote" text
);


ALTER TABLE public."SaleItem" OWNER TO abubakarmalik;

--
-- Name: SaleItemVariant; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SaleItemVariant" (
    id text NOT NULL,
    "saleItemId" text NOT NULL,
    "variantId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SaleItemVariant" OWNER TO abubakarmalik;

--
-- Name: SaleReturn; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SaleReturn" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "saleId" text NOT NULL,
    "createdById" text,
    "returnNumber" text NOT NULL,
    reason text,
    "refundAmount" double precision NOT NULL,
    "refundMethod" public."PaymentMethod" DEFAULT 'CASH'::public."PaymentMethod" NOT NULL,
    notes text,
    "returnedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SaleReturn" OWNER TO abubakarmalik;

--
-- Name: SaleReturnItem; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SaleReturnItem" (
    id text NOT NULL,
    "returnId" text NOT NULL,
    "saleItemId" text NOT NULL,
    "productId" text NOT NULL,
    quantity double precision NOT NULL,
    "refundPrice" double precision NOT NULL,
    total double precision NOT NULL
);


ALTER TABLE public."SaleReturnItem" OWNER TO abubakarmalik;

--
-- Name: SalonAppointment; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SalonAppointment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "customerId" text,
    "appointmentNumber" text NOT NULL,
    "customerName" text,
    "customerPhone" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "actualEnd" timestamp(3) without time zone,
    "actualStart" timestamp(3) without time zone,
    "arrivedAt" timestamp(3) without time zone,
    "cancellationReason" text,
    "cancelledAt" timestamp(3) without time zone,
    "createdById" text,
    "customerEmail" text,
    "customerFeedback" text,
    "customerNotes" text,
    "customerRating" integer,
    discount double precision DEFAULT 0 NOT NULL,
    "internalNotes" text,
    "membershipId" text,
    "packageId" text,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "paymentStatus" text DEFAULT 'UNPAID'::text NOT NULL,
    "reminderSent" boolean DEFAULT false NOT NULL,
    "reminderSentAt" timestamp(3) without time zone,
    "saleId" text,
    "scheduledEnd" timestamp(3) without time zone NOT NULL,
    "scheduledStart" timestamp(3) without time zone NOT NULL,
    "serviceCharge" double precision DEFAULT 0 NOT NULL,
    subtotal double precision DEFAULT 0 NOT NULL,
    "taxAmount" double precision DEFAULT 0 NOT NULL,
    tip double precision DEFAULT 0 NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    status public."SalonAppointmentStatus" DEFAULT 'DRAFT'::public."SalonAppointmentStatus" NOT NULL
);


ALTER TABLE public."SalonAppointment" OWNER TO abubakarmalik;

--
-- Name: SalonAppointmentLegacy; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SalonAppointmentLegacy" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "customerId" text,
    "staffId" text,
    "serviceProductId" text,
    "appointmentNumber" text NOT NULL,
    "customerName" text NOT NULL,
    "customerPhone" text,
    "serviceName" text NOT NULL,
    duration integer DEFAULT 30 NOT NULL,
    price double precision DEFAULT 0 NOT NULL,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    status public."AppointmentStatus" DEFAULT 'SCHEDULED'::public."AppointmentStatus" NOT NULL,
    notes text,
    "completedSaleId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SalonAppointmentLegacy" OWNER TO abubakarmalik;

--
-- Name: SalonAppointmentService; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SalonAppointmentService" (
    id text NOT NULL,
    "appointmentId" text NOT NULL,
    "serviceId" text NOT NULL,
    "serviceName" text NOT NULL,
    "staffProfileId" text,
    "staffName" text,
    price double precision DEFAULT 0 NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    "durationMinutes" integer DEFAULT 30 NOT NULL,
    "actualDurationMinutes" integer,
    "commissionAmount" double precision DEFAULT 0 NOT NULL,
    "commissionPaid" boolean DEFAULT false NOT NULL,
    notes text,
    "productsUsed" jsonb,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SalonAppointmentService" OWNER TO abubakarmalik;

--
-- Name: SalonCustomerProfile; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SalonCustomerProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerId" text NOT NULL,
    "hairType" text,
    "hairLength" text,
    "hairColor" text,
    "hairTexture" text,
    "skinType" text,
    "skinTone" text,
    allergies text[] DEFAULT ARRAY[]::text[],
    "preferredStaffId" text,
    "preferredServices" text[] DEFAULT ARRAY[]::text[],
    "favoriteBrands" text[] DEFAULT ARRAY[]::text[],
    "medicalConditions" text,
    medications text,
    "pregnancyStatus" text,
    "totalVisits" integer DEFAULT 0 NOT NULL,
    "totalSpent" double precision DEFAULT 0 NOT NULL,
    "lastVisitAt" timestamp(3) without time zone,
    "avgRating" double precision,
    notes text,
    "photoUrls" text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SalonCustomerProfile" OWNER TO abubakarmalik;

--
-- Name: SalonMembership; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SalonMembership" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "planId" text NOT NULL,
    "customerId" text NOT NULL,
    "membershipNumber" text NOT NULL,
    status public."SalonMembershipStatus" DEFAULT 'ACTIVE'::public."SalonMembershipStatus" NOT NULL,
    "startDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiryDate" timestamp(3) without time zone NOT NULL,
    "amountPaid" double precision DEFAULT 0 NOT NULL,
    "paymentMethod" text,
    "usedServices" integer DEFAULT 0 NOT NULL,
    "totalSaved" double precision DEFAULT 0 NOT NULL,
    "autoRenew" boolean DEFAULT false NOT NULL,
    "cancelledAt" timestamp(3) without time zone,
    "cancellationReason" text,
    notes text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SalonMembership" OWNER TO abubakarmalik;

--
-- Name: SalonMembershipPlan; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SalonMembershipPlan" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    tier public."SalonMembershipTier" DEFAULT 'SILVER'::public."SalonMembershipTier" NOT NULL,
    description text,
    price double precision NOT NULL,
    "durationDays" integer DEFAULT 365 NOT NULL,
    "discountPct" double precision DEFAULT 0 NOT NULL,
    "freeServiceCount" integer DEFAULT 0 NOT NULL,
    "freeServiceIds" text[] DEFAULT ARRAY[]::text[],
    "priorityBooking" boolean DEFAULT false NOT NULL,
    "freeConsultation" boolean DEFAULT false NOT NULL,
    "birthdayBonus" double precision DEFAULT 0 NOT NULL,
    "colorTheme" text,
    "iconUrl" text,
    benefits text[] DEFAULT ARRAY[]::text[],
    "isActive" boolean DEFAULT true NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "totalSubscribers" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SalonMembershipPlan" OWNER TO abubakarmalik;

--
-- Name: SalonPackage; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SalonPackage" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    description text,
    price double precision NOT NULL,
    "originalPrice" double precision,
    services jsonb NOT NULL,
    "totalSessions" integer NOT NULL,
    "validityDays" integer DEFAULT 90 NOT NULL,
    "imageUrl" text,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "totalSold" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SalonPackage" OWNER TO abubakarmalik;

--
-- Name: SalonPackagePurchase; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SalonPackagePurchase" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "packageId" text NOT NULL,
    "customerId" text NOT NULL,
    "purchaseNumber" text NOT NULL,
    status public."SalonPackageStatus" DEFAULT 'ACTIVE'::public."SalonPackageStatus" NOT NULL,
    "purchaseDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiryDate" timestamp(3) without time zone NOT NULL,
    "amountPaid" double precision NOT NULL,
    "sessionsUsed" integer DEFAULT 0 NOT NULL,
    "sessionsRemaining" integer DEFAULT 0 NOT NULL,
    "usageLog" jsonb,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SalonPackagePurchase" OWNER TO abubakarmalik;

--
-- Name: SalonService; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SalonService" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    name text NOT NULL,
    code text,
    category public."SalonServiceCategory" DEFAULT 'OTHER'::public."SalonServiceCategory" NOT NULL,
    description text,
    price double precision DEFAULT 0 NOT NULL,
    "discountPrice" double precision,
    "costPrice" double precision,
    "durationMinutes" integer DEFAULT 30 NOT NULL,
    "bufferBefore" integer DEFAULT 0 NOT NULL,
    "bufferAfter" integer DEFAULT 0 NOT NULL,
    "forMen" boolean DEFAULT true NOT NULL,
    "forWomen" boolean DEFAULT true NOT NULL,
    "forKids" boolean DEFAULT false NOT NULL,
    "commissionPct" double precision DEFAULT 0 NOT NULL,
    "commissionFixed" double precision DEFAULT 0 NOT NULL,
    "imageUrl" text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "isPopular" boolean DEFAULT false NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "totalBookings" integer DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    "avgRating" double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SalonService" OWNER TO abubakarmalik;

--
-- Name: SalonStaffProfile; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SalonStaffProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "staffId" text NOT NULL,
    role public."SalonStaffRole" DEFAULT 'STYLIST'::public."SalonStaffRole" NOT NULL,
    specialization text[] DEFAULT ARRAY[]::text[],
    "experienceYears" integer,
    bio text,
    "photoUrl" text,
    "commissionType" public."SalonCommissionType" DEFAULT 'NONE'::public."SalonCommissionType" NOT NULL,
    "commissionPct" double precision DEFAULT 0 NOT NULL,
    "commissionFixed" double precision DEFAULT 0 NOT NULL,
    "workingDays" integer[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6],
    "workStartTime" text DEFAULT '09:00'::text NOT NULL,
    "workEndTime" text DEFAULT '21:00'::text NOT NULL,
    "breakStartTime" text,
    "breakEndTime" text,
    "isBookable" boolean DEFAULT true NOT NULL,
    "maxDailyBookings" integer,
    "bookingBuffer" integer DEFAULT 0 NOT NULL,
    "totalAppointments" integer DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    "totalCommission" double precision DEFAULT 0 NOT NULL,
    "avgRating" double precision,
    "totalReviews" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SalonStaffProfile" OWNER TO abubakarmalik;

--
-- Name: SalonStaffService; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SalonStaffService" (
    id text NOT NULL,
    "staffProfileId" text NOT NULL,
    "serviceId" text NOT NULL,
    "customPrice" double precision,
    "customDuration" integer,
    "customCommissionPct" double precision,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SalonStaffService" OWNER TO abubakarmalik;

--
-- Name: Salt; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Salt" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    "genericName" text,
    code text,
    category text,
    description text,
    "standardDose" text,
    "maxDailyDose" text,
    "routeOfAdmin" text,
    "isPregnancySafe" boolean DEFAULT true NOT NULL,
    "isLactationSafe" boolean DEFAULT true NOT NULL,
    "isPediatricSafe" boolean DEFAULT true NOT NULL,
    "minAgeYears" integer,
    contraindications text,
    "sideEffects" text,
    warnings text,
    "scheduleClass" public."DrugScheduleClass" DEFAULT 'OTC'::public."DrugScheduleClass" NOT NULL,
    "requiresPrescription" boolean DEFAULT false NOT NULL,
    "isNarcotic" boolean DEFAULT false NOT NULL,
    "isBanned" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Salt" OWNER TO abubakarmalik;

--
-- Name: School; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."School" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    code text,
    type text,
    board text,
    medium text,
    address text,
    city text,
    phone text,
    email text,
    "principalName" text,
    "contactPerson" text,
    "contactPhone" text,
    "discountPct" double precision DEFAULT 0 NOT NULL,
    "creditDays" integer DEFAULT 0 NOT NULL,
    "creditLimit" double precision DEFAULT 0 NOT NULL,
    "logoUrl" text,
    notes text,
    "totalOrders" integer DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    "outstandingAmount" double precision DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."School" OWNER TO abubakarmalik;

--
-- Name: SchoolBookList; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SchoolBookList" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "schoolId" text NOT NULL,
    session text NOT NULL,
    grade text NOT NULL,
    section text,
    medium text,
    title text NOT NULL,
    description text,
    status public."SchoolListStatus" DEFAULT 'DRAFT'::public."SchoolListStatus" NOT NULL,
    "discountPct" double precision DEFAULT 0 NOT NULL,
    "bundlePrice" double precision,
    "totalItems" integer DEFAULT 0 NOT NULL,
    "imageUrl" text,
    "totalOrders" integer DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SchoolBookList" OWNER TO abubakarmalik;

--
-- Name: SchoolBookListItem; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SchoolBookListItem" (
    id text NOT NULL,
    "listId" text NOT NULL,
    "productId" text,
    "itemName" text NOT NULL,
    "itemType" text DEFAULT 'BOOK'::text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit text DEFAULT 'piece'::text NOT NULL,
    "unitPrice" double precision DEFAULT 0 NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    subject text,
    "isRequired" boolean DEFAULT true NOT NULL,
    "isOptional" boolean DEFAULT false NOT NULL,
    notes text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SchoolBookListItem" OWNER TO abubakarmalik;

--
-- Name: ServiceAmc; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ServiceAmc" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "amcNumber" text NOT NULL,
    "customerId" text,
    "customerName" text NOT NULL,
    "customerPhone" text NOT NULL,
    "customerEmail" text,
    type public."AmcType" DEFAULT 'STANDARD'::public."AmcType" NOT NULL,
    status public."AmcStatus" DEFAULT 'ACTIVE'::public."AmcStatus" NOT NULL,
    "coveredItems" jsonb NOT NULL,
    "coveredServiceTypes" public."ServiceBusinessType"[] DEFAULT ARRAY[]::public."ServiceBusinessType"[],
    "numberOfVisits" integer DEFAULT 4 NOT NULL,
    "visitsUsed" integer DEFAULT 0 NOT NULL,
    "visitsRemaining" integer DEFAULT 4 NOT NULL,
    "includesParts" boolean DEFAULT false NOT NULL,
    "includesLabour" boolean DEFAULT true NOT NULL,
    "partsCapAmount" double precision,
    "emergencyIncluded" boolean DEFAULT false NOT NULL,
    "emergencyDiscountPct" double precision DEFAULT 0 NOT NULL,
    "contractValue" double precision NOT NULL,
    "amountPaid" double precision DEFAULT 0 NOT NULL,
    "paymentMode" text,
    "paymentInstallments" integer DEFAULT 1 NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "autoRenew" boolean DEFAULT false NOT NULL,
    "reminderDaysBefore" integer DEFAULT 30 NOT NULL,
    "serviceAddress" text NOT NULL,
    city text,
    "numberOfSites" integer DEFAULT 1 NOT NULL,
    "contractDocUrl" text,
    "termsConditions" text,
    "specialConditions" text,
    "cancelledAt" timestamp(3) without time zone,
    "cancellationReason" text,
    "refundAmount" double precision,
    "createdById" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ServiceAmc" OWNER TO abubakarmalik;

--
-- Name: ServiceAmcVisit; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ServiceAmcVisit" (
    id text NOT NULL,
    "amcId" text NOT NULL,
    "visitNumber" integer NOT NULL,
    "scheduledDate" timestamp(3) without time zone NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "technicianId" text,
    "serviceJobId" text,
    status text DEFAULT 'SCHEDULED'::text NOT NULL,
    "visitType" text DEFAULT 'MAINTENANCE'::text NOT NULL,
    "checklistCompleted" jsonb,
    "workDone" text,
    "partsReplaced" jsonb,
    recommendations text,
    "customerRating" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ServiceAmcVisit" OWNER TO abubakarmalik;

--
-- Name: ServiceCatalog; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ServiceCatalog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    name text NOT NULL,
    code text,
    description text,
    category public."ServiceCategory" DEFAULT 'REPAIR'::public."ServiceCategory" NOT NULL,
    "businessType" public."ServiceBusinessType",
    "chargeType" public."ServiceChargeType" DEFAULT 'FIXED'::public."ServiceChargeType" NOT NULL,
    "baseCharge" double precision DEFAULT 0 NOT NULL,
    "hourlyRate" double precision DEFAULT 0 NOT NULL,
    "visitCharge" double precision DEFAULT 0 NOT NULL,
    "minCharge" double precision DEFAULT 0 NOT NULL,
    "maxCharge" double precision,
    "emergencyCharge" double precision DEFAULT 0 NOT NULL,
    "weekendCharge" double precision DEFAULT 0 NOT NULL,
    "nightCharge" double precision DEFAULT 0 NOT NULL,
    "outOfCityCharge" double precision DEFAULT 0 NOT NULL,
    "estimatedDurationMin" integer DEFAULT 60 NOT NULL,
    "minDurationMin" integer,
    "maxDurationMin" integer,
    "requiredSkillLevel" public."TechnicianLevel" DEFAULT 'JUNIOR'::public."TechnicianLevel" NOT NULL,
    "requiredTools" text[] DEFAULT ARRAY[]::text[],
    "requiredParts" text[] DEFAULT ARRAY[]::text[],
    "requiresLicense" boolean DEFAULT false NOT NULL,
    "licenseType" text,
    "warrantyDays" integer DEFAULT 0 NOT NULL,
    "warrantyType" public."WarrantyType" DEFAULT 'NONE'::public."WarrantyType" NOT NULL,
    "warrantyTerms" text,
    "isEmergency" boolean DEFAULT false NOT NULL,
    "isRemoteAvailable" boolean DEFAULT false NOT NULL,
    "requiresQuote" boolean DEFAULT false NOT NULL,
    "requiresAdvance" boolean DEFAULT false NOT NULL,
    "advancePct" double precision DEFAULT 0 NOT NULL,
    "imageUrl" text,
    "imageUrls" text[] DEFAULT ARRAY[]::text[],
    "videoUrl" text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "isPopular" boolean DEFAULT false NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "totalJobs" integer DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    "avgRating" double precision,
    "avgDurationMin" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ServiceCatalog" OWNER TO abubakarmalik;

--
-- Name: ServiceCustomerProfile; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ServiceCustomerProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerId" text NOT NULL,
    "propertyType" text,
    "propertySize" text,
    "ownershipType" text,
    "preferredTechnicianId" text,
    "preferredTimeSlot" text,
    "paymentPreference" text,
    "assetsOwned" jsonb,
    "emergencyAccessInstructions" text,
    "hasSecurityGuard" boolean DEFAULT false NOT NULL,
    "hasPets" boolean DEFAULT false NOT NULL,
    "petDetails" text,
    "gateCode" text,
    "buildingName" text,
    "floorNumber" text,
    "flatNumber" text,
    "preferredContact" text DEFAULT 'PHONE'::text NOT NULL,
    "bestTimeToCall" text,
    "totalJobs" integer DEFAULT 0 NOT NULL,
    "totalSpent" double precision DEFAULT 0 NOT NULL,
    "lastServiceAt" timestamp(3) without time zone,
    "avgRating" double precision,
    "isVip" boolean DEFAULT false NOT NULL,
    "hasActiveAmc" boolean DEFAULT false NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ServiceCustomerProfile" OWNER TO abubakarmalik;

--
-- Name: ServiceJob; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ServiceJob" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "jobNumber" text NOT NULL,
    "ticketNumber" text,
    "customerId" text,
    "customerName" text,
    "customerPhone" text,
    "customerAltPhone" text,
    "customerEmail" text,
    "customerType" text DEFAULT 'INDIVIDUAL'::text NOT NULL,
    "serviceId" text,
    "serviceName" text NOT NULL,
    category public."ServiceCategory" DEFAULT 'REPAIR'::public."ServiceCategory" NOT NULL,
    "businessType" public."ServiceBusinessType",
    priority public."ServicePriority" DEFAULT 'NORMAL'::public."ServicePriority" NOT NULL,
    status public."ServiceJobStatus" DEFAULT 'ENQUIRY'::public."ServiceJobStatus" NOT NULL,
    "problemDescription" text NOT NULL,
    "customerReportedIssue" text,
    "urgencyReason" text,
    brand text,
    "modelNumber" text,
    "serialNumber" text,
    "yearPurchased" integer,
    "purchasedFrom" text,
    "underWarranty" boolean DEFAULT false NOT NULL,
    "warrantyType" public."WarrantyType",
    "warrantyExpiryDate" timestamp(3) without time zone,
    "amcId" text,
    "locationType" public."ServiceLocationType" DEFAULT 'CUSTOMER_HOME'::public."ServiceLocationType" NOT NULL,
    "serviceAddress" text,
    city text,
    area text,
    landmark text,
    latitude double precision,
    longitude double precision,
    "entryInstructions" text,
    "requestedDate" timestamp(3) without time zone,
    "scheduledStart" timestamp(3) without time zone,
    "scheduledEnd" timestamp(3) without time zone,
    "preferredTimeSlot" text,
    "assignedAt" timestamp(3) without time zone,
    "dispatchedAt" timestamp(3) without time zone,
    "enRouteAt" timestamp(3) without time zone,
    "arrivedAt" timestamp(3) without time zone,
    "startedAt" timestamp(3) without time zone,
    "pausedAt" timestamp(3) without time zone,
    "resumedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "primaryTechnicianId" text,
    "assistantTechnicianIds" text[] DEFAULT ARRAY[]::text[],
    "supervisorId" text,
    "visitCharge" double precision DEFAULT 0 NOT NULL,
    "labourCharge" double precision DEFAULT 0 NOT NULL,
    "partsCharge" double precision DEFAULT 0 NOT NULL,
    "transportCharge" double precision DEFAULT 0 NOT NULL,
    "emergencyCharge" double precision DEFAULT 0 NOT NULL,
    "discountAmount" double precision DEFAULT 0 NOT NULL,
    "taxAmount" double precision DEFAULT 0 NOT NULL,
    "totalCharge" double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "paymentStatus" text DEFAULT 'UNPAID'::text NOT NULL,
    "advanceRequired" boolean DEFAULT false NOT NULL,
    "advanceAmount" double precision DEFAULT 0 NOT NULL,
    "advanceCollected" double precision DEFAULT 0 NOT NULL,
    "jobWarrantyDays" integer DEFAULT 0 NOT NULL,
    "jobWarrantyExpiryDate" timestamp(3) without time zone,
    "jobWarrantyTerms" text,
    "needsReturnVisit" boolean DEFAULT false NOT NULL,
    "returnVisitReason" text,
    "returnVisitDate" timestamp(3) without time zone,
    "parentJobId" text,
    "workCompletionSignatureUrl" text,
    "customerSatisfaction" text,
    "customerRating" integer,
    "customerFeedback" text,
    "wouldRecommend" boolean,
    "beforePhotoUrls" text[] DEFAULT ARRAY[]::text[],
    "duringPhotoUrls" text[] DEFAULT ARRAY[]::text[],
    "afterPhotoUrls" text[] DEFAULT ARRAY[]::text[],
    "documentUrls" text[] DEFAULT ARRAY[]::text[],
    "technicianNotes" text,
    "internalNotes" text,
    "quotedBy" text,
    "createdById" text,
    "cancellationReason" text,
    "followUpDate" timestamp(3) without time zone,
    "followUpDone" boolean DEFAULT false NOT NULL,
    "followUpNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ServiceJob" OWNER TO abubakarmalik;

--
-- Name: ServiceJobPart; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ServiceJobPart" (
    id text NOT NULL,
    "jobId" text NOT NULL,
    "productId" text,
    "partName" text NOT NULL,
    "partNumber" text,
    brand text,
    quantity double precision DEFAULT 1 NOT NULL,
    "unitPrice" double precision DEFAULT 0 NOT NULL,
    "costPrice" double precision DEFAULT 0 NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    "isCustomerSupplied" boolean DEFAULT false NOT NULL,
    "isUnderWarranty" boolean DEFAULT false NOT NULL,
    "warrantyDays" integer DEFAULT 0 NOT NULL,
    "serialNumber" text,
    notes text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ServiceJobPart" OWNER TO abubakarmalik;

--
-- Name: ServiceJobStatusHistory; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ServiceJobStatusHistory" (
    id text NOT NULL,
    "jobId" text NOT NULL,
    "fromStatus" public."ServiceJobStatus",
    "toStatus" public."ServiceJobStatus" NOT NULL,
    "changedBy" text,
    "changedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reason text,
    notes text
);


ALTER TABLE public."ServiceJobStatusHistory" OWNER TO abubakarmalik;

--
-- Name: ServiceJobTimeLog; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ServiceJobTimeLog" (
    id text NOT NULL,
    "jobId" text NOT NULL,
    "technicianId" text,
    action text NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    latitude double precision,
    longitude double precision,
    notes text
);


ALTER TABLE public."ServiceJobTimeLog" OWNER TO abubakarmalik;

--
-- Name: ServiceQuote; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ServiceQuote" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "quoteNumber" text NOT NULL,
    "customerId" text,
    "customerName" text NOT NULL,
    "customerPhone" text NOT NULL,
    "customerEmail" text,
    "serviceId" text,
    "serviceName" text NOT NULL,
    "problemDescription" text NOT NULL,
    "siteVisitRequired" boolean DEFAULT false NOT NULL,
    "siteVisitCompleted" boolean DEFAULT false NOT NULL,
    status public."QuoteStatus" DEFAULT 'DRAFT'::public."QuoteStatus" NOT NULL,
    "labourCharge" double precision DEFAULT 0 NOT NULL,
    "partsCharge" double precision DEFAULT 0 NOT NULL,
    "visitCharge" double precision DEFAULT 0 NOT NULL,
    "otherCharges" double precision DEFAULT 0 NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    "taxAmount" double precision DEFAULT 0 NOT NULL,
    "totalAmount" double precision DEFAULT 0 NOT NULL,
    "lineItems" jsonb,
    "validUntil" timestamp(3) without time zone,
    "termsConditions" text,
    "sentAt" timestamp(3) without time zone,
    "respondedAt" timestamp(3) without time zone,
    "acceptedAt" timestamp(3) without time zone,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "convertedJobId" text,
    "createdById" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ServiceQuote" OWNER TO abubakarmalik;

--
-- Name: ServiceTechnicianProfile; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ServiceTechnicianProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "staffId" text NOT NULL,
    "employeeCode" text,
    level public."TechnicianLevel" DEFAULT 'JUNIOR'::public."TechnicianLevel" NOT NULL,
    status public."TechnicianStatus" DEFAULT 'AVAILABLE'::public."TechnicianStatus" NOT NULL,
    "primarySkill" public."ServiceBusinessType",
    "secondarySkills" public."ServiceBusinessType"[] DEFAULT ARRAY[]::public."ServiceBusinessType"[],
    certifications jsonb,
    "experienceYears" integer DEFAULT 0 NOT NULL,
    bio text,
    "photoUrl" text,
    "cnicNumber" text,
    "licenseNumber" text,
    "licenseExpiryDate" timestamp(3) without time zone,
    "drivingLicense" text,
    "vehicleAssigned" text,
    "vehicleNumber" text,
    "emergencyContactName" text,
    "emergencyContactPhone" text,
    "serviceAreas" text[] DEFAULT ARRAY[]::text[],
    "homeCity" text,
    "currentLat" double precision,
    "currentLng" double precision,
    "lastLocationAt" timestamp(3) without time zone,
    "maxTravelKm" integer,
    "workingDays" integer[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6],
    "workStartTime" text DEFAULT '08:00'::text NOT NULL,
    "workEndTime" text DEFAULT '20:00'::text NOT NULL,
    "breakStartTime" text,
    "breakEndTime" text,
    "isAvailableForEmergency" boolean DEFAULT false NOT NULL,
    "isAvailableWeekends" boolean DEFAULT true NOT NULL,
    "isAvailableNights" boolean DEFAULT false NOT NULL,
    "commissionType" text DEFAULT 'PERCENTAGE'::text NOT NULL,
    "commissionPct" double precision DEFAULT 0 NOT NULL,
    "fixedPerJob" double precision DEFAULT 0 NOT NULL,
    "monthlySalary" double precision DEFAULT 0 NOT NULL,
    "performanceBonus" double precision DEFAULT 0 NOT NULL,
    "maxDailyJobs" integer,
    "maxOngoingJobs" integer DEFAULT 3 NOT NULL,
    "bookingBufferMin" integer DEFAULT 30 NOT NULL,
    "totalJobs" integer DEFAULT 0 NOT NULL,
    "completedJobs" integer DEFAULT 0 NOT NULL,
    "cancelledJobs" integer DEFAULT 0 NOT NULL,
    "totalRevenue" double precision DEFAULT 0 NOT NULL,
    "totalCommission" double precision DEFAULT 0 NOT NULL,
    "avgRating" double precision,
    "totalReviews" integer DEFAULT 0 NOT NULL,
    "onTimePct" double precision DEFAULT 100 NOT NULL,
    "completionPct" double precision DEFAULT 100 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ServiceTechnicianProfile" OWNER TO abubakarmalik;

--
-- Name: ServiceTechnicianSkill; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ServiceTechnicianSkill" (
    id text NOT NULL,
    "technicianId" text NOT NULL,
    "serviceId" text NOT NULL,
    "skillLevel" public."TechnicianLevel" DEFAULT 'JUNIOR'::public."TechnicianLevel" NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "customRate" double precision,
    "customDuration" integer,
    "certifiedAt" timestamp(3) without time zone,
    "certifiedBy" text,
    "totalJobs" integer DEFAULT 0 NOT NULL,
    "avgRating" double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ServiceTechnicianSkill" OWNER TO abubakarmalik;

--
-- Name: ServiceWarrantyClaim; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ServiceWarrantyClaim" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "claimNumber" text NOT NULL,
    "originalJobId" text,
    "customerId" text,
    "customerName" text NOT NULL,
    "customerPhone" text NOT NULL,
    "claimType" public."WarrantyType" DEFAULT 'SERVICE_PROVIDER'::public."WarrantyType" NOT NULL,
    "claimDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "issueDescription" text NOT NULL,
    "originalServiceDate" timestamp(3) without time zone,
    "warrantyExpiryDate" timestamp(3) without time zone,
    status text DEFAULT 'SUBMITTED'::text NOT NULL,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "approvedAt" timestamp(3) without time zone,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "newJobId" text,
    "resolutionType" text,
    "resolutionNotes" text,
    "costToCompany" double precision DEFAULT 0 NOT NULL,
    "refundAmount" double precision DEFAULT 0 NOT NULL,
    "photoUrls" text[] DEFAULT ARRAY[]::text[],
    "documentUrls" text[] DEFAULT ARRAY[]::text[],
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ServiceWarrantyClaim" OWNER TO abubakarmalik;

--
-- Name: ServiceZone; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ServiceZone" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    city text NOT NULL,
    areas text[] DEFAULT ARRAY[]::text[],
    "centerLat" double precision,
    "centerLng" double precision,
    "radiusKm" double precision,
    "travelCharge" double precision DEFAULT 0 NOT NULL,
    "emergencyChargeExtra" double precision DEFAULT 0 NOT NULL,
    "minEmergencyChargeThreshold" double precision,
    "defaultTravelTimeMin" integer DEFAULT 30 NOT NULL,
    "activeHours" text DEFAULT '24x7'::text NOT NULL,
    "isEmergencyServed" boolean DEFAULT true NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ServiceZone" OWNER TO abubakarmalik;

--
-- Name: Session; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "refreshTokenHash" text NOT NULL,
    "userAgent" text,
    "ipAddress" text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deviceFingerprint" text,
    "deviceName" text,
    "lastUsedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    location text
);


ALTER TABLE public."Session" OWNER TO abubakarmalik;

--
-- Name: Shop; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Shop" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    "isMain" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    type public."ShopType" DEFAULT 'SHOP'::public."ShopType" NOT NULL
);


ALTER TABLE public."Shop" OWNER TO abubakarmalik;

--
-- Name: ShopStock; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."ShopStock" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text NOT NULL,
    "productId" text NOT NULL,
    "variantId" text,
    stock double precision DEFAULT 0 NOT NULL,
    "lowStockAlert" double precision DEFAULT 5 NOT NULL,
    "shopPrice" double precision,
    "shopCostPrice" double precision,
    "isActive" boolean DEFAULT true NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ShopStock" OWNER TO abubakarmalik;

--
-- Name: SmsLog; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SmsLog" (
    id text NOT NULL,
    "tenantId" text,
    "templateSlug" text,
    "toPhone" text NOT NULL,
    message text NOT NULL,
    variables jsonb,
    status public."DeliveryStatus" DEFAULT 'QUEUED'::public."DeliveryStatus" NOT NULL,
    "providerId" text,
    cost double precision DEFAULT 0 NOT NULL,
    "errorMessage" text,
    "retryCount" integer DEFAULT 0 NOT NULL,
    "sentAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SmsLog" OWNER TO abubakarmalik;

--
-- Name: SmsTemplate; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SmsTemplate" (
    id text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    message text NOT NULL,
    variables jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SmsTemplate" OWNER TO abubakarmalik;

--
-- Name: Staff; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Staff" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "userId" text,
    "staffNumber" text NOT NULL,
    "fullName" text NOT NULL,
    "fatherName" text,
    gender public."StaffGender",
    "dateOfBirth" timestamp(3) without time zone,
    cnic text,
    phone text NOT NULL,
    "altPhone" text,
    email text,
    address text,
    city text,
    "emergencyName" text,
    "emergencyPhone" text,
    "emergencyRelation" text,
    designation text NOT NULL,
    department text,
    "joinDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    status public."StaffStatus" DEFAULT 'ACTIVE'::public."StaffStatus" NOT NULL,
    "salaryType" public."SalaryType" DEFAULT 'MONTHLY'::public."SalaryType" NOT NULL,
    "baseSalary" double precision DEFAULT 0 NOT NULL,
    "workingHoursPerDay" double precision DEFAULT 8 NOT NULL,
    "workingDaysPerMonth" integer DEFAULT 26 NOT NULL,
    "bankName" text,
    "accountNumber" text,
    iban text,
    "avatarUrl" text,
    "cnicFrontUrl" text,
    "cnicBackUrl" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Staff" OWNER TO abubakarmalik;

--
-- Name: StaffDocument; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."StaffDocument" (
    id text NOT NULL,
    "staffId" text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    "fileUrl" text NOT NULL,
    "fileName" text,
    notes text,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."StaffDocument" OWNER TO abubakarmalik;

--
-- Name: StaffLeave; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."StaffLeave" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "staffId" text NOT NULL,
    type public."LeaveType" DEFAULT 'CASUAL'::public."LeaveType" NOT NULL,
    "startDate" date NOT NULL,
    "endDate" date NOT NULL,
    days double precision NOT NULL,
    reason text,
    status public."LeaveStatus" DEFAULT 'PENDING'::public."LeaveStatus" NOT NULL,
    "approvedById" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StaffLeave" OWNER TO abubakarmalik;

--
-- Name: StationeryProfile; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."StationeryProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    category public."StationeryCategory" DEFAULT 'OTHER'::public."StationeryCategory" NOT NULL,
    "subCategory" text,
    brand text,
    color text,
    size text,
    weight double precision,
    dimensions text,
    material text,
    "packSize" integer,
    "packUnit" text,
    "itemsPerPack" integer,
    "isFastMoving" boolean DEFAULT false NOT NULL,
    "isSchoolItem" boolean DEFAULT false NOT NULL,
    "isOfficeItem" boolean DEFAULT false NOT NULL,
    "reorderLevel" integer DEFAULT 0 NOT NULL,
    "totalSold" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StationeryProfile" OWNER TO abubakarmalik;

--
-- Name: StockAdjustment; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."StockAdjustment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "createdById" text,
    type public."StockMovementType" NOT NULL,
    quantity double precision NOT NULL,
    reason text NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "carpetRollId" text,
    "imeiId" text,
    "variantId" text
);


ALTER TABLE public."StockAdjustment" OWNER TO abubakarmalik;

--
-- Name: StockMovement; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."StockMovement" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    type public."StockMovementType" NOT NULL,
    quantity double precision NOT NULL,
    "balanceAfter" double precision NOT NULL,
    reference text,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."StockMovement" OWNER TO abubakarmalik;

--
-- Name: StockTransfer; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."StockTransfer" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "fromShopId" text NOT NULL,
    "toShopId" text NOT NULL,
    "createdById" text,
    "transferNumber" text NOT NULL,
    status public."TransferStatus" DEFAULT 'PENDING'::public."TransferStatus" NOT NULL,
    notes text,
    "transferredAt" timestamp(3) without time zone,
    "receivedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StockTransfer" OWNER TO abubakarmalik;

--
-- Name: StockTransferItem; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."StockTransferItem" (
    id text NOT NULL,
    "transferId" text NOT NULL,
    "productId" text NOT NULL,
    quantity double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "carpetRollId" text,
    notes text,
    "variantId" text
);


ALTER TABLE public."StockTransferItem" OWNER TO abubakarmalik;

--
-- Name: Subscription; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Subscription" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "planId" text NOT NULL,
    status public."SubscriptionStatus" DEFAULT 'TRIAL'::public."SubscriptionStatus" NOT NULL,
    "interval" public."BillingInterval" DEFAULT 'MONTHLY'::public."BillingInterval" NOT NULL,
    amount double precision NOT NULL,
    currency text DEFAULT 'PKR'::text NOT NULL,
    "trialEndsAt" timestamp(3) without time zone,
    "currentPeriodStart" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "currentPeriodEnd" timestamp(3) without time zone NOT NULL,
    "cancelAtPeriodEnd" boolean DEFAULT false NOT NULL,
    "cancelledAt" timestamp(3) without time zone,
    "stripeCustomerId" text,
    "stripeSubscriptionId" text,
    "autoRenew" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Subscription" OWNER TO abubakarmalik;

--
-- Name: Supplier; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Supplier" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    address text,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "accountNumber" text,
    "altPhone" text,
    area text,
    "bankName" text,
    city text,
    cnic text,
    "contactPerson" text,
    iban text,
    "logoUrl" text,
    ntn text,
    "outstandingDue" double precision DEFAULT 0 NOT NULL,
    "paymentTerms" text,
    "totalPurchased" double precision DEFAULT 0 NOT NULL
);


ALTER TABLE public."Supplier" OWNER TO abubakarmalik;

--
-- Name: SystemSetting; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."SystemSetting" (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    description text,
    "isPublic" boolean DEFAULT false NOT NULL,
    "updatedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SystemSetting" OWNER TO abubakarmalik;

--
-- Name: Tag; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Tag" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#16a34a'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Tag" OWNER TO abubakarmalik;

--
-- Name: TemperatureLog; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."TemperatureLog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "logDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    temperature double precision NOT NULL,
    humidity double precision,
    unit text DEFAULT 'celsius'::text NOT NULL,
    location text,
    "isWithinRange" boolean DEFAULT true NOT NULL,
    "minLimit" double precision,
    "maxLimit" double precision,
    "recordedBy" text,
    automated boolean DEFAULT false NOT NULL,
    notes text,
    "alertSent" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TemperatureLog" OWNER TO abubakarmalik;

--
-- Name: Tenant; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Tenant" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    phone text,
    country text DEFAULT 'Pakistan'::text NOT NULL,
    currency text DEFAULT 'PKR'::text NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    status public."TenantStatus" DEFAULT 'TRIAL'::public."TenantStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "accountCredit" double precision DEFAULT 0 NOT NULL,
    "referralCode" text,
    "referredById" text,
    address text,
    "businessFeatures" jsonb,
    "businessType" text,
    "defaultUnit" text
);


ALTER TABLE public."Tenant" OWNER TO abubakarmalik;

--
-- Name: TenantNote; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."TenantNote" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "authorId" text NOT NULL,
    title text,
    content text NOT NULL,
    "isPinned" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TenantNote" OWNER TO abubakarmalik;

--
-- Name: TenantSettings; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."TenantSettings" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopName" text,
    "shopAddress" text,
    "shopPhone" text,
    "shopEmail" text,
    "logoUrl" text,
    "taxRate" double precision DEFAULT 0 NOT NULL,
    "taxNumber" text,
    "receiptFooter" text,
    "receiptHeader" text,
    "enableTax" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "allowCredit" boolean DEFAULT true NOT NULL,
    "allowDiscount" boolean DEFAULT true NOT NULL,
    "allowNegativeStock" boolean DEFAULT false NOT NULL,
    "autoCreateCustomer" boolean DEFAULT false NOT NULL,
    "autoLogoutMinutes" integer DEFAULT 60 NOT NULL,
    "autoPrintReceipt" boolean DEFAULT false NOT NULL,
    "autoReorder" boolean DEFAULT false NOT NULL,
    "bannerUrl" text,
    "brandColor" text DEFAULT '#16a34a'::text NOT NULL,
    "businessType" text,
    "closeTime" text,
    "compactMode" boolean DEFAULT false NOT NULL,
    "confirmBeforeCheckout" boolean DEFAULT true NOT NULL,
    "creditOverdueDays" integer DEFAULT 30 NOT NULL,
    currency text DEFAULT 'PKR'::text NOT NULL,
    "currencySymbol" text DEFAULT 'Rs'::text NOT NULL,
    "dailySummaryTime" text DEFAULT '21:00'::text NOT NULL,
    "dateFormat" text DEFAULT 'DD/MM/YYYY'::text NOT NULL,
    "defaultCreditLimit" double precision DEFAULT 0 NOT NULL,
    "defaultLowStockAlert" integer DEFAULT 10 NOT NULL,
    "defaultMarkup" double precision DEFAULT 0 NOT NULL,
    "defaultPaymentMethod" text DEFAULT 'CASH'::text NOT NULL,
    "emailNotifications" boolean DEFAULT true NOT NULL,
    "enableBarcodeScanner" boolean DEFAULT true NOT NULL,
    "enableLoyalty" boolean DEFAULT false NOT NULL,
    "enableQuickKeys" boolean DEFAULT true NOT NULL,
    "enableTwoFactor" boolean DEFAULT false NOT NULL,
    "establishedDate" timestamp(3) without time zone,
    "expiryWarningDays" integer DEFAULT 30 NOT NULL,
    "firstDayOfWeek" text DEFAULT 'monday'::text NOT NULL,
    "invoicePrefix" text DEFAULT 'INV-'::text NOT NULL,
    "invoiceStartNumber" integer DEFAULT 1 NOT NULL,
    language text DEFAULT 'roman_ur'::text NOT NULL,
    "legalName" text,
    "loyaltyPointsPerRupee" double precision DEFAULT 0.01 NOT NULL,
    "loyaltyRedemptionRate" double precision DEFAULT 1 NOT NULL,
    "managerPin" text,
    "maxDiscountPercent" double precision DEFAULT 50 NOT NULL,
    "maxLoginAttempts" integer DEFAULT 5 NOT NULL,
    "notifyDailySummary" boolean DEFAULT true NOT NULL,
    "notifyLowStock" boolean DEFAULT true NOT NULL,
    "notifyNewCustomer" boolean DEFAULT false NOT NULL,
    "notifyNewSale" boolean DEFAULT false NOT NULL,
    "notifyOutOfStock" boolean DEFAULT true NOT NULL,
    "openTime" text,
    "printCopiesCount" integer DEFAULT 1 NOT NULL,
    "pushNotifications" boolean DEFAULT true NOT NULL,
    "receiptShowBarcode" boolean DEFAULT false NOT NULL,
    "receiptShowCustomer" boolean DEFAULT true NOT NULL,
    "receiptShowLogo" boolean DEFAULT true NOT NULL,
    "receiptShowQrCode" boolean DEFAULT false NOT NULL,
    "receiptShowTax" boolean DEFAULT true NOT NULL,
    "receiptSize" text DEFAULT 'THERMAL_58MM'::text NOT NULL,
    "reorderPoint" integer DEFAULT 5 NOT NULL,
    "requireCustomerForSale" boolean DEFAULT false NOT NULL,
    "requirePinForDiscount" boolean DEFAULT false NOT NULL,
    "requirePinForRefund" boolean DEFAULT true NOT NULL,
    "requirePinForVoid" boolean DEFAULT false NOT NULL,
    "roundPriceTo" integer DEFAULT 1 NOT NULL,
    "roundTotal" boolean DEFAULT true NOT NULL,
    "shopCity" text,
    "shopPostalCode" text,
    "shopProvince" text,
    "shopWebsite" text,
    "shopWhatsapp" text,
    "showProductImages" boolean DEFAULT true NOT NULL,
    "smsNotifications" boolean DEFAULT false NOT NULL,
    "stockMethod" text DEFAULT 'AVERAGE'::text NOT NULL,
    "taxInclusive" boolean DEFAULT false NOT NULL,
    "taxLabel" text DEFAULT 'GST'::text NOT NULL,
    theme text DEFAULT 'light'::text NOT NULL,
    timezone text DEFAULT 'Asia/Karachi'::text NOT NULL,
    "trackExpiry" boolean DEFAULT false NOT NULL,
    "whatsappNotifications" boolean DEFAULT false NOT NULL,
    "workingDays" text[] DEFAULT ARRAY['mon'::text, 'tue'::text, 'wed'::text, 'thu'::text, 'fri'::text, 'sat'::text],
    integrations jsonb,
    "receiptConfig" jsonb
);


ALTER TABLE public."TenantSettings" OWNER TO abubakarmalik;

--
-- Name: Upload; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."Upload" (
    id text NOT NULL,
    "tenantId" text,
    "uploaderId" text,
    filename text NOT NULL,
    "originalName" text NOT NULL,
    "mimeType" text NOT NULL,
    size integer NOT NULL,
    path text NOT NULL,
    url text NOT NULL,
    purpose text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "publicId" text,
    storage text DEFAULT 'local'::text NOT NULL
);


ALTER TABLE public."Upload" OWNER TO abubakarmalik;

--
-- Name: UsedPhone; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."UsedPhone" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "usedPhoneCode" text NOT NULL,
    imei1 text NOT NULL,
    imei2 text,
    "serialNumber" text,
    brand text NOT NULL,
    model text NOT NULL,
    storage text,
    ram text,
    color text,
    "modelYear" integer,
    "ptaStatus" public."PtaStatus" DEFAULT 'PENDING'::public."PtaStatus" NOT NULL,
    "ptaTaxPaid" double precision DEFAULT 0 NOT NULL,
    condition public."UsedPhoneCondition" DEFAULT 'GOOD'::public."UsedPhoneCondition" NOT NULL,
    "conditionNotes" text,
    "hasOriginalBox" boolean DEFAULT false NOT NULL,
    "hasOriginalCharger" boolean DEFAULT false NOT NULL,
    "hasOriginalCable" boolean DEFAULT false NOT NULL,
    "hasOriginalEarphones" boolean DEFAULT false NOT NULL,
    "hasOriginalReceipt" boolean DEFAULT false NOT NULL,
    "hasWarrantyLeft" boolean DEFAULT false NOT NULL,
    "warrantyExpiryDate" timestamp(3) without time zone,
    source public."TradeInSource" DEFAULT 'CASH_BUYBACK'::public."TradeInSource" NOT NULL,
    "buybackPrice" double precision DEFAULT 0 NOT NULL,
    "estimatedValue" double precision DEFAULT 0 NOT NULL,
    "refurbishCost" double precision DEFAULT 0 NOT NULL,
    "totalCost" double precision DEFAULT 0 NOT NULL,
    "resalePrice" double precision DEFAULT 0 NOT NULL,
    "finalSoldPrice" double precision,
    "fromCustomerId" text,
    "fromCustomerName" text,
    "fromCustomerPhone" text,
    "fromCustomerCnic" text,
    "cnicPhotoUrl" text,
    status public."UsedPhoneStatus" DEFAULT 'PENDING_INSPECTION'::public."UsedPhoneStatus" NOT NULL,
    "soldToCustomerId" text,
    "soldSaleId" text,
    "soldAt" timestamp(3) without time zone,
    "imeiPhotoUrl" text,
    "devicePhotos" text[] DEFAULT ARRAY[]::text[],
    "receivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "inspectedAt" timestamp(3) without time zone,
    notes text,
    "createdById" text,
    "inspectedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."UsedPhone" OWNER TO abubakarmalik;

--
-- Name: UsedPhoneInspection; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."UsedPhoneInspection" (
    id text NOT NULL,
    "usedPhoneId" text NOT NULL,
    "tenantId" text NOT NULL,
    "screenCondition" text,
    "bodyCondition" text,
    "cameraWorks" boolean DEFAULT true,
    "speakerWorks" boolean DEFAULT true,
    "microphoneWorks" boolean DEFAULT true,
    "chargingPortWorks" boolean DEFAULT true,
    "buttonsWork" boolean DEFAULT true,
    "faceIdFingerprintWorks" boolean DEFAULT true,
    "batteryHealth" integer,
    "imeiUnlocked" boolean DEFAULT true,
    "icloudUnlocked" boolean DEFAULT true,
    "softwareIssues" text,
    "needsRepair" boolean DEFAULT false NOT NULL,
    "estimatedRepairCost" double precision DEFAULT 0 NOT NULL,
    "recommendedActions" text,
    "inspectedById" text,
    "inspectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."UsedPhoneInspection" OWNER TO abubakarmalik;

--
-- Name: User; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "fullName" text NOT NULL,
    email text NOT NULL,
    phone text,
    "passwordHash" text,
    role public."UserRole" DEFAULT 'OWNER'::public."UserRole" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "emailVerified" boolean DEFAULT false NOT NULL,
    "phoneVerified" boolean DEFAULT false NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "pushTokens" text[] DEFAULT ARRAY[]::text[],
    "avatarUrl" text,
    "emailVerifiedAt" timestamp(3) without time zone,
    "googleId" text,
    "passwordResetExpires" timestamp(3) without time zone,
    "passwordResetToken" text,
    "authProvider" public."AuthProvider" DEFAULT 'EMAIL'::public."AuthProvider" NOT NULL,
    permissions text[] DEFAULT ARRAY[]::text[],
    "shopId" text
);


ALTER TABLE public."User" OWNER TO abubakarmalik;

--
-- Name: VehicleMake; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."VehicleMake" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    country text,
    "logoUrl" text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."VehicleMake" OWNER TO abubakarmalik;

--
-- Name: VehicleModel; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."VehicleModel" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "makeId" text NOT NULL,
    name text NOT NULL,
    "vehicleType" public."VehicleType" DEFAULT 'CAR'::public."VehicleType" NOT NULL,
    "yearFrom" integer,
    "yearTo" integer,
    "engineOptions" text[] DEFAULT ARRAY[]::text[],
    "imageUrl" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."VehicleModel" OWNER TO abubakarmalik;

--
-- Name: VehicleServiceReminder; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."VehicleServiceReminder" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "vehicleId" text NOT NULL,
    "reminderType" text NOT NULL,
    title text NOT NULL,
    description text,
    "dueDate" timestamp(3) without time zone,
    "dueOdometerKm" integer,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "sentAt" timestamp(3) without time zone,
    "acknowledgedAt" timestamp(3) without time zone,
    "doneAt" timestamp(3) without time zone,
    "autoCreated" boolean DEFAULT false NOT NULL,
    "fromJobId" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."VehicleServiceReminder" OWNER TO abubakarmalik;

--
-- Name: WaiterAssignment; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."WaiterAssignment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "userId" text NOT NULL,
    "tableIds" text[] DEFAULT ARRAY[]::text[],
    section text,
    "shiftStart" timestamp(3) without time zone,
    "shiftEnd" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."WaiterAssignment" OWNER TO abubakarmalik;

--
-- Name: WorkshopJob; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."WorkshopJob" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shopId" text,
    "jobNumber" text NOT NULL,
    status public."JobStatus" DEFAULT 'DRAFT'::public."JobStatus" NOT NULL,
    priority public."JobPriority" DEFAULT 'NORMAL'::public."JobPriority" NOT NULL,
    "jobType" public."JobType" DEFAULT 'GENERAL_SERVICE'::public."JobType" NOT NULL,
    "vehicleId" text,
    "registrationNumber" text,
    "makeName" text,
    "modelName" text,
    year integer,
    "odometerKm" integer,
    "customerId" text,
    "customerName" text,
    "customerPhone" text,
    "customerComplaint" text,
    diagnosis text,
    "workDescription" text,
    recommendations text,
    "primaryMechanicId" text,
    "assistantMechanicIds" text[] DEFAULT ARRAY[]::text[],
    "bayNumber" text,
    "receivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "promisedAt" timestamp(3) without time zone,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "cancellationReason" text,
    "fuelLevel" text,
    "hasSpareTire" boolean DEFAULT false NOT NULL,
    "hasToolkit" boolean DEFAULT false NOT NULL,
    "externalDamages" text,
    "inspectionImageUrls" text[] DEFAULT ARRAY[]::text[],
    "testDriveRequired" boolean DEFAULT false NOT NULL,
    "testDriveNotes" text,
    "testDriveDoneAt" timestamp(3) without time zone,
    "testDriveByMechanicId" text,
    "laborTotal" double precision DEFAULT 0 NOT NULL,
    "partsTotal" double precision DEFAULT 0 NOT NULL,
    "externalTotal" double precision DEFAULT 0 NOT NULL,
    subtotal double precision DEFAULT 0 NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    "taxAmount" double precision DEFAULT 0 NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "paymentStatus" text DEFAULT 'UNPAID'::text NOT NULL,
    "warrantyStatus" public."WarrantyStatus" DEFAULT 'NONE'::public."WarrantyStatus" NOT NULL,
    "warrantyMonths" integer DEFAULT 0 NOT NULL,
    "warrantyKm" integer,
    "warrantyExpiry" timestamp(3) without time zone,
    "warrantyNotes" text,
    "isInsuranceClaim" boolean DEFAULT false NOT NULL,
    "insuranceProvider" text,
    "insuranceClaimNumber" text,
    "insuranceApproved" boolean DEFAULT false NOT NULL,
    "insuranceAmount" double precision DEFAULT 0 NOT NULL,
    "customerRating" integer,
    "customerFeedback" text,
    "internalNotes" text,
    "imageUrls" text[] DEFAULT ARRAY[]::text[],
    "documentUrls" text[] DEFAULT ARRAY[]::text[],
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."WorkshopJob" OWNER TO abubakarmalik;

--
-- Name: WorkshopJobExternal; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."WorkshopJobExternal" (
    id text NOT NULL,
    "jobId" text NOT NULL,
    description text NOT NULL,
    "vendorName" text,
    "vendorPhone" text,
    cost double precision DEFAULT 0 NOT NULL,
    markup double precision DEFAULT 0 NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    "sentAt" timestamp(3) without time zone,
    "receivedAt" timestamp(3) without time zone,
    status text DEFAULT 'PENDING'::text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."WorkshopJobExternal" OWNER TO abubakarmalik;

--
-- Name: WorkshopJobLabor; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."WorkshopJobLabor" (
    id text NOT NULL,
    "jobId" text NOT NULL,
    description text NOT NULL,
    "jobType" public."JobType",
    "mechanicId" text,
    "mechanicName" text,
    hours double precision DEFAULT 1 NOT NULL,
    "ratePerHour" double precision DEFAULT 0 NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    "commissionAmount" double precision DEFAULT 0 NOT NULL,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "completedAt" timestamp(3) without time zone,
    notes text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."WorkshopJobLabor" OWNER TO abubakarmalik;

--
-- Name: WorkshopJobPart; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."WorkshopJobPart" (
    id text NOT NULL,
    "jobId" text NOT NULL,
    "productId" text,
    "variantId" text,
    "partName" text NOT NULL,
    "partNumber" text,
    quantity double precision DEFAULT 1 NOT NULL,
    "unitPrice" double precision DEFAULT 0 NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    condition public."PartCondition" DEFAULT 'NEW'::public."PartCondition" NOT NULL,
    "isCustomerSupplied" boolean DEFAULT false NOT NULL,
    "warrantyMonths" integer DEFAULT 0 NOT NULL,
    "warrantyKm" integer,
    "installedByMechanicId" text,
    "installedAt" timestamp(3) without time zone,
    notes text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."WorkshopJobPart" OWNER TO abubakarmalik;

--
-- Name: WorkshopJobPayment; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."WorkshopJobPayment" (
    id text NOT NULL,
    "jobId" text NOT NULL,
    amount double precision NOT NULL,
    "paymentMethod" text NOT NULL,
    reference text,
    notes text,
    "receivedById" text,
    "paidAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."WorkshopJobPayment" OWNER TO abubakarmalik;

--
-- Name: WorkshopJobStatusLog; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public."WorkshopJobStatusLog" (
    id text NOT NULL,
    "jobId" text NOT NULL,
    "fromStatus" public."JobStatus",
    "toStatus" public."JobStatus" NOT NULL,
    notes text,
    "changedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."WorkshopJobStatusLog" OWNER TO abubakarmalik;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO abubakarmalik;

--
-- Name: auction_bids; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.auction_bids (
    id text NOT NULL,
    "auctionId" text NOT NULL,
    "customerId" text NOT NULL,
    amount numeric(12,2) NOT NULL,
    "isAutoBid" boolean DEFAULT false NOT NULL,
    "maxAutoBid" numeric(12,2),
    "isRetracted" boolean DEFAULT false NOT NULL,
    "retractedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.auction_bids OWNER TO abubakarmalik;

--
-- Name: auctions; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.auctions (
    id text NOT NULL,
    "shopId" text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text,
    "variantId" text,
    title text NOT NULL,
    description text,
    "imageUrls" text[] DEFAULT ARRAY[]::text[],
    "videoUrl" text,
    "startingPrice" numeric(12,2) NOT NULL,
    "reservePrice" numeric(12,2),
    "bidIncrement" numeric(12,2) DEFAULT 100 NOT NULL,
    "currentPrice" numeric(12,2) NOT NULL,
    "bidCount" integer DEFAULT 0 NOT NULL,
    status public."AuctionStatus" DEFAULT 'SCHEDULED'::public."AuctionStatus" NOT NULL,
    "startsAt" timestamp(3) without time zone NOT NULL,
    "endsAt" timestamp(3) without time zone NOT NULL,
    "autoExtendOnBid" boolean DEFAULT true NOT NULL,
    "extendedUntil" timestamp(3) without time zone,
    "winnerId" text,
    "winningBidId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.auctions OWNER TO abubakarmalik;

--
-- Name: bargain_messages; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.bargain_messages (
    id text NOT NULL,
    "bargainId" text NOT NULL,
    "senderType" text NOT NULL,
    "customerId" text,
    message text,
    "offeredPrice" numeric(12,2),
    action text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.bargain_messages OWNER TO abubakarmalik;

--
-- Name: bargains; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.bargains (
    id text NOT NULL,
    "customerId" text NOT NULL,
    "shopId" text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "variantId" text,
    "productName" text NOT NULL,
    "originalPrice" numeric(12,2) NOT NULL,
    "customerOffer" numeric(12,2) NOT NULL,
    "currentOffer" numeric(12,2) NOT NULL,
    "finalPrice" numeric(12,2),
    quantity integer DEFAULT 1 NOT NULL,
    status public."BargainStatus" DEFAULT 'PENDING'::public."BargainStatus" NOT NULL,
    "offerCount" integer DEFAULT 1 NOT NULL,
    "maxOffers" integer DEFAULT 3 NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "orderId" text,
    "convertedAt" timestamp(3) without time zone,
    "rejectedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.bargains OWNER TO abubakarmalik;

--
-- Name: customer_addresses; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.customer_addresses (
    id text NOT NULL,
    "customerId" text NOT NULL,
    label text NOT NULL,
    "fullName" text NOT NULL,
    phone text NOT NULL,
    "addressLine1" text NOT NULL,
    "addressLine2" text,
    landmark text,
    city text NOT NULL,
    area text NOT NULL,
    province text,
    "postalCode" text,
    country text DEFAULT 'Pakistan'::text NOT NULL,
    lat double precision,
    lng double precision,
    "addressType" text DEFAULT 'HOME'::text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "deliveryNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.customer_addresses OWNER TO abubakarmalik;

--
-- Name: customer_follows_shop; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.customer_follows_shop (
    id text NOT NULL,
    "customerId" text NOT NULL,
    "shopId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.customer_follows_shop OWNER TO abubakarmalik;

--
-- Name: customer_login_history; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.customer_login_history (
    id text NOT NULL,
    "customerId" text,
    phone text,
    email text,
    success boolean NOT NULL,
    "failureReason" text,
    "ipAddress" text,
    "userAgent" text,
    "deviceName" text,
    location text,
    "isNewDevice" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.customer_login_history OWNER TO abubakarmalik;

--
-- Name: customer_notifications; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.customer_notifications (
    id text NOT NULL,
    "customerId" text NOT NULL,
    type text NOT NULL,
    channel public."NotificationChannel" DEFAULT 'IN_APP'::public."NotificationChannel" NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    "imageUrl" text,
    "actionUrl" text,
    data jsonb,
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    "sentAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "pushSent" boolean DEFAULT false NOT NULL,
    "smsSent" boolean DEFAULT false NOT NULL,
    "emailSent" boolean DEFAULT false NOT NULL,
    "whatsappSent" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.customer_notifications OWNER TO abubakarmalik;

--
-- Name: customer_otp_codes; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.customer_otp_codes (
    id text NOT NULL,
    "customerId" text,
    phone text,
    email text,
    code text NOT NULL,
    purpose text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    "maxAttempts" integer DEFAULT 5 NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "verifiedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.customer_otp_codes OWNER TO abubakarmalik;

--
-- Name: customer_push_tokens; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.customer_push_tokens (
    id text NOT NULL,
    "customerId" text NOT NULL,
    token text NOT NULL,
    platform text NOT NULL,
    "deviceInfo" jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastUsedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.customer_push_tokens OWNER TO abubakarmalik;

--
-- Name: customer_saved_cards; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.customer_saved_cards (
    id text NOT NULL,
    "customerId" text NOT NULL,
    "cardBrand" text NOT NULL,
    last4 text NOT NULL,
    "expiryMonth" integer NOT NULL,
    "expiryYear" integer NOT NULL,
    "holderName" text NOT NULL,
    "gatewayToken" text NOT NULL,
    "gatewayProvider" text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.customer_saved_cards OWNER TO abubakarmalik;

--
-- Name: customer_search_history; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.customer_search_history (
    id text NOT NULL,
    "customerId" text,
    query text NOT NULL,
    "resultCount" integer DEFAULT 0 NOT NULL,
    filters jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.customer_search_history OWNER TO abubakarmalik;

--
-- Name: customer_sessions; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.customer_sessions (
    id text NOT NULL,
    "customerId" text NOT NULL,
    "refreshTokenHash" text NOT NULL,
    "userAgent" text,
    "ipAddress" text,
    "deviceFingerprint" text,
    "deviceName" text,
    location text,
    "lastUsedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.customer_sessions OWNER TO abubakarmalik;

--
-- Name: customer_wallet_txns; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.customer_wallet_txns (
    id text NOT NULL,
    "customerId" text NOT NULL,
    type public."WalletTransactionType" NOT NULL,
    amount numeric(12,2) NOT NULL,
    "balanceAfter" numeric(12,2) NOT NULL,
    reason text NOT NULL,
    "referenceId" text,
    "referenceType" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.customer_wallet_txns OWNER TO abubakarmalik;

--
-- Name: group_buy_participants; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.group_buy_participants (
    id text NOT NULL,
    "groupBuyId" text NOT NULL,
    "customerId" text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    amount numeric(12,2) NOT NULL,
    "orderId" text,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.group_buy_participants OWNER TO abubakarmalik;

--
-- Name: group_buys; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.group_buys (
    id text NOT NULL,
    "shopId" text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "variantId" text,
    "productName" text NOT NULL,
    "imageUrl" text,
    "regularPrice" numeric(12,2) NOT NULL,
    "groupPrice" numeric(12,2) NOT NULL,
    "minParticipants" integer DEFAULT 5 NOT NULL,
    "maxParticipants" integer,
    "currentCount" integer DEFAULT 0 NOT NULL,
    status public."GroupBuyStatus" DEFAULT 'ACTIVE'::public."GroupBuyStatus" NOT NULL,
    "startsAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "reachedTargetAt" timestamp(3) without time zone,
    "cancelledReason" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.group_buys OWNER TO abubakarmalik;

--
-- Name: live_shop_messages; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.live_shop_messages (
    id text NOT NULL,
    "liveShopId" text NOT NULL,
    "senderType" text NOT NULL,
    "customerId" text,
    message text NOT NULL,
    "isPinned" boolean DEFAULT false NOT NULL,
    "isHidden" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.live_shop_messages OWNER TO abubakarmalik;

--
-- Name: live_shop_viewers; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.live_shop_viewers (
    id text NOT NULL,
    "liveShopId" text NOT NULL,
    "customerId" text NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "leftAt" timestamp(3) without time zone,
    "watchTimeSec" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.live_shop_viewers OWNER TO abubakarmalik;

--
-- Name: live_shops; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.live_shops (
    id text NOT NULL,
    "shopId" text NOT NULL,
    "tenantId" text NOT NULL,
    title text NOT NULL,
    description text,
    "coverImageUrl" text,
    "streamUrl" text,
    "streamKey" text,
    "recordingUrl" text,
    status public."LiveShopStatus" DEFAULT 'SCHEDULED'::public."LiveShopStatus" NOT NULL,
    "scheduledAt" timestamp(3) without time zone,
    "startedAt" timestamp(3) without time zone,
    "endedAt" timestamp(3) without time zone,
    "durationSeconds" integer,
    "peakViewerCount" integer DEFAULT 0 NOT NULL,
    "totalViewers" integer DEFAULT 0 NOT NULL,
    "totalMessages" integer DEFAULT 0 NOT NULL,
    "totalOrders" integer DEFAULT 0 NOT NULL,
    "totalRevenue" numeric(14,2) DEFAULT 0 NOT NULL,
    "featuredProductIds" text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.live_shops OWNER TO abubakarmalik;

--
-- Name: marketplace_cart_lines; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.marketplace_cart_lines (
    id text NOT NULL,
    "cartId" text NOT NULL,
    "shopId" text NOT NULL,
    "productId" text NOT NULL,
    "variantId" text,
    "productName" text NOT NULL,
    "variantName" text,
    "imageUrl" text,
    "unitPrice" numeric(12,2) NOT NULL,
    quantity integer NOT NULL,
    notes text,
    modifiers jsonb,
    "bargainId" text,
    "groupBuyId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.marketplace_cart_lines OWNER TO abubakarmalik;

--
-- Name: marketplace_carts; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.marketplace_carts (
    id text NOT NULL,
    "customerId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.marketplace_carts OWNER TO abubakarmalik;

--
-- Name: marketplace_customers; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.marketplace_customers (
    id text NOT NULL,
    phone text NOT NULL,
    "phoneVerified" boolean DEFAULT false NOT NULL,
    "phoneVerifiedAt" timestamp(3) without time zone,
    email text,
    "emailVerified" boolean DEFAULT false NOT NULL,
    "emailVerifiedAt" timestamp(3) without time zone,
    "passwordHash" text,
    "fullName" text NOT NULL,
    "displayName" text,
    "avatarUrl" text,
    "dateOfBirth" timestamp(3) without time zone,
    gender public."CustomerGender",
    "authProvider" public."MarketplaceAuthProvider" DEFAULT 'PHONE_OTP'::public."MarketplaceAuthProvider" NOT NULL,
    "googleId" text,
    "facebookId" text,
    "appleId" text,
    language text DEFAULT 'ur'::text NOT NULL,
    timezone text DEFAULT 'Asia/Karachi'::text NOT NULL,
    currency text DEFAULT 'PKR'::text NOT NULL,
    "loyaltyPoints" integer DEFAULT 0 NOT NULL,
    "walletBalance" numeric(12,2) DEFAULT 0 NOT NULL,
    "referralCode" text NOT NULL,
    "referredById" text,
    "defaultAddressId" text,
    "lastKnownLat" double precision,
    "lastKnownLng" double precision,
    "lastKnownCity" text,
    "marketingEmails" boolean DEFAULT true NOT NULL,
    "marketingSms" boolean DEFAULT true NOT NULL,
    "marketingPush" boolean DEFAULT true NOT NULL,
    "marketingWhatsapp" boolean DEFAULT true NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isBanned" boolean DEFAULT false NOT NULL,
    "banReason" text,
    "bannedAt" timestamp(3) without time zone,
    "passwordResetToken" text,
    "passwordResetExpires" timestamp(3) without time zone,
    "lastLoginAt" timestamp(3) without time zone,
    "lastActiveAt" timestamp(3) without time zone,
    "registeredIp" text,
    "deviceInfo" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.marketplace_customers OWNER TO abubakarmalik;

--
-- Name: marketplace_order_items; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.marketplace_order_items (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productId" text NOT NULL,
    "variantId" text,
    "productName" text NOT NULL,
    "variantName" text,
    "imageUrl" text,
    "unitPrice" numeric(12,2) NOT NULL,
    quantity integer NOT NULL,
    discount numeric(12,2) DEFAULT 0 NOT NULL,
    total numeric(12,2) NOT NULL,
    notes text,
    modifiers jsonb,
    "bargainId" text
);


ALTER TABLE public.marketplace_order_items OWNER TO abubakarmalik;

--
-- Name: marketplace_orders; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.marketplace_orders (
    id text NOT NULL,
    "orderNumber" text NOT NULL,
    "customerId" text NOT NULL,
    "shopId" text NOT NULL,
    "tenantId" text NOT NULL,
    status public."MarketplaceOrderStatus" DEFAULT 'PENDING'::public."MarketplaceOrderStatus" NOT NULL,
    "deliveryType" public."DeliveryType" DEFAULT 'HOME_DELIVERY'::public."DeliveryType" NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    discount numeric(12,2) DEFAULT 0 NOT NULL,
    "deliveryFee" numeric(12,2) DEFAULT 0 NOT NULL,
    "serviceFee" numeric(12,2) DEFAULT 0 NOT NULL,
    "taxAmount" numeric(12,2) DEFAULT 0 NOT NULL,
    "tipAmount" numeric(12,2) DEFAULT 0 NOT NULL,
    "walletUsed" numeric(12,2) DEFAULT 0 NOT NULL,
    "loyaltyPointsUsed" integer DEFAULT 0 NOT NULL,
    "loyaltyDiscount" numeric(12,2) DEFAULT 0 NOT NULL,
    total numeric(12,2) NOT NULL,
    currency text DEFAULT 'PKR'::text NOT NULL,
    "paymentMethod" public."MarketplacePaymentMethod" NOT NULL,
    "paymentStatus" public."MarketplacePaymentStatus" DEFAULT 'PENDING'::public."MarketplacePaymentStatus" NOT NULL,
    "paymentGatewayRef" text,
    "paidAt" timestamp(3) without time zone,
    "addressId" text,
    "addressSnapshot" jsonb,
    "deliverySlotStart" timestamp(3) without time zone,
    "deliverySlotEnd" timestamp(3) without time zone,
    "estimatedDeliveryAt" timestamp(3) without time zone,
    "actualDeliveryAt" timestamp(3) without time zone,
    "riderId" text,
    "riderName" text,
    "riderPhone" text,
    "couponCode" text,
    "couponDiscount" numeric(12,2) DEFAULT 0 NOT NULL,
    "customerNotes" text,
    "shopNotes" text,
    "cancelReason" text,
    "cancelledBy" text,
    "cancelledAt" timestamp(3) without time zone,
    "isRated" boolean DEFAULT false NOT NULL,
    "shopRating" integer,
    "riderRating" integer,
    source text DEFAULT 'APP'::text NOT NULL,
    "isGuestOrder" boolean DEFAULT false NOT NULL,
    "splitPaymentGroupId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.marketplace_orders OWNER TO abubakarmalik;

--
-- Name: marketplace_reviews; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.marketplace_reviews (
    id text NOT NULL,
    "customerId" text NOT NULL,
    "reviewType" public."ReviewType" NOT NULL,
    "orderId" text,
    "productId" text,
    "shopId" text,
    "riderId" text,
    rating integer NOT NULL,
    title text,
    comment text,
    "imageUrls" text[] DEFAULT ARRAY[]::text[],
    "videoUrl" text,
    "qualityRating" integer,
    "packagingRating" integer,
    "deliveryRating" integer,
    "valueRating" integer,
    "isVerifiedPurchase" boolean DEFAULT false NOT NULL,
    "isApproved" boolean DEFAULT true NOT NULL,
    "isHidden" boolean DEFAULT false NOT NULL,
    "hiddenReason" text,
    "moderatedBy" text,
    "moderatedAt" timestamp(3) without time zone,
    "helpfulCount" integer DEFAULT 0 NOT NULL,
    "unhelpfulCount" integer DEFAULT 0 NOT NULL,
    "replyFromShop" text,
    "replyAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.marketplace_reviews OWNER TO abubakarmalik;

--
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.order_status_history (
    id text NOT NULL,
    "orderId" text NOT NULL,
    status public."MarketplaceOrderStatus" NOT NULL,
    note text,
    "changedBy" text,
    "changedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.order_status_history OWNER TO abubakarmalik;

--
-- Name: product_marketplace_profiles; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.product_marketplace_profiles (
    id text NOT NULL,
    "productId" text NOT NULL,
    "shopId" text NOT NULL,
    "tenantId" text NOT NULL,
    "isListedOnMarketplace" boolean DEFAULT false NOT NULL,
    "listedAt" timestamp(3) without time zone,
    "publicName" text NOT NULL,
    "publicDescription" text,
    "publicPrice" numeric(12,2) NOT NULL,
    "compareAtPrice" numeric(12,2),
    "publicImages" text[] DEFAULT ARRAY[]::text[],
    "publicVideos" text[] DEFAULT ARRAY[]::text[],
    "marketplaceCategory" text,
    "marketplaceSubCategory" text,
    tags text[] DEFAULT ARRAY[]::text[],
    "isAvailable" boolean DEFAULT true NOT NULL,
    "availableFrom" timestamp(3) without time zone,
    "availableUntil" timestamp(3) without time zone,
    "totalSold" integer DEFAULT 0 NOT NULL,
    "ratingAverage" double precision DEFAULT 0 NOT NULL,
    "ratingCount" integer DEFAULT 0 NOT NULL,
    "viewCount" integer DEFAULT 0 NOT NULL,
    "wishlistCount" integer DEFAULT 0 NOT NULL,
    "bargainEnabled" boolean DEFAULT false NOT NULL,
    "bargainMinPrice" numeric(12,2),
    "groupBuyEnabled" boolean DEFAULT false NOT NULL,
    "auctionEnabled" boolean DEFAULT false NOT NULL,
    "metaTitle" text,
    "metaDescription" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.product_marketplace_profiles OWNER TO abubakarmalik;

--
-- Name: product_views; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.product_views (
    id text NOT NULL,
    "customerId" text,
    "productId" text NOT NULL,
    "shopId" text NOT NULL,
    "viewedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    source text
);


ALTER TABLE public.product_views OWNER TO abubakarmalik;

--
-- Name: review_votes; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.review_votes (
    id text NOT NULL,
    "reviewId" text NOT NULL,
    "customerId" text NOT NULL,
    "isHelpful" boolean NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.review_votes OWNER TO abubakarmalik;

--
-- Name: shop_marketplace_profiles; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.shop_marketplace_profiles (
    id text NOT NULL,
    "shopId" text NOT NULL,
    "tenantId" text NOT NULL,
    "publicName" text NOT NULL,
    slug text NOT NULL,
    tagline text,
    description text,
    "logoUrl" text,
    "coverUrl" text,
    "galleryUrls" text[] DEFAULT ARRAY[]::text[],
    "publicPhone" text,
    "publicEmail" text,
    "websiteUrl" text,
    "whatsappNumber" text,
    "addressLine1" text,
    "addressLine2" text,
    city text NOT NULL,
    area text,
    province text,
    lat double precision,
    lng double precision,
    industry text NOT NULL,
    "subCategories" text[] DEFAULT ARRAY[]::text[],
    "isListedOnMarketplace" boolean DEFAULT false NOT NULL,
    "listedAt" timestamp(3) without time zone,
    "isOpen" boolean DEFAULT true NOT NULL,
    "isPaused" boolean DEFAULT false NOT NULL,
    "pausedReason" text,
    "verificationLevel" public."ShopVerificationLevel" DEFAULT 'UNVERIFIED'::public."ShopVerificationLevel" NOT NULL,
    "verifiedAt" timestamp(3) without time zone,
    "verifiedBy" text,
    "cnicNumber" text,
    "businessRegNumber" text,
    "taxNumber" text,
    documents jsonb,
    "ratingAverage" double precision DEFAULT 0 NOT NULL,
    "ratingCount" integer DEFAULT 0 NOT NULL,
    "totalOrders" integer DEFAULT 0 NOT NULL,
    "completedOrders" integer DEFAULT 0 NOT NULL,
    "cancelledOrders" integer DEFAULT 0 NOT NULL,
    "totalRevenue" numeric(14,2) DEFAULT 0 NOT NULL,
    "followerCount" integer DEFAULT 0 NOT NULL,
    "avgResponseTimeMinutes" integer,
    "avgPreparationMinutes" integer,
    "offersDelivery" boolean DEFAULT true NOT NULL,
    "offersPickup" boolean DEFAULT true NOT NULL,
    "offersDineIn" boolean DEFAULT false NOT NULL,
    "deliveryRadiusKm" double precision DEFAULT 5 NOT NULL,
    "deliveryFee" numeric(10,2) DEFAULT 0 NOT NULL,
    "freeDeliveryAbove" numeric(10,2),
    "minOrderAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    "maxOrderAmount" numeric(10,2),
    "estimatedDeliveryMinutes" integer DEFAULT 30,
    "estimatedPickupMinutes" integer DEFAULT 15,
    "acceptsCod" boolean DEFAULT true NOT NULL,
    "acceptsCard" boolean DEFAULT false NOT NULL,
    "acceptsJazzcash" boolean DEFAULT false NOT NULL,
    "acceptsEasypaisa" boolean DEFAULT false NOT NULL,
    "acceptsRaast" boolean DEFAULT false NOT NULL,
    "acceptsWallet" boolean DEFAULT true NOT NULL,
    "bargainEnabled" boolean DEFAULT false NOT NULL,
    "bargainMinPercent" integer DEFAULT 80,
    "groupBuyEnabled" boolean DEFAULT false NOT NULL,
    "auctionEnabled" boolean DEFAULT false NOT NULL,
    "liveShopEnabled" boolean DEFAULT false NOT NULL,
    "workingHours" jsonb,
    "holidayDates" timestamp(3) without time zone[] DEFAULT (ARRAY[]::timestamp without time zone[])::timestamp(3) without time zone[],
    "prayerTimeMode" boolean DEFAULT false NOT NULL,
    "ramzanScheduleActive" boolean DEFAULT false NOT NULL,
    "metaTitle" text,
    "metaDescription" text,
    keywords text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.shop_marketplace_profiles OWNER TO abubakarmalik;

--
-- Name: support_messages; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.support_messages (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    "senderType" text NOT NULL,
    "senderId" text,
    "customerId" text,
    message text NOT NULL,
    attachments text[] DEFAULT ARRAY[]::text[],
    "isInternal" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.support_messages OWNER TO abubakarmalik;

--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.support_tickets (
    id text NOT NULL,
    "ticketNumber" text NOT NULL,
    "customerId" text NOT NULL,
    "orderId" text,
    "shopId" text,
    subject text NOT NULL,
    category text NOT NULL,
    priority public."SupportTicketPriority" DEFAULT 'MEDIUM'::public."SupportTicketPriority" NOT NULL,
    status public."SupportTicketStatus" DEFAULT 'OPEN'::public."SupportTicketStatus" NOT NULL,
    "assignedTo" text,
    "resolvedAt" timestamp(3) without time zone,
    "closedAt" timestamp(3) without time zone,
    rating integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.support_tickets OWNER TO abubakarmalik;

--
-- Name: wishlist_items; Type: TABLE; Schema: public; Owner: abubakarmalik
--

CREATE TABLE public.wishlist_items (
    id text NOT NULL,
    "customerId" text NOT NULL,
    "productId" text NOT NULL,
    "shopId" text NOT NULL,
    "addedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text
);


ALTER TABLE public.wishlist_items OWNER TO abubakarmalik;

--
-- Data for Name: ActivityLog; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ActivityLog" (id, "tenantId", "userId", action, "entityType", "entityId", description, metadata, "ipAddress", "userAgent", "createdAt") FROM stdin;
\.


--
-- Data for Name: AdminNotification; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."AdminNotification" (id, type, priority, title, message, link, metadata, "isRead", "readAt", "readById", "tenantId", "entityType", "entityId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AgriBulkOrder; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."AgriBulkOrder" (id, "tenantId", "shopId", "orderNumber", "farmerId", "customerId", "customerName", "customerPhone", "orderDate", "deliveryDate", status, season, "cropTarget", "landAreaAcres", "isDelivery", "deliveryAddress", "deliveryCharges", "transportType", "vehicleNumber", subtotal, "bulkDiscount", "taxAmount", "otherCharges", total, "paidAmount", "paymentStatus", "paymentMethod", "isCredit", "creditDueDate", "advisorNotes", "farmerNotes", "cancellationReason", "createdById", "deliveredBy", "cancelledAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AgriBulkOrderItem; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."AgriBulkOrderItem" (id, "orderId", "productId", "productName", category, quantity, unit, "pricePerUnit", discount, total, "batchNumber", "expiryDate", "displayOrder", "createdAt") FROM stdin;
\.


--
-- Data for Name: AgriCropAdvisory; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."AgriCropAdvisory" (id, "tenantId", "advisoryNumber", "farmerId", "advisorId", "advisorName", "cropName", "cropVariety", season, "landAreaAcres", stage, "sowingDate", "expectedHarvest", "currentIssues", "soilTestResult", "waterTestResult", recommendations, "productSuggestions", "followUpDate", completed, notes, "attachmentUrls", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AgriFarmer; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."AgriFarmer" (id, "tenantId", "customerId", "farmerNumber", "fullName", "fatherName", cnic, phone, "altPhone", village, tehsil, district, province, address, landmark, "landAreaAcres", "landAreaKanals", "landOwnership", "soilType", "waterSource", "irrigationType", "farmingType", "primaryCrops", livestock, "cnicFrontUrl", "cnicBackUrl", "landDocUrl", "photoUrl", "creditLimit", "currentBalance", "creditDays", "interestRate", "currentSeason", "currentCrop", "totalOrders", "totalPurchases", "totalOutstanding", "totalPaid", "lastPurchaseAt", status, "registeredAt", "suspendedAt", "suspensionReason", notes, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AgriFarmerLedger; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."AgriFarmerLedger" (id, "tenantId", "farmerId", "entryNumber", "entryDate", "entryType", description, reference, debit, credit, balance, "saleId", "paymentId", "createdById", "createdAt") FROM stdin;
\.


--
-- Data for Name: AgriProductProfile; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."AgriProductProfile" (id, "tenantId", "productId", category, "subCategory", "seedType", "fertilizerType", "feedType", brand, manufacturer, "countryOfOrigin", "npkRatio", "activeIngredient", ingredients, concentration, "packSize", "packUnit", "bagsPerTon", "applicationRate", "applicationMethod", "applicationInterval", "targetCrops", "targetPests", "targetAnimals", season, "suitableFor", "cropStage", "toxicityLevel", "ppePeriod", "reEntryPeriod", "warningLabel", "hazardClass", "isOrganic", "organicCertNumber", "govtRegNumber", "govtRegExpiry", "shelfLifeMonths", "storageTemp", "storageInstructions", "reorderLevel", "minStockAlert", "bulkDiscountThreshold", "bulkDiscountPct", "imageUrls", "descriptionLong", "usageInstructions", precautions, "firstAid", "msdsUrl", "brochureUrl", "videoUrl", "isPopular", "isFeatured", "isBestSeller", "isSeasonal", "isRestricted", "requiresLicense", "totalSold", "totalRevenue", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AgriSeasonalPlan; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."AgriSeasonalPlan" (id, "tenantId", season, year, "cropName", "sowingStart", "sowingEnd", "harvestStart", "harvestEnd", "recommendedProducts", "applicationSchedule", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AgriSubsidyClaim; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."AgriSubsidyClaim" (id, "tenantId", "farmerId", "claimNumber", "schemeName", "govtScheme", "productType", quantity, "originalPrice", "subsidyAmount", "finalPrice", "farmerCnic", "cropTarget", "landAreaAcres", "documentsSubmitted", "approvedBy", "approvalDate", "disbursementDate", status, "rejectionReason", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ArtSupplyProfile; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ArtSupplyProfile" (id, "tenantId", "productId", category, "subCategory", brand, color, "colorCode", size, grade, weight, volume, dimensions, "suitableFor", "isProfessional", "isBeginner", "reorderLevel", "totalSold", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Attendance; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Attendance" (id, "tenantId", "staffId", date, "checkIn", "checkOut", "checkInPhotoUrl", "checkOutPhotoUrl", "checkInLocation", "checkOutLocation", status, "workedHours", "overtimeHours", "isLate", "lateMinutes", notes, "markedById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Author; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Author" (id, "tenantId", name, "penName", nationality, "bornYear", "diedYear", bio, "photoUrl", genres, languages, "totalBooks", "totalSales", "isFeatured", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AutoPartProfile; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."AutoPartProfile" (id, "tenantId", "productId", "partNumber", "oemNumber", "alternateNumbers", category, "subCategory", condition, brand, "countryOfOrigin", manufacturer, "weightGrams", dimensions, color, material, "warrantyMonths", "warrantyKm", "warrantyNotes", "installationMinutes", "requiresSpecialTool", "installationDifficulty", compatibility, "minStockAlert", "isFastMoving", "isCritical", "totalSold", "totalInstalled", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: BakeryBulkOrder; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."BakeryBulkOrder" (id, "tenantId", "orderNumber", "customerId", "organizationName", "contactPerson", "contactPhone", "contactEmail", "orderType", "eventDate", "eventTime", venue, "totalGuests", "totalItems", items, "quotedPrice", "finalPrice", "advancePaid", "paidAmount", "paymentStatus", status, "requiresDelivery", "deliveryAddress", "requiresSetup", "setupTime", "specialInstructions", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: BakeryCakeOrder; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."BakeryCakeOrder" (id, "tenantId", "shopId", "orderNumber", "customerId", "customerName", "customerPhone", "customerEmail", "productId", "productName", category, size, "customWeightKg", shape, "customShapeDesc", flavor, "customFlavorDesc", "creamType", "numberOrLetter", "numberOfTiers", "tierDetails", "messageOnCake", "messageColor", "hasPhotoOnCake", "photoUrl", "hasEdibleImage", "designReferenceUrls", "designInstructions", "colorTheme", "primaryColor", "secondaryColor", "decorativeItems", "candlesRequired", "candleType", "cakeStand", "cakeKnife", occasion, "celebrantName", "celebrantAge", "eventDate", "eventTime", "eventVenue", "isEggless", "isSugarFree", "isVegan", allergies, "dietaryNotes", "deliveryType", "neededBy", "deliveryDate", "deliveryTime", "deliveryAddress", "deliveryLandmark", "deliveryCharges", "deliveryPersonId", status, "productionStatus", "assignedBakerId", "assignedDecoratorId", "basePrice", "customizationCharges", "photoCakeCharges", "taxAmount", discount, "advanceRequired", "advancePaid", total, "paidAmount", "paymentStatus", "confirmedAt", "startedAt", "completedAt", "deliveredAt", "cancelledAt", "cancellationReason", "customerRating", "customerFeedback", "finalPhotoUrls", "specialInstructions", "internalNotes", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: BakeryFreshnessLog; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."BakeryFreshnessLog" (id, "tenantId", "shopId", "productId", "productName", "batchNumber", "productionDate", "bestBefore", "expiryDate", "initialQty", "currentQty", "soldQty", "wastedQty", "discountedQty", status, "discardedAt", "discardReason", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: BakeryIngredient; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."BakeryIngredient" (id, "tenantId", name, category, code, brand, unit, "currentStock", "minStock", "maxStock", "reorderLevel", "costPerUnit", "lastPurchaseDate", "lastPurchasePrice", "lastVendorName", "shelfLifeDays", "storageMethod", "requiresRefrigeration", "isCritical", "isOrganic", "isImported", "countryOfOrigin", "supplierName", "supplierPhone", "totalPurchased", "totalConsumed", "totalWasted", "isActive", "imageUrl", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: BakeryIngredientTransaction; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."BakeryIngredientTransaction" (id, "tenantId", "ingredientId", "transactionType", quantity, unit, "costPerUnit", "totalCost", "productionItemId", "cakeOrderId", "batchNumber", reason, notes, "performedById", "createdAt") FROM stdin;
\.


--
-- Data for Name: BakeryProductProfile; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."BakeryProductProfile" (id, "tenantId", "productId", category, "defaultSize", "defaultShape", "defaultFlavor", "defaultCreamType", "pricePerKg", "pricePerPiece", "pricePerDozen", "pricePerSlice", "pricePerBox", "pricePerTray", "weightGrams", "servingSize", "numberOfSlices", "isCustomizable", "isCakeCustomizable", "allowsMessageOnCake", "allowsPhotoOnCake", "allowsCustomShape", "allowsFlavorChoice", "allowsSizeChoice", "prepTimeHours", "advanceOrderHours", "minOrderQty", "maxOrderQty", "shelfLifeHours", "shelfLifeDays", "requiresRefrigeration", "storageTempMin", "storageTempMax", "bestConsumedWithin", ingredients, allergens, "containsEgg", "containsNuts", "containsGluten", "containsDairy", "isEggless", "isVegan", "isSugarFree", "isHalal", "dietaryBadges", "nutritionInfo", "caloriesPerServing", "imageUrls", "variationImages", "descriptionLong", "ingredientList", "servingSuggestions", "isPopular", "isFeatured", "isBestSeller", "isNewArrival", "isSeasonalItem", "seasonName", "totalOrders", "totalRevenue", "avgRating", "createdAt", "updatedAt", "pricePerPound") FROM stdin;
\.


--
-- Data for Name: BakeryProductionItem; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."BakeryProductionItem" (id, "planId", "productId", "productName", category, "cakeOrderId", "plannedQty", "producedQty", "failedQty", "bakerId", "bakerName", status, "batchNumber", "ovenNumber", "bakingStartTime", "bakingEndTime", "bakingTempC", "bakingDurationMin", "qualityGrade", "qualityCheckBy", "qualityNotes", "ingredientsUsed", "totalCost", notes, "displayOrder", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: BakeryProductionPlan; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."BakeryProductionPlan" (id, "tenantId", "shopId", "planNumber", "planDate", shift, "headBakerId", status, "startedAt", "completedAt", "totalItems", "completedItems", "failedItems", "totalCost", notes, "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: BarcodeLabelBatch; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."BarcodeLabelBatch" (id, "tenantId", "userId", name, layout, "paperSize", "includePrice", "includeName", "includeShop", "includeMrp", "fontFamily", items, "totalLabels", "printedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: BookAuthor; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."BookAuthor" (id, "bookId", "authorId", role, "displayOrder", "createdAt") FROM stdin;
\.


--
-- Data for Name: BookProfile; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."BookProfile" (id, "tenantId", "productId", isbn10, isbn13, "publisherBookCode", barcode, title, subtitle, "originalTitle", category, "subCategory", binding, condition, "publisherId", edition, "editionNumber", "publishYear", "reprintYear", language, "pageCount", "weightGrams", dimensions, "paperQuality", description, "tableOfContents", synopsis, "isTextbook", grade, "classLevel", subject, board, curriculum, mrp, "discountPct", "reorderLevel", "isBestSeller", "isNewArrival", "isFeatured", "isAwardWinner", "awardName", "avgRating", "totalReviews", "totalSold", "totalRented", "isRentable", "rentalPricePerWeek", "rentalDeposit", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: BookRental; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."BookRental" (id, "tenantId", "shopId", "rentalNumber", "customerId", "productId", "variantId", "customerName", "customerPhone", "customerCnic", quantity, "rentalPrice", "depositAmount", "issuedAt", "dueDate", "returnedAt", "actualReturnDate", status, "fineAmount", "finePerDay", "conditionOnIssue", "conditionOnReturn", "damageNotes", notes, "issuedById", "returnedToId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Booking; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Booking" (id, "tenantId", "shopId", "customerId", "createdById", "bookingNumber", status, subtotal, discount, "serviceCharges", "serviceChargesBreakdown", total, "totalPaid", "totalRefunded", "balanceDue", "expectedPickupAt", "expiresAt", "convertedAt", "cancelledAt", "cancelReason", "paymentMethod", notes, "internalNotes", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: BookingItem; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."BookingItem" (id, "bookingId", "productId", "variantId", "imeiId", "rollId", "cutPieceId", quantity, price, "costPrice", "lineDiscount", total, "useWholesale", "cutWidthFt", "cutLengthFt", "cutLengthInch", "cutSqft", note, "internalNote", "createdAt") FROM stdin;
\.


--
-- Data for Name: BookingPayment; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."BookingPayment" (id, "bookingId", type, amount, "paymentMethod", reference, notes, "createdById", "paidAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Brand; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Brand" (id, "tenantId", name, slug, description, "logoUrl", website, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: BroadcastNotification; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."BroadcastNotification" (id, "authorId", title, message, link, "targetType", "targetTenantIds", "recipientCount", "sentAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: BulkImportJob; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."BulkImportJob" (id, "tenantId", "userId", "jobType", "fileName", "fileUrl", "fileSize", "totalRows", "processedRows", "successCount", "errorCount", "skipCount", errors, status, "startedAt", "completedAt", duration, metadata, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: CarpetCutPiece; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."CarpetCutPiece" (id, "tenantId", "shopId", "productId", "variantId", "sourceRollId", "sourceType", "pieceCode", "widthFt", "widthInch", "lengthFt", "lengthInch", "totalSqft", "costAmount", "salePrice", "pricePerSqft", status, condition, "rackNumber", notes, "saleItemId", "soldAt", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: CarpetRoll; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."CarpetRoll" (id, "tenantId", "shopId", "productId", "variantId", "rollNumber", "designCode", "widthFt", "widthInch", "originalLengthFt", "remainingLengthFt", "originalSqft", "remainingSqft", "costPerSqft", "salePricePerSqft", "wholesalePricePerSqft", status, "sourceType", "purchaseId", "purchaseItemId", "supplierId", "rackNumber", notes, quality, pile, "receivedAt", "finishedAt", "createdById", "createdAt", "updatedAt", "originalLengthInch", "remainingLengthInch") FROM stdin;
\.


--
-- Data for Name: CarpetRollMovement; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."CarpetRollMovement" (id, "rollId", "tenantId", type, "lengthFt", sqft, "balanceLengthAfter", "balanceSqftAfter", reference, "saleId", "saleItemId", note, "createdById", "createdAt") FROM stdin;
\.


--
-- Data for Name: CashRegister; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."CashRegister" (id, "tenantId", "shopId", "openedById", "closedById", "registerNumber", status, "openingBalance", "expectedBalance", "closingBalance", difference, "totalSales", "totalCashIn", "totalCashOut", "totalExpenses", notes, "openedAt", "closedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: CashTransaction; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."CashTransaction" (id, "tenantId", "cashRegisterId", "createdById", type, amount, reason, note, reference, "createdAt") FROM stdin;
\.


--
-- Data for Name: Category; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Category" (id, "tenantId", name, color, icon, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClinicAntenatalVisit; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ClinicAntenatalVisit" (id, "tenantId", "patientId", "appointmentId", "visitNumber", "gestationWeeks", "gestationDays", "weightKg", "bpSystolic", "bpDiastolic", "fundalHeightCm", "fetalHeartRate", "fetalPosition", "fetalMovements", "urineProtein", "urineSugar", edema, "ultrasoundNotes", "ultrasoundUrls", advice, "nextVisitDate", "visitDate", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClinicAppointment; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ClinicAppointment" (id, "tenantId", "shopId", "appointmentNumber", "tokenNumber", "patientId", "doctorId", status, "visitType", "isTelemedicine", "isHomeVisit", "isEmergency", "scheduledStart", "scheduledEnd", "arrivedAt", "consultationStart", "consultationEnd", "cancelledAt", "cancellationReason", "chiefComplaint", "reasonForVisit", "patientNotes", "consultationFee", "otherCharges", discount, "taxAmount", total, "paidAmount", "paymentStatus", "reminderSent", "smsReminderSent", "patientRating", "patientFeedback", "videoRoomId", "videoRoomUrl", "internalNotes", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClinicDentalRecord; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ClinicDentalRecord" (id, "tenantId", "patientId", "doctorId", "appointmentId", "toothNumber", "toothSystem", surface, condition, treatment, "procedureCode", color, notes, "imageUrls", "performedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClinicDoctorProfile; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ClinicDoctorProfile" (id, "tenantId", "staffId", title, "fullName", qualifications, specialties, "subSpecialty", "yearsOfExperience", bio, "photoUrl", "signatureUrl", "pmcNumber", "licenseNumber", "licenseExpiry", "registeredWith", "consultationFee", "followUpFee", "followUpDays", "telemedicineFee", "homeVisitFee", "emergencyFee", "slotDurationMin", "bufferMin", "maxDailyPatients", "workingDays", "workStartTime", "workEndTime", "breakStartTime", "breakEndTime", "commissionPct", "commissionType", languages, services, "proceduresOffered", "acceptsTelemedicine", "acceptsHomeVisit", "acceptsEmergency", "totalPatients", "totalAppointments", "totalRevenue", "avgRating", "totalReviews", "isActive", "isFeatured", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClinicEncounter; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ClinicEncounter" (id, "tenantId", "appointmentId", "patientId", "doctorId", subjective, objective, assessment, plan, "historyOfIllness", "reviewOfSystems", "physicalExamination", "provisionalDiagnosis", "finalDiagnosis", "icd10Codes", "differentialDiagnosis", advice, "dietaryAdvice", "activityAdvice", "warningSigns", "followUpAdvice", "followUpDate", "referredTo", "referralNotes", "attachmentUrls", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClinicLabOrder; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ClinicLabOrder" (id, "tenantId", "encounterId", "patientId", "doctorId", "orderNumber", status, "labName", urgency, "orderedAt", "sampleCollectedAt", "reportedAt", "totalCost", "paidAmount", "paymentStatus", notes, "reportUrls", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClinicLabTest; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ClinicLabTest" (id, "orderId", "testName", "testCode", category, price, result, "referenceRange", unit, "isAbnormal", "isCritical", "performedBy", "reportedAt", "reportUrl", "createdAt") FROM stdin;
\.


--
-- Data for Name: ClinicPatientProfile; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ClinicPatientProfile" (id, "tenantId", "customerId", mrn, "fullName", "fatherOrHusbandName", cnic, "dateOfBirth", gender, "bloodGroup", "maritalStatus", occupation, religion, nationality, "photoUrl", "phonePrimary", "phoneAlternate", email, address, city, "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", "heightCm", "weightKg", bmi, "waistCm", allergies, "chronicConditions", "currentMedications", "pastSurgeries", "familyHistory", "smokingStatus", "alcoholStatus", "isPregnant", "gravidaPara", "lmpDate", edd, "menstrualCycle", "pediatricianId", "vaccinationStatus", "motherName", "birthWeight", "birthType", "hasInsurance", "insuranceProvider", "insuranceNumber", "insuranceExpiry", "cardUrl", "preferredDoctorId", "preferredLanguage", "registeredAt", "lastVisitAt", "totalVisits", "totalSpent", "outstandingBalance", notes, "photoUrls", "documentUrls", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClinicPhysioSession; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ClinicPhysioSession" (id, "tenantId", "patientId", "therapistId", "appointmentId", "sessionNumber", "totalSessionsPrescribed", diagnosis, "chiefComplaint", "painScore", "romNotes", "exercisesPerformed", "modalitiesUsed", "durationMin", "progressNotes", "homeExercises", "nextSessionDate", "sessionDate", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClinicPrescription; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ClinicPrescription" (id, "tenantId", "encounterId", "patientId", "doctorId", "prescriptionNumber", status, "issuedAt", "validUntil", "isDigital", "pdfUrl", "generalInstructions", "totalItems", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClinicPrescriptionItem; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ClinicPrescriptionItem" (id, "prescriptionId", "drugId", "drugName", strength, form, dose, frequency, route, "durationDays", quantity, "beforeMeal", "afterMeal", "atBedtime", "emptyStomach", instructions, "displayOrder", "createdAt") FROM stdin;
\.


--
-- Data for Name: ClinicReferral; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ClinicReferral" (id, "tenantId", "patientId", "referringDoctorId", "encounterId", "referralNumber", "referredTo", "referredToSpecialty", reason, urgency, "clinicalSummary", status, "respondedAt", "responseNotes", "attachmentUrls", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClinicRoom; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ClinicRoom" (id, "tenantId", "shopId", "roomNumber", "roomName", "roomType", capacity, equipment, "isOccupied", "currentPatientId", "isActive", "displayOrder", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClinicService; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ClinicService" (id, "tenantId", name, code, category, description, price, "durationMin", "requiresDoctor", "requiresRoom", "requiresPrep", "prepInstructions", "isActive", "totalBookings", "totalRevenue", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClinicVaccination; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ClinicVaccination" (id, "tenantId", "patientId", "vaccineName", "vaccineCode", "scheduleName", "doseNumber", "dueDate", "administeredAt", "administeredBy", "batchNumber", manufacturer, "expiryDate", "siteAdministered", "routeAdministered", status, "adverseReactions", notes, "reminderSent", "reminderSentAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClinicVitals; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ClinicVitals" (id, "appointmentId", "patientId", "bpSystolic", "bpDiastolic", "pulseRate", "respiratoryRate", "temperatureC", "temperatureF", spo2, "bloodSugar", "bloodSugarType", "heightCm", "weightKg", bmi, "headCircumferenceCm", "waistCm", "painScore", "glasgowScore", "recordedAt", "recordedById", notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: ControlledSubstanceLog; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ControlledSubstanceLog" (id, "tenantId", "productId", "batchId", "saleId", "prescriptionId", "logNumber", "logDate", "logType", quantity, unit, "openingBalance", "closingBalance", "patientName", "patientCnic", "patientPhone", "patientAddress", "doctorName", "doctorRegNumber", "prescriptionNumber", "dispensedBy", "supervisedBy", notes, "attachmentUrls", "isReversed", "reversalReason", "createdAt") FROM stdin;
\.


--
-- Data for Name: CreditTransaction; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."CreditTransaction" (id, "tenantId", type, amount, "balanceAfter", reference, note, "createdAt") FROM stdin;
\.


--
-- Data for Name: Customer; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Customer" (id, "tenantId", name, phone, email, address, notes, "isActive", "createdAt", "updatedAt", balance, "creditLimit", "loyaltyPoints", "totalSpent", area, "avatarUrl", city, cnic, "dateOfBirth", gender, "isVip") FROM stdin;
\.


--
-- Data for Name: CustomerLedger; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."CustomerLedger" (id, "tenantId", "customerId", "createdById", type, amount, "balanceAfter", reference, note, "createdAt") FROM stdin;
\.


--
-- Data for Name: CustomerReadingList; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."CustomerReadingList" (id, "tenantId", "customerId", name, description, "isPublic", "isDefault", "totalItems", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: CustomerReadingListItem; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."CustomerReadingListItem" (id, "listId", "productId", notes, priority, "isRead", "readAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: CustomerVehicle; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."CustomerVehicle" (id, "tenantId", "customerId", "registrationNumber", "chassisNumber", "engineNumber", "makeId", "modelId", "makeName", "modelName", "vehicleType", year, color, "fuelType", transmission, "engineCC", "odometerKm", "ownerName", "ownerPhone", "ownerCnic", "insuranceProvider", "insurancePolicyNumber", "insuranceExpiry", "tokenTaxExpiry", "fitnessExpiry", "documentUrls", "photoUrls", "preferredMechanicId", notes, "totalServices", "totalSpent", "lastServiceAt", "lastOdometerKm", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DairyCustomer; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."DairyCustomer" (id, "tenantId", "customerId", "routeId", "customerNumber", name, phone, cnic, address, city, area, landmark, latitude, longitude, "deliveryFrequency", "morningQuantity", "eveningQuantity", "productPreference", "containerType", "customRate", "billingCycle", "currentBalance", "totalPurchases", "totalPayments", "advancePayment", "totalDeliveries", "missedDeliveries", "lastDeliveryDate", "lastPaymentDate", status, "startDate", "pausedFrom", "pausedTo", notes, "photoUrl", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DairyDelivery; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."DairyDelivery" (id, "tenantId", "dairyCustomerId", "routeId", "deliveryDate", slot, "scheduledQty", "deliveredQty", "returnedQty", unit, status, "skipReason", "ratePerLiter", "totalAmount", "isPaid", "paidAmount", "deliveredByStaffId", "containerReturned", "deliveredAt", notes, "customerSignature", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DairyFarmer; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."DairyFarmer" (id, "tenantId", "farmerNumber", name, "fatherName", cnic, phone, address, village, city, "cattleCount", "buffaloCount", "cowCount", "goatCount", "totalCapacityLiters", "ratePerLiter", "fatBonusRate", "paymentCycle", "currentBalance", "totalSupplied", "totalPaid", "avgFatContent", "avgSnfContent", "qualityRating", "lastSupplyDate", "lastPaymentDate", "photoUrl", "cnicFrontUrl", "cnicBackUrl", notes, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DairyFarmerSupply; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."DairyFarmerSupply" (id, "tenantId", "farmerId", "supplyDate", slot, quantity, unit, "fatContent", "snfContent", quality, "ratePerLiter", "fatBonus", "otherAdjustment", "totalAmount", "isPaid", "paidAt", "receivedByStaffId", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DairyMonthlyBill; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."DairyMonthlyBill" (id, "tenantId", "dairyCustomerId", "billNumber", month, year, "cycleStartDate", "cycleEndDate", "totalLiters", "totalDeliveries", "totalAmount", discount, "paidAmount", "remainingAmount", "openingBalance", "closingBalance", "isPaid", "paidAt", "paymentMethod", "paymentReference", "isPrinted", "sentToCustomer", "sentAt", notes, "handledById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DairyProduct; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."DairyProduct" (id, "tenantId", "productId", "productType", unit, "fatContent", "snfContent", "proteinContent", "waterAdded", quality, "isPasteurized", "isHomogenized", "isRaw", "isOrganic", "isFresh", "productionDate", "bestBeforeHours", "shelfLifeHours", "requiresRefrigeration", "storageTempMin", "storageTempMax", "farmSource", "cattleType", "morningPrice", "eveningPrice", "bulkPrice", "minBulkQty", "wholesalePrice", "retailPrice", "homeDeliveryPrice", "availableMorning", "availableEvening", "homeDeliveryAvailable", "isFeatured", "isBestSeller", "displayOrder", "totalSold", "totalRevenue", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DairyQualityTest; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."DairyQualityTest" (id, "tenantId", "testNumber", "testedAt", "sourceType", "sourceId", "sourceName", "fatContent", "snfContent", "proteinContent", "lactoseContent", "waterContent", "phLevel", temperature, "adulterationDetected", "adulterationTypes", quality, passed, "actionTaken", "testedByStaffId", "testMethod", notes, "imageUrls", "createdAt") FROM stdin;
\.


--
-- Data for Name: DairyRoute; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."DairyRoute" (id, "tenantId", "shopId", "routeNumber", name, description, "assignedStaffId", "vehicleType", "vehicleNumber", slot, status, "totalCustomers", "totalDailyLiters", "startTime", "estimatedDurationMin", "areaName", color, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DamageLog; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."DamageLog" (id, "tenantId", "shopId", "productId", "variantId", "batchId", "unitId", "reportedById", "approvedById", "damageNumber", quantity, "unitCost", "costImpact", "salvageValue", "netLoss", reason, "reasonCode", photos, notes, "supplierClaim", "claimStatus", "claimAmount", status, "approvedAt", "rejectedAt", "rejectionReason", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DeliveryTracking; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."DeliveryTracking" (id, "orderId", "riderId", status, "assignedAt", "pickedUpAt", "onTheWayAt", "arrivedAt", "deliveredAt", "pickupLat", "pickupLng", "dropoffLat", "dropoffLng", "distanceKm", "estimatedMinutes", "actualMinutes", "deliveryFee", "riderCommission", "customerTip", "customerRating", "customerFeedback", "proofPhotoUrl", "signatureUrl", "failureReason", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DiscountCode; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."DiscountCode" (id, "tenantId", "createdById", code, description, type, value, "minPurchase", "maxDiscount", "usageLimit", "usageCount", "validFrom", "validUntil", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Doctor; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Doctor" (id, "tenantId", name, phone, email, cnic, "registrationNumber", qualification, specialization, "yearsOfExperience", "clinicName", "clinicAddress", "hospitalAffiliation", "consultationFee", "commissionType", "commissionValue", "totalPrescriptions", "totalBusiness", "totalCommission", notes, "isActive", "isVerified", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DrugInteraction; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."DrugInteraction" (id, "tenantId", "saltAId", "saltBId", severity, description, "clinicalEffect", management, "isActive", "createdAt") FROM stdin;
\.


--
-- Data for Name: EmailLog; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."EmailLog" (id, "tenantId", "templateSlug", "toEmail", "toName", subject, "bodyHtml", "bodyText", variables, status, "providerId", "errorMessage", "retryCount", "sentAt", "deliveredAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: EmailTemplate; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."EmailTemplate" (id, slug, name, subject, "bodyHtml", "bodyText", variables, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: EmiInstallment; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."EmiInstallment" (id, "planId", "installmentNumber", amount, "dueDate", "paidDate", "paidAmount", status, notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: EmiPlan; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."EmiPlan" (id, "tenantId", "saleId", "customerId", "customerName", "customerPhone", "planNumber", "totalAmount", "downPayment", "financedAmount", "installmentCount", "installmentAmount", "startDate", "paidAmount", "remainingAmount", status, notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Expense; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Expense" (id, "tenantId", "categoryId", "createdById", "expenseNumber", title, description, amount, "paymentMethod", status, "expenseDate", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ExpenseCategory; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ExpenseCategory" (id, "tenantId", name, color, icon, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GarmentAlterationTicket; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GarmentAlterationTicket" (id, "tenantId", "shopId", "ticketNumber", "customerId", "saleId", "productId", "variantId", "customerName", "customerPhone", "garmentDescription", "alterationType", "alterationDetails", status, priority, "receivedAt", "promisedDate", "readyAt", "deliveredAt", "tailorId", charges, "paidAmount", "paymentStatus", "beforeImageUrls", "afterImageUrls", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GarmentCollection; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GarmentCollection" (id, "tenantId", "shopId", name, code, description, season, year, "launchDate", "endDate", "coverImageUrl", "bannerImageUrl", "colorTheme", "isFeatured", "isActive", "displayOrder", "totalProducts", "totalSales", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GarmentLayawayInstallment; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GarmentLayawayInstallment" (id, "planId", "installmentNo", "dueDate", amount, "paidAmount", status, "paidAt", "paymentMethod", reference, notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GarmentLayawayPlan; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GarmentLayawayPlan" (id, "tenantId", "shopId", "planNumber", "customerId", "customerName", "customerPhone", "productId", "variantId", "tailoringOrderId", "totalAmount", "depositAmount", "paidAmount", "remainingAmount", "installmentCount", "installmentAmount", frequency, "startDate", "nextDueDate", "finalDueDate", status, "completedAt", "cancelledAt", "cancellationReason", notes, "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GarmentMeasurementProfile; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GarmentMeasurementProfile" (id, "tenantId", "customerId", "profileName", gender, unit, neck, shoulder, chest, bust, waist, hip, armhole, bicep, wrist, "sleeveLength", "shirtLength", "trouserLength", inseam, thigh, knee, bottom, "kurtaLength", "shalwarLength", "shalwarBottom", daman, "postureNotes", "fittingNotes", "imageUrls", "measuredById", "measuredAt", "isDefault", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GarmentProductProfile; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GarmentProductProfile" (id, "tenantId", "productId", "collectionId", "sizeChartId", gender, "categoryType", season, "fabricType", "fabricBlend", "workType", "fitType", neckline, "sleeveType", "sleeveLength", pattern, "careInstructions", "countryOfOrigin", manufacturer, designer, "modelHeight", "modelWearingSize", "styleCode", "lookBookUrl", "videoUrl", "isReadyMade", "isStitchable", "isFabricOnly", "allowAlteration", "allowReservation", "allowLayaway", "minAlterationDays", "defaultStitchingDays", "isNewArrival", "isFeatured", "isBestSeller", "isOnSale", "totalSold", "totalReturns", "totalAlterations", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GarmentReservation; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GarmentReservation" (id, "tenantId", "shopId", "reservationNumber", "customerId", "productId", "variantId", "customerName", "customerPhone", quantity, "unitPrice", "depositAmount", status, "reservedAt", "expiresAt", "convertedSaleId", notes, "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GarmentSizeChart; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GarmentSizeChart" (id, "tenantId", name, "categoryType", gender, unit, description, rows, "isDefault", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GarmentTailoringOrder; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GarmentTailoringOrder" (id, "tenantId", "shopId", "orderNumber", "customerId", "measurementProfileId", "customerName", "customerPhone", "customerNotes", "orderStatus", priority, "paymentStatus", "collectionId", "tailorId", "designerId", "orderDate", "promisedDate", "readyDate", "deliveredAt", "cancelledAt", "cancellationReason", subtotal, "stitchingCharges", "embroideryCharges", "alterationCharges", "fabricCharges", "accessoryCharges", discount, "taxAmount", total, "paidAmount", "designReferenceUrls", "designInstructions", "internalNotes", "qualityCheckNotes", "qualityCheckedById", "qualityCheckedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GarmentTailoringOrderItem; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GarmentTailoringOrderItem" (id, "orderId", "productId", "variantId", "garmentName", "categoryType", quantity, "fabricProductId", "fabricVariantId", "fabricMeters", "fabricCost", "stitchingCost", "embroideryCost", "accessoryCost", total, size, "colorName", "designNotes", "measurementSnapshot", "referenceImageUrls", "itemStatus", "displayOrder", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GarmentTailoringPayment; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GarmentTailoringPayment" (id, "orderId", amount, "paymentMethod", reference, notes, "receivedById", "paidAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: GarmentVariantProfile; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GarmentVariantProfile" (id, "tenantId", "productId", "variantId", size, "colorName", "colorHex", "colorFamily", "skuSuffix", barcode, chest, waist, hip, shoulder, length, "sleeveLength", inseam, "weightGrams", "fabricMeters", "displayOrder", "isAvailable", "isFeaturedColor", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GymAttendance; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GymAttendance" (id, "tenantId", "shopId", "memberId", "checkInAt", "checkOutAt", "durationMinutes", method, "entryPoint", "isGuest", "guestName", "guestPhone", "invitedByMemberId", "membershipId", "checkedInById", notes, "photoUrl", "createdAt") FROM stdin;
\.


--
-- Data for Name: GymBodyMeasurement; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GymBodyMeasurement" (id, "tenantId", "memberId", "measurementDate", "measuredById", "weightKg", "heightCm", bmi, "bodyFatPct", "muscleMassPct", "visceralFat", "waterPct", "boneMassKg", "metabolicAge", bmr, "chestCm", "waistCm", "hipsCm", "bicepsCm", "thighsCm", "calvesCm", "neckCm", "shouldersCm", "forearmsCm", "bloodPressure", "restingHeartRate", "frontPhotoUrl", "sidePhotoUrl", "backPhotoUrl", notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: GymClass; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GymClass" (id, "tenantId", "shopId", "trainerId", name, "classType", description, "scheduledStart", "scheduledEnd", "actualStart", "actualEnd", "durationMinutes", "isRecurring", "recurrencePattern", "recurrenceDays", "recurrenceEndDate", "maxParticipants", "minParticipants", "currentEnrolled", "isFree", "dropInPrice", "memberPrice", location, "roomName", "difficultyLevel", "targetAudience", status, "cancelledReason", "imageUrl", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GymClassBooking; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GymClassBooking" (id, "tenantId", "classId", "memberId", "bookingNumber", status, "bookedAt", "checkedInAt", "cancelledAt", "cancellationReason", price, "paidAmount", attended, rating, feedback, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GymDietPlan; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GymDietPlan" (id, "tenantId", "memberId", "trainerId", "planName", "planType", goal, "startDate", "endDate", "durationDays", "targetCalories", "proteinGrams", "carbsGrams", "fatsGrams", meals, restrictions, supplements, notes, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GymEquipment; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GymEquipment" (id, "tenantId", "shopId", "equipmentNumber", name, category, brand, model, "serialNumber", "purchaseDate", "purchasePrice", "vendorName", "warrantyExpiry", location, "roomName", status, "lastMaintenanceDate", "nextMaintenanceDate", "maintenanceIntervalDays", "totalMaintenanceCost", "usageCount", "lastUsedAt", "imageUrls", "manualUrl", notes, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GymMember; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GymMember" (id, "tenantId", "customerId", "shopId", "memberNumber", "rfidCard", "biometricId", "qrCode", "dateOfBirth", gender, "bloodGroup", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", "heightCm", "currentWeightKg", "targetWeightKg", "bodyFatPct", "muscleMassPct", bmi, "primaryGoal", "secondaryGoals", "fitnessLevel", "experienceYears", "medicalConditions", injuries, allergies, medications, "doctorClearance", "doctorClearanceUrl", "preferredWorkoutTime", "preferredTrainerId", "workoutDays", "dietaryPreferences", "photoUrl", bio, notes, status, "joinedAt", "lastVisitAt", "totalVisits", "totalSpent", "currentStreak", "longestStreak", "referredById", "referralCode", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GymMemberMembership; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GymMemberMembership" (id, "tenantId", "memberId", "planId", "membershipNumber", status, "startDate", "endDate", "actualEndDate", "totalPrice", "paidAmount", "balanceDue", "paymentStatus", "visitsUsed", "visitsRemaining", "classesUsed", "ptSessionsUsed", "guestPassesUsed", "isFrozen", "frozenAt", "frozenUntil", "frozenReason", "totalFrozenDays", "cancelledAt", "cancellationReason", "refundAmount", "autoRenew", "renewalReminded", "parentMembershipId", notes, "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GymMembershipPlan; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GymMembershipPlan" (id, "tenantId", "shopId", name, code, description, "planType", price, "registrationFee", "securityDeposit", "durationDays", "visitLimit", "isUnlimited", "accessAllHours", "accessTimeStart", "accessTimeEnd", "accessDays", "includesPersonalTraining", "personalTrainingSessions", "includesClasses", "classesLimit", "includesNutritionPlan", "includesLockerFacility", "includesTowelService", "includesSteamSauna", "includesSwimmingPool", "includesGuestPasses", "allowFreeze", "maxFreezeDays", "freezeFee", "colorTheme", "iconUrl", "imageUrl", benefits, "isFeatured", "isActive", "displayOrder", "totalSubscribers", "totalRevenue", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GymPersonalTraining; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GymPersonalTraining" (id, "tenantId", "memberId", "trainerId", "sessionNumber", "scheduledStart", "scheduledEnd", "actualStart", "actualEnd", "durationMinutes", status, "cancelledAt", "cancellationReason", "focusArea", "workoutPlan", "exercisesPerformed", "caloriesBurned", price, "paidAmount", "isFromPackage", "commissionAmount", "memberRating", "memberFeedback", "trainerNotes", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GymTrainer; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GymTrainer" (id, "tenantId", "staffId", "shopId", "trainerNumber", role, specializations, certifications, "experienceYears", bio, "photoUrl", "hourlyRate", "perSessionRate", "monthlyPackageRate", "commissionPct", "commissionFixed", "workingDays", "workStartTime", "workEndTime", "isAvailable", "maxDailyClients", "totalClients", "activeClients", "totalSessions", "totalRevenue", "totalCommission", "avgRating", "totalReviews", "socialMedia", languages, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GymWorkoutSession; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."GymWorkoutSession" (id, "tenantId", "memberId", "sessionDate", "durationMinutes", "caloriesBurned", "workoutType", "focusArea", intensity, exercises, "totalSets", "totalReps", "totalWeight", notes, "memberRating", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HappyHourRule; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."HappyHourRule" (id, "tenantId", name, description, "discountType", "discountValue", "startTime", "endTime", "daysOfWeek", "validFrom", "validTo", "categoryIds", "productIds", "minOrderAmount", "maxDiscount", "orderModes", "isActive", "displayOrder", "totalUsage", "totalSaved", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HardwareBrand; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."HardwareBrand" (id, "tenantId", name, code, tier, "countryOfOrigin", description, "logoUrl", "supplierContact", "supplierPhone", "isFeatured", "displayOrder", "isActive", "totalProducts", "totalRevenue", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HardwareBulkPricing; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."HardwareBulkPricing" (id, "tenantId", "productId", "minQuantity", "maxQuantity", price, discount, "discountPct", label, "isActive", "displayOrder", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HardwareCreditAccount; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."HardwareCreditAccount" (id, "tenantId", "shopId", "accountNumber", "customerId", "customerName", "customerPhone", "customerCnic", "businessName", "businessAddress", status, "creditLimit", "creditDays", "interestRateMonthly", "currentBalance", "totalPurchases", "totalPayments", "totalWriteOffs", "totalInterest", "age0To30Days", "age31To60Days", "age61To90Days", "ageOver90Days", "guarantorName", "guarantorPhone", "guarantorCnic", "guarantorRelation", "chequeSecurity", "postDatedCheques", "referredBy", "openedByStaffId", "openingDate", "closedAt", "lastPurchaseDate", "lastPaymentDate", "lastReminderDate", notes, "documentsUrls", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HardwareCreditTransaction; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."HardwareCreditTransaction" (id, "tenantId", "accountId", "transactionNumber", "transactionType", "transactionDate", amount, "runningBalance", "saleId", "deliveryId", "paymentMethod", "paymentReference", description, notes, "handledById", "attachmentUrls", "createdAt") FROM stdin;
\.


--
-- Data for Name: HardwareDelivery; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."HardwareDelivery" (id, "tenantId", "shopId", "deliveryNumber", "saleId", "projectId", "quotationId", "customerId", "customerName", "customerPhone", "deliveryAddress", city, area, latitude, longitude, landmark, "siteContactName", "siteContactPhone", status, "vehicleType", "vehicleNumber", "driverName", "driverPhone", "driverCnic", "helperName", "scheduledDate", "scheduledTime", "loadedAt", "dispatchedAt", "arrivedAt", "deliveredAt", "cancelledAt", "cancellationReason", "distanceKm", "deliveryCharge", "loadingCharge", "unloadingCharge", "laborCharge", "tollCharge", "totalCharges", "receivedByName", "receivedByPhone", "receivedByCnic", "receiverSignatureUrl", "deliveryProofUrls", "gateEntryNumber", "loadingInstructions", "driverInstructions", "customerNotes", "internalNotes", "issueReported", "createdById", "dispatchedById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HardwareDeliveryItem; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."HardwareDeliveryItem" (id, "deliveryId", "productId", "variantId", "itemName", brand, "orderedQty", "loadedQty", "deliveredQty", "returnedQty", "damagedQty", unit, "unitPrice", total, notes, "displayOrder", "createdAt") FROM stdin;
\.


--
-- Data for Name: HardwareProductProfile; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."HardwareProductProfile" (id, "tenantId", "productId", "brandId", "categoryType", unit, "bulkUnit", "bulkQuantity", "weightKg", "weightPerUnit", "volumePerUnit", "lengthMm", "widthMm", "heightMm", "diameterMm", "thicknessMm", grade, diameter, "gradeStrength", "bagWeight", "tileSize", "finishType", "piecesPerBox", "sqftPerBox", "colorCode", "colorName", "finishSheen", coverage, "litersPerCan", "minBulkQty", "bulkPrice", "wholesalePrice", "retailPrice", "cashPrice", "creditPrice", "requiresTruck", "requiresCrane", "canDeliverInCity", "canDeliverIntercity", "deliveryChargePerKm", "minDeliveryCharge", "requiresCoveredStorage", "requiresDryStorage", "shelfLifeMonths", "hasIsoCertification", "hasPsqcaCertification", "certificationNumbers", "manufacturingLocation", "batchTraceable", "displayOrder", "isFeatured", "isBestSeller", "isFastMoving", "totalSold", "totalRevenue", "totalReturns", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HardwareProject; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."HardwareProject" (id, "tenantId", "shopId", "projectNumber", name, description, "customerId", "customerName", "customerPhone", "contractorName", "contractorPhone", "architectName", "siteAddress", city, area, latitude, longitude, "siteContactPhone", "projectType", "builtUpArea", floors, "startDate", "expectedEndDate", "actualEndDate", status, "estimatedBudget", "totalQuoted", "totalOrdered", "totalDelivered", "totalPaid", "totalPending", "creditLimit", "creditDays", "imageUrls", "documentUrls", notes, "isActive", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HardwareQuotation; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."HardwareQuotation" (id, "tenantId", "shopId", "quotationNumber", "projectId", "customerId", "customerName", "customerPhone", "customerEmail", "customerAddress", status, "quotationDate", "validUntil", "sentAt", "viewedAt", "respondedAt", "convertedAt", "convertedSaleId", subtotal, discount, "discountPct", "taxAmount", "taxPct", "deliveryCharges", "laborCharges", "otherCharges", total, "paymentTerms", "deliveryTerms", "warrantyTerms", "specialTerms", "validityDays", "attachmentUrls", "internalNotes", "customerNotes", "revisionNumber", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HardwareQuotationItem; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."HardwareQuotationItem" (id, "quotationId", "productId", "variantId", "itemName", "itemDescription", brand, specifications, quantity, unit, "unitPrice", discount, "discountPct", total, "imageUrl", "displayOrder", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HardwareReorderRule; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."HardwareReorderRule" (id, "tenantId", "productId", "minStock", "reorderPoint", "reorderQty", "maxStock", "preferredSupplier", "leadTimeDays", "emergencyContact", "autoAlert", "lastAlertAt", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HotelBookedRoom; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."HotelBookedRoom" (id, "bookingId", "roomId", "roomTypeId", "roomNumber", "ratePerNight", "totalNights", "totalAmount", adults, children, "extraBeds", "isComplimentary", discount, notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: HotelBooking; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."HotelBooking" (id, "tenantId", "shopId", "bookingNumber", "confirmationCode", "primaryGuestId", "guestName", "guestPhone", "guestEmail", "totalAdults", "totalChildren", "checkInDate", "checkOutDate", nights, "actualCheckIn", "actualCheckOut", "earlyCheckIn", "lateCheckOut", source, "sourceRef", "bookedBy", "agentName", "agentCommission", "mealPlan", status, "roomTotal", "taxAmount", "serviceCharge", discount, "extraCharges", "grandTotal", "advancePaid", "paidAmount", "balanceAmount", "paymentStatus", "specialRequests", "arrivalTime", "purposeOfVisit", "cancelledAt", "cancellationReason", "refundAmount", "createdById", "checkedInBy", "checkedOutBy", "cancelledBy", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HotelFolioCharge; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."HotelFolioCharge" (id, "bookingId", "chargeNumber", "chargeDate", "chargeType", description, quantity, "unitPrice", "taxAmount", discount, "totalAmount", reference, "postedById", "isVoid", "voidedAt", "voidReason", notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: HotelGuest; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."HotelGuest" (id, "tenantId", "guestNumber", "customerId", title, "firstName", "lastName", "fullName", email, phone, "altPhone", "idType", "idNumber", "idExpiryDate", "idFrontUrl", "idBackUrl", "dateOfBirth", gender, nationality, language, address, city, state, country, "zipCode", "companyName", designation, "gstNumber", "isVIP", "vipLevel", "loyaltyNumber", "loyaltyPoints", preferences, allergies, "dietaryRestrictions", "specialRequests", "isBlacklisted", "blacklistReason", "totalStays", "totalNights", "totalSpent", "lastStayAt", "photoUrl", notes, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HotelHousekeepingTask; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."HotelHousekeepingTask" (id, "tenantId", "shopId", "taskNumber", "roomId", "roomNumber", "taskType", priority, "scheduledFor", "startedAt", "completedAt", "durationMin", "assignedTo", "assignedName", status, checklist, "suppliesUsed", notes, "issueFound", "photoUrls", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HotelRatePlan; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."HotelRatePlan" (id, "tenantId", code, name, description, "startDate", "endDate", "planType", "mealPlan", "isPercentage", adjustment, "minNights", "maxNights", "applicableDays", "advanceBookingDays", "cancellationHours", "applicableRoomTypeIds", "applicableSources", "isActive", "displayOrder", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HotelRoom; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."HotelRoom" (id, "tenantId", "roomTypeId", "roomNumber", floor, building, wing, status, "housekeepingStatus", "customPrice", "customNotes", "lastCleanedAt", "lastInspectedAt", "maintenanceUntil", "maintenanceNotes", "viewType", facing, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HotelRoomType; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."HotelRoomType" (id, "tenantId", code, name, type, description, "maxAdults", "maxChildren", "maxOccupancy", "bedType", "bedCount", "extraBedAllowed", "extraBedPrice", "sizeSqft", "sizeSqm", "basePrice", "weekendPrice", "peakPrice", "offSeasonPrice", "hourlyPrice", "hasAC", "hasHeater", "hasTV", "hasWifi", "hasBalcony", "hasKitchen", "hasBathtub", "hasSafe", "hasMinibar", "isPetFriendly", "isSmoking", amenities, "imageUrls", "displayOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Invoice" (id, "tenantId", "subscriptionId", "invoiceNumber", status, subtotal, tax, total, "amountPaid", "amountDue", currency, description, notes, "dueDate", "paidAt", "periodStart", "periodEnd", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: JewelryCustomOrder; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."JewelryCustomOrder" (id, "tenantId", "orderNumber", "customerId", "customerName", "customerPhone", "customerEmail", "orderDate", "promisedDate", status, category, "metalType", purity, style, "expectedGrossWeight", "expectedNetWeight", "expectedMakingCharges", "advancePayment", "estimatedPrice", "finalPrice", "designDescription", "referenceImageUrls", "approvedDesignUrl", "hasGemstones", "gemstonesRequired", "hasEngraving", "engravingText", "designedBy", "assignedKarigarId", "assignedKarigarName", "metalIssuedGrams", "metalIssuedDate", "metalReceivedGrams", "metalReceivedDate", "wastageGrams", "designStartedAt", "designApprovedAt", "productionStartedAt", "polishingStartedAt", "qualityCheckedAt", "hallmarkedAt", "readyAt", "deliveredAt", "customerRating", "customerFeedback", "paidAmount", "paymentStatus", "hallmarkNumber", "certificateNumber", "internalNotes", "cancellationReason", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: JewelryExchange; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."JewelryExchange" (id, "tenantId", "exchangeNumber", "exchangeType", "customerId", "customerName", "customerPhone", "customerCnic", "exchangeDate", "itemDescription", "metalType", "claimedPurity", "grossWeight", "testedPurity", "netWeight", "stoneWeight", "fineGoldEquivalent", "ratePerGram", "grossValue", deductions, "netValue", "meltingCharges", "testingCharges", "saleId", "usedAgainstOrderId", purpose, "testingMethod", "testedBy", "witnessedBy", "photoUrls", "cnicPhotoUrl", notes, "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: JewelryGemstone; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."JewelryGemstone" (id, "jewelryProfileId", type, count, caret, quality, color, clarity, cut, shape, origin, "isCertified", "certificateNumber", "ratePerCaret", "totalValue", "createdAt") FROM stdin;
\.


--
-- Data for Name: JewelryKarigar; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."JewelryKarigar" (id, "tenantId", "karigarNumber", "fullName", "fatherName", cnic, phone, address, "photoUrl", specializations, "yearsExperience", "skillLevel", "hourlyRate", "perGramRate", "fixedRatePerPiece", "metalIssuedGrams", "metalReturnedGrams", "wastageGrams", "outstandingGrams", "totalOrders", "completedOrders", "totalEarnings", "qualityRating", "isActive", "isInHouse", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: JewelryMetalRate; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."JewelryMetalRate" (id, "tenantId", "metalType", purity, "ratePerGram", "ratePerTola", "ratePerOunce", "buyRate", "sellRate", "effectiveDate", source, notes, "isActive", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: JewelryMetalStock; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."JewelryMetalStock" (id, "tenantId", "entryNumber", "entryDate", "entryType", "metalType", purity, grams, "balanceGrams", "ratePerGram", "totalValue", source, reference, "karigarId", "saleId", "exchangeId", notes, "createdById", "createdAt") FROM stdin;
\.


--
-- Data for Name: JewelryProductProfile; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."JewelryProductProfile" (id, "tenantId", "productId", "itemCode", "designNumber", category, "subCategory", style, "metalType", purity, "purityHallmark", "grossWeight", "netWeight", "stoneWeight", "waxWeight", "otherWeight", size, length, width, thickness, "makingChargePerGram", "makingChargeFixed", "makingChargePct", "wastagePct", "wastageGrams", "designerCharge", "polishCharge", "hallmarkCharge", "otherCharges", "hasStones", "hasDiamond", "hasGemstone", "hasPearl", "stoneCount", "stoneCaret", "stoneQuality", "stoneColor", "stoneClarity", "stoneCut", "hallmarkNumber", "hallmarkAuthority", "hallmarkDate", "bisNumber", "jewellerCode", "hallmarkPhotoUrl", "designerName", "karigarName", "workshopName", "countryOfOrigin", "isCustomOrder", "isBespoke", "isAntique", "isCertified", "certificateNumber", "certificateAuthority", "certificatePhotoUrl", "isBuyBackEligible", "buyBackPct", "isReturnable", "returnDays", "currentValue", "lastValuationDate", "insuredValue", "insurancePolicyNumber", "insuranceExpiry", "imageUrls", "videoUrl", "descriptionLong", "careInstructions", "isPopular", "isFeatured", "isBestSeller", "isBridalCollection", "isFestivalSpecial", "totalSold", "totalRevenue", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: JewelrySale; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."JewelrySale" (id, "tenantId", "shopId", "invoiceNumber", "customerId", "customerName", "customerPhone", "customerCnic", "customerAddress", "saleDate", status, "metalRateSnapshot", "grossWeight", "netWeight", "metalValue", "makingCharges", "wastageValue", "polishCharges", "hallmarkCharges", "stoneValue", "gstAmount", "otherCharges", subtotal, discount, total, "paidAmount", "paymentStatus", "paymentMethod", "exchangeMetalGrams", "exchangeMetalPurity", "exchangeValue", "hallmarkVerified", "hasCertificate", "isReturned", "returnedAt", "returnReason", "isExchanged", "exchangedAt", "exchangeType", "customerNotes", "internalNotes", "createdById", "cancelledAt", "cancellationReason", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: JewelrySaleItem; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."JewelrySaleItem" (id, "saleId", "productId", "productName", category, "metalType", purity, "ratePerGram", "grossWeight", "netWeight", "metalValue", "makingChargePerGram", "makingChargeFixed", "makingChargePct", "makingTotal", "wastagePct", "wastageValue", "polishCharges", "hallmarkCharges", "stoneValue", quantity, "itemTotal", "hallmarkNumber", "certificateNumber", "itemPhotoUrl", "displayOrder", "createdAt") FROM stdin;
\.


--
-- Data for Name: KitchenStation; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."KitchenStation" (id, "tenantId", name, code, "printerName", "categoryIds", "displayOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Kot; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Kot" (id, "tenantId", "orderId", "kotNumber", station, status, "itemIds", "itemsSnapshot", "printedAt", "printedBy", "acknowledgedAt", "cookingStartedAt", "readyAt", "servedAt", "cancelledAt", notes, priority, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: LoginHistory; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."LoginHistory" (id, "userId", "tenantId", email, success, "failureReason", "ipAddress", "userAgent", "deviceFingerprint", "deviceName", location, "isNewDevice", "createdAt") FROM stdin;
\.


--
-- Data for Name: LoyaltyTransaction; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."LoyaltyTransaction" (id, "tenantId", "customerId", type, points, "balanceAfter", reference, note, "createdAt") FROM stdin;
\.


--
-- Data for Name: MeatCuttingJob; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."MeatCuttingJob" (id, "tenantId", "shopId", "jobNumber", "slaughterLogId", "butcherId", "butcherName", "inputWeightKg", "outputWeightKg", "wasteWeightKg", "yieldPct", "startedAt", "completedAt", "durationMin", status, "cutsProduced", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MeatLiveAnimal; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."MeatLiveAnimal" (id, "tenantId", "shopId", "tagNumber", "animalType", breed, color, sex, "ageMonths", "weightKg", "purchasePrice", "purchaseDate", "vendorId", "vendorName", "sourceName", "vaccinationStatus", "healthCertUrl", "isHealthy", "healthNotes", "vetCheckedAt", "feedingType", "dailyFeedCost", "daysHeld", "totalFeedCost", "isSlaughtered", "slaughteredAt", "slaughterMethod", "slaughterCertBy", "slaughterWeightKg", "meatYieldKg", "yieldPct", "isSold", "soldPrice", "soldAt", "soldToCustomer", "photoUrls", notes, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MeatProductProfile; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."MeatProductProfile" (id, "tenantId", "productId", "animalType", "cutCategory", "freshnessType", "slaughterMethod", "qualityGrade", "saleUnit", "pricePerKg", "pricePerPiece", "minOrderKg", "maxOrderKg", "weightVariancePct", "isBoneless", "isBoneIn", "isSkinless", "isMarinated", "marinationType", "isOrganic", "isFreeRange", "isGrainFed", "isGrassFed", "isFrozen", "halalCertNumber", "halalCertBy", "halalCertExpiry", "isHalalCertified", "otherCerts", "farmName", "farmLocation", "slaughterhouseName", "slaughterhouseLic", "countryOfOrigin", breed, "storageTempMin", "storageTempMax", "shelfLifeDays", "packagingType", "batchNumber", "animalAge", "animalSex", "cuttingStyle", "cleaningLevel", "packagingWeight", "imageUrls", "descriptionLong", "cookingSuggestions", "nutritionInfo", "isPopular", "isFeatured", "isNewArrival", "isOnSale", "totalSoldKg", "totalRevenue", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MeatQurbaniBooking; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."MeatQurbaniBooking" (id, "tenantId", "bookingNumber", "customerId", "customerName", "customerPhone", "customerCnic", "customerAddress", occasion, "animalType", "animalPreference", "shareCount", "shareNumber", "advanceAmount", "finalPrice", "paidAmount", "paymentStatus", "slaughterDate", "slaughterDay", "wantsMeatDelivery", "deliveryPreference", "deliveryAddress", "needsCharityShare", "charityShareKg", "charityRecipient", "cuttingStyle", "packagingCount", "wantsSkin", "wantsOffal", "specialInstructions", "liveAnimalId", "slaughterLogId", status, "cancelledAt", "cancellationReason", "bookedAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MeatSlaughterLog; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."MeatSlaughterLog" (id, "tenantId", "shopId", "slaughterNumber", "liveAnimalId", "animalType", "animalTag", "slaughterDate", "slaughterTime", "slaughterMethod", "slaughteredBy", "slaughtererId", "slaughtererCertNumber", "witnessedBy", "liveWeightKg", "dressedWeightKg", "yieldPct", "facilityName", "facilityLicense", "facilityAddress", "isHalal", "halalCertNumber", "religiousAuthority", "vetInspection", "vetInspectorName", "vetCertNumber", "postMortemNotes", "qualityGrade", temperature, "storageLocation", "photoUrls", "documentUrls", notes, "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MeatSubscription; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."MeatSubscription" (id, "tenantId", "customerId", "subscriptionNumber", status, frequency, "customDays", "startDate", "endDate", "nextDeliveryDate", "lastDeliveryDate", "standardItems", "totalMonthlyKg", "discountPct", "deliveryAddress", "deliveryTimeSlot", "contactPerson", "contactPhone", "billingCycle", "monthlyEstimate", "autoRenew", "pausedAt", "pauseReason", "cancelledAt", "cancellationReason", "totalDeliveries", "totalRevenue", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MeatWeightOrder; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."MeatWeightOrder" (id, "tenantId", "shopId", "orderNumber", "customerId", "customerName", "customerPhone", "orderDate", "neededBy", "scheduledDelivery", status, "isDelivery", "deliveryAddress", "deliveryCharges", "deliveryPersonId", "deliveredAt", occasion, "specialInstructions", subtotal, "taxAmount", discount, total, "paidAmount", "paymentStatus", "cuttingStyle", "packagingPref", "numberOfPackets", "createdById", "cancelledAt", "cancellationReason", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MeatWeightOrderItem; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."MeatWeightOrderItem" (id, "orderId", "productId", "productName", "cutCategory", "requestedKg", "actualKg", "pricePerKg", total, "cuttingInstructions", "packagingNotes", "displayOrder", "createdAt") FROM stdin;
\.


--
-- Data for Name: MeatWholesaleAccount; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."MeatWholesaleAccount" (id, "tenantId", "customerId", "accountNumber", "businessName", "businessType", "contractStart", "contractEnd", "creditLimit", "currentBalance", "creditDays", "discountPct", "specialPricing", "requiresDelivery", "deliveryDays", "deliveryTimeSlot", "contactPerson", "contactPhone", "contactEmail", "billingAddress", "deliveryAddress", "gstNumber", "ntnNumber", "totalOrders", "totalPurchases", "totalOutstanding", "isActive", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MechanicProfile; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."MechanicProfile" (id, "tenantId", "staffId", specialization, certifications, "yearsOfExperience", bio, "photoUrl", "hourlyRate", "commissionPct", "workingDays", "workStartTime", "workEndTime", "isAvailable", "currentJobId", "totalJobs", "totalHours", "totalRevenue", "totalCommission", "avgRating", "totalReviews", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MedicineSubstitute; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."MedicineSubstitute" (id, "mainMedicineId", "substituteMedicineId", similarity, "priceDifference", notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: MenuItemModifier; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."MenuItemModifier" (id, "menuItemId", "modifierGroupId", "isRequired", "displayOrder") FROM stdin;
\.


--
-- Data for Name: ModifierGroup; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ModifierGroup" (id, "tenantId", name, description, type, "isRequired", "minSelections", "maxSelections", "displayOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ModifierOption; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ModifierOption" (id, "tenantId", "modifierGroupId", name, "priceAdjustment", "isDefault", "displayOrder", "isActive", emoji, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Notification" (id, "tenantId", "userId", type, title, message, link, "isRead", "readAt", metadata, "createdAt") FROM stdin;
\.


--
-- Data for Name: NotificationPreference; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."NotificationPreference" (id, "tenantId", "emailEnabled", "smsEnabled", "emailWelcome", "emailPayment", "emailExpiry", "emailLowStock", "emailMarketing", "smsPayment", "smsExpiry", "smsCritical", "smsMarketing", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: OnboardingProgress; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."OnboardingProgress" (id, "tenantId", "userId", "currentStep", "completedSteps", "isCompleted", "isSkipped", "startedAt", "completedAt", "businessType", "businessSize", city, province, "avatarUrl", "whatsappNumber", cnic, "preferredLanguage", "shopAddress", "openTime", "closeTime", "workingDays", "taxNumber", "enabledCategories", "paymentMethods", "receiptTemplate", "lowStockThreshold", "productsAddedCount", "teamMembersAdded", "wantsTutorial", "createdAt", "updatedAt", currency, "dateOfBirth", "detectedCity", "detectedCountry", "detectedIp", "detectedProvince", "detectedTimezone", "enableTax", "enabledFeatures", gender, latitude, longitude, "shopArea", "shopLandmark", "signupSource", "skipCount", "smartDefaults", "subscribedToTips", "taxRate", "timeSpentSeconds", "usedSampleData", "wantsSampleData") FROM stdin;
\.


--
-- Data for Name: OtpCode; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."OtpCode" (id, "userId", email, phone, code, purpose, "expiresAt", "verifiedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: PatientProfile; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."PatientProfile" (id, "tenantId", "customerId", "dateOfBirth", "bloodGroup", height, weight, gender, "chronicConditions", allergies, "currentMedications", "pastSurgeries", "emergencyContactName", "emergencyContactPhone", "emergencyRelation", "hasInsurance", "insuranceProvider", "insuranceNumber", "insuranceExpiry", "medicalNotes", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Payment" (id, "tenantId", "subscriptionId", "invoiceId", "uploadId", amount, currency, provider, status, reference, "bankName", "accountNumber", "transactionId", "payerName", notes, "rejectionReason", "approvedById", "approvedAt", "rejectedAt", "paidAt", metadata, "createdAt", "updatedAt", "stripePaymentIntentId") FROM stdin;
\.


--
-- Data for Name: PharmacyMedicine; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."PharmacyMedicine" (id, "tenantId", "productId", "registrationNumber", "approvalDate", "dosageForm", "packSize", "packUnit", manufacturer, "countryOfOrigin", "importedBy", indication, "mechanismOfAction", pharmacokinetics, "storageCondition", "storageInstructions", "requiresColdChain", "minTemperature", "maxTemperature", "scheduleClass", "requiresPrescription", "isNarcotic", "isRefrigerated", color, shape, markings, "isGeneric", "brandTier", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Plan; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Plan" (id, name, slug, description, "priceMonthly", "priceQuarterly", "priceYearly", "trialDays", "isActive", "isPublic", "sortOrder", "maxProducts", "maxUsers", "maxShops", "maxSalesPerMonth", "featurePos", "featureBarcodeScanner", "featureMultiShop", "featureReports", "featureProfitReport", "featureLoyalty", "featureDiscounts", "featureKhata", "featureExports", "featureBackup", "featureNotifications", "featureCashRegister", "featureStockTransfer", "featureReturns", "featureSupport24x7", "featureWhatsappReceipt", "featureCustomBranding", "createdAt", "updatedAt", "stripePriceMonthlyId", "stripePriceQuarterlyId", "stripePriceYearlyId") FROM stdin;
\.


--
-- Data for Name: PlatformDiscount; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."PlatformDiscount" (id, code, description, type, value, scope, "applicablePlans", "minPurchase", "maxDiscount", "usageLimit", "usageCount", "perTenantLimit", "validFrom", "validUntil", "isActive", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Prescription; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Prescription" (id, "tenantId", "shopId", "customerId", "doctorId", "saleId", "prescriptionNumber", type, status, "doctorName", "doctorRegNumber", "doctorSpeciality", "hospitalName", "patientName", "patientAge", "patientGender", "patientPhone", "patientCnic", "patientWeight", "prescriptionDate", diagnosis, "chiefComplaint", vitals, "imageUrls", "scannedText", "isRefillable", "refillsAllowed", "refillsUsed", "refillFrequency", "nextRefillDate", "isInsuranceClaim", "insuranceProvider", "insuranceApprovalCode", "insuranceAmount", "verifiedById", "verifiedAt", "verificationNotes", "dispensedById", "dispensedAt", "rejectionReason", "totalAmount", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PrescriptionItem; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."PrescriptionItem" (id, "prescriptionId", "productId", "batchId", "medicineName", "saltName", strength, dose, frequency, duration, route, instructions, "prescribedQty", "dispensedQty", unit, "unitPrice", "totalPrice", "isDispensed", "isSubstituted", "substituteFor", "isOutOfStock", "displayOrder", "createdAt") FROM stdin;
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Product" (id, "tenantId", name, sku, barcode, unit, price, "costPrice", stock, "lowStockAlert", "isActive", "createdAt", "updatedAt", "categoryId", "brandId", description, dimensions, "expiryTracked", "hasVariants", "isFeatured", "metaDescription", "metaTitle", "shortDescription", slug, "taxRate", weight, "weightUnit", "wholesalePrice") FROM stdin;
\.


--
-- Data for Name: ProductBatch; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ProductBatch" (id, "tenantId", "productId", "variantId", "batchNumber", "manufactureDate", "expiryDate", quantity, "costPrice", notes, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ProductCombo; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ProductCombo" (id, "tenantId", "shopId", "categoryId", name, slug, sku, barcode, description, "imageUrl", "comboPrice", "originalTotal", "savingsAmount", "savingsPercentage", status, "validFrom", "validTo", "maxPurchasePerCustomer", "stockAvailable", "soldCount", "totalRevenue", "isFeatured", "sortOrder", "tagLine", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ProductComboItem; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ProductComboItem" (id, "comboId", "productId", "variantId", "unitId", quantity, "unitName", "originalPrice", "sortOrder", "createdAt") FROM stdin;
\.


--
-- Data for Name: ProductImage; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ProductImage" (id, "productId", url, thumbnail, alt, "isPrimary", "sortOrder", "uploadId", "createdAt") FROM stdin;
\.


--
-- Data for Name: ProductImei; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ProductImei" (id, "tenantId", "productId", "variantId", imei1, imei2, "serialNumber", status, "costPrice", "saleItemId", "soldAt", "soldPrice", "warrantyMonths", "warrantyExpiry", "purchaseItemId", "purchasedAt", color, notes, "createdAt", "updatedAt", "ptaStatus", "ptaTaxDueAt", "ptaTaxPaid", "ptaVerifiedAt") FROM stdin;
\.


--
-- Data for Name: ProductSalt; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ProductSalt" (id, "productId", "saltId", strength, "strengthValue", "strengthUnit", "isMainSalt", "createdAt") FROM stdin;
\.


--
-- Data for Name: ProductTag; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ProductTag" ("productId", "tagId", "createdAt") FROM stdin;
\.


--
-- Data for Name: ProductUnit; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ProductUnit" (id, "tenantId", "productId", "variantId", "unitName", "unitLabel", "conversionType", "conversionRate", "isBase", "isDefault", price, "costPrice", "wholesalePrice", "mrpPrice", barcode, sku, "isActive", "sortOrder", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ProductVariant; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ProductVariant" (id, "productId", name, sku, barcode, color, "colorHex", size, weight, unit, price, "costPrice", "wholesalePrice", stock, "lowStockAlert", "imageUrl", "isActive", "sortOrder", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Publisher; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Publisher" (id, "tenantId", name, code, country, city, website, phone, email, "contactPerson", "logoUrl", description, "defaultDiscountPct", "paymentTerms", "creditDays", "totalBooks", "totalRevenue", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Purchase; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Purchase" (id, "tenantId", "supplierId", "createdById", "purchaseNumber", subtotal, discount, total, "paidAmount", "paymentMethod", status, notes, "purchasedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PurchaseItem; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."PurchaseItem" (id, "purchaseId", "productId", quantity, "costPrice", total, "createdAt") FROM stdin;
\.


--
-- Data for Name: Recipe; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Recipe" (id, "tenantId", "menuItemId", "yieldQuantity", "yieldUnit", "totalCost", "preparationSteps", "cookingTime", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RecipeIngredient; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."RecipeIngredient" (id, "recipeId", "ingredientProductId", quantity, unit, "costPerUnit", "totalCost", "isOptional", notes, "displayOrder", "createdAt") FROM stdin;
\.


--
-- Data for Name: Referral; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Referral" (id, "referrerTenantId", "refereeTenantId", code, status, "rewardAmount", "rewardPaid", "rewardPaidAt", "convertedAt", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RefillReminder; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."RefillReminder" (id, "tenantId", "customerId", "productId", "prescriptionId", "medicineName", "scheduledFor", "reminderType", status, "sentAt", "acknowledgedAt", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ReorderSuggestion; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ReorderSuggestion" (id, "tenantId", "shopId", "productId", "variantId", "currentStock", "reorderPoint", "suggestedQuantity", "avgDailySales", "daysOfStockLeft", "lastPurchasePrice", "preferredSupplierId", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RepairPart; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."RepairPart" (id, "ticketId", "productId", "partName", "partNumber", quantity, "unitCost", "unitPrice", "totalPrice", source, notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: RepairPayment; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."RepairPayment" (id, "ticketId", amount, "paymentMethod", reference, notes, "paidAt", "createdById") FROM stdin;
\.


--
-- Data for Name: RepairStatusLog; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."RepairStatusLog" (id, "ticketId", "fromStatus", "toStatus", note, "changedById", "changedAt") FROM stdin;
\.


--
-- Data for Name: RepairTicket; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."RepairTicket" (id, "tenantId", "shopId", "ticketNumber", imei1, imei2, "serialNumber", "deviceBrand", "deviceModel", "deviceColor", passcode, "hasSimCard", "hasMemoryCard", "customerId", "customerName", "customerPhone", "customerCnic", "customerAddress", "reportedIssue", "diagnosedIssue", "diagnosisNotes", "recommendedActions", status, priority, "paymentStatus", "estimatedCost", "partsCost", "laborCost", "totalCost", "advancePaid", "paidAmount", "balanceDue", discount, "receivedAt", "diagnosedAt", "approvedAt", "startedAt", "readyAt", "deliveredAt", "estimatedReadyAt", "technicianId", "technicianName", "beforePhotos", "afterPhotos", "signatureUrl", "smsNotificationsSent", "lastSmsSentAt", notes, "warrantyDays", "warrantyEnds", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RestaurantMenuItem; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."RestaurantMenuItem" (id, "tenantId", "productId", "prepTimeMinutes", "cookingInstructions", "chefSpecial", "bestSeller", "isSpicy", "spiceLevel", calories, "servingSize", "servesPeople", "dietaryTags", "allergenInfo", "displayOrder", "isAvailable", "availableFrom", "availableTo", "availableDays", "imageUrl", "videoUrl", "highlightColor", "tagLine", "totalOrdered", "avgRating", "totalReviews", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RestaurantOrder; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."RestaurantOrder" (id, "tenantId", "shopId", "tableId", "customerId", "riderId", "waiterId", "orderNumber", mode, status, "customerName", "customerPhone", "customerAddress", "numberOfGuests", "specialRequests", subtotal, "serviceCharge", "serviceChargePct", "taxAmount", "taxPct", discount, "deliveryFee", "packagingFee", tip, total, "paidAmount", "placedAt", "confirmedAt", "cookingStartedAt", "readyAt", "servedAt", "outForDeliveryAt", "deliveredAt", "completedAt", "cancelledAt", "cancellationReason", "estimatedPrepTime", "estimatedDeliveryTime", "deliveryAddress", "deliveryLat", "deliveryLng", "deliveryDistance", "deliveryNotes", "deliveryStatus", "kotPrintedAt", "kotPrintCount", "isSplitBill", "parentOrderId", "saleId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RestaurantOrderItem; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."RestaurantOrderItem" (id, "orderId", "productId", "variantId", quantity, unit, "basePrice", "modifierTotal", "itemDiscount", total, "costPrice", "specialInstructions", "spiceLevel", "cookingNote", status, "courseNumber", "isComplimentary", "isReturned", "returnReason", "sentToKitchenAt", "cookingStartedAt", "readyAt", "servedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RestaurantOrderItemModifier; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."RestaurantOrderItemModifier" (id, "orderItemId", "modifierOptionId", quantity, "priceAdjustment", notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: RestaurantOrderPayment; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."RestaurantOrderPayment" (id, "orderId", amount, "paymentMethod", "paidBy", reference, notes, "paidAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: RestaurantTable; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."RestaurantTable" (id, "tenantId", "shopId", "tableNumber", name, capacity, status, floor, zone, notes, "currentSaleId", "occupiedAt", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RestaurantTableV2; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."RestaurantTableV2" (id, "tenantId", "shopId", "tableNumber", "tableName", capacity, "minCapacity", "maxCapacity", section, floor, location, shape, "positionX", "positionY", status, "isReservable", "isSmokingAllowed", "isAcRoom", "isFamilyArea", "isVip", "minOrderAmount", "currentOrderId", "occupiedAt", "reservedAt", "reservedFor", "reservedByName", "reservedByPhone", "reservationNote", "totalOrders", "totalRevenue", "avgTurnoverMinutes", "qrCodeUrl", notes, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RetailQuickKey; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."RetailQuickKey" (id, "tenantId", "userId", "shopId", "productId", "comboId", "variantId", "unitId", label, color, icon, "position", hotkey, "group", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Rider; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Rider" (id, "tenantId", name, phone, cnic, email, "avatarUrl", "vehicleType", "vehicleNumber", "licenseNumber", status, "currentLat", "currentLng", "lastLocationUpdate", "isEmployee", "commissionType", "commissionValue", "baseSalary", "totalDeliveries", "totalDistance", "avgRating", "totalTips", "isActive", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SalaryPayment; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SalaryPayment" (id, "tenantId", "staffId", "paymentNumber", "periodStart", "periodEnd", "baseSalary", "daysWorked", "hoursWorked", "overtimePay", "commissionEarned", bonuses, advances, "leaveDeduction", "lateDeduction", "otherDeductions", "grossAmount", "totalDeductions", "netAmount", "paidAmount", "balanceAmount", "paymentMethod", status, "paidAt", "paidById", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Sale; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Sale" (id, "tenantId", "customerId", "createdById", "saleNumber", subtotal, discount, total, "paidAmount", "changeAmount", "paymentMethod", status, "soldAt", "createdAt", "updatedAt", "costOfGoods", "creditAmount", "cashRegisterId", "shopId", "discountCode", "discountCodeId", "loyaltyEarned", "loyaltyUsed", "refundedAmount", "serviceCharges", "serviceChargesBreakdown", "bookingId") FROM stdin;
\.


--
-- Data for Name: SaleItem; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SaleItem" (id, "saleId", "productId", quantity, price, total, "createdAt", "costPrice", "returnedQty", note, "internalNote") FROM stdin;
\.


--
-- Data for Name: SaleItemVariant; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SaleItemVariant" (id, "saleItemId", "variantId", "createdAt") FROM stdin;
\.


--
-- Data for Name: SaleReturn; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SaleReturn" (id, "tenantId", "saleId", "createdById", "returnNumber", reason, "refundAmount", "refundMethod", notes, "returnedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: SaleReturnItem; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SaleReturnItem" (id, "returnId", "saleItemId", "productId", quantity, "refundPrice", total) FROM stdin;
\.


--
-- Data for Name: SalonAppointment; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SalonAppointment" (id, "tenantId", "shopId", "customerId", "appointmentNumber", "customerName", "customerPhone", "createdAt", "updatedAt", "actualEnd", "actualStart", "arrivedAt", "cancellationReason", "cancelledAt", "createdById", "customerEmail", "customerFeedback", "customerNotes", "customerRating", discount, "internalNotes", "membershipId", "packageId", "paidAmount", "paymentStatus", "reminderSent", "reminderSentAt", "saleId", "scheduledEnd", "scheduledStart", "serviceCharge", subtotal, "taxAmount", tip, total, status) FROM stdin;
\.


--
-- Data for Name: SalonAppointmentLegacy; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SalonAppointmentLegacy" (id, "tenantId", "shopId", "customerId", "staffId", "serviceProductId", "appointmentNumber", "customerName", "customerPhone", "serviceName", duration, price, "startTime", "endTime", status, notes, "completedSaleId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SalonAppointmentService; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SalonAppointmentService" (id, "appointmentId", "serviceId", "serviceName", "staffProfileId", "staffName", price, discount, total, "durationMinutes", "actualDurationMinutes", "commissionAmount", "commissionPaid", notes, "productsUsed", "displayOrder", "createdAt") FROM stdin;
\.


--
-- Data for Name: SalonCustomerProfile; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SalonCustomerProfile" (id, "tenantId", "customerId", "hairType", "hairLength", "hairColor", "hairTexture", "skinType", "skinTone", allergies, "preferredStaffId", "preferredServices", "favoriteBrands", "medicalConditions", medications, "pregnancyStatus", "totalVisits", "totalSpent", "lastVisitAt", "avgRating", notes, "photoUrls", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SalonMembership; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SalonMembership" (id, "tenantId", "planId", "customerId", "membershipNumber", status, "startDate", "expiryDate", "amountPaid", "paymentMethod", "usedServices", "totalSaved", "autoRenew", "cancelledAt", "cancellationReason", notes, "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SalonMembershipPlan; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SalonMembershipPlan" (id, "tenantId", name, tier, description, price, "durationDays", "discountPct", "freeServiceCount", "freeServiceIds", "priorityBooking", "freeConsultation", "birthdayBonus", "colorTheme", "iconUrl", benefits, "isActive", "displayOrder", "totalSubscribers", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SalonPackage; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SalonPackage" (id, "tenantId", name, description, price, "originalPrice", services, "totalSessions", "validityDays", "imageUrl", "isFeatured", "isActive", "totalSold", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SalonPackagePurchase; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SalonPackagePurchase" (id, "tenantId", "packageId", "customerId", "purchaseNumber", status, "purchaseDate", "expiryDate", "amountPaid", "sessionsUsed", "sessionsRemaining", "usageLog", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SalonService; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SalonService" (id, "tenantId", "shopId", name, code, category, description, price, "discountPrice", "costPrice", "durationMinutes", "bufferBefore", "bufferAfter", "forMen", "forWomen", "forKids", "commissionPct", "commissionFixed", "imageUrl", "displayOrder", "isPopular", "isFeatured", "isActive", "totalBookings", "totalRevenue", "avgRating", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SalonStaffProfile; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SalonStaffProfile" (id, "tenantId", "staffId", role, specialization, "experienceYears", bio, "photoUrl", "commissionType", "commissionPct", "commissionFixed", "workingDays", "workStartTime", "workEndTime", "breakStartTime", "breakEndTime", "isBookable", "maxDailyBookings", "bookingBuffer", "totalAppointments", "totalRevenue", "totalCommission", "avgRating", "totalReviews", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SalonStaffService; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SalonStaffService" (id, "staffProfileId", "serviceId", "customPrice", "customDuration", "customCommissionPct", "isPrimary", "createdAt") FROM stdin;
\.


--
-- Data for Name: Salt; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Salt" (id, "tenantId", name, "genericName", code, category, description, "standardDose", "maxDailyDose", "routeOfAdmin", "isPregnancySafe", "isLactationSafe", "isPediatricSafe", "minAgeYears", contraindications, "sideEffects", warnings, "scheduleClass", "requiresPrescription", "isNarcotic", "isBanned", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: School; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."School" (id, "tenantId", name, code, type, board, medium, address, city, phone, email, "principalName", "contactPerson", "contactPhone", "discountPct", "creditDays", "creditLimit", "logoUrl", notes, "totalOrders", "totalRevenue", "outstandingAmount", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SchoolBookList; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SchoolBookList" (id, "tenantId", "schoolId", session, grade, section, medium, title, description, status, "discountPct", "bundlePrice", "totalItems", "imageUrl", "totalOrders", "totalRevenue", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SchoolBookListItem; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SchoolBookListItem" (id, "listId", "productId", "itemName", "itemType", quantity, unit, "unitPrice", discount, total, subject, "isRequired", "isOptional", notes, "displayOrder", "createdAt") FROM stdin;
\.


--
-- Data for Name: ServiceAmc; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ServiceAmc" (id, "tenantId", "amcNumber", "customerId", "customerName", "customerPhone", "customerEmail", type, status, "coveredItems", "coveredServiceTypes", "numberOfVisits", "visitsUsed", "visitsRemaining", "includesParts", "includesLabour", "partsCapAmount", "emergencyIncluded", "emergencyDiscountPct", "contractValue", "amountPaid", "paymentMode", "paymentInstallments", "startDate", "endDate", "autoRenew", "reminderDaysBefore", "serviceAddress", city, "numberOfSites", "contractDocUrl", "termsConditions", "specialConditions", "cancelledAt", "cancellationReason", "refundAmount", "createdById", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ServiceAmcVisit; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ServiceAmcVisit" (id, "amcId", "visitNumber", "scheduledDate", "completedAt", "technicianId", "serviceJobId", status, "visitType", "checklistCompleted", "workDone", "partsReplaced", recommendations, "customerRating", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ServiceCatalog; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ServiceCatalog" (id, "tenantId", "shopId", name, code, description, category, "businessType", "chargeType", "baseCharge", "hourlyRate", "visitCharge", "minCharge", "maxCharge", "emergencyCharge", "weekendCharge", "nightCharge", "outOfCityCharge", "estimatedDurationMin", "minDurationMin", "maxDurationMin", "requiredSkillLevel", "requiredTools", "requiredParts", "requiresLicense", "licenseType", "warrantyDays", "warrantyType", "warrantyTerms", "isEmergency", "isRemoteAvailable", "requiresQuote", "requiresAdvance", "advancePct", "imageUrl", "imageUrls", "videoUrl", "displayOrder", "isPopular", "isFeatured", "isActive", "totalJobs", "totalRevenue", "avgRating", "avgDurationMin", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ServiceCustomerProfile; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ServiceCustomerProfile" (id, "tenantId", "customerId", "propertyType", "propertySize", "ownershipType", "preferredTechnicianId", "preferredTimeSlot", "paymentPreference", "assetsOwned", "emergencyAccessInstructions", "hasSecurityGuard", "hasPets", "petDetails", "gateCode", "buildingName", "floorNumber", "flatNumber", "preferredContact", "bestTimeToCall", "totalJobs", "totalSpent", "lastServiceAt", "avgRating", "isVip", "hasActiveAmc", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ServiceJob; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ServiceJob" (id, "tenantId", "shopId", "jobNumber", "ticketNumber", "customerId", "customerName", "customerPhone", "customerAltPhone", "customerEmail", "customerType", "serviceId", "serviceName", category, "businessType", priority, status, "problemDescription", "customerReportedIssue", "urgencyReason", brand, "modelNumber", "serialNumber", "yearPurchased", "purchasedFrom", "underWarranty", "warrantyType", "warrantyExpiryDate", "amcId", "locationType", "serviceAddress", city, area, landmark, latitude, longitude, "entryInstructions", "requestedDate", "scheduledStart", "scheduledEnd", "preferredTimeSlot", "assignedAt", "dispatchedAt", "enRouteAt", "arrivedAt", "startedAt", "pausedAt", "resumedAt", "completedAt", "cancelledAt", "primaryTechnicianId", "assistantTechnicianIds", "supervisorId", "visitCharge", "labourCharge", "partsCharge", "transportCharge", "emergencyCharge", "discountAmount", "taxAmount", "totalCharge", "paidAmount", "paymentStatus", "advanceRequired", "advanceAmount", "advanceCollected", "jobWarrantyDays", "jobWarrantyExpiryDate", "jobWarrantyTerms", "needsReturnVisit", "returnVisitReason", "returnVisitDate", "parentJobId", "workCompletionSignatureUrl", "customerSatisfaction", "customerRating", "customerFeedback", "wouldRecommend", "beforePhotoUrls", "duringPhotoUrls", "afterPhotoUrls", "documentUrls", "technicianNotes", "internalNotes", "quotedBy", "createdById", "cancellationReason", "followUpDate", "followUpDone", "followUpNotes", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ServiceJobPart; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ServiceJobPart" (id, "jobId", "productId", "partName", "partNumber", brand, quantity, "unitPrice", "costPrice", total, "isCustomerSupplied", "isUnderWarranty", "warrantyDays", "serialNumber", notes, "displayOrder", "createdAt") FROM stdin;
\.


--
-- Data for Name: ServiceJobStatusHistory; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ServiceJobStatusHistory" (id, "jobId", "fromStatus", "toStatus", "changedBy", "changedAt", reason, notes) FROM stdin;
\.


--
-- Data for Name: ServiceJobTimeLog; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ServiceJobTimeLog" (id, "jobId", "technicianId", action, "timestamp", latitude, longitude, notes) FROM stdin;
\.


--
-- Data for Name: ServiceQuote; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ServiceQuote" (id, "tenantId", "quoteNumber", "customerId", "customerName", "customerPhone", "customerEmail", "serviceId", "serviceName", "problemDescription", "siteVisitRequired", "siteVisitCompleted", status, "labourCharge", "partsCharge", "visitCharge", "otherCharges", discount, "taxAmount", "totalAmount", "lineItems", "validUntil", "termsConditions", "sentAt", "respondedAt", "acceptedAt", "rejectedAt", "rejectionReason", "convertedJobId", "createdById", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ServiceTechnicianProfile; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ServiceTechnicianProfile" (id, "tenantId", "staffId", "employeeCode", level, status, "primarySkill", "secondarySkills", certifications, "experienceYears", bio, "photoUrl", "cnicNumber", "licenseNumber", "licenseExpiryDate", "drivingLicense", "vehicleAssigned", "vehicleNumber", "emergencyContactName", "emergencyContactPhone", "serviceAreas", "homeCity", "currentLat", "currentLng", "lastLocationAt", "maxTravelKm", "workingDays", "workStartTime", "workEndTime", "breakStartTime", "breakEndTime", "isAvailableForEmergency", "isAvailableWeekends", "isAvailableNights", "commissionType", "commissionPct", "fixedPerJob", "monthlySalary", "performanceBonus", "maxDailyJobs", "maxOngoingJobs", "bookingBufferMin", "totalJobs", "completedJobs", "cancelledJobs", "totalRevenue", "totalCommission", "avgRating", "totalReviews", "onTimePct", "completionPct", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ServiceTechnicianSkill; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ServiceTechnicianSkill" (id, "technicianId", "serviceId", "skillLevel", "isPrimary", "customRate", "customDuration", "certifiedAt", "certifiedBy", "totalJobs", "avgRating", "createdAt") FROM stdin;
\.


--
-- Data for Name: ServiceWarrantyClaim; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ServiceWarrantyClaim" (id, "tenantId", "claimNumber", "originalJobId", "customerId", "customerName", "customerPhone", "claimType", "claimDate", "issueDescription", "originalServiceDate", "warrantyExpiryDate", status, "reviewedBy", "reviewedAt", "approvedAt", "rejectedAt", "rejectionReason", "newJobId", "resolutionType", "resolutionNotes", "costToCompany", "refundAmount", "photoUrls", "documentUrls", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ServiceZone; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ServiceZone" (id, "tenantId", name, city, areas, "centerLat", "centerLng", "radiusKm", "travelCharge", "emergencyChargeExtra", "minEmergencyChargeThreshold", "defaultTravelTimeMin", "activeHours", "isEmergencyServed", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Session" (id, "userId", "refreshTokenHash", "userAgent", "ipAddress", "expiresAt", "createdAt", "deviceFingerprint", "deviceName", "lastUsedAt", location) FROM stdin;
\.


--
-- Data for Name: Shop; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Shop" (id, "tenantId", name, address, phone, "isMain", "isActive", "createdAt", "updatedAt", type) FROM stdin;
\.


--
-- Data for Name: ShopStock; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."ShopStock" (id, "tenantId", "shopId", "productId", "variantId", stock, "lowStockAlert", "shopPrice", "shopCostPrice", "isActive", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SmsLog; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SmsLog" (id, "tenantId", "templateSlug", "toPhone", message, variables, status, "providerId", cost, "errorMessage", "retryCount", "sentAt", "deliveredAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SmsTemplate; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SmsTemplate" (id, slug, name, message, variables, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Staff; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Staff" (id, "tenantId", "shopId", "userId", "staffNumber", "fullName", "fatherName", gender, "dateOfBirth", cnic, phone, "altPhone", email, address, city, "emergencyName", "emergencyPhone", "emergencyRelation", designation, department, "joinDate", "endDate", status, "salaryType", "baseSalary", "workingHoursPerDay", "workingDaysPerMonth", "bankName", "accountNumber", iban, "avatarUrl", "cnicFrontUrl", "cnicBackUrl", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StaffDocument; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."StaffDocument" (id, "staffId", type, title, "fileUrl", "fileName", notes, "uploadedAt") FROM stdin;
\.


--
-- Data for Name: StaffLeave; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."StaffLeave" (id, "tenantId", "staffId", type, "startDate", "endDate", days, reason, status, "approvedById", "approvedAt", "rejectedReason", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StationeryProfile; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."StationeryProfile" (id, "tenantId", "productId", category, "subCategory", brand, color, size, weight, dimensions, material, "packSize", "packUnit", "itemsPerPack", "isFastMoving", "isSchoolItem", "isOfficeItem", "reorderLevel", "totalSold", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StockAdjustment; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."StockAdjustment" (id, "tenantId", "productId", "createdById", type, quantity, reason, note, "createdAt", "carpetRollId", "imeiId", "variantId") FROM stdin;
\.


--
-- Data for Name: StockMovement; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."StockMovement" (id, "tenantId", "productId", type, quantity, "balanceAfter", reference, note, "createdAt") FROM stdin;
\.


--
-- Data for Name: StockTransfer; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."StockTransfer" (id, "tenantId", "fromShopId", "toShopId", "createdById", "transferNumber", status, notes, "transferredAt", "receivedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StockTransferItem; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."StockTransferItem" (id, "transferId", "productId", quantity, "createdAt", "carpetRollId", notes, "variantId") FROM stdin;
\.


--
-- Data for Name: Subscription; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Subscription" (id, "tenantId", "planId", status, "interval", amount, currency, "trialEndsAt", "currentPeriodStart", "currentPeriodEnd", "cancelAtPeriodEnd", "cancelledAt", "stripeCustomerId", "stripeSubscriptionId", "autoRenew", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Supplier; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Supplier" (id, "tenantId", name, phone, email, address, notes, "isActive", "createdAt", "updatedAt", "accountNumber", "altPhone", area, "bankName", city, cnic, "contactPerson", iban, "logoUrl", ntn, "outstandingDue", "paymentTerms", "totalPurchased") FROM stdin;
\.


--
-- Data for Name: SystemSetting; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."SystemSetting" (id, key, value, category, description, "isPublic", "updatedById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Tag; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Tag" (id, "tenantId", name, color, "createdAt") FROM stdin;
\.


--
-- Data for Name: TemperatureLog; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."TemperatureLog" (id, "tenantId", "shopId", "logDate", temperature, humidity, unit, location, "isWithinRange", "minLimit", "maxLimit", "recordedBy", automated, notes, "alertSent", "createdAt") FROM stdin;
\.


--
-- Data for Name: Tenant; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Tenant" (id, name, slug, phone, country, currency, language, status, "createdAt", "updatedAt", "accountCredit", "referralCode", "referredById", address, "businessFeatures", "businessType", "defaultUnit") FROM stdin;
\.


--
-- Data for Name: TenantNote; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."TenantNote" (id, "tenantId", "authorId", title, content, "isPinned", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TenantSettings; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."TenantSettings" (id, "tenantId", "shopName", "shopAddress", "shopPhone", "shopEmail", "logoUrl", "taxRate", "taxNumber", "receiptFooter", "receiptHeader", "enableTax", "createdAt", "updatedAt", "allowCredit", "allowDiscount", "allowNegativeStock", "autoCreateCustomer", "autoLogoutMinutes", "autoPrintReceipt", "autoReorder", "bannerUrl", "brandColor", "businessType", "closeTime", "compactMode", "confirmBeforeCheckout", "creditOverdueDays", currency, "currencySymbol", "dailySummaryTime", "dateFormat", "defaultCreditLimit", "defaultLowStockAlert", "defaultMarkup", "defaultPaymentMethod", "emailNotifications", "enableBarcodeScanner", "enableLoyalty", "enableQuickKeys", "enableTwoFactor", "establishedDate", "expiryWarningDays", "firstDayOfWeek", "invoicePrefix", "invoiceStartNumber", language, "legalName", "loyaltyPointsPerRupee", "loyaltyRedemptionRate", "managerPin", "maxDiscountPercent", "maxLoginAttempts", "notifyDailySummary", "notifyLowStock", "notifyNewCustomer", "notifyNewSale", "notifyOutOfStock", "openTime", "printCopiesCount", "pushNotifications", "receiptShowBarcode", "receiptShowCustomer", "receiptShowLogo", "receiptShowQrCode", "receiptShowTax", "receiptSize", "reorderPoint", "requireCustomerForSale", "requirePinForDiscount", "requirePinForRefund", "requirePinForVoid", "roundPriceTo", "roundTotal", "shopCity", "shopPostalCode", "shopProvince", "shopWebsite", "shopWhatsapp", "showProductImages", "smsNotifications", "stockMethod", "taxInclusive", "taxLabel", theme, timezone, "trackExpiry", "whatsappNotifications", "workingDays", integrations, "receiptConfig") FROM stdin;
\.


--
-- Data for Name: Upload; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."Upload" (id, "tenantId", "uploaderId", filename, "originalName", "mimeType", size, path, url, purpose, metadata, "createdAt", "publicId", storage) FROM stdin;
\.


--
-- Data for Name: UsedPhone; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."UsedPhone" (id, "tenantId", "shopId", "usedPhoneCode", imei1, imei2, "serialNumber", brand, model, storage, ram, color, "modelYear", "ptaStatus", "ptaTaxPaid", condition, "conditionNotes", "hasOriginalBox", "hasOriginalCharger", "hasOriginalCable", "hasOriginalEarphones", "hasOriginalReceipt", "hasWarrantyLeft", "warrantyExpiryDate", source, "buybackPrice", "estimatedValue", "refurbishCost", "totalCost", "resalePrice", "finalSoldPrice", "fromCustomerId", "fromCustomerName", "fromCustomerPhone", "fromCustomerCnic", "cnicPhotoUrl", status, "soldToCustomerId", "soldSaleId", "soldAt", "imeiPhotoUrl", "devicePhotos", "receivedAt", "inspectedAt", notes, "createdById", "inspectedById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: UsedPhoneInspection; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."UsedPhoneInspection" (id, "usedPhoneId", "tenantId", "screenCondition", "bodyCondition", "cameraWorks", "speakerWorks", "microphoneWorks", "chargingPortWorks", "buttonsWork", "faceIdFingerprintWorks", "batteryHealth", "imeiUnlocked", "icloudUnlocked", "softwareIssues", "needsRepair", "estimatedRepairCost", "recommendedActions", "inspectedById", "inspectedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."User" (id, "tenantId", "fullName", email, phone, "passwordHash", role, "isActive", "emailVerified", "phoneVerified", "lastLoginAt", "createdAt", "updatedAt", "pushTokens", "avatarUrl", "emailVerifiedAt", "googleId", "passwordResetExpires", "passwordResetToken", "authProvider", permissions, "shopId") FROM stdin;
\.


--
-- Data for Name: VehicleMake; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."VehicleMake" (id, "tenantId", name, country, "logoUrl", "displayOrder", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: VehicleModel; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."VehicleModel" (id, "tenantId", "makeId", name, "vehicleType", "yearFrom", "yearTo", "engineOptions", "imageUrl", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: VehicleServiceReminder; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."VehicleServiceReminder" (id, "tenantId", "vehicleId", "reminderType", title, description, "dueDate", "dueOdometerKm", status, "sentAt", "acknowledgedAt", "doneAt", "autoCreated", "fromJobId", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: WaiterAssignment; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."WaiterAssignment" (id, "tenantId", "userId", "tableIds", section, "shiftStart", "shiftEnd", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: WorkshopJob; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."WorkshopJob" (id, "tenantId", "shopId", "jobNumber", status, priority, "jobType", "vehicleId", "registrationNumber", "makeName", "modelName", year, "odometerKm", "customerId", "customerName", "customerPhone", "customerComplaint", diagnosis, "workDescription", recommendations, "primaryMechanicId", "assistantMechanicIds", "bayNumber", "receivedAt", "promisedAt", "startedAt", "completedAt", "deliveredAt", "cancelledAt", "cancellationReason", "fuelLevel", "hasSpareTire", "hasToolkit", "externalDamages", "inspectionImageUrls", "testDriveRequired", "testDriveNotes", "testDriveDoneAt", "testDriveByMechanicId", "laborTotal", "partsTotal", "externalTotal", subtotal, discount, "taxAmount", total, "paidAmount", "paymentStatus", "warrantyStatus", "warrantyMonths", "warrantyKm", "warrantyExpiry", "warrantyNotes", "isInsuranceClaim", "insuranceProvider", "insuranceClaimNumber", "insuranceApproved", "insuranceAmount", "customerRating", "customerFeedback", "internalNotes", "imageUrls", "documentUrls", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: WorkshopJobExternal; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."WorkshopJobExternal" (id, "jobId", description, "vendorName", "vendorPhone", cost, markup, total, "sentAt", "receivedAt", status, notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: WorkshopJobLabor; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."WorkshopJobLabor" (id, "jobId", description, "jobType", "mechanicId", "mechanicName", hours, "ratePerHour", total, "commissionAmount", "isCompleted", "completedAt", notes, "displayOrder", "createdAt") FROM stdin;
\.


--
-- Data for Name: WorkshopJobPart; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."WorkshopJobPart" (id, "jobId", "productId", "variantId", "partName", "partNumber", quantity, "unitPrice", discount, total, condition, "isCustomerSupplied", "warrantyMonths", "warrantyKm", "installedByMechanicId", "installedAt", notes, "displayOrder", "createdAt") FROM stdin;
\.


--
-- Data for Name: WorkshopJobPayment; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."WorkshopJobPayment" (id, "jobId", amount, "paymentMethod", reference, notes, "receivedById", "paidAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: WorkshopJobStatusLog; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public."WorkshopJobStatusLog" (id, "jobId", "fromStatus", "toStatus", notes, "changedById", "createdAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
72b7040e-0536-402c-baa4-4380ebcd2403	009261b65788e935eaf7ce4b13dad4142697c1309a1c90f95d3c2a21a50d602a	2026-07-22 16:57:04.144721+05	20260508142628_add_email_sms_integration	\N	\N	2026-07-22 16:57:04.030101+05	1
9767b6fb-dc14-4217-b70b-6aef0e796200	6eec1209e11de530cad4e5132b91b2a22bd824fe7d6cde315284b467150e0e33	2026-07-22 16:57:02.871885+05	20260507201325_init_auth_foundation	\N	\N	2026-07-22 16:57:02.779914+05	1
4deb0fad-91b9-4b22-857e-cc75af02ccf1	744b8c975f348f8fa82009198b2d8e8be0a777a64525004a034f27bcea1b0a96	2026-07-22 16:57:02.905913+05	20260507212633_add_products_module	\N	\N	2026-07-22 16:57:02.87359+05	1
1f1930df-1ca2-4848-9764-1fbd43c703e7	d19292637e3384c3143c4cf1c7f80c5d14d6d3f07c5f00cf3b92caaf4aea4a09	2026-07-22 16:57:05.407538+05	20260615104156_add_salon_appointments	\N	\N	2026-07-22 16:57:05.377076+05	1
37c5a6b6-8aab-4df9-9e3b-276ee6840b96	bc1e3da43da1033286811d30223321b87cf234e661604ab802c817c7653632c3	2026-07-22 16:57:02.999134+05	20260507213831_add_customers_and_sales_pos	\N	\N	2026-07-22 16:57:02.907041+05	1
67a3ab31-4ba8-4338-a0ba-b47162726f04	6f02f85b711abe13fa3d6c8ad1b09c6414d449a5265d34ad3bd56d419985ea43	2026-07-22 16:57:04.17136+05	20260508145051_add_admin_notifications	\N	\N	2026-07-22 16:57:04.146268+05	1
af3ee322-37cf-4770-aaca-99ea3f2aa4f0	f88ef76bd2494f90103b8e0c79aeaa7cdf8fefdc85b58062cc9773d27724554f	2026-07-22 16:57:03.11087+05	20260507220635_add_suppliers_purchases_stock_movements	\N	\N	2026-07-22 16:57:03.001047+05	1
42a63b30-4768-4934-9e48-17e29773f89a	f6817cc1b06404e418d956e5cd60f09ac25c6ba86a327e0c8bf41fe313517a14	2026-07-22 16:57:03.226529+05	20260507221635_add_categories_expenses	\N	\N	2026-07-22 16:57:03.113962+05	1
64fc06ba-8ac1-4751-9c95-f85ca023a2e6	e04526cde61c32d05db7251e9fb3bd65b3876c14795683c0f584bb55c0020038	2026-07-22 16:57:04.479653+05	20260511101430_auth_flow_upgrade	\N	\N	2026-07-22 16:57:04.473484+05	1
42865940-48be-41c7-a773-e6ba653bcd32	ebcca2ce6902290ccf580df6a9dad2f09cfa22fb88e080f2adf843b96d1685e7	2026-07-22 16:57:03.269868+05	20260507223623_add_settings_and_barcode_index	\N	\N	2026-07-22 16:57:03.227627+05	1
517a36b2-9e89-45e5-9350-fef2c9e62545	29b0bf97452082b2cc63f4e1566df8d492be1d52ed9bff2c4376bc05d2bea10c	2026-07-22 16:57:04.370422+05	20260510092535_add_product_system_enhanced	\N	\N	2026-07-22 16:57:04.172418+05	1
57bf297c-fe1f-4e7e-a66c-deaf33ab2879	2de44fa45f3f06ad57c5e205ef3344bd6caee9cb99453ca80ef371ab29f0cec9	2026-07-22 16:57:03.358465+05	20260507225156_add_team_khata_adjustments	\N	\N	2026-07-22 16:57:03.272139+05	1
3056d678-7400-4e0f-81e7-6866d8ab5baa	1a725a2fdcf34f304df681d47638f5321b5c02c7a9306dc4bddf1fab8478e119	2026-07-22 16:57:03.533661+05	20260507231237_add_cash_register_shops_activity	\N	\N	2026-07-22 16:57:03.362157+05	1
f6a79a0b-807e-4419-ad03-a5eb018ca50d	a2413a82b1a8981561bbd4615147ada5905bc025575a366bc1b041c1cbd7b7cc	2026-07-22 16:57:03.761147+05	20260507233616_add_returns_discounts_loyalty	\N	\N	2026-07-22 16:57:03.53573+05	1
cc6d0016-3159-4540-bc2f-5a7a53fd1cf6	d9e4a07f6cc2d10fb0e7eb5e5caa80d1cfe1b018ced148eb1e7e7bdb9570fb68	2026-07-22 16:57:04.389731+05	20260510155051_customers_suppliers_pakistan_grade	\N	\N	2026-07-22 16:57:04.371406+05	1
eb02da69-f0d7-4530-bc85-6b17faf491d5	7638e037295b8409f573744c2cc4013931dff2b209a3285d70cab9d81c93b149	2026-07-22 16:57:03.907113+05	20260508094940_add_billing_subscriptions	\N	\N	2026-07-22 16:57:03.762328+05	1
7ae17c0c-a050-44c0-b394-8a61e072a067	856caa8e05464fcf8418adb7518712aa3e254932e881038d470273d6f109cbca	2026-07-22 16:57:03.944656+05	20260508100539_add_referrals_credits_stripe	\N	\N	2026-07-22 16:57:03.908106+05	1
0b4c11d3-423d-4100-89cf-4f602b4130b7	aebacf33dd31942fa43cbf02f391f12fb6d240a2f80add7db4353ec95f7ebdb9	2026-07-22 16:57:04.811347+05	20260614144504_add_business_config_to_tenant	\N	\N	2026-07-22 16:57:04.807413+05	1
3acd79ce-37af-40e8-9857-f42a616eb39c	8f1fe03a76027ad17bb42bce6fad1bb222ff3dbed8615413f88ec66a64e2218c	2026-07-22 16:57:04.028521+05	20260508132522_admin_full_control_modules	\N	\N	2026-07-22 16:57:03.946815+05	1
f81ae2cc-f85a-47ed-a3e0-bcc0389cc102	c27174400cc173bd0272a700c64a40645be9e7279f28fb3079a4bd6161fc0c4f	2026-07-22 16:57:04.54343+05	20260511111542_comprehensive_settings	\N	\N	2026-07-22 16:57:04.482675+05	1
1dd7c32f-d980-407b-9f3b-2c7cb08ab766	156eff9e31be89b4d3fbee8eb83862db5ab768b095e35185f8ba4dc0c269b046	2026-07-22 16:57:04.396662+05	20260510222521_add_push_tokens	\N	\N	2026-07-22 16:57:04.391574+05	1
23da60de-2e05-48d2-9fae-a9775df431ff	d60c799e0604d6373d887bc50c4bd254b94e551dd578c2802db09070d968861d	2026-07-22 16:57:04.406135+05	20260510225855_add_cloudinary_fields	\N	\N	2026-07-22 16:57:04.400224+05	1
a4f65cd3-4457-4d14-add4-95a15e77747f	f15ece737b9dfc4d9909bb11f5a79684722c9ce72450119cbddb0d5be642b764	2026-07-22 16:57:04.421221+05	20260511001127_auth_enhancements	\N	\N	2026-07-22 16:57:04.408437+05	1
fe260af7-c718-4ebf-8490-81b9a4ddde75	0ddcf0d1f73997ab3c517089b5bb83537e42130bec3aef4903c746080b149cda	2026-07-22 16:57:04.554196+05	20260526112638_add_user_permissions	\N	\N	2026-07-22 16:57:04.54534+05	1
61e709ee-6e55-439a-b79f-7be9945a4ab2	fcb7ef437a168b7fc559714719af569f2379a58d1e98afd573fb6651d6b9435f	2026-07-22 16:57:04.465164+05	20260511011049_add_onboarding_module	\N	\N	2026-07-22 16:57:04.422112+05	1
3b41b20d-6dbf-436f-89c7-b461d5fddc0f	98a825a8c440bbe0ec586e41b7b8a7d6069dd734794c2f56ee808d2c0d952b54	2026-07-22 16:57:04.472673+05	20260511012142_add_onboarding_module	\N	\N	2026-07-22 16:57:04.466511+05	1
ffe4564c-b7cc-4b9d-9b81-e4055619b971	6e8d9fe5a564097734e83d8d64f5e6d3615f1a9415805ea05b197078f05b4d7b	2026-07-22 16:57:04.693384+05	20260611090923_convert_quantities_to_float	\N	\N	2026-07-22 16:57:04.555224+05	1
b495ed94-9e88-45a9-983c-cfdb185ba81b	11812ee6339a60a34f654a17590aa7677997fb481041a3f4a6a3ebf2b8cdb9a8	2026-07-22 16:57:04.958404+05	20260614160757_add_imei_tracking	\N	\N	2026-07-22 16:57:04.812489+05	1
7ade1891-d0c9-40cf-9f24-6417d9815f37	fa72932aa60741db2753c9e8c98e3e6e841f785e99f2b9c1cb730ec98733e5db	2026-07-22 16:57:04.806265+05	20260614090404_add_staff_management	\N	\N	2026-07-22 16:57:04.695503+05	1
cf8d4779-e1f1-45bf-b316-bfbc64130dd4	0cd17388d5cc563924dfe4ec7d7f86222fbc8e72aef8ce9ec86455b104fddca7	2026-07-22 16:57:05.614116+05	20260616200120_add_carpet_inventory	\N	\N	2026-07-22 16:57:05.508165+05	1
dd30acc0-4ce8-4569-a108-85b535456eda	1f47a1c07d8fea823624c746a0a7ff116e80f505ddfdba32a9c8761241070dfb	2026-07-22 16:57:05.376098+05	20260615090857_add_restaurant_tables	\N	\N	2026-07-22 16:57:04.959282+05	1
29a2623e-df76-4021-89fc-583770bcb9d0	2ea633eced223647f1aca65de8ffdda77a89ade2889a349d0049d631b4be4bba	2026-07-22 16:57:05.507249+05	20260616133516_user_shop_link	\N	\N	2026-07-22 16:57:05.494617+05	1
b9e175be-9bc7-4049-8145-a71ce41254bf	10cfdc473a5d880895a8b9bc76965d20559619597e3008c92c3fb8f349b13f80	2026-07-22 16:57:05.457372+05	20260615104239_add_emi_plans	\N	\N	2026-07-22 16:57:05.408555+05	1
e1bc9deb-1284-497a-bc66-842edd5eec6d	d9e54311c799e345097d3bdc49ea1fee17185bc984ddad9b7aa41c9dd7cff315	2026-07-22 16:57:05.491679+05	20260616091350_add_shop_stock_multi_shop	\N	\N	2026-07-22 16:57:05.458149+05	1
8598b244-6eed-453f-b12d-df2a5828316d	98c9668c5454b75416ec3d1e773552b2d7b34edb4273731aee2416e1d223b0e5	2026-07-22 16:57:05.620862+05	20260617102639_add_sale_item_note	\N	\N	2026-07-22 16:57:05.615767+05	1
d5fa948a-3051-4975-84e3-8293cd799289	4c867cd48cdad1840706a714d06f51f23afe46d2cb05f259f5fbd87e1678ebdf	2026-07-22 16:57:05.626739+05	20260617173322_add_carpet_roll_to_transfers	\N	\N	2026-07-22 16:57:05.621938+05	1
54c2cbb1-92b1-45e4-9d0e-c46cb50682eb	5adac7b80b26403ed194ed49b839f40644b9175b0527158f5df349a73d43a41a	2026-07-22 16:57:05.63814+05	20260617180612_add_transfer_variant_and_notes	\N	\N	2026-07-22 16:57:05.627947+05	1
b7b01b2e-a96a-49d5-a08f-50597e671cc2	ac9b6ffd34919432afd754a49b0a417c5d9db7d676d0891a6aa72eeb72380d79	2026-07-22 16:57:05.651809+05	20260618180559_add_pta_status_to_imei	\N	\N	2026-07-22 16:57:05.640645+05	1
4e5da610-6985-4b53-8eb1-3e76d6434ede	e4870d86c13989d176f8ab90e92d5e8e83c0b5a977e0ad599c3102b05cd0ce14	2026-07-22 16:57:05.71872+05	20260618183225_add_used_phone_tradein	\N	\N	2026-07-22 16:57:05.653336+05	1
9c8276be-62b3-4ab7-b812-3d66f0873b8e	5d28c06f4f79c74db78639d1c98d2b15ea60e974d052b26d3fc4370615d442ce	2026-07-22 16:57:06.859882+05	20260714133638_add_garments_industry_full	\N	\N	2026-07-22 16:57:06.658344+05	1
1d6c298a-1e3e-4af7-8ec1-8e5cc6e2513c	166dd668904057aaa8d30e46443a544ea8aebdc72064d933df8b2c7a63a937ed	2026-07-22 16:57:05.824225+05	20260618195738_add_repair_service	\N	\N	2026-07-22 16:57:05.719826+05	1
62115333-613d-4714-9487-fc09e6a027cd	5d937cc2a2c8af9d863ca406c587eeaeda988bd2c14cb35c3b7c36c5f06ee199	2026-07-22 16:57:05.83725+05	20260621200105_add_session_device_tracking	\N	\N	2026-07-22 16:57:05.82504+05	1
b3a9d348-903a-4e46-b4a9-92493738a542	ae0982e8791942985ebb4b67af496c4a5838a33b47a64ead07fa7c6037f120c4	2026-07-22 16:57:09.381141+05	20260722120000_extend_enums_for_marketplace	\N	\N	2026-07-22 16:57:09.377125+05	1
24e2bba5-4c4e-4ae9-9c57-b5d23fe7704d	1a98c6faff2b27fd9093a8aff1897ef6e2a8c342ce2ab79db4ae85a060d4002a	2026-07-22 16:57:05.861855+05	20260621210427_add_login_history	\N	\N	2026-07-22 16:57:05.83869+05	1
af11f652-45f8-49f4-9360-37128a0d8f23	af96dad169dcfbbea3c8d7c2d6ae62c413646b860ec4347d993dbb7022638142	2026-07-22 16:57:07.013779+05	20260714171717_add_salon_industry_full	\N	\N	2026-07-22 16:57:06.860962+05	1
a027fe23-1e80-401f-9560-d6e6648fcaea	432240e89e326a082fe5104101900202c6732ab4121e9a5bd42ebf6a3d1eead7	2026-07-22 16:57:05.871604+05	20260627125344_add_carpet_length_inches	\N	\N	2026-07-22 16:57:05.863998+05	1
9cc75894-95dd-4ed8-9746-2facd0ea3654	de7682fb9b550cb24e9251281e30ab3fcae0a048b204fc285b94a20d6d2db813	2026-07-22 16:57:05.887045+05	20260629085522_add_carpet_movement_saleitem_relation	\N	\N	2026-07-22 16:57:05.872584+05	1
19e51924-ac70-4017-bddc-14dc252c90a0	1eeaba32f5afa7450a2aed4925ecf1ec38d6965e00c07862064505cd1b4b18de	2026-07-22 16:57:08.259369+05	20260716173048_add_hotel_industry_full	\N	\N	2026-07-22 16:57:08.097538+05	1
bc852f40-8017-42db-a7d2-52228ee8d076	f229b1bfafa0edfdf3b23563be55e1afb940c5407aedd4b6c1ec6606f447c7fb	2026-07-22 16:57:05.893377+05	20260701064050_add_sale_service_charges	\N	\N	2026-07-22 16:57:05.888995+05	1
8f08b73f-be99-48b1-9d0d-68747fea9b49	2cb9a115f338468d985619fa648d59e04fdfb4be5522bc63157d4a5f448304fc	2026-07-22 16:57:07.169389+05	20260714184526_add_auto_parts_workshop_industry	\N	\N	2026-07-22 16:57:07.015522+05	1
70ac5751-65c2-4efc-afeb-9fde792b275f	d6823de9a0d351f552e531db96a378e3f5dbc1a3d810a1a6fa16892604de814e	2026-07-22 16:57:05.901916+05	20260701090656_add_sale_item_internal_note	\N	\N	2026-07-22 16:57:05.895041+05	1
dba171ac-f6aa-4f8d-9dc5-ef831ae03db6	860ceaafec5b7e38ccc53d03e3d3a2cf190bccce9630b201d46a7c2550d78835	2026-07-22 16:57:05.97166+05	20260701091416_add_booking_advance_system	\N	\N	2026-07-22 16:57:05.903535+05	1
48c3e93f-5ec4-433a-bacd-37ad448305c3	e1f1257610796dd534a76f87f6302153c0d32b37e39ddf76f69135c8d2d58b85	2026-07-22 16:57:06.019723+05	20260708081319_add_variant_roll_imei_to_adjustments	\N	\N	2026-07-22 16:57:05.973389+05	1
fa0ac64e-ef37-40ba-9b1d-1c4a2d806a4b	bbb5403d632b9b004333742e72e12e4b5b8fc7676983e62829342b3200ddf32b	2026-07-22 16:57:07.31251+05	20260715164110_add_bookstore_stationery_industry	\N	\N	2026-07-22 16:57:07.171515+05	1
a242183d-210a-4f04-8b27-b52c4f81fa23	297935969bd7ec4fd3631341d73e2cba36156c4ff13de5328efebe9e8915b160	2026-07-22 16:57:06.237195+05	20260713145034_add_retail_industry_full	\N	\N	2026-07-22 16:57:06.021675+05	1
64fc3b1e-edcb-4440-b961-f46c64b1798c	4b0dd3ac9a8b709bb2ef2d1c62dc1aeb4a529ee016459426a3d0cce4e765820f	2026-07-22 16:57:06.477276+05	20260713185924_add_restaurant_industry_full	\N	\N	2026-07-22 16:57:06.238953+05	1
00b2aaee-cf40-468d-b6af-9e5bfcaa1b3a	e8e0df14c79345d593c0ee88201be1e7db329bb7017cc1300342a1f09c03738b	2026-07-22 16:57:09.358352+05	20260720085812_add_services_industry_full	\N	\N	2026-07-22 16:57:09.127467+05	1
e59bb39b-a705-45db-b6ba-482510a2f1b6	1aa56fc9c2c8532ec88492893b53c9bff21b04b0038dbd49125b66cfc4d57d37	2026-07-22 16:57:06.656682+05	20260714075605_add_pharmacy_industry_full	\N	\N	2026-07-22 16:57:06.478496+05	1
33e907c5-4d89-470b-b413-f1b0f51e89a3	9a7d6114f88fb1a73b8fceb7bbc2ba2c6045b183e95890c2925727c8c17432ab	2026-07-22 16:57:08.47533+05	20260720074657_add_bakery_industry_full	\N	\N	2026-07-22 16:57:08.266391+05	1
13787e72-d38c-4354-84cf-0384a01b97cb	d1626b807b849831304b4edfd276d0811853c9e86506028d301373ba2d23ee0b	2026-07-22 16:57:07.476495+05	20260715192433_add_hardware_industry_full	\N	\N	2026-07-22 16:57:07.313831+05	1
19321c30-c4f2-4105-a5e0-d09a58d0a852	d55d8d61328e04aa04c447ccc8d0e323f1556a4d998a140fd1111f1f05fd3892	2026-07-22 16:57:07.619678+05	20260715193937_add_meat_industry_full	\N	\N	2026-07-22 16:57:07.47739+05	1
db3972e0-31e0-4e3d-b026-5d5bb466e910	fb22cc3d32a83a099b01c81281f9ab9af30029511f1648a87c5acea1e784f3d3	2026-07-22 16:57:07.726515+05	20260715205851_add_agri_industry_full	\N	\N	2026-07-22 16:57:07.620887+05	1
6414888f-feb9-4bcf-956c-41d2920451e9	059710a7883d6dc0affcbb733c6661189a6017167fc4f1f9ba5dddb0534f4df7	2026-07-22 16:57:08.764274+05	20260720075237_add_gym_industry_full	\N	\N	2026-07-22 16:57:08.476743+05	1
7c874e07-26d7-43ee-b38a-ac3306cd803f	a9b9ae830f5fa21bfaa695016cddc287cefa33358cd7e16ad2ded0e6ec80a00d	2026-07-22 16:57:07.847934+05	20260716092605_add_dairy_industry_full	\N	\N	2026-07-22 16:57:07.727873+05	1
6ced338a-d6ba-4938-a143-66f4334a753b	59dfa14b37c045623617b3efdbf5dc97e03010372c543f12b453aa2477250c46	2026-07-22 16:57:08.091989+05	20260716102104_add_jewelry_industry_full	\N	\N	2026-07-22 16:57:07.861802+05	1
1dd52ebc-4972-4dfd-9a3e-efaec41f70b3	9a0d38023c6bee57be2912a7fa54c701665322b0d7514681c5e871d417c180c3	2026-07-22 16:57:08.795074+05	20260720080859_add_bakery_pound_sizes	\N	\N	2026-07-22 16:57:08.767798+05	1
cc00a04e-8657-4a4d-b312-9db2a42fca63	a679403df2af4a1da375058db72377b26e1de42b8fc9221e4eb301ee1a1170f7	2026-07-22 16:57:09.372652+05	20260720120708_expand_onboarding_full	\N	\N	2026-07-22 16:57:09.359072+05	1
8c2269a8-2aab-4849-a5be-2b05fb450bf0	db7be0241e3e8bafca443f933bee56358cbec94b1811c402a564a36c2a7f454d	2026-07-22 16:57:09.125852+05	20260720084728_add_cclinic_industry_full	\N	\N	2026-07-22 16:57:08.798898+05	1
9b6dea0f-82c8-4ff4-a36d-e327b9453845	1c1053da996c363c5a71323d6711afa19e607e1b155e383359cb67bf984b419b	2026-07-22 16:57:09.376256+05	20260720141907_add_settings_integrations	\N	\N	2026-07-22 16:57:09.373525+05	1
2d3e87c9-09a3-4036-9d9c-19a5088425a7	97fa1f7cdc62e3ff7d650901472c0fc0a1b087ba57a25c0731a3310b4a4d4f62	2026-07-22 16:58:35.061568+05	20260722115834_add_marketplace_models	\N	\N	2026-07-22 16:58:34.672748+05	1
\.


--
-- Data for Name: auction_bids; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.auction_bids (id, "auctionId", "customerId", amount, "isAutoBid", "maxAutoBid", "isRetracted", "retractedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: auctions; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.auctions (id, "shopId", "tenantId", "productId", "variantId", title, description, "imageUrls", "videoUrl", "startingPrice", "reservePrice", "bidIncrement", "currentPrice", "bidCount", status, "startsAt", "endsAt", "autoExtendOnBid", "extendedUntil", "winnerId", "winningBidId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: bargain_messages; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.bargain_messages (id, "bargainId", "senderType", "customerId", message, "offeredPrice", action, "createdAt") FROM stdin;
\.


--
-- Data for Name: bargains; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.bargains (id, "customerId", "shopId", "tenantId", "productId", "variantId", "productName", "originalPrice", "customerOffer", "currentOffer", "finalPrice", quantity, status, "offerCount", "maxOffers", "expiresAt", "orderId", "convertedAt", "rejectedBy", "rejectedAt", "rejectReason", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: customer_addresses; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.customer_addresses (id, "customerId", label, "fullName", phone, "addressLine1", "addressLine2", landmark, city, area, province, "postalCode", country, lat, lng, "addressType", "isDefault", "deliveryNotes", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: customer_follows_shop; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.customer_follows_shop (id, "customerId", "shopId", "createdAt") FROM stdin;
\.


--
-- Data for Name: customer_login_history; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.customer_login_history (id, "customerId", phone, email, success, "failureReason", "ipAddress", "userAgent", "deviceName", location, "isNewDevice", "createdAt") FROM stdin;
\.


--
-- Data for Name: customer_notifications; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.customer_notifications (id, "customerId", type, channel, title, body, "imageUrl", "actionUrl", data, "isRead", "readAt", "sentAt", "pushSent", "smsSent", "emailSent", "whatsappSent", "createdAt") FROM stdin;
\.


--
-- Data for Name: customer_otp_codes; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.customer_otp_codes (id, "customerId", phone, email, code, purpose, attempts, "maxAttempts", "expiresAt", "verifiedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: customer_push_tokens; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.customer_push_tokens (id, "customerId", token, platform, "deviceInfo", "isActive", "lastUsedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: customer_saved_cards; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.customer_saved_cards (id, "customerId", "cardBrand", last4, "expiryMonth", "expiryYear", "holderName", "gatewayToken", "gatewayProvider", "isDefault", "createdAt") FROM stdin;
\.


--
-- Data for Name: customer_search_history; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.customer_search_history (id, "customerId", query, "resultCount", filters, "createdAt") FROM stdin;
\.


--
-- Data for Name: customer_sessions; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.customer_sessions (id, "customerId", "refreshTokenHash", "userAgent", "ipAddress", "deviceFingerprint", "deviceName", location, "lastUsedAt", "expiresAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: customer_wallet_txns; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.customer_wallet_txns (id, "customerId", type, amount, "balanceAfter", reason, "referenceId", "referenceType", metadata, "createdAt") FROM stdin;
\.


--
-- Data for Name: group_buy_participants; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.group_buy_participants (id, "groupBuyId", "customerId", quantity, amount, "orderId", "joinedAt") FROM stdin;
\.


--
-- Data for Name: group_buys; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.group_buys (id, "shopId", "tenantId", "productId", "variantId", "productName", "imageUrl", "regularPrice", "groupPrice", "minParticipants", "maxParticipants", "currentCount", status, "startsAt", "expiresAt", "reachedTargetAt", "cancelledReason", metadata, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: live_shop_messages; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.live_shop_messages (id, "liveShopId", "senderType", "customerId", message, "isPinned", "isHidden", "createdAt") FROM stdin;
\.


--
-- Data for Name: live_shop_viewers; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.live_shop_viewers (id, "liveShopId", "customerId", "joinedAt", "leftAt", "watchTimeSec") FROM stdin;
\.


--
-- Data for Name: live_shops; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.live_shops (id, "shopId", "tenantId", title, description, "coverImageUrl", "streamUrl", "streamKey", "recordingUrl", status, "scheduledAt", "startedAt", "endedAt", "durationSeconds", "peakViewerCount", "totalViewers", "totalMessages", "totalOrders", "totalRevenue", "featuredProductIds", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: marketplace_cart_lines; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.marketplace_cart_lines (id, "cartId", "shopId", "productId", "variantId", "productName", "variantName", "imageUrl", "unitPrice", quantity, notes, modifiers, "bargainId", "groupBuyId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: marketplace_carts; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.marketplace_carts (id, "customerId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: marketplace_customers; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.marketplace_customers (id, phone, "phoneVerified", "phoneVerifiedAt", email, "emailVerified", "emailVerifiedAt", "passwordHash", "fullName", "displayName", "avatarUrl", "dateOfBirth", gender, "authProvider", "googleId", "facebookId", "appleId", language, timezone, currency, "loyaltyPoints", "walletBalance", "referralCode", "referredById", "defaultAddressId", "lastKnownLat", "lastKnownLng", "lastKnownCity", "marketingEmails", "marketingSms", "marketingPush", "marketingWhatsapp", "isActive", "isBanned", "banReason", "bannedAt", "passwordResetToken", "passwordResetExpires", "lastLoginAt", "lastActiveAt", "registeredIp", "deviceInfo", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: marketplace_order_items; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.marketplace_order_items (id, "orderId", "productId", "variantId", "productName", "variantName", "imageUrl", "unitPrice", quantity, discount, total, notes, modifiers, "bargainId") FROM stdin;
\.


--
-- Data for Name: marketplace_orders; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.marketplace_orders (id, "orderNumber", "customerId", "shopId", "tenantId", status, "deliveryType", subtotal, discount, "deliveryFee", "serviceFee", "taxAmount", "tipAmount", "walletUsed", "loyaltyPointsUsed", "loyaltyDiscount", total, currency, "paymentMethod", "paymentStatus", "paymentGatewayRef", "paidAt", "addressId", "addressSnapshot", "deliverySlotStart", "deliverySlotEnd", "estimatedDeliveryAt", "actualDeliveryAt", "riderId", "riderName", "riderPhone", "couponCode", "couponDiscount", "customerNotes", "shopNotes", "cancelReason", "cancelledBy", "cancelledAt", "isRated", "shopRating", "riderRating", source, "isGuestOrder", "splitPaymentGroupId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: marketplace_reviews; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.marketplace_reviews (id, "customerId", "reviewType", "orderId", "productId", "shopId", "riderId", rating, title, comment, "imageUrls", "videoUrl", "qualityRating", "packagingRating", "deliveryRating", "valueRating", "isVerifiedPurchase", "isApproved", "isHidden", "hiddenReason", "moderatedBy", "moderatedAt", "helpfulCount", "unhelpfulCount", "replyFromShop", "replyAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: order_status_history; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.order_status_history (id, "orderId", status, note, "changedBy", "changedAt") FROM stdin;
\.


--
-- Data for Name: product_marketplace_profiles; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.product_marketplace_profiles (id, "productId", "shopId", "tenantId", "isListedOnMarketplace", "listedAt", "publicName", "publicDescription", "publicPrice", "compareAtPrice", "publicImages", "publicVideos", "marketplaceCategory", "marketplaceSubCategory", tags, "isAvailable", "availableFrom", "availableUntil", "totalSold", "ratingAverage", "ratingCount", "viewCount", "wishlistCount", "bargainEnabled", "bargainMinPrice", "groupBuyEnabled", "auctionEnabled", "metaTitle", "metaDescription", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: product_views; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.product_views (id, "customerId", "productId", "shopId", "viewedAt", source) FROM stdin;
\.


--
-- Data for Name: review_votes; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.review_votes (id, "reviewId", "customerId", "isHelpful", "createdAt") FROM stdin;
\.


--
-- Data for Name: shop_marketplace_profiles; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.shop_marketplace_profiles (id, "shopId", "tenantId", "publicName", slug, tagline, description, "logoUrl", "coverUrl", "galleryUrls", "publicPhone", "publicEmail", "websiteUrl", "whatsappNumber", "addressLine1", "addressLine2", city, area, province, lat, lng, industry, "subCategories", "isListedOnMarketplace", "listedAt", "isOpen", "isPaused", "pausedReason", "verificationLevel", "verifiedAt", "verifiedBy", "cnicNumber", "businessRegNumber", "taxNumber", documents, "ratingAverage", "ratingCount", "totalOrders", "completedOrders", "cancelledOrders", "totalRevenue", "followerCount", "avgResponseTimeMinutes", "avgPreparationMinutes", "offersDelivery", "offersPickup", "offersDineIn", "deliveryRadiusKm", "deliveryFee", "freeDeliveryAbove", "minOrderAmount", "maxOrderAmount", "estimatedDeliveryMinutes", "estimatedPickupMinutes", "acceptsCod", "acceptsCard", "acceptsJazzcash", "acceptsEasypaisa", "acceptsRaast", "acceptsWallet", "bargainEnabled", "bargainMinPercent", "groupBuyEnabled", "auctionEnabled", "liveShopEnabled", "workingHours", "holidayDates", "prayerTimeMode", "ramzanScheduleActive", "metaTitle", "metaDescription", keywords, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: support_messages; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.support_messages (id, "ticketId", "senderType", "senderId", "customerId", message, attachments, "isInternal", "createdAt") FROM stdin;
\.


--
-- Data for Name: support_tickets; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.support_tickets (id, "ticketNumber", "customerId", "orderId", "shopId", subject, category, priority, status, "assignedTo", "resolvedAt", "closedAt", rating, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: wishlist_items; Type: TABLE DATA; Schema: public; Owner: abubakarmalik
--

COPY public.wishlist_items (id, "customerId", "productId", "shopId", "addedAt", notes) FROM stdin;
\.


--
-- Name: ActivityLog ActivityLog_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_pkey" PRIMARY KEY (id);


--
-- Name: AdminNotification AdminNotification_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."AdminNotification"
    ADD CONSTRAINT "AdminNotification_pkey" PRIMARY KEY (id);


--
-- Name: AgriBulkOrderItem AgriBulkOrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."AgriBulkOrderItem"
    ADD CONSTRAINT "AgriBulkOrderItem_pkey" PRIMARY KEY (id);


--
-- Name: AgriBulkOrder AgriBulkOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."AgriBulkOrder"
    ADD CONSTRAINT "AgriBulkOrder_pkey" PRIMARY KEY (id);


--
-- Name: AgriCropAdvisory AgriCropAdvisory_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."AgriCropAdvisory"
    ADD CONSTRAINT "AgriCropAdvisory_pkey" PRIMARY KEY (id);


--
-- Name: AgriFarmerLedger AgriFarmerLedger_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."AgriFarmerLedger"
    ADD CONSTRAINT "AgriFarmerLedger_pkey" PRIMARY KEY (id);


--
-- Name: AgriFarmer AgriFarmer_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."AgriFarmer"
    ADD CONSTRAINT "AgriFarmer_pkey" PRIMARY KEY (id);


--
-- Name: AgriProductProfile AgriProductProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."AgriProductProfile"
    ADD CONSTRAINT "AgriProductProfile_pkey" PRIMARY KEY (id);


--
-- Name: AgriSeasonalPlan AgriSeasonalPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."AgriSeasonalPlan"
    ADD CONSTRAINT "AgriSeasonalPlan_pkey" PRIMARY KEY (id);


--
-- Name: AgriSubsidyClaim AgriSubsidyClaim_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."AgriSubsidyClaim"
    ADD CONSTRAINT "AgriSubsidyClaim_pkey" PRIMARY KEY (id);


--
-- Name: ArtSupplyProfile ArtSupplyProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ArtSupplyProfile"
    ADD CONSTRAINT "ArtSupplyProfile_pkey" PRIMARY KEY (id);


--
-- Name: Attendance Attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_pkey" PRIMARY KEY (id);


--
-- Name: Author Author_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Author"
    ADD CONSTRAINT "Author_pkey" PRIMARY KEY (id);


--
-- Name: AutoPartProfile AutoPartProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."AutoPartProfile"
    ADD CONSTRAINT "AutoPartProfile_pkey" PRIMARY KEY (id);


--
-- Name: BakeryBulkOrder BakeryBulkOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BakeryBulkOrder"
    ADD CONSTRAINT "BakeryBulkOrder_pkey" PRIMARY KEY (id);


--
-- Name: BakeryCakeOrder BakeryCakeOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BakeryCakeOrder"
    ADD CONSTRAINT "BakeryCakeOrder_pkey" PRIMARY KEY (id);


--
-- Name: BakeryFreshnessLog BakeryFreshnessLog_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BakeryFreshnessLog"
    ADD CONSTRAINT "BakeryFreshnessLog_pkey" PRIMARY KEY (id);


--
-- Name: BakeryIngredientTransaction BakeryIngredientTransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BakeryIngredientTransaction"
    ADD CONSTRAINT "BakeryIngredientTransaction_pkey" PRIMARY KEY (id);


--
-- Name: BakeryIngredient BakeryIngredient_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BakeryIngredient"
    ADD CONSTRAINT "BakeryIngredient_pkey" PRIMARY KEY (id);


--
-- Name: BakeryProductProfile BakeryProductProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BakeryProductProfile"
    ADD CONSTRAINT "BakeryProductProfile_pkey" PRIMARY KEY (id);


--
-- Name: BakeryProductionItem BakeryProductionItem_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BakeryProductionItem"
    ADD CONSTRAINT "BakeryProductionItem_pkey" PRIMARY KEY (id);


--
-- Name: BakeryProductionPlan BakeryProductionPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BakeryProductionPlan"
    ADD CONSTRAINT "BakeryProductionPlan_pkey" PRIMARY KEY (id);


--
-- Name: BarcodeLabelBatch BarcodeLabelBatch_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BarcodeLabelBatch"
    ADD CONSTRAINT "BarcodeLabelBatch_pkey" PRIMARY KEY (id);


--
-- Name: BookAuthor BookAuthor_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BookAuthor"
    ADD CONSTRAINT "BookAuthor_pkey" PRIMARY KEY (id);


--
-- Name: BookProfile BookProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BookProfile"
    ADD CONSTRAINT "BookProfile_pkey" PRIMARY KEY (id);


--
-- Name: BookRental BookRental_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BookRental"
    ADD CONSTRAINT "BookRental_pkey" PRIMARY KEY (id);


--
-- Name: BookingItem BookingItem_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BookingItem"
    ADD CONSTRAINT "BookingItem_pkey" PRIMARY KEY (id);


--
-- Name: BookingPayment BookingPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BookingPayment"
    ADD CONSTRAINT "BookingPayment_pkey" PRIMARY KEY (id);


--
-- Name: Booking Booking_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_pkey" PRIMARY KEY (id);


--
-- Name: Brand Brand_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Brand"
    ADD CONSTRAINT "Brand_pkey" PRIMARY KEY (id);


--
-- Name: BroadcastNotification BroadcastNotification_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BroadcastNotification"
    ADD CONSTRAINT "BroadcastNotification_pkey" PRIMARY KEY (id);


--
-- Name: BulkImportJob BulkImportJob_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BulkImportJob"
    ADD CONSTRAINT "BulkImportJob_pkey" PRIMARY KEY (id);


--
-- Name: CarpetCutPiece CarpetCutPiece_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CarpetCutPiece"
    ADD CONSTRAINT "CarpetCutPiece_pkey" PRIMARY KEY (id);


--
-- Name: CarpetRollMovement CarpetRollMovement_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CarpetRollMovement"
    ADD CONSTRAINT "CarpetRollMovement_pkey" PRIMARY KEY (id);


--
-- Name: CarpetRoll CarpetRoll_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CarpetRoll"
    ADD CONSTRAINT "CarpetRoll_pkey" PRIMARY KEY (id);


--
-- Name: CashRegister CashRegister_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CashRegister"
    ADD CONSTRAINT "CashRegister_pkey" PRIMARY KEY (id);


--
-- Name: CashTransaction CashTransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CashTransaction"
    ADD CONSTRAINT "CashTransaction_pkey" PRIMARY KEY (id);


--
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


--
-- Name: ClinicAntenatalVisit ClinicAntenatalVisit_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicAntenatalVisit"
    ADD CONSTRAINT "ClinicAntenatalVisit_pkey" PRIMARY KEY (id);


--
-- Name: ClinicAppointment ClinicAppointment_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicAppointment"
    ADD CONSTRAINT "ClinicAppointment_pkey" PRIMARY KEY (id);


--
-- Name: ClinicDentalRecord ClinicDentalRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicDentalRecord"
    ADD CONSTRAINT "ClinicDentalRecord_pkey" PRIMARY KEY (id);


--
-- Name: ClinicDoctorProfile ClinicDoctorProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicDoctorProfile"
    ADD CONSTRAINT "ClinicDoctorProfile_pkey" PRIMARY KEY (id);


--
-- Name: ClinicEncounter ClinicEncounter_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicEncounter"
    ADD CONSTRAINT "ClinicEncounter_pkey" PRIMARY KEY (id);


--
-- Name: ClinicLabOrder ClinicLabOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicLabOrder"
    ADD CONSTRAINT "ClinicLabOrder_pkey" PRIMARY KEY (id);


--
-- Name: ClinicLabTest ClinicLabTest_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicLabTest"
    ADD CONSTRAINT "ClinicLabTest_pkey" PRIMARY KEY (id);


--
-- Name: ClinicPatientProfile ClinicPatientProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicPatientProfile"
    ADD CONSTRAINT "ClinicPatientProfile_pkey" PRIMARY KEY (id);


--
-- Name: ClinicPhysioSession ClinicPhysioSession_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicPhysioSession"
    ADD CONSTRAINT "ClinicPhysioSession_pkey" PRIMARY KEY (id);


--
-- Name: ClinicPrescriptionItem ClinicPrescriptionItem_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicPrescriptionItem"
    ADD CONSTRAINT "ClinicPrescriptionItem_pkey" PRIMARY KEY (id);


--
-- Name: ClinicPrescription ClinicPrescription_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicPrescription"
    ADD CONSTRAINT "ClinicPrescription_pkey" PRIMARY KEY (id);


--
-- Name: ClinicReferral ClinicReferral_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicReferral"
    ADD CONSTRAINT "ClinicReferral_pkey" PRIMARY KEY (id);


--
-- Name: ClinicRoom ClinicRoom_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicRoom"
    ADD CONSTRAINT "ClinicRoom_pkey" PRIMARY KEY (id);


--
-- Name: ClinicService ClinicService_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicService"
    ADD CONSTRAINT "ClinicService_pkey" PRIMARY KEY (id);


--
-- Name: ClinicVaccination ClinicVaccination_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicVaccination"
    ADD CONSTRAINT "ClinicVaccination_pkey" PRIMARY KEY (id);


--
-- Name: ClinicVitals ClinicVitals_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicVitals"
    ADD CONSTRAINT "ClinicVitals_pkey" PRIMARY KEY (id);


--
-- Name: ControlledSubstanceLog ControlledSubstanceLog_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ControlledSubstanceLog"
    ADD CONSTRAINT "ControlledSubstanceLog_pkey" PRIMARY KEY (id);


--
-- Name: CreditTransaction CreditTransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CreditTransaction"
    ADD CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY (id);


--
-- Name: CustomerLedger CustomerLedger_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CustomerLedger"
    ADD CONSTRAINT "CustomerLedger_pkey" PRIMARY KEY (id);


--
-- Name: CustomerReadingListItem CustomerReadingListItem_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CustomerReadingListItem"
    ADD CONSTRAINT "CustomerReadingListItem_pkey" PRIMARY KEY (id);


--
-- Name: CustomerReadingList CustomerReadingList_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CustomerReadingList"
    ADD CONSTRAINT "CustomerReadingList_pkey" PRIMARY KEY (id);


--
-- Name: CustomerVehicle CustomerVehicle_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CustomerVehicle"
    ADD CONSTRAINT "CustomerVehicle_pkey" PRIMARY KEY (id);


--
-- Name: Customer Customer_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_pkey" PRIMARY KEY (id);


--
-- Name: DairyCustomer DairyCustomer_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DairyCustomer"
    ADD CONSTRAINT "DairyCustomer_pkey" PRIMARY KEY (id);


--
-- Name: DairyDelivery DairyDelivery_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DairyDelivery"
    ADD CONSTRAINT "DairyDelivery_pkey" PRIMARY KEY (id);


--
-- Name: DairyFarmerSupply DairyFarmerSupply_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DairyFarmerSupply"
    ADD CONSTRAINT "DairyFarmerSupply_pkey" PRIMARY KEY (id);


--
-- Name: DairyFarmer DairyFarmer_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DairyFarmer"
    ADD CONSTRAINT "DairyFarmer_pkey" PRIMARY KEY (id);


--
-- Name: DairyMonthlyBill DairyMonthlyBill_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DairyMonthlyBill"
    ADD CONSTRAINT "DairyMonthlyBill_pkey" PRIMARY KEY (id);


--
-- Name: DairyProduct DairyProduct_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DairyProduct"
    ADD CONSTRAINT "DairyProduct_pkey" PRIMARY KEY (id);


--
-- Name: DairyQualityTest DairyQualityTest_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DairyQualityTest"
    ADD CONSTRAINT "DairyQualityTest_pkey" PRIMARY KEY (id);


--
-- Name: DairyRoute DairyRoute_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DairyRoute"
    ADD CONSTRAINT "DairyRoute_pkey" PRIMARY KEY (id);


--
-- Name: DamageLog DamageLog_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DamageLog"
    ADD CONSTRAINT "DamageLog_pkey" PRIMARY KEY (id);


--
-- Name: DeliveryTracking DeliveryTracking_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DeliveryTracking"
    ADD CONSTRAINT "DeliveryTracking_pkey" PRIMARY KEY (id);


--
-- Name: DiscountCode DiscountCode_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DiscountCode"
    ADD CONSTRAINT "DiscountCode_pkey" PRIMARY KEY (id);


--
-- Name: Doctor Doctor_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Doctor"
    ADD CONSTRAINT "Doctor_pkey" PRIMARY KEY (id);


--
-- Name: DrugInteraction DrugInteraction_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DrugInteraction"
    ADD CONSTRAINT "DrugInteraction_pkey" PRIMARY KEY (id);


--
-- Name: EmailLog EmailLog_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."EmailLog"
    ADD CONSTRAINT "EmailLog_pkey" PRIMARY KEY (id);


--
-- Name: EmailTemplate EmailTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."EmailTemplate"
    ADD CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY (id);


--
-- Name: EmiInstallment EmiInstallment_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."EmiInstallment"
    ADD CONSTRAINT "EmiInstallment_pkey" PRIMARY KEY (id);


--
-- Name: EmiPlan EmiPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."EmiPlan"
    ADD CONSTRAINT "EmiPlan_pkey" PRIMARY KEY (id);


--
-- Name: ExpenseCategory ExpenseCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ExpenseCategory"
    ADD CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY (id);


--
-- Name: Expense Expense_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_pkey" PRIMARY KEY (id);


--
-- Name: GarmentAlterationTicket GarmentAlterationTicket_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GarmentAlterationTicket"
    ADD CONSTRAINT "GarmentAlterationTicket_pkey" PRIMARY KEY (id);


--
-- Name: GarmentCollection GarmentCollection_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GarmentCollection"
    ADD CONSTRAINT "GarmentCollection_pkey" PRIMARY KEY (id);


--
-- Name: GarmentLayawayInstallment GarmentLayawayInstallment_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GarmentLayawayInstallment"
    ADD CONSTRAINT "GarmentLayawayInstallment_pkey" PRIMARY KEY (id);


--
-- Name: GarmentLayawayPlan GarmentLayawayPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GarmentLayawayPlan"
    ADD CONSTRAINT "GarmentLayawayPlan_pkey" PRIMARY KEY (id);


--
-- Name: GarmentMeasurementProfile GarmentMeasurementProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GarmentMeasurementProfile"
    ADD CONSTRAINT "GarmentMeasurementProfile_pkey" PRIMARY KEY (id);


--
-- Name: GarmentProductProfile GarmentProductProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GarmentProductProfile"
    ADD CONSTRAINT "GarmentProductProfile_pkey" PRIMARY KEY (id);


--
-- Name: GarmentReservation GarmentReservation_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GarmentReservation"
    ADD CONSTRAINT "GarmentReservation_pkey" PRIMARY KEY (id);


--
-- Name: GarmentSizeChart GarmentSizeChart_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GarmentSizeChart"
    ADD CONSTRAINT "GarmentSizeChart_pkey" PRIMARY KEY (id);


--
-- Name: GarmentTailoringOrderItem GarmentTailoringOrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GarmentTailoringOrderItem"
    ADD CONSTRAINT "GarmentTailoringOrderItem_pkey" PRIMARY KEY (id);


--
-- Name: GarmentTailoringOrder GarmentTailoringOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GarmentTailoringOrder"
    ADD CONSTRAINT "GarmentTailoringOrder_pkey" PRIMARY KEY (id);


--
-- Name: GarmentTailoringPayment GarmentTailoringPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GarmentTailoringPayment"
    ADD CONSTRAINT "GarmentTailoringPayment_pkey" PRIMARY KEY (id);


--
-- Name: GarmentVariantProfile GarmentVariantProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GarmentVariantProfile"
    ADD CONSTRAINT "GarmentVariantProfile_pkey" PRIMARY KEY (id);


--
-- Name: GymAttendance GymAttendance_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymAttendance"
    ADD CONSTRAINT "GymAttendance_pkey" PRIMARY KEY (id);


--
-- Name: GymBodyMeasurement GymBodyMeasurement_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymBodyMeasurement"
    ADD CONSTRAINT "GymBodyMeasurement_pkey" PRIMARY KEY (id);


--
-- Name: GymClassBooking GymClassBooking_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymClassBooking"
    ADD CONSTRAINT "GymClassBooking_pkey" PRIMARY KEY (id);


--
-- Name: GymClass GymClass_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymClass"
    ADD CONSTRAINT "GymClass_pkey" PRIMARY KEY (id);


--
-- Name: GymDietPlan GymDietPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymDietPlan"
    ADD CONSTRAINT "GymDietPlan_pkey" PRIMARY KEY (id);


--
-- Name: GymEquipment GymEquipment_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymEquipment"
    ADD CONSTRAINT "GymEquipment_pkey" PRIMARY KEY (id);


--
-- Name: GymMemberMembership GymMemberMembership_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymMemberMembership"
    ADD CONSTRAINT "GymMemberMembership_pkey" PRIMARY KEY (id);


--
-- Name: GymMember GymMember_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymMember"
    ADD CONSTRAINT "GymMember_pkey" PRIMARY KEY (id);


--
-- Name: GymMembershipPlan GymMembershipPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymMembershipPlan"
    ADD CONSTRAINT "GymMembershipPlan_pkey" PRIMARY KEY (id);


--
-- Name: GymPersonalTraining GymPersonalTraining_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymPersonalTraining"
    ADD CONSTRAINT "GymPersonalTraining_pkey" PRIMARY KEY (id);


--
-- Name: GymTrainer GymTrainer_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymTrainer"
    ADD CONSTRAINT "GymTrainer_pkey" PRIMARY KEY (id);


--
-- Name: GymWorkoutSession GymWorkoutSession_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymWorkoutSession"
    ADD CONSTRAINT "GymWorkoutSession_pkey" PRIMARY KEY (id);


--
-- Name: HappyHourRule HappyHourRule_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HappyHourRule"
    ADD CONSTRAINT "HappyHourRule_pkey" PRIMARY KEY (id);


--
-- Name: HardwareBrand HardwareBrand_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HardwareBrand"
    ADD CONSTRAINT "HardwareBrand_pkey" PRIMARY KEY (id);


--
-- Name: HardwareBulkPricing HardwareBulkPricing_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HardwareBulkPricing"
    ADD CONSTRAINT "HardwareBulkPricing_pkey" PRIMARY KEY (id);


--
-- Name: HardwareCreditAccount HardwareCreditAccount_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HardwareCreditAccount"
    ADD CONSTRAINT "HardwareCreditAccount_pkey" PRIMARY KEY (id);


--
-- Name: HardwareCreditTransaction HardwareCreditTransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HardwareCreditTransaction"
    ADD CONSTRAINT "HardwareCreditTransaction_pkey" PRIMARY KEY (id);


--
-- Name: HardwareDeliveryItem HardwareDeliveryItem_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HardwareDeliveryItem"
    ADD CONSTRAINT "HardwareDeliveryItem_pkey" PRIMARY KEY (id);


--
-- Name: HardwareDelivery HardwareDelivery_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HardwareDelivery"
    ADD CONSTRAINT "HardwareDelivery_pkey" PRIMARY KEY (id);


--
-- Name: HardwareProductProfile HardwareProductProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HardwareProductProfile"
    ADD CONSTRAINT "HardwareProductProfile_pkey" PRIMARY KEY (id);


--
-- Name: HardwareProject HardwareProject_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HardwareProject"
    ADD CONSTRAINT "HardwareProject_pkey" PRIMARY KEY (id);


--
-- Name: HardwareQuotationItem HardwareQuotationItem_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HardwareQuotationItem"
    ADD CONSTRAINT "HardwareQuotationItem_pkey" PRIMARY KEY (id);


--
-- Name: HardwareQuotation HardwareQuotation_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HardwareQuotation"
    ADD CONSTRAINT "HardwareQuotation_pkey" PRIMARY KEY (id);


--
-- Name: HardwareReorderRule HardwareReorderRule_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HardwareReorderRule"
    ADD CONSTRAINT "HardwareReorderRule_pkey" PRIMARY KEY (id);


--
-- Name: HotelBookedRoom HotelBookedRoom_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HotelBookedRoom"
    ADD CONSTRAINT "HotelBookedRoom_pkey" PRIMARY KEY (id);


--
-- Name: HotelBooking HotelBooking_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HotelBooking"
    ADD CONSTRAINT "HotelBooking_pkey" PRIMARY KEY (id);


--
-- Name: HotelFolioCharge HotelFolioCharge_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HotelFolioCharge"
    ADD CONSTRAINT "HotelFolioCharge_pkey" PRIMARY KEY (id);


--
-- Name: HotelGuest HotelGuest_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HotelGuest"
    ADD CONSTRAINT "HotelGuest_pkey" PRIMARY KEY (id);


--
-- Name: HotelHousekeepingTask HotelHousekeepingTask_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HotelHousekeepingTask"
    ADD CONSTRAINT "HotelHousekeepingTask_pkey" PRIMARY KEY (id);


--
-- Name: HotelRatePlan HotelRatePlan_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HotelRatePlan"
    ADD CONSTRAINT "HotelRatePlan_pkey" PRIMARY KEY (id);


--
-- Name: HotelRoomType HotelRoomType_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HotelRoomType"
    ADD CONSTRAINT "HotelRoomType_pkey" PRIMARY KEY (id);


--
-- Name: HotelRoom HotelRoom_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HotelRoom"
    ADD CONSTRAINT "HotelRoom_pkey" PRIMARY KEY (id);


--
-- Name: Invoice Invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);


--
-- Name: JewelryCustomOrder JewelryCustomOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."JewelryCustomOrder"
    ADD CONSTRAINT "JewelryCustomOrder_pkey" PRIMARY KEY (id);


--
-- Name: JewelryExchange JewelryExchange_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."JewelryExchange"
    ADD CONSTRAINT "JewelryExchange_pkey" PRIMARY KEY (id);


--
-- Name: JewelryGemstone JewelryGemstone_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."JewelryGemstone"
    ADD CONSTRAINT "JewelryGemstone_pkey" PRIMARY KEY (id);


--
-- Name: JewelryKarigar JewelryKarigar_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."JewelryKarigar"
    ADD CONSTRAINT "JewelryKarigar_pkey" PRIMARY KEY (id);


--
-- Name: JewelryMetalRate JewelryMetalRate_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."JewelryMetalRate"
    ADD CONSTRAINT "JewelryMetalRate_pkey" PRIMARY KEY (id);


--
-- Name: JewelryMetalStock JewelryMetalStock_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."JewelryMetalStock"
    ADD CONSTRAINT "JewelryMetalStock_pkey" PRIMARY KEY (id);


--
-- Name: JewelryProductProfile JewelryProductProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."JewelryProductProfile"
    ADD CONSTRAINT "JewelryProductProfile_pkey" PRIMARY KEY (id);


--
-- Name: JewelrySaleItem JewelrySaleItem_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."JewelrySaleItem"
    ADD CONSTRAINT "JewelrySaleItem_pkey" PRIMARY KEY (id);


--
-- Name: JewelrySale JewelrySale_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."JewelrySale"
    ADD CONSTRAINT "JewelrySale_pkey" PRIMARY KEY (id);


--
-- Name: KitchenStation KitchenStation_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."KitchenStation"
    ADD CONSTRAINT "KitchenStation_pkey" PRIMARY KEY (id);


--
-- Name: Kot Kot_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Kot"
    ADD CONSTRAINT "Kot_pkey" PRIMARY KEY (id);


--
-- Name: LoginHistory LoginHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."LoginHistory"
    ADD CONSTRAINT "LoginHistory_pkey" PRIMARY KEY (id);


--
-- Name: LoyaltyTransaction LoyaltyTransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."LoyaltyTransaction"
    ADD CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY (id);


--
-- Name: MeatCuttingJob MeatCuttingJob_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."MeatCuttingJob"
    ADD CONSTRAINT "MeatCuttingJob_pkey" PRIMARY KEY (id);


--
-- Name: MeatLiveAnimal MeatLiveAnimal_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."MeatLiveAnimal"
    ADD CONSTRAINT "MeatLiveAnimal_pkey" PRIMARY KEY (id);


--
-- Name: MeatProductProfile MeatProductProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."MeatProductProfile"
    ADD CONSTRAINT "MeatProductProfile_pkey" PRIMARY KEY (id);


--
-- Name: MeatQurbaniBooking MeatQurbaniBooking_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."MeatQurbaniBooking"
    ADD CONSTRAINT "MeatQurbaniBooking_pkey" PRIMARY KEY (id);


--
-- Name: MeatSlaughterLog MeatSlaughterLog_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."MeatSlaughterLog"
    ADD CONSTRAINT "MeatSlaughterLog_pkey" PRIMARY KEY (id);


--
-- Name: MeatSubscription MeatSubscription_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."MeatSubscription"
    ADD CONSTRAINT "MeatSubscription_pkey" PRIMARY KEY (id);


--
-- Name: MeatWeightOrderItem MeatWeightOrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."MeatWeightOrderItem"
    ADD CONSTRAINT "MeatWeightOrderItem_pkey" PRIMARY KEY (id);


--
-- Name: MeatWeightOrder MeatWeightOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."MeatWeightOrder"
    ADD CONSTRAINT "MeatWeightOrder_pkey" PRIMARY KEY (id);


--
-- Name: MeatWholesaleAccount MeatWholesaleAccount_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."MeatWholesaleAccount"
    ADD CONSTRAINT "MeatWholesaleAccount_pkey" PRIMARY KEY (id);


--
-- Name: MechanicProfile MechanicProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."MechanicProfile"
    ADD CONSTRAINT "MechanicProfile_pkey" PRIMARY KEY (id);


--
-- Name: MedicineSubstitute MedicineSubstitute_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."MedicineSubstitute"
    ADD CONSTRAINT "MedicineSubstitute_pkey" PRIMARY KEY (id);


--
-- Name: MenuItemModifier MenuItemModifier_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."MenuItemModifier"
    ADD CONSTRAINT "MenuItemModifier_pkey" PRIMARY KEY (id);


--
-- Name: ModifierGroup ModifierGroup_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ModifierGroup"
    ADD CONSTRAINT "ModifierGroup_pkey" PRIMARY KEY (id);


--
-- Name: ModifierOption ModifierOption_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ModifierOption"
    ADD CONSTRAINT "ModifierOption_pkey" PRIMARY KEY (id);


--
-- Name: NotificationPreference NotificationPreference_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."NotificationPreference"
    ADD CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: OnboardingProgress OnboardingProgress_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."OnboardingProgress"
    ADD CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY (id);


--
-- Name: OtpCode OtpCode_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."OtpCode"
    ADD CONSTRAINT "OtpCode_pkey" PRIMARY KEY (id);


--
-- Name: PatientProfile PatientProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."PatientProfile"
    ADD CONSTRAINT "PatientProfile_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: PharmacyMedicine PharmacyMedicine_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."PharmacyMedicine"
    ADD CONSTRAINT "PharmacyMedicine_pkey" PRIMARY KEY (id);


--
-- Name: Plan Plan_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Plan"
    ADD CONSTRAINT "Plan_pkey" PRIMARY KEY (id);


--
-- Name: PlatformDiscount PlatformDiscount_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."PlatformDiscount"
    ADD CONSTRAINT "PlatformDiscount_pkey" PRIMARY KEY (id);


--
-- Name: PrescriptionItem PrescriptionItem_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."PrescriptionItem"
    ADD CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY (id);


--
-- Name: Prescription Prescription_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Prescription"
    ADD CONSTRAINT "Prescription_pkey" PRIMARY KEY (id);


--
-- Name: ProductBatch ProductBatch_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductBatch"
    ADD CONSTRAINT "ProductBatch_pkey" PRIMARY KEY (id);


--
-- Name: ProductComboItem ProductComboItem_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductComboItem"
    ADD CONSTRAINT "ProductComboItem_pkey" PRIMARY KEY (id);


--
-- Name: ProductCombo ProductCombo_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductCombo"
    ADD CONSTRAINT "ProductCombo_pkey" PRIMARY KEY (id);


--
-- Name: ProductImage ProductImage_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductImage"
    ADD CONSTRAINT "ProductImage_pkey" PRIMARY KEY (id);


--
-- Name: ProductImei ProductImei_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductImei"
    ADD CONSTRAINT "ProductImei_pkey" PRIMARY KEY (id);


--
-- Name: ProductSalt ProductSalt_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductSalt"
    ADD CONSTRAINT "ProductSalt_pkey" PRIMARY KEY (id);


--
-- Name: ProductTag ProductTag_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductTag"
    ADD CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("productId", "tagId");


--
-- Name: ProductUnit ProductUnit_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductUnit"
    ADD CONSTRAINT "ProductUnit_pkey" PRIMARY KEY (id);


--
-- Name: ProductVariant ProductVariant_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductVariant"
    ADD CONSTRAINT "ProductVariant_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: Publisher Publisher_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Publisher"
    ADD CONSTRAINT "Publisher_pkey" PRIMARY KEY (id);


--
-- Name: PurchaseItem PurchaseItem_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."PurchaseItem"
    ADD CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY (id);


--
-- Name: Purchase Purchase_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Purchase"
    ADD CONSTRAINT "Purchase_pkey" PRIMARY KEY (id);


--
-- Name: RecipeIngredient RecipeIngredient_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RecipeIngredient"
    ADD CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY (id);


--
-- Name: Recipe Recipe_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Recipe"
    ADD CONSTRAINT "Recipe_pkey" PRIMARY KEY (id);


--
-- Name: Referral Referral_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Referral"
    ADD CONSTRAINT "Referral_pkey" PRIMARY KEY (id);


--
-- Name: RefillReminder RefillReminder_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RefillReminder"
    ADD CONSTRAINT "RefillReminder_pkey" PRIMARY KEY (id);


--
-- Name: ReorderSuggestion ReorderSuggestion_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ReorderSuggestion"
    ADD CONSTRAINT "ReorderSuggestion_pkey" PRIMARY KEY (id);


--
-- Name: RepairPart RepairPart_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RepairPart"
    ADD CONSTRAINT "RepairPart_pkey" PRIMARY KEY (id);


--
-- Name: RepairPayment RepairPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RepairPayment"
    ADD CONSTRAINT "RepairPayment_pkey" PRIMARY KEY (id);


--
-- Name: RepairStatusLog RepairStatusLog_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RepairStatusLog"
    ADD CONSTRAINT "RepairStatusLog_pkey" PRIMARY KEY (id);


--
-- Name: RepairTicket RepairTicket_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RepairTicket"
    ADD CONSTRAINT "RepairTicket_pkey" PRIMARY KEY (id);


--
-- Name: RestaurantMenuItem RestaurantMenuItem_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RestaurantMenuItem"
    ADD CONSTRAINT "RestaurantMenuItem_pkey" PRIMARY KEY (id);


--
-- Name: RestaurantOrderItemModifier RestaurantOrderItemModifier_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RestaurantOrderItemModifier"
    ADD CONSTRAINT "RestaurantOrderItemModifier_pkey" PRIMARY KEY (id);


--
-- Name: RestaurantOrderItem RestaurantOrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RestaurantOrderItem"
    ADD CONSTRAINT "RestaurantOrderItem_pkey" PRIMARY KEY (id);


--
-- Name: RestaurantOrderPayment RestaurantOrderPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RestaurantOrderPayment"
    ADD CONSTRAINT "RestaurantOrderPayment_pkey" PRIMARY KEY (id);


--
-- Name: RestaurantOrder RestaurantOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RestaurantOrder"
    ADD CONSTRAINT "RestaurantOrder_pkey" PRIMARY KEY (id);


--
-- Name: RestaurantTableV2 RestaurantTableV2_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RestaurantTableV2"
    ADD CONSTRAINT "RestaurantTableV2_pkey" PRIMARY KEY (id);


--
-- Name: RestaurantTable RestaurantTable_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RestaurantTable"
    ADD CONSTRAINT "RestaurantTable_pkey" PRIMARY KEY (id);


--
-- Name: RetailQuickKey RetailQuickKey_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RetailQuickKey"
    ADD CONSTRAINT "RetailQuickKey_pkey" PRIMARY KEY (id);


--
-- Name: Rider Rider_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Rider"
    ADD CONSTRAINT "Rider_pkey" PRIMARY KEY (id);


--
-- Name: SalaryPayment SalaryPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SalaryPayment"
    ADD CONSTRAINT "SalaryPayment_pkey" PRIMARY KEY (id);


--
-- Name: SaleItemVariant SaleItemVariant_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SaleItemVariant"
    ADD CONSTRAINT "SaleItemVariant_pkey" PRIMARY KEY (id);


--
-- Name: SaleItem SaleItem_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SaleItem"
    ADD CONSTRAINT "SaleItem_pkey" PRIMARY KEY (id);


--
-- Name: SaleReturnItem SaleReturnItem_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SaleReturnItem"
    ADD CONSTRAINT "SaleReturnItem_pkey" PRIMARY KEY (id);


--
-- Name: SaleReturn SaleReturn_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SaleReturn"
    ADD CONSTRAINT "SaleReturn_pkey" PRIMARY KEY (id);


--
-- Name: Sale Sale_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_pkey" PRIMARY KEY (id);


--
-- Name: SalonAppointmentLegacy SalonAppointmentLegacy_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SalonAppointmentLegacy"
    ADD CONSTRAINT "SalonAppointmentLegacy_pkey" PRIMARY KEY (id);


--
-- Name: SalonAppointmentService SalonAppointmentService_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SalonAppointmentService"
    ADD CONSTRAINT "SalonAppointmentService_pkey" PRIMARY KEY (id);


--
-- Name: SalonAppointment SalonAppointment_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SalonAppointment"
    ADD CONSTRAINT "SalonAppointment_pkey" PRIMARY KEY (id);


--
-- Name: SalonCustomerProfile SalonCustomerProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SalonCustomerProfile"
    ADD CONSTRAINT "SalonCustomerProfile_pkey" PRIMARY KEY (id);


--
-- Name: SalonMembershipPlan SalonMembershipPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SalonMembershipPlan"
    ADD CONSTRAINT "SalonMembershipPlan_pkey" PRIMARY KEY (id);


--
-- Name: SalonMembership SalonMembership_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SalonMembership"
    ADD CONSTRAINT "SalonMembership_pkey" PRIMARY KEY (id);


--
-- Name: SalonPackagePurchase SalonPackagePurchase_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SalonPackagePurchase"
    ADD CONSTRAINT "SalonPackagePurchase_pkey" PRIMARY KEY (id);


--
-- Name: SalonPackage SalonPackage_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SalonPackage"
    ADD CONSTRAINT "SalonPackage_pkey" PRIMARY KEY (id);


--
-- Name: SalonService SalonService_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SalonService"
    ADD CONSTRAINT "SalonService_pkey" PRIMARY KEY (id);


--
-- Name: SalonStaffProfile SalonStaffProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SalonStaffProfile"
    ADD CONSTRAINT "SalonStaffProfile_pkey" PRIMARY KEY (id);


--
-- Name: SalonStaffService SalonStaffService_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SalonStaffService"
    ADD CONSTRAINT "SalonStaffService_pkey" PRIMARY KEY (id);


--
-- Name: Salt Salt_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Salt"
    ADD CONSTRAINT "Salt_pkey" PRIMARY KEY (id);


--
-- Name: SchoolBookListItem SchoolBookListItem_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SchoolBookListItem"
    ADD CONSTRAINT "SchoolBookListItem_pkey" PRIMARY KEY (id);


--
-- Name: SchoolBookList SchoolBookList_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SchoolBookList"
    ADD CONSTRAINT "SchoolBookList_pkey" PRIMARY KEY (id);


--
-- Name: School School_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."School"
    ADD CONSTRAINT "School_pkey" PRIMARY KEY (id);


--
-- Name: ServiceAmcVisit ServiceAmcVisit_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ServiceAmcVisit"
    ADD CONSTRAINT "ServiceAmcVisit_pkey" PRIMARY KEY (id);


--
-- Name: ServiceAmc ServiceAmc_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ServiceAmc"
    ADD CONSTRAINT "ServiceAmc_pkey" PRIMARY KEY (id);


--
-- Name: ServiceCatalog ServiceCatalog_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ServiceCatalog"
    ADD CONSTRAINT "ServiceCatalog_pkey" PRIMARY KEY (id);


--
-- Name: ServiceCustomerProfile ServiceCustomerProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ServiceCustomerProfile"
    ADD CONSTRAINT "ServiceCustomerProfile_pkey" PRIMARY KEY (id);


--
-- Name: ServiceJobPart ServiceJobPart_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ServiceJobPart"
    ADD CONSTRAINT "ServiceJobPart_pkey" PRIMARY KEY (id);


--
-- Name: ServiceJobStatusHistory ServiceJobStatusHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ServiceJobStatusHistory"
    ADD CONSTRAINT "ServiceJobStatusHistory_pkey" PRIMARY KEY (id);


--
-- Name: ServiceJobTimeLog ServiceJobTimeLog_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ServiceJobTimeLog"
    ADD CONSTRAINT "ServiceJobTimeLog_pkey" PRIMARY KEY (id);


--
-- Name: ServiceJob ServiceJob_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ServiceJob"
    ADD CONSTRAINT "ServiceJob_pkey" PRIMARY KEY (id);


--
-- Name: ServiceQuote ServiceQuote_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ServiceQuote"
    ADD CONSTRAINT "ServiceQuote_pkey" PRIMARY KEY (id);


--
-- Name: ServiceTechnicianProfile ServiceTechnicianProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ServiceTechnicianProfile"
    ADD CONSTRAINT "ServiceTechnicianProfile_pkey" PRIMARY KEY (id);


--
-- Name: ServiceTechnicianSkill ServiceTechnicianSkill_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ServiceTechnicianSkill"
    ADD CONSTRAINT "ServiceTechnicianSkill_pkey" PRIMARY KEY (id);


--
-- Name: ServiceWarrantyClaim ServiceWarrantyClaim_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ServiceWarrantyClaim"
    ADD CONSTRAINT "ServiceWarrantyClaim_pkey" PRIMARY KEY (id);


--
-- Name: ServiceZone ServiceZone_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ServiceZone"
    ADD CONSTRAINT "ServiceZone_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: ShopStock ShopStock_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ShopStock"
    ADD CONSTRAINT "ShopStock_pkey" PRIMARY KEY (id);


--
-- Name: Shop Shop_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Shop"
    ADD CONSTRAINT "Shop_pkey" PRIMARY KEY (id);


--
-- Name: SmsLog SmsLog_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SmsLog"
    ADD CONSTRAINT "SmsLog_pkey" PRIMARY KEY (id);


--
-- Name: SmsTemplate SmsTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SmsTemplate"
    ADD CONSTRAINT "SmsTemplate_pkey" PRIMARY KEY (id);


--
-- Name: StaffDocument StaffDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StaffDocument"
    ADD CONSTRAINT "StaffDocument_pkey" PRIMARY KEY (id);


--
-- Name: StaffLeave StaffLeave_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StaffLeave"
    ADD CONSTRAINT "StaffLeave_pkey" PRIMARY KEY (id);


--
-- Name: Staff Staff_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Staff"
    ADD CONSTRAINT "Staff_pkey" PRIMARY KEY (id);


--
-- Name: StationeryProfile StationeryProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StationeryProfile"
    ADD CONSTRAINT "StationeryProfile_pkey" PRIMARY KEY (id);


--
-- Name: StockAdjustment StockAdjustment_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StockAdjustment"
    ADD CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY (id);


--
-- Name: StockMovement StockMovement_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_pkey" PRIMARY KEY (id);


--
-- Name: StockTransferItem StockTransferItem_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StockTransferItem"
    ADD CONSTRAINT "StockTransferItem_pkey" PRIMARY KEY (id);


--
-- Name: StockTransfer StockTransfer_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StockTransfer"
    ADD CONSTRAINT "StockTransfer_pkey" PRIMARY KEY (id);


--
-- Name: Subscription Subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_pkey" PRIMARY KEY (id);


--
-- Name: Supplier Supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Supplier"
    ADD CONSTRAINT "Supplier_pkey" PRIMARY KEY (id);


--
-- Name: SystemSetting SystemSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SystemSetting"
    ADD CONSTRAINT "SystemSetting_pkey" PRIMARY KEY (id);


--
-- Name: Tag Tag_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Tag"
    ADD CONSTRAINT "Tag_pkey" PRIMARY KEY (id);


--
-- Name: TemperatureLog TemperatureLog_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."TemperatureLog"
    ADD CONSTRAINT "TemperatureLog_pkey" PRIMARY KEY (id);


--
-- Name: TenantNote TenantNote_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."TenantNote"
    ADD CONSTRAINT "TenantNote_pkey" PRIMARY KEY (id);


--
-- Name: TenantSettings TenantSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."TenantSettings"
    ADD CONSTRAINT "TenantSettings_pkey" PRIMARY KEY (id);


--
-- Name: Tenant Tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY (id);


--
-- Name: Upload Upload_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Upload"
    ADD CONSTRAINT "Upload_pkey" PRIMARY KEY (id);


--
-- Name: UsedPhoneInspection UsedPhoneInspection_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."UsedPhoneInspection"
    ADD CONSTRAINT "UsedPhoneInspection_pkey" PRIMARY KEY (id);


--
-- Name: UsedPhone UsedPhone_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."UsedPhone"
    ADD CONSTRAINT "UsedPhone_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: VehicleMake VehicleMake_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."VehicleMake"
    ADD CONSTRAINT "VehicleMake_pkey" PRIMARY KEY (id);


--
-- Name: VehicleModel VehicleModel_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."VehicleModel"
    ADD CONSTRAINT "VehicleModel_pkey" PRIMARY KEY (id);


--
-- Name: VehicleServiceReminder VehicleServiceReminder_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."VehicleServiceReminder"
    ADD CONSTRAINT "VehicleServiceReminder_pkey" PRIMARY KEY (id);


--
-- Name: WaiterAssignment WaiterAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."WaiterAssignment"
    ADD CONSTRAINT "WaiterAssignment_pkey" PRIMARY KEY (id);


--
-- Name: WorkshopJobExternal WorkshopJobExternal_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."WorkshopJobExternal"
    ADD CONSTRAINT "WorkshopJobExternal_pkey" PRIMARY KEY (id);


--
-- Name: WorkshopJobLabor WorkshopJobLabor_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."WorkshopJobLabor"
    ADD CONSTRAINT "WorkshopJobLabor_pkey" PRIMARY KEY (id);


--
-- Name: WorkshopJobPart WorkshopJobPart_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."WorkshopJobPart"
    ADD CONSTRAINT "WorkshopJobPart_pkey" PRIMARY KEY (id);


--
-- Name: WorkshopJobPayment WorkshopJobPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."WorkshopJobPayment"
    ADD CONSTRAINT "WorkshopJobPayment_pkey" PRIMARY KEY (id);


--
-- Name: WorkshopJobStatusLog WorkshopJobStatusLog_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."WorkshopJobStatusLog"
    ADD CONSTRAINT "WorkshopJobStatusLog_pkey" PRIMARY KEY (id);


--
-- Name: WorkshopJob WorkshopJob_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."WorkshopJob"
    ADD CONSTRAINT "WorkshopJob_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: auction_bids auction_bids_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.auction_bids
    ADD CONSTRAINT auction_bids_pkey PRIMARY KEY (id);


--
-- Name: auctions auctions_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.auctions
    ADD CONSTRAINT auctions_pkey PRIMARY KEY (id);


--
-- Name: bargain_messages bargain_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.bargain_messages
    ADD CONSTRAINT bargain_messages_pkey PRIMARY KEY (id);


--
-- Name: bargains bargains_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.bargains
    ADD CONSTRAINT bargains_pkey PRIMARY KEY (id);


--
-- Name: customer_addresses customer_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_pkey PRIMARY KEY (id);


--
-- Name: customer_follows_shop customer_follows_shop_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_follows_shop
    ADD CONSTRAINT customer_follows_shop_pkey PRIMARY KEY (id);


--
-- Name: customer_login_history customer_login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_login_history
    ADD CONSTRAINT customer_login_history_pkey PRIMARY KEY (id);


--
-- Name: customer_notifications customer_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_notifications
    ADD CONSTRAINT customer_notifications_pkey PRIMARY KEY (id);


--
-- Name: customer_otp_codes customer_otp_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_otp_codes
    ADD CONSTRAINT customer_otp_codes_pkey PRIMARY KEY (id);


--
-- Name: customer_push_tokens customer_push_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_push_tokens
    ADD CONSTRAINT customer_push_tokens_pkey PRIMARY KEY (id);


--
-- Name: customer_saved_cards customer_saved_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_saved_cards
    ADD CONSTRAINT customer_saved_cards_pkey PRIMARY KEY (id);


--
-- Name: customer_search_history customer_search_history_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_search_history
    ADD CONSTRAINT customer_search_history_pkey PRIMARY KEY (id);


--
-- Name: customer_sessions customer_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_sessions
    ADD CONSTRAINT customer_sessions_pkey PRIMARY KEY (id);


--
-- Name: customer_wallet_txns customer_wallet_txns_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_wallet_txns
    ADD CONSTRAINT customer_wallet_txns_pkey PRIMARY KEY (id);


--
-- Name: group_buy_participants group_buy_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.group_buy_participants
    ADD CONSTRAINT group_buy_participants_pkey PRIMARY KEY (id);


--
-- Name: group_buys group_buys_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.group_buys
    ADD CONSTRAINT group_buys_pkey PRIMARY KEY (id);


--
-- Name: live_shop_messages live_shop_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.live_shop_messages
    ADD CONSTRAINT live_shop_messages_pkey PRIMARY KEY (id);


--
-- Name: live_shop_viewers live_shop_viewers_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.live_shop_viewers
    ADD CONSTRAINT live_shop_viewers_pkey PRIMARY KEY (id);


--
-- Name: live_shops live_shops_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.live_shops
    ADD CONSTRAINT live_shops_pkey PRIMARY KEY (id);


--
-- Name: marketplace_cart_lines marketplace_cart_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.marketplace_cart_lines
    ADD CONSTRAINT marketplace_cart_lines_pkey PRIMARY KEY (id);


--
-- Name: marketplace_carts marketplace_carts_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.marketplace_carts
    ADD CONSTRAINT marketplace_carts_pkey PRIMARY KEY (id);


--
-- Name: marketplace_customers marketplace_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.marketplace_customers
    ADD CONSTRAINT marketplace_customers_pkey PRIMARY KEY (id);


--
-- Name: marketplace_order_items marketplace_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.marketplace_order_items
    ADD CONSTRAINT marketplace_order_items_pkey PRIMARY KEY (id);


--
-- Name: marketplace_orders marketplace_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.marketplace_orders
    ADD CONSTRAINT marketplace_orders_pkey PRIMARY KEY (id);


--
-- Name: marketplace_reviews marketplace_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.marketplace_reviews
    ADD CONSTRAINT marketplace_reviews_pkey PRIMARY KEY (id);


--
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- Name: product_marketplace_profiles product_marketplace_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.product_marketplace_profiles
    ADD CONSTRAINT product_marketplace_profiles_pkey PRIMARY KEY (id);


--
-- Name: product_views product_views_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.product_views
    ADD CONSTRAINT product_views_pkey PRIMARY KEY (id);


--
-- Name: review_votes review_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.review_votes
    ADD CONSTRAINT review_votes_pkey PRIMARY KEY (id);


--
-- Name: shop_marketplace_profiles shop_marketplace_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.shop_marketplace_profiles
    ADD CONSTRAINT shop_marketplace_profiles_pkey PRIMARY KEY (id);


--
-- Name: support_messages support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: wishlist_items wishlist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_pkey PRIMARY KEY (id);


--
-- Name: ActivityLog_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ActivityLog_entityType_entityId_idx" ON public."ActivityLog" USING btree ("entityType", "entityId");


--
-- Name: ActivityLog_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ActivityLog_tenantId_createdAt_idx" ON public."ActivityLog" USING btree ("tenantId", "createdAt");


--
-- Name: ActivityLog_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ActivityLog_tenantId_idx" ON public."ActivityLog" USING btree ("tenantId");


--
-- Name: ActivityLog_userId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ActivityLog_userId_idx" ON public."ActivityLog" USING btree ("userId");


--
-- Name: AdminNotification_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AdminNotification_createdAt_idx" ON public."AdminNotification" USING btree ("createdAt");


--
-- Name: AdminNotification_isRead_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AdminNotification_isRead_idx" ON public."AdminNotification" USING btree ("isRead");


--
-- Name: AdminNotification_priority_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AdminNotification_priority_idx" ON public."AdminNotification" USING btree (priority);


--
-- Name: AdminNotification_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AdminNotification_tenantId_idx" ON public."AdminNotification" USING btree ("tenantId");


--
-- Name: AdminNotification_type_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AdminNotification_type_idx" ON public."AdminNotification" USING btree (type);


--
-- Name: AgriBulkOrderItem_orderId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriBulkOrderItem_orderId_idx" ON public."AgriBulkOrderItem" USING btree ("orderId");


--
-- Name: AgriBulkOrder_farmerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriBulkOrder_farmerId_idx" ON public."AgriBulkOrder" USING btree ("farmerId");


--
-- Name: AgriBulkOrder_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriBulkOrder_tenantId_idx" ON public."AgriBulkOrder" USING btree ("tenantId");


--
-- Name: AgriBulkOrder_tenantId_orderNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "AgriBulkOrder_tenantId_orderNumber_key" ON public."AgriBulkOrder" USING btree ("tenantId", "orderNumber");


--
-- Name: AgriBulkOrder_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriBulkOrder_tenantId_status_idx" ON public."AgriBulkOrder" USING btree ("tenantId", status);


--
-- Name: AgriCropAdvisory_farmerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriCropAdvisory_farmerId_idx" ON public."AgriCropAdvisory" USING btree ("farmerId");


--
-- Name: AgriCropAdvisory_tenantId_advisoryNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "AgriCropAdvisory_tenantId_advisoryNumber_key" ON public."AgriCropAdvisory" USING btree ("tenantId", "advisoryNumber");


--
-- Name: AgriCropAdvisory_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriCropAdvisory_tenantId_idx" ON public."AgriCropAdvisory" USING btree ("tenantId");


--
-- Name: AgriFarmerLedger_entryDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriFarmerLedger_entryDate_idx" ON public."AgriFarmerLedger" USING btree ("entryDate");


--
-- Name: AgriFarmerLedger_farmerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriFarmerLedger_farmerId_idx" ON public."AgriFarmerLedger" USING btree ("farmerId");


--
-- Name: AgriFarmerLedger_tenantId_entryNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "AgriFarmerLedger_tenantId_entryNumber_key" ON public."AgriFarmerLedger" USING btree ("tenantId", "entryNumber");


--
-- Name: AgriFarmerLedger_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriFarmerLedger_tenantId_idx" ON public."AgriFarmerLedger" USING btree ("tenantId");


--
-- Name: AgriFarmer_cnic_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriFarmer_cnic_idx" ON public."AgriFarmer" USING btree (cnic);


--
-- Name: AgriFarmer_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriFarmer_customerId_idx" ON public."AgriFarmer" USING btree ("customerId");


--
-- Name: AgriFarmer_customerId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "AgriFarmer_customerId_key" ON public."AgriFarmer" USING btree ("customerId");


--
-- Name: AgriFarmer_tenantId_farmerNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "AgriFarmer_tenantId_farmerNumber_key" ON public."AgriFarmer" USING btree ("tenantId", "farmerNumber");


--
-- Name: AgriFarmer_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriFarmer_tenantId_idx" ON public."AgriFarmer" USING btree ("tenantId");


--
-- Name: AgriFarmer_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriFarmer_tenantId_status_idx" ON public."AgriFarmer" USING btree ("tenantId", status);


--
-- Name: AgriProductProfile_productId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "AgriProductProfile_productId_key" ON public."AgriProductProfile" USING btree ("productId");


--
-- Name: AgriProductProfile_tenantId_category_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriProductProfile_tenantId_category_idx" ON public."AgriProductProfile" USING btree ("tenantId", category);


--
-- Name: AgriProductProfile_tenantId_fertilizerType_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriProductProfile_tenantId_fertilizerType_idx" ON public."AgriProductProfile" USING btree ("tenantId", "fertilizerType");


--
-- Name: AgriProductProfile_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriProductProfile_tenantId_idx" ON public."AgriProductProfile" USING btree ("tenantId");


--
-- Name: AgriProductProfile_tenantId_seedType_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriProductProfile_tenantId_seedType_idx" ON public."AgriProductProfile" USING btree ("tenantId", "seedType");


--
-- Name: AgriSeasonalPlan_tenantId_season_year_cropName_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "AgriSeasonalPlan_tenantId_season_year_cropName_key" ON public."AgriSeasonalPlan" USING btree ("tenantId", season, year, "cropName");


--
-- Name: AgriSeasonalPlan_tenantId_year_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriSeasonalPlan_tenantId_year_idx" ON public."AgriSeasonalPlan" USING btree ("tenantId", year);


--
-- Name: AgriSubsidyClaim_farmerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriSubsidyClaim_farmerId_idx" ON public."AgriSubsidyClaim" USING btree ("farmerId");


--
-- Name: AgriSubsidyClaim_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriSubsidyClaim_status_idx" ON public."AgriSubsidyClaim" USING btree (status);


--
-- Name: AgriSubsidyClaim_tenantId_claimNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "AgriSubsidyClaim_tenantId_claimNumber_key" ON public."AgriSubsidyClaim" USING btree ("tenantId", "claimNumber");


--
-- Name: AgriSubsidyClaim_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AgriSubsidyClaim_tenantId_idx" ON public."AgriSubsidyClaim" USING btree ("tenantId");


--
-- Name: ArtSupplyProfile_productId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ArtSupplyProfile_productId_key" ON public."ArtSupplyProfile" USING btree ("productId");


--
-- Name: ArtSupplyProfile_tenantId_brand_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ArtSupplyProfile_tenantId_brand_idx" ON public."ArtSupplyProfile" USING btree ("tenantId", brand);


--
-- Name: ArtSupplyProfile_tenantId_category_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ArtSupplyProfile_tenantId_category_idx" ON public."ArtSupplyProfile" USING btree ("tenantId", category);


--
-- Name: ArtSupplyProfile_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ArtSupplyProfile_tenantId_idx" ON public."ArtSupplyProfile" USING btree ("tenantId");


--
-- Name: Attendance_staffId_date_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Attendance_staffId_date_idx" ON public."Attendance" USING btree ("staffId", date);


--
-- Name: Attendance_staffId_date_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Attendance_staffId_date_key" ON public."Attendance" USING btree ("staffId", date);


--
-- Name: Attendance_tenantId_date_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Attendance_tenantId_date_idx" ON public."Attendance" USING btree ("tenantId", date);


--
-- Name: Attendance_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Attendance_tenantId_idx" ON public."Attendance" USING btree ("tenantId");


--
-- Name: Author_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Author_tenantId_idx" ON public."Author" USING btree ("tenantId");


--
-- Name: Author_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Author_tenantId_name_key" ON public."Author" USING btree ("tenantId", name);


--
-- Name: AutoPartProfile_productId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "AutoPartProfile_productId_key" ON public."AutoPartProfile" USING btree ("productId");


--
-- Name: AutoPartProfile_tenantId_category_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AutoPartProfile_tenantId_category_idx" ON public."AutoPartProfile" USING btree ("tenantId", category);


--
-- Name: AutoPartProfile_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AutoPartProfile_tenantId_idx" ON public."AutoPartProfile" USING btree ("tenantId");


--
-- Name: AutoPartProfile_tenantId_oemNumber_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AutoPartProfile_tenantId_oemNumber_idx" ON public."AutoPartProfile" USING btree ("tenantId", "oemNumber");


--
-- Name: AutoPartProfile_tenantId_partNumber_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "AutoPartProfile_tenantId_partNumber_idx" ON public."AutoPartProfile" USING btree ("tenantId", "partNumber");


--
-- Name: BakeryBulkOrder_eventDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryBulkOrder_eventDate_idx" ON public."BakeryBulkOrder" USING btree ("eventDate");


--
-- Name: BakeryBulkOrder_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryBulkOrder_tenantId_idx" ON public."BakeryBulkOrder" USING btree ("tenantId");


--
-- Name: BakeryBulkOrder_tenantId_orderNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "BakeryBulkOrder_tenantId_orderNumber_key" ON public."BakeryBulkOrder" USING btree ("tenantId", "orderNumber");


--
-- Name: BakeryCakeOrder_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryCakeOrder_customerId_idx" ON public."BakeryCakeOrder" USING btree ("customerId");


--
-- Name: BakeryCakeOrder_eventDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryCakeOrder_eventDate_idx" ON public."BakeryCakeOrder" USING btree ("eventDate");


--
-- Name: BakeryCakeOrder_neededBy_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryCakeOrder_neededBy_idx" ON public."BakeryCakeOrder" USING btree ("neededBy");


--
-- Name: BakeryCakeOrder_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryCakeOrder_tenantId_idx" ON public."BakeryCakeOrder" USING btree ("tenantId");


--
-- Name: BakeryCakeOrder_tenantId_orderNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "BakeryCakeOrder_tenantId_orderNumber_key" ON public."BakeryCakeOrder" USING btree ("tenantId", "orderNumber");


--
-- Name: BakeryCakeOrder_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryCakeOrder_tenantId_status_idx" ON public."BakeryCakeOrder" USING btree ("tenantId", status);


--
-- Name: BakeryFreshnessLog_bestBefore_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryFreshnessLog_bestBefore_idx" ON public."BakeryFreshnessLog" USING btree ("bestBefore");


--
-- Name: BakeryFreshnessLog_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryFreshnessLog_productId_idx" ON public."BakeryFreshnessLog" USING btree ("productId");


--
-- Name: BakeryFreshnessLog_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryFreshnessLog_tenantId_idx" ON public."BakeryFreshnessLog" USING btree ("tenantId");


--
-- Name: BakeryFreshnessLog_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryFreshnessLog_tenantId_status_idx" ON public."BakeryFreshnessLog" USING btree ("tenantId", status);


--
-- Name: BakeryIngredientTransaction_ingredientId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryIngredientTransaction_ingredientId_idx" ON public."BakeryIngredientTransaction" USING btree ("ingredientId");


--
-- Name: BakeryIngredientTransaction_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryIngredientTransaction_tenantId_idx" ON public."BakeryIngredientTransaction" USING btree ("tenantId");


--
-- Name: BakeryIngredient_tenantId_category_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryIngredient_tenantId_category_idx" ON public."BakeryIngredient" USING btree ("tenantId", category);


--
-- Name: BakeryIngredient_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryIngredient_tenantId_idx" ON public."BakeryIngredient" USING btree ("tenantId");


--
-- Name: BakeryIngredient_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryIngredient_tenantId_isActive_idx" ON public."BakeryIngredient" USING btree ("tenantId", "isActive");


--
-- Name: BakeryIngredient_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "BakeryIngredient_tenantId_name_key" ON public."BakeryIngredient" USING btree ("tenantId", name);


--
-- Name: BakeryProductProfile_productId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "BakeryProductProfile_productId_key" ON public."BakeryProductProfile" USING btree ("productId");


--
-- Name: BakeryProductProfile_tenantId_category_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryProductProfile_tenantId_category_idx" ON public."BakeryProductProfile" USING btree ("tenantId", category);


--
-- Name: BakeryProductProfile_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryProductProfile_tenantId_idx" ON public."BakeryProductProfile" USING btree ("tenantId");


--
-- Name: BakeryProductionItem_cakeOrderId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryProductionItem_cakeOrderId_idx" ON public."BakeryProductionItem" USING btree ("cakeOrderId");


--
-- Name: BakeryProductionItem_planId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryProductionItem_planId_idx" ON public."BakeryProductionItem" USING btree ("planId");


--
-- Name: BakeryProductionPlan_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryProductionPlan_tenantId_idx" ON public."BakeryProductionPlan" USING btree ("tenantId");


--
-- Name: BakeryProductionPlan_tenantId_planDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BakeryProductionPlan_tenantId_planDate_idx" ON public."BakeryProductionPlan" USING btree ("tenantId", "planDate");


--
-- Name: BakeryProductionPlan_tenantId_planNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "BakeryProductionPlan_tenantId_planNumber_key" ON public."BakeryProductionPlan" USING btree ("tenantId", "planNumber");


--
-- Name: BarcodeLabelBatch_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BarcodeLabelBatch_createdAt_idx" ON public."BarcodeLabelBatch" USING btree ("createdAt");


--
-- Name: BarcodeLabelBatch_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BarcodeLabelBatch_tenantId_idx" ON public."BarcodeLabelBatch" USING btree ("tenantId");


--
-- Name: BookAuthor_authorId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BookAuthor_authorId_idx" ON public."BookAuthor" USING btree ("authorId");


--
-- Name: BookAuthor_bookId_authorId_role_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "BookAuthor_bookId_authorId_role_key" ON public."BookAuthor" USING btree ("bookId", "authorId", role);


--
-- Name: BookAuthor_bookId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BookAuthor_bookId_idx" ON public."BookAuthor" USING btree ("bookId");


--
-- Name: BookProfile_productId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "BookProfile_productId_key" ON public."BookProfile" USING btree ("productId");


--
-- Name: BookProfile_publisherId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BookProfile_publisherId_idx" ON public."BookProfile" USING btree ("publisherId");


--
-- Name: BookProfile_tenantId_board_grade_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BookProfile_tenantId_board_grade_idx" ON public."BookProfile" USING btree ("tenantId", board, grade);


--
-- Name: BookProfile_tenantId_category_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BookProfile_tenantId_category_idx" ON public."BookProfile" USING btree ("tenantId", category);


--
-- Name: BookProfile_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BookProfile_tenantId_idx" ON public."BookProfile" USING btree ("tenantId");


--
-- Name: BookProfile_tenantId_isbn10_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BookProfile_tenantId_isbn10_idx" ON public."BookProfile" USING btree ("tenantId", isbn10);


--
-- Name: BookProfile_tenantId_isbn13_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BookProfile_tenantId_isbn13_idx" ON public."BookProfile" USING btree ("tenantId", isbn13);


--
-- Name: BookRental_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BookRental_customerId_idx" ON public."BookRental" USING btree ("customerId");


--
-- Name: BookRental_dueDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BookRental_dueDate_idx" ON public."BookRental" USING btree ("dueDate");


--
-- Name: BookRental_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BookRental_tenantId_idx" ON public."BookRental" USING btree ("tenantId");


--
-- Name: BookRental_tenantId_rentalNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "BookRental_tenantId_rentalNumber_key" ON public."BookRental" USING btree ("tenantId", "rentalNumber");


--
-- Name: BookRental_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BookRental_tenantId_status_idx" ON public."BookRental" USING btree ("tenantId", status);


--
-- Name: BookingItem_bookingId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BookingItem_bookingId_idx" ON public."BookingItem" USING btree ("bookingId");


--
-- Name: BookingItem_cutPieceId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BookingItem_cutPieceId_idx" ON public."BookingItem" USING btree ("cutPieceId");


--
-- Name: BookingItem_imeiId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BookingItem_imeiId_idx" ON public."BookingItem" USING btree ("imeiId");


--
-- Name: BookingItem_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BookingItem_productId_idx" ON public."BookingItem" USING btree ("productId");


--
-- Name: BookingItem_rollId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BookingItem_rollId_idx" ON public."BookingItem" USING btree ("rollId");


--
-- Name: BookingPayment_bookingId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BookingPayment_bookingId_idx" ON public."BookingPayment" USING btree ("bookingId");


--
-- Name: BookingPayment_type_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BookingPayment_type_idx" ON public."BookingPayment" USING btree (type);


--
-- Name: Booking_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Booking_customerId_idx" ON public."Booking" USING btree ("customerId");


--
-- Name: Booking_expectedPickupAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Booking_expectedPickupAt_idx" ON public."Booking" USING btree ("expectedPickupAt");


--
-- Name: Booking_expiresAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Booking_expiresAt_idx" ON public."Booking" USING btree ("expiresAt");


--
-- Name: Booking_shopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Booking_shopId_idx" ON public."Booking" USING btree ("shopId");


--
-- Name: Booking_tenantId_bookingNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Booking_tenantId_bookingNumber_key" ON public."Booking" USING btree ("tenantId", "bookingNumber");


--
-- Name: Booking_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Booking_tenantId_idx" ON public."Booking" USING btree ("tenantId");


--
-- Name: Booking_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Booking_tenantId_status_idx" ON public."Booking" USING btree ("tenantId", status);


--
-- Name: Brand_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Brand_tenantId_idx" ON public."Brand" USING btree ("tenantId");


--
-- Name: Brand_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Brand_tenantId_isActive_idx" ON public."Brand" USING btree ("tenantId", "isActive");


--
-- Name: Brand_tenantId_slug_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Brand_tenantId_slug_key" ON public."Brand" USING btree ("tenantId", slug);


--
-- Name: BroadcastNotification_sentAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BroadcastNotification_sentAt_idx" ON public."BroadcastNotification" USING btree ("sentAt");


--
-- Name: BulkImportJob_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BulkImportJob_createdAt_idx" ON public."BulkImportJob" USING btree ("createdAt");


--
-- Name: BulkImportJob_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BulkImportJob_tenantId_idx" ON public."BulkImportJob" USING btree ("tenantId");


--
-- Name: BulkImportJob_tenantId_jobType_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BulkImportJob_tenantId_jobType_idx" ON public."BulkImportJob" USING btree ("tenantId", "jobType");


--
-- Name: BulkImportJob_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "BulkImportJob_tenantId_status_idx" ON public."BulkImportJob" USING btree ("tenantId", status);


--
-- Name: CarpetCutPiece_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CarpetCutPiece_productId_idx" ON public."CarpetCutPiece" USING btree ("productId");


--
-- Name: CarpetCutPiece_saleItemId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "CarpetCutPiece_saleItemId_key" ON public."CarpetCutPiece" USING btree ("saleItemId");


--
-- Name: CarpetCutPiece_shopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CarpetCutPiece_shopId_idx" ON public."CarpetCutPiece" USING btree ("shopId");


--
-- Name: CarpetCutPiece_sourceRollId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CarpetCutPiece_sourceRollId_idx" ON public."CarpetCutPiece" USING btree ("sourceRollId");


--
-- Name: CarpetCutPiece_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CarpetCutPiece_tenantId_idx" ON public."CarpetCutPiece" USING btree ("tenantId");


--
-- Name: CarpetCutPiece_tenantId_pieceCode_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "CarpetCutPiece_tenantId_pieceCode_key" ON public."CarpetCutPiece" USING btree ("tenantId", "pieceCode");


--
-- Name: CarpetCutPiece_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CarpetCutPiece_tenantId_status_idx" ON public."CarpetCutPiece" USING btree ("tenantId", status);


--
-- Name: CarpetRollMovement_rollId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CarpetRollMovement_rollId_idx" ON public."CarpetRollMovement" USING btree ("rollId");


--
-- Name: CarpetRollMovement_saleId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CarpetRollMovement_saleId_idx" ON public."CarpetRollMovement" USING btree ("saleId");


--
-- Name: CarpetRollMovement_saleItemId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CarpetRollMovement_saleItemId_idx" ON public."CarpetRollMovement" USING btree ("saleItemId");


--
-- Name: CarpetRollMovement_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CarpetRollMovement_tenantId_createdAt_idx" ON public."CarpetRollMovement" USING btree ("tenantId", "createdAt");


--
-- Name: CarpetRollMovement_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CarpetRollMovement_tenantId_idx" ON public."CarpetRollMovement" USING btree ("tenantId");


--
-- Name: CarpetRoll_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CarpetRoll_productId_idx" ON public."CarpetRoll" USING btree ("productId");


--
-- Name: CarpetRoll_rollNumber_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CarpetRoll_rollNumber_idx" ON public."CarpetRoll" USING btree ("rollNumber");


--
-- Name: CarpetRoll_shopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CarpetRoll_shopId_idx" ON public."CarpetRoll" USING btree ("shopId");


--
-- Name: CarpetRoll_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CarpetRoll_tenantId_idx" ON public."CarpetRoll" USING btree ("tenantId");


--
-- Name: CarpetRoll_tenantId_rollNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "CarpetRoll_tenantId_rollNumber_key" ON public."CarpetRoll" USING btree ("tenantId", "rollNumber");


--
-- Name: CarpetRoll_tenantId_shopId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CarpetRoll_tenantId_shopId_status_idx" ON public."CarpetRoll" USING btree ("tenantId", "shopId", status);


--
-- Name: CarpetRoll_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CarpetRoll_tenantId_status_idx" ON public."CarpetRoll" USING btree ("tenantId", status);


--
-- Name: CarpetRoll_variantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CarpetRoll_variantId_idx" ON public."CarpetRoll" USING btree ("variantId");


--
-- Name: CashRegister_shopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CashRegister_shopId_idx" ON public."CashRegister" USING btree ("shopId");


--
-- Name: CashRegister_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CashRegister_tenantId_idx" ON public."CashRegister" USING btree ("tenantId");


--
-- Name: CashRegister_tenantId_registerNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "CashRegister_tenantId_registerNumber_key" ON public."CashRegister" USING btree ("tenantId", "registerNumber");


--
-- Name: CashRegister_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CashRegister_tenantId_status_idx" ON public."CashRegister" USING btree ("tenantId", status);


--
-- Name: CashTransaction_cashRegisterId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CashTransaction_cashRegisterId_idx" ON public."CashTransaction" USING btree ("cashRegisterId");


--
-- Name: CashTransaction_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CashTransaction_tenantId_createdAt_idx" ON public."CashTransaction" USING btree ("tenantId", "createdAt");


--
-- Name: CashTransaction_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CashTransaction_tenantId_idx" ON public."CashTransaction" USING btree ("tenantId");


--
-- Name: Category_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Category_tenantId_idx" ON public."Category" USING btree ("tenantId");


--
-- Name: Category_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Category_tenantId_name_key" ON public."Category" USING btree ("tenantId", name);


--
-- Name: ClinicAntenatalVisit_patientId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicAntenatalVisit_patientId_idx" ON public."ClinicAntenatalVisit" USING btree ("patientId");


--
-- Name: ClinicAntenatalVisit_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicAntenatalVisit_tenantId_idx" ON public."ClinicAntenatalVisit" USING btree ("tenantId");


--
-- Name: ClinicAppointment_doctorId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicAppointment_doctorId_idx" ON public."ClinicAppointment" USING btree ("doctorId");


--
-- Name: ClinicAppointment_patientId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicAppointment_patientId_idx" ON public."ClinicAppointment" USING btree ("patientId");


--
-- Name: ClinicAppointment_scheduledStart_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicAppointment_scheduledStart_idx" ON public."ClinicAppointment" USING btree ("scheduledStart");


--
-- Name: ClinicAppointment_tenantId_appointmentNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ClinicAppointment_tenantId_appointmentNumber_key" ON public."ClinicAppointment" USING btree ("tenantId", "appointmentNumber");


--
-- Name: ClinicAppointment_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicAppointment_tenantId_idx" ON public."ClinicAppointment" USING btree ("tenantId");


--
-- Name: ClinicAppointment_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicAppointment_tenantId_status_idx" ON public."ClinicAppointment" USING btree ("tenantId", status);


--
-- Name: ClinicDentalRecord_patientId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicDentalRecord_patientId_idx" ON public."ClinicDentalRecord" USING btree ("patientId");


--
-- Name: ClinicDentalRecord_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicDentalRecord_tenantId_idx" ON public."ClinicDentalRecord" USING btree ("tenantId");


--
-- Name: ClinicDentalRecord_toothNumber_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicDentalRecord_toothNumber_idx" ON public."ClinicDentalRecord" USING btree ("toothNumber");


--
-- Name: ClinicDoctorProfile_staffId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ClinicDoctorProfile_staffId_key" ON public."ClinicDoctorProfile" USING btree ("staffId");


--
-- Name: ClinicDoctorProfile_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicDoctorProfile_tenantId_idx" ON public."ClinicDoctorProfile" USING btree ("tenantId");


--
-- Name: ClinicDoctorProfile_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicDoctorProfile_tenantId_isActive_idx" ON public."ClinicDoctorProfile" USING btree ("tenantId", "isActive");


--
-- Name: ClinicEncounter_appointmentId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ClinicEncounter_appointmentId_key" ON public."ClinicEncounter" USING btree ("appointmentId");


--
-- Name: ClinicEncounter_doctorId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicEncounter_doctorId_idx" ON public."ClinicEncounter" USING btree ("doctorId");


--
-- Name: ClinicEncounter_patientId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicEncounter_patientId_idx" ON public."ClinicEncounter" USING btree ("patientId");


--
-- Name: ClinicEncounter_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicEncounter_tenantId_idx" ON public."ClinicEncounter" USING btree ("tenantId");


--
-- Name: ClinicLabOrder_patientId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicLabOrder_patientId_idx" ON public."ClinicLabOrder" USING btree ("patientId");


--
-- Name: ClinicLabOrder_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicLabOrder_tenantId_idx" ON public."ClinicLabOrder" USING btree ("tenantId");


--
-- Name: ClinicLabOrder_tenantId_orderNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ClinicLabOrder_tenantId_orderNumber_key" ON public."ClinicLabOrder" USING btree ("tenantId", "orderNumber");


--
-- Name: ClinicLabTest_orderId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicLabTest_orderId_idx" ON public."ClinicLabTest" USING btree ("orderId");


--
-- Name: ClinicPatientProfile_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicPatientProfile_customerId_idx" ON public."ClinicPatientProfile" USING btree ("customerId");


--
-- Name: ClinicPatientProfile_customerId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ClinicPatientProfile_customerId_key" ON public."ClinicPatientProfile" USING btree ("customerId");


--
-- Name: ClinicPatientProfile_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicPatientProfile_tenantId_idx" ON public."ClinicPatientProfile" USING btree ("tenantId");


--
-- Name: ClinicPatientProfile_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicPatientProfile_tenantId_isActive_idx" ON public."ClinicPatientProfile" USING btree ("tenantId", "isActive");


--
-- Name: ClinicPatientProfile_tenantId_mrn_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ClinicPatientProfile_tenantId_mrn_key" ON public."ClinicPatientProfile" USING btree ("tenantId", mrn);


--
-- Name: ClinicPhysioSession_patientId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicPhysioSession_patientId_idx" ON public."ClinicPhysioSession" USING btree ("patientId");


--
-- Name: ClinicPhysioSession_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicPhysioSession_tenantId_idx" ON public."ClinicPhysioSession" USING btree ("tenantId");


--
-- Name: ClinicPhysioSession_therapistId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicPhysioSession_therapistId_idx" ON public."ClinicPhysioSession" USING btree ("therapistId");


--
-- Name: ClinicPrescriptionItem_prescriptionId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicPrescriptionItem_prescriptionId_idx" ON public."ClinicPrescriptionItem" USING btree ("prescriptionId");


--
-- Name: ClinicPrescription_doctorId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicPrescription_doctorId_idx" ON public."ClinicPrescription" USING btree ("doctorId");


--
-- Name: ClinicPrescription_patientId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicPrescription_patientId_idx" ON public."ClinicPrescription" USING btree ("patientId");


--
-- Name: ClinicPrescription_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicPrescription_tenantId_idx" ON public."ClinicPrescription" USING btree ("tenantId");


--
-- Name: ClinicPrescription_tenantId_prescriptionNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ClinicPrescription_tenantId_prescriptionNumber_key" ON public."ClinicPrescription" USING btree ("tenantId", "prescriptionNumber");


--
-- Name: ClinicReferral_patientId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicReferral_patientId_idx" ON public."ClinicReferral" USING btree ("patientId");


--
-- Name: ClinicReferral_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicReferral_tenantId_idx" ON public."ClinicReferral" USING btree ("tenantId");


--
-- Name: ClinicReferral_tenantId_referralNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ClinicReferral_tenantId_referralNumber_key" ON public."ClinicReferral" USING btree ("tenantId", "referralNumber");


--
-- Name: ClinicRoom_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicRoom_tenantId_idx" ON public."ClinicRoom" USING btree ("tenantId");


--
-- Name: ClinicRoom_tenantId_roomNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ClinicRoom_tenantId_roomNumber_key" ON public."ClinicRoom" USING btree ("tenantId", "roomNumber");


--
-- Name: ClinicService_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicService_tenantId_idx" ON public."ClinicService" USING btree ("tenantId");


--
-- Name: ClinicService_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ClinicService_tenantId_name_key" ON public."ClinicService" USING btree ("tenantId", name);


--
-- Name: ClinicVaccination_dueDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicVaccination_dueDate_idx" ON public."ClinicVaccination" USING btree ("dueDate");


--
-- Name: ClinicVaccination_patientId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicVaccination_patientId_idx" ON public."ClinicVaccination" USING btree ("patientId");


--
-- Name: ClinicVaccination_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicVaccination_status_idx" ON public."ClinicVaccination" USING btree (status);


--
-- Name: ClinicVaccination_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicVaccination_tenantId_idx" ON public."ClinicVaccination" USING btree ("tenantId");


--
-- Name: ClinicVitals_appointmentId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ClinicVitals_appointmentId_key" ON public."ClinicVitals" USING btree ("appointmentId");


--
-- Name: ClinicVitals_patientId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ClinicVitals_patientId_idx" ON public."ClinicVitals" USING btree ("patientId");


--
-- Name: ControlledSubstanceLog_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ControlledSubstanceLog_productId_idx" ON public."ControlledSubstanceLog" USING btree ("productId");


--
-- Name: ControlledSubstanceLog_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ControlledSubstanceLog_tenantId_idx" ON public."ControlledSubstanceLog" USING btree ("tenantId");


--
-- Name: ControlledSubstanceLog_tenantId_logDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ControlledSubstanceLog_tenantId_logDate_idx" ON public."ControlledSubstanceLog" USING btree ("tenantId", "logDate");


--
-- Name: ControlledSubstanceLog_tenantId_logNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ControlledSubstanceLog_tenantId_logNumber_key" ON public."ControlledSubstanceLog" USING btree ("tenantId", "logNumber");


--
-- Name: CreditTransaction_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CreditTransaction_tenantId_createdAt_idx" ON public."CreditTransaction" USING btree ("tenantId", "createdAt");


--
-- Name: CreditTransaction_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CreditTransaction_tenantId_idx" ON public."CreditTransaction" USING btree ("tenantId");


--
-- Name: CustomerLedger_customerId_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CustomerLedger_customerId_createdAt_idx" ON public."CustomerLedger" USING btree ("customerId", "createdAt");


--
-- Name: CustomerLedger_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CustomerLedger_customerId_idx" ON public."CustomerLedger" USING btree ("customerId");


--
-- Name: CustomerLedger_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CustomerLedger_tenantId_idx" ON public."CustomerLedger" USING btree ("tenantId");


--
-- Name: CustomerReadingListItem_listId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CustomerReadingListItem_listId_idx" ON public."CustomerReadingListItem" USING btree ("listId");


--
-- Name: CustomerReadingListItem_listId_productId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "CustomerReadingListItem_listId_productId_key" ON public."CustomerReadingListItem" USING btree ("listId", "productId");


--
-- Name: CustomerReadingList_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CustomerReadingList_customerId_idx" ON public."CustomerReadingList" USING btree ("customerId");


--
-- Name: CustomerReadingList_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CustomerReadingList_tenantId_idx" ON public."CustomerReadingList" USING btree ("tenantId");


--
-- Name: CustomerVehicle_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CustomerVehicle_customerId_idx" ON public."CustomerVehicle" USING btree ("customerId");


--
-- Name: CustomerVehicle_tenantId_fitnessExpiry_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CustomerVehicle_tenantId_fitnessExpiry_idx" ON public."CustomerVehicle" USING btree ("tenantId", "fitnessExpiry");


--
-- Name: CustomerVehicle_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CustomerVehicle_tenantId_idx" ON public."CustomerVehicle" USING btree ("tenantId");


--
-- Name: CustomerVehicle_tenantId_insuranceExpiry_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CustomerVehicle_tenantId_insuranceExpiry_idx" ON public."CustomerVehicle" USING btree ("tenantId", "insuranceExpiry");


--
-- Name: CustomerVehicle_tenantId_registrationNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "CustomerVehicle_tenantId_registrationNumber_key" ON public."CustomerVehicle" USING btree ("tenantId", "registrationNumber");


--
-- Name: CustomerVehicle_tenantId_tokenTaxExpiry_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "CustomerVehicle_tenantId_tokenTaxExpiry_idx" ON public."CustomerVehicle" USING btree ("tenantId", "tokenTaxExpiry");


--
-- Name: Customer_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Customer_tenantId_idx" ON public."Customer" USING btree ("tenantId");


--
-- Name: Customer_tenantId_isVip_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Customer_tenantId_isVip_idx" ON public."Customer" USING btree ("tenantId", "isVip");


--
-- Name: Customer_tenantId_name_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Customer_tenantId_name_idx" ON public."Customer" USING btree ("tenantId", name);


--
-- Name: Customer_tenantId_phone_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Customer_tenantId_phone_idx" ON public."Customer" USING btree ("tenantId", phone);


--
-- Name: DairyCustomer_customerId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "DairyCustomer_customerId_key" ON public."DairyCustomer" USING btree ("customerId");


--
-- Name: DairyCustomer_routeId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DairyCustomer_routeId_idx" ON public."DairyCustomer" USING btree ("routeId");


--
-- Name: DairyCustomer_tenantId_customerNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "DairyCustomer_tenantId_customerNumber_key" ON public."DairyCustomer" USING btree ("tenantId", "customerNumber");


--
-- Name: DairyCustomer_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DairyCustomer_tenantId_idx" ON public."DairyCustomer" USING btree ("tenantId");


--
-- Name: DairyCustomer_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DairyCustomer_tenantId_status_idx" ON public."DairyCustomer" USING btree ("tenantId", status);


--
-- Name: DairyDelivery_dairyCustomerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DairyDelivery_dairyCustomerId_idx" ON public."DairyDelivery" USING btree ("dairyCustomerId");


--
-- Name: DairyDelivery_deliveryDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DairyDelivery_deliveryDate_idx" ON public."DairyDelivery" USING btree ("deliveryDate");


--
-- Name: DairyDelivery_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DairyDelivery_tenantId_idx" ON public."DairyDelivery" USING btree ("tenantId");


--
-- Name: DairyDelivery_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DairyDelivery_tenantId_status_idx" ON public."DairyDelivery" USING btree ("tenantId", status);


--
-- Name: DairyFarmerSupply_farmerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DairyFarmerSupply_farmerId_idx" ON public."DairyFarmerSupply" USING btree ("farmerId");


--
-- Name: DairyFarmerSupply_supplyDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DairyFarmerSupply_supplyDate_idx" ON public."DairyFarmerSupply" USING btree ("supplyDate");


--
-- Name: DairyFarmerSupply_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DairyFarmerSupply_tenantId_idx" ON public."DairyFarmerSupply" USING btree ("tenantId");


--
-- Name: DairyFarmer_tenantId_farmerNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "DairyFarmer_tenantId_farmerNumber_key" ON public."DairyFarmer" USING btree ("tenantId", "farmerNumber");


--
-- Name: DairyFarmer_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DairyFarmer_tenantId_idx" ON public."DairyFarmer" USING btree ("tenantId");


--
-- Name: DairyFarmer_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DairyFarmer_tenantId_isActive_idx" ON public."DairyFarmer" USING btree ("tenantId", "isActive");


--
-- Name: DairyMonthlyBill_dairyCustomerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DairyMonthlyBill_dairyCustomerId_idx" ON public."DairyMonthlyBill" USING btree ("dairyCustomerId");


--
-- Name: DairyMonthlyBill_dairyCustomerId_month_year_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "DairyMonthlyBill_dairyCustomerId_month_year_key" ON public."DairyMonthlyBill" USING btree ("dairyCustomerId", month, year);


--
-- Name: DairyMonthlyBill_tenantId_billNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "DairyMonthlyBill_tenantId_billNumber_key" ON public."DairyMonthlyBill" USING btree ("tenantId", "billNumber");


--
-- Name: DairyMonthlyBill_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DairyMonthlyBill_tenantId_idx" ON public."DairyMonthlyBill" USING btree ("tenantId");


--
-- Name: DairyProduct_productId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "DairyProduct_productId_key" ON public."DairyProduct" USING btree ("productId");


--
-- Name: DairyProduct_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DairyProduct_tenantId_idx" ON public."DairyProduct" USING btree ("tenantId");


--
-- Name: DairyProduct_tenantId_productType_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DairyProduct_tenantId_productType_idx" ON public."DairyProduct" USING btree ("tenantId", "productType");


--
-- Name: DairyQualityTest_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DairyQualityTest_tenantId_idx" ON public."DairyQualityTest" USING btree ("tenantId");


--
-- Name: DairyQualityTest_tenantId_testNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "DairyQualityTest_tenantId_testNumber_key" ON public."DairyQualityTest" USING btree ("tenantId", "testNumber");


--
-- Name: DairyQualityTest_testedAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DairyQualityTest_testedAt_idx" ON public."DairyQualityTest" USING btree ("testedAt");


--
-- Name: DairyRoute_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DairyRoute_tenantId_idx" ON public."DairyRoute" USING btree ("tenantId");


--
-- Name: DairyRoute_tenantId_routeNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "DairyRoute_tenantId_routeNumber_key" ON public."DairyRoute" USING btree ("tenantId", "routeNumber");


--
-- Name: DamageLog_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DamageLog_createdAt_idx" ON public."DamageLog" USING btree ("createdAt");


--
-- Name: DamageLog_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DamageLog_productId_idx" ON public."DamageLog" USING btree ("productId");


--
-- Name: DamageLog_shopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DamageLog_shopId_idx" ON public."DamageLog" USING btree ("shopId");


--
-- Name: DamageLog_tenantId_damageNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "DamageLog_tenantId_damageNumber_key" ON public."DamageLog" USING btree ("tenantId", "damageNumber");


--
-- Name: DamageLog_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DamageLog_tenantId_idx" ON public."DamageLog" USING btree ("tenantId");


--
-- Name: DamageLog_tenantId_reasonCode_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DamageLog_tenantId_reasonCode_idx" ON public."DamageLog" USING btree ("tenantId", "reasonCode");


--
-- Name: DamageLog_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DamageLog_tenantId_status_idx" ON public."DamageLog" USING btree ("tenantId", status);


--
-- Name: DeliveryTracking_orderId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "DeliveryTracking_orderId_key" ON public."DeliveryTracking" USING btree ("orderId");


--
-- Name: DeliveryTracking_riderId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DeliveryTracking_riderId_idx" ON public."DeliveryTracking" USING btree ("riderId");


--
-- Name: DeliveryTracking_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DeliveryTracking_status_idx" ON public."DeliveryTracking" USING btree (status);


--
-- Name: DiscountCode_tenantId_code_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "DiscountCode_tenantId_code_key" ON public."DiscountCode" USING btree ("tenantId", code);


--
-- Name: DiscountCode_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DiscountCode_tenantId_idx" ON public."DiscountCode" USING btree ("tenantId");


--
-- Name: DiscountCode_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DiscountCode_tenantId_isActive_idx" ON public."DiscountCode" USING btree ("tenantId", "isActive");


--
-- Name: Doctor_specialization_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Doctor_specialization_idx" ON public."Doctor" USING btree (specialization);


--
-- Name: Doctor_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Doctor_tenantId_idx" ON public."Doctor" USING btree ("tenantId");


--
-- Name: Doctor_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Doctor_tenantId_isActive_idx" ON public."Doctor" USING btree ("tenantId", "isActive");


--
-- Name: Doctor_tenantId_registrationNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Doctor_tenantId_registrationNumber_key" ON public."Doctor" USING btree ("tenantId", "registrationNumber");


--
-- Name: DrugInteraction_saltAId_saltBId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "DrugInteraction_saltAId_saltBId_key" ON public."DrugInteraction" USING btree ("saltAId", "saltBId");


--
-- Name: DrugInteraction_severity_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DrugInteraction_severity_idx" ON public."DrugInteraction" USING btree (severity);


--
-- Name: DrugInteraction_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "DrugInteraction_tenantId_idx" ON public."DrugInteraction" USING btree ("tenantId");


--
-- Name: EmailLog_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "EmailLog_createdAt_idx" ON public."EmailLog" USING btree ("createdAt");


--
-- Name: EmailLog_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "EmailLog_status_idx" ON public."EmailLog" USING btree (status);


--
-- Name: EmailLog_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "EmailLog_tenantId_idx" ON public."EmailLog" USING btree ("tenantId");


--
-- Name: EmailLog_toEmail_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "EmailLog_toEmail_idx" ON public."EmailLog" USING btree ("toEmail");


--
-- Name: EmailTemplate_slug_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "EmailTemplate_slug_idx" ON public."EmailTemplate" USING btree (slug);


--
-- Name: EmailTemplate_slug_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "EmailTemplate_slug_key" ON public."EmailTemplate" USING btree (slug);


--
-- Name: EmiInstallment_dueDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "EmiInstallment_dueDate_idx" ON public."EmiInstallment" USING btree ("dueDate");


--
-- Name: EmiInstallment_planId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "EmiInstallment_planId_idx" ON public."EmiInstallment" USING btree ("planId");


--
-- Name: EmiInstallment_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "EmiInstallment_status_idx" ON public."EmiInstallment" USING btree (status);


--
-- Name: EmiPlan_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "EmiPlan_customerId_idx" ON public."EmiPlan" USING btree ("customerId");


--
-- Name: EmiPlan_saleId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "EmiPlan_saleId_key" ON public."EmiPlan" USING btree ("saleId");


--
-- Name: EmiPlan_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "EmiPlan_status_idx" ON public."EmiPlan" USING btree (status);


--
-- Name: EmiPlan_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "EmiPlan_tenantId_idx" ON public."EmiPlan" USING btree ("tenantId");


--
-- Name: EmiPlan_tenantId_planNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "EmiPlan_tenantId_planNumber_key" ON public."EmiPlan" USING btree ("tenantId", "planNumber");


--
-- Name: ExpenseCategory_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ExpenseCategory_tenantId_idx" ON public."ExpenseCategory" USING btree ("tenantId");


--
-- Name: ExpenseCategory_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ExpenseCategory_tenantId_name_key" ON public."ExpenseCategory" USING btree ("tenantId", name);


--
-- Name: Expense_categoryId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Expense_categoryId_idx" ON public."Expense" USING btree ("categoryId");


--
-- Name: Expense_tenantId_expenseDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Expense_tenantId_expenseDate_idx" ON public."Expense" USING btree ("tenantId", "expenseDate");


--
-- Name: Expense_tenantId_expenseNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Expense_tenantId_expenseNumber_key" ON public."Expense" USING btree ("tenantId", "expenseNumber");


--
-- Name: Expense_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Expense_tenantId_idx" ON public."Expense" USING btree ("tenantId");


--
-- Name: GarmentAlterationTicket_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentAlterationTicket_customerId_idx" ON public."GarmentAlterationTicket" USING btree ("customerId");


--
-- Name: GarmentAlterationTicket_promisedDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentAlterationTicket_promisedDate_idx" ON public."GarmentAlterationTicket" USING btree ("promisedDate");


--
-- Name: GarmentAlterationTicket_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentAlterationTicket_tenantId_idx" ON public."GarmentAlterationTicket" USING btree ("tenantId");


--
-- Name: GarmentAlterationTicket_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentAlterationTicket_tenantId_status_idx" ON public."GarmentAlterationTicket" USING btree ("tenantId", status);


--
-- Name: GarmentAlterationTicket_tenantId_ticketNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "GarmentAlterationTicket_tenantId_ticketNumber_key" ON public."GarmentAlterationTicket" USING btree ("tenantId", "ticketNumber");


--
-- Name: GarmentCollection_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentCollection_tenantId_idx" ON public."GarmentCollection" USING btree ("tenantId");


--
-- Name: GarmentCollection_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentCollection_tenantId_isActive_idx" ON public."GarmentCollection" USING btree ("tenantId", "isActive");


--
-- Name: GarmentCollection_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "GarmentCollection_tenantId_name_key" ON public."GarmentCollection" USING btree ("tenantId", name);


--
-- Name: GarmentCollection_tenantId_season_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentCollection_tenantId_season_idx" ON public."GarmentCollection" USING btree ("tenantId", season);


--
-- Name: GarmentLayawayInstallment_dueDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentLayawayInstallment_dueDate_idx" ON public."GarmentLayawayInstallment" USING btree ("dueDate");


--
-- Name: GarmentLayawayInstallment_planId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentLayawayInstallment_planId_idx" ON public."GarmentLayawayInstallment" USING btree ("planId");


--
-- Name: GarmentLayawayInstallment_planId_installmentNo_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "GarmentLayawayInstallment_planId_installmentNo_key" ON public."GarmentLayawayInstallment" USING btree ("planId", "installmentNo");


--
-- Name: GarmentLayawayInstallment_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentLayawayInstallment_status_idx" ON public."GarmentLayawayInstallment" USING btree (status);


--
-- Name: GarmentLayawayPlan_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentLayawayPlan_customerId_idx" ON public."GarmentLayawayPlan" USING btree ("customerId");


--
-- Name: GarmentLayawayPlan_nextDueDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentLayawayPlan_nextDueDate_idx" ON public."GarmentLayawayPlan" USING btree ("nextDueDate");


--
-- Name: GarmentLayawayPlan_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentLayawayPlan_tenantId_idx" ON public."GarmentLayawayPlan" USING btree ("tenantId");


--
-- Name: GarmentLayawayPlan_tenantId_planNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "GarmentLayawayPlan_tenantId_planNumber_key" ON public."GarmentLayawayPlan" USING btree ("tenantId", "planNumber");


--
-- Name: GarmentLayawayPlan_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentLayawayPlan_tenantId_status_idx" ON public."GarmentLayawayPlan" USING btree ("tenantId", status);


--
-- Name: GarmentMeasurementProfile_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentMeasurementProfile_customerId_idx" ON public."GarmentMeasurementProfile" USING btree ("customerId");


--
-- Name: GarmentMeasurementProfile_tenantId_customerId_profileName_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "GarmentMeasurementProfile_tenantId_customerId_profileName_key" ON public."GarmentMeasurementProfile" USING btree ("tenantId", "customerId", "profileName");


--
-- Name: GarmentMeasurementProfile_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentMeasurementProfile_tenantId_idx" ON public."GarmentMeasurementProfile" USING btree ("tenantId");


--
-- Name: GarmentProductProfile_collectionId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentProductProfile_collectionId_idx" ON public."GarmentProductProfile" USING btree ("collectionId");


--
-- Name: GarmentProductProfile_productId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "GarmentProductProfile_productId_key" ON public."GarmentProductProfile" USING btree ("productId");


--
-- Name: GarmentProductProfile_tenantId_categoryType_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentProductProfile_tenantId_categoryType_idx" ON public."GarmentProductProfile" USING btree ("tenantId", "categoryType");


--
-- Name: GarmentProductProfile_tenantId_gender_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentProductProfile_tenantId_gender_idx" ON public."GarmentProductProfile" USING btree ("tenantId", gender);


--
-- Name: GarmentProductProfile_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentProductProfile_tenantId_idx" ON public."GarmentProductProfile" USING btree ("tenantId");


--
-- Name: GarmentProductProfile_tenantId_season_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentProductProfile_tenantId_season_idx" ON public."GarmentProductProfile" USING btree ("tenantId", season);


--
-- Name: GarmentReservation_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentReservation_customerId_idx" ON public."GarmentReservation" USING btree ("customerId");


--
-- Name: GarmentReservation_expiresAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentReservation_expiresAt_idx" ON public."GarmentReservation" USING btree ("expiresAt");


--
-- Name: GarmentReservation_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentReservation_productId_idx" ON public."GarmentReservation" USING btree ("productId");


--
-- Name: GarmentReservation_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentReservation_tenantId_idx" ON public."GarmentReservation" USING btree ("tenantId");


--
-- Name: GarmentReservation_tenantId_reservationNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "GarmentReservation_tenantId_reservationNumber_key" ON public."GarmentReservation" USING btree ("tenantId", "reservationNumber");


--
-- Name: GarmentReservation_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentReservation_tenantId_status_idx" ON public."GarmentReservation" USING btree ("tenantId", status);


--
-- Name: GarmentSizeChart_tenantId_categoryType_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentSizeChart_tenantId_categoryType_idx" ON public."GarmentSizeChart" USING btree ("tenantId", "categoryType");


--
-- Name: GarmentSizeChart_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentSizeChart_tenantId_idx" ON public."GarmentSizeChart" USING btree ("tenantId");


--
-- Name: GarmentSizeChart_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "GarmentSizeChart_tenantId_name_key" ON public."GarmentSizeChart" USING btree ("tenantId", name);


--
-- Name: GarmentTailoringOrderItem_fabricProductId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentTailoringOrderItem_fabricProductId_idx" ON public."GarmentTailoringOrderItem" USING btree ("fabricProductId");


--
-- Name: GarmentTailoringOrderItem_orderId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentTailoringOrderItem_orderId_idx" ON public."GarmentTailoringOrderItem" USING btree ("orderId");


--
-- Name: GarmentTailoringOrderItem_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentTailoringOrderItem_productId_idx" ON public."GarmentTailoringOrderItem" USING btree ("productId");


--
-- Name: GarmentTailoringOrder_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentTailoringOrder_customerId_idx" ON public."GarmentTailoringOrder" USING btree ("customerId");


--
-- Name: GarmentTailoringOrder_promisedDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentTailoringOrder_promisedDate_idx" ON public."GarmentTailoringOrder" USING btree ("promisedDate");


--
-- Name: GarmentTailoringOrder_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentTailoringOrder_tenantId_idx" ON public."GarmentTailoringOrder" USING btree ("tenantId");


--
-- Name: GarmentTailoringOrder_tenantId_orderNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "GarmentTailoringOrder_tenantId_orderNumber_key" ON public."GarmentTailoringOrder" USING btree ("tenantId", "orderNumber");


--
-- Name: GarmentTailoringOrder_tenantId_orderStatus_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentTailoringOrder_tenantId_orderStatus_idx" ON public."GarmentTailoringOrder" USING btree ("tenantId", "orderStatus");


--
-- Name: GarmentTailoringPayment_orderId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentTailoringPayment_orderId_idx" ON public."GarmentTailoringPayment" USING btree ("orderId");


--
-- Name: GarmentVariantProfile_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentVariantProfile_productId_idx" ON public."GarmentVariantProfile" USING btree ("productId");


--
-- Name: GarmentVariantProfile_tenantId_colorFamily_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentVariantProfile_tenantId_colorFamily_idx" ON public."GarmentVariantProfile" USING btree ("tenantId", "colorFamily");


--
-- Name: GarmentVariantProfile_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentVariantProfile_tenantId_idx" ON public."GarmentVariantProfile" USING btree ("tenantId");


--
-- Name: GarmentVariantProfile_tenantId_size_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GarmentVariantProfile_tenantId_size_idx" ON public."GarmentVariantProfile" USING btree ("tenantId", size);


--
-- Name: GarmentVariantProfile_variantId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "GarmentVariantProfile_variantId_key" ON public."GarmentVariantProfile" USING btree ("variantId");


--
-- Name: GymAttendance_checkInAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymAttendance_checkInAt_idx" ON public."GymAttendance" USING btree ("checkInAt");


--
-- Name: GymAttendance_memberId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymAttendance_memberId_idx" ON public."GymAttendance" USING btree ("memberId");


--
-- Name: GymAttendance_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymAttendance_tenantId_idx" ON public."GymAttendance" USING btree ("tenantId");


--
-- Name: GymBodyMeasurement_measurementDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymBodyMeasurement_measurementDate_idx" ON public."GymBodyMeasurement" USING btree ("measurementDate");


--
-- Name: GymBodyMeasurement_memberId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymBodyMeasurement_memberId_idx" ON public."GymBodyMeasurement" USING btree ("memberId");


--
-- Name: GymBodyMeasurement_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymBodyMeasurement_tenantId_idx" ON public."GymBodyMeasurement" USING btree ("tenantId");


--
-- Name: GymClassBooking_classId_memberId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "GymClassBooking_classId_memberId_key" ON public."GymClassBooking" USING btree ("classId", "memberId");


--
-- Name: GymClassBooking_memberId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymClassBooking_memberId_idx" ON public."GymClassBooking" USING btree ("memberId");


--
-- Name: GymClassBooking_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymClassBooking_tenantId_idx" ON public."GymClassBooking" USING btree ("tenantId");


--
-- Name: GymClass_scheduledStart_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymClass_scheduledStart_idx" ON public."GymClass" USING btree ("scheduledStart");


--
-- Name: GymClass_tenantId_classType_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymClass_tenantId_classType_idx" ON public."GymClass" USING btree ("tenantId", "classType");


--
-- Name: GymClass_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymClass_tenantId_idx" ON public."GymClass" USING btree ("tenantId");


--
-- Name: GymDietPlan_memberId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymDietPlan_memberId_idx" ON public."GymDietPlan" USING btree ("memberId");


--
-- Name: GymDietPlan_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymDietPlan_tenantId_idx" ON public."GymDietPlan" USING btree ("tenantId");


--
-- Name: GymEquipment_tenantId_category_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymEquipment_tenantId_category_idx" ON public."GymEquipment" USING btree ("tenantId", category);


--
-- Name: GymEquipment_tenantId_equipmentNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "GymEquipment_tenantId_equipmentNumber_key" ON public."GymEquipment" USING btree ("tenantId", "equipmentNumber");


--
-- Name: GymEquipment_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymEquipment_tenantId_idx" ON public."GymEquipment" USING btree ("tenantId");


--
-- Name: GymEquipment_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymEquipment_tenantId_status_idx" ON public."GymEquipment" USING btree ("tenantId", status);


--
-- Name: GymMemberMembership_endDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymMemberMembership_endDate_idx" ON public."GymMemberMembership" USING btree ("endDate");


--
-- Name: GymMemberMembership_memberId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymMemberMembership_memberId_idx" ON public."GymMemberMembership" USING btree ("memberId");


--
-- Name: GymMemberMembership_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymMemberMembership_tenantId_idx" ON public."GymMemberMembership" USING btree ("tenantId");


--
-- Name: GymMemberMembership_tenantId_membershipNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "GymMemberMembership_tenantId_membershipNumber_key" ON public."GymMemberMembership" USING btree ("tenantId", "membershipNumber");


--
-- Name: GymMemberMembership_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymMemberMembership_tenantId_status_idx" ON public."GymMemberMembership" USING btree ("tenantId", status);


--
-- Name: GymMember_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymMember_customerId_idx" ON public."GymMember" USING btree ("customerId");


--
-- Name: GymMember_customerId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "GymMember_customerId_key" ON public."GymMember" USING btree ("customerId");


--
-- Name: GymMember_referralCode_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "GymMember_referralCode_key" ON public."GymMember" USING btree ("referralCode");


--
-- Name: GymMember_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymMember_tenantId_idx" ON public."GymMember" USING btree ("tenantId");


--
-- Name: GymMember_tenantId_memberNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "GymMember_tenantId_memberNumber_key" ON public."GymMember" USING btree ("tenantId", "memberNumber");


--
-- Name: GymMember_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymMember_tenantId_status_idx" ON public."GymMember" USING btree ("tenantId", status);


--
-- Name: GymMembershipPlan_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymMembershipPlan_tenantId_idx" ON public."GymMembershipPlan" USING btree ("tenantId");


--
-- Name: GymMembershipPlan_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "GymMembershipPlan_tenantId_name_key" ON public."GymMembershipPlan" USING btree ("tenantId", name);


--
-- Name: GymPersonalTraining_memberId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymPersonalTraining_memberId_idx" ON public."GymPersonalTraining" USING btree ("memberId");


--
-- Name: GymPersonalTraining_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymPersonalTraining_tenantId_idx" ON public."GymPersonalTraining" USING btree ("tenantId");


--
-- Name: GymPersonalTraining_tenantId_sessionNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "GymPersonalTraining_tenantId_sessionNumber_key" ON public."GymPersonalTraining" USING btree ("tenantId", "sessionNumber");


--
-- Name: GymPersonalTraining_trainerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymPersonalTraining_trainerId_idx" ON public."GymPersonalTraining" USING btree ("trainerId");


--
-- Name: GymTrainer_staffId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "GymTrainer_staffId_key" ON public."GymTrainer" USING btree ("staffId");


--
-- Name: GymTrainer_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymTrainer_tenantId_idx" ON public."GymTrainer" USING btree ("tenantId");


--
-- Name: GymTrainer_tenantId_role_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymTrainer_tenantId_role_idx" ON public."GymTrainer" USING btree ("tenantId", role);


--
-- Name: GymTrainer_tenantId_trainerNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "GymTrainer_tenantId_trainerNumber_key" ON public."GymTrainer" USING btree ("tenantId", "trainerNumber");


--
-- Name: GymWorkoutSession_memberId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymWorkoutSession_memberId_idx" ON public."GymWorkoutSession" USING btree ("memberId");


--
-- Name: GymWorkoutSession_sessionDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymWorkoutSession_sessionDate_idx" ON public."GymWorkoutSession" USING btree ("sessionDate");


--
-- Name: GymWorkoutSession_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "GymWorkoutSession_tenantId_idx" ON public."GymWorkoutSession" USING btree ("tenantId");


--
-- Name: HappyHourRule_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HappyHourRule_tenantId_idx" ON public."HappyHourRule" USING btree ("tenantId");


--
-- Name: HappyHourRule_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HappyHourRule_tenantId_isActive_idx" ON public."HappyHourRule" USING btree ("tenantId", "isActive");


--
-- Name: HardwareBrand_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareBrand_tenantId_idx" ON public."HardwareBrand" USING btree ("tenantId");


--
-- Name: HardwareBrand_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "HardwareBrand_tenantId_name_key" ON public."HardwareBrand" USING btree ("tenantId", name);


--
-- Name: HardwareBrand_tenantId_tier_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareBrand_tenantId_tier_idx" ON public."HardwareBrand" USING btree ("tenantId", tier);


--
-- Name: HardwareBulkPricing_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareBulkPricing_productId_idx" ON public."HardwareBulkPricing" USING btree ("productId");


--
-- Name: HardwareBulkPricing_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareBulkPricing_tenantId_idx" ON public."HardwareBulkPricing" USING btree ("tenantId");


--
-- Name: HardwareCreditAccount_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareCreditAccount_customerId_idx" ON public."HardwareCreditAccount" USING btree ("customerId");


--
-- Name: HardwareCreditAccount_customerId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "HardwareCreditAccount_customerId_key" ON public."HardwareCreditAccount" USING btree ("customerId");


--
-- Name: HardwareCreditAccount_tenantId_accountNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "HardwareCreditAccount_tenantId_accountNumber_key" ON public."HardwareCreditAccount" USING btree ("tenantId", "accountNumber");


--
-- Name: HardwareCreditAccount_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareCreditAccount_tenantId_idx" ON public."HardwareCreditAccount" USING btree ("tenantId");


--
-- Name: HardwareCreditAccount_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareCreditAccount_tenantId_status_idx" ON public."HardwareCreditAccount" USING btree ("tenantId", status);


--
-- Name: HardwareCreditTransaction_accountId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareCreditTransaction_accountId_idx" ON public."HardwareCreditTransaction" USING btree ("accountId");


--
-- Name: HardwareCreditTransaction_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareCreditTransaction_tenantId_idx" ON public."HardwareCreditTransaction" USING btree ("tenantId");


--
-- Name: HardwareCreditTransaction_tenantId_transactionNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "HardwareCreditTransaction_tenantId_transactionNumber_key" ON public."HardwareCreditTransaction" USING btree ("tenantId", "transactionNumber");


--
-- Name: HardwareCreditTransaction_transactionDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareCreditTransaction_transactionDate_idx" ON public."HardwareCreditTransaction" USING btree ("transactionDate");


--
-- Name: HardwareDeliveryItem_deliveryId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareDeliveryItem_deliveryId_idx" ON public."HardwareDeliveryItem" USING btree ("deliveryId");


--
-- Name: HardwareDelivery_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareDelivery_customerId_idx" ON public."HardwareDelivery" USING btree ("customerId");


--
-- Name: HardwareDelivery_projectId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareDelivery_projectId_idx" ON public."HardwareDelivery" USING btree ("projectId");


--
-- Name: HardwareDelivery_scheduledDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareDelivery_scheduledDate_idx" ON public."HardwareDelivery" USING btree ("scheduledDate");


--
-- Name: HardwareDelivery_tenantId_deliveryNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "HardwareDelivery_tenantId_deliveryNumber_key" ON public."HardwareDelivery" USING btree ("tenantId", "deliveryNumber");


--
-- Name: HardwareDelivery_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareDelivery_tenantId_idx" ON public."HardwareDelivery" USING btree ("tenantId");


--
-- Name: HardwareDelivery_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareDelivery_tenantId_status_idx" ON public."HardwareDelivery" USING btree ("tenantId", status);


--
-- Name: HardwareProductProfile_brandId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareProductProfile_brandId_idx" ON public."HardwareProductProfile" USING btree ("brandId");


--
-- Name: HardwareProductProfile_productId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "HardwareProductProfile_productId_key" ON public."HardwareProductProfile" USING btree ("productId");


--
-- Name: HardwareProductProfile_tenantId_categoryType_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareProductProfile_tenantId_categoryType_idx" ON public."HardwareProductProfile" USING btree ("tenantId", "categoryType");


--
-- Name: HardwareProductProfile_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareProductProfile_tenantId_idx" ON public."HardwareProductProfile" USING btree ("tenantId");


--
-- Name: HardwareProject_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareProject_customerId_idx" ON public."HardwareProject" USING btree ("customerId");


--
-- Name: HardwareProject_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareProject_tenantId_idx" ON public."HardwareProject" USING btree ("tenantId");


--
-- Name: HardwareProject_tenantId_projectNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "HardwareProject_tenantId_projectNumber_key" ON public."HardwareProject" USING btree ("tenantId", "projectNumber");


--
-- Name: HardwareProject_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareProject_tenantId_status_idx" ON public."HardwareProject" USING btree ("tenantId", status);


--
-- Name: HardwareQuotationItem_quotationId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareQuotationItem_quotationId_idx" ON public."HardwareQuotationItem" USING btree ("quotationId");


--
-- Name: HardwareQuotation_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareQuotation_customerId_idx" ON public."HardwareQuotation" USING btree ("customerId");


--
-- Name: HardwareQuotation_projectId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareQuotation_projectId_idx" ON public."HardwareQuotation" USING btree ("projectId");


--
-- Name: HardwareQuotation_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareQuotation_tenantId_idx" ON public."HardwareQuotation" USING btree ("tenantId");


--
-- Name: HardwareQuotation_tenantId_quotationNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "HardwareQuotation_tenantId_quotationNumber_key" ON public."HardwareQuotation" USING btree ("tenantId", "quotationNumber");


--
-- Name: HardwareQuotation_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareQuotation_tenantId_status_idx" ON public."HardwareQuotation" USING btree ("tenantId", status);


--
-- Name: HardwareReorderRule_productId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "HardwareReorderRule_productId_key" ON public."HardwareReorderRule" USING btree ("productId");


--
-- Name: HardwareReorderRule_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HardwareReorderRule_tenantId_idx" ON public."HardwareReorderRule" USING btree ("tenantId");


--
-- Name: HotelBookedRoom_bookingId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelBookedRoom_bookingId_idx" ON public."HotelBookedRoom" USING btree ("bookingId");


--
-- Name: HotelBookedRoom_roomId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelBookedRoom_roomId_idx" ON public."HotelBookedRoom" USING btree ("roomId");


--
-- Name: HotelBooking_checkInDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelBooking_checkInDate_idx" ON public."HotelBooking" USING btree ("checkInDate");


--
-- Name: HotelBooking_checkOutDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelBooking_checkOutDate_idx" ON public."HotelBooking" USING btree ("checkOutDate");


--
-- Name: HotelBooking_primaryGuestId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelBooking_primaryGuestId_idx" ON public."HotelBooking" USING btree ("primaryGuestId");


--
-- Name: HotelBooking_tenantId_bookingNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "HotelBooking_tenantId_bookingNumber_key" ON public."HotelBooking" USING btree ("tenantId", "bookingNumber");


--
-- Name: HotelBooking_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelBooking_tenantId_idx" ON public."HotelBooking" USING btree ("tenantId");


--
-- Name: HotelBooking_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelBooking_tenantId_status_idx" ON public."HotelBooking" USING btree ("tenantId", status);


--
-- Name: HotelFolioCharge_bookingId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelFolioCharge_bookingId_idx" ON public."HotelFolioCharge" USING btree ("bookingId");


--
-- Name: HotelFolioCharge_chargeDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelFolioCharge_chargeDate_idx" ON public."HotelFolioCharge" USING btree ("chargeDate");


--
-- Name: HotelGuest_email_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelGuest_email_idx" ON public."HotelGuest" USING btree (email);


--
-- Name: HotelGuest_idNumber_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelGuest_idNumber_idx" ON public."HotelGuest" USING btree ("idNumber");


--
-- Name: HotelGuest_phone_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelGuest_phone_idx" ON public."HotelGuest" USING btree (phone);


--
-- Name: HotelGuest_tenantId_guestNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "HotelGuest_tenantId_guestNumber_key" ON public."HotelGuest" USING btree ("tenantId", "guestNumber");


--
-- Name: HotelGuest_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelGuest_tenantId_idx" ON public."HotelGuest" USING btree ("tenantId");


--
-- Name: HotelHousekeepingTask_roomId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelHousekeepingTask_roomId_idx" ON public."HotelHousekeepingTask" USING btree ("roomId");


--
-- Name: HotelHousekeepingTask_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelHousekeepingTask_tenantId_idx" ON public."HotelHousekeepingTask" USING btree ("tenantId");


--
-- Name: HotelHousekeepingTask_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelHousekeepingTask_tenantId_status_idx" ON public."HotelHousekeepingTask" USING btree ("tenantId", status);


--
-- Name: HotelHousekeepingTask_tenantId_taskNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "HotelHousekeepingTask_tenantId_taskNumber_key" ON public."HotelHousekeepingTask" USING btree ("tenantId", "taskNumber");


--
-- Name: HotelRatePlan_tenantId_code_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "HotelRatePlan_tenantId_code_key" ON public."HotelRatePlan" USING btree ("tenantId", code);


--
-- Name: HotelRatePlan_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelRatePlan_tenantId_idx" ON public."HotelRatePlan" USING btree ("tenantId");


--
-- Name: HotelRatePlan_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelRatePlan_tenantId_isActive_idx" ON public."HotelRatePlan" USING btree ("tenantId", "isActive");


--
-- Name: HotelRoomType_tenantId_code_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "HotelRoomType_tenantId_code_key" ON public."HotelRoomType" USING btree ("tenantId", code);


--
-- Name: HotelRoomType_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelRoomType_tenantId_idx" ON public."HotelRoomType" USING btree ("tenantId");


--
-- Name: HotelRoomType_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelRoomType_tenantId_isActive_idx" ON public."HotelRoomType" USING btree ("tenantId", "isActive");


--
-- Name: HotelRoom_roomTypeId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelRoom_roomTypeId_idx" ON public."HotelRoom" USING btree ("roomTypeId");


--
-- Name: HotelRoom_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelRoom_tenantId_idx" ON public."HotelRoom" USING btree ("tenantId");


--
-- Name: HotelRoom_tenantId_roomNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "HotelRoom_tenantId_roomNumber_key" ON public."HotelRoom" USING btree ("tenantId", "roomNumber");


--
-- Name: HotelRoom_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "HotelRoom_tenantId_status_idx" ON public."HotelRoom" USING btree ("tenantId", status);


--
-- Name: Invoice_dueDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Invoice_dueDate_idx" ON public."Invoice" USING btree ("dueDate");


--
-- Name: Invoice_invoiceNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON public."Invoice" USING btree ("invoiceNumber");


--
-- Name: Invoice_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Invoice_status_idx" ON public."Invoice" USING btree (status);


--
-- Name: Invoice_subscriptionId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Invoice_subscriptionId_idx" ON public."Invoice" USING btree ("subscriptionId");


--
-- Name: Invoice_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Invoice_tenantId_idx" ON public."Invoice" USING btree ("tenantId");


--
-- Name: JewelryCustomOrder_assignedKarigarId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelryCustomOrder_assignedKarigarId_idx" ON public."JewelryCustomOrder" USING btree ("assignedKarigarId");


--
-- Name: JewelryCustomOrder_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelryCustomOrder_customerId_idx" ON public."JewelryCustomOrder" USING btree ("customerId");


--
-- Name: JewelryCustomOrder_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelryCustomOrder_tenantId_idx" ON public."JewelryCustomOrder" USING btree ("tenantId");


--
-- Name: JewelryCustomOrder_tenantId_orderNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "JewelryCustomOrder_tenantId_orderNumber_key" ON public."JewelryCustomOrder" USING btree ("tenantId", "orderNumber");


--
-- Name: JewelryCustomOrder_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelryCustomOrder_tenantId_status_idx" ON public."JewelryCustomOrder" USING btree ("tenantId", status);


--
-- Name: JewelryExchange_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelryExchange_customerId_idx" ON public."JewelryExchange" USING btree ("customerId");


--
-- Name: JewelryExchange_exchangeDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelryExchange_exchangeDate_idx" ON public."JewelryExchange" USING btree ("exchangeDate");


--
-- Name: JewelryExchange_tenantId_exchangeNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "JewelryExchange_tenantId_exchangeNumber_key" ON public."JewelryExchange" USING btree ("tenantId", "exchangeNumber");


--
-- Name: JewelryExchange_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelryExchange_tenantId_idx" ON public."JewelryExchange" USING btree ("tenantId");


--
-- Name: JewelryGemstone_jewelryProfileId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelryGemstone_jewelryProfileId_idx" ON public."JewelryGemstone" USING btree ("jewelryProfileId");


--
-- Name: JewelryKarigar_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelryKarigar_tenantId_idx" ON public."JewelryKarigar" USING btree ("tenantId");


--
-- Name: JewelryKarigar_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelryKarigar_tenantId_isActive_idx" ON public."JewelryKarigar" USING btree ("tenantId", "isActive");


--
-- Name: JewelryKarigar_tenantId_karigarNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "JewelryKarigar_tenantId_karigarNumber_key" ON public."JewelryKarigar" USING btree ("tenantId", "karigarNumber");


--
-- Name: JewelryMetalRate_effectiveDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelryMetalRate_effectiveDate_idx" ON public."JewelryMetalRate" USING btree ("effectiveDate");


--
-- Name: JewelryMetalRate_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelryMetalRate_tenantId_idx" ON public."JewelryMetalRate" USING btree ("tenantId");


--
-- Name: JewelryMetalRate_tenantId_metalType_purity_effectiveDate_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "JewelryMetalRate_tenantId_metalType_purity_effectiveDate_key" ON public."JewelryMetalRate" USING btree ("tenantId", "metalType", purity, "effectiveDate");


--
-- Name: JewelryMetalRate_tenantId_metalType_purity_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelryMetalRate_tenantId_metalType_purity_idx" ON public."JewelryMetalRate" USING btree ("tenantId", "metalType", purity);


--
-- Name: JewelryMetalStock_entryDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelryMetalStock_entryDate_idx" ON public."JewelryMetalStock" USING btree ("entryDate");


--
-- Name: JewelryMetalStock_tenantId_entryNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "JewelryMetalStock_tenantId_entryNumber_key" ON public."JewelryMetalStock" USING btree ("tenantId", "entryNumber");


--
-- Name: JewelryMetalStock_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelryMetalStock_tenantId_idx" ON public."JewelryMetalStock" USING btree ("tenantId");


--
-- Name: JewelryMetalStock_tenantId_metalType_purity_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelryMetalStock_tenantId_metalType_purity_idx" ON public."JewelryMetalStock" USING btree ("tenantId", "metalType", purity);


--
-- Name: JewelryProductProfile_productId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "JewelryProductProfile_productId_key" ON public."JewelryProductProfile" USING btree ("productId");


--
-- Name: JewelryProductProfile_tenantId_category_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelryProductProfile_tenantId_category_idx" ON public."JewelryProductProfile" USING btree ("tenantId", category);


--
-- Name: JewelryProductProfile_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelryProductProfile_tenantId_idx" ON public."JewelryProductProfile" USING btree ("tenantId");


--
-- Name: JewelryProductProfile_tenantId_metalType_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelryProductProfile_tenantId_metalType_idx" ON public."JewelryProductProfile" USING btree ("tenantId", "metalType");


--
-- Name: JewelryProductProfile_tenantId_purity_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelryProductProfile_tenantId_purity_idx" ON public."JewelryProductProfile" USING btree ("tenantId", purity);


--
-- Name: JewelrySaleItem_saleId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelrySaleItem_saleId_idx" ON public."JewelrySaleItem" USING btree ("saleId");


--
-- Name: JewelrySale_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelrySale_customerId_idx" ON public."JewelrySale" USING btree ("customerId");


--
-- Name: JewelrySale_saleDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelrySale_saleDate_idx" ON public."JewelrySale" USING btree ("saleDate");


--
-- Name: JewelrySale_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelrySale_tenantId_idx" ON public."JewelrySale" USING btree ("tenantId");


--
-- Name: JewelrySale_tenantId_invoiceNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "JewelrySale_tenantId_invoiceNumber_key" ON public."JewelrySale" USING btree ("tenantId", "invoiceNumber");


--
-- Name: JewelrySale_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "JewelrySale_tenantId_status_idx" ON public."JewelrySale" USING btree ("tenantId", status);


--
-- Name: KitchenStation_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "KitchenStation_tenantId_idx" ON public."KitchenStation" USING btree ("tenantId");


--
-- Name: KitchenStation_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "KitchenStation_tenantId_name_key" ON public."KitchenStation" USING btree ("tenantId", name);


--
-- Name: Kot_orderId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Kot_orderId_idx" ON public."Kot" USING btree ("orderId");


--
-- Name: Kot_station_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Kot_station_idx" ON public."Kot" USING btree (station);


--
-- Name: Kot_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Kot_status_idx" ON public."Kot" USING btree (status);


--
-- Name: Kot_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Kot_tenantId_idx" ON public."Kot" USING btree ("tenantId");


--
-- Name: Kot_tenantId_kotNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Kot_tenantId_kotNumber_key" ON public."Kot" USING btree ("tenantId", "kotNumber");


--
-- Name: LoginHistory_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "LoginHistory_createdAt_idx" ON public."LoginHistory" USING btree ("createdAt");


--
-- Name: LoginHistory_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "LoginHistory_tenantId_idx" ON public."LoginHistory" USING btree ("tenantId");


--
-- Name: LoginHistory_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "LoginHistory_userId_createdAt_idx" ON public."LoginHistory" USING btree ("userId", "createdAt");


--
-- Name: LoginHistory_userId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "LoginHistory_userId_idx" ON public."LoginHistory" USING btree ("userId");


--
-- Name: LoyaltyTransaction_customerId_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "LoyaltyTransaction_customerId_createdAt_idx" ON public."LoyaltyTransaction" USING btree ("customerId", "createdAt");


--
-- Name: LoyaltyTransaction_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "LoyaltyTransaction_customerId_idx" ON public."LoyaltyTransaction" USING btree ("customerId");


--
-- Name: LoyaltyTransaction_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "LoyaltyTransaction_tenantId_idx" ON public."LoyaltyTransaction" USING btree ("tenantId");


--
-- Name: MeatCuttingJob_slaughterLogId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatCuttingJob_slaughterLogId_idx" ON public."MeatCuttingJob" USING btree ("slaughterLogId");


--
-- Name: MeatCuttingJob_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatCuttingJob_tenantId_idx" ON public."MeatCuttingJob" USING btree ("tenantId");


--
-- Name: MeatCuttingJob_tenantId_jobNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "MeatCuttingJob_tenantId_jobNumber_key" ON public."MeatCuttingJob" USING btree ("tenantId", "jobNumber");


--
-- Name: MeatLiveAnimal_tenantId_animalType_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatLiveAnimal_tenantId_animalType_idx" ON public."MeatLiveAnimal" USING btree ("tenantId", "animalType");


--
-- Name: MeatLiveAnimal_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatLiveAnimal_tenantId_idx" ON public."MeatLiveAnimal" USING btree ("tenantId");


--
-- Name: MeatLiveAnimal_tenantId_isSlaughtered_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatLiveAnimal_tenantId_isSlaughtered_idx" ON public."MeatLiveAnimal" USING btree ("tenantId", "isSlaughtered");


--
-- Name: MeatLiveAnimal_tenantId_tagNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "MeatLiveAnimal_tenantId_tagNumber_key" ON public."MeatLiveAnimal" USING btree ("tenantId", "tagNumber");


--
-- Name: MeatProductProfile_productId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "MeatProductProfile_productId_key" ON public."MeatProductProfile" USING btree ("productId");


--
-- Name: MeatProductProfile_tenantId_animalType_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatProductProfile_tenantId_animalType_idx" ON public."MeatProductProfile" USING btree ("tenantId", "animalType");


--
-- Name: MeatProductProfile_tenantId_cutCategory_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatProductProfile_tenantId_cutCategory_idx" ON public."MeatProductProfile" USING btree ("tenantId", "cutCategory");


--
-- Name: MeatProductProfile_tenantId_freshnessType_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatProductProfile_tenantId_freshnessType_idx" ON public."MeatProductProfile" USING btree ("tenantId", "freshnessType");


--
-- Name: MeatProductProfile_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatProductProfile_tenantId_idx" ON public."MeatProductProfile" USING btree ("tenantId");


--
-- Name: MeatQurbaniBooking_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatQurbaniBooking_customerId_idx" ON public."MeatQurbaniBooking" USING btree ("customerId");


--
-- Name: MeatQurbaniBooking_tenantId_bookingNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "MeatQurbaniBooking_tenantId_bookingNumber_key" ON public."MeatQurbaniBooking" USING btree ("tenantId", "bookingNumber");


--
-- Name: MeatQurbaniBooking_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatQurbaniBooking_tenantId_idx" ON public."MeatQurbaniBooking" USING btree ("tenantId");


--
-- Name: MeatQurbaniBooking_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatQurbaniBooking_tenantId_status_idx" ON public."MeatQurbaniBooking" USING btree ("tenantId", status);


--
-- Name: MeatSlaughterLog_liveAnimalId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatSlaughterLog_liveAnimalId_idx" ON public."MeatSlaughterLog" USING btree ("liveAnimalId");


--
-- Name: MeatSlaughterLog_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatSlaughterLog_tenantId_idx" ON public."MeatSlaughterLog" USING btree ("tenantId");


--
-- Name: MeatSlaughterLog_tenantId_slaughterDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatSlaughterLog_tenantId_slaughterDate_idx" ON public."MeatSlaughterLog" USING btree ("tenantId", "slaughterDate");


--
-- Name: MeatSlaughterLog_tenantId_slaughterNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "MeatSlaughterLog_tenantId_slaughterNumber_key" ON public."MeatSlaughterLog" USING btree ("tenantId", "slaughterNumber");


--
-- Name: MeatSubscription_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatSubscription_customerId_idx" ON public."MeatSubscription" USING btree ("customerId");


--
-- Name: MeatSubscription_nextDeliveryDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatSubscription_nextDeliveryDate_idx" ON public."MeatSubscription" USING btree ("nextDeliveryDate");


--
-- Name: MeatSubscription_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatSubscription_tenantId_idx" ON public."MeatSubscription" USING btree ("tenantId");


--
-- Name: MeatSubscription_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatSubscription_tenantId_status_idx" ON public."MeatSubscription" USING btree ("tenantId", status);


--
-- Name: MeatSubscription_tenantId_subscriptionNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "MeatSubscription_tenantId_subscriptionNumber_key" ON public."MeatSubscription" USING btree ("tenantId", "subscriptionNumber");


--
-- Name: MeatWeightOrderItem_orderId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatWeightOrderItem_orderId_idx" ON public."MeatWeightOrderItem" USING btree ("orderId");


--
-- Name: MeatWeightOrder_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatWeightOrder_customerId_idx" ON public."MeatWeightOrder" USING btree ("customerId");


--
-- Name: MeatWeightOrder_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatWeightOrder_tenantId_idx" ON public."MeatWeightOrder" USING btree ("tenantId");


--
-- Name: MeatWeightOrder_tenantId_orderNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "MeatWeightOrder_tenantId_orderNumber_key" ON public."MeatWeightOrder" USING btree ("tenantId", "orderNumber");


--
-- Name: MeatWeightOrder_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatWeightOrder_tenantId_status_idx" ON public."MeatWeightOrder" USING btree ("tenantId", status);


--
-- Name: MeatWholesaleAccount_customerId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "MeatWholesaleAccount_customerId_key" ON public."MeatWholesaleAccount" USING btree ("customerId");


--
-- Name: MeatWholesaleAccount_tenantId_accountNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "MeatWholesaleAccount_tenantId_accountNumber_key" ON public."MeatWholesaleAccount" USING btree ("tenantId", "accountNumber");


--
-- Name: MeatWholesaleAccount_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatWholesaleAccount_tenantId_idx" ON public."MeatWholesaleAccount" USING btree ("tenantId");


--
-- Name: MeatWholesaleAccount_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MeatWholesaleAccount_tenantId_isActive_idx" ON public."MeatWholesaleAccount" USING btree ("tenantId", "isActive");


--
-- Name: MechanicProfile_staffId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "MechanicProfile_staffId_key" ON public."MechanicProfile" USING btree ("staffId");


--
-- Name: MechanicProfile_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MechanicProfile_tenantId_idx" ON public."MechanicProfile" USING btree ("tenantId");


--
-- Name: MedicineSubstitute_mainMedicineId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MedicineSubstitute_mainMedicineId_idx" ON public."MedicineSubstitute" USING btree ("mainMedicineId");


--
-- Name: MedicineSubstitute_mainMedicineId_substituteMedicineId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "MedicineSubstitute_mainMedicineId_substituteMedicineId_key" ON public."MedicineSubstitute" USING btree ("mainMedicineId", "substituteMedicineId");


--
-- Name: MedicineSubstitute_substituteMedicineId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MedicineSubstitute_substituteMedicineId_idx" ON public."MedicineSubstitute" USING btree ("substituteMedicineId");


--
-- Name: MenuItemModifier_menuItemId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MenuItemModifier_menuItemId_idx" ON public."MenuItemModifier" USING btree ("menuItemId");


--
-- Name: MenuItemModifier_menuItemId_modifierGroupId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "MenuItemModifier_menuItemId_modifierGroupId_key" ON public."MenuItemModifier" USING btree ("menuItemId", "modifierGroupId");


--
-- Name: MenuItemModifier_modifierGroupId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "MenuItemModifier_modifierGroupId_idx" ON public."MenuItemModifier" USING btree ("modifierGroupId");


--
-- Name: ModifierGroup_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ModifierGroup_tenantId_idx" ON public."ModifierGroup" USING btree ("tenantId");


--
-- Name: ModifierGroup_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ModifierGroup_tenantId_isActive_idx" ON public."ModifierGroup" USING btree ("tenantId", "isActive");


--
-- Name: ModifierOption_modifierGroupId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ModifierOption_modifierGroupId_idx" ON public."ModifierOption" USING btree ("modifierGroupId");


--
-- Name: ModifierOption_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ModifierOption_tenantId_idx" ON public."ModifierOption" USING btree ("tenantId");


--
-- Name: NotificationPreference_tenantId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "NotificationPreference_tenantId_key" ON public."NotificationPreference" USING btree ("tenantId");


--
-- Name: Notification_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Notification_tenantId_createdAt_idx" ON public."Notification" USING btree ("tenantId", "createdAt");


--
-- Name: Notification_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Notification_tenantId_idx" ON public."Notification" USING btree ("tenantId");


--
-- Name: Notification_userId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Notification_userId_idx" ON public."Notification" USING btree ("userId");


--
-- Name: Notification_userId_isRead_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Notification_userId_isRead_idx" ON public."Notification" USING btree ("userId", "isRead");


--
-- Name: OnboardingProgress_isCompleted_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "OnboardingProgress_isCompleted_idx" ON public."OnboardingProgress" USING btree ("isCompleted");


--
-- Name: OnboardingProgress_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "OnboardingProgress_tenantId_idx" ON public."OnboardingProgress" USING btree ("tenantId");


--
-- Name: OnboardingProgress_tenantId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "OnboardingProgress_tenantId_key" ON public."OnboardingProgress" USING btree ("tenantId");


--
-- Name: OnboardingProgress_userId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "OnboardingProgress_userId_idx" ON public."OnboardingProgress" USING btree ("userId");


--
-- Name: OtpCode_email_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "OtpCode_email_idx" ON public."OtpCode" USING btree (email);


--
-- Name: OtpCode_phone_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "OtpCode_phone_idx" ON public."OtpCode" USING btree (phone);


--
-- Name: OtpCode_purpose_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "OtpCode_purpose_idx" ON public."OtpCode" USING btree (purpose);


--
-- Name: PatientProfile_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "PatientProfile_customerId_idx" ON public."PatientProfile" USING btree ("customerId");


--
-- Name: PatientProfile_customerId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "PatientProfile_customerId_key" ON public."PatientProfile" USING btree ("customerId");


--
-- Name: PatientProfile_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "PatientProfile_tenantId_idx" ON public."PatientProfile" USING btree ("tenantId");


--
-- Name: Payment_provider_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Payment_provider_idx" ON public."Payment" USING btree (provider);


--
-- Name: Payment_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Payment_status_idx" ON public."Payment" USING btree (status);


--
-- Name: Payment_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Payment_tenantId_idx" ON public."Payment" USING btree ("tenantId");


--
-- Name: PharmacyMedicine_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "PharmacyMedicine_productId_idx" ON public."PharmacyMedicine" USING btree ("productId");


--
-- Name: PharmacyMedicine_productId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "PharmacyMedicine_productId_key" ON public."PharmacyMedicine" USING btree ("productId");


--
-- Name: PharmacyMedicine_registrationNumber_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "PharmacyMedicine_registrationNumber_idx" ON public."PharmacyMedicine" USING btree ("registrationNumber");


--
-- Name: PharmacyMedicine_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "PharmacyMedicine_tenantId_idx" ON public."PharmacyMedicine" USING btree ("tenantId");


--
-- Name: PharmacyMedicine_tenantId_scheduleClass_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "PharmacyMedicine_tenantId_scheduleClass_idx" ON public."PharmacyMedicine" USING btree ("tenantId", "scheduleClass");


--
-- Name: Plan_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Plan_name_key" ON public."Plan" USING btree (name);


--
-- Name: Plan_slug_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Plan_slug_key" ON public."Plan" USING btree (slug);


--
-- Name: PlatformDiscount_code_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "PlatformDiscount_code_idx" ON public."PlatformDiscount" USING btree (code);


--
-- Name: PlatformDiscount_code_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "PlatformDiscount_code_key" ON public."PlatformDiscount" USING btree (code);


--
-- Name: PlatformDiscount_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "PlatformDiscount_isActive_idx" ON public."PlatformDiscount" USING btree ("isActive");


--
-- Name: PrescriptionItem_prescriptionId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "PrescriptionItem_prescriptionId_idx" ON public."PrescriptionItem" USING btree ("prescriptionId");


--
-- Name: PrescriptionItem_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "PrescriptionItem_productId_idx" ON public."PrescriptionItem" USING btree ("productId");


--
-- Name: Prescription_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Prescription_customerId_idx" ON public."Prescription" USING btree ("customerId");


--
-- Name: Prescription_doctorId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Prescription_doctorId_idx" ON public."Prescription" USING btree ("doctorId");


--
-- Name: Prescription_prescriptionDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Prescription_prescriptionDate_idx" ON public."Prescription" USING btree ("prescriptionDate");


--
-- Name: Prescription_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Prescription_tenantId_idx" ON public."Prescription" USING btree ("tenantId");


--
-- Name: Prescription_tenantId_prescriptionNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Prescription_tenantId_prescriptionNumber_key" ON public."Prescription" USING btree ("tenantId", "prescriptionNumber");


--
-- Name: Prescription_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Prescription_tenantId_status_idx" ON public."Prescription" USING btree ("tenantId", status);


--
-- Name: ProductBatch_expiryDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductBatch_expiryDate_idx" ON public."ProductBatch" USING btree ("expiryDate");


--
-- Name: ProductBatch_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductBatch_productId_idx" ON public."ProductBatch" USING btree ("productId");


--
-- Name: ProductBatch_tenantId_expiryDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductBatch_tenantId_expiryDate_idx" ON public."ProductBatch" USING btree ("tenantId", "expiryDate");


--
-- Name: ProductBatch_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductBatch_tenantId_idx" ON public."ProductBatch" USING btree ("tenantId");


--
-- Name: ProductComboItem_comboId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductComboItem_comboId_idx" ON public."ProductComboItem" USING btree ("comboId");


--
-- Name: ProductComboItem_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductComboItem_productId_idx" ON public."ProductComboItem" USING btree ("productId");


--
-- Name: ProductComboItem_variantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductComboItem_variantId_idx" ON public."ProductComboItem" USING btree ("variantId");


--
-- Name: ProductCombo_barcode_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductCombo_barcode_idx" ON public."ProductCombo" USING btree (barcode);


--
-- Name: ProductCombo_categoryId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductCombo_categoryId_idx" ON public."ProductCombo" USING btree ("categoryId");


--
-- Name: ProductCombo_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductCombo_tenantId_idx" ON public."ProductCombo" USING btree ("tenantId");


--
-- Name: ProductCombo_tenantId_isFeatured_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductCombo_tenantId_isFeatured_idx" ON public."ProductCombo" USING btree ("tenantId", "isFeatured");


--
-- Name: ProductCombo_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ProductCombo_tenantId_name_key" ON public."ProductCombo" USING btree ("tenantId", name);


--
-- Name: ProductCombo_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductCombo_tenantId_status_idx" ON public."ProductCombo" USING btree ("tenantId", status);


--
-- Name: ProductImage_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductImage_productId_idx" ON public."ProductImage" USING btree ("productId");


--
-- Name: ProductImage_productId_sortOrder_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductImage_productId_sortOrder_idx" ON public."ProductImage" USING btree ("productId", "sortOrder");


--
-- Name: ProductImei_imei1_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductImei_imei1_idx" ON public."ProductImei" USING btree (imei1);


--
-- Name: ProductImei_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductImei_productId_idx" ON public."ProductImei" USING btree ("productId");


--
-- Name: ProductImei_saleItemId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductImei_saleItemId_idx" ON public."ProductImei" USING btree ("saleItemId");


--
-- Name: ProductImei_saleItemId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ProductImei_saleItemId_key" ON public."ProductImei" USING btree ("saleItemId");


--
-- Name: ProductImei_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductImei_tenantId_idx" ON public."ProductImei" USING btree ("tenantId");


--
-- Name: ProductImei_tenantId_imei1_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ProductImei_tenantId_imei1_key" ON public."ProductImei" USING btree ("tenantId", imei1);


--
-- Name: ProductImei_tenantId_ptaStatus_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductImei_tenantId_ptaStatus_idx" ON public."ProductImei" USING btree ("tenantId", "ptaStatus");


--
-- Name: ProductImei_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductImei_tenantId_status_idx" ON public."ProductImei" USING btree ("tenantId", status);


--
-- Name: ProductImei_variantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductImei_variantId_idx" ON public."ProductImei" USING btree ("variantId");


--
-- Name: ProductSalt_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductSalt_productId_idx" ON public."ProductSalt" USING btree ("productId");


--
-- Name: ProductSalt_productId_saltId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ProductSalt_productId_saltId_key" ON public."ProductSalt" USING btree ("productId", "saltId");


--
-- Name: ProductSalt_saltId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductSalt_saltId_idx" ON public."ProductSalt" USING btree ("saltId");


--
-- Name: ProductTag_tagId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductTag_tagId_idx" ON public."ProductTag" USING btree ("tagId");


--
-- Name: ProductUnit_barcode_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductUnit_barcode_idx" ON public."ProductUnit" USING btree (barcode);


--
-- Name: ProductUnit_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductUnit_productId_idx" ON public."ProductUnit" USING btree ("productId");


--
-- Name: ProductUnit_productId_variantId_unitName_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ProductUnit_productId_variantId_unitName_key" ON public."ProductUnit" USING btree ("productId", "variantId", "unitName");


--
-- Name: ProductUnit_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductUnit_tenantId_idx" ON public."ProductUnit" USING btree ("tenantId");


--
-- Name: ProductUnit_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductUnit_tenantId_isActive_idx" ON public."ProductUnit" USING btree ("tenantId", "isActive");


--
-- Name: ProductUnit_variantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductUnit_variantId_idx" ON public."ProductUnit" USING btree ("variantId");


--
-- Name: ProductVariant_barcode_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductVariant_barcode_idx" ON public."ProductVariant" USING btree (barcode);


--
-- Name: ProductVariant_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductVariant_productId_idx" ON public."ProductVariant" USING btree ("productId");


--
-- Name: ProductVariant_productId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductVariant_productId_isActive_idx" ON public."ProductVariant" USING btree ("productId", "isActive");


--
-- Name: ProductVariant_sku_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ProductVariant_sku_idx" ON public."ProductVariant" USING btree (sku);


--
-- Name: Product_brandId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Product_brandId_idx" ON public."Product" USING btree ("brandId");


--
-- Name: Product_categoryId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Product_categoryId_idx" ON public."Product" USING btree ("categoryId");


--
-- Name: Product_tenantId_barcode_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Product_tenantId_barcode_idx" ON public."Product" USING btree ("tenantId", barcode);


--
-- Name: Product_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Product_tenantId_idx" ON public."Product" USING btree ("tenantId");


--
-- Name: Product_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Product_tenantId_isActive_idx" ON public."Product" USING btree ("tenantId", "isActive");


--
-- Name: Product_tenantId_isFeatured_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Product_tenantId_isFeatured_idx" ON public."Product" USING btree ("tenantId", "isFeatured");


--
-- Name: Product_tenantId_name_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Product_tenantId_name_idx" ON public."Product" USING btree ("tenantId", name);


--
-- Name: Publisher_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Publisher_tenantId_idx" ON public."Publisher" USING btree ("tenantId");


--
-- Name: Publisher_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Publisher_tenantId_isActive_idx" ON public."Publisher" USING btree ("tenantId", "isActive");


--
-- Name: Publisher_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Publisher_tenantId_name_key" ON public."Publisher" USING btree ("tenantId", name);


--
-- Name: PurchaseItem_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "PurchaseItem_productId_idx" ON public."PurchaseItem" USING btree ("productId");


--
-- Name: PurchaseItem_purchaseId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "PurchaseItem_purchaseId_idx" ON public."PurchaseItem" USING btree ("purchaseId");


--
-- Name: Purchase_supplierId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Purchase_supplierId_idx" ON public."Purchase" USING btree ("supplierId");


--
-- Name: Purchase_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Purchase_tenantId_idx" ON public."Purchase" USING btree ("tenantId");


--
-- Name: Purchase_tenantId_purchaseNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Purchase_tenantId_purchaseNumber_key" ON public."Purchase" USING btree ("tenantId", "purchaseNumber");


--
-- Name: Purchase_tenantId_purchasedAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Purchase_tenantId_purchasedAt_idx" ON public."Purchase" USING btree ("tenantId", "purchasedAt");


--
-- Name: RecipeIngredient_ingredientProductId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RecipeIngredient_ingredientProductId_idx" ON public."RecipeIngredient" USING btree ("ingredientProductId");


--
-- Name: RecipeIngredient_recipeId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RecipeIngredient_recipeId_idx" ON public."RecipeIngredient" USING btree ("recipeId");


--
-- Name: Recipe_menuItemId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Recipe_menuItemId_key" ON public."Recipe" USING btree ("menuItemId");


--
-- Name: Recipe_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Recipe_tenantId_idx" ON public."Recipe" USING btree ("tenantId");


--
-- Name: Referral_refereeTenantId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Referral_refereeTenantId_key" ON public."Referral" USING btree ("refereeTenantId");


--
-- Name: Referral_referrerTenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Referral_referrerTenantId_idx" ON public."Referral" USING btree ("referrerTenantId");


--
-- Name: Referral_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Referral_status_idx" ON public."Referral" USING btree (status);


--
-- Name: RefillReminder_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RefillReminder_customerId_idx" ON public."RefillReminder" USING btree ("customerId");


--
-- Name: RefillReminder_scheduledFor_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RefillReminder_scheduledFor_idx" ON public."RefillReminder" USING btree ("scheduledFor");


--
-- Name: RefillReminder_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RefillReminder_tenantId_idx" ON public."RefillReminder" USING btree ("tenantId");


--
-- Name: RefillReminder_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RefillReminder_tenantId_status_idx" ON public."RefillReminder" USING btree ("tenantId", status);


--
-- Name: ReorderSuggestion_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ReorderSuggestion_productId_idx" ON public."ReorderSuggestion" USING btree ("productId");


--
-- Name: ReorderSuggestion_shopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ReorderSuggestion_shopId_idx" ON public."ReorderSuggestion" USING btree ("shopId");


--
-- Name: ReorderSuggestion_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ReorderSuggestion_tenantId_idx" ON public."ReorderSuggestion" USING btree ("tenantId");


--
-- Name: ReorderSuggestion_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ReorderSuggestion_tenantId_status_idx" ON public."ReorderSuggestion" USING btree ("tenantId", status);


--
-- Name: RepairPart_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RepairPart_productId_idx" ON public."RepairPart" USING btree ("productId");


--
-- Name: RepairPart_ticketId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RepairPart_ticketId_idx" ON public."RepairPart" USING btree ("ticketId");


--
-- Name: RepairPayment_ticketId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RepairPayment_ticketId_idx" ON public."RepairPayment" USING btree ("ticketId");


--
-- Name: RepairStatusLog_changedAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RepairStatusLog_changedAt_idx" ON public."RepairStatusLog" USING btree ("changedAt");


--
-- Name: RepairStatusLog_ticketId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RepairStatusLog_ticketId_idx" ON public."RepairStatusLog" USING btree ("ticketId");


--
-- Name: RepairTicket_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RepairTicket_customerId_idx" ON public."RepairTicket" USING btree ("customerId");


--
-- Name: RepairTicket_imei1_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RepairTicket_imei1_idx" ON public."RepairTicket" USING btree (imei1);


--
-- Name: RepairTicket_shopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RepairTicket_shopId_idx" ON public."RepairTicket" USING btree ("shopId");


--
-- Name: RepairTicket_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RepairTicket_tenantId_idx" ON public."RepairTicket" USING btree ("tenantId");


--
-- Name: RepairTicket_tenantId_priority_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RepairTicket_tenantId_priority_idx" ON public."RepairTicket" USING btree ("tenantId", priority);


--
-- Name: RepairTicket_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RepairTicket_tenantId_status_idx" ON public."RepairTicket" USING btree ("tenantId", status);


--
-- Name: RepairTicket_tenantId_ticketNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "RepairTicket_tenantId_ticketNumber_key" ON public."RepairTicket" USING btree ("tenantId", "ticketNumber");


--
-- Name: RestaurantMenuItem_productId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "RestaurantMenuItem_productId_key" ON public."RestaurantMenuItem" USING btree ("productId");


--
-- Name: RestaurantMenuItem_tenantId_bestSeller_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantMenuItem_tenantId_bestSeller_idx" ON public."RestaurantMenuItem" USING btree ("tenantId", "bestSeller");


--
-- Name: RestaurantMenuItem_tenantId_chefSpecial_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantMenuItem_tenantId_chefSpecial_idx" ON public."RestaurantMenuItem" USING btree ("tenantId", "chefSpecial");


--
-- Name: RestaurantMenuItem_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantMenuItem_tenantId_idx" ON public."RestaurantMenuItem" USING btree ("tenantId");


--
-- Name: RestaurantMenuItem_tenantId_isAvailable_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantMenuItem_tenantId_isAvailable_idx" ON public."RestaurantMenuItem" USING btree ("tenantId", "isAvailable");


--
-- Name: RestaurantOrderItemModifier_modifierOptionId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantOrderItemModifier_modifierOptionId_idx" ON public."RestaurantOrderItemModifier" USING btree ("modifierOptionId");


--
-- Name: RestaurantOrderItemModifier_orderItemId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantOrderItemModifier_orderItemId_idx" ON public."RestaurantOrderItemModifier" USING btree ("orderItemId");


--
-- Name: RestaurantOrderItem_orderId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantOrderItem_orderId_idx" ON public."RestaurantOrderItem" USING btree ("orderId");


--
-- Name: RestaurantOrderItem_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantOrderItem_productId_idx" ON public."RestaurantOrderItem" USING btree ("productId");


--
-- Name: RestaurantOrderItem_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantOrderItem_status_idx" ON public."RestaurantOrderItem" USING btree (status);


--
-- Name: RestaurantOrderPayment_orderId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantOrderPayment_orderId_idx" ON public."RestaurantOrderPayment" USING btree ("orderId");


--
-- Name: RestaurantOrder_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantOrder_createdAt_idx" ON public."RestaurantOrder" USING btree ("createdAt");


--
-- Name: RestaurantOrder_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantOrder_customerId_idx" ON public."RestaurantOrder" USING btree ("customerId");


--
-- Name: RestaurantOrder_riderId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantOrder_riderId_idx" ON public."RestaurantOrder" USING btree ("riderId");


--
-- Name: RestaurantOrder_tableId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantOrder_tableId_idx" ON public."RestaurantOrder" USING btree ("tableId");


--
-- Name: RestaurantOrder_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantOrder_tenantId_idx" ON public."RestaurantOrder" USING btree ("tenantId");


--
-- Name: RestaurantOrder_tenantId_mode_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantOrder_tenantId_mode_idx" ON public."RestaurantOrder" USING btree ("tenantId", mode);


--
-- Name: RestaurantOrder_tenantId_orderNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "RestaurantOrder_tenantId_orderNumber_key" ON public."RestaurantOrder" USING btree ("tenantId", "orderNumber");


--
-- Name: RestaurantOrder_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantOrder_tenantId_status_idx" ON public."RestaurantOrder" USING btree ("tenantId", status);


--
-- Name: RestaurantTableV2_shopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantTableV2_shopId_idx" ON public."RestaurantTableV2" USING btree ("shopId");


--
-- Name: RestaurantTableV2_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantTableV2_tenantId_idx" ON public."RestaurantTableV2" USING btree ("tenantId");


--
-- Name: RestaurantTableV2_tenantId_section_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantTableV2_tenantId_section_idx" ON public."RestaurantTableV2" USING btree ("tenantId", section);


--
-- Name: RestaurantTableV2_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantTableV2_tenantId_status_idx" ON public."RestaurantTableV2" USING btree ("tenantId", status);


--
-- Name: RestaurantTableV2_tenantId_tableNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "RestaurantTableV2_tenantId_tableNumber_key" ON public."RestaurantTableV2" USING btree ("tenantId", "tableNumber");


--
-- Name: RestaurantTable_shopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantTable_shopId_idx" ON public."RestaurantTable" USING btree ("shopId");


--
-- Name: RestaurantTable_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantTable_tenantId_idx" ON public."RestaurantTable" USING btree ("tenantId");


--
-- Name: RestaurantTable_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RestaurantTable_tenantId_status_idx" ON public."RestaurantTable" USING btree ("tenantId", status);


--
-- Name: RestaurantTable_tenantId_tableNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "RestaurantTable_tenantId_tableNumber_key" ON public."RestaurantTable" USING btree ("tenantId", "tableNumber");


--
-- Name: RetailQuickKey_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RetailQuickKey_tenantId_idx" ON public."RetailQuickKey" USING btree ("tenantId");


--
-- Name: RetailQuickKey_tenantId_position_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RetailQuickKey_tenantId_position_idx" ON public."RetailQuickKey" USING btree ("tenantId", "position");


--
-- Name: RetailQuickKey_tenantId_shopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RetailQuickKey_tenantId_shopId_idx" ON public."RetailQuickKey" USING btree ("tenantId", "shopId");


--
-- Name: RetailQuickKey_tenantId_userId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "RetailQuickKey_tenantId_userId_idx" ON public."RetailQuickKey" USING btree ("tenantId", "userId");


--
-- Name: Rider_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Rider_tenantId_idx" ON public."Rider" USING btree ("tenantId");


--
-- Name: Rider_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Rider_tenantId_isActive_idx" ON public."Rider" USING btree ("tenantId", "isActive");


--
-- Name: Rider_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Rider_tenantId_status_idx" ON public."Rider" USING btree ("tenantId", status);


--
-- Name: SalaryPayment_periodStart_periodEnd_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalaryPayment_periodStart_periodEnd_idx" ON public."SalaryPayment" USING btree ("periodStart", "periodEnd");


--
-- Name: SalaryPayment_staffId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalaryPayment_staffId_idx" ON public."SalaryPayment" USING btree ("staffId");


--
-- Name: SalaryPayment_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalaryPayment_status_idx" ON public."SalaryPayment" USING btree (status);


--
-- Name: SalaryPayment_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalaryPayment_tenantId_idx" ON public."SalaryPayment" USING btree ("tenantId");


--
-- Name: SalaryPayment_tenantId_paymentNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "SalaryPayment_tenantId_paymentNumber_key" ON public."SalaryPayment" USING btree ("tenantId", "paymentNumber");


--
-- Name: SaleItemVariant_saleItemId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "SaleItemVariant_saleItemId_key" ON public."SaleItemVariant" USING btree ("saleItemId");


--
-- Name: SaleItemVariant_variantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SaleItemVariant_variantId_idx" ON public."SaleItemVariant" USING btree ("variantId");


--
-- Name: SaleItem_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SaleItem_productId_idx" ON public."SaleItem" USING btree ("productId");


--
-- Name: SaleItem_saleId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SaleItem_saleId_idx" ON public."SaleItem" USING btree ("saleId");


--
-- Name: SaleReturnItem_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SaleReturnItem_productId_idx" ON public."SaleReturnItem" USING btree ("productId");


--
-- Name: SaleReturnItem_returnId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SaleReturnItem_returnId_idx" ON public."SaleReturnItem" USING btree ("returnId");


--
-- Name: SaleReturnItem_saleItemId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SaleReturnItem_saleItemId_idx" ON public."SaleReturnItem" USING btree ("saleItemId");


--
-- Name: SaleReturn_saleId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SaleReturn_saleId_idx" ON public."SaleReturn" USING btree ("saleId");


--
-- Name: SaleReturn_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SaleReturn_tenantId_idx" ON public."SaleReturn" USING btree ("tenantId");


--
-- Name: SaleReturn_tenantId_returnNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "SaleReturn_tenantId_returnNumber_key" ON public."SaleReturn" USING btree ("tenantId", "returnNumber");


--
-- Name: SaleReturn_tenantId_returnedAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SaleReturn_tenantId_returnedAt_idx" ON public."SaleReturn" USING btree ("tenantId", "returnedAt");


--
-- Name: Sale_bookingId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Sale_bookingId_key" ON public."Sale" USING btree ("bookingId");


--
-- Name: Sale_cashRegisterId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Sale_cashRegisterId_idx" ON public."Sale" USING btree ("cashRegisterId");


--
-- Name: Sale_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Sale_customerId_idx" ON public."Sale" USING btree ("customerId");


--
-- Name: Sale_shopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Sale_shopId_idx" ON public."Sale" USING btree ("shopId");


--
-- Name: Sale_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Sale_tenantId_idx" ON public."Sale" USING btree ("tenantId");


--
-- Name: Sale_tenantId_saleNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Sale_tenantId_saleNumber_key" ON public."Sale" USING btree ("tenantId", "saleNumber");


--
-- Name: Sale_tenantId_soldAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Sale_tenantId_soldAt_idx" ON public."Sale" USING btree ("tenantId", "soldAt");


--
-- Name: SalonAppointmentLegacy_completedSaleId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "SalonAppointmentLegacy_completedSaleId_key" ON public."SalonAppointmentLegacy" USING btree ("completedSaleId");


--
-- Name: SalonAppointmentLegacy_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonAppointmentLegacy_customerId_idx" ON public."SalonAppointmentLegacy" USING btree ("customerId");


--
-- Name: SalonAppointmentLegacy_staffId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonAppointmentLegacy_staffId_idx" ON public."SalonAppointmentLegacy" USING btree ("staffId");


--
-- Name: SalonAppointmentLegacy_tenantId_appointmentNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "SalonAppointmentLegacy_tenantId_appointmentNumber_key" ON public."SalonAppointmentLegacy" USING btree ("tenantId", "appointmentNumber");


--
-- Name: SalonAppointmentLegacy_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonAppointmentLegacy_tenantId_idx" ON public."SalonAppointmentLegacy" USING btree ("tenantId");


--
-- Name: SalonAppointmentLegacy_tenantId_startTime_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonAppointmentLegacy_tenantId_startTime_idx" ON public."SalonAppointmentLegacy" USING btree ("tenantId", "startTime");


--
-- Name: SalonAppointmentLegacy_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonAppointmentLegacy_tenantId_status_idx" ON public."SalonAppointmentLegacy" USING btree ("tenantId", status);


--
-- Name: SalonAppointmentService_appointmentId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonAppointmentService_appointmentId_idx" ON public."SalonAppointmentService" USING btree ("appointmentId");


--
-- Name: SalonAppointmentService_serviceId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonAppointmentService_serviceId_idx" ON public."SalonAppointmentService" USING btree ("serviceId");


--
-- Name: SalonAppointmentService_staffProfileId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonAppointmentService_staffProfileId_idx" ON public."SalonAppointmentService" USING btree ("staffProfileId");


--
-- Name: SalonAppointment_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonAppointment_customerId_idx" ON public."SalonAppointment" USING btree ("customerId");


--
-- Name: SalonAppointment_scheduledStart_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonAppointment_scheduledStart_idx" ON public."SalonAppointment" USING btree ("scheduledStart");


--
-- Name: SalonAppointment_tenantId_appointmentNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "SalonAppointment_tenantId_appointmentNumber_key" ON public."SalonAppointment" USING btree ("tenantId", "appointmentNumber");


--
-- Name: SalonAppointment_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonAppointment_tenantId_idx" ON public."SalonAppointment" USING btree ("tenantId");


--
-- Name: SalonAppointment_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonAppointment_tenantId_status_idx" ON public."SalonAppointment" USING btree ("tenantId", status);


--
-- Name: SalonCustomerProfile_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonCustomerProfile_customerId_idx" ON public."SalonCustomerProfile" USING btree ("customerId");


--
-- Name: SalonCustomerProfile_customerId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "SalonCustomerProfile_customerId_key" ON public."SalonCustomerProfile" USING btree ("customerId");


--
-- Name: SalonCustomerProfile_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonCustomerProfile_tenantId_idx" ON public."SalonCustomerProfile" USING btree ("tenantId");


--
-- Name: SalonMembershipPlan_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonMembershipPlan_tenantId_idx" ON public."SalonMembershipPlan" USING btree ("tenantId");


--
-- Name: SalonMembershipPlan_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "SalonMembershipPlan_tenantId_name_key" ON public."SalonMembershipPlan" USING btree ("tenantId", name);


--
-- Name: SalonMembership_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonMembership_customerId_idx" ON public."SalonMembership" USING btree ("customerId");


--
-- Name: SalonMembership_expiryDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonMembership_expiryDate_idx" ON public."SalonMembership" USING btree ("expiryDate");


--
-- Name: SalonMembership_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonMembership_tenantId_idx" ON public."SalonMembership" USING btree ("tenantId");


--
-- Name: SalonMembership_tenantId_membershipNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "SalonMembership_tenantId_membershipNumber_key" ON public."SalonMembership" USING btree ("tenantId", "membershipNumber");


--
-- Name: SalonMembership_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonMembership_tenantId_status_idx" ON public."SalonMembership" USING btree ("tenantId", status);


--
-- Name: SalonPackagePurchase_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonPackagePurchase_customerId_idx" ON public."SalonPackagePurchase" USING btree ("customerId");


--
-- Name: SalonPackagePurchase_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonPackagePurchase_tenantId_idx" ON public."SalonPackagePurchase" USING btree ("tenantId");


--
-- Name: SalonPackagePurchase_tenantId_purchaseNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "SalonPackagePurchase_tenantId_purchaseNumber_key" ON public."SalonPackagePurchase" USING btree ("tenantId", "purchaseNumber");


--
-- Name: SalonPackagePurchase_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonPackagePurchase_tenantId_status_idx" ON public."SalonPackagePurchase" USING btree ("tenantId", status);


--
-- Name: SalonPackage_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonPackage_tenantId_idx" ON public."SalonPackage" USING btree ("tenantId");


--
-- Name: SalonPackage_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "SalonPackage_tenantId_name_key" ON public."SalonPackage" USING btree ("tenantId", name);


--
-- Name: SalonService_tenantId_category_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonService_tenantId_category_idx" ON public."SalonService" USING btree ("tenantId", category);


--
-- Name: SalonService_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonService_tenantId_idx" ON public."SalonService" USING btree ("tenantId");


--
-- Name: SalonService_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonService_tenantId_isActive_idx" ON public."SalonService" USING btree ("tenantId", "isActive");


--
-- Name: SalonService_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "SalonService_tenantId_name_key" ON public."SalonService" USING btree ("tenantId", name);


--
-- Name: SalonStaffProfile_staffId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "SalonStaffProfile_staffId_key" ON public."SalonStaffProfile" USING btree ("staffId");


--
-- Name: SalonStaffProfile_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonStaffProfile_tenantId_idx" ON public."SalonStaffProfile" USING btree ("tenantId");


--
-- Name: SalonStaffProfile_tenantId_role_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonStaffProfile_tenantId_role_idx" ON public."SalonStaffProfile" USING btree ("tenantId", role);


--
-- Name: SalonStaffService_serviceId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonStaffService_serviceId_idx" ON public."SalonStaffService" USING btree ("serviceId");


--
-- Name: SalonStaffService_staffProfileId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SalonStaffService_staffProfileId_idx" ON public."SalonStaffService" USING btree ("staffProfileId");


--
-- Name: SalonStaffService_staffProfileId_serviceId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "SalonStaffService_staffProfileId_serviceId_key" ON public."SalonStaffService" USING btree ("staffProfileId", "serviceId");


--
-- Name: Salt_name_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Salt_name_idx" ON public."Salt" USING btree (name);


--
-- Name: Salt_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Salt_tenantId_idx" ON public."Salt" USING btree ("tenantId");


--
-- Name: Salt_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Salt_tenantId_name_key" ON public."Salt" USING btree ("tenantId", name);


--
-- Name: Salt_tenantId_scheduleClass_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Salt_tenantId_scheduleClass_idx" ON public."Salt" USING btree ("tenantId", "scheduleClass");


--
-- Name: SchoolBookListItem_listId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SchoolBookListItem_listId_idx" ON public."SchoolBookListItem" USING btree ("listId");


--
-- Name: SchoolBookListItem_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SchoolBookListItem_productId_idx" ON public."SchoolBookListItem" USING btree ("productId");


--
-- Name: SchoolBookList_schoolId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SchoolBookList_schoolId_idx" ON public."SchoolBookList" USING btree ("schoolId");


--
-- Name: SchoolBookList_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SchoolBookList_tenantId_idx" ON public."SchoolBookList" USING btree ("tenantId");


--
-- Name: SchoolBookList_tenantId_session_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SchoolBookList_tenantId_session_idx" ON public."SchoolBookList" USING btree ("tenantId", session);


--
-- Name: School_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "School_tenantId_idx" ON public."School" USING btree ("tenantId");


--
-- Name: School_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "School_tenantId_name_key" ON public."School" USING btree ("tenantId", name);


--
-- Name: ServiceAmcVisit_amcId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceAmcVisit_amcId_idx" ON public."ServiceAmcVisit" USING btree ("amcId");


--
-- Name: ServiceAmcVisit_scheduledDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceAmcVisit_scheduledDate_idx" ON public."ServiceAmcVisit" USING btree ("scheduledDate");


--
-- Name: ServiceAmc_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceAmc_customerId_idx" ON public."ServiceAmc" USING btree ("customerId");


--
-- Name: ServiceAmc_endDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceAmc_endDate_idx" ON public."ServiceAmc" USING btree ("endDate");


--
-- Name: ServiceAmc_tenantId_amcNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ServiceAmc_tenantId_amcNumber_key" ON public."ServiceAmc" USING btree ("tenantId", "amcNumber");


--
-- Name: ServiceAmc_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceAmc_tenantId_idx" ON public."ServiceAmc" USING btree ("tenantId");


--
-- Name: ServiceAmc_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceAmc_tenantId_status_idx" ON public."ServiceAmc" USING btree ("tenantId", status);


--
-- Name: ServiceCatalog_tenantId_businessType_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceCatalog_tenantId_businessType_idx" ON public."ServiceCatalog" USING btree ("tenantId", "businessType");


--
-- Name: ServiceCatalog_tenantId_category_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceCatalog_tenantId_category_idx" ON public."ServiceCatalog" USING btree ("tenantId", category);


--
-- Name: ServiceCatalog_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceCatalog_tenantId_idx" ON public."ServiceCatalog" USING btree ("tenantId");


--
-- Name: ServiceCatalog_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ServiceCatalog_tenantId_name_key" ON public."ServiceCatalog" USING btree ("tenantId", name);


--
-- Name: ServiceCustomerProfile_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceCustomerProfile_customerId_idx" ON public."ServiceCustomerProfile" USING btree ("customerId");


--
-- Name: ServiceCustomerProfile_customerId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ServiceCustomerProfile_customerId_key" ON public."ServiceCustomerProfile" USING btree ("customerId");


--
-- Name: ServiceCustomerProfile_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceCustomerProfile_tenantId_idx" ON public."ServiceCustomerProfile" USING btree ("tenantId");


--
-- Name: ServiceJobPart_jobId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceJobPart_jobId_idx" ON public."ServiceJobPart" USING btree ("jobId");


--
-- Name: ServiceJobStatusHistory_jobId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceJobStatusHistory_jobId_idx" ON public."ServiceJobStatusHistory" USING btree ("jobId");


--
-- Name: ServiceJobTimeLog_jobId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceJobTimeLog_jobId_idx" ON public."ServiceJobTimeLog" USING btree ("jobId");


--
-- Name: ServiceJobTimeLog_technicianId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceJobTimeLog_technicianId_idx" ON public."ServiceJobTimeLog" USING btree ("technicianId");


--
-- Name: ServiceJob_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceJob_customerId_idx" ON public."ServiceJob" USING btree ("customerId");


--
-- Name: ServiceJob_primaryTechnicianId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceJob_primaryTechnicianId_idx" ON public."ServiceJob" USING btree ("primaryTechnicianId");


--
-- Name: ServiceJob_scheduledStart_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceJob_scheduledStart_idx" ON public."ServiceJob" USING btree ("scheduledStart");


--
-- Name: ServiceJob_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceJob_tenantId_idx" ON public."ServiceJob" USING btree ("tenantId");


--
-- Name: ServiceJob_tenantId_jobNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ServiceJob_tenantId_jobNumber_key" ON public."ServiceJob" USING btree ("tenantId", "jobNumber");


--
-- Name: ServiceJob_tenantId_priority_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceJob_tenantId_priority_idx" ON public."ServiceJob" USING btree ("tenantId", priority);


--
-- Name: ServiceJob_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceJob_tenantId_status_idx" ON public."ServiceJob" USING btree ("tenantId", status);


--
-- Name: ServiceQuote_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceQuote_customerId_idx" ON public."ServiceQuote" USING btree ("customerId");


--
-- Name: ServiceQuote_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceQuote_tenantId_idx" ON public."ServiceQuote" USING btree ("tenantId");


--
-- Name: ServiceQuote_tenantId_quoteNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ServiceQuote_tenantId_quoteNumber_key" ON public."ServiceQuote" USING btree ("tenantId", "quoteNumber");


--
-- Name: ServiceQuote_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceQuote_tenantId_status_idx" ON public."ServiceQuote" USING btree ("tenantId", status);


--
-- Name: ServiceTechnicianProfile_staffId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ServiceTechnicianProfile_staffId_key" ON public."ServiceTechnicianProfile" USING btree ("staffId");


--
-- Name: ServiceTechnicianProfile_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceTechnicianProfile_tenantId_idx" ON public."ServiceTechnicianProfile" USING btree ("tenantId");


--
-- Name: ServiceTechnicianProfile_tenantId_primarySkill_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceTechnicianProfile_tenantId_primarySkill_idx" ON public."ServiceTechnicianProfile" USING btree ("tenantId", "primarySkill");


--
-- Name: ServiceTechnicianProfile_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceTechnicianProfile_tenantId_status_idx" ON public."ServiceTechnicianProfile" USING btree ("tenantId", status);


--
-- Name: ServiceTechnicianSkill_serviceId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceTechnicianSkill_serviceId_idx" ON public."ServiceTechnicianSkill" USING btree ("serviceId");


--
-- Name: ServiceTechnicianSkill_technicianId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceTechnicianSkill_technicianId_idx" ON public."ServiceTechnicianSkill" USING btree ("technicianId");


--
-- Name: ServiceTechnicianSkill_technicianId_serviceId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ServiceTechnicianSkill_technicianId_serviceId_key" ON public."ServiceTechnicianSkill" USING btree ("technicianId", "serviceId");


--
-- Name: ServiceWarrantyClaim_tenantId_claimNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ServiceWarrantyClaim_tenantId_claimNumber_key" ON public."ServiceWarrantyClaim" USING btree ("tenantId", "claimNumber");


--
-- Name: ServiceWarrantyClaim_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceWarrantyClaim_tenantId_idx" ON public."ServiceWarrantyClaim" USING btree ("tenantId");


--
-- Name: ServiceWarrantyClaim_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceWarrantyClaim_tenantId_status_idx" ON public."ServiceWarrantyClaim" USING btree ("tenantId", status);


--
-- Name: ServiceZone_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ServiceZone_tenantId_idx" ON public."ServiceZone" USING btree ("tenantId");


--
-- Name: ServiceZone_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ServiceZone_tenantId_name_key" ON public."ServiceZone" USING btree ("tenantId", name);


--
-- Name: Session_deviceFingerprint_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Session_deviceFingerprint_idx" ON public."Session" USING btree ("deviceFingerprint");


--
-- Name: Session_userId_deviceFingerprint_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Session_userId_deviceFingerprint_idx" ON public."Session" USING btree ("userId", "deviceFingerprint");


--
-- Name: Session_userId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Session_userId_idx" ON public."Session" USING btree ("userId");


--
-- Name: ShopStock_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ShopStock_productId_idx" ON public."ShopStock" USING btree ("productId");


--
-- Name: ShopStock_shopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ShopStock_shopId_idx" ON public."ShopStock" USING btree ("shopId");


--
-- Name: ShopStock_shopId_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ShopStock_shopId_productId_idx" ON public."ShopStock" USING btree ("shopId", "productId");


--
-- Name: ShopStock_shopId_productId_variantId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "ShopStock_shopId_productId_variantId_key" ON public."ShopStock" USING btree ("shopId", "productId", "variantId");


--
-- Name: ShopStock_shopId_stock_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ShopStock_shopId_stock_idx" ON public."ShopStock" USING btree ("shopId", stock);


--
-- Name: ShopStock_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ShopStock_tenantId_idx" ON public."ShopStock" USING btree ("tenantId");


--
-- Name: ShopStock_variantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "ShopStock_variantId_idx" ON public."ShopStock" USING btree ("variantId");


--
-- Name: Shop_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Shop_tenantId_idx" ON public."Shop" USING btree ("tenantId");


--
-- Name: Shop_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Shop_tenantId_name_key" ON public."Shop" USING btree ("tenantId", name);


--
-- Name: SmsLog_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SmsLog_createdAt_idx" ON public."SmsLog" USING btree ("createdAt");


--
-- Name: SmsLog_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SmsLog_status_idx" ON public."SmsLog" USING btree (status);


--
-- Name: SmsLog_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SmsLog_tenantId_idx" ON public."SmsLog" USING btree ("tenantId");


--
-- Name: SmsLog_toPhone_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SmsLog_toPhone_idx" ON public."SmsLog" USING btree ("toPhone");


--
-- Name: SmsTemplate_slug_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SmsTemplate_slug_idx" ON public."SmsTemplate" USING btree (slug);


--
-- Name: SmsTemplate_slug_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "SmsTemplate_slug_key" ON public."SmsTemplate" USING btree (slug);


--
-- Name: StaffDocument_staffId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StaffDocument_staffId_idx" ON public."StaffDocument" USING btree ("staffId");


--
-- Name: StaffLeave_staffId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StaffLeave_staffId_idx" ON public."StaffLeave" USING btree ("staffId");


--
-- Name: StaffLeave_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StaffLeave_status_idx" ON public."StaffLeave" USING btree (status);


--
-- Name: StaffLeave_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StaffLeave_tenantId_idx" ON public."StaffLeave" USING btree ("tenantId");


--
-- Name: Staff_shopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Staff_shopId_idx" ON public."Staff" USING btree ("shopId");


--
-- Name: Staff_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Staff_tenantId_idx" ON public."Staff" USING btree ("tenantId");


--
-- Name: Staff_tenantId_staffNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Staff_tenantId_staffNumber_key" ON public."Staff" USING btree ("tenantId", "staffNumber");


--
-- Name: Staff_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Staff_tenantId_status_idx" ON public."Staff" USING btree ("tenantId", status);


--
-- Name: Staff_userId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Staff_userId_idx" ON public."Staff" USING btree ("userId");


--
-- Name: Staff_userId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Staff_userId_key" ON public."Staff" USING btree ("userId");


--
-- Name: StationeryProfile_productId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "StationeryProfile_productId_key" ON public."StationeryProfile" USING btree ("productId");


--
-- Name: StationeryProfile_tenantId_brand_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StationeryProfile_tenantId_brand_idx" ON public."StationeryProfile" USING btree ("tenantId", brand);


--
-- Name: StationeryProfile_tenantId_category_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StationeryProfile_tenantId_category_idx" ON public."StationeryProfile" USING btree ("tenantId", category);


--
-- Name: StationeryProfile_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StationeryProfile_tenantId_idx" ON public."StationeryProfile" USING btree ("tenantId");


--
-- Name: StockAdjustment_carpetRollId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StockAdjustment_carpetRollId_idx" ON public."StockAdjustment" USING btree ("carpetRollId");


--
-- Name: StockAdjustment_imeiId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StockAdjustment_imeiId_idx" ON public."StockAdjustment" USING btree ("imeiId");


--
-- Name: StockAdjustment_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StockAdjustment_productId_idx" ON public."StockAdjustment" USING btree ("productId");


--
-- Name: StockAdjustment_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StockAdjustment_tenantId_createdAt_idx" ON public."StockAdjustment" USING btree ("tenantId", "createdAt");


--
-- Name: StockAdjustment_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StockAdjustment_tenantId_idx" ON public."StockAdjustment" USING btree ("tenantId");


--
-- Name: StockAdjustment_variantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StockAdjustment_variantId_idx" ON public."StockAdjustment" USING btree ("variantId");


--
-- Name: StockMovement_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StockMovement_productId_idx" ON public."StockMovement" USING btree ("productId");


--
-- Name: StockMovement_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StockMovement_tenantId_createdAt_idx" ON public."StockMovement" USING btree ("tenantId", "createdAt");


--
-- Name: StockMovement_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StockMovement_tenantId_idx" ON public."StockMovement" USING btree ("tenantId");


--
-- Name: StockTransferItem_carpetRollId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StockTransferItem_carpetRollId_idx" ON public."StockTransferItem" USING btree ("carpetRollId");


--
-- Name: StockTransferItem_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StockTransferItem_productId_idx" ON public."StockTransferItem" USING btree ("productId");


--
-- Name: StockTransferItem_transferId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StockTransferItem_transferId_idx" ON public."StockTransferItem" USING btree ("transferId");


--
-- Name: StockTransfer_fromShopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StockTransfer_fromShopId_idx" ON public."StockTransfer" USING btree ("fromShopId");


--
-- Name: StockTransfer_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StockTransfer_status_idx" ON public."StockTransfer" USING btree (status);


--
-- Name: StockTransfer_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StockTransfer_tenantId_idx" ON public."StockTransfer" USING btree ("tenantId");


--
-- Name: StockTransfer_tenantId_transferNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "StockTransfer_tenantId_transferNumber_key" ON public."StockTransfer" USING btree ("tenantId", "transferNumber");


--
-- Name: StockTransfer_toShopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "StockTransfer_toShopId_idx" ON public."StockTransfer" USING btree ("toShopId");


--
-- Name: Subscription_currentPeriodEnd_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Subscription_currentPeriodEnd_idx" ON public."Subscription" USING btree ("currentPeriodEnd");


--
-- Name: Subscription_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Subscription_status_idx" ON public."Subscription" USING btree (status);


--
-- Name: Subscription_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Subscription_tenantId_idx" ON public."Subscription" USING btree ("tenantId");


--
-- Name: Supplier_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Supplier_tenantId_idx" ON public."Supplier" USING btree ("tenantId");


--
-- Name: Supplier_tenantId_name_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Supplier_tenantId_name_idx" ON public."Supplier" USING btree ("tenantId", name);


--
-- Name: SystemSetting_category_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "SystemSetting_category_idx" ON public."SystemSetting" USING btree (category);


--
-- Name: SystemSetting_key_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "SystemSetting_key_key" ON public."SystemSetting" USING btree (key);


--
-- Name: Tag_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Tag_tenantId_idx" ON public."Tag" USING btree ("tenantId");


--
-- Name: Tag_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Tag_tenantId_name_key" ON public."Tag" USING btree ("tenantId", name);


--
-- Name: TemperatureLog_shopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "TemperatureLog_shopId_idx" ON public."TemperatureLog" USING btree ("shopId");


--
-- Name: TemperatureLog_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "TemperatureLog_tenantId_idx" ON public."TemperatureLog" USING btree ("tenantId");


--
-- Name: TemperatureLog_tenantId_logDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "TemperatureLog_tenantId_logDate_idx" ON public."TemperatureLog" USING btree ("tenantId", "logDate");


--
-- Name: TenantNote_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "TenantNote_tenantId_createdAt_idx" ON public."TenantNote" USING btree ("tenantId", "createdAt");


--
-- Name: TenantNote_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "TenantNote_tenantId_idx" ON public."TenantNote" USING btree ("tenantId");


--
-- Name: TenantSettings_tenantId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "TenantSettings_tenantId_key" ON public."TenantSettings" USING btree ("tenantId");


--
-- Name: Tenant_referralCode_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Tenant_referralCode_key" ON public."Tenant" USING btree ("referralCode");


--
-- Name: Tenant_slug_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "Tenant_slug_key" ON public."Tenant" USING btree (slug);


--
-- Name: Upload_purpose_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Upload_purpose_idx" ON public."Upload" USING btree (purpose);


--
-- Name: Upload_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "Upload_tenantId_idx" ON public."Upload" USING btree ("tenantId");


--
-- Name: UsedPhoneInspection_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "UsedPhoneInspection_tenantId_idx" ON public."UsedPhoneInspection" USING btree ("tenantId");


--
-- Name: UsedPhoneInspection_usedPhoneId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "UsedPhoneInspection_usedPhoneId_idx" ON public."UsedPhoneInspection" USING btree ("usedPhoneId");


--
-- Name: UsedPhone_fromCustomerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "UsedPhone_fromCustomerId_idx" ON public."UsedPhone" USING btree ("fromCustomerId");


--
-- Name: UsedPhone_imei1_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "UsedPhone_imei1_idx" ON public."UsedPhone" USING btree (imei1);


--
-- Name: UsedPhone_shopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "UsedPhone_shopId_idx" ON public."UsedPhone" USING btree ("shopId");


--
-- Name: UsedPhone_soldSaleId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "UsedPhone_soldSaleId_key" ON public."UsedPhone" USING btree ("soldSaleId");


--
-- Name: UsedPhone_tenantId_condition_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "UsedPhone_tenantId_condition_idx" ON public."UsedPhone" USING btree ("tenantId", condition);


--
-- Name: UsedPhone_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "UsedPhone_tenantId_idx" ON public."UsedPhone" USING btree ("tenantId");


--
-- Name: UsedPhone_tenantId_imei1_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "UsedPhone_tenantId_imei1_key" ON public."UsedPhone" USING btree ("tenantId", imei1);


--
-- Name: UsedPhone_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "UsedPhone_tenantId_status_idx" ON public."UsedPhone" USING btree ("tenantId", status);


--
-- Name: UsedPhone_tenantId_usedPhoneCode_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "UsedPhone_tenantId_usedPhoneCode_key" ON public."UsedPhone" USING btree ("tenantId", "usedPhoneCode");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_googleId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "User_googleId_key" ON public."User" USING btree ("googleId");


--
-- Name: User_passwordResetToken_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "User_passwordResetToken_key" ON public."User" USING btree ("passwordResetToken");


--
-- Name: User_phone_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "User_phone_key" ON public."User" USING btree (phone);


--
-- Name: User_shopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "User_shopId_idx" ON public."User" USING btree ("shopId");


--
-- Name: User_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "User_tenantId_idx" ON public."User" USING btree ("tenantId");


--
-- Name: User_tenantId_role_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "User_tenantId_role_idx" ON public."User" USING btree ("tenantId", role);


--
-- Name: VehicleMake_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "VehicleMake_tenantId_idx" ON public."VehicleMake" USING btree ("tenantId");


--
-- Name: VehicleMake_tenantId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "VehicleMake_tenantId_name_key" ON public."VehicleMake" USING btree ("tenantId", name);


--
-- Name: VehicleModel_makeId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "VehicleModel_makeId_idx" ON public."VehicleModel" USING btree ("makeId");


--
-- Name: VehicleModel_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "VehicleModel_tenantId_idx" ON public."VehicleModel" USING btree ("tenantId");


--
-- Name: VehicleModel_tenantId_makeId_name_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "VehicleModel_tenantId_makeId_name_key" ON public."VehicleModel" USING btree ("tenantId", "makeId", name);


--
-- Name: VehicleServiceReminder_dueDate_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "VehicleServiceReminder_dueDate_idx" ON public."VehicleServiceReminder" USING btree ("dueDate");


--
-- Name: VehicleServiceReminder_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "VehicleServiceReminder_tenantId_idx" ON public."VehicleServiceReminder" USING btree ("tenantId");


--
-- Name: VehicleServiceReminder_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "VehicleServiceReminder_tenantId_status_idx" ON public."VehicleServiceReminder" USING btree ("tenantId", status);


--
-- Name: VehicleServiceReminder_vehicleId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "VehicleServiceReminder_vehicleId_idx" ON public."VehicleServiceReminder" USING btree ("vehicleId");


--
-- Name: WaiterAssignment_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "WaiterAssignment_tenantId_idx" ON public."WaiterAssignment" USING btree ("tenantId");


--
-- Name: WaiterAssignment_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "WaiterAssignment_tenantId_isActive_idx" ON public."WaiterAssignment" USING btree ("tenantId", "isActive");


--
-- Name: WorkshopJobExternal_jobId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "WorkshopJobExternal_jobId_idx" ON public."WorkshopJobExternal" USING btree ("jobId");


--
-- Name: WorkshopJobLabor_jobId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "WorkshopJobLabor_jobId_idx" ON public."WorkshopJobLabor" USING btree ("jobId");


--
-- Name: WorkshopJobLabor_mechanicId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "WorkshopJobLabor_mechanicId_idx" ON public."WorkshopJobLabor" USING btree ("mechanicId");


--
-- Name: WorkshopJobPart_jobId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "WorkshopJobPart_jobId_idx" ON public."WorkshopJobPart" USING btree ("jobId");


--
-- Name: WorkshopJobPart_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "WorkshopJobPart_productId_idx" ON public."WorkshopJobPart" USING btree ("productId");


--
-- Name: WorkshopJobPayment_jobId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "WorkshopJobPayment_jobId_idx" ON public."WorkshopJobPayment" USING btree ("jobId");


--
-- Name: WorkshopJobStatusLog_jobId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "WorkshopJobStatusLog_jobId_idx" ON public."WorkshopJobStatusLog" USING btree ("jobId");


--
-- Name: WorkshopJob_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "WorkshopJob_customerId_idx" ON public."WorkshopJob" USING btree ("customerId");


--
-- Name: WorkshopJob_primaryMechanicId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "WorkshopJob_primaryMechanicId_idx" ON public."WorkshopJob" USING btree ("primaryMechanicId");


--
-- Name: WorkshopJob_promisedAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "WorkshopJob_promisedAt_idx" ON public."WorkshopJob" USING btree ("promisedAt");


--
-- Name: WorkshopJob_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "WorkshopJob_tenantId_idx" ON public."WorkshopJob" USING btree ("tenantId");


--
-- Name: WorkshopJob_tenantId_jobNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "WorkshopJob_tenantId_jobNumber_key" ON public."WorkshopJob" USING btree ("tenantId", "jobNumber");


--
-- Name: WorkshopJob_tenantId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "WorkshopJob_tenantId_status_idx" ON public."WorkshopJob" USING btree ("tenantId", status);


--
-- Name: WorkshopJob_vehicleId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "WorkshopJob_vehicleId_idx" ON public."WorkshopJob" USING btree ("vehicleId");


--
-- Name: auction_bids_auctionId_amount_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "auction_bids_auctionId_amount_idx" ON public.auction_bids USING btree ("auctionId", amount);


--
-- Name: auction_bids_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "auction_bids_customerId_idx" ON public.auction_bids USING btree ("customerId");


--
-- Name: auctions_shopId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "auctions_shopId_status_idx" ON public.auctions USING btree ("shopId", status);


--
-- Name: auctions_status_startsAt_endsAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "auctions_status_startsAt_endsAt_idx" ON public.auctions USING btree (status, "startsAt", "endsAt");


--
-- Name: auctions_winningBidId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "auctions_winningBidId_key" ON public.auctions USING btree ("winningBidId");


--
-- Name: bargain_messages_bargainId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "bargain_messages_bargainId_idx" ON public.bargain_messages USING btree ("bargainId");


--
-- Name: bargains_customerId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "bargains_customerId_status_idx" ON public.bargains USING btree ("customerId", status);


--
-- Name: bargains_expiresAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "bargains_expiresAt_idx" ON public.bargains USING btree ("expiresAt");


--
-- Name: bargains_orderId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "bargains_orderId_key" ON public.bargains USING btree ("orderId");


--
-- Name: bargains_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "bargains_productId_idx" ON public.bargains USING btree ("productId");


--
-- Name: bargains_shopId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "bargains_shopId_status_idx" ON public.bargains USING btree ("shopId", status);


--
-- Name: customer_addresses_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "customer_addresses_customerId_idx" ON public.customer_addresses USING btree ("customerId");


--
-- Name: customer_addresses_customerId_isDefault_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "customer_addresses_customerId_isDefault_idx" ON public.customer_addresses USING btree ("customerId", "isDefault");


--
-- Name: customer_follows_shop_customerId_shopId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "customer_follows_shop_customerId_shopId_key" ON public.customer_follows_shop USING btree ("customerId", "shopId");


--
-- Name: customer_follows_shop_shopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "customer_follows_shop_shopId_idx" ON public.customer_follows_shop USING btree ("shopId");


--
-- Name: customer_login_history_customerId_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "customer_login_history_customerId_createdAt_idx" ON public.customer_login_history USING btree ("customerId", "createdAt");


--
-- Name: customer_notifications_customerId_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "customer_notifications_customerId_createdAt_idx" ON public.customer_notifications USING btree ("customerId", "createdAt");


--
-- Name: customer_notifications_customerId_isRead_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "customer_notifications_customerId_isRead_idx" ON public.customer_notifications USING btree ("customerId", "isRead");


--
-- Name: customer_otp_codes_email_purpose_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX customer_otp_codes_email_purpose_idx ON public.customer_otp_codes USING btree (email, purpose);


--
-- Name: customer_otp_codes_expiresAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "customer_otp_codes_expiresAt_idx" ON public.customer_otp_codes USING btree ("expiresAt");


--
-- Name: customer_otp_codes_phone_purpose_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX customer_otp_codes_phone_purpose_idx ON public.customer_otp_codes USING btree (phone, purpose);


--
-- Name: customer_push_tokens_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "customer_push_tokens_customerId_idx" ON public.customer_push_tokens USING btree ("customerId");


--
-- Name: customer_push_tokens_token_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX customer_push_tokens_token_key ON public.customer_push_tokens USING btree (token);


--
-- Name: customer_saved_cards_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "customer_saved_cards_customerId_idx" ON public.customer_saved_cards USING btree ("customerId");


--
-- Name: customer_search_history_customerId_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "customer_search_history_customerId_createdAt_idx" ON public.customer_search_history USING btree ("customerId", "createdAt");


--
-- Name: customer_search_history_query_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX customer_search_history_query_idx ON public.customer_search_history USING btree (query);


--
-- Name: customer_sessions_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "customer_sessions_customerId_idx" ON public.customer_sessions USING btree ("customerId");


--
-- Name: customer_sessions_expiresAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "customer_sessions_expiresAt_idx" ON public.customer_sessions USING btree ("expiresAt");


--
-- Name: customer_wallet_txns_customerId_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "customer_wallet_txns_customerId_createdAt_idx" ON public.customer_wallet_txns USING btree ("customerId", "createdAt");


--
-- Name: group_buy_participants_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "group_buy_participants_customerId_idx" ON public.group_buy_participants USING btree ("customerId");


--
-- Name: group_buy_participants_groupBuyId_customerId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "group_buy_participants_groupBuyId_customerId_key" ON public.group_buy_participants USING btree ("groupBuyId", "customerId");


--
-- Name: group_buys_shopId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "group_buys_shopId_status_idx" ON public.group_buys USING btree ("shopId", status);


--
-- Name: group_buys_status_expiresAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "group_buys_status_expiresAt_idx" ON public.group_buys USING btree (status, "expiresAt");


--
-- Name: live_shop_messages_liveShopId_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "live_shop_messages_liveShopId_createdAt_idx" ON public.live_shop_messages USING btree ("liveShopId", "createdAt");


--
-- Name: live_shop_viewers_liveShopId_customerId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "live_shop_viewers_liveShopId_customerId_key" ON public.live_shop_viewers USING btree ("liveShopId", "customerId");


--
-- Name: live_shop_viewers_liveShopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "live_shop_viewers_liveShopId_idx" ON public.live_shop_viewers USING btree ("liveShopId");


--
-- Name: live_shops_shopId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "live_shops_shopId_status_idx" ON public.live_shops USING btree ("shopId", status);


--
-- Name: live_shops_status_scheduledAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "live_shops_status_scheduledAt_idx" ON public.live_shops USING btree (status, "scheduledAt");


--
-- Name: marketplace_cart_lines_bargainId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "marketplace_cart_lines_bargainId_key" ON public.marketplace_cart_lines USING btree ("bargainId");


--
-- Name: marketplace_cart_lines_cartId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "marketplace_cart_lines_cartId_idx" ON public.marketplace_cart_lines USING btree ("cartId");


--
-- Name: marketplace_cart_lines_shopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "marketplace_cart_lines_shopId_idx" ON public.marketplace_cart_lines USING btree ("shopId");


--
-- Name: marketplace_carts_customerId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "marketplace_carts_customerId_key" ON public.marketplace_carts USING btree ("customerId");


--
-- Name: marketplace_customers_appleId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "marketplace_customers_appleId_key" ON public.marketplace_customers USING btree ("appleId");


--
-- Name: marketplace_customers_email_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX marketplace_customers_email_idx ON public.marketplace_customers USING btree (email);


--
-- Name: marketplace_customers_email_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX marketplace_customers_email_key ON public.marketplace_customers USING btree (email);


--
-- Name: marketplace_customers_facebookId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "marketplace_customers_facebookId_key" ON public.marketplace_customers USING btree ("facebookId");


--
-- Name: marketplace_customers_googleId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "marketplace_customers_googleId_key" ON public.marketplace_customers USING btree ("googleId");


--
-- Name: marketplace_customers_lastActiveAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "marketplace_customers_lastActiveAt_idx" ON public.marketplace_customers USING btree ("lastActiveAt");


--
-- Name: marketplace_customers_phone_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX marketplace_customers_phone_idx ON public.marketplace_customers USING btree (phone);


--
-- Name: marketplace_customers_phone_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX marketplace_customers_phone_key ON public.marketplace_customers USING btree (phone);


--
-- Name: marketplace_customers_referralCode_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "marketplace_customers_referralCode_idx" ON public.marketplace_customers USING btree ("referralCode");


--
-- Name: marketplace_customers_referralCode_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "marketplace_customers_referralCode_key" ON public.marketplace_customers USING btree ("referralCode");


--
-- Name: marketplace_order_items_orderId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "marketplace_order_items_orderId_idx" ON public.marketplace_order_items USING btree ("orderId");


--
-- Name: marketplace_orders_customerId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "marketplace_orders_customerId_status_idx" ON public.marketplace_orders USING btree ("customerId", status);


--
-- Name: marketplace_orders_orderNumber_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "marketplace_orders_orderNumber_idx" ON public.marketplace_orders USING btree ("orderNumber");


--
-- Name: marketplace_orders_orderNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "marketplace_orders_orderNumber_key" ON public.marketplace_orders USING btree ("orderNumber");


--
-- Name: marketplace_orders_riderId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "marketplace_orders_riderId_idx" ON public.marketplace_orders USING btree ("riderId");


--
-- Name: marketplace_orders_shopId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "marketplace_orders_shopId_status_idx" ON public.marketplace_orders USING btree ("shopId", status);


--
-- Name: marketplace_orders_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "marketplace_orders_tenantId_createdAt_idx" ON public.marketplace_orders USING btree ("tenantId", "createdAt");


--
-- Name: marketplace_reviews_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "marketplace_reviews_customerId_idx" ON public.marketplace_reviews USING btree ("customerId");


--
-- Name: marketplace_reviews_orderId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "marketplace_reviews_orderId_idx" ON public.marketplace_reviews USING btree ("orderId");


--
-- Name: marketplace_reviews_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "marketplace_reviews_productId_idx" ON public.marketplace_reviews USING btree ("productId");


--
-- Name: marketplace_reviews_rating_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX marketplace_reviews_rating_idx ON public.marketplace_reviews USING btree (rating);


--
-- Name: marketplace_reviews_shopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "marketplace_reviews_shopId_idx" ON public.marketplace_reviews USING btree ("shopId");


--
-- Name: order_status_history_orderId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "order_status_history_orderId_idx" ON public.order_status_history USING btree ("orderId");


--
-- Name: product_marketplace_profiles_marketplaceCategory_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "product_marketplace_profiles_marketplaceCategory_idx" ON public.product_marketplace_profiles USING btree ("marketplaceCategory");


--
-- Name: product_marketplace_profiles_productId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "product_marketplace_profiles_productId_key" ON public.product_marketplace_profiles USING btree ("productId");


--
-- Name: product_marketplace_profiles_ratingAverage_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "product_marketplace_profiles_ratingAverage_idx" ON public.product_marketplace_profiles USING btree ("ratingAverage");


--
-- Name: product_marketplace_profiles_shopId_isListedOnMarketplace_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "product_marketplace_profiles_shopId_isListedOnMarketplace_idx" ON public.product_marketplace_profiles USING btree ("shopId", "isListedOnMarketplace");


--
-- Name: product_marketplace_profiles_totalSold_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "product_marketplace_profiles_totalSold_idx" ON public.product_marketplace_profiles USING btree ("totalSold");


--
-- Name: product_views_customerId_viewedAt_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "product_views_customerId_viewedAt_idx" ON public.product_views USING btree ("customerId", "viewedAt");


--
-- Name: product_views_productId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "product_views_productId_idx" ON public.product_views USING btree ("productId");


--
-- Name: review_votes_reviewId_customerId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "review_votes_reviewId_customerId_key" ON public.review_votes USING btree ("reviewId", "customerId");


--
-- Name: shop_marketplace_profiles_city_area_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX shop_marketplace_profiles_city_area_idx ON public.shop_marketplace_profiles USING btree (city, area);


--
-- Name: shop_marketplace_profiles_industry_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX shop_marketplace_profiles_industry_idx ON public.shop_marketplace_profiles USING btree (industry);


--
-- Name: shop_marketplace_profiles_isListedOnMarketplace_isOpen_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "shop_marketplace_profiles_isListedOnMarketplace_isOpen_idx" ON public.shop_marketplace_profiles USING btree ("isListedOnMarketplace", "isOpen");


--
-- Name: shop_marketplace_profiles_ratingAverage_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "shop_marketplace_profiles_ratingAverage_idx" ON public.shop_marketplace_profiles USING btree ("ratingAverage");


--
-- Name: shop_marketplace_profiles_shopId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "shop_marketplace_profiles_shopId_idx" ON public.shop_marketplace_profiles USING btree ("shopId");


--
-- Name: shop_marketplace_profiles_shopId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "shop_marketplace_profiles_shopId_key" ON public.shop_marketplace_profiles USING btree ("shopId");


--
-- Name: shop_marketplace_profiles_slug_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX shop_marketplace_profiles_slug_idx ON public.shop_marketplace_profiles USING btree (slug);


--
-- Name: shop_marketplace_profiles_slug_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX shop_marketplace_profiles_slug_key ON public.shop_marketplace_profiles USING btree (slug);


--
-- Name: shop_marketplace_profiles_tenantId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "shop_marketplace_profiles_tenantId_idx" ON public.shop_marketplace_profiles USING btree ("tenantId");


--
-- Name: support_messages_ticketId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "support_messages_ticketId_idx" ON public.support_messages USING btree ("ticketId");


--
-- Name: support_tickets_customerId_status_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "support_tickets_customerId_status_idx" ON public.support_tickets USING btree ("customerId", status);


--
-- Name: support_tickets_status_priority_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX support_tickets_status_priority_idx ON public.support_tickets USING btree (status, priority);


--
-- Name: support_tickets_ticketNumber_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "support_tickets_ticketNumber_key" ON public.support_tickets USING btree ("ticketNumber");


--
-- Name: wishlist_items_customerId_idx; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE INDEX "wishlist_items_customerId_idx" ON public.wishlist_items USING btree ("customerId");


--
-- Name: wishlist_items_customerId_productId_key; Type: INDEX; Schema: public; Owner: abubakarmalik
--

CREATE UNIQUE INDEX "wishlist_items_customerId_productId_key" ON public.wishlist_items USING btree ("customerId", "productId");


--
-- Name: ActivityLog ActivityLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActivityLog ActivityLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AdminNotification AdminNotification_readById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."AdminNotification"
    ADD CONSTRAINT "AdminNotification_readById_fkey" FOREIGN KEY ("readById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AgriBulkOrderItem AgriBulkOrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."AgriBulkOrderItem"
    ADD CONSTRAINT "AgriBulkOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."AgriBulkOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Attendance Attendance_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BakeryIngredientTransaction BakeryIngredientTransaction_ingredientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BakeryIngredientTransaction"
    ADD CONSTRAINT "BakeryIngredientTransaction_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES public."BakeryIngredient"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BakeryProductionItem BakeryProductionItem_planId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BakeryProductionItem"
    ADD CONSTRAINT "BakeryProductionItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES public."BakeryProductionPlan"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BarcodeLabelBatch BarcodeLabelBatch_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BarcodeLabelBatch"
    ADD CONSTRAINT "BarcodeLabelBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BookAuthor BookAuthor_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BookAuthor"
    ADD CONSTRAINT "BookAuthor_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."Author"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BookAuthor BookAuthor_bookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BookAuthor"
    ADD CONSTRAINT "BookAuthor_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES public."BookProfile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BookProfile BookProfile_publisherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BookProfile"
    ADD CONSTRAINT "BookProfile_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES public."Publisher"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: BookingItem BookingItem_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BookingItem"
    ADD CONSTRAINT "BookingItem_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BookingPayment BookingPayment_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BookingPayment"
    ADD CONSTRAINT "BookingPayment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Booking Booking_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Booking Booking_shopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES public."Shop"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Booking Booking_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Brand Brand_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Brand"
    ADD CONSTRAINT "Brand_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BroadcastNotification BroadcastNotification_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BroadcastNotification"
    ADD CONSTRAINT "BroadcastNotification_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BulkImportJob BulkImportJob_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."BulkImportJob"
    ADD CONSTRAINT "BulkImportJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CarpetCutPiece CarpetCutPiece_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CarpetCutPiece"
    ADD CONSTRAINT "CarpetCutPiece_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CarpetCutPiece CarpetCutPiece_shopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CarpetCutPiece"
    ADD CONSTRAINT "CarpetCutPiece_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES public."Shop"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CarpetCutPiece CarpetCutPiece_sourceRollId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CarpetCutPiece"
    ADD CONSTRAINT "CarpetCutPiece_sourceRollId_fkey" FOREIGN KEY ("sourceRollId") REFERENCES public."CarpetRoll"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CarpetCutPiece CarpetCutPiece_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CarpetCutPiece"
    ADD CONSTRAINT "CarpetCutPiece_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CarpetCutPiece CarpetCutPiece_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CarpetCutPiece"
    ADD CONSTRAINT "CarpetCutPiece_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CarpetRollMovement CarpetRollMovement_rollId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CarpetRollMovement"
    ADD CONSTRAINT "CarpetRollMovement_rollId_fkey" FOREIGN KEY ("rollId") REFERENCES public."CarpetRoll"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CarpetRollMovement CarpetRollMovement_saleItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CarpetRollMovement"
    ADD CONSTRAINT "CarpetRollMovement_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES public."SaleItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CarpetRoll CarpetRoll_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CarpetRoll"
    ADD CONSTRAINT "CarpetRoll_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CarpetRoll CarpetRoll_shopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CarpetRoll"
    ADD CONSTRAINT "CarpetRoll_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES public."Shop"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CarpetRoll CarpetRoll_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CarpetRoll"
    ADD CONSTRAINT "CarpetRoll_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CarpetRoll CarpetRoll_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CarpetRoll"
    ADD CONSTRAINT "CarpetRoll_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CashRegister CashRegister_closedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CashRegister"
    ADD CONSTRAINT "CashRegister_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CashRegister CashRegister_openedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CashRegister"
    ADD CONSTRAINT "CashRegister_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CashRegister CashRegister_shopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CashRegister"
    ADD CONSTRAINT "CashRegister_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES public."Shop"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CashRegister CashRegister_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CashRegister"
    ADD CONSTRAINT "CashRegister_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CashTransaction CashTransaction_cashRegisterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CashTransaction"
    ADD CONSTRAINT "CashTransaction_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES public."CashRegister"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CashTransaction CashTransaction_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CashTransaction"
    ADD CONSTRAINT "CashTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CashTransaction CashTransaction_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CashTransaction"
    ADD CONSTRAINT "CashTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Category Category_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClinicEncounter ClinicEncounter_appointmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicEncounter"
    ADD CONSTRAINT "ClinicEncounter_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES public."ClinicAppointment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClinicLabOrder ClinicLabOrder_encounterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicLabOrder"
    ADD CONSTRAINT "ClinicLabOrder_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES public."ClinicEncounter"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ClinicLabTest ClinicLabTest_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicLabTest"
    ADD CONSTRAINT "ClinicLabTest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."ClinicLabOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClinicPrescriptionItem ClinicPrescriptionItem_prescriptionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicPrescriptionItem"
    ADD CONSTRAINT "ClinicPrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES public."ClinicPrescription"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClinicPrescription ClinicPrescription_encounterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicPrescription"
    ADD CONSTRAINT "ClinicPrescription_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES public."ClinicEncounter"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClinicVitals ClinicVitals_appointmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ClinicVitals"
    ADD CONSTRAINT "ClinicVitals_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES public."ClinicAppointment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CreditTransaction CreditTransaction_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CreditTransaction"
    ADD CONSTRAINT "CreditTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CustomerLedger CustomerLedger_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CustomerLedger"
    ADD CONSTRAINT "CustomerLedger_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CustomerLedger CustomerLedger_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CustomerLedger"
    ADD CONSTRAINT "CustomerLedger_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CustomerLedger CustomerLedger_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CustomerLedger"
    ADD CONSTRAINT "CustomerLedger_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CustomerReadingListItem CustomerReadingListItem_listId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."CustomerReadingListItem"
    ADD CONSTRAINT "CustomerReadingListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES public."CustomerReadingList"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Customer Customer_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DairyCustomer DairyCustomer_routeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DairyCustomer"
    ADD CONSTRAINT "DairyCustomer_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES public."DairyRoute"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DairyDelivery DairyDelivery_dairyCustomerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DairyDelivery"
    ADD CONSTRAINT "DairyDelivery_dairyCustomerId_fkey" FOREIGN KEY ("dairyCustomerId") REFERENCES public."DairyCustomer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DairyFarmerSupply DairyFarmerSupply_farmerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DairyFarmerSupply"
    ADD CONSTRAINT "DairyFarmerSupply_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES public."DairyFarmer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DamageLog DamageLog_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DamageLog"
    ADD CONSTRAINT "DamageLog_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."ProductBatch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DamageLog DamageLog_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DamageLog"
    ADD CONSTRAINT "DamageLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DamageLog DamageLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DamageLog"
    ADD CONSTRAINT "DamageLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DamageLog DamageLog_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DamageLog"
    ADD CONSTRAINT "DamageLog_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DeliveryTracking DeliveryTracking_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DeliveryTracking"
    ADD CONSTRAINT "DeliveryTracking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."RestaurantOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DeliveryTracking DeliveryTracking_riderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DeliveryTracking"
    ADD CONSTRAINT "DeliveryTracking_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES public."Rider"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DiscountCode DiscountCode_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DiscountCode"
    ADD CONSTRAINT "DiscountCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DiscountCode DiscountCode_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DiscountCode"
    ADD CONSTRAINT "DiscountCode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DrugInteraction DrugInteraction_saltAId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DrugInteraction"
    ADD CONSTRAINT "DrugInteraction_saltAId_fkey" FOREIGN KEY ("saltAId") REFERENCES public."Salt"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DrugInteraction DrugInteraction_saltBId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."DrugInteraction"
    ADD CONSTRAINT "DrugInteraction_saltBId_fkey" FOREIGN KEY ("saltBId") REFERENCES public."Salt"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmailLog EmailLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."EmailLog"
    ADD CONSTRAINT "EmailLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmiInstallment EmiInstallment_planId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."EmiInstallment"
    ADD CONSTRAINT "EmiInstallment_planId_fkey" FOREIGN KEY ("planId") REFERENCES public."EmiPlan"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmiPlan EmiPlan_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."EmiPlan"
    ADD CONSTRAINT "EmiPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ExpenseCategory ExpenseCategory_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ExpenseCategory"
    ADD CONSTRAINT "ExpenseCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Expense Expense_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ExpenseCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Expense Expense_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Expense Expense_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GarmentLayawayInstallment GarmentLayawayInstallment_planId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GarmentLayawayInstallment"
    ADD CONSTRAINT "GarmentLayawayInstallment_planId_fkey" FOREIGN KEY ("planId") REFERENCES public."GarmentLayawayPlan"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GarmentTailoringOrderItem GarmentTailoringOrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GarmentTailoringOrderItem"
    ADD CONSTRAINT "GarmentTailoringOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."GarmentTailoringOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GarmentTailoringPayment GarmentTailoringPayment_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GarmentTailoringPayment"
    ADD CONSTRAINT "GarmentTailoringPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."GarmentTailoringOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GymAttendance GymAttendance_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymAttendance"
    ADD CONSTRAINT "GymAttendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."GymMember"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GymBodyMeasurement GymBodyMeasurement_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymBodyMeasurement"
    ADD CONSTRAINT "GymBodyMeasurement_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."GymMember"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GymClassBooking GymClassBooking_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymClassBooking"
    ADD CONSTRAINT "GymClassBooking_classId_fkey" FOREIGN KEY ("classId") REFERENCES public."GymClass"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GymClassBooking GymClassBooking_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymClassBooking"
    ADD CONSTRAINT "GymClassBooking_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."GymMember"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GymClass GymClass_trainerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymClass"
    ADD CONSTRAINT "GymClass_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES public."GymTrainer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: GymMemberMembership GymMemberMembership_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymMemberMembership"
    ADD CONSTRAINT "GymMemberMembership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."GymMember"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GymMemberMembership GymMemberMembership_planId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymMemberMembership"
    ADD CONSTRAINT "GymMemberMembership_planId_fkey" FOREIGN KEY ("planId") REFERENCES public."GymMembershipPlan"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GymPersonalTraining GymPersonalTraining_trainerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymPersonalTraining"
    ADD CONSTRAINT "GymPersonalTraining_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES public."GymTrainer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GymWorkoutSession GymWorkoutSession_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."GymWorkoutSession"
    ADD CONSTRAINT "GymWorkoutSession_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."GymMember"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HardwareCreditTransaction HardwareCreditTransaction_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HardwareCreditTransaction"
    ADD CONSTRAINT "HardwareCreditTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."HardwareCreditAccount"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HardwareDeliveryItem HardwareDeliveryItem_deliveryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HardwareDeliveryItem"
    ADD CONSTRAINT "HardwareDeliveryItem_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES public."HardwareDelivery"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HardwareDelivery HardwareDelivery_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HardwareDelivery"
    ADD CONSTRAINT "HardwareDelivery_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."HardwareProject"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: HardwareQuotationItem HardwareQuotationItem_quotationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HardwareQuotationItem"
    ADD CONSTRAINT "HardwareQuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES public."HardwareQuotation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HardwareQuotation HardwareQuotation_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HardwareQuotation"
    ADD CONSTRAINT "HardwareQuotation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."HardwareProject"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: HotelBookedRoom HotelBookedRoom_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HotelBookedRoom"
    ADD CONSTRAINT "HotelBookedRoom_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."HotelBooking"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HotelFolioCharge HotelFolioCharge_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HotelFolioCharge"
    ADD CONSTRAINT "HotelFolioCharge_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."HotelBooking"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HotelRoom HotelRoom_roomTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."HotelRoom"
    ADD CONSTRAINT "HotelRoom_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES public."HotelRoomType"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Invoice Invoice_subscriptionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES public."Subscription"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Invoice Invoice_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JewelryGemstone JewelryGemstone_jewelryProfileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."JewelryGemstone"
    ADD CONSTRAINT "JewelryGemstone_jewelryProfileId_fkey" FOREIGN KEY ("jewelryProfileId") REFERENCES public."JewelryProductProfile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JewelrySaleItem JewelrySaleItem_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."JewelrySaleItem"
    ADD CONSTRAINT "JewelrySaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public."JewelrySale"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Kot Kot_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Kot"
    ADD CONSTRAINT "Kot_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."RestaurantOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LoginHistory LoginHistory_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."LoginHistory"
    ADD CONSTRAINT "LoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LoyaltyTransaction LoyaltyTransaction_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."LoyaltyTransaction"
    ADD CONSTRAINT "LoyaltyTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LoyaltyTransaction LoyaltyTransaction_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."LoyaltyTransaction"
    ADD CONSTRAINT "LoyaltyTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MeatWeightOrderItem MeatWeightOrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."MeatWeightOrderItem"
    ADD CONSTRAINT "MeatWeightOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."MeatWeightOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MedicineSubstitute MedicineSubstitute_mainMedicineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."MedicineSubstitute"
    ADD CONSTRAINT "MedicineSubstitute_mainMedicineId_fkey" FOREIGN KEY ("mainMedicineId") REFERENCES public."PharmacyMedicine"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MedicineSubstitute MedicineSubstitute_substituteMedicineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."MedicineSubstitute"
    ADD CONSTRAINT "MedicineSubstitute_substituteMedicineId_fkey" FOREIGN KEY ("substituteMedicineId") REFERENCES public."PharmacyMedicine"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MenuItemModifier MenuItemModifier_menuItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."MenuItemModifier"
    ADD CONSTRAINT "MenuItemModifier_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES public."RestaurantMenuItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MenuItemModifier MenuItemModifier_modifierGroupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."MenuItemModifier"
    ADD CONSTRAINT "MenuItemModifier_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES public."ModifierGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ModifierOption ModifierOption_modifierGroupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ModifierOption"
    ADD CONSTRAINT "ModifierOption_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES public."ModifierGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: NotificationPreference NotificationPreference_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."NotificationPreference"
    ADD CONSTRAINT "NotificationPreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OnboardingProgress OnboardingProgress_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."OnboardingProgress"
    ADD CONSTRAINT "OnboardingProgress_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OnboardingProgress OnboardingProgress_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."OnboardingProgress"
    ADD CONSTRAINT "OnboardingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OtpCode OtpCode_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."OtpCode"
    ADD CONSTRAINT "OtpCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Payment Payment_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Payment Payment_subscriptionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES public."Subscription"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Payment Payment_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Payment Payment_uploadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES public."Upload"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PharmacyMedicine PharmacyMedicine_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."PharmacyMedicine"
    ADD CONSTRAINT "PharmacyMedicine_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PlatformDiscount PlatformDiscount_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."PlatformDiscount"
    ADD CONSTRAINT "PlatformDiscount_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PrescriptionItem PrescriptionItem_prescriptionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."PrescriptionItem"
    ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES public."Prescription"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Prescription Prescription_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Prescription"
    ADD CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public."Doctor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductBatch ProductBatch_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductBatch"
    ADD CONSTRAINT "ProductBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductBatch ProductBatch_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductBatch"
    ADD CONSTRAINT "ProductBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductBatch ProductBatch_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductBatch"
    ADD CONSTRAINT "ProductBatch_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductComboItem ProductComboItem_comboId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductComboItem"
    ADD CONSTRAINT "ProductComboItem_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES public."ProductCombo"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductComboItem ProductComboItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductComboItem"
    ADD CONSTRAINT "ProductComboItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductComboItem ProductComboItem_unitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductComboItem"
    ADD CONSTRAINT "ProductComboItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public."ProductUnit"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductComboItem ProductComboItem_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductComboItem"
    ADD CONSTRAINT "ProductComboItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductCombo ProductCombo_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductCombo"
    ADD CONSTRAINT "ProductCombo_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductCombo ProductCombo_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductCombo"
    ADD CONSTRAINT "ProductCombo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductImage ProductImage_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductImage"
    ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductImei ProductImei_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductImei"
    ADD CONSTRAINT "ProductImei_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductImei ProductImei_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductImei"
    ADD CONSTRAINT "ProductImei_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductImei ProductImei_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductImei"
    ADD CONSTRAINT "ProductImei_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductSalt ProductSalt_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductSalt"
    ADD CONSTRAINT "ProductSalt_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductSalt ProductSalt_saltId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductSalt"
    ADD CONSTRAINT "ProductSalt_saltId_fkey" FOREIGN KEY ("saltId") REFERENCES public."Salt"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductTag ProductTag_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductTag"
    ADD CONSTRAINT "ProductTag_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductTag ProductTag_tagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductTag"
    ADD CONSTRAINT "ProductTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES public."Tag"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductUnit ProductUnit_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductUnit"
    ADD CONSTRAINT "ProductUnit_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductUnit ProductUnit_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductUnit"
    ADD CONSTRAINT "ProductUnit_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductVariant ProductVariant_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ProductVariant"
    ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Product Product_brandId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES public."Brand"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Product Product_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Product Product_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PurchaseItem PurchaseItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."PurchaseItem"
    ADD CONSTRAINT "PurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PurchaseItem PurchaseItem_purchaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."PurchaseItem"
    ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES public."Purchase"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Purchase Purchase_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Purchase"
    ADD CONSTRAINT "Purchase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Purchase Purchase_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Purchase"
    ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Purchase Purchase_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Purchase"
    ADD CONSTRAINT "Purchase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RecipeIngredient RecipeIngredient_ingredientProductId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RecipeIngredient"
    ADD CONSTRAINT "RecipeIngredient_ingredientProductId_fkey" FOREIGN KEY ("ingredientProductId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RecipeIngredient RecipeIngredient_recipeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RecipeIngredient"
    ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES public."Recipe"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Recipe Recipe_menuItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Recipe"
    ADD CONSTRAINT "Recipe_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES public."RestaurantMenuItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Referral Referral_refereeTenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Referral"
    ADD CONSTRAINT "Referral_refereeTenantId_fkey" FOREIGN KEY ("refereeTenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Referral Referral_referrerTenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Referral"
    ADD CONSTRAINT "Referral_referrerTenantId_fkey" FOREIGN KEY ("referrerTenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReorderSuggestion ReorderSuggestion_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ReorderSuggestion"
    ADD CONSTRAINT "ReorderSuggestion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RepairPart RepairPart_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RepairPart"
    ADD CONSTRAINT "RepairPart_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RepairPart RepairPart_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RepairPart"
    ADD CONSTRAINT "RepairPart_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."RepairTicket"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RepairPayment RepairPayment_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RepairPayment"
    ADD CONSTRAINT "RepairPayment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."RepairTicket"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RepairStatusLog RepairStatusLog_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RepairStatusLog"
    ADD CONSTRAINT "RepairStatusLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."RepairTicket"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RepairTicket RepairTicket_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RepairTicket"
    ADD CONSTRAINT "RepairTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RepairTicket RepairTicket_shopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RepairTicket"
    ADD CONSTRAINT "RepairTicket_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES public."Shop"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RepairTicket RepairTicket_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RepairTicket"
    ADD CONSTRAINT "RepairTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RestaurantMenuItem RestaurantMenuItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RestaurantMenuItem"
    ADD CONSTRAINT "RestaurantMenuItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RestaurantOrderItemModifier RestaurantOrderItemModifier_modifierOptionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RestaurantOrderItemModifier"
    ADD CONSTRAINT "RestaurantOrderItemModifier_modifierOptionId_fkey" FOREIGN KEY ("modifierOptionId") REFERENCES public."ModifierOption"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RestaurantOrderItemModifier RestaurantOrderItemModifier_orderItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RestaurantOrderItemModifier"
    ADD CONSTRAINT "RestaurantOrderItemModifier_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES public."RestaurantOrderItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RestaurantOrderItem RestaurantOrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RestaurantOrderItem"
    ADD CONSTRAINT "RestaurantOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."RestaurantOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RestaurantOrderItem RestaurantOrderItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RestaurantOrderItem"
    ADD CONSTRAINT "RestaurantOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RestaurantOrderPayment RestaurantOrderPayment_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RestaurantOrderPayment"
    ADD CONSTRAINT "RestaurantOrderPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."RestaurantOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RestaurantOrder RestaurantOrder_tableId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RestaurantOrder"
    ADD CONSTRAINT "RestaurantOrder_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES public."RestaurantTableV2"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RestaurantOrder RestaurantOrder_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RestaurantOrder"
    ADD CONSTRAINT "RestaurantOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RestaurantTable RestaurantTable_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RestaurantTable"
    ADD CONSTRAINT "RestaurantTable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RetailQuickKey RetailQuickKey_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."RetailQuickKey"
    ADD CONSTRAINT "RetailQuickKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SalaryPayment SalaryPayment_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SalaryPayment"
    ADD CONSTRAINT "SalaryPayment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SaleItemVariant SaleItemVariant_saleItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SaleItemVariant"
    ADD CONSTRAINT "SaleItemVariant_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES public."SaleItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SaleItemVariant SaleItemVariant_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SaleItemVariant"
    ADD CONSTRAINT "SaleItemVariant_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SaleItem SaleItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SaleItem"
    ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SaleItem SaleItem_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SaleItem"
    ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public."Sale"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SaleReturnItem SaleReturnItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SaleReturnItem"
    ADD CONSTRAINT "SaleReturnItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SaleReturnItem SaleReturnItem_returnId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SaleReturnItem"
    ADD CONSTRAINT "SaleReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES public."SaleReturn"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SaleReturnItem SaleReturnItem_saleItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SaleReturnItem"
    ADD CONSTRAINT "SaleReturnItem_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES public."SaleItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SaleReturn SaleReturn_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SaleReturn"
    ADD CONSTRAINT "SaleReturn_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SaleReturn SaleReturn_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SaleReturn"
    ADD CONSTRAINT "SaleReturn_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public."Sale"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SaleReturn SaleReturn_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SaleReturn"
    ADD CONSTRAINT "SaleReturn_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Sale Sale_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Sale Sale_cashRegisterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES public."CashRegister"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Sale Sale_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Sale Sale_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Sale Sale_discountCodeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES public."DiscountCode"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Sale Sale_shopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES public."Shop"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Sale Sale_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SalonAppointmentLegacy SalonAppointmentLegacy_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SalonAppointmentLegacy"
    ADD CONSTRAINT "SalonAppointmentLegacy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SalonAppointmentService SalonAppointmentService_appointmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SalonAppointmentService"
    ADD CONSTRAINT "SalonAppointmentService_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES public."SalonAppointment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SalonAppointment SalonAppointment_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SalonAppointment"
    ADD CONSTRAINT "SalonAppointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SalonMembership SalonMembership_planId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SalonMembership"
    ADD CONSTRAINT "SalonMembership_planId_fkey" FOREIGN KEY ("planId") REFERENCES public."SalonMembershipPlan"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SalonPackagePurchase SalonPackagePurchase_packageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SalonPackagePurchase"
    ADD CONSTRAINT "SalonPackagePurchase_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES public."SalonPackage"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SalonStaffService SalonStaffService_staffProfileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SalonStaffService"
    ADD CONSTRAINT "SalonStaffService_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES public."SalonStaffProfile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SchoolBookListItem SchoolBookListItem_listId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SchoolBookListItem"
    ADD CONSTRAINT "SchoolBookListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES public."SchoolBookList"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SchoolBookList SchoolBookList_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SchoolBookList"
    ADD CONSTRAINT "SchoolBookList_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ServiceAmcVisit ServiceAmcVisit_amcId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ServiceAmcVisit"
    ADD CONSTRAINT "ServiceAmcVisit_amcId_fkey" FOREIGN KEY ("amcId") REFERENCES public."ServiceAmc"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ServiceJobPart ServiceJobPart_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ServiceJobPart"
    ADD CONSTRAINT "ServiceJobPart_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."ServiceJob"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ServiceJobStatusHistory ServiceJobStatusHistory_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ServiceJobStatusHistory"
    ADD CONSTRAINT "ServiceJobStatusHistory_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."ServiceJob"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ServiceJobTimeLog ServiceJobTimeLog_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ServiceJobTimeLog"
    ADD CONSTRAINT "ServiceJobTimeLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."ServiceJob"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ServiceTechnicianSkill ServiceTechnicianSkill_technicianId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ServiceTechnicianSkill"
    ADD CONSTRAINT "ServiceTechnicianSkill_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES public."ServiceTechnicianProfile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ShopStock ShopStock_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ShopStock"
    ADD CONSTRAINT "ShopStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ShopStock ShopStock_shopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ShopStock"
    ADD CONSTRAINT "ShopStock_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES public."Shop"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ShopStock ShopStock_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."ShopStock"
    ADD CONSTRAINT "ShopStock_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Shop Shop_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Shop"
    ADD CONSTRAINT "Shop_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SmsLog SmsLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SmsLog"
    ADD CONSTRAINT "SmsLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StaffDocument StaffDocument_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StaffDocument"
    ADD CONSTRAINT "StaffDocument_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StaffLeave StaffLeave_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StaffLeave"
    ADD CONSTRAINT "StaffLeave_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Staff Staff_shopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Staff"
    ADD CONSTRAINT "Staff_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES public."Shop"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Staff Staff_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Staff"
    ADD CONSTRAINT "Staff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Staff Staff_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Staff"
    ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StockAdjustment StockAdjustment_carpetRollId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StockAdjustment"
    ADD CONSTRAINT "StockAdjustment_carpetRollId_fkey" FOREIGN KEY ("carpetRollId") REFERENCES public."CarpetRoll"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StockAdjustment StockAdjustment_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StockAdjustment"
    ADD CONSTRAINT "StockAdjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StockAdjustment StockAdjustment_imeiId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StockAdjustment"
    ADD CONSTRAINT "StockAdjustment_imeiId_fkey" FOREIGN KEY ("imeiId") REFERENCES public."ProductImei"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StockAdjustment StockAdjustment_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StockAdjustment"
    ADD CONSTRAINT "StockAdjustment_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StockAdjustment StockAdjustment_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StockAdjustment"
    ADD CONSTRAINT "StockAdjustment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StockAdjustment StockAdjustment_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StockAdjustment"
    ADD CONSTRAINT "StockAdjustment_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StockMovement StockMovement_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StockMovement StockMovement_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StockTransferItem StockTransferItem_carpetRollId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StockTransferItem"
    ADD CONSTRAINT "StockTransferItem_carpetRollId_fkey" FOREIGN KEY ("carpetRollId") REFERENCES public."CarpetRoll"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StockTransferItem StockTransferItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StockTransferItem"
    ADD CONSTRAINT "StockTransferItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockTransferItem StockTransferItem_transferId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StockTransferItem"
    ADD CONSTRAINT "StockTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES public."StockTransfer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StockTransfer StockTransfer_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StockTransfer"
    ADD CONSTRAINT "StockTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StockTransfer StockTransfer_fromShopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StockTransfer"
    ADD CONSTRAINT "StockTransfer_fromShopId_fkey" FOREIGN KEY ("fromShopId") REFERENCES public."Shop"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockTransfer StockTransfer_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StockTransfer"
    ADD CONSTRAINT "StockTransfer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StockTransfer StockTransfer_toShopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."StockTransfer"
    ADD CONSTRAINT "StockTransfer_toShopId_fkey" FOREIGN KEY ("toShopId") REFERENCES public."Shop"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Subscription Subscription_planId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES public."Plan"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Subscription Subscription_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Supplier Supplier_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Supplier"
    ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SystemSetting SystemSetting_updatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."SystemSetting"
    ADD CONSTRAINT "SystemSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Tag Tag_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Tag"
    ADD CONSTRAINT "Tag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TenantNote TenantNote_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."TenantNote"
    ADD CONSTRAINT "TenantNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TenantNote TenantNote_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."TenantNote"
    ADD CONSTRAINT "TenantNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TenantSettings TenantSettings_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."TenantSettings"
    ADD CONSTRAINT "TenantSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Tenant Tenant_referredById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Upload Upload_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."Upload"
    ADD CONSTRAINT "Upload_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UsedPhoneInspection UsedPhoneInspection_usedPhoneId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."UsedPhoneInspection"
    ADD CONSTRAINT "UsedPhoneInspection_usedPhoneId_fkey" FOREIGN KEY ("usedPhoneId") REFERENCES public."UsedPhone"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UsedPhone UsedPhone_fromCustomerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."UsedPhone"
    ADD CONSTRAINT "UsedPhone_fromCustomerId_fkey" FOREIGN KEY ("fromCustomerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UsedPhone UsedPhone_shopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."UsedPhone"
    ADD CONSTRAINT "UsedPhone_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES public."Shop"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UsedPhone UsedPhone_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."UsedPhone"
    ADD CONSTRAINT "UsedPhone_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_shopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES public."Shop"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: VehicleModel VehicleModel_makeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."VehicleModel"
    ADD CONSTRAINT "VehicleModel_makeId_fkey" FOREIGN KEY ("makeId") REFERENCES public."VehicleMake"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: WorkshopJobExternal WorkshopJobExternal_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."WorkshopJobExternal"
    ADD CONSTRAINT "WorkshopJobExternal_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."WorkshopJob"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: WorkshopJobLabor WorkshopJobLabor_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."WorkshopJobLabor"
    ADD CONSTRAINT "WorkshopJobLabor_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."WorkshopJob"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: WorkshopJobPart WorkshopJobPart_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."WorkshopJobPart"
    ADD CONSTRAINT "WorkshopJobPart_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."WorkshopJob"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: WorkshopJobPayment WorkshopJobPayment_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."WorkshopJobPayment"
    ADD CONSTRAINT "WorkshopJobPayment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."WorkshopJob"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: WorkshopJobStatusLog WorkshopJobStatusLog_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public."WorkshopJobStatusLog"
    ADD CONSTRAINT "WorkshopJobStatusLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."WorkshopJob"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: auction_bids auction_bids_auctionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.auction_bids
    ADD CONSTRAINT "auction_bids_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES public.auctions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: auction_bids auction_bids_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.auction_bids
    ADD CONSTRAINT "auction_bids_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: auctions auctions_shopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.auctions
    ADD CONSTRAINT "auctions_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES public."Shop"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: auctions auctions_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.auctions
    ADD CONSTRAINT "auctions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: bargain_messages bargain_messages_bargainId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.bargain_messages
    ADD CONSTRAINT "bargain_messages_bargainId_fkey" FOREIGN KEY ("bargainId") REFERENCES public.bargains(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: bargain_messages bargain_messages_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.bargain_messages
    ADD CONSTRAINT "bargain_messages_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bargains bargains_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.bargains
    ADD CONSTRAINT "bargains_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: bargains bargains_shopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.bargains
    ADD CONSTRAINT "bargains_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES public."Shop"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: bargains bargains_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.bargains
    ADD CONSTRAINT "bargains_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customer_addresses customer_addresses_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT "customer_addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_follows_shop customer_follows_shop_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_follows_shop
    ADD CONSTRAINT "customer_follows_shop_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_follows_shop customer_follows_shop_shopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_follows_shop
    ADD CONSTRAINT "customer_follows_shop_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES public."Shop"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_login_history customer_login_history_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_login_history
    ADD CONSTRAINT "customer_login_history_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: customer_notifications customer_notifications_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_notifications
    ADD CONSTRAINT "customer_notifications_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_otp_codes customer_otp_codes_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_otp_codes
    ADD CONSTRAINT "customer_otp_codes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_push_tokens customer_push_tokens_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_push_tokens
    ADD CONSTRAINT "customer_push_tokens_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_saved_cards customer_saved_cards_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_saved_cards
    ADD CONSTRAINT "customer_saved_cards_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_search_history customer_search_history_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_search_history
    ADD CONSTRAINT "customer_search_history_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: customer_sessions customer_sessions_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_sessions
    ADD CONSTRAINT "customer_sessions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_wallet_txns customer_wallet_txns_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.customer_wallet_txns
    ADD CONSTRAINT "customer_wallet_txns_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: group_buy_participants group_buy_participants_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.group_buy_participants
    ADD CONSTRAINT "group_buy_participants_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: group_buy_participants group_buy_participants_groupBuyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.group_buy_participants
    ADD CONSTRAINT "group_buy_participants_groupBuyId_fkey" FOREIGN KEY ("groupBuyId") REFERENCES public.group_buys(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: group_buys group_buys_shopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.group_buys
    ADD CONSTRAINT "group_buys_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES public."Shop"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: group_buys group_buys_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.group_buys
    ADD CONSTRAINT "group_buys_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: live_shop_messages live_shop_messages_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.live_shop_messages
    ADD CONSTRAINT "live_shop_messages_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: live_shop_messages live_shop_messages_liveShopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.live_shop_messages
    ADD CONSTRAINT "live_shop_messages_liveShopId_fkey" FOREIGN KEY ("liveShopId") REFERENCES public.live_shops(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: live_shop_viewers live_shop_viewers_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.live_shop_viewers
    ADD CONSTRAINT "live_shop_viewers_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: live_shop_viewers live_shop_viewers_liveShopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.live_shop_viewers
    ADD CONSTRAINT "live_shop_viewers_liveShopId_fkey" FOREIGN KEY ("liveShopId") REFERENCES public.live_shops(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: live_shops live_shops_shopProfile_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.live_shops
    ADD CONSTRAINT "live_shops_shopProfile_fkey" FOREIGN KEY ("shopId") REFERENCES public.shop_marketplace_profiles("shopId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: marketplace_cart_lines marketplace_cart_lines_cartId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.marketplace_cart_lines
    ADD CONSTRAINT "marketplace_cart_lines_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES public.marketplace_carts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: marketplace_carts marketplace_carts_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.marketplace_carts
    ADD CONSTRAINT "marketplace_carts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: marketplace_customers marketplace_customers_referredById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.marketplace_customers
    ADD CONSTRAINT "marketplace_customers_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: marketplace_order_items marketplace_order_items_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.marketplace_order_items
    ADD CONSTRAINT "marketplace_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.marketplace_orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: marketplace_orders marketplace_orders_addressId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.marketplace_orders
    ADD CONSTRAINT "marketplace_orders_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES public.customer_addresses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: marketplace_orders marketplace_orders_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.marketplace_orders
    ADD CONSTRAINT "marketplace_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: marketplace_orders marketplace_orders_shopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.marketplace_orders
    ADD CONSTRAINT "marketplace_orders_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES public."Shop"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: marketplace_orders marketplace_orders_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.marketplace_orders
    ADD CONSTRAINT "marketplace_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: marketplace_reviews marketplace_reviews_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.marketplace_reviews
    ADD CONSTRAINT "marketplace_reviews_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: marketplace_reviews marketplace_reviews_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.marketplace_reviews
    ADD CONSTRAINT "marketplace_reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.marketplace_orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: marketplace_reviews marketplace_reviews_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.marketplace_reviews
    ADD CONSTRAINT "marketplace_reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.product_marketplace_profiles("productId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: marketplace_reviews marketplace_reviews_shopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.marketplace_reviews
    ADD CONSTRAINT "marketplace_reviews_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES public.shop_marketplace_profiles("shopId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: order_status_history order_status_history_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT "order_status_history_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.marketplace_orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_marketplace_profiles product_marketplace_profiles_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.product_marketplace_profiles
    ADD CONSTRAINT "product_marketplace_profiles_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_marketplace_profiles product_marketplace_profiles_shopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.product_marketplace_profiles
    ADD CONSTRAINT "product_marketplace_profiles_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES public."Shop"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_marketplace_profiles product_marketplace_profiles_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.product_marketplace_profiles
    ADD CONSTRAINT "product_marketplace_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_views product_views_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.product_views
    ADD CONSTRAINT "product_views_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: review_votes review_votes_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.review_votes
    ADD CONSTRAINT "review_votes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: review_votes review_votes_reviewId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.review_votes
    ADD CONSTRAINT "review_votes_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES public.marketplace_reviews(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: shop_marketplace_profiles shop_marketplace_profiles_shopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.shop_marketplace_profiles
    ADD CONSTRAINT "shop_marketplace_profiles_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES public."Shop"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: shop_marketplace_profiles shop_marketplace_profiles_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.shop_marketplace_profiles
    ADD CONSTRAINT "shop_marketplace_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: support_messages support_messages_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT "support_messages_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: support_messages support_messages_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT "support_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.support_tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT "support_tickets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: wishlist_items wishlist_items_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: abubakarmalik
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT "wishlist_items_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.marketplace_customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict x08Jctv7BfXtdGuJNg1KUvffe8s2j7KoPQic5gcy8WddJV8tBcNU5qnGE6O1d3M

