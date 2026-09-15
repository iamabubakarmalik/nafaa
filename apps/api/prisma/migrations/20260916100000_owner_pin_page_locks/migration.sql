-- Malik ka PIN ab server par — har device par wohi chalega.
--
-- Pehle PIN sirf browser ke localStorage me tha (SHA-256), is liye
-- doosre mobile ya computer par login karne par PIN kaam hi nahi karta
-- tha. `managerPin` (bcrypt) pehle se mojood tha magar app use nahi kar
-- raha tha. Ab wohi ek PIN sab jagah chalta hai.
--
-- Sab columns ki default value hai — purane tenants par kuch nahi
-- badalta: PIN utna hi rehta hai jitna tha, koi safha lock nahi hota.

ALTER TABLE "TenantSettings"
  ADD COLUMN IF NOT EXISTS "managerPinUpdatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lockedRoutes"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "pinUnlockMinutes"    INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS "hideCostByDefault"   BOOLEAN NOT NULL DEFAULT false;

-- Jin dukaanon ka PIN pehle se laga hua hai, unka "kab set hua" ka
-- waqt maloom nahi — settings ke banne ka waqt hi likh dete hain,
-- taake Settings me khali jagah na dikhe.
UPDATE "TenantSettings"
SET "managerPinUpdatedAt" = COALESCE("updatedAt", "createdAt")
WHERE "managerPin" IS NOT NULL
  AND "managerPinUpdatedAt" IS NULL;
