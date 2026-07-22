-- Extend DeliveryType enum with new values (must be in own migration)
ALTER TYPE "DeliveryType" ADD VALUE IF NOT EXISTS 'DELIVERY';
ALTER TYPE "DeliveryType" ADD VALUE IF NOT EXISTS 'PICKUP';
ALTER TYPE "DeliveryType" ADD VALUE IF NOT EXISTS 'DINE_IN';
