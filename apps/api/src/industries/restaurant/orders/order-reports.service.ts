import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, RestaurantOrderStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey, safeDayStart, zonedToUtc } from '../../../common/helpers/business-time.helper';
import { saleFigures } from '../../../common/helpers/business-math.helper';
import { round2 } from '../recipes/recipe-units';
import { OrdersService } from './orders.service';
import { OPEN_ORDER } from './order-tokens';
import { OrderPageQueryDto } from './dto/update-status.dto';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 3600_000;

/** Status groups the orders list filters by. */
const BUCKETS: Record<string, RestaurantOrderStatus[] | undefined> = {
  open: OPEN_ORDER,
  completed: ['COMPLETED'],
  cancelled: ['CANCELLED'],
  all: undefined,
};

@Injectable()
export class OrderReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly orders: OrdersService,
  ) {}

  /** Start of a business day (YYYY-MM-DD in the shop's clock) as a UTC instant. */
  private async dayStart(tenantId: string, key: string) {
    if (!DAY_KEY.test(key)) throw new BadRequestException('Tareekh YYYY-MM-DD likhein');
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const [y, m, d] = key.split('-').map(Number);
    return zonedToUtc(y, m, d, safeDayStart(dayStartHour), 0, 0, tz);
  }

  private async today(tenantId: string) {
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    return businessDayKey(new Date(), tz, dayStartHour);
  }

  /**
   * Orders list with server paging; the numbers cover the whole filter, not
   * just the page. Paid figures are the bills' net (voids out, returns off).
   */
  async page(user: AuthenticatedUser, q: OrderPageQueryDto, shopId?: string) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 30;
    const created = q.from || q.to ? {
      ...(q.from && { gte: await this.dayStart(user.tenantId, q.from) }),
      ...(q.to && { lt: new Date((await this.dayStart(user.tenantId, q.to)).getTime() + DAY_MS) }),
    } : undefined;
    const saleIds = await this.orders.saleIdsFor(user.tenantId, q.search);
    const base = this.orders.whereFor(user, { mode: q.mode, tableId: q.tableId, waiterId: q.waiterId, search: q.search, shopId, created }, saleIds);
    const bucket = q.status ?? 'all';
    const statusWhere: Prisma.RestaurantOrderWhereInput = bucket in BUCKETS
      ? (BUCKETS[bucket] ? { status: { in: BUCKETS[bucket] } } : {})
      : (Object.values(RestaurantOrderStatus) as string[]).includes(bucket) ? { status: bucket as RestaurantOrderStatus } : {};
    const where: Prisma.RestaurantOrderWhereInput = { AND: [base, statusWhere] };
    const orderBy: Prisma.RestaurantOrderOrderByWithRelationInput =
      q.sort === 'old' ? { createdAt: 'asc' } : q.sort === 'high' ? { total: 'desc' } : q.sort === 'low' ? { total: 'asc' } : { createdAt: 'desc' };

    const [rows, total, byStatus, billed] = await Promise.all([
      this.prisma.restaurantOrder.findMany({
        where, orderBy, skip: (page - 1) * limit, take: limit,
        include: {
          items: { where: { isReturned: false }, select: { id: true, quantity: true, status: true, product: { select: { name: true } } } },
          table: { select: { id: true, tableNumber: true, tableName: true, section: true } },
          delivery: { select: { status: true, rider: { select: { id: true, name: true, phone: true } } } },
        },
      }),
      this.prisma.restaurantOrder.count({ where }),
      this.prisma.restaurantOrder.groupBy({ by: ['status'], where: base, _count: { _all: true }, _sum: { total: true } }),
      this.prisma.restaurantOrder.findMany({ where: { AND: [base, { status: 'COMPLETED', saleId: { not: null } }] }, select: { saleId: true, mode: true } }),
    ]);
    // Paid money comes from the bills: a voided bill drops out and returns come off, as in the day book.
    const billIds = billed.map((b) => b.saleId!).filter((x) => !x.startsWith('pending:'));
    const sales = billIds.length
      ? await this.prisma.sale.findMany({ where: { id: { in: billIds }, tenantId: user.tenantId, status: { not: 'VOIDED' } }, select: { id: true, total: true, refundedAmount: true } })
      : [];
    const netOf = new Map(sales.map((x) => [x.id, round2(x.total - x.refundedAmount)]));
    const modes = new Map<string, { mode: string; count: number; amount: number }>();
    for (const b of billed) {
      const net = netOf.get(b.saleId!);
      if (net === undefined) continue;
      const m = modes.get(b.mode) ?? { mode: b.mode, count: 0, amount: 0 };
      m.count += 1; m.amount = round2(m.amount + net);
      modes.set(b.mode, m);
    }

    const waiterIds = [...new Set(rows.map((r) => r.waiterId).filter((x): x is string => !!x))];
    const pageBills = rows.map((r) => r.saleId).filter((x): x is string => !!x && !x.startsWith('pending:'));
    const [waiters, bills, items] = await Promise.all([
      waiterIds.length ? this.prisma.user.findMany({ where: { id: { in: waiterIds }, tenantId: user.tenantId }, select: { id: true, fullName: true } }) : [],
      pageBills.length ? this.prisma.sale.findMany({ where: { id: { in: pageBills }, tenantId: user.tenantId }, select: { id: true, saleNumber: true, status: true, creditAmount: true, refundedAmount: true } }) : [],
      this.orders.tokens(user.tenantId, rows),
    ]);
    const waiterOf = new Map(waiters.map((w) => [w.id, w.fullName]));
    const billOf = new Map(bills.map((b) => [b.id, b]));

    const sum = (statuses: RestaurantOrderStatus[]) => byStatus.filter((s) => statuses.includes(s.status));
    const count = (statuses: RestaurantOrderStatus[]) => sum(statuses).reduce((n, s) => n + s._count._all, 0);
    const amount = (statuses: RestaurantOrderStatus[]) => round2(sum(statuses).reduce((n, s) => n + (s._sum.total ?? 0), 0));
    const completed = [...modes.values()].reduce((n, m) => n + m.count, 0);
    const completedAmount = round2([...modes.values()].reduce((n, m) => n + m.amount, 0));

    return {
      items: items.map((r) => ({ ...r, waiterName: r.waiterId ? waiterOf.get(r.waiterId) ?? null : null, sale: r.saleId ? billOf.get(r.saleId) ?? null : null })),
      total, page, limit,
      stats: {
        all: byStatus.reduce((n, s) => n + s._count._all, 0),
        open: count(OPEN_ORDER), openAmount: amount(OPEN_ORDER),
        kitchen: count(['PLACED', 'CONFIRMED', 'COOKING']),
        ready: count(['READY']),
        billPrinted: count(['ON_HOLD']),
        completed, completedAmount,
        cancelled: count(['CANCELLED']), cancelledAmount: amount(['CANCELLED']),
        averageBill: completed ? round2(completedAmount / completed) : 0,
        voidedBills: billed.length - completed,
        byMode: [...modes.values()].sort((a, b) => b.amount - a.amount),
      },
    };
  }

  /**
   * End of the business day: what is still open, and the day's money by order
   * type, waiter and table. Money comes from the day's bills (net of returns),
   * so the total is the day book's net sale; counter bills without an order
   * show as "Counter".
   */
  async dayClose(user: AuthenticatedUser, date: string | undefined, shopId?: string) {
    const key = date || await this.today(user.tenantId);
    const gte = await this.dayStart(user.tenantId, key);
    const lt = new Date(gte.getTime() + DAY_MS);
    const shopWhere = shopId ? { shopId } : {};
    const looseShop = shopId ? { OR: [{ shopId }, { shopId: null }] } : {};

    const [figures, sales, open, voided, cancelled, riderDue] = await Promise.all([
      saleFigures(this.prisma, { tenantId: user.tenantId, shopId: shopId ?? null }, { gte, lt }),
      this.prisma.sale.findMany({
        where: { tenantId: user.tenantId, ...shopWhere, soldAt: { gte, lt }, status: { not: 'VOIDED' } },
        select: { id: true, total: true, refundedAmount: true, soldById: true, createdById: true },
      }),
      this.prisma.restaurantOrder.findMany({
        where: { tenantId: user.tenantId, ...looseShop, status: { in: OPEN_ORDER }, saleId: null },
        select: {
          id: true, orderNumber: true, mode: true, status: true, total: true, paidAmount: true, createdAt: true, customerName: true,
          table: { select: { tableNumber: true } }, delivery: { select: { rider: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.restaurantOrderItem.findMany({
        where: { isReturned: true, updatedAt: { gte, lt }, order: { tenantId: user.tenantId, ...looseShop } },
        select: { id: true, quantity: true, total: true, returnReason: true, cookingStartedAt: true, updatedAt: true, product: { select: { name: true } }, order: { select: { id: true, orderNumber: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.restaurantOrder.findMany({
        where: { tenantId: user.tenantId, ...looseShop, status: 'CANCELLED', cancelledAt: { gte, lt }, total: { gt: 0 } },
        select: { id: true, orderNumber: true, total: true, cancellationReason: true },
      }),
      this.prisma.restaurantOrder.findMany({
        where: { tenantId: user.tenantId, ...looseShop, mode: 'DELIVERY', saleId: null, riderId: { not: null }, status: { in: ['OUT_FOR_DELIVERY', 'DELIVERED'] } },
        select: { id: true, total: true, paidAmount: true, riderId: true },
      }),
    ]);

    const orders = sales.length
      ? await this.prisma.restaurantOrder.findMany({
        where: { tenantId: user.tenantId, saleId: { in: sales.map((s) => s.id) } },
        select: { saleId: true, mode: true, waiterId: true, tip: true, tableId: true, table: { select: { tableNumber: true, tableName: true } } },
      })
      : [];
    const orderOf = new Map(orders.map((o) => [o.saleId!, o]));

    type Row = { key: string; label: string; bills: number; amount: number };
    const add = (m: Map<string, Row>, k: string, label: string, amount: number) => {
      const r = m.get(k) ?? { key: k, label, bills: 0, amount: 0 };
      r.bills += 1; r.amount = round2(r.amount + amount);
      m.set(k, r);
    };
    const byMode = new Map<string, Row>();
    const byWaiter = new Map<string, Row>();
    const byTable = new Map<string, Row>();
    const staffIds = new Set<string>();
    let tips = 0;
    for (const s of sales) {
      const net = round2(s.total - s.refundedAmount);
      const o = orderOf.get(s.id);
      add(byMode, o?.mode ?? 'COUNTER', o?.mode ?? 'COUNTER', net);
      const staff = o?.waiterId ?? s.soldById ?? s.createdById ?? '';
      if (staff) staffIds.add(staff);
      add(byWaiter, staff, staff, net);
      if (o?.tableId) add(byTable, o.tableId, `${o.table?.tableNumber ?? ''}${o.table?.tableName ? ` (${o.table.tableName})` : ''}`, net);
      tips += o?.tip ?? 0;
    }
    const staff = staffIds.size
      ? await this.prisma.user.findMany({ where: { id: { in: [...staffIds] }, tenantId: user.tenantId }, select: { id: true, fullName: true } })
      : [];
    const nameOf = new Map(staff.map((u) => [u.id, u.fullName]));
    for (const r of byWaiter.values()) r.label = nameOf.get(r.key) ?? 'Pata nahi';

    const riderIds = [...new Set(riderDue.map((r) => r.riderId!))];
    const riders = riderIds.length ? await this.prisma.rider.findMany({ where: { id: { in: riderIds }, tenantId: user.tenantId }, select: { id: true, name: true, phone: true } }) : [];
    const riderCash = riders.map((r) => {
      const mine = riderDue.filter((o) => o.riderId === r.id);
      return { riderId: r.id, name: r.name, phone: r.phone, orders: mine.length, amount: round2(mine.reduce((n, o) => n + o.total - o.paidAmount, 0)) };
    });

    const sorted = (m: Map<string, Row>) => [...m.values()].sort((a, b) => b.amount - a.amount);
    const groupedTotal = round2(sales.reduce((n, s) => n + s.total - s.refundedAmount, 0));
    return {
      date: key,
      from: gte, to: lt,
      figures,
      // Same figure as the day book's net sale; shown so a mismatch is visible at once.
      groupedTotal,
      tips: round2(tips),
      byMode: sorted(byMode),
      byWaiter: sorted(byWaiter),
      byTable: sorted(byTable),
      openOrders: open.map((o) => ({ ...o, due: round2(o.total - o.paidAmount) })),
      openAmount: round2(open.reduce((n, o) => n + o.total - o.paidAmount, 0)),
      voids: {
        count: voided.length,
        amount: round2(voided.reduce((n, v) => n + v.total, 0)),
        cookedAmount: round2(voided.filter((v) => v.cookingStartedAt).reduce((n, v) => n + v.total, 0)),
        items: voided.slice(0, 50),
      },
      cancelled: { count: cancelled.length, amount: round2(cancelled.reduce((n, c) => n + c.total, 0)), orders: cancelled.slice(0, 50) },
      riderCash,
    };
  }
}
