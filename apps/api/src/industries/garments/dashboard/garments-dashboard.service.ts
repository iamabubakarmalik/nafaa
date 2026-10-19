/**
 * Garments numbers for the dashboard: open stitching and alteration work
 * (today, late, ready, money still to collect), holds and instalment plans,
 * stitching income of the business month and the catalogue mix. Days follow
 * the shop's own clock; work is counted for the branch being viewed.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { DAY_MS, garmentClock, r2 } from '../common/garments-common';

const OPEN = { notIn: ['DELIVERED', 'CANCELLED'] as Array<'DELIVERED' | 'CANCELLED'> };

@Injectable()
export class GarmentsDashboardService {
  constructor(private readonly prisma: PrismaService, private readonly tz: TenantTimezoneService) {}

  async overview(user: AuthenticatedUser, shopId?: string) {
    const clock = await garmentClock(this.tz, user.tenantId);
    const today = clock.today();
    const week = new Date(today.lt.getTime() + 7 * DAY_MS);
    const monthStart = clock.dayStart(`${clock.keyOf(new Date()).slice(0, 7)}-01`);
    const t = user.tenantId;
    const branch = shopId ? { OR: [{ shopId }, { shopId: null }] } : {};
    const exact = shopId ? { shopId } : {};

    const [
      totalCollections, activeCollections, totalMeasurements, newArrivals, bestSellers, onSaleCount,
      openTailoring, openAlterations, activeReservations, activeLayaway, overdueLayaway, holdsEndingToday,
      tailoringRevenue, upcomingDeliveries, upcomingAlterations, bySeason, byGender,
    ] = await Promise.all([
      this.prisma.garmentCollection.count({ where: { tenantId: t } }),
      this.prisma.garmentCollection.count({ where: { tenantId: t, isActive: true } }),
      this.prisma.garmentMeasurementProfile.count({ where: { tenantId: t, isActive: true } }),
      this.prisma.garmentProductProfile.count({ where: { tenantId: t, isNewArrival: true } }),
      this.prisma.garmentProductProfile.count({ where: { tenantId: t, isBestSeller: true } }),
      this.prisma.garmentProductProfile.count({ where: { tenantId: t, isOnSale: true } }),
      this.prisma.garmentTailoringOrder.findMany({ where: { tenantId: t, orderStatus: OPEN, ...branch }, select: { orderStatus: true, promisedDate: true, total: true, paidAmount: true }, take: 5000 }),
      this.prisma.garmentAlterationTicket.findMany({ where: { tenantId: t, status: OPEN, ...branch }, select: { status: true, promisedDate: true, charges: true, paidAmount: true }, take: 5000 }),
      this.prisma.garmentReservation.count({ where: { tenantId: t, status: 'ACTIVE', expiresAt: { gt: new Date() }, ...exact } }),
      this.prisma.garmentLayawayPlan.count({ where: { tenantId: t, status: 'ACTIVE', ...branch } }),
      this.prisma.garmentLayawayPlan.count({ where: { tenantId: t, status: 'ACTIVE', nextDueDate: { lt: today.gte }, ...branch } }),
      this.prisma.garmentReservation.count({ where: { tenantId: t, status: 'ACTIVE', expiresAt: { gt: new Date(), lt: today.lt }, ...exact } }),
      this.prisma.garmentTailoringOrder.aggregate({
        where: { tenantId: t, orderStatus: 'DELIVERED', deliveredAt: { gte: monthStart }, ...branch },
        _sum: { total: true, paidAmount: true }, _count: { _all: true },
      }),
      this.prisma.garmentTailoringOrder.findMany({
        where: { tenantId: t, orderStatus: OPEN, promisedDate: { not: null, lt: week }, ...branch },
        orderBy: { promisedDate: 'asc' }, take: 10,
        select: { id: true, orderNumber: true, customerName: true, priority: true, promisedDate: true, total: true, paidAmount: true, orderStatus: true },
      }),
      this.prisma.garmentAlterationTicket.findMany({
        where: { tenantId: t, status: OPEN, promisedDate: { not: null, lt: week }, ...branch },
        orderBy: { promisedDate: 'asc' }, take: 10,
        select: { id: true, ticketNumber: true, customerName: true, garmentDescription: true, promisedDate: true, charges: true, status: true },
      }),
      this.prisma.garmentProductProfile.groupBy({ by: ['season'], where: { tenantId: t }, _count: { _all: true } }),
      this.prisma.garmentProductProfile.groupBy({ by: ['gender'], where: { tenantId: t }, _count: { _all: true } }),
    ]);

    const isToday = (d: Date | null) => !!d && d >= today.gte && d < today.lt;
    const isLate = (d: Date | null, status: string) => !!d && d < today.gte && status !== 'READY';
    return {
      totals: { totalCollections, activeCollections, totalMeasurements, newArrivals, bestSellers, onSaleCount },
      pending: { tailoring: openTailoring.length, alterations: openAlterations.length, reservations: activeReservations, layaway: activeLayaway },
      today: {
        tailoringDue: openTailoring.filter((o) => isToday(o.promisedDate)).length,
        tailoringLate: openTailoring.filter((o) => isLate(o.promisedDate, o.orderStatus)).length,
        tailoringReady: openTailoring.filter((o) => o.orderStatus === 'READY').length,
        tailoringTrial: openTailoring.filter((o) => o.orderStatus === 'QUALITY_CHECK').length,
        alterationsDue: openAlterations.filter((a) => isToday(a.promisedDate)).length,
        alterationsLate: openAlterations.filter((a) => isLate(a.promisedDate, a.status)).length,
        alterationsReady: openAlterations.filter((a) => a.status === 'READY').length,
        toCollect: r2(openTailoring.reduce((s, o) => s + Math.max(o.total - o.paidAmount, 0), 0) + openAlterations.reduce((s, a) => s + Math.max(a.charges - a.paidAmount, 0), 0)),
        advanceHeld: r2(openTailoring.reduce((s, o) => s + o.paidAmount, 0) + openAlterations.reduce((s, a) => s + a.paidAmount, 0)),
        holdsEndingToday,
        layawayOverdue: overdueLayaway,
      },
      // Delivered this business month (the key keeps its older name).
      tailoringRevenue: {
        total: r2(tailoringRevenue._sum.total ?? 0),
        paid: r2(tailoringRevenue._sum.paidAmount ?? 0),
        count: tailoringRevenue._count._all,
      },
      upcomingDeliveries,
      upcomingAlterations,
      bySeason,
      byGender,
    };
  }
}
