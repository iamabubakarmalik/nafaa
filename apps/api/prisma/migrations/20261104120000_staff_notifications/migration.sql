-- Staff notifications: each person's own notification choices and a log of
-- pushes sent through Expo with the delivery result.
--
-- Additive only: two new tables. No existing table or row changes. People
-- without a row use the defaults for their role. Safe to run more than once.

CREATE TABLE IF NOT EXISTS "UserNotificationPref" (
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "events" JSONB NOT NULL DEFAULT '{}',
    "sound" TEXT NOT NULL DEFAULT 'chime',
    "vibrate" BOOLEAN NOT NULL DEFAULT true,
    "quietHours" BOOLEAN NOT NULL DEFAULT false,
    "quietStart" TEXT NOT NULL DEFAULT '22:00',
    "quietEnd" TEXT NOT NULL DEFAULT '08:00',
    "saleMinAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saleDigestMinutes" INTEGER NOT NULL DEFAULT 15,
    "discountPercent" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationPref_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX IF NOT EXISTS "UserNotificationPref_tenantId_idx" ON "UserNotificationPref"("tenantId");

DO $$ BEGIN
    ALTER TABLE "UserNotificationPref" ADD CONSTRAINT "UserNotificationPref_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PushTicket" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT,
    "tenantId" TEXT,
    "userId" TEXT,
    "token" TEXT NOT NULL,
    "platform" TEXT,
    "event" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedAt" TIMESTAMP(3),

    CONSTRAINT "PushTicket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PushTicket_status_createdAt_idx" ON "PushTicket"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "PushTicket_createdAt_idx" ON "PushTicket"("createdAt");
