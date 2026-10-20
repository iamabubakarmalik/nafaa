import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { endOfDayTz, startOfDayTz, startOfMonthTz } from '../../../common/helpers/business-time.helper';
import { BILLED } from '../custom-orders/order-billing';

@Injectable()
export class FurnitureDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    // Business day (Pakistan time), not the server's UTC day.
    const todayStart = startOfDayTz();
    const todayEnd = endOfDayTz();

    const [
      totalProducts, totalCarpenters, activeCarpenters,
      quotationOrders, activeCustomOrders, completedCustomOrders,
      pendingDeliveries, todayDeliveries,
    ] = await Promise.all([
      this.prisma.furnitureProductProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.furnitureCarpenter.count({ where: { tenantId: user.tenantId } }),
      this.prisma.furnitureCarpenter.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.furnitureCustomOrder.count({ where: { tenantId: user.tenantId, status: 'QUOTATION' } }),
      this.prisma.furnitureCustomOrder.count({
        where: { tenantId: user.tenantId, status: { in: ['DEPOSIT_PAID', 'IN_PRODUCTION', 'READY_FOR_DELIVERY'] } },
      }),
      this.prisma.furnitureCustomOrder.count({ where: { tenantId: user.tenantId, status: 'COMPLETED' } }),
      this.prisma.furnitureDelivery.count({ where: { tenantId: user.tenantId, status: { in: ['PENDING', 'SCHEDULED'] } } }),
      this.prisma.furnitureDelivery.count({
        where: {
          tenantId: user.tenantId,
          scheduledDate: { gte: todayStart, lte: todayEnd },
        },
      }),
    ]);

    // Financial totals
    const [customOrderRevenue, receivables] = await Promise.all([
      // Order bills of this business month, as the sales reports count them.
      this.prisma.sale.aggregate({
        where: { tenantId: user.tenantId, saleNumber: { startsWith: 'FUR-' }, status: { not: 'VOIDED' }, createdAt: { gte: startOfMonthTz() } },
        _sum: { total: true },
      }),
      this.prisma.furnitureCustomOrder.aggregate({
        where: { tenantId: user.tenantId, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        _sum: { balanceAmount: true, totalPaid: true },
      }),
    ]);

    // Overdue orders
    const overdueOrders = await this.prisma.furnitureCustomOrder.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['QUOTATION', 'DEPOSIT_PAID', 'IN_PRODUCTION', 'READY_FOR_DELIVERY'] },
        expectedDeliveryDate: { lt: todayStart },
      },
      orderBy: { expectedDeliveryDate: 'asc' },
      take: 10,
    });

    // Ready for delivery
    const readyForDelivery = await this.prisma.furnitureCustomOrder.findMany({
      where: { tenantId: user.tenantId, status: 'READY_FOR_DELIVERY' },
      orderBy: { productionEndDate: 'asc' },
      take: 10,
    });

    // Today's deliveries
    const todaySchedule = await this.prisma.furnitureDelivery.findMany({
      where: {
        tenantId: user.tenantId,
        scheduledDate: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // Top selling products
    const topProducts = await this.prisma.furnitureProductProfile.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { totalSold: 'desc' },
      take: 10,
    });

    // Top carpenters
    const topCarpenters = await this.prisma.furnitureCarpenter.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { totalRevenue: 'desc' },
      take: 5,
    });

    // Category breakdown
    const byCategory = await this.prisma.furnitureProductProfile.groupBy({
      by: ['categoryType'],
      where: { tenantId: user.tenantId },
      _count: { _all: true },
    });

    return {
      totals: {
        totalProducts, totalCarpenters, activeCarpenters,
        activeCustomOrders, quotationOrders, completedCustomOrders,
      },
      pending: {
        deliveries: pendingDeliveries,
        todayDeliveries,
        overdueOrders: overdueOrders.length,
        quotationsToApprove: quotationOrders,
      },
      financial: {
        monthlyCustomRevenue: Number(customOrderRevenue._sum.total ?? 0),
        totalReceivable: receivables._sum.balanceAmount ?? 0,
        totalCollected: receivables._sum.totalPaid ?? 0,
      },
      overdueOrders,
      readyForDelivery,
      todaySchedule,
      topProducts,
      topCarpenters,
      byCategory,
    };
  }

  async salesReport(user: AuthenticatedUser, from: string, to: string) {
    const start = startOfDayTz(new Date(from));
    const end = endOfDayTz(new Date(to));

    const orders = await this.prisma.furnitureCustomOrder.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: BILLED as any },
        actualDeliveryDate: { gte: start, lte: end },
      },
      orderBy: { actualDeliveryDate: 'desc' },
    });

    const totalRevenue = orders.reduce((s, o) => s + (o.finalPrice ?? o.quotedPrice), 0);
    const totalDeposits = orders.reduce((s, o) => s + o.depositAmount, 0);
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    return {
      period: { from, to },
      totalOrders: orders.length,
      totalRevenue,
      totalDeposits,
      avgOrderValue,
      orders,
    };
  }

  async carpenterPerformance(user: AuthenticatedUser, from: string, to: string) {
    const start = startOfDayTz(new Date(from));
    const end = endOfDayTz(new Date(to));
    const carpenters = await this.prisma.furnitureCarpenter.findMany({
      where: { tenantId: user.tenantId, isActive: true },
    });

    const performance = await Promise.all(
      carpenters.map(async (c) => {
        const orders = await this.prisma.furnitureCustomOrder.findMany({
          where: {
            tenantId: user.tenantId,
            carpenterId: c.id,
            actualDeliveryDate: { gte: start, lte: end },
            status: { in: BILLED as any },
          },
        });

        const revenue = orders.reduce((s, o) => s + (o.finalPrice ?? o.quotedPrice), 0);
        return {
          carpenter: c,
          totalOrders: orders.length,
          revenue,
          avgOrderValue: orders.length > 0 ? revenue / orders.length : 0,
        };
      }),
    );

    return performance.sort((a, b) => b.revenue - a.revenue);
  }
}
