import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';

@Injectable()
export class ElectronicsDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser, scope: ShopScope) {
    const monthAgo = subDays(new Date(), 30);

    const [
      totalBrands, totalProducts, totalSerials,
      inStockSerials, soldSerials, defectiveSerials,
      activeClaims, resolvedClaims, activeBundles,
    ] = await Promise.all([
      this.prisma.brand.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.electronicsProductProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.electronicsSerialTracking.count({ where: { tenantId: user.tenantId } }),
      this.prisma.electronicsSerialTracking.count({ where: { tenantId: user.tenantId, status: 'IN_STOCK' } }),
      this.prisma.electronicsSerialTracking.count({ where: { tenantId: user.tenantId, status: 'SOLD' } }),
      this.prisma.electronicsSerialTracking.count({ where: { tenantId: user.tenantId, status: 'DEFECTIVE' } }),
      this.prisma.electronicsWarrantyClaim.count({ where: { tenantId: user.tenantId, status: { in: ['ACTIVE', 'IN_REPAIR'] } } }),
      this.prisma.electronicsWarrantyClaim.count({ where: { tenantId: user.tenantId, status: 'CLAIMED' } }),
      this.prisma.electronicsBundle.count({ where: { tenantId: user.tenantId, isActive: true } }),
    ]);

    // Monthly revenue from sold serials
    const monthlyRevenue = await this.prisma.electronicsSerialTracking.aggregate({
      where: {
        tenantId: user.tenantId,
        status: 'SOLD',
        soldAt: { gte: monthAgo },
      },
      _sum: { soldPrice: true },
      _count: { _all: true },
    });

    // Expiring warranties (next 30 days)
    const expiringWarranties = await this.prisma.electronicsSerialTracking.count({
      where: {
        tenantId: user.tenantId,
        warrantyStatus: 'ACTIVE',
        warrantyEndDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // Top selling products
    const topProducts = await this.prisma.electronicsProductProfile.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { totalSold: 'desc' },
      take: 10,
    });

    // Recent claims
    const recentClaims = await this.prisma.electronicsWarrantyClaim.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { claimDate: 'desc' },
      take: 5,
    });

    // Top brands
    // Top brands ab asli bikri se — pehle ElectronicsBrand par ek
    // totalRevenue field thi jo kabhi update hi nahi hoti thi.
    const brandSales = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: { tenantId: user.tenantId, ...scope.where, status: 'COMPLETED' },
        productId: { not: null },
      },
      _sum: { total: true, quantity: true },
    });
    const soldProductIds = brandSales.map((b) => b.productId!).filter(Boolean);
    const soldProducts = soldProductIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: soldProductIds }, tenantId: user.tenantId },
          select: { id: true, brandId: true, brand: { select: { id: true, name: true, logoUrl: true } } },
        })
      : [];
    const productBrand = new Map(soldProducts.map((p) => [p.id, p.brand]));
    const brandTotals = new Map<string, { id: string; name: string; logoUrl: string | null; totalRevenue: number; unitsSold: number }>();
    for (const row of brandSales) {
      const br = productBrand.get(row.productId!);
      if (!br) continue;
      const cur = brandTotals.get(br.id) ?? { id: br.id, name: br.name, logoUrl: br.logoUrl, totalRevenue: 0, unitsSold: 0 };
      cur.totalRevenue += Number(row._sum.total) || 0;
      cur.unitsSold += Number(row._sum.quantity) || 0;
      brandTotals.set(br.id, cur);
    }
    const topBrands = [...brandTotals.values()]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    // Category breakdown
    const byCategory = await this.prisma.electronicsProductProfile.groupBy({
      by: ['categoryType'],
      where: { tenantId: user.tenantId },
      _count: { _all: true },
    });

    return {
      totals: { totalBrands, totalProducts, totalSerials, activeBundles },
      inventory: { inStock: inStockSerials, sold: soldSerials, defective: defectiveSerials },
      warranty: { activeClaims, resolvedClaims, expiringWarranties },
      monthlyBusiness: {
        salesCount: monthlyRevenue._count._all,
        revenue: monthlyRevenue._sum.soldPrice ?? 0,
      },
      topProducts, recentClaims, topBrands, byCategory,
    };
  }

  async salesReport(
    user: AuthenticatedUser,
    scope: ShopScope,
    from: string,
    to: string,
  ) {
    const sales = await this.prisma.electronicsSerialTracking.findMany({
      where: {
        tenantId: user.tenantId,
        // Each serialised unit is tagged with the branch that sold it.
        ...scope.where,
        status: 'SOLD',
        soldAt: { gte: new Date(from), lte: new Date(to) },
      },
      orderBy: { soldAt: 'desc' },
    });

    const totalRevenue = sales.reduce((s, x) => s + (x.soldPrice ?? 0), 0);
    const totalCost = sales.reduce((s, x) => s + (x.purchasePrice ?? 0), 0);
    const profit = totalRevenue - totalCost;

    return {
      period: { from, to },
      totalSales: sales.length,
      totalRevenue,
      totalCost,
      profit,
      profitMargin: totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0,
      sales,
    };
  }
}
