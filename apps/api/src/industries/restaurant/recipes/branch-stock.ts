/** Stock of many products in one branch, or across all branches. */

import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Product id → stock. With a branch, the branch row (no row means none
 * there); without one, the product's total across branches.
 */
export async function stockOf(prisma: PrismaService, tenantId: string, shopId: string | null, productIds: string[]): Promise<Map<string, number>> {
  const ids = [...new Set(productIds)];
  if (!ids.length) return new Map();
  if (shopId) {
    const rows = await prisma.shopStock.groupBy({
      by: ['productId'],
      where: { tenantId, shopId, productId: { in: ids } },
      _sum: { stock: true },
    });
    const map = new Map(ids.map((id) => [id, 0]));
    for (const r of rows) map.set(r.productId, Number(r._sum.stock ?? 0));
    return map;
  }
  const rows = await prisma.product.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, stock: true } });
  return new Map(rows.map((r) => [r.id, Number(r.stock ?? 0)]));
}
