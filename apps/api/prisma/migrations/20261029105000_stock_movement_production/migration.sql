-- Manufacturing: stock movement types for raw materials used and finished
-- goods made. Kept in their own migration because Postgres cannot use a new
-- enum value in the transaction that adds it.
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'PRODUCTION_IN';
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'PRODUCTION_OUT';
