-- Extend existing enums for marketplace before tables use them
ALTER TYPE "NotificationChannel" ADD VALUE IF NOT EXISTS 'PUSH';
ALTER TYPE "NotificationChannel" ADD VALUE IF NOT EXISTS 'IN_APP';
ALTER TYPE "NotificationChannel" ADD VALUE IF NOT EXISTS 'WHATSAPP';
ALTER TYPE "CustomerGender" ADD VALUE IF NOT EXISTS 'PREFER_NOT_TO_SAY';
