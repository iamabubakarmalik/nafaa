-- Courier accounts (PostEx, Leopards, …): ek click connect ke liye settings,
-- aakhri test / sync ka waqt aur error. Sab khane khali ho sakte hain.
ALTER TABLE "courier_configs"
  ADD COLUMN "settings" JSONB,
  ADD COLUMN "lastTestedAt" TIMESTAMP(3),
  ADD COLUMN "lastSyncAt" TIMESTAMP(3),
  ADD COLUMN "lastError" TEXT;

-- Online order par booking: kis courier par, kab book hua, label kahan hai
ALTER TABLE "channel_orders"
  ADD COLUMN "courierBookedAt" TIMESTAMP(3),
  ADD COLUMN "courierLabelUrl" TEXT,
  ADD COLUMN "courierStatus" TEXT,
  ADD COLUMN "courierStatusAt" TIMESTAMP(3);

CREATE INDEX "channel_orders_tenantId_courierBookedAt_idx" ON "channel_orders"("tenantId", "courierBookedAt");
