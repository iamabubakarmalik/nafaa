-- Server error log for the admin panel. New table only; nothing existing changes.
CREATE TABLE "ServerError" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "method" TEXT,
    "route" TEXT NOT NULL,
    "status" INTEGER,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPath" TEXT,
    "lastUserId" TEXT,
    "lastTenantId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    CONSTRAINT "ServerError_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServerError_fingerprint_key" ON "ServerError"("fingerprint");
CREATE INDEX "ServerError_lastSeenAt_idx" ON "ServerError"("lastSeenAt");
CREATE INDEX "ServerError_resolvedAt_lastSeenAt_idx" ON "ServerError"("resolvedAt", "lastSeenAt");
