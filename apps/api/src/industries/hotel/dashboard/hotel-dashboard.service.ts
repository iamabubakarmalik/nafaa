import { Injectable } from '@nestjs/common';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class HotelDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const monthAgo = subDays(new Date(), 30);
    const yesterdayStart = startOfDay(subDays(new Date(), 1));
    const yesterdayEnd = endOfDay(subDays(new Date(), 1));

    const [
      totalRooms, occupied, available, cleaning, maintenance,
      arrivalsToday, departuresToday, inHouse, dirtyRooms,
      totalGuests, vipGuests, blacklisted,
      pendingHK, todayBookings, todayRevenue, monthlyRevenue,
      totalOutstanding,
    ] = await Promise.all([
      this.prisma.hotelRoom.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.hotelRoom.count({ where: { tenantId: user.tenantId, isActive: true, status: 'OCCUPIED' } }),
      this.prisma.hotelRoom.count({ where: { tenantId: user.tenantId, isActive: true, status: 'AVAILABLE' } }),
      this.prisma.hotelRoom.count({ where: { tenantId: user.tenantId, isActive: true, status: 'CLEANING' } }),
      this.prisma.hotelRoom.count({ where: { tenantId: user.tenantId, isActive: true, status: 'MAINTENANCE' } }),

      this.prisma.hotelBooking.count({
        where: {
          tenantId: user.tenantId,
          status: 'CONFIRMED',
          checkInDate: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.prisma.hotelBooking.count({
        where: {
          tenantId: user.tenantId,
          status: 'CHECKED_IN',
          checkOutDate: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.prisma.hotelBooking.count({
        where: { tenantId: user.tenantId, status: 'CHECKED_IN' },
      }),
      this.prisma.hotelRoom.count({
        where: { tenantId: user.tenantId, isActive: true, housekeepingStatus: 'DIRTY' },
      }),

      this.prisma.hotelGuest.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.hotelGuest.count({ where: { tenantId: user.tenantId, isActive: true, isVIP: true } }),
      this.prisma.hotelGuest.count({ where: { tenantId: user.tenantId, isBlacklisted: true } }),

      this.prisma.hotelHousekeepingTask.count({
        where: { tenantId: user.tenantId, status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] } },
      }),
      this.prisma.hotelBooking.count({
        where: { tenantId: user.tenantId, createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.hotelBooking.aggregate({
        where: {
          tenantId: user.tenantId,
          actualCheckOut: { gte: todayStart, lte: todayEnd },
        },
        _sum: { grandTotal: true },
      }),
      this.prisma.hotelBooking.aggregate({
        where: {
          tenantId: user.tenantId,
          actualCheckOut: { gte: monthAgo },
        },
        _sum: { grandTotal: true, paidAmount: true },
      }),
      this.prisma.hotelBooking.aggregate({
        where: {
          tenantId: user.tenantId,
          status: { in: ['CHECKED_IN', 'CONFIRMED'] },
        },
        _sum: { balanceAmount: true },
      }),
    ]);

    // Upcoming arrivals
    const upcomingArrivals = await this.prisma.hotelBooking.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'CONFIRMED',
        checkInDate: { gte: todayStart, lte: subDays(new Date(), -7) },
      },
      include: { bookedRooms: true },
      orderBy: { checkInDate: 'asc' },
      take: 10,
    });

    // Recent bookings
    const recentBookings = await this.prisma.hotelBooking.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { bookedRooms: true },
    });

    // Occupancy trend (last 7 days)
    const occupancyTrend: Array<{ date: string; occupied: number; total: number; pct: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const occupiedDay = await this.prisma.hotelBookedRoom.count({
        where: {
          booking: {
            tenantId: user.tenantId,
            status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
            checkInDate: { lte: dayEnd },
            checkOutDate: { gt: dayStart },
          },
        },
      });
      occupancyTrend.push({
        date: dayStart.toISOString().split('T')[0],
        occupied: occupiedDay,
        total: totalRooms,
        pct: totalRooms > 0 ? (occupiedDay / totalRooms) * 100 : 0,
      });
    }

    // By source (30 days)
    const bySource = await this.prisma.hotelBooking.groupBy({
      by: ['source'],
      where: {
        tenantId: user.tenantId,
        createdAt: { gte: monthAgo },
      },
      _count: { _all: true },
      _sum: { grandTotal: true },
    });

    return {
      rooms: {
        total: totalRooms,
        occupied,
        available,
        cleaning,
        maintenance,
        occupancyPct: totalRooms > 0 ? (occupied / totalRooms) * 100 : 0,
        dirty: dirtyRooms,
      },
      operations: {
        arrivalsToday,
        departuresToday,
        inHouse,
        todayBookings,
        pendingHK,
      },
      guests: {
        total: totalGuests,
        vip: vipGuests,
        blacklisted,
      },
      revenue: {
        today: todayRevenue._sum.grandTotal ?? 0,
        monthly: monthlyRevenue._sum.grandTotal ?? 0,
        collected: monthlyRevenue._sum.paidAmount ?? 0,
        outstanding: totalOutstanding._sum.balanceAmount ?? 0,
      },
      upcomingArrivals,
      recentBookings,
      occupancyTrend,
      bySource,
    };
  }
}
