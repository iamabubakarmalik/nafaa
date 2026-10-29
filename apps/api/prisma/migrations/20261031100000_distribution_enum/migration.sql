-- Distribution: sales invoiced from a distribution sales order carry
-- Sale.source = 'DISTRIBUTION'. Kept in its own migration because Postgres
-- cannot use a new enum value in the transaction that adds it.
-- Additive only; existing sales keep their source. Safe to run more than once.
ALTER TYPE "SaleSource" ADD VALUE IF NOT EXISTS 'DISTRIBUTION';
