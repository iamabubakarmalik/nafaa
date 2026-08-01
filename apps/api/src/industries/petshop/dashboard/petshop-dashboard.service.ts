import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class PetshopDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
    const in90 = new Date(); in90.setDate(in90.getDate() + 90);

    const [
      totalProducts, totalGroomers, activeGroomers,
      animalsAvailable, animalsReserved,
      todayAppointments, pendingAppointments, readyForPickup,
      expiringMedicines, expiredMedicines,
    ] = await Promise.all([
      this.prisma.petProductProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.petGroomer.count({ where: { tenantId: user.tenantId } }),
      this.prisma.petGroomer.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.petLiveAnimal.count({ where: { tenantId: user.tenantId, status: 'AVAILABLE' } }),
      this.prisma.petLiveAnimal.count({ where: { tenantId: user.tenantId, status: 'RESERVED' } }),
      this.prisma.petGroomingAppointment.count({ where: { tenantId: user.tenantId, scheduledDate: { gte: todayStart, lte: todayEnd } } }),
      this.prisma.petGroomingAppointment.count({ where: { tenantId: user.tenantId, status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] } } }),
      this.prisma.petGroomingAppointment.count({ where: { tenantId: user.tenantId, status: 'READY_FOR_PICKUP' } }),
      this.prisma.petProductProfile.count({ where: { tenantId: user.tenantId, expiryDate: { gte: now, lte: in90 } } }),
      this.prisma.petProductProfile.count({ where: { tenantId: user.tenantId, expiryDate: { lt: now } } }),
    ]);

    // Revenue streams
    const [groomingMonth, groomingToday, animalsMonth, animalsToday, inventoryValue] = await Promise.all([
      this.prisma.petGroomingAppointment.aggregate({
        where: { tenantId: user.tenantId, completedAt: { gte: monthStart } },
        _sum: { totalFee: true, paidAmount: true }, _count: { _all: true },
      }),
      this.prisma.petGroomingAppointment.aggregate({
        where: { tenantId: user.tenantId, completedAt: { gte: todayStart, lte: todayEnd } },
        _sum: { paidAmount: true }, _count: { _all: true },
      }),
      this.prisma.petLiveAnimal.aggregate({
        where: { tenantId: user.tenantId, status: 'SOLD', soldAt: { gte: monthStart } },
        _sum: { soldPrice: true, costPrice: true }, _count: { _all: true },
      }),
      this.prisma.petLiveAnimal.aggregate({
        where: { tenantId: user.tenantId, status: 'SOLD', soldAt: { gte: todayStart, lte: todayEnd } },
        _sum: { soldPrice: true }, _count: { _all: true },
      }),
      this.prisma.petLiveAnimal.aggregate({
        where: { tenantId: user.tenantId, status: 'AVAILABLE' },
        _sum: { askingPrice: true },
      }),
    ]);

    const todaySchedule = await this.prisma.petGroomingAppointment.findMany({
      where: { tenantId: user.tenantId, scheduledDate: { gte: todayStart, lte: todayEnd } },
      orderBy: { scheduledDate: 'asc' },
      take: 25,
    });

    const pickupList = await this.prisma.petGroomingAppointment.findMany({
      where: { tenantId: user.tenantId, status: 'READY_FOR_PICKUP' },
      orderBy: { completedAt: 'asc' },
      take: 15,
    });

    const healthAlerts = await this.prisma.petLiveAnimal.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['AVAILABLE', 'RESERVED'] },
        OR: [{ isVaccinated: false }, { isDewormed: false }],
      },
      orderBy: { acquiredDate: 'asc' },
      take: 15,
    });

    const expiringList = await this.prisma.petProductProfile.findMany({
      where: { tenantId: user.tenantId, expiryDate: { gte: now, lte: in90 } },
      orderBy: { expiryDate: 'asc' },
      take: 15,
    });

    const featuredAnimals = await this.prisma.petLiveAnimal.findMany({
      where: { tenantId: user.tenantId, status: 'AVAILABLE', isFeatured: true },
      take: 10,
    });

    const topProducts = await this.prisma.petProductProfile.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { totalSold: 'desc' },
      take: 10,
    });

    const topGroomers = await this.prisma.petGroomer.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { totalRevenue: 'desc' },
      take: 5,
    });

    const [bySpecies, byCategory] = await Promise.all([
      this.prisma.petLiveAnimal.groupBy({
        by: ['species'],
        where: { tenantId: user.tenantId, status: 'AVAILABLE' },
        _count: { _all: true },
      }),
      this.prisma.petProductProfile.groupBy({
        by: ['categoryType'],
        where: { tenantId: user.tenantId },
        _count: { _all: true },
      }),
    ]);

    const groomRev = groomingMonth._sum.paidAmount ?? 0;
    const animalRev = animalsMonth._sum.soldPrice ?? 0;

    return {
      totals: {
        totalProducts, totalGroomers, activeGroomers,
        animalsAvailable, animalsReserved,
        animalInventoryValue: inventoryValue._sum.askingPrice ?? 0,
      },
      pending: {
        todayAppointments, pendingAppointments, readyForPickup,
        expiringMedicines, expiredMedicines,
        healthAlerts: healthAlerts.length,
      },
      today: {
        groomingCount: groomingToday._count._all,
        groomingRevenue: groomingToday._sum.paidAmount ?? 0,
        animalSalesCount: animalsToday._count._all,
        animalRevenue: animalsToday._sum.soldPrice ?? 0,
        totalRevenue: (groomingToday._sum.paidAmount ?? 0) + (animalsToday._sum.soldPrice ?? 0),
      },
      monthly: {
        grooming: { count: groomingMonth._count._all, billed: groomingMonth._sum.totalFee ?? 0, collected: groomRev },
        liveAnimals: {
          count: animalsMonth._count._all,
          revenue: animalRev,
          cost: animalsMonth._sum.costPrice ?? 0,
          profit: animalRev - (animalsMonth._sum.costPrice ?? 0),
        },
        totalRevenue: groomRev + animalRev,
      },
      todaySchedule,
      pickupList,
      healthAlerts,
      expiringList,
      featuredAnimals,
      topProducts,
      topGroomers,
      bySpecies: bySpecies.map((s) => ({ species: s.species, count: s._count._all })),
      byCategory,
    };
  }

  async salesReport(user: AuthenticatedUser, from: string, to: string) {
    const start = new Date(from);
    const end = new Date(to);

    const [grooming, animals] = await Promise.all([
      this.prisma.petGroomingAppointment.findMany({
        where: { tenantId: user.tenantId, completedAt: { gte: start, lte: end } },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.petLiveAnimal.findMany({
        where: { tenantId: user.tenantId, status: 'SOLD', soldAt: { gte: start, lte: end } },
        orderBy: { soldAt: 'desc' },
      }),
    ]);

    const groomBilled = grooming.reduce((s, a) => s + a.totalFee, 0);
    const groomCollected = grooming.reduce((s, a) => s + a.paidAmount, 0);
    const animalRevenue = animals.reduce((s, a) => s + (a.soldPrice ?? 0), 0);
    const animalCost = animals.reduce((s, a) => s + (a.costPrice ?? 0), 0);

    return {
      period: { from, to },
      grooming: {
        count: grooming.length,
        billed: groomBilled,
        collected: groomCollected,
        outstanding: groomBilled - groomCollected,
        avgTicket: grooming.length ? groomBilled / grooming.length : 0,
      },
      liveAnimals: {
        count: animals.length,
        revenue: animalRevenue,
        cost: animalCost,
        profit: animalRevenue - animalCost,
        avgSalePrice: animals.length ? animalRevenue / animals.length : 0,
      },
      grandTotal: groomCollected + animalRevenue,
      appointments: grooming,
      animalSales: animals,
    };
  }

  async groomerPerformance(user: AuthenticatedUser, from: string, to: string) {
    const start = new Date(from);
    const end = new Date(to);
    const groomers = await this.prisma.petGroomer.findMany({ where: { tenantId: user.tenantId, isActive: true } });

    const performance = await Promise.all(
      groomers.map(async (g) => {
        const appts = await this.prisma.petGroomingAppointment.findMany({
          where: { groomerId: g.id, scheduledDate: { gte: start, lte: end } },
        });
        const completed = appts.filter((a) => ['COMPLETED', 'READY_FOR_PICKUP'].includes(a.status));
        const revenue = completed.reduce((s, a) => s + a.totalFee, 0);
        const rated = completed.filter((a) => a.customerRating != null);
        const avgRating = rated.length ? rated.reduce((s, a) => s + (a.customerRating ?? 0), 0) / rated.length : 0;

        return {
          groomer: g,
          totalAppointments: appts.length,
          completed: completed.length,
          noShow: appts.filter((a) => a.status === 'NO_SHOW').length,
          cancelled: appts.filter((a) => a.status === 'CANCELLED').length,
          revenue,
          commission: (revenue * g.commissionPct) / 100,
          avgRating: Number(avgRating.toFixed(2)),
          completionRate: appts.length ? Number(((completed.length / appts.length) * 100).toFixed(1)) : 0,
        };
      }),
    );

    return performance.sort((a, b) => b.revenue - a.revenue);
  }

  async speciesAnalytics(user: AuthenticatedUser) {
    const [animals, grooming, products] = await Promise.all([
      this.prisma.petLiveAnimal.groupBy({
        by: ['species'],
        where: { tenantId: user.tenantId },
        _count: { _all: true },
        _sum: { soldPrice: true },
      }),
      this.prisma.petGroomingAppointment.groupBy({
        by: ['petSpecies'],
        where: { tenantId: user.tenantId },
        _count: { _all: true },
        _sum: { totalFee: true },
      }),
      this.prisma.petProductProfile.groupBy({
        by: ['species'],
        where: { tenantId: user.tenantId },
        _count: { _all: true },
        _sum: { totalRevenue: true },
      }),
    ]);

    return {
      liveAnimals: animals.map((a) => ({ species: a.species, count: a._count._all, revenue: a._sum.soldPrice ?? 0 })),
      grooming: grooming.map((g) => ({ species: g.petSpecies, count: g._count._all, revenue: g._sum.totalFee ?? 0 })),
      products: products.map((p) => ({ species: p.species, count: p._count._all, revenue: p._sum.totalRevenue ?? 0 })),
    };
  }
}
