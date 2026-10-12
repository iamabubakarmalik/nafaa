import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey } from '../../../common/helpers/business-time.helper';
import { periodRange } from '../../inventory/taxonomy/taxonomy.helper';
import { CashRegisterService, readReference, type ClosingSnapshot } from './cash-register.service';
import type { Denominations } from './dto/denominations';
import { ListShiftsDto, type ShiftStatus } from './dto/list-shifts.dto';

/** A difference smaller than this counts as a match (rounding of coins). */
const TOLERANCE = 0.5;
const KEY = /^\d{4}-\d{2}-\d{2}$/;
const n = (v: unknown) => Number(v ?? 0);

const STATUS_WHERE: Record<ShiftStatus, Prisma.CashRegisterWhereInput> = {
  OPEN: { status: 'OPEN' },
  CLOSED: { status: 'CLOSED' },
  SHORT: { status: 'CLOSED', difference: { lt: -TOLERANCE } },
  OVER: { status: 'CLOSED', difference: { gt: TOLERANCE } },
  MATCHED: { status: 'CLOSED', difference: { gte: -TOLERANCE, lte: TOLERANCE } },
};

const PEOPLE = {
  openedBy: { select: { id: true, fullName: true } },
  closedBy: { select: { id: true, fullName: true } },
  shop: { select: { id: true, name: true } },
} as const;

/**
 * Shift records and analytics for the cash register: the paged list with
 * period totals, one shift's full report (Z-report), and shorts/overs by
 * staff and by business day.
 */
@Injectable()
export class CashRegisterReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly registers: CashRegisterService,
  ) {}

  /** Tenant, branch, period, staff and search; status is added by the caller. */
  private async baseWhere(user: AuthenticatedUser, scope: ShopScope, q: ListShiftsDto, withStaff = true) {
    const where: Prisma.CashRegisterWhereInput = {
      tenantId: user.tenantId,
      // Placeholder rows made with every new shop were never opened.
      NOT: { status: 'CLOSED', closedAt: null },
      ...(scope.shopId ? { shopId: scope.shopId } : q.shopId ? { shopId: q.shopId } : {}),
    };
    if (q.from && q.to && KEY.test(q.from) && KEY.test(q.to)) {
      where.openedAt = await periodRange(this.tz, user.tenantId, q.from, q.to);
    }
    if (withStaff && q.staffId) where.openedById = q.staffId;
    const search = q.search?.trim();
    if (search) {
      const has = { contains: search, mode: 'insensitive' as const };
      where.OR = [
        { registerNumber: has },
        { notes: has },
        { openedBy: { fullName: has } },
        { closedBy: { fullName: has } },
      ];
    }
    return where;
  }

  async shifts(user: AuthenticatedUser, scope: ShopScope, q: ListShiftsDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 30;
    const base = await this.baseWhere(user, scope, q);
    const where: Prisma.CashRegisterWhereInput = q.status ? { AND: [base, STATUS_WHERE[q.status]] } : base;
    const closed = { AND: [base, STATUS_WHERE.CLOSED] };

    const [total, rows, byStatus, short, over, closedAgg, people] = await Promise.all([
      this.prisma.cashRegister.count({ where }),
      this.prisma.cashRegister.findMany({
        where,
        orderBy: { openedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: PEOPLE,
      }),
      this.prisma.cashRegister.groupBy({ by: ['status'], where: base, _count: { _all: true }, _avg: { openingBalance: true } }),
      this.prisma.cashRegister.aggregate({ where: { AND: [base, STATUS_WHERE.SHORT] }, _sum: { difference: true }, _count: { _all: true } }),
      this.prisma.cashRegister.aggregate({ where: { AND: [base, STATUS_WHERE.OVER] }, _sum: { difference: true }, _count: { _all: true } }),
      this.prisma.cashRegister.aggregate({ where: closed, _sum: { totalSales: true } }),
      this.prisma.cashRegister.groupBy({
        by: ['openedById'],
        where: await this.baseWhere(user, scope, { ...q, search: undefined }, false),
        _count: { _all: true },
      }),
    ]);

    // Open shifts show their live count instead of the stored opening figures.
    const items = await Promise.all(rows.map(async (r) => {
      if (r.status !== 'OPEN') return { ...r, isLive: false };
      const live = await this.registers.computeCash(user.tenantId, r);
      return { ...r, isLive: true, expectedBalance: live.expected, totalSales: live.cashSales, totalCashIn: live.cashIn, totalCashOut: live.cashOut };
    }));

    const staff = await this.prisma.user.findMany({
      where: { tenantId: user.tenantId, id: { in: people.map((p) => p.openedById) } },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
    });
    const count = (s: 'OPEN' | 'CLOSED') => byStatus.find((b) => b.status === s)?._count._all ?? 0;
    const shifts = count('OPEN') + count('CLOSED');
    const floatSum = byStatus.reduce((s, b) => s + n(b._avg.openingBalance) * (b._count._all ?? 0), 0);

    return {
      items,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      totals: {
        shifts,
        open: count('OPEN'),
        closed: count('CLOSED'),
        short: short._count._all ?? 0,
        shortAmount: Math.abs(n(short._sum.difference)),
        over: over._count._all ?? 0,
        overAmount: n(over._sum.difference),
        matched: count('CLOSED') - (short._count._all ?? 0) - (over._count._all ?? 0),
        cashSales: n(closedAgg._sum.totalSales),
        avgFloat: shifts ? Math.round(floatSum / shifts) : 0,
      },
      staff: staff.map((s) => ({ ...s, shifts: people.find((p) => p.openedById === s.id)?._count._all ?? 0 })),
    };
  }

  /** One shift with its entries and cash breakdown, for the detail panel and the Z-report. */
  async shift(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const register = await this.prisma.cashRegister.findFirst({
      where: { id, tenantId: user.tenantId, ...scope.where },
      include: {
        ...PEOPLE,
        transactions: {
          orderBy: { createdAt: 'asc' },
          include: { createdBy: { select: { id: true, fullName: true } } },
        },
      },
    });
    if (!register) throw new NotFoundException('Shift nahi mili');

    const { transactions, ...row } = register;
    const opening = transactions.find((t) => t.type === 'OPENING');
    const closing = transactions.find((t) => t.type === 'CLOSING');
    const snapshot = readReference<ClosingSnapshot>(closing?.reference);
    const isOpen = register.status === 'OPEN';

    // Closed shifts print what was saved at close; older ones without a snapshot are recounted.
    const cash = isOpen || !snapshot?.cash
      ? await this.registers.computeCash(user.tenantId, register, isOpen ? undefined : register.closedAt ?? undefined)
      : snapshot.cash;
    const expected = isOpen ? cash.expected : register.expectedBalance;

    return {
      register: row,
      cash,
      expected,
      counted: isOpen ? null : register.closingBalance,
      difference: isOpen ? null : register.difference,
      recounted: !isOpen && !snapshot?.cash,
      openingDenominations: readReference<{ denominations?: Denominations }>(opening?.reference)?.denominations ?? null,
      closingDenominations: snapshot?.denominations ?? null,
      entries: transactions
        .filter((t) => t.type !== 'OPENING' && t.type !== 'CLOSING')
        .map((t) => ({
          id: t.id, type: t.type, amount: t.amount, reason: t.reason, note: t.note, createdAt: t.createdAt, createdBy: t.createdBy,
          // Client request keys and snapshots are internal; only a plain reference is shown.
          reference: t.reference && !t.reference.startsWith('req:') && t.reference[0] !== '{' ? t.reference : null,
        })),
    };
  }

  /** Shorts and overs by staff and by business day, cash sales per day and the average float. */
  async analytics(user: AuthenticatedUser, scope: ShopScope, q: ListShiftsDto) {
    const where = await this.baseWhere(user, scope, q);
    const [rows, clock] = await Promise.all([
      this.prisma.cashRegister.findMany({
        where,
        orderBy: { openedAt: 'asc' },
        take: 5000,
        select: {
          id: true, status: true, shopId: true, openedAt: true, closedAt: true, openingBalance: true,
          difference: true, totalSales: true, openedById: true,
          openedBy: { select: { fullName: true } },
          shop: { select: { name: true } },
        },
      }),
      this.tz.clock(user.tenantId),
    ]);

    // Open shifts have no stored sales yet; take the live figure.
    const liveSales = new Map<string, number>();
    await Promise.all(rows.filter((r) => r.status === 'OPEN').map(async (r) => {
      liveSales.set(r.id, (await this.registers.computeCash(user.tenantId, r)).cashSales);
    }));

    type Bucket = { key: string; label: string; shifts: number; short: number; shortCount: number; over: number; overCount: number; cashSales: number; float: number };
    const bucket = (key: string, label: string): Bucket => ({ key, label, shifts: 0, short: 0, shortCount: 0, over: 0, overCount: 0, cashSales: 0, float: 0 });
    const staff = new Map<string, Bucket>();
    const days = new Map<string, Bucket>();
    const shops = new Map<string, Bucket>();
    const totals = bucket('all', 'Sab');
    let hours = 0;
    let closedCount = 0;

    for (const r of rows) {
      const sales = r.status === 'OPEN' ? liveSales.get(r.id) ?? 0 : n(r.totalSales);
      const diff = r.status === 'CLOSED' ? n(r.difference) : 0;
      const day = businessDayKey(r.openedAt, clock.tz, clock.dayStartHour);
      const targets = [
        totals,
        staff.get(r.openedById) ?? staff.set(r.openedById, bucket(r.openedById, r.openedBy?.fullName ?? 'Purana user')).get(r.openedById)!,
        days.get(day) ?? days.set(day, bucket(day, day)).get(day)!,
        shops.get(r.shopId ?? 'none') ?? shops.set(r.shopId ?? 'none', bucket(r.shopId ?? 'none', r.shop?.name ?? 'Bina branch')).get(r.shopId ?? 'none')!,
      ];
      for (const b of targets) {
        b.shifts += 1;
        b.cashSales += sales;
        b.float += n(r.openingBalance);
        if (diff < -TOLERANCE) { b.short += -diff; b.shortCount += 1; }
        if (diff > TOLERANCE) { b.over += diff; b.overCount += 1; }
      }
      if (r.status === 'CLOSED' && r.closedAt) {
        hours += (r.closedAt.getTime() - r.openedAt.getTime()) / 3_600_000;
        closedCount += 1;
      }
    }

    const out = (b: Bucket) => ({
      key: b.key, label: b.label, shifts: b.shifts,
      short: Math.round(b.short), shortCount: b.shortCount,
      over: Math.round(b.over), overCount: b.overCount,
      net: Math.round(b.over - b.short),
      cashSales: Math.round(b.cashSales),
      avgFloat: b.shifts ? Math.round(b.float / b.shifts) : 0,
    });

    return {
      totals: { ...out(totals), avgHours: closedCount ? Math.round((hours / closedCount) * 10) / 10 : 0, open: rows.length - closedCount },
      byStaff: [...staff.values()].map(out).sort((a, b) => b.short - a.short || b.shifts - a.shifts),
      byDay: [...days.values()].map(out),
      byShop: [...shops.values()].map(out).sort((a, b) => b.cashSales - a.cashSales),
      capped: rows.length >= 5000,
    };
  }
}
