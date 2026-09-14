-- ═══════════════════════════════════════════════════════════════
-- ApplianceWarrantyClaim — brand se paisa wapas lene ka record
--
-- Appliance ki dukaan warranty wala repair FREE karti hai: parts
-- aur labor ka kharcha apni jeb se bhardti hai, phir company se
-- wo paisa claim karti hai.
--
-- Ab tak sirf ApplianceServiceRequest par `warrantyClaimNumber`
-- ka ek khali khana tha. Claim kahan pohancha, brand ne kitna
-- manzoor kiya, kitna paisa asal me aaya — kuch record nahi tha,
-- is liye wo paisa aksar zaya ho jata tha.
--
-- Ye migration sirf naya table banati hai — kisi mojooda data ko
-- haath nahi lagati.
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE "ApplianceClaimStatus" AS ENUM (
    'DRAFT', 'SUBMITTED', 'BRAND_REVIEWING', 'APPROVED',
    'PARTIALLY_APPROVED', 'REJECTED', 'SETTLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ApplianceWarrantyClaim" (
  "id"                      TEXT NOT NULL,
  "tenantId"                TEXT NOT NULL,
  "claimNumber"             TEXT NOT NULL,

  "serialTrackingId"        TEXT,
  "serialNumber"            TEXT,
  "productId"               TEXT,
  "productName"             TEXT NOT NULL,
  "brandId"                 TEXT,
  "brandName"               TEXT,
  "modelNumber"             TEXT,

  "serviceRequestId"        TEXT,
  "serviceRequestNumber"    TEXT,

  "customerId"              TEXT,
  "customerName"            TEXT NOT NULL,
  "customerPhone"           TEXT,

  "purchaseDate"            TIMESTAMP(3),
  "invoiceNumber"           TEXT,

  "claimDate"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "issue"                   TEXT NOT NULL,
  "issueCategory"           TEXT,
  "warrantyKind"            TEXT,

  "status"                  "ApplianceClaimStatus" NOT NULL DEFAULT 'DRAFT',

  "submittedAt"             TIMESTAMP(3),
  "brandRef"                TEXT,
  "brandContact"            TEXT,
  "brandRespondedAt"        TIMESTAMP(3),
  "brandResponse"           TEXT,

  "partsCost"               DOUBLE PRECISION NOT NULL DEFAULT 0,
  "laborCost"               DOUBLE PRECISION NOT NULL DEFAULT 0,
  "otherCost"               DOUBLE PRECISION NOT NULL DEFAULT 0,
  "claimedAmount"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "approvedAmount"          DOUBLE PRECISION NOT NULL DEFAULT 0,
  "receivedAmount"          DOUBLE PRECISION NOT NULL DEFAULT 0,

  "settledAt"               TIMESTAMP(3),
  "rejectionReason"         TEXT,
  "replacementSerialNumber" TEXT,

  "documentUrls"            TEXT[] DEFAULT ARRAY[]::TEXT[],
  "imageUrls"               TEXT[] DEFAULT ARRAY[]::TEXT[],
  "notes"                   TEXT,

  "createdById"             TEXT,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ApplianceWarrantyClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ApplianceWarrantyClaim_tenantId_claimNumber_key"
  ON "ApplianceWarrantyClaim"("tenantId", "claimNumber");
CREATE INDEX IF NOT EXISTS "ApplianceWarrantyClaim_tenantId_idx"
  ON "ApplianceWarrantyClaim"("tenantId");
CREATE INDEX IF NOT EXISTS "ApplianceWarrantyClaim_tenantId_status_idx"
  ON "ApplianceWarrantyClaim"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "ApplianceWarrantyClaim_serviceRequestId_idx"
  ON "ApplianceWarrantyClaim"("serviceRequestId");
CREATE INDEX IF NOT EXISTS "ApplianceWarrantyClaim_customerId_idx"
  ON "ApplianceWarrantyClaim"("customerId");
