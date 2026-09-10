-- Electronics serial units ko dusri shop bhejne ke liye.
-- Iske baghair laptop/camera transfer par ShopStock to move ho jata tha
-- lekin serial ka shopId purani shop par hi atka rehta tha — yani
-- stock report jhoot bolti thi.

-- 1) Serial ka IN_TRANSIT status (raste me — kisi shop par bikne ke liye nahi)
ALTER TYPE "ElectronicsSerialStatus" ADD VALUE IF NOT EXISTS 'IN_TRANSIT';

-- 2) Transfer line par serial ka link
ALTER TABLE "StockTransferItem" ADD COLUMN IF NOT EXISTS "serialId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StockTransferItem_serialId_fkey'
  ) THEN
    ALTER TABLE "StockTransferItem"
      ADD CONSTRAINT "StockTransferItem_serialId_fkey"
      FOREIGN KEY ("serialId") REFERENCES "ElectronicsSerialTracking"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "StockTransferItem_serialId_idx" ON "StockTransferItem"("serialId");
