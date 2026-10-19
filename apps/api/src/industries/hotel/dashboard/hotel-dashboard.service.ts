/**
 * Hotel numbers: the dashboard overview, occupancy / ADR / RevPAR over a
 * date range and the night audit of one day. Room nights come from the
 * stays (a night counts when the guest checked in); money comes from the
 * hotel bills and the khata, so it matches the day book and sales reports.
 *
 * Stay dates are calendar days (UTC midnight of the shop's date); money
 * days are the shop's business days (Asia/Karachi).
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { endOfDayTz, startOfDayTz } from '../../../common/helpers/business-time.helper';
import { RoomsService } from '../rooms/rooms.service';
import { IN_HOUSE, OPEN_RESERVATION, addDays, dayOf, keyOf, nightsBetween, r2, today } from '../common/hotel-common';

const STAYED = ['CHECKED_IN', 'EXTENDED', 'CHECKED_OUT'] as const;
const BOOKED = ['TENTATIVE', 'CONFIRMED'] as const;

/** Business-day bounds of a calendar date key. */
const moneyDay = (key: string) => {
  const noon = new Date(`${key}T07:00:00.000Z`);
  return { gte: startOfDayTz(noon), lte: endOfDayTz(noon) };
};

@Injectable()
export class HotelDashboardService {
  constructor(private readonly prisma: PrismaService, private readonly rooms: RoomsService) {}

  /** Room nights and room revenue per night between two calendar dates (inclusive). */
  private async nights(tenantId: string, from: Date, to: Date) {
    const rows = await this.prisma.hotelBookedRoom.findMany({
      where: { booking: { tenantId, status: { in: [...STAYED, ...BOOKED] }, checkInDate: { lte: to }, checkOutDate: { gt: from } } },
      select: { totalNights: true, totalAmount: true, discount: true, booking: { select: { status: true, checkInDate: true, checkOutDate: true } } },
    });
    const days = nightsBetween(from, to) + 1;
    const out = Array.from({ length: days }, (_, i) => ({ date: keyOf(addDays(from, i)), sold: 0, booked: 0, revenue: 0 }));
    for (const r of rows) {
      const perNight = r.totalNights > 0 ? (r.totalAmount - (r.discount || 0)) / r.totalNights : 0;
      const stayed = (STAYED as readonly string[]).includes(r.booking.status);
      const start = Math.max(nightsBetween(from, r.booking.checkInDate), 0);
      const end = Math.min(nightsBetween(from, r.booking.checkOutDate), days);
      for (let i = start; i < end; i++) {
        if (stayed) { out[i].sold++; out[i].revenue += perNight; } else out[i].booked++;
      }
    }
    return out.map((d) => ({ ...d, revenue: r2(d.revenue) }));
  }

  /** Occupancy, ADR and RevPAR per day for a range (at most 93 days). */
  async occupancy(user: AuthenticatedUser, q: { from?: string; to?: string }) {
    const to = q.to ? dayOf(q.to, 'Date') : today();
    const from = q.from ? dayOf(q.from, 'Date') : addDays(to, -29);
    if (to < from) throw new BadRequestException('Aakhri date shuru ki date se pehle nahi ho sakti');
    if (nightsBetween(from, to) > 92) throw new BadRequestException('Zyada se zyada 3 mahine ka report');
    const [rooms, days, byType] = await Promise.all([
      this.prisma.hotelRoom.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.nights(user.tenantId, from, to),
      this.byType(user.tenantId, from, to),
    ]);
    const series = days.map((d) => ({
      ...d, rooms,
      occupancyPct: rooms ? r2((d.sold / rooms) * 100) : 0,
      adr: d.sold ? r2(d.revenue / d.sold) : 0,
      revpar: rooms ? r2(d.revenue / rooms) : 0,
    }));
    const sold = series.reduce((s, d) => s + d.sold, 0);
    const revenue = r2(series.reduce((s, d) => s + d.revenue, 0));
    const available = rooms * series.length;
    return {
      from: keyOf(from), to: keyOf(to), rooms, series, byType,
      totals: {
        roomNights: sold, available, revenue,
        occupancyPct: available ? r2((sold / available) * 100) : 0,
        adr: sold ? r2(revenue / sold) : 0,
        revpar: available ? r2(revenue / available) : 0,
      },
    };
  }

  private async byType(tenantId: string, from: Date, to: Date) {
    const end = addDays(to, 1);
    const [types, rows] = await Promise.all([
      this.prisma.hotelRoomType.findMany({ where: { tenantId }, select: { id: true, name: true, _count: { select: { rooms: { where: { isActive: true } } } } } }),
      this.prisma.hotelBookedRoom.findMany({
        where: { booking: { tenantId, status: { in: [...STAYED] }, checkInDate: { lt: end }, checkOutDate: { gt: from } } },
        select: { roomTypeId: true, totalNights: true, totalAmount: true, discount: true, booking: { select: { checkInDate: true, checkOutDate: true } } },
      }),
    ]);
    const acc = new Map<string, { nights: number; revenue: number }>();
    for (const r of rows) {
      const inRange = Math.max(nightsBetween(r.booking.checkInDate < from ? from : r.booking.checkInDate, r.booking.checkOutDate > end ? end : r.booking.checkOutDate), 0);
      const perNight = r.totalNights > 0 ? (r.totalAmount - (r.discount || 0)) / r.totalNights : 0;
      const a = acc.get(r.roomTypeId) ?? { nights: 0, revenue: 0 };
      a.nights += inRange;
      a.revenue += perNight * inRange;
      acc.set(r.roomTypeId, a);
    }
    const days = nightsBetween(from, end);
    return types.map((t) => {
      const a = acc.get(t.id) ?? { nights: 0, revenue: 0 };
      const available = t._count.rooms * days;
      return { roomTypeId: t.id, name: t.name, rooms: t._count.rooms, nights: a.nights, revenue: r2(a.revenue), adr: a.nights ? r2(a.revenue / a.nights) : 0, occupancyPct: available ? r2((a.nights / available) * 100) : 0 };
    }).filter((t) => t.rooms > 0 || t.nights > 0).sort((a, b) => b.revenue - a.revenue);
  }

  /** Hotel bills and booking money taken on one business day. */
  private async money(tenantId: string, key: string) {
    const createdAt = moneyDay(key);
    const [sales, ledger] = await Promise.all([
      this.prisma.sale.findMany({
        where: { tenantId, saleNumber: { startsWith: 'HTL-' }, status: { not: 'VOIDED' }, createdAt },
        select: { id: true, saleNumber: true, sourceRef: true, total: true, creditAmount: true, payments: { select: { method: true, amount: true } } },
      }),
      this.prisma.customerLedger.findMany({
        where: { tenantId, reference: { startsWith: 'BK-' }, type: { in: ['PAYMENT_RECEIVED', 'REFUND'] }, createdAt },
        select: { type: true, amount: true, paymentMethod: true },
      }),
    ]);
    const byMethod: Record<string, number> = {};
    const add = (m: string, v: number) => { byMethod[m] = r2((byMethod[m] ?? 0) + v); };
    for (const s of sales) for (const p of s.payments) add(p.method, p.amount);
    const advances = ledger.filter((l) => l.type === 'PAYMENT_RECEIVED');
    for (const l of advances) add(l.paymentMethod ?? 'CASH', -l.amount);
    const refunds = r2(ledger.filter((l) => l.type === 'REFUND').reduce((s, l) => s + l.amount, 0));
    return {
      bills: sales.length,
      billed: r2(sales.reduce((s, x) => s + x.total, 0)),
      takenAtBill: r2(sales.reduce((s, x) => s + x.payments.reduce((a, p) => a + p.amount, 0), 0)),
      onKhata: r2(sales.reduce((s, x) => s + x.creditAmount, 0)),
      advances: r2(advances.reduce((s, l) => s - l.amount, 0)),
      refunds,
      byMethod,
      sales: sales.map((s) => ({ id: s.id, saleNumber: s.saleNumber, bookingNumber: s.sourceRef, total: s.total, creditAmount: s.creditAmount })),
    };
  }

  /**
   * Night audit for a day: who is in, who should have arrived or left,
   * the rooms, the night's occupancy and the money of the day. The desk
   * clears the lists (check-in, no-show, check-out, extend) before closing
   * the cash register.
   */
  async nightAudit(user: AuthenticatedUser, q: { date?: string }) {
    const day = q.date ? dayOf(q.date, 'Date') : today();
    const key = keyOf(day);
    const isToday = key === keyOf(today());
    const select = {
      id: true, bookingNumber: true, guestName: true, guestPhone: true, status: true, checkInDate: true, checkOutDate: true, nights: true,
      grandTotal: true, paidAmount: true, balanceAmount: true, bookedBy: true, bookedRooms: { select: { roomNumber: true } },
    } as const;
    const [inHouse, arrivals, departures, night, money, board, openTasks] = await Promise.all([
      this.prisma.hotelBooking.findMany({ where: { tenantId: user.tenantId, status: { in: [...IN_HOUSE] } }, select, orderBy: { checkOutDate: 'asc' } }),
      this.prisma.hotelBooking.findMany({ where: { tenantId: user.tenantId, status: { in: [...OPEN_RESERVATION] }, checkInDate: { lte: day } }, select, orderBy: { checkInDate: 'asc' } }),
      this.prisma.hotelBooking.findMany({ where: { tenantId: user.tenantId, status: 'CHECKED_OUT', actualCheckOut: moneyDay(key) }, select }),
      this.nights(user.tenantId, day, day),
      this.money(user.tenantId, key),
      isToday ? this.rooms.summary(user) : null,
      this.prisma.hotelHousekeepingTask.count({ where: { tenantId: user.tenantId, status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] } } }),
    ]);
    const rooms = board?.total ?? await this.prisma.hotelRoom.count({ where: { tenantId: user.tenantId, isActive: true } });
    const n = night[0];
    const row = <T extends { bookedRooms: Array<{ roomNumber: string | null }>; grandTotal: number; paidAmount: number }>(b: T) => ({
      ...b, rooms: b.bookedRooms.map((r) => r.roomNumber).filter(Boolean).join(', '), due: r2(Math.max(b.grandTotal - b.paidAmount, 0)),
    });
    return {
      date: key, isToday, rooms, board,
      night: { sold: n.sold, revenue: n.revenue, occupancyPct: rooms ? r2((n.sold / rooms) * 100) : 0, adr: n.sold ? r2(n.revenue / n.sold) : 0, revpar: rooms ? r2(n.revenue / rooms) : 0 },
      inHouse: inHouse.map(row).map((b) => ({ ...b, overdue: b.checkOutDate < day, leavingToday: keyOf(b.checkOutDate) === key })),
      arrivalsPending: arrivals.map(row).map((b) => ({ ...b, late: b.checkInDate < day })),
      checkedOut: departures.map(row),
      inHouseDue: r2(inHouse.reduce((s, b) => s + Math.max(b.grandTotal - b.paidAmount, 0), 0)),
      openTasks,
      money,
    };
  }

  async overview(user: AuthenticatedUser) {
    const t = today();
    const tenantId = user.tenantId;
    const [summary, arrivalsToday, departuresToday, inHouse, guests, vip, blacklisted, pendingHK, todayBookings, trend, money, month, outstanding, upcomingArrivals, recentBookings, bySource] = await Promise.all([
      this.rooms.summary(user),
      this.prisma.hotelBooking.count({ where: { tenantId, status: { in: [...OPEN_RESERVATION] }, checkInDate: { lte: t } } }),
      this.prisma.hotelBooking.count({ where: { tenantId, status: { in: [...IN_HOUSE] }, checkOutDate: { lte: t } } }),
      this.prisma.hotelBooking.count({ where: { tenantId, status: { in: [...IN_HOUSE] } } }),
      this.prisma.hotelGuest.count({ where: { tenantId, isActive: true } }),
      this.prisma.hotelGuest.count({ where: { tenantId, isActive: true, isVIP: true } }),
      this.prisma.hotelGuest.count({ where: { tenantId, isActive: true, isBlacklisted: true } }),
      this.prisma.hotelHousekeepingTask.count({ where: { tenantId, status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] } } }),
      this.prisma.hotelBooking.count({ where: { tenantId, createdAt: moneyDay(keyOf(t)) } }),
      this.nights(tenantId, addDays(t, -6), t),
      this.money(tenantId, keyOf(t)),
      this.prisma.sale.aggregate({
        where: { tenantId, saleNumber: { startsWith: 'HTL-' }, status: { not: 'VOIDED' }, createdAt: { gte: startOfDayTz(addDays(new Date(), -29)) } },
        _sum: { total: true, paidAmount: true, creditAmount: true },
      }),
      this.prisma.hotelBooking.aggregate({ where: { tenantId, status: { in: [...IN_HOUSE, ...OPEN_RESERVATION] } }, _sum: { balanceAmount: true } }),
      this.prisma.hotelBooking.findMany({
        where: { tenantId, status: { in: [...OPEN_RESERVATION] }, checkInDate: { gte: t, lte: addDays(t, 7) } },
        include: { bookedRooms: true }, orderBy: { checkInDate: 'asc' }, take: 10,
      }),
      this.prisma.hotelBooking.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 10, include: { bookedRooms: true } }),
      this.prisma.hotelBooking.groupBy({
        by: ['source'], where: { tenantId, createdAt: { gte: startOfDayTz(addDays(new Date(), -29)) }, status: { notIn: ['CANCELLED'] } },
        _count: { _all: true }, _sum: { grandTotal: true },
      }),
    ]);
    return {
      rooms: { ...summary, occupancyPct: summary.occupancyPct },
      operations: { arrivalsToday, departuresToday, inHouse, todayBookings, pendingHK },
      guests: { total: guests, vip, blacklisted },
      revenue: {
        today: money.billed,
        monthly: r2(month._sum.total ?? 0),
        collected: r2((month._sum.total ?? 0) - (month._sum.creditAmount ?? 0)),
        outstanding: r2(outstanding._sum.balanceAmount ?? 0),
        advancesToday: money.advances,
      },
      upcomingArrivals,
      recentBookings,
      occupancyTrend: trend.map((d) => ({ date: d.date, occupied: d.sold, total: summary.total, pct: summary.total ? r2((d.sold / summary.total) * 100) : 0 })),
      bySource,
    };
  }
}
