-- ═══════════════════════════════════════════════════════════════
-- ApplianceBrand → global Brand
--
-- Masla: appliance product ke do brand thay —
--   • Product.brandId                  → Brand        (global)
--   • ApplianceProductProfile.brandId  → ApplianceBrand
-- Ek hi "Haier" do jagah alag record banti thi, is liye product list
-- aur appliance reports alag alag numbers dikhate thay.
--
-- Electronics ke sath ye kaam pehle ho chuka hai (ElectronicsBrand
-- khatam kar ke Brand me mila diya gaya). Appliances bacha hua tha.
--
-- Ye migration data KHATAM NAHI karti — ApplianceBrand table jahan
-- hai wahin rehti hai (safety net). Sirf global Brand me copy hoti
-- hai aur saare reference udhar mor diye jate hain.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Appliance ke khaas columns global Brand me ───────────────
ALTER TABLE "Brand" ADD COLUMN IF NOT EXISTS "serviceCenter" TEXT;
ALTER TABLE "Brand" ADD COLUMN IF NOT EXISTS "installationIncluded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Brand" ADD COLUMN IF NOT EXISTS "demoIncluded" BOOLEAN NOT NULL DEFAULT false;

-- ─── 2. ApplianceBrand ki rows global Brand me ───────────────────
-- Wohi id istemal hoti hai, is liye ApplianceProductProfile.brandId
-- khud ba khud sahi Brand par point karne lagta hai.
-- Jis naam ki Brand pehle se mojood ho, usay chhor dete hain (step 3
-- me us par remap hota hai).
INSERT INTO "Brand" (
  "id", "tenantId", "name", "slug", "description", "logoUrl", "isActive",
  "countryOfOrigin", "authorizedDealer", "dealerCode", "supportPhone", "supportEmail",
  "warrantyPolicy", "isFeatured", "displayOrder",
  "serviceCenter", "installationIncluded", "demoIncluded",
  "createdAt", "updatedAt"
)
SELECT
  ab."id",
  ab."tenantId",
  ab."name",
  -- Slug naam se banta hai. Takrao ho (chahe mojooda Brand se ya kisi
  -- doosri ApplianceBrand se) to id ka hissa laga dete hain.
  CASE WHEN
    EXISTS (
      SELECT 1 FROM "Brand" b2
      WHERE b2."tenantId" = ab."tenantId"
        AND b2."slug" = trim(both '-' from lower(regexp_replace(ab."name", '[^a-zA-Z0-9]+', '-', 'g')))
    )
    OR EXISTS (
      SELECT 1 FROM "ApplianceBrand" ab2
      WHERE ab2."tenantId" = ab."tenantId"
        AND ab2."id" <> ab."id"
        AND ab2."id" < ab."id"
        AND trim(both '-' from lower(regexp_replace(ab2."name", '[^a-zA-Z0-9]+', '-', 'g')))
          = trim(both '-' from lower(regexp_replace(ab."name",  '[^a-zA-Z0-9]+', '-', 'g')))
    )
  THEN trim(both '-' from lower(regexp_replace(ab."name", '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || substr(ab."id", 1, 8)
  ELSE trim(both '-' from lower(regexp_replace(ab."name", '[^a-zA-Z0-9]+', '-', 'g')))
  END,
  ab."description",
  ab."logoUrl",
  ab."isActive",
  ab."countryOfOrigin",
  ab."authorizedDealer",
  ab."dealerCode",
  ab."serviceContact",
  ab."serviceEmail",
  ab."warrantyPolicy",
  ab."isFeatured",
  ab."displayOrder",
  ab."serviceCenter",
  ab."installationIncluded",
  ab."demoIncluded",
  ab."createdAt",
  ab."updatedAt"
FROM "ApplianceBrand" ab
WHERE NOT EXISTS (
  SELECT 1 FROM "Brand" b
  WHERE b."tenantId" = ab."tenantId"
    AND lower(b."name") = lower(ab."name")
);

-- ─── 3. Jin ka naam pehle se Brand me tha — un par remap ─────────
UPDATE "ApplianceProductProfile" app
SET "brandId" = b."id"
FROM "ApplianceBrand" ab
JOIN "Brand" b
  ON b."tenantId" = ab."tenantId"
 AND lower(b."name") = lower(ab."name")
WHERE app."brandId" = ab."id"
  AND app."brandId" <> b."id";

-- ─── 4. Product ka apna brand bhi bhar dein ──────────────────────
-- Ab tak brand sirf profile me tha, is liye global product list me
-- appliance products ka brand khali dikhta tha.
UPDATE "Product" p
SET "brandId" = app."brandId"
FROM "ApplianceProductProfile" app
WHERE app."productId" = p."id"
  AND app."brandId" IS NOT NULL
  AND p."brandId" IS NULL
  AND EXISTS (SELECT 1 FROM "Brand" b WHERE b."id" = app."brandId");

-- ─── 5. Jo brandId ab bhi kisi Brand par point nahi karta ────────
-- (ApplianceBrand delete ho chuki thi) — usay khali kar dete hain
-- taake report me "Brand" jaisa jhoota naam na chapay.
UPDATE "ApplianceProductProfile" app
SET "brandId" = NULL
WHERE app."brandId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Brand" b WHERE b."id" = app."brandId");
