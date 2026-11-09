-- Products: category tree, suppliers per product, base pack row repair.
-- Additive only; every existing row keeps working.

-- 1. Category tree. Existing categories stay top level; siblings keep name order.
ALTER TABLE "Category" ADD COLUMN "parentId" TEXT;
ALTER TABLE "Category" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Category_tenantId_parentId_idx" ON "Category"("tenantId", "parentId");

UPDATE "Category" c SET "sortOrder" = o.rn
FROM (SELECT id, (ROW_NUMBER() OVER (PARTITION BY "tenantId" ORDER BY lower(name)) - 1)::int AS rn FROM "Category") o
WHERE o.id = c.id;

-- 2. Suppliers per product.
CREATE TABLE "ProductSupplier" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "supplierSku" TEXT,
  "costPrice" DOUBLE PRECISION,
  "lastPurchasePrice" DOUBLE PRECISION,
  "lastPurchasedAt" TIMESTAMP(3),
  "minOrderQty" DOUBLE PRECISION,
  "leadDays" INTEGER,
  "unitId" TEXT,
  "isPreferred" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductSupplier_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductSupplier_productId_supplierId_key" ON "ProductSupplier"("productId", "supplierId");
CREATE INDEX "ProductSupplier_tenantId_idx" ON "ProductSupplier"("tenantId");
CREATE INDEX "ProductSupplier_tenantId_supplierId_idx" ON "ProductSupplier"("tenantId", "supplierId");
ALTER TABLE "ProductSupplier" ADD CONSTRAINT "ProductSupplier_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductSupplier" ADD CONSTRAINT "ProductSupplier_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductSupplier" ADD CONSTRAINT "ProductSupplier_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from real purchases: one link per product and supplier, with the
-- latest cost per base unit; the most recent supplier of each product is preferred.
INSERT INTO "ProductSupplier" ("id", "tenantId", "productId", "supplierId", "lastPurchasePrice", "lastPurchasedAt", "unitId", "isPreferred", "updatedAt")
SELECT gen_random_uuid()::text, x."tenantId", x."productId", x."supplierId", x.cost, x."purchasedAt", x."unitId", false, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (pi."productId", p."supplierId")
    p."tenantId", pi."productId", p."supplierId", p."purchasedAt", pi."unitId",
    CASE WHEN COALESCE(pi."conversionRate", 1) > 0 THEN ROUND((pi."costPrice" / COALESCE(pi."conversionRate", 1))::numeric, 4)::float8 ELSE pi."costPrice" END AS cost
  FROM "PurchaseItem" pi
  JOIN "Purchase" p ON p.id = pi."purchaseId"
  JOIN "Product" pr ON pr.id = pi."productId" AND pr."tenantId" = p."tenantId"
  WHERE pi."productId" IS NOT NULL AND p.status <> 'CANCELLED'
  ORDER BY pi."productId", p."supplierId", p."purchasedAt" DESC, pi."createdAt" DESC
) x;

UPDATE "ProductSupplier" ps SET "isPreferred" = true
FROM (
  SELECT DISTINCT ON ("productId") id FROM "ProductSupplier" ORDER BY "productId", "lastPurchasedAt" DESC NULLS LAST
) top
WHERE top.id = ps.id;

-- 3. Base pack rows follow their product. The editor copied the product's
-- unit and prices into the base row once, so later price edits left the base
-- row stale. Rename only where no other pack of the product has that name.
UPDATE "ProductUnit" u SET
  "price" = p."price", "costPrice" = p."costPrice", "wholesalePrice" = p."wholesalePrice", "creditPrice" = p."creditPrice",
  "unitName" = CASE WHEN EXISTS (
      SELECT 1 FROM "ProductUnit" o WHERE o."productId" = u."productId" AND o."variantId" IS NULL AND o.id <> u.id AND lower(o."unitName") = lower(p."unit")
    ) THEN u."unitName" ELSE p."unit" END,
  "conversionRate" = 1, "conversionType" = 'BASE', "updatedAt" = CURRENT_TIMESTAMP
FROM "Product" p
WHERE p.id = u."productId" AND u."isBase" = true AND u."variantId" IS NULL
  AND (u."price" <> p."price" OR u."costPrice" <> p."costPrice" OR u."unitName" <> p."unit" OR u."conversionRate" <> 1
       OR u."wholesalePrice" IS DISTINCT FROM p."wholesalePrice" OR u."creditPrice" IS DISTINCT FROM p."creditPrice");
