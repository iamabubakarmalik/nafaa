/**
 * Metal stock ledger shared by the jewelry services. The balance is the sum
 * of every entry (in minus out), so a back-dated entry cannot break it.
 */
import { JewelryMetalType, JewelryPurity, Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient;

export const METAL_IN_TYPES = ['PURCHASE', 'RECEIVE', 'RETURN', 'EXCHANGE_IN', 'OPENING'];

export const PURITY_FACTOR: Record<string, number> = {
  KARAT_24: 0.9999, KARAT_22: 0.916, KARAT_21: 0.875, KARAT_18: 0.75,
  KARAT_14: 0.583, KARAT_10: 0.417, KARAT_9: 0.375,
  STERLING_925: 0.925, SILVER_999: 0.999, SILVER_925: 0.925, SILVER_800: 0.8,
  PLATINUM_950: 0.95, PLATINUM_900: 0.9,
};

export function metalTypeForPurity(purity?: string | null): JewelryMetalType {
  if (!purity) return 'GOLD';
  if (purity.startsWith('SILVER') || purity.startsWith('STERLING')) return 'SILVER';
  if (purity.startsWith('PLATINUM')) return 'PLATINUM';
  return 'GOLD';
}

export async function metalBalance(db: Db, tenantId: string, metalType: JewelryMetalType, purity: JewelryPurity) {
  const rows = await db.jewelryMetalStock.groupBy({
    by: ['entryType'],
    where: { tenantId, metalType, purity },
    _sum: { grams: true },
  });
  return rows.reduce((b, r) => b + (METAL_IN_TYPES.includes(r.entryType) ? 1 : -1) * (r._sum.grams ?? 0), 0);
}

export interface MetalEntryInput {
  entryType: string;
  metalType: JewelryMetalType;
  purity: JewelryPurity;
  grams: number;
  entryDate?: Date;
  ratePerGram?: number | null;
  source?: string | null;
  reference?: string | null;
  karigarId?: string | null;
  saleId?: string | null;
  exchangeId?: string | null;
  notes?: string | null;
}

export async function postMetalEntry(db: Db, tenantId: string, userId: string, e: MetalEntryInput) {
  const grams = Math.abs(Number(e.grams) || 0);
  const before = await metalBalance(db, tenantId, e.metalType, e.purity);
  const balanceGrams = METAL_IN_TYPES.includes(e.entryType) ? before + grams : before - grams;
  const rate = e.ratePerGram ? Number(e.ratePerGram) : null;

  // Numbers come from a count; retry on the rare clash with a parallel entry.
  for (let attempt = 0; ; attempt++) {
    const count = await db.jewelryMetalStock.count({ where: { tenantId } });
    const entryNumber = 'MS-' + new Date().getFullYear() + '-' + String(count + 1 + attempt).padStart(6, '0');
    try {
      return await db.jewelryMetalStock.create({
        data: {
          tenantId,
          entryNumber,
          entryType: e.entryType,
          entryDate: e.entryDate ?? new Date(),
          metalType: e.metalType,
          purity: e.purity,
          grams,
          balanceGrams,
          ratePerGram: rate,
          totalValue: rate ? rate * grams : null,
          source: e.source ?? null,
          reference: e.reference ?? null,
          karigarId: e.karigarId ?? null,
          saleId: e.saleId ?? null,
          exchangeId: e.exchangeId ?? null,
          notes: e.notes ?? null,
          createdById: userId,
        },
      });
    } catch (err) {
      if (attempt < 3 && err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue;
      throw err;
    }
  }
}
