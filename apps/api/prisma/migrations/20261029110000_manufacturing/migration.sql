-- Manufacturing for every industry: a recipe (bill of materials) per product
-- made in-house, and production runs that take raw materials out of stock and
-- put finished goods in at the cost worked out from them.
--
-- Additive only: a new settings switch (off for every existing shop) and four
-- new tables. No existing row is changed. Safe to run more than once.
--
-- The permissions manufacturing.view / .manage / .produce are defaults for new
-- managers; existing managers are granted them separately, with the owner's
-- approval. Owners always have them.

ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "manufacturingEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "ProductionRecipe" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "yieldQty" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "wastagePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "packingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "labourCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "overheadCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "makeOnSale" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductionRecipe_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProductionRecipe_productId_key" ON "ProductionRecipe"("productId");
CREATE INDEX IF NOT EXISTS "ProductionRecipe_tenantId_idx" ON "ProductionRecipe"("tenantId");
CREATE INDEX IF NOT EXISTS "ProductionRecipe_tenantId_makeOnSale_idx" ON "ProductionRecipe"("tenantId", "makeOnSale");

CREATE TABLE IF NOT EXISTS "ProductionRecipeLine" (
  "id" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unitName" TEXT NOT NULL,
  "unitId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  CONSTRAINT "ProductionRecipeLine_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ProductionRecipeLine_recipeId_idx" ON "ProductionRecipeLine"("recipeId");
CREATE INDEX IF NOT EXISTS "ProductionRecipeLine_productId_idx" ON "ProductionRecipeLine"("productId");

CREATE TABLE IF NOT EXISTS "ProductionRun" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "runNumber" TEXT NOT NULL,
  "recipeId" TEXT,
  "productId" TEXT NOT NULL,
  "batches" DOUBLE PRECISION NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "materialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "extraCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "wastagePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "batchNumber" TEXT,
  "expiryDate" TIMESTAMP(3),
  "outputBatchId" TEXT,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "reference" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DONE',
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reversedById" TEXT,
  "reversedAt" TIMESTAMP(3),
  "reverseReason" TEXT,
  CONSTRAINT "ProductionRun_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProductionRun_tenantId_runNumber_key" ON "ProductionRun"("tenantId", "runNumber");
CREATE INDEX IF NOT EXISTS "ProductionRun_tenantId_createdAt_idx" ON "ProductionRun"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProductionRun_tenantId_shopId_createdAt_idx" ON "ProductionRun"("tenantId", "shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProductionRun_productId_idx" ON "ProductionRun"("productId");
CREATE INDEX IF NOT EXISTS "ProductionRun_recipeId_idx" ON "ProductionRun"("recipeId");

CREATE TABLE IF NOT EXISTS "ProductionRunLine" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "batchTakes" JSONB,
  CONSTRAINT "ProductionRunLine_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ProductionRunLine_runId_idx" ON "ProductionRunLine"("runId");
CREATE INDEX IF NOT EXISTS "ProductionRunLine_productId_idx" ON "ProductionRunLine"("productId");

DO $$ BEGIN
  ALTER TABLE "ProductionRecipe" ADD CONSTRAINT "ProductionRecipe_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductionRecipe" ADD CONSTRAINT "ProductionRecipe_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductionRecipeLine" ADD CONSTRAINT "ProductionRecipeLine_recipeId_fkey"
    FOREIGN KEY ("recipeId") REFERENCES "ProductionRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductionRecipeLine" ADD CONSTRAINT "ProductionRecipeLine_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_recipeId_fkey"
    FOREIGN KEY ("recipeId") REFERENCES "ProductionRecipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductionRunLine" ADD CONSTRAINT "ProductionRunLine_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ProductionRunLine" ADD CONSTRAINT "ProductionRunLine_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
