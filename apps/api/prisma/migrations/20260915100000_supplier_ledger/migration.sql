-- ═══════════════════════════════════════════════════════════════
-- SupplierLedger — supplier ka khata
--
-- Ab tak sirf `Supplier.outstandingDue` ka ek number tha jo kharidari
-- par barhta tha. Na "purana hisab" (system se pehle ka dena) darj ho
-- sakta tha, na supplier ko di gayi adaigi ka koi record banta tha.
--
-- BACKFILL: har us supplier ke liye jis par abhi dena baqi hai, ek
-- OPENING_BALANCE entry bana di jati hai. Is tarah mojooda balance
-- waisa ka waisa rehta hai aur khata khali nazar nahi aata.
-- (Per-purchase history dobara nahi ban sakti kyunke adaigi ka record
-- pehle rakha hi nahi jata tha — is liye ek hi opening entry.)
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE "SupplierLedgerType" AS ENUM (
    'OPENING_BALANCE', 'PURCHASE_CREDIT', 'PAYMENT_MADE',
    'PURCHASE_RETURN', 'ADJUSTMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SupplierLedger" (
  "id"           TEXT NOT NULL,
  "tenantId"     TEXT NOT NULL,
  "supplierId"   TEXT NOT NULL,
  "shopId"       TEXT,
  "createdById"  TEXT,
  "type"         "SupplierLedgerType" NOT NULL,
  "amount"       DOUBLE PRECISION NOT NULL,
  "balanceAfter" DOUBLE PRECISION NOT NULL,
  "reference"    TEXT,
  "note"         TEXT,
  "entryDate"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SupplierLedger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SupplierLedger_tenantId_idx"            ON "SupplierLedger"("tenantId");
CREATE INDEX IF NOT EXISTS "SupplierLedger_supplierId_idx"          ON "SupplierLedger"("supplierId");
CREATE INDEX IF NOT EXISTS "SupplierLedger_supplierId_entryDate_idx" ON "SupplierLedger"("supplierId", "entryDate");
CREATE INDEX IF NOT EXISTS "SupplierLedger_tenantId_type_idx"       ON "SupplierLedger"("tenantId", "type");

DO $$ BEGIN
  ALTER TABLE "SupplierLedger"
    ADD CONSTRAINT "SupplierLedger_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierLedger"
    ADD CONSTRAINT "SupplierLedger_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── BACKFILL: mojooda baqi ko purane hisab ki soorat me ──────────
INSERT INTO "SupplierLedger" (
  "id", "tenantId", "supplierId", "type", "amount", "balanceAfter",
  "note", "entryDate", "createdAt"
)
SELECT
  gen_random_uuid()::text,
  s."tenantId",
  s."id",
  'OPENING_BALANCE',
  s."outstandingDue",
  s."outstandingDue",
  'Purana hisab — khata shuru hone se pehle ka baqi',
  COALESCE(s."createdAt", CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP
FROM "Supplier" s
WHERE s."outstandingDue" > 0
  AND NOT EXISTS (
    SELECT 1 FROM "SupplierLedger" l WHERE l."supplierId" = s."id"
  );
