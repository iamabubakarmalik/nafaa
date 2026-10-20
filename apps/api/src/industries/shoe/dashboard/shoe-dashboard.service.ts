/**
 * Shoe dashboard numbers, read from the core stock (variants and branch
 * rows) of the branch being viewed: pairs in stock, sizes out or low (the
 * ones that sell first), size requests waiting, top brands and the
 * best-selling sizes.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopScope } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { DAY_MS, SOLD, r2, variantParts } from '../common/shoe-common';

@Injectable()
export class ShoeDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser, scope: ShopScope) {
    const tenantId = user.tenantId;
    const since = new Date(Date.now() - 30 * DAY_MS);
    const [totalBrands, totalProducts, variants, stockSum, pendingTryOns, sold] = await Promise.all([
      this.prisma.brand.count({ where: { tenantId, isActive: true } }),
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
      this.prisma.productVariant.findMany({
        where: { isActive: true, product: { tenantId, isActive: true } },
        select: { id: true, name: true, size: true, color: true, lowStockAlert: true, productId: true, product: { select: { name: true } } },
        take: 20000,
      }),
      this.prisma.shopStock.aggregate({ where: { tenantId, ...scope.where, product: { isActive: true } }, _sum: { stock: true } }),
      this.prisma.shoeTryOnRequest.count({ where: { tenantId, ...(scope.shopId && { AND: [scope.whereLoose] }), status: { in: ['PENDING', 'SCHEDULED'] } } }),
      this.prisma.saleItem.findMany({
        where: { sale: { tenantId, status: { in: [...SOLD] }, createdAt: { gte: since }, ...scope.where } },
        select: { quantity: true, returnedQty: true, total: true, product: { select: { brandId: true } }, variantLink: { select: { variantId: true } } },
      }),
    ]);

    const ids = variants.map((v) => v.id);
    const stocks = ids.length
      ? await this.prisma.shopStock.groupBy({ by: ['variantId'], where: { tenantId, variantId: { in: ids }, ...scope.where }, _sum: { stock: true } })
      : [];
    const stockOf = new Map(stocks.map((s) => [s.variantId, Number(s._sum.stock ?? 0)]));
    const soldOf = new Map<string, number>();
    const brandSales = new Map<string, number>();
    for (const it of sold) {
      const net = Number(it.quantity) - Number(it.returnedQty || 0);
      if (it.variantLink?.variantId) soldOf.set(it.variantLink.variantId, (soldOf.get(it.variantLink.variantId) ?? 0) + net);
      const b = it.product?.brandId;
      const share = Number(it.quantity) > 0 ? net / Number(it.quantity) : 0;
      if (b) brandSales.set(b, (brandSales.get(b) ?? 0) + Number(it.total) * share);
    }

    const rows = variants.map((v) => {
      const parts = variantParts(v);
      return {
        id: v.id, productId: v.productId, name: v.product.name, variant: v.name, size: parts.size, color: parts.color,
        stock: r2(stockOf.get(v.id) ?? 0), lowStockAlert: Number(v.lowStockAlert ?? 0), sold30: r2(soldOf.get(v.id) ?? 0),
      };
    });
    // Sizes that sell come first; a size never stocked or sold is not a gap.
    const bySelling = (a: typeof rows[number], b: typeof rows[number]) => b.sold30 - a.sold30;
    const outOfStock = rows.filter((v) => v.stock <= 0 && (v.sold30 > 0 || v.lowStockAlert > 0)).sort(bySelling);
    const lowStock = rows.filter((v) => v.stock > 0 && v.stock <= v.lowStockAlert).sort(bySelling);

    const brandIds = [...brandSales.keys()];
    const brands = brandIds.length
      ? await this.prisma.brand.findMany({ where: { tenantId, id: { in: brandIds } }, select: { id: true, name: true, logoUrl: true } })
      : [];
    const topBrands = brands
      .map((b) => ({ ...b, totalRevenue: r2(brandSales.get(b.id) ?? 0) }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    return {
      totals: {
        totalBrands,
        totalProducts,
        totalSizeVariants: variants.length,
        totalStockUnits: r2(Number(stockSum._sum.stock ?? 0)),
        pendingTryOns,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
      },
      topBrands,
      lowStockVariants: lowStock.slice(0, 20),
      outOfStockVariants: outOfStock.slice(0, 20),
    };
  }

  /** Pairs sold per size in the last 90 days (returns taken off), all articles together. */
  async sizePopularity(user: AuthenticatedUser, scope: ShopScope) {
    const since = new Date(Date.now() - 90 * DAY_MS);
    const sold = await this.prisma.saleItemVariant.findMany({
      where: { saleItem: { sale: { tenantId: user.tenantId, status: { in: [...SOLD] }, createdAt: { gte: since }, ...scope.where } } },
      select: { variant: { select: { name: true, size: true, color: true } }, saleItem: { select: { quantity: true, returnedQty: true } } },
    });
    const grouped = new Map<string, number>();
    for (const s of sold) {
      const size = variantParts(s.variant).size;
      if (!size) continue;
      grouped.set(size, (grouped.get(size) ?? 0) + Number(s.saleItem.quantity) - Number(s.saleItem.returnedQty || 0));
    }
    return [...grouped.entries()]
      .map(([size, n]) => ({ size, sold: r2(n) }))
      .filter((x) => x.sold > 0)
      .sort((a, b) => b.sold - a.sold);
  }
}
