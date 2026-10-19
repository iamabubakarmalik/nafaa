/**
 * Per-branch "86": a dish switched off at one branch, until a set time or
 * until switched back on. A dish is on at a branch only when the shop-wide
 * switch is on and the branch has no running "off" row. A row whose time
 * has passed no longer counts, so the dish comes back by itself.
 */

import { PrismaService } from '../../../prisma/prisma.service';

/**
 * The branch whose 86 list applies: the chosen branch, or the only active
 * branch of a single-branch business. Null when several branches are seen
 * together; then only the shop-wide switch counts.
 */
export async function menuBranch(prisma: PrismaService, tenantId: string, shopId: string | null): Promise<string | null> {
  if (shopId) return shopId;
  const shops = await prisma.shop.findMany({ where: { tenantId, isActive: true }, select: { id: true }, take: 2 });
  return shops.length === 1 ? shops[0].id : null;
}

/** Menu item id → time it comes back (null = until switched on) for dishes off at this branch now. */
export async function offAtBranch(prisma: PrismaService, tenantId: string, shopId: string | null, menuItemIds?: string[]): Promise<Map<string, Date | null>> {
  if (!shopId) return new Map();
  const now = new Date();
  const rows = await prisma.restaurantMenuAvailability.findMany({
    where: {
      tenantId, shopId, isAvailable: false,
      OR: [{ until: null }, { until: { gt: now } }],
      ...(menuItemIds && { menuItemId: { in: menuItemIds } }),
    },
    select: { menuItemId: true, until: true },
  });
  return new Map(rows.map((r) => [r.menuItemId, r.until]));
}
