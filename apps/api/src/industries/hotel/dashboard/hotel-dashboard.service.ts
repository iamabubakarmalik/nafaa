/**
 * Hotel numbers: the dashboard overview, occupancy / ADR / RevPAR over a
 * date range and the night audit of one day. Room nights come from the
 * stays (a night counts when the guest checked in); money comes from the
 * hotel bills and the khata, so it matches the day book and sales reports.
 *
 * Stay dates are calendar days (UTC midnight of the shop's date); money
 * days are the shop's business days (its time zone and day-start hour, as
 * the day book uses).
 *
 * Every figure follows the branch being viewed: its bookings and bills,
 * and its rooms plus rooms tied to no branch.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { zonedToUtc } from '../../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ShopScope } from '../../../common/shop-scope';
import { RoomsService, roomScope } from '../rooms/rooms.service';
import { IN_HOUSE, OPEN_RESERVATION, addDays, dayOf, keyOf, nightsBetween, r2, today } from '../common/hotel-common';

const STAYED = ['CHECKED_IN', 'EXTENDED', 'CHECKED_OUT'] as const;
const BOOKED = ['TENTATIVE', 'CONFIRMED'] as const;

type Range = { gte: Date; lt: Date };

/** Bookings of the branch (and older bookings with no branch). */
const bookingScope = (shopId?: string | null): Prisma.HotelBookingWhereInput => (shopId ? { OR: [{ shopId }, { shopId: null }] } : {});

export interface CloseDayInput { date?: string; notes?: string }

@Injectable()
export class HotelDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rooms: RoomsService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /** Business-day bounds of a calendar date key, in the shop's zone and day-start hour. */
  private async moneyDay(tenantId: string) {
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    return (key: string): Range => {
      const [y, m, d] = key.split('-').map(Number);
      return { gte: zonedToUtc(y, m, d, dayStartHour, 0, 0, tz), lt: zonedToUtc(y, m, d + 1, dayStartHour, 0, 0, tz) };
    };
  }

  private roomCount(tenantId: string, shopId?: string | null) {
    return this.prisma.hotelRoom.count({ where: { tenantId, isActive: true, AND: [roomScope(shopId)] } });
  }

  /** Room nights and room revenue per night between two calendar dates (inclusive). */
  private async nights(tenantId: string, from: Date, to: Date, shopId?: string | null) {
    const rows = await this.prisma.hotelBookedRoom.findMany({
      where: { booking: { tenantId, status: { in: [...STAYED, ...BOOKED] }, checkInDate: { lte: to }, checkOutDate: { gt: from }, AND: [bookingScope(shopId)] } },
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
  async occupancy(user: AuthenticatedUser, q: { from?: string; to?: string }, scope?: ShopScope) {
    const shopId = scope?.shopId;
    const to = q.to ? dayOf(q.to, 'Date') : today();
    const from = q.from ? dayOf(q.from, 'Date') : addDays(to, -29);
    if (to < from) throw new BadRequestException('Aakhri date shuru ki date se pehle nahi ho sakti');
    if (nightsBetween(from, to) > 92) throw new BadRequestException('Zyada se zyada 3 mahine ka report');
    const [rooms, days, byType] = await Promise.all([
      this.roomCount(user.tenantId, shopId),
      this.nights(user.tenantId, from, to, shopId),
      this.byType(user.tenantId, from, to, shopId),
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

  private async byType(tenantId: string, from: Date, to: Date, shopId?: string | null) {
    const end = addDays(to, 1);
    const [types, rows] = await Promise.all([
      this.prisma.hotelRoomType.findMany({ where: { tenantId }, select: { id: true, name: true, _count: { select: { rooms: { where: { isActive: true, AND: [roomScope(shopId)] } } } } } }),
      this.prisma.hotelBookedRoom.findMany({
        where: { booking: { tenantId, status: { in: [...STAYED] }, checkInDate: { lt: end }, checkOutDate: { gt: from }, AND: [bookingScope(shopId)] } },
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
  private async money(tenantId: string, createdAt: Range, shopId?: string | null) {
    const branch = shopId ? { shopId } : {};
    const [sales, ledger] = await Promise.all([
      this.prisma.sale.findMany({
        where: { tenantId, ...branch, saleNumber: { startsWith: 'HTL-' }, status: { not: 'VOIDED' }, createdAt },
        select: { id: true, saleNumber: true, sourceRef: true, total: true, creditAmount: true, payments: { select: { method: true, amount: true } } },
      }),
      this.prisma.customerLedger.findMany({
        where: { tenantId, ...branch, reference: { startsWith: 'BK-' }, type: { in: ['PAYMENT_RECEIVED', 'REFUND'] }, createdAt },
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
  async nightAudit(user: AuthenticatedUser, q: { date?: string }, scope?: ShopScope) {
    const shopId = scope?.shopId;
    const tenantId = user.tenantId;
    const day = q.date ? dayOf(q.date, 'Date') : today();
    const key = keyOf(day);
    const isToday = key === keyOf(today());
    const moneyDay = await this.moneyDay(tenantId);
    const where = { tenantId, AND: [bookingScope(shopId)] };
    const select = {
      id: true, bookingNumber: true, guestName: true, guestPhone: true, status: true, checkInDate: true, checkOutDate: true, nights: true,
      grandTotal: true, paidAmount: true, balanceAmount: true, bookedBy: true, bookedRooms: { select: { roomNumber: true } },
    } as const;
    const [inHouse, arrivals, departures, night, money, board, openTasks, closed] = await Promise.all([
      this.prisma.hotelBooking.findMany({ where: { ...where, status: { in: [...IN_HOUSE] } }, select, orderBy: { checkOutDate: 'asc' } }),
      this.prisma.hotelBooking.findMany({ where: { ...where, status: { in: [...OPEN_RESERVATION] }, checkInDate: { lte: day } }, select, orderBy: { checkInDate: 'asc' } }),
      this.prisma.hotelBooking.findMany({ where: { ...where, status: 'CHECKED_OUT', actualCheckOut: moneyDay(key) }, select }),
      this.nights(tenantId, day, day, shopId),
      this.money(tenantId, moneyDay(key), shopId),
      isToday ? this.rooms.summary(user, scope) : null,
      this.prisma.hotelHousekeepingTask.count({ where: { tenantId, status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] } } }),
      this.auditShop(tenantId, shopId).then((id) => (id ? this.closedAudit(tenantId, id, day) : null)),
    ]);
    const rooms = board?.total ?? await this.roomCount(tenantId, shopId);
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
      shopId: shopId ?? null,
      closed: closed ? await this.withCloser(tenantId, closed) : null,
    };
  }

  /** Branch a day is closed for: the one being viewed, or the only branch in "All shops". */
  private async auditShop(tenantId: string, shopId?: string | null) {
    if (shopId) return shopId;
    const shops = await this.prisma.shop.findMany({ where: { tenantId, isActive: true }, select: { id: true }, take: 2 });
    return shops.length === 1 ? shops[0].id : null;
  }

  private closedAudit(tenantId: string, shopId: string, day: Date) {
    return this.prisma.hotelNightAudit.findFirst({ where: { tenantId, shopId, businessDate: day } });
  }

  private async withCloser<T extends { closedById: string | null }>(tenantId: string, row: T) {
    const by = row.closedById ? await this.prisma.user.findFirst({ where: { id: row.closedById, tenantId }, select: { fullName: true } }) : null;
    return { ...row, closedByName: by?.fullName ?? null };
  }

  /**
   * Closes a business day for one branch: the night's rooms sold,
   * occupancy, ADR and the day's hotel revenue are saved as they stand.
   * One close per branch and day; a future day cannot be closed. Pending
   * arrivals or overdue guests do not block it (the desk sees them first).
   */
  async closeDay(user: AuthenticatedUser, scope: ShopScope, input: CloseDayInput) {
    const tenantId = user.tenantId;
    const shopId = await this.auditShop(tenantId, scope.shopId);
    if (!shopId) throw new BadRequestException('Night audit ek branch ka hota hai — upar se branch chunein');
    const day = input.date ? dayOf(input.date, 'Date') : today();
    if (day > today()) throw new BadRequestException('Aane wala din band nahi hota');
    const audit = await this.nightAudit(user, { date: keyOf(day) }, new ShopScope(shopId, false));
    const notes = input.notes?.trim().slice(0, 1000) || null;
    return this.prisma.$transaction(async (tx) => {
      // The unique index treats a null shop as distinct, so the check is done here under a lock.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`hotel-audit:${tenantId}:${shopId}`}))::text`;
      const done = await tx.hotelNightAudit.findFirst({ where: { tenantId, shopId, businessDate: day } });
      if (done) throw new BadRequestException(`${keyOf(day)} ka night audit pehle hi band ho chuka`);
      return tx.hotelNightAudit.create({
        data: {
          tenantId, shopId, businessDate: day,
          occupiedRooms: audit.night.sold,
          revenue: audit.money.billed,
          roomRevenue: audit.night.revenue,
          adr: audit.night.adr,
          occupancyPct: audit.night.occupancyPct,
          notes,
          closedById: user.id,
        },
      });
    });
  }

  /** Closed days, newest first, for the branch being viewed (all branches in "All shops"). */
  async closedDays(user: AuthenticatedUser, scope: ShopScope, q: { from?: string; to?: string }) {
    const tenantId = user.tenantId;
    const rows = await this.prisma.hotelNightAudit.findMany({
      where: {
        tenantId,
        ...(scope.shopId && { shopId: scope.shopId }),
        ...((q.from || q.to) && { businessDate: { ...(q.from && { gte: dayOf(q.from, 'Date') }), ...(q.to && { lte: dayOf(q.to, 'Date') }) } }),
      },
      orderBy: { businessDate: 'desc' },
      take: 120,
    });
    const [users, shops] = await Promise.all([
      this.prisma.user.findMany({ where: { tenantId, id: { in: rows.map((r) => r.closedById).filter((x): x is string => !!x) } }, select: { id: true, fullName: true } }),
      this.prisma.shop.findMany({ where: { tenantId, id: { in: rows.map((r) => r.shopId).filter((x): x is string => !!x) } }, select: { id: true, name: true } }),
    ]);
    const userOf = new Map(users.map((u) => [u.id, u.fullName]));
    const shopOf = new Map(shops.map((s) => [s.id, s.name]));
    return rows.map((r) => ({ ...r, date: keyOf(r.businessDate), closedByName: r.closedById ? userOf.get(r.closedById) ?? null : null, shopName: r.shopId ? shopOf.get(r.shopId) ?? null : null }));
  }

  async closedDay(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.hotelNightAudit.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!row) throw new NotFoundException('Night audit nahi mila');
    return this.withCloser(user.tenantId, { ...row, date: keyOf(row.businessDate) });
  }

  async overview(user: AuthenticatedUser, scope?: ShopScope) {
    const t = today();
    const tenantId = user.tenantId;
    const shopId = scope?.shopId;
    const moneyDay = await this.moneyDay(tenantId);
    const where = { tenantId, AND: [bookingScope(shopId)] };
    const branch = shopId ? { shopId } : {};
    const last30 = { gte: moneyDay(keyOf(addDays(t, -29))).gte };
    const [summary, arrivalsToday, departuresToday, inHouse, guests, vip, blacklisted, pendingHK, todayBookings, trend, money, month, outstanding, upcomingArrivals, recentBookings, bySource] = await Promise.all([
      this.rooms.summary(user, scope),
      this.prisma.hotelBooking.count({ where: { ...where, status: { in: [...OPEN_RESERVATION] }, checkInDate: { lte: t } } }),
      this.prisma.hotelBooking.count({ where: { ...where, status: { in: [...IN_HOUSE] }, checkOutDate: { lte: t } } }),
      this.prisma.hotelBooking.count({ where: { ...where, status: { in: [...IN_HOUSE] } } }),
      this.prisma.hotelGuest.count({ where: { tenantId, isActive: true } }),
      this.prisma.hotelGuest.count({ where: { tenantId, isActive: true, isVIP: true } }),
      this.prisma.hotelGuest.count({ where: { tenantId, isActive: true, isBlacklisted: true } }),
      this.prisma.hotelHousekeepingTask.count({ where: { tenantId, status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] } } }),
      this.prisma.hotelBooking.count({ where: { ...where, createdAt: moneyDay(keyOf(t)) } }),
      this.nights(tenantId, addDays(t, -6), t, shopId),
      this.money(tenantId, moneyDay(keyOf(t)), shopId),
      this.prisma.sale.aggregate({
        where: { tenantId, ...branch, saleNumber: { startsWith: 'HTL-' }, status: { not: 'VOIDED' }, createdAt: last30 },
        _sum: { total: true, paidAmount: true, creditAmount: true },
      }),
      this.prisma.hotelBooking.aggregate({ where: { ...where, status: { in: [...IN_HOUSE, ...OPEN_RESERVATION] } }, _sum: { balanceAmount: true } }),
      this.prisma.hotelBooking.findMany({
        where: { ...where, status: { in: [...OPEN_RESERVATION] }, checkInDate: { gte: t, lte: addDays(t, 7) } },
        include: { bookedRooms: true }, orderBy: { checkInDate: 'asc' }, take: 10,
      }),
      this.prisma.hotelBooking.findMany({ where, orderBy: { createdAt: 'desc' }, take: 10, include: { bookedRooms: true } }),
      this.prisma.hotelBooking.groupBy({
        by: ['source'], where: { ...where, createdAt: last30, status: { notIn: ['CANCELLED'] } },
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
