import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ShopScope } from './shop-scope.types';

/**
 * Pick the branch a *write* belongs to.
 *
 * Order of preference:
 *  1. An explicit shopId in the request body (transfer pickers, "receive into
 *     godown" flows) — validated against the tenant.
 *  2. The branch the user is currently viewing.
 *  3. The tenant's main shop — so a single-branch tenant, or an owner who left
 *     the switcher on "All Shops", still gets a sane destination instead of an
 *     error.
 *
 * Only throws when the tenant genuinely has no shop to write into.
 */
export async function resolveWriteShopId(
  prisma: any,
  tenantId: string,
  scope: ShopScope,
  explicitShopId?: string | null,
): Promise<string> {
  if (explicitShopId) {
    const shop = await prisma.shop.findFirst({
      where: { id: explicitShopId, tenantId },
      select: { id: true, isActive: true, name: true },
    });
    if (!shop) throw new NotFoundException('Shop not found');
    if (!shop.isActive) {
      throw new BadRequestException(`${shop.name} band hai — pehle activate karein`);
    }
    return shop.id;
  }

  if (scope.shopId) return scope.shopId;

  const main = await prisma.shop.findFirst({
    where: { tenantId, isActive: true },
    orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
    select: { id: true },
  });
  if (!main) {
    throw new BadRequestException(
      'Koi active shop nahi hai. Pehle Shops page se apni shop banayein.',
    );
  }
  return main.id;
}
