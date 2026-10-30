/**
 * Batches the counter can sell from, for the batch picker at the POS.
 *
 * Only active batches with stock in the selling branch are returned, in the
 * order a sale takes them when no batch is named (earliest expiry first,
 * no expiry last). Expired batches are included so the cashier sees them;
 * the sale itself uses them only when nothing valid is left.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope, resolveWriteShopId } from '../../../common/shop-scope';
import { apiMessage } from '../../../common/i18n/api-message';

/** Upper bound on product ids in one request. */
const MAX_PRODUCTS = 200;

@Injectable()
export class SaleBatchesService {
  constructor(private readonly prisma: PrismaService) {}

  private where(user: AuthenticatedUser, shopId: string) {
    return { tenantId: user.tenantId, shopId, isActive: true, quantity: { gt: 0 } };
  }

  /** Ids of the products that have at least one batch with stock in the branch. */
  async batchedProducts(user: AuthenticatedUser, scope: ShopScope, shopId?: string): Promise<string[]> {
    const branch = await resolveWriteShopId(this.prisma, user.tenantId, scope, shopId);
    const rows = await this.prisma.productBatch.findMany({
      where: this.where(user, branch),
      distinct: ['productId'],
      select: { productId: true },
    });
    return rows.map((r) => r.productId);
  }

  /** Batches with stock of the given products in the branch, in selling order. */
  async forProducts(user: AuthenticatedUser, scope: ShopScope, productIds: string, shopId?: string) {
    const ids = [...new Set(String(productIds ?? '').split(',').map((s) => s.trim()).filter(Boolean))];
    if (!ids.length) return [];
    if (ids.length > MAX_PRODUCTS) throw new BadRequestException(apiMessage('Ek dafa me {{max}} products tak', { max: MAX_PRODUCTS }));
    const branch = await resolveWriteShopId(this.prisma, user.tenantId, scope, shopId);
    return this.prisma.productBatch.findMany({
      where: { ...this.where(user, branch), productId: { in: ids } },
      orderBy: [{ expiryDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
      select: { id: true, productId: true, variantId: true, batchNumber: true, expiryDate: true, quantity: true },
    });
  }
}
