import type { Prisma } from '@prisma/client';

/**
 * Next free invoice number, "INV-YYYYMM-XXXXXX". Random suffix with a clash
 * check: the number is UNIQUE and two checkouts can run at the same moment.
 */
export async function nextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `INV-${ym}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const clash = await tx.invoice.findUnique({ where: { invoiceNumber: candidate }, select: { id: true } });
    if (!clash) return candidate;
  }
  return `INV-${ym}-${Date.now().toString(36).toUpperCase()}`;
}
