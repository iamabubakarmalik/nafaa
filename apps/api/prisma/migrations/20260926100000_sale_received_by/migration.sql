-- Maal lene wale banda ka record.
--
-- Teenon khane nullable hain: chalti hui dukaanon me lakhon purani
-- sales maujood hain jin me koi receiver tha hi nahi, aur walk-in cash
-- bill par ab bhi nahi hoga. Is liye koi backfill ki zaroorat nahi —
-- purani rows jaisi hain waisi theek hain.
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "receivedByName"  TEXT;
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "receivedByPhone" TEXT;
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "receivedByCnic"  TEXT;

-- POS me "pehle kaun aaya tha" ki list isi par chalti hai:
-- ek customer ki pichhli sales me se receiver ke naam.
CREATE INDEX IF NOT EXISTS "Sale_customerId_receivedByName_idx"
  ON "Sale" ("customerId", "receivedByName");
