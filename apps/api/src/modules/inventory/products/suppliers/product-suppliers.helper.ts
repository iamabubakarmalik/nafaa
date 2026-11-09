/**
 * Keeps the product–supplier link current when goods arrive: the latest cost
 * per base unit and the date. The first supplier of a product becomes its
 * preferred one; a preference the owner chose is never changed here.
 */

import type { Prisma } from '@prisma/client';

export async function touchSupplierLink(
  tx: Prisma.TransactionClient,
  a: { tenantId: string; productId: string; supplierId: string; baseCost: number; unitId: string | null },
) {
  const cost = Math.round((Number(a.baseCost) || 0) * 10000) / 10000;
  const now = new Date();
  const existing = await tx.productSupplier.findUnique({
    where: { productId_supplierId: { productId: a.productId, supplierId: a.supplierId } },
    select: { id: true, unitId: true },
  });
  if (existing) {
    await tx.productSupplier.update({
      where: { id: existing.id },
      data: { lastPurchasePrice: cost > 0 ? cost : undefined, lastPurchasedAt: now, ...(!existing.unitId && a.unitId && { unitId: a.unitId }) },
    });
    return;
  }
  const preferred = await tx.productSupplier.findFirst({ where: { productId: a.productId, isPreferred: true }, select: { id: true } });
  await tx.productSupplier.create({
    data: {
      tenantId: a.tenantId, productId: a.productId, supplierId: a.supplierId,
      lastPurchasePrice: cost > 0 ? cost : null, lastPurchasedAt: now, unitId: a.unitId, isPreferred: !preferred,
    },
  });
}

/** At most one preferred link: the first one asked for, else the first link. */
export function pickPreferred<T extends { isPreferred?: boolean }>(links: T[]): T[] {
  if (!links.length) return links;
  const first = links.findIndex((l) => l.isPreferred);
  const at = first >= 0 ? first : 0;
  return links.map((l, i) => ({ ...l, isPreferred: i === at }));
}
