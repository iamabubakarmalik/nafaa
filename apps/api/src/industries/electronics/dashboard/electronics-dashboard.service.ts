import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class ElectronicsDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const monthAgo = subDays(new Date(), 30);

    const [
      totalBrands, totalProducts, totalSerials,
      inStockSerials, soldSerials, defectiveSerials,
      activeClaims, resolvedClaims, activeBundles,
    ] = await Promise.all([
      this.prisma.electronicsBrand.count({ where: { tenantId: user.tenantId, isActive: true } }),
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
    const topBrands = await this.prisma.electronicsBrand.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { totalRevenue: 'desc' },
      take: 5,
    });

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

  async salesReport(user: AuthenticatedUser, from: string, to: string) {
    const sales = await this.prisma.electronicsSerialTracking.findMany({
      where: {
        tenantId: user.tenantId,
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
