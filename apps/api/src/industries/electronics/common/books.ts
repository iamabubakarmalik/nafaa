/**
 * Money and stock helpers for electronics records that are not POS bills:
 * the next record number, cash paid out of the open drawer, and a unit that
 * leaves stock without a sale (a warranty replacement) booked as damage so
 * it shows in write-offs.
 */
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { applyStockDelta } from '../../../common/shop-scope';
import { dateKeyTz } from '../../../common/helpers/business-time.helper';

type Db = Prisma.TransactionClient;

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** Next number like WC-2026-0007: one more than the highest of this year, never a count. */
export function nextNumber(existing: string[], prefix: string) {
  const year = dateKeyTz(new Date()).slice(0, 4);
  const head = `${prefix}-${year}-`;
  const max = existing
    .filter((n) => n.startsWith(head))
    .map((n) => Number(n.slice(head.length)))
    .filter((n) => Number.isInteger(n))
    .reduce((m, n) => Math.max(m, n), 0);
  return `${head}${String(max + 1).padStart(4, '0')}`;
}

/** Year prefix of a number, for a `startsWith` lookup. */
export function numberHead(prefix: string) {
  return `${prefix}-${dateKeyTz(new Date()).slice(0, 4)}-`;
}

/**
 * Cash the shop pays out of the open drawer of a branch. Without an open
 * register there is no drawer to correct, and the caller is told so.
 */
export async function payFromDrawer(
  db: Db,
  input: { tenantId: string; userId: string; shopId: string; amount: number; reason: string; note?: string; reference: string },
): Promise<boolean> {
  const amount = r2(input.amount);
  if (!(amount > 0)) return false;
  const register = await db.cashRegister.findFirst({
    where: { tenantId: input.tenantId, shopId: input.shopId, status: 'OPEN' },
    orderBy: { openedAt: 'desc' },
    select: { id: true },
  });
  if (!register) return false;
  const claimed = await db.cashRegister.updateMany({
    where: { id: register.id, status: 'OPEN' },
    data: { expectedBalance: { decrement: amount }, totalCashOut: { increment: amount } },
  });
  if (!claimed.count) return false;
  await db.cashTransaction.create({
    data: {
      tenantId: input.tenantId, cashRegisterId: register.id, createdById: input.userId,
      type: 'CASH_OUT', amount, reason: input.reason, note: input.note, reference: input.reference,
    },
  });
  return true;
}

/**
 * One unit leaves the branch without a sale (given as a warranty
 * replacement). Booked as damage at its cost so profit and write-offs
 * carry the loss.
 */
export async function writeOffUnit(
  db: Db,
  input: { tenantId: string; userId: string; shopId: string; productId: string; label: string; reference: string; note: string; unitCost?: number | null },
) {
  const product = await db.product.findFirst({ where: { id: input.productId, tenantId: input.tenantId }, select: { costPrice: true } });
  if (!product) throw new BadRequestException('Product nahi mila');
  const unitCost = r2(input.unitCost != null && input.unitCost > 0 ? input.unitCost : Number(product.costPrice) || 0);
  await applyStockDelta({
    tx: db, tenantId: input.tenantId, shopId: input.shopId, productId: input.productId, delta: -1,
    movementType: 'DAMAGE', reference: input.reference, note: input.note, preventNegative: true,
    label: input.label, userId: input.userId, unitCost,
  });
  await db.stockAdjustment.create({
    data: {
      tenantId: input.tenantId, shopId: input.shopId, productId: input.productId, createdById: input.userId,
      type: 'DAMAGE', quantity: 1, reason: 'Warranty replacement', note: input.note,
      unitCost, value: unitCost, groupRef: input.reference,
    },
  });
  return unitCost;
}
