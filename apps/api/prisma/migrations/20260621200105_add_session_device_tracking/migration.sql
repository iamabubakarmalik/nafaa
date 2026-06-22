-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "deviceFingerprint" TEXT,
ADD COLUMN     "deviceName" TEXT,
ADD COLUMN     "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "location" TEXT;

-- CreateIndex
CREATE INDEX "Session_deviceFingerprint_idx" ON "Session"("deviceFingerprint");

-- CreateIndex
CREATE INDEX "Session_userId_deviceFingerprint_idx" ON "Session"("userId", "deviceFingerprint");
