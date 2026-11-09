-- Direct courier connections (Beta): InstaWorld (Merchant API v2) and ShipNOC.
-- Additive only; existing rows are untouched.
ALTER TYPE "CourierProvider" ADD VALUE IF NOT EXISTS 'INSTAWORLD';
ALTER TYPE "CourierProvider" ADD VALUE IF NOT EXISTS 'SHIPNOC';
