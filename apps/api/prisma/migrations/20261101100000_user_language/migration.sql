-- App language per user: 'en' | 'ur' | 'roman' (Roman Urdu).
--
-- Additive only. The column is nullable; null means "not chosen yet" and the
-- web app saves the language the person is using at their next login.
-- Everyone who already has an account is moved to Roman Urdu, the language the
-- app has spoken until now, so nobody's screen changes on deploy day. New
-- accounts get English unless they pick another language while signing up.
-- Safe to run more than once: the backfill only touches rows still null.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "language" TEXT;

UPDATE "User" SET "language" = 'roman' WHERE "language" IS NULL;
