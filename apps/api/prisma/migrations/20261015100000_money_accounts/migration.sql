-- Money accounts: a safe, bank accounts and mobile wallets next to the
-- drawer, with manual movements (transfers, deposits, withdrawals,
-- adjustments). Only new types, tables and indexes; nothing existing
-- changes. Every shop gets a "Tijori (cash)" account with a zero opening
-- balance. Safe to run more than once.

DO $$ BEGIN
  CREATE TYPE "MoneyAccountKind" AS ENUM ('CASH', 'BANK', 'WALLET');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MoneyEntryType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "MoneyAccount" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shopId" TEXT,
  "name" TEXT NOT NULL,
  "kind" "MoneyAccountKind" NOT NULL,
  "method" "PaymentMethod",
  "bankName" TEXT,
  "accountTitle" TEXT,
  "accountNumber" TEXT,
  "iban" TEXT,
  "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "openingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MoneyAccount_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MoneyAccount_tenantId_idx" ON "MoneyAccount"("tenantId");
CREATE INDEX IF NOT EXISTS "MoneyAccount_tenantId_shopId_idx" ON "MoneyAccount"("tenantId", "shopId");
CREATE INDEX IF NOT EXISTS "MoneyAccount_tenantId_method_idx" ON "MoneyAccount"("tenantId", "method");

CREATE TABLE IF NOT EXISTS "MoneyAccountEntry" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shopId" TEXT,
  "accountId" TEXT NOT NULL,
  "type" "MoneyEntryType" NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "reason" TEXT,
  "note" TEXT,
  "transferGroupId" TEXT,
  "requestId" TEXT,
  "cashRegisterId" TEXT,
  "createdById" TEXT,
  "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MoneyAccountEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MoneyAccountEntry_tenantId_requestId_key" ON "MoneyAccountEntry"("tenantId", "requestId");
CREATE INDEX IF NOT EXISTS "MoneyAccountEntry_tenantId_accountId_entryDate_idx" ON "MoneyAccountEntry"("tenantId", "accountId", "entryDate");
CREATE INDEX IF NOT EXISTS "MoneyAccountEntry_transferGroupId_idx" ON "MoneyAccountEntry"("transferGroupId");

DO $$ BEGIN
  ALTER TABLE "MoneyAccount" ADD CONSTRAINT "MoneyAccount_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "MoneyAccount" ADD CONSTRAINT "MoneyAccount_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "MoneyAccount" ADD CONSTRAINT "MoneyAccount_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "MoneyAccountEntry" ADD CONSTRAINT "MoneyAccountEntry_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "MoneyAccountEntry" ADD CONSTRAINT "MoneyAccountEntry_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "MoneyAccountEntry" ADD CONSTRAINT "MoneyAccountEntry_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "MoneyAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "MoneyAccountEntry" ADD CONSTRAINT "MoneyAccountEntry_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- One safe per existing shop, opening balance 0. Skipped for shops that
-- already have a cash account, so a second run adds nothing.
INSERT INTO "MoneyAccount" ("id", "tenantId", "shopId", "name", "kind", "openingBalance", "openingDate", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, s."tenantId", s."id", 'Tijori (cash)', 'CASH', 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Shop" s
WHERE NOT EXISTS (
  SELECT 1 FROM "MoneyAccount" a WHERE a."tenantId" = s."tenantId" AND a."shopId" = s."id" AND a."kind" = 'CASH'
);
