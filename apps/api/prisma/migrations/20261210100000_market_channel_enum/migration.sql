-- Nafaa Market becomes a sales channel like Nafaa Stores: every shop listed on
-- the Market gets one NAFAA_MARKET integration, so its orders go through the
-- Online Orders intake (accept -> POS bill + stock). Enum value only; kept in
-- its own migration so the value is committed before anything uses it.
ALTER TYPE "IntegrationType" ADD VALUE IF NOT EXISTS 'NAFAA_MARKET';
