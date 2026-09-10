-- Ek hi brand system: global Brand. Electronics ka alag brand module khatam.
-- Uske kaam ke fields (dealer, support, warranty policy) ab global Brand par
-- hain, taake har industry inhe use kar sake.

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN "countryOfOrigin"  TEXT;
ALTER TABLE "Brand" ADD COLUMN "authorizedDealer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Brand" ADD COLUMN "dealerCode"       TEXT;
ALTER TABLE "Brand" ADD COLUMN "supportPhone"     TEXT;
ALTER TABLE "Brand" ADD COLUMN "supportEmail"     TEXT;
ALTER TABLE "Brand" ADD COLUMN "warrantyPolicy"   TEXT;
ALTER TABLE "Brand" ADD COLUMN "isFeatured"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Brand" ADD COLUMN "displayOrder"     INTEGER NOT NULL DEFAULT 0;

-- Safety: agar kisi tenant ne ElectronicsBrand banaye the to unhe global
-- Brand me le aao (naam se match, warna naya bana do).
INSERT INTO "Brand" (
  "id", "tenantId", "name", "slug", "description", "logoUrl", "website",
  "isActive", "countryOfOrigin", "authorizedDealer", "dealerCode",
  "supportPhone", "supportEmail", "warrantyPolicy", "isFeatured",
  "displayOrder", "createdAt", "updatedAt"
)
SELECT
  eb."id", eb."tenantId", eb."name",
  lower(regexp_replace(eb."name", '[^a-zA-Z0-9]+', '-', 'g')),
  eb."description", eb."logoUrl", eb."websiteUrl",
  eb."isActive", eb."countryOfOrigin", eb."authorizedDealer", eb."dealerCode",
  eb."supportPhone", eb."supportEmail", eb."warrantyPolicy", eb."isFeatured",
  eb."displayOrder", eb."createdAt", eb."updatedAt"
FROM "ElectronicsBrand" eb
WHERE NOT EXISTS (
  SELECT 1 FROM "Brand" b
  WHERE b."tenantId" = eb."tenantId" AND lower(b."name") = lower(eb."name")
)
ON CONFLICT DO NOTHING;

-- DropTable
DROP TABLE IF EXISTS "ElectronicsBrand";
