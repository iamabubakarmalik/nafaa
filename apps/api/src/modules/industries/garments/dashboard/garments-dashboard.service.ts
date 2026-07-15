import { Injectable } from '@nestjs/common';
import { startOfDay, subDays } from 'date-fns';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class GarmentsDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser, shopId?: string) {
    const todayStart = startOfDay(new Date());
    const weekAgo = subDays(new Date(), 7);
    const monthAgo = subDays(new Date(), 30);

    const [
      totalCollections, activeCollections, totalMeasurements,
      pendingTailoring, pendingAlterations, activeReservations, activeLayaway,
      newArrivals, bestSellers, onSaleCount,
    ] = await Promise.all([
      this.prisma.garmentCollection.count({ where: { tenantId: user.tenantId } }),
      this.prisma.garmentCollection.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.garmentMeasurementProfile.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.garmentTailoringOrder.count({ where: { tenantId: user.tenantId, orderStatus: { in: ['CONFIRMED', 'FABRIC_PENDING', 'CUTTING', 'STITCHING', 'EMBROIDERY', 'QUALITY_CHECK'] } } }),
      this.prisma.garmentAlterationTicket.count({ where: { tenantId: user.tenantId, status: { in: ['RECEIVED', 'MEASUREMENT_TAKEN', 'IN_PROGRESS'] } } }),
      this.prisma.garmentReservation.count({ where: { tenantId: user.tenantId, status: 'ACTIVE' } }),
      this.prisma.garmentLayawayPlan.count({ where: { tenantId: user.tenantId, status: 'ACTIVE' } }),
      this.prisma.garmentProductProfile.count({ where: { tenantId: user.tenantId, isNewArrival: true } }),
      this.prisma.garmentProductProfile.count({ where: { tenantId: user.tenantId, isBestSeller: true } }),
      this.prisma.garmentProductProfile.count({ where: { tenantId: user.tenantId, isOnSale: true } }),
    ]);

    // Tailoring revenue
    const tailoringRevenue = await this.prisma.garmentTailoringOrder.aggregate({
      where: { tenantId: user.tenantId, orderStatus: 'DELIVERED', createdAt: { gte: monthAgo } },
      _sum: { total: true, paidAmount: true },
      _count: { _all: true },
    });

    // Upcoming due dates
    const upcomingDeliveries = await this.prisma.garmentTailoringOrder.findMany({
      where: {
        tenantId: user.tenantId,
        orderStatus: { notIn: ['DELIVERED', 'CANCELLED'] },
        promisedDate: { gte: new Date(), lte: subDays(new Date(), -7) },
      },
      orderBy: { promisedDate: 'asc' },
      take: 10,
    });

    const upcomingAlterations = await this.prisma.garmentAlterationTicket.findMany({
      where: {
        tenantId: user.tenantId,
        status: { notIn: ['DELIVERED', 'CANCELLED'] },
        promisedDate: { gte: new Date(), lte: subDays(new Date(), -7) },
      },
      orderBy: { promisedDate: 'asc' },
      take: 10,
    });

    // By season
    const bySeason = await this.prisma.garmentProductProfile.groupBy({
      by: ['season'],
      where: { tenantId: user.tenantId },
      _count: { _all: true },
    });

    // By gender
    const byGender = await this.prisma.garmentProductProfile.groupBy({
      by: ['gender'],
      where: { tenantId: user.tenantId },
      _count: { _all: true },
    });

    return {
      totals: {
        totalCollections,
        activeCollections,
        totalMeasurements,
        newArrivals,
        bestSellers,
        onSaleCount,
      },
      pending: {
        tailoring: pendingTailoring,
        alterations: pendingAlterations,
        reservations: activeReservations,
        layaway: activeLayaway,
      },
      tailoringRevenue: {
        total: tailoringRevenue._sum.total ?? 0,
        paid: tailoringRevenue._sum.paidAmount ?? 0,
        count: tailoringRevenue._count._all,
      },
      upcomingDeliveries,
      upcomingAlterations,
      bySeason,
      byGender,
    };
  }
}
