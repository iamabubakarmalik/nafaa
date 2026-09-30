-- PRA / SRB / KPRA: har bill ka fiscal number. Sirf nayi table — purana data nahi chhoota.
CREATE TABLE "tax_authority_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "authority" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'SALE',
    "saleId" TEXT NOT NULL,
    "returnId" TEXT NOT NULL DEFAULT '',
    "usin" TEXT NOT NULL,
    "posId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fiscalNumber" TEXT,
    "qrText" TEXT,
    "saleValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "request" JSONB,
    "response" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_authority_invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tax_authority_invoices_authority_kind_saleId_returnId_key" ON "tax_authority_invoices"("authority", "kind", "saleId", "returnId");
CREATE INDEX "tax_authority_invoices_tenantId_status_idx" ON "tax_authority_invoices"("tenantId", "status");
CREATE INDEX "tax_authority_invoices_status_nextAttemptAt_idx" ON "tax_authority_invoices"("status", "nextAttemptAt");
CREATE INDEX "tax_authority_invoices_tenantId_createdAt_idx" ON "tax_authority_invoices"("tenantId", "createdAt");
CREATE INDEX "tax_authority_invoices_saleId_idx" ON "tax_authority_invoices"("saleId");
