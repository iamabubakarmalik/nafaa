/**
 * Saved reorder suggestions (the older Smart Reorder list). The numbers come
 * from the shared low-stock service, so they are per branch, follow the
 * shop's business days and only read this tenant's purchases.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { LowStockService } from '../../../modules/inventory/low-stock/low-stock.service';

@Injectable()
export class ReorderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lowStock: LowStockService,
  ) {}

  /** Replaces the pending suggestions of the branches in scope with fresh ones. */
  async generateSuggestions(user: AuthenticatedUser, scope: ShopScope) {
    const rows = (await this.lowStock.rows(user, scope, this.lowStock.settings()))
      .filter((r) => r.suggestQty > 0 && !r.made && !r.ignored);
    const shopIds = scope.shopId
      ? [scope.shopId]
      : (await this.prisma.shop.findMany({ where: { tenantId: user.tenantId }, select: { id: true } })).map((s) => s.id);

    await this.prisma.$transaction([
      this.prisma.reorderSuggestion.deleteMany({
        where: { tenantId: user.tenantId, status: 'PENDING', OR: [{ shopId: { in: shopIds } }, { shopId: null }] },
      }),
      this.prisma.reorderSuggestion.createMany({
        data: rows.map((r) => ({
          tenantId: user.tenantId,
          shopId: r.shopId,
          productId: r.productId,
          currentStock: r.stock,
          reorderPoint: r.alert,
          suggestedQuantity: r.suggestQty,
          avgDailySales: r.perDay,
          daysOfStockLeft: r.daysLeft ?? (r.stock <= 0 ? 0 : 999),
          lastPurchasePrice: r.lastCost,
          preferredSupplierId: r.supplier?.id ?? null,
          status: 'PENDING',
        })),
      }),
    ]);
    return { generated: rows.length };
  }

  async list(user: AuthenticatedUser, scope: ShopScope, status = 'PENDING') {
    return this.prisma.reorderSuggestion.findMany({
      where: {
        tenantId: user.tenantId,
        ...scope.whereLoose,
        ...(status !== 'all' && { status }),
      },
      orderBy: [{ daysOfStockLeft: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async listWithProducts(user: AuthenticatedUser, scope: ShopScope, status = 'PENDING') {
    const suggestions = await this.list(user, scope, status);
    const productIds = suggestions.map((s) => s.productId);
    const supplierIds = suggestions.map((s) => s.preferredSupplierId).filter(Boolean) as string[];

    const [products, suppliers] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId: user.tenantId, id: { in: productIds } },
        include: { images: { where: { isPrimary: true }, take: 1 }, category: true },
      }),
      supplierIds.length
        ? this.prisma.supplier.findMany({ where: { tenantId: user.tenantId, id: { in: supplierIds } } })
        : Promise.resolve([]),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

    return suggestions.map((s) => ({
      ...s,
      product: productMap.get(s.productId),
      supplier: s.preferredSupplierId ? supplierMap.get(s.preferredSupplierId) : null,
    }));
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string) {
    return this.prisma.reorderSuggestion.updateMany({
      where: { id, tenantId: user.tenantId },
      data: { status },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    return this.prisma.reorderSuggestion.deleteMany({
      where: { id, tenantId: user.tenantId },
    });
  }
}
