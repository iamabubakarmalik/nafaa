/**
 * Keeps serial units in step with their bills.
 *
 * A cancelled (voided) bill puts the goods back in stock, but the shared
 * void does not touch the serial register, so the unit stayed SOLD and the
 * POS showed one piece fewer than the shelf. Units sold on a voided bill
 * are put back on the shelf here before any serial list is read.
 */
import { Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient;

export async function releaseVoidedSerials(db: Db, tenantId: string) {
  const voided = await db.electronicsSerialTracking.findMany({
    where: { tenantId, status: 'SOLD', saleId: { not: null } },
    select: { id: true, saleId: true },
  });
  if (!voided.length) return 0;
  const dead = new Set((await db.sale.findMany({
    where: { tenantId, status: 'VOIDED', id: { in: [...new Set(voided.map((v) => v.saleId!))] } },
    select: { id: true },
  })).map((s) => s.id));
  const ids = voided.filter((v) => dead.has(v.saleId!)).map((v) => v.id);
  if (!ids.length) return 0;
  const res = await db.electronicsSerialTracking.updateMany({
    where: { id: { in: ids }, status: 'SOLD' },
    data: {
      status: 'IN_STOCK', saleId: null, saleItemId: null, soldAt: null, soldPrice: null,
      soldToCustomerId: null, invoiceNumber: null,
    },
  });
  return res.count;
}

/** Customer warranty of a sold unit: its own dates, else the product's months from the day of sale. */
export function warrantyWindow(
  s: { status: string; soldAt: Date | null; warrantyStartDate: Date | null; warrantyEndDate: Date | null },
  warrantyMonths?: number | null,
) {
  if (s.warrantyEndDate) return { start: s.warrantyStartDate, end: s.warrantyEndDate };
  if (s.status === 'SOLD' && s.soldAt && warrantyMonths) {
    const end = new Date(s.soldAt);
    end.setMonth(end.getMonth() + warrantyMonths);
    return { start: s.soldAt, end };
  }
  return { start: s.warrantyStartDate, end: null as Date | null };
}
