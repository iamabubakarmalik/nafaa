-- Online orders: courier ka code, COD settlement aur RTO (parcel wapas).
-- Sab naye khane khali ho sakte hain — purane orders par koi asar nahi.
ALTER TABLE "channel_orders"
  ADD COLUMN "courierCode" TEXT,
  ADD COLUMN "codSettledAt" TIMESTAMP(3),
  ADD COLUMN "codSettlementRef" TEXT,
  ADD COLUMN "returnedAt" TIMESTAMP(3),
  ADD COLUMN "returnReason" TEXT;

CREATE INDEX "channel_orders_tenantId_courierCode_idx" ON "channel_orders"("tenantId", "courierCode");
