-- Sign in with Apple: the Apple user id on User and an APPLE sign-in provider.
--
-- Additive only: one nullable column with a unique index and one new enum
-- value. Existing rows keep NULL; nothing is backfilled. The new enum value is
-- not used inside this migration. Safe to run more than once.

ALTER TYPE "AuthProvider" ADD VALUE IF NOT EXISTS 'APPLE';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "appleId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_appleId_key" ON "User"("appleId");
