/**
 * Dairy numbers for the dashboard. Money owed by delivery customers is read
 * from the shared khata (the dairy row is only a copy for customers not
 * linked yet), so this matches the Khata page and the reports.
 */
import { Injectable } from '@nestjs/common';
import { addDaysTz, dayEnd, dayStart, khataBalances, withLiveBalance } from '../dairy-common';
import { LIVE_SLIP } from '../farmer-supplies/farmer-supplies.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class DairyDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const todayStart = dayStart();
    const todayEnd = dayEnd();
    const monthAgo = addDaysTz(todayStart, -30);
    const live = LIVE_SLIP;

    const [
      totalCustomers, activeCustomers, totalFarmers, activeRoutes,
      todayScheduledDeliveries, todayDeliveredCount, todaySuppliesFromFarmers,
    ] = await Promise.all([
      this.prisma.dairyCustomer.count({ where: { tenantId: user.tenantId } }),
      this.prisma.dairyCustomer.count({ where: { tenantId: user.tenantId, status: 'ACTIVE' } }),
      this.prisma.dairyFarmer.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.dairyRoute.count({ where: { tenantId: user.tenantId, isActive: true, status: 'ACTIVE' } }),
      this.prisma.dairyDelivery.count({
        where: { tenantId: user.tenantId, deliveryDate: { gte: todayStart, lte: todayEnd }, status: { in: ['SCHEDULED', 'DELIVERED'] } },
      }),
      this.prisma.dairyDelivery.count({
        where: { tenantId: user.tenantId, deliveryDate: { gte: todayStart, lte: todayEnd }, status: 'DELIVERED' },
      }),
      this.prisma.dairyFarmerSupply.count({
        where: { tenantId: user.tenantId, supplyDate: { gte: todayStart, lte: todayEnd }, ...live },
      }),
    ]);

    // Today revenue + liters
    const todayDelivered = await this.prisma.dairyDelivery.aggregate({
      where: { tenantId: user.tenantId, deliveryDate: { gte: todayStart, lte: todayEnd }, status: 'DELIVERED' },
      _sum: { deliveredQty: true, totalAmount: true },
    });

    // Today supplied by farmers
    const todaySupplied = await this.prisma.dairyFarmerSupply.aggregate({
      where: { tenantId: user.tenantId, supplyDate: { gte: todayStart, lte: todayEnd }, ...live },
      _sum: { quantity: true, totalAmount: true },
    });

    // Monthly business
    const monthlyDeliveries = await this.prisma.dairyDelivery.aggregate({
      where: { tenantId: user.tenantId, status: 'DELIVERED', deliveryDate: { gte: monthAgo } },
      _count: { _all: true },
      _sum: { deliveredQty: true, totalAmount: true },
    });

    // Outstanding customer balances, from the khata where linked.
    const people = await this.prisma.dairyCustomer.findMany({ where: { tenantId: user.tenantId, status: { not: 'CLOSED' } } });
    const balances = await khataBalances(this.prisma, user.tenantId, people.map((c) => c.customerId));
    const owing = people.map((c) => withLiveBalance(c, balances)).filter((c) => c.currentBalance > 0.009).sort((a, b) => b.currentBalance - a.currentBalance);

    // Farmer payables
    const farmerPayable = await this.prisma.dairyFarmer.aggregate({
      where: { tenantId: user.tenantId, currentBalance: { gt: 0 } },
      _sum: { currentBalance: true },
    });

    // Top customers by consumption (30 days)
    const topCustomerDeliveries = await this.prisma.dairyDelivery.groupBy({
      by: ['dairyCustomerId'],
      where: { tenantId: user.tenantId, status: 'DELIVERED', deliveryDate: { gte: monthAgo } },
      _sum: { deliveredQty: true, totalAmount: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 5,
    });
    const topCustomerIds = topCustomerDeliveries.map((t) => t.dairyCustomerId);
    const topCustomers = await this.prisma.dairyCustomer.findMany({ where: { tenantId: user.tenantId, id: { in: topCustomerIds } } });
    const custMap = new Map(topCustomers.map((c) => [c.id, c]));
    const topCustomersData = topCustomerDeliveries.map((t) => ({
      customer: custMap.get(t.dairyCustomerId),
      liters: t._sum.deliveredQty ?? 0,
      revenue: t._sum.totalAmount ?? 0,
    }));

    // Top farmers by supply
    const topFarmerSupplies = await this.prisma.dairyFarmerSupply.groupBy({
      by: ['farmerId'],
      where: { tenantId: user.tenantId, supplyDate: { gte: monthAgo }, ...live },
      _sum: { quantity: true, totalAmount: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });
    const topFarmerIds = topFarmerSupplies.map((t) => t.farmerId);
    const topFarmersData_ = await this.prisma.dairyFarmer.findMany({ where: { tenantId: user.tenantId, id: { in: topFarmerIds } } });
    const farmerMap = new Map(topFarmersData_.map((f) => [f.id, f]));
    const topFarmersData = topFarmerSupplies.map((t) => ({
      farmer: farmerMap.get(t.farmerId),
      liters: t._sum.quantity ?? 0,
      amount: t._sum.totalAmount ?? 0,
    }));

    const topDebtors = owing.slice(0, 5);

    return {
      totals: { totalCustomers, activeCustomers, totalFarmers, activeRoutes },
      today: {
        scheduledDeliveries: todayScheduledDeliveries,
        deliveredCount: todayDeliveredCount,
        deliveredLiters: todayDelivered._sum.deliveredQty ?? 0,
        deliveredRevenue: todayDelivered._sum.totalAmount ?? 0,
        farmerSupplies: todaySuppliesFromFarmers,
        suppliedLiters: todaySupplied._sum.quantity ?? 0,
        suppliedAmount: todaySupplied._sum.totalAmount ?? 0,
      },
      monthly: {
        deliveries: monthlyDeliveries._count._all,
        liters: monthlyDeliveries._sum.deliveredQty ?? 0,
        revenue: monthlyDeliveries._sum.totalAmount ?? 0,
      },
      financials: {
        customerOutstanding: Math.round(owing.reduce((t, c) => t + c.currentBalance, 0) * 100) / 100,
        customerCount: owing.length,
        farmerPayable: farmerPayable._sum.currentBalance ?? 0,
      },
      topCustomers: topCustomersData,
      topFarmers: topFarmersData,
      topDebtors,
    };
  }
}
