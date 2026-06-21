import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class MobileReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ════════════════════════════════════════════════════════
  // MASTER DASHBOARD
  // ════════════════════════════════════════════════════════

  async dashboard(user: AuthenticatedUser, shopId?: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      newImeis,
      usedPhones,
      repairs,
      emiPlans,
      saleStats,
    ] = await Promise.all([
      this.prisma.productImei.aggregate({
        where: { tenantId: user.tenantId, status: 'IN_STOCK' },
        _count: { _all: true },
        _sum: { costPrice: true, ptaTaxPaid: true },
      }),
      this.prisma.usedPhone.aggregate({
        where: { tenantId: user.tenantId, ...(shopId && { shopId }), status: 'IN_STOCK' },
        _count: { _all: true },
        _sum: { totalCost: true, resalePrice: true },
      }),
      this.prisma.repairTicket.aggregate({
        where: {
          tenantId: user.tenantId,
          ...(shopId && { shopId }),
          status: { notIn: ['DELIVERED', 'CANCELLED'] },
        },
        _count: { _all: true },
      }),
      this.prisma.emiPlan.aggregate({
        where: { tenantId: user.tenantId, status: 'ACTIVE' },
        _count: { _all: true },
        _sum: { remainingAmount: true },
      }),
      this.prisma.sale.aggregate({
        where: {
          tenantId: user.tenantId,
          ...(shopId && { shopId }),
          status: 'COMPLETED',
          soldAt: { gte: monthStart },
        },
        _sum: { total: true, costOfGoods: true },
        _count: { _all: true },
      }),
    ]);

    return {
      newPhonesInStock: newImeis._count._all,
      newPhonesStockValue: newImeis._sum.costPrice ?? 0,
      ptaTaxLocked: newImeis._sum.ptaTaxPaid ?? 0,
      usedPhonesInStock: usedPhones._count._all,
      usedPhonesStockValue: usedPhones._sum.totalCost ?? 0,
      usedPhonesPotentialRevenue: usedPhones._sum.resalePrice ?? 0,
      openRepairTickets: repairs._count._all,
      activeEmiPlans: emiPlans._count._all,
      emiOutstanding: emiPlans._sum.remainingAmount ?? 0,
      monthRevenue: saleStats._sum.total ?? 0,
      monthCogs: saleStats._sum.costOfGoods ?? 0,
      monthProfit: (saleStats._sum.total ?? 0) - (saleStats._sum.costOfGoods ?? 0),
      monthSalesCount: saleStats._count._all,
    };
  }

  // ════════════════════════════════════════════════════════
  // PTA STATUS BREAKDOWN
  // ════════════════════════════════════════════════════════

  async ptaBreakdown(user: AuthenticatedUser) {
    const result = await this.prisma.productImei.groupBy({
      by: ['ptaStatus'],
      where: { tenantId: user.tenantId, status: 'IN_STOCK' },
      _count: { _all: true },
      _sum: { ptaTaxPaid: true, costPrice: true },
    });

    return result.map((r) => ({
      ptaStatus: r.ptaStatus,
      count: r._count._all,
      taxPaid: r._sum.ptaTaxPaid ?? 0,
      stockValue: r._sum.costPrice ?? 0,
    }));
  }

  // ════════════════════════════════════════════════════════
  // TOP SELLING BRANDS (from sales)
  // ════════════════════════════════════════════════════════

  async topBrands(user: AuthenticatedUser, days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const sales = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId: user.tenantId,
          status: 'COMPLETED',
          soldAt: { gte: cutoff },
        },
        product: {
          brand: { isNot: null },
        },
      },
      include: {
        product: { include: { brand: true } },
      },
    });

    const grouped: Record<string, {
      brandId: string;
      brandName: string;
      unitsSold: number;
      revenue: number;
      profit: number;
    }> = {};

    sales.forEach((item) => {
      const brand = item.product.brand;
      if (!brand) return;
      if (!grouped[brand.id]) {
        grouped[brand.id] = {
          brandId: brand.id,
          brandName: brand.name,
          unitsSold: 0,
          revenue: 0,
          profit: 0,
        };
      }
      grouped[brand.id].unitsSold += Number(item.quantity);
      grouped[brand.id].revenue += Number(item.total);
      grouped[brand.id].profit += Number(item.total) - (Number(item.costPrice) * Number(item.quantity));
    });

    return Object.values(grouped)
      .map((g) => ({
        ...g,
        unitsSold: Number(g.unitsSold.toFixed(0)),
        revenue: Number(g.revenue.toFixed(2)),
        profit: Number(g.profit.toFixed(2)),
        margin: g.revenue > 0 ? Number(((g.profit / g.revenue) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  // ════════════════════════════════════════════════════════
  // REPAIR ANALYTICS
  // ════════════════════════════════════════════════════════

  async repairAnalytics(user: AuthenticatedUser, days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const [byStatus, deliveredAgg, topIssues] = await Promise.all([
      this.prisma.repairTicket.groupBy({
        by: ['status'],
        where: { tenantId: user.tenantId, receivedAt: { gte: cutoff } },
        _count: { _all: true },
      }),
      this.prisma.repairTicket.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'DELIVERED',
          deliveredAt: { gte: cutoff },
        },
        _sum: { totalCost: true, partsCost: true, laborCost: true, paidAmount: true },
        _count: { _all: true },
      }),
      this.prisma.repairTicket.groupBy({
        by: ['deviceBrand'],
        where: { tenantId: user.tenantId, receivedAt: { gte: cutoff } },
        _count: { _all: true },
        orderBy: { _count: { deviceBrand: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      delivered: deliveredAgg._count._all,
      totalRevenue: deliveredAgg._sum.totalCost ?? 0,
      partsCost: deliveredAgg._sum.partsCost ?? 0,
      laborRevenue: deliveredAgg._sum.laborCost ?? 0,
      collected: deliveredAgg._sum.paidAmount ?? 0,
      grossProfit: (deliveredAgg._sum.totalCost ?? 0) - (deliveredAgg._sum.partsCost ?? 0),
      topBrands: topIssues.map((b) => ({ brand: b.deviceBrand, count: b._count._all })),
    };
  }

  // ════════════════════════════════════════════════════════
  // EMI ANALYTICS
  // ════════════════════════════════════════════════════════

  async emiAnalytics(user: AuthenticatedUser) {
    const today = new Date();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [byStatus, financingTotals, overdueAgg, collectedAgg] = await Promise.all([
      this.prisma.emiPlan.groupBy({
        by: ['status'],
        where: { tenantId: user.tenantId },
        _count: { _all: true },
        _sum: { financedAmount: true, remainingAmount: true },
      }),
      this.prisma.emiPlan.aggregate({
        where: { tenantId: user.tenantId, status: 'ACTIVE' },
        _sum: { financedAmount: true, paidAmount: true, remainingAmount: true },
      }),
      this.prisma.emiInstallment.aggregate({
        where: {
          plan: { tenantId: user.tenantId, status: 'ACTIVE' },
          status: { in: ['PENDING', 'OVERDUE'] },
          dueDate: { lt: today },
        },
        _sum: { amount: true, paidAmount: true },
        _count: { _all: true },
      }),
      this.prisma.emiInstallment.aggregate({
        where: {
          plan: { tenantId: user.tenantId },
          status: 'PAID',
          paidDate: { gte: monthStart },
        },
        _sum: { paidAmount: true },
        _count: { _all: true },
      }),
    ]);

    return {
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count._all,
        financed: s._sum.financedAmount ?? 0,
        remaining: s._sum.remainingAmount ?? 0,
      })),
      activeFinanced: financingTotals._sum.financedAmount ?? 0,
      activePaid: financingTotals._sum.paidAmount ?? 0,
      activeRemaining: financingTotals._sum.remainingAmount ?? 0,
      overdueCount: overdueAgg._count._all,
      overdueAmount: (overdueAgg._sum.amount ?? 0) - (overdueAgg._sum.paidAmount ?? 0),
      collectedThisMonth: collectedAgg._sum.paidAmount ?? 0,
      collectedCountThisMonth: collectedAgg._count._all,
    };
  }

  // ════════════════════════════════════════════════════════
  // USED PHONE ANALYTICS
  // ════════════════════════════════════════════════════════

  async usedPhoneAnalytics(user: AuthenticatedUser, days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const [byCondition, soldAgg, inStockAgg] = await Promise.all([
      this.prisma.usedPhone.groupBy({
        by: ['condition'],
        where: { tenantId: user.tenantId, status: 'IN_STOCK' },
        _count: { _all: true },
        _sum: { totalCost: true, resalePrice: true },
      }),
      this.prisma.usedPhone.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'SOLD',
          soldAt: { gte: cutoff },
        },
        _sum: { totalCost: true, finalSoldPrice: true },
        _count: { _all: true },
      }),
      this.prisma.usedPhone.aggregate({
        where: { tenantId: user.tenantId, status: 'IN_STOCK' },
        _sum: { totalCost: true, resalePrice: true },
        _count: { _all: true },
      }),
    ]);

    return {
      byCondition: byCondition.map((c) => ({
        condition: c.condition,
        count: c._count._all,
        totalCost: c._sum.totalCost ?? 0,
        resalePrice: c._sum.resalePrice ?? 0,
      })),
      soldCount: soldAgg._count._all,
      soldRevenue: soldAgg._sum.finalSoldPrice ?? 0,
      soldCogs: soldAgg._sum.totalCost ?? 0,
      soldProfit: (soldAgg._sum.finalSoldPrice ?? 0) - (soldAgg._sum.totalCost ?? 0),
      inStockCount: inStockAgg._count._all,
      inStockCost: inStockAgg._sum.totalCost ?? 0,
      inStockResale: inStockAgg._sum.resalePrice ?? 0,
      inStockPotentialProfit: (inStockAgg._sum.resalePrice ?? 0) - (inStockAgg._sum.totalCost ?? 0),
    };
  }
}
