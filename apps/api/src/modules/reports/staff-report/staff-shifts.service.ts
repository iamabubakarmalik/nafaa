/**
 * Counter shifts for the staff report: who opened and closed each drawer,
 * how long it ran, cash expected against cash counted, bills rung on it and
 * cash put in or taken out; plus shorts and overs by person, branch and day.
 * Open shifts show the drawer's live expected cash.
 */

import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey, hourInTz } from '../../../common/helpers/business-time.helper';
import { computeLiveCash } from '../../../common/helpers/live-cash.helper';
import { hiddenFigures } from '../../../common/helpers/reports-config.helper';
import { ShopScope } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShiftFilter, StaffShiftsDto } from './dto/staff-report.dto';
import { TOLERANCE, num, r2, staffRange, within } from './staff-range';

const STATUS_WHERE: Record<ShiftFilter, Prisma.CashRegisterWhereInput> = {
  open: { status: 'OPEN' },
  closed: { status: 'CLOSED' },
  short: { status: 'CLOSED', difference: { lt: -TOLERANCE } },
  over: { status: 'CLOSED', difference: { gt: TOLERANCE } },
  matched: { status: 'CLOSED', difference: { gte: -TOLERANCE, lte: TOLERANCE } },
};

/** Analytics read at most this many shifts; the page says so when capped. */
const CAP = 5000;

type Bucket = { key: string; label: string; shifts: number; closed: number; short: number; shortCount: number; over: number; overCount: number; hours: number; cashSales: number };
const bucket = (key: string, label: string): Bucket => ({ key, label, shifts: 0, closed: 0, short: 0, shortCount: 0, over: 0, overCount: 0, hours: 0, cashSales: 0 });
const out = (b: Bucket) => ({
  ...b,
  short: r2(b.short), over: r2(b.over), net: r2(b.over - b.short), hours: r2(b.hours), cashSales: r2(b.cashSales),
  avgHours: b.closed ? r2(b.hours / b.closed) : 0,
  matchedPct: b.closed ? r2(((b.closed - b.shortCount - b.overCount) / b.closed) * 100) : 0,
});

@Injectable()
export class StaffShiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  async shifts(user: AuthenticatedUser, scope: ShopScope, q: StaffShiftsDto) {
    if ((await hiddenFigures(this.prisma, user)).includes('drawer')) {
      throw new ForbiddenException('Galle ka hisaab malik ne staff se chhupa rakha hai (Settings → Reports)');
    }
    const r = await staffRange(this.tz, user.tenantId, q);
    const page = q.page ?? 1;
    const limit = q.limit ?? 30;
    const base: Prisma.CashRegisterWhereInput = {
      tenantId: user.tenantId,
      // Placeholder rows made with every new shop were never opened.
      NOT: { status: 'CLOSED', closedAt: null },
      ...scope.where,
      openedAt: within(r),
      ...(q.staffId && { OR: [{ openedById: q.staffId }, { closedById: q.staffId }] }),
    };
    const where: Prisma.CashRegisterWhereInput = q.status ? { AND: [base, STATUS_WHERE[q.status]] } : base;

    const [count, rows, all] = await Promise.all([
      this.prisma.cashRegister.count({ where }),
      this.prisma.cashRegister.findMany({
        where,
        orderBy: { openedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, registerNumber: true, status: true, shopId: true, openedAt: true, closedAt: true, notes: true,
          openingBalance: true, expectedBalance: true, closingBalance: true, difference: true, totalSales: true,
          openedBy: { select: { id: true, fullName: true } },
          closedBy: { select: { id: true, fullName: true } },
          shop: { select: { id: true, name: true } },
        },
      }),
      this.prisma.cashRegister.findMany({
        where: base,
        orderBy: { openedAt: 'asc' },
        take: CAP,
        select: {
          status: true, shopId: true, openedAt: true, closedAt: true, difference: true, totalSales: true,
          openedById: true, closedById: true,
          openedBy: { select: { fullName: true } },
          shop: { select: { name: true } },
        },
      }),
    ]);

    const ids = rows.map((x) => x.id);
    const [bills, moves, live] = await Promise.all([
      ids.length
        ? this.prisma.sale.groupBy({
            by: ['cashRegisterId'],
            where: { tenantId: user.tenantId, cashRegisterId: { in: ids }, status: { not: 'VOIDED' } },
            _count: { _all: true },
            _sum: { total: true },
          })
        : Promise.resolve([]),
      ids.length
        ? this.prisma.cashTransaction.groupBy({
            by: ['cashRegisterId', 'type'],
            where: { tenantId: user.tenantId, cashRegisterId: { in: ids }, type: { in: ['CASH_IN', 'CASH_OUT', 'EXPENSE', 'REFUND'] } },
            _count: { _all: true },
            _sum: { amount: true },
          })
        : Promise.resolve([]),
      Promise.all(rows.filter((x) => x.status === 'OPEN').map(async (x) => [x.id, await computeLiveCash(this.prisma, user.tenantId, x)] as const)),
    ]);
    const liveMap = new Map(live);
    const move = (id: string, type: string) => moves.find((m) => m.cashRegisterId === id && m.type === type);

    const items = rows.map((x) => {
      const isOpen = x.status === 'OPEN';
      const lc = liveMap.get(x.id);
      const b = bills.find((y) => y.cashRegisterId === x.id);
      const end = x.closedAt ?? (isOpen ? new Date() : null);
      return {
        id: x.id, number: x.registerNumber, status: x.status, shop: x.shop, notes: x.notes,
        openedAt: x.openedAt, closedAt: x.closedAt,
        hours: end ? r2((end.getTime() - x.openedAt.getTime()) / 3_600_000) : null,
        openedBy: x.openedBy, closedBy: x.closedBy,
        closedByOther: !!x.closedBy && x.closedBy.id !== x.openedBy.id,
        opening: x.openingBalance,
        expected: isOpen ? lc?.expected ?? x.expectedBalance : x.expectedBalance,
        counted: isOpen ? null : x.closingBalance,
        difference: isOpen ? null : x.difference,
        cashSales: isOpen ? lc?.cashSales ?? 0 : x.totalSales,
        bills: b?._count._all ?? 0,
        billTotal: r2(num(b?._sum.total)),
        cashIn: r2(num(move(x.id, 'CASH_IN')?._sum.amount)), cashInCount: move(x.id, 'CASH_IN')?._count._all ?? 0,
        cashOut: r2(num(move(x.id, 'CASH_OUT')?._sum.amount)), cashOutCount: move(x.id, 'CASH_OUT')?._count._all ?? 0,
        expenses: r2(num(move(x.id, 'EXPENSE')?._sum.amount)),
        refunds: r2(num(move(x.id, 'REFUND')?._sum.amount)),
        live: isOpen,
      };
    });

    // Analytics over every shift in the filter (status filter aside).
    const totals = bucket('all', 'Sab');
    const staff = new Map<string, Bucket>();
    const shops = new Map<string, Bucket>();
    const days = new Map<string, Bucket>();
    const hourOpen = Array.from({ length: 24 }, () => 0);
    let closedByOther = 0;
    for (const x of all) {
      const diff = x.status === 'CLOSED' ? num(x.difference) : 0;
      const hours = x.status === 'CLOSED' && x.closedAt ? Math.min((x.closedAt.getTime() - x.openedAt.getTime()) / 3_600_000, 24) : 0;
      const day = businessDayKey(x.openedAt, r.tz, r.dayStartHour);
      const shopKey = x.shopId ?? 'none';
      const targets = [
        totals,
        staff.get(x.openedById) ?? staff.set(x.openedById, bucket(x.openedById, x.openedBy?.fullName ?? 'Purana user')).get(x.openedById)!,
        shops.get(shopKey) ?? shops.set(shopKey, bucket(shopKey, x.shop?.name ?? 'Bina branch')).get(shopKey)!,
        days.get(day) ?? days.set(day, bucket(day, day)).get(day)!,
      ];
      for (const b of targets) {
        b.shifts += 1;
        b.cashSales += x.status === 'CLOSED' ? num(x.totalSales) : 0;
        if (x.status === 'CLOSED') { b.closed += 1; b.hours += hours; }
        if (diff < -TOLERANCE) { b.short += -diff; b.shortCount += 1; }
        if (diff > TOLERANCE) { b.over += diff; b.overCount += 1; }
      }
      if (x.closedById && x.closedById !== x.openedById) closedByOther += 1;
      hourOpen[hourInTz(x.openedAt, r.tz)] += 1;
    }

    return {
      from: r.fromKey, to: r.toKey,
      items, count, page, pages: Math.max(1, Math.ceil(count / limit)),
      totals: { ...out(totals), open: totals.shifts - totals.closed, closedByOther },
      byStaff: [...staff.values()].map(out).sort((a, b) => b.short - a.short || b.shifts - a.shifts),
      byShop: [...shops.values()].map(out).sort((a, b) => b.shifts - a.shifts),
      byDay: [...days.values()].map(out).sort((a, b) => a.key.localeCompare(b.key)),
      hourOpen,
      capped: all.length >= CAP,
    };
  }
}
