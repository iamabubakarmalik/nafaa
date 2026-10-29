/**
 * Distribution figures: the desk dashboard, the daily sales report per
 * booker (DSR) and the period summary by route, booker, item and scheme.
 * Day boundaries follow the business clock (time zone and day start hour).
 * Cost-based figures (free goods cost) are left out without cost.view.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { hourInTz } from '../../../common/helpers/business-time.helper';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { INVOICED_STATUSES, NO_ORDER_REASONS } from '../distribution.constants';
import { checkKey, dayRange, dayStart, r2, r4, shiftKey, todayKey, userNames, weekdayOfKey } from '../distribution.support';

@Injectable()
export class DistributionReportsService {
  constructor(private readonly prisma: PrismaService, private readonly tz: TenantTimezoneService) {}

  /** Today at a glance, plus the work waiting at each step. */
  async dashboard(user: AuthenticatedUser) {
    const tenantId = user.tenantId;
    const clock = await this.tz.clock(tenantId);
    const today = todayKey(clock);
    const gte = dayStart(today, clock);
    const lt = dayStart(shiftKey(today, 1), clock);
    const [byStatus, todayOrders, failed, sheets, pending, owing, visits] = await Promise.all([
      this.prisma.salesOrder.groupBy({ by: ['status'], where: { tenantId, status: { in: ['BOOKED', 'APPROVED', 'INVOICING', 'INVOICED', 'LOADED'] } }, _count: { _all: true }, _sum: { total: true } }),
      this.prisma.salesOrder.aggregate({ where: { tenantId, bookedAt: { gte, lt }, status: { not: 'CANCELLED' } }, _count: { _all: true }, _sum: { total: true } }),
      this.prisma.salesOrder.count({ where: { tenantId, status: 'APPROVED', invoiceError: { not: null } } }),
      this.prisma.loadSheet.groupBy({ by: ['status'], where: { tenantId, status: { in: ['OPEN', 'DISPATCHED'] } }, _count: { _all: true }, _sum: { totalValue: true } }),
      this.prisma.distCollection.aggregate({ where: { tenantId, status: 'PENDING' }, _count: { _all: true }, _sum: { amount: true } }),
      this.prisma.customer.aggregate({ where: { tenantId, routeId: { not: null }, balance: { gt: 0.005 } }, _count: { _all: true }, _sum: { balance: true } }),
      this.prisma.distVisit.groupBy({ by: ['outcome'], where: { tenantId, checkInAt: { gte, lt } }, _count: { _all: true } }),
    ]);
    const st = Object.fromEntries(byStatus.map((s) => [s.status, { count: s._count._all, value: r2(s._sum.total ?? 0) }]));
    return {
      date: today,
      today: {
        orders: todayOrders._count._all, value: r2(todayOrders._sum.total ?? 0),
        visits: visits.reduce((s, v) => s + v._count._all, 0),
        productiveVisits: visits.find((v) => v.outcome === 'ORDER')?._count._all ?? 0,
      },
      waiting: {
        toApprove: st.BOOKED ?? { count: 0, value: 0 },
        approvedNotInvoiced: st.APPROVED ?? { count: 0, value: 0 },
        invoiceProblems: failed,
        toLoad: st.INVOICED ?? { count: 0, value: 0 },
        onVans: st.LOADED ?? { count: 0, value: 0 },
        openSheets: Object.fromEntries(sheets.map((s) => [s.status, { count: s._count._all, value: r2(s._sum.totalValue ?? 0) }])),
        collectionsToVerify: { count: pending._count._all, amount: r2(pending._sum.amount ?? 0) },
      },
      receivable: { customers: owing._count._all, amount: r2(owing._sum.balance ?? 0) },
    };
  }

  /**
   * Daily sales report per booker: customers planned on the day's routes,
   * visited, productive, strike rate, orders, lines per call, drop size,
   * no-order reasons and money collected.
   */
  async dsr(user: AuthenticatedUser, q: { date?: string; bookerId?: string; routeId?: string }) {
    const tenantId = user.tenantId;
    const clock = await this.tz.clock(tenantId);
    const key = checkKey(q.date) ?? todayKey(clock);
    const gte = dayStart(key, clock);
    const lt = dayStart(shiftKey(key, 1), clock);
    const weekday = weekdayOfKey(key);
    const [routes, orders, visits, collections] = await Promise.all([
      this.prisma.distRoute.findMany({ where: { tenantId, isActive: true, visitDays: { has: weekday }, ...(q.bookerId && { bookerId: q.bookerId }), ...(q.routeId && { id: q.routeId }) }, select: { id: true, name: true, bookerId: true } }),
      this.prisma.salesOrder.findMany({
        where: { tenantId, bookedAt: { gte, lt }, status: { not: 'CANCELLED' }, ...(q.bookerId && { bookedById: q.bookerId }), ...(q.routeId && { routeId: q.routeId }) },
        select: { bookedById: true, customerId: true, total: true, schemeDiscount: true, bookedAt: true, _count: { select: { items: true } } },
      }),
      this.prisma.distVisit.findMany({
        where: { tenantId, checkInAt: { gte, lt }, ...(q.bookerId && { userId: q.bookerId }), ...(q.routeId && { routeId: q.routeId }) },
        select: { userId: true, customerId: true, outcome: true, noOrderReason: true, checkInAt: true, withinRadius: true },
      }),
      this.prisma.distCollection.findMany({
        where: { tenantId, collectedAt: { gte, lt }, status: { not: 'REJECTED' }, ...(q.bookerId && { collectedById: q.bookerId }) },
        select: { collectedById: true, amount: true, kind: true, status: true },
      }),
    ]);
    const planned = await this.prisma.customer.groupBy({ by: ['routeId'], where: { tenantId, isActive: true, routeId: { in: routes.map((r) => r.id) } }, _count: { _all: true } });
    const plannedBy = new Map(planned.map((p) => [p.routeId, p._count._all]));
    const bookerIds = [...new Set([...routes.map((r) => r.bookerId), ...orders.map((o) => o.bookedById), ...visits.map((v) => v.userId)].filter((x): x is string => !!x))];
    const names = await userNames(this.prisma, tenantId, bookerIds);
    const reasons = new Map(NO_ORDER_REASONS.map((r) => [r.code, r.label]));

    const rows = bookerIds.map((id) => {
      const myRoutes = routes.filter((r) => r.bookerId === id);
      const myOrders = orders.filter((o) => o.bookedById === id);
      const myVisits = visits.filter((v) => v.userId === id);
      const myMoney = collections.filter((c) => c.collectedById === id);
      const visited = new Set([...myVisits.map((v) => v.customerId), ...myOrders.map((o) => o.customerId)]);
      const productive = new Set(myOrders.map((o) => o.customerId));
      const value = r2(myOrders.reduce((s, o) => s + o.total, 0));
      const lines = myOrders.reduce((s, o) => s + o._count.items, 0);
      const times = [...myVisits.map((v) => v.checkInAt), ...myOrders.map((o) => o.bookedAt)].sort((a, b) => a.getTime() - b.getTime());
      const noOrder = myVisits.filter((v) => v.outcome !== 'ORDER').reduce<Record<string, number>>((m, v) => {
        const k = v.noOrderReason ?? v.outcome;
        m[k] = (m[k] ?? 0) + 1;
        return m;
      }, {});
      return {
        bookerId: id, bookerName: names.get(id) ?? null,
        routes: myRoutes.map((r) => r.name),
        planned: myRoutes.reduce((s, r) => s + (plannedBy.get(r.id) ?? 0), 0),
        visited: visited.size, productive: productive.size,
        strikeRate: visited.size ? r2((productive.size / visited.size) * 100) : 0,
        orders: myOrders.length, value, lines,
        linesPerCall: productive.size ? r2(lines / productive.size) : 0,
        dropSize: productive.size ? r2(value / productive.size) : 0,
        schemeDiscount: r2(myOrders.reduce((s, o) => s + o.schemeDiscount, 0)),
        outOfRangeCheckIns: myVisits.filter((v) => v.withinRadius === false).length,
        noOrder: Object.entries(noOrder).map(([reason, count]) => ({ reason, label: reasons.get(reason) ?? reason, count })),
        collected: r2(myMoney.reduce((s, c) => s + c.amount, 0)),
        collectedPending: r2(myMoney.filter((c) => c.status === 'PENDING').reduce((s, c) => s + c.amount, 0)),
        firstActivityHour: times[0] ? hourInTz(times[0], clock.tz) : null,
        lastActivityHour: times.length ? hourInTz(times[times.length - 1], clock.tz) : null,
      };
    }).sort((a, b) => b.value - a.value);

    const sum = (f: (r: (typeof rows)[number]) => number) => r2(rows.reduce((s, r) => s + f(r), 0));
    const visitedAll = sum((r) => r.visited);
    const productiveAll = sum((r) => r.productive);
    return {
      date: key, weekday,
      bookers: rows,
      totals: {
        planned: sum((r) => r.planned), visited: visitedAll, productive: productiveAll,
        strikeRate: visitedAll ? r2((productiveAll / visitedAll) * 100) : 0,
        orders: sum((r) => r.orders), value: sum((r) => r.value), lines: sum((r) => r.lines),
        collected: sum((r) => r.collected),
      },
    };
  }

  /** Period summary: booked, invoiced, delivered and returned, by route, booker, item and scheme. */
  async summary(user: AuthenticatedUser, q: { from?: string; to?: string; routeId?: string; bookerId?: string }) {
    const tenantId = user.tenantId;
    const clock = await this.tz.clock(tenantId);
    const range = dayRange(clock, q.from, q.to);
    const scope = { tenantId, ...(q.routeId && { routeId: q.routeId }), ...(q.bookerId && { bookedById: q.bookerId }) };
    const showCost = hasPermission(user.role, user.permissions, PERMISSIONS.COST_VIEW);
    const [booked, invoiced, recovered, pendingMoney] = await Promise.all([
      this.prisma.salesOrder.findMany({ where: { ...scope, bookedAt: { gte: range.gte, lt: range.lt } }, select: { status: true, total: true } }),
      this.prisma.salesOrder.findMany({
        where: { ...scope, invoicedAt: { gte: range.gte, lt: range.lt }, status: { in: INVOICED_STATUSES } },
        select: { id: true, routeId: true, bookedById: true, total: true, schemeDiscount: true, returnsValue: true, deliveryStatus: true, cashCollected: true, items: { select: { productId: true, baseQty: true, total: true, schemeId: true, schemeDiscount: true, freeBaseQty: true, freeProductId: true } } },
      }),
      this.prisma.distCollection.aggregate({ where: { tenantId, status: 'VERIFIED', kind: 'RECOVERY', verifiedAt: { gte: range.gte, lt: range.lt } }, _sum: { amount: true }, _count: { _all: true } }),
      this.prisma.distCollection.aggregate({ where: { tenantId, status: 'PENDING' }, _sum: { amount: true }, _count: { _all: true } }),
    ]);
    const items = invoiced.flatMap((o) => o.items);
    const productIds = [...new Set(items.flatMap((i) => [i.productId, ...(i.freeProductId ? [i.freeProductId] : [])]))];
    const schemeIds = [...new Set(items.map((i) => i.schemeId).filter((x): x is string => !!x))];
    const [products, schemes, routes] = await Promise.all([
      this.prisma.product.findMany({ where: { tenantId, id: { in: productIds } }, select: { id: true, name: true, costPrice: true, unit: true } }),
      this.prisma.tradeScheme.findMany({ where: { tenantId, id: { in: schemeIds } }, select: { id: true, name: true, type: true, supplierId: true, isClaimable: true } }),
      this.prisma.distRoute.findMany({ where: { tenantId, id: { in: invoiced.map((o) => o.routeId).filter((x): x is string => !!x) } }, select: { id: true, name: true } }),
    ]);
    const users = await userNames(this.prisma, tenantId, invoiced.map((o) => o.bookedById));
    const pMap = new Map(products.map((p) => [p.id, p]));
    const rMap = new Map(routes.map((r) => [r.id, r.name]));
    const group = <K extends string>(keyOf: (o: (typeof invoiced)[number]) => K | null) => {
      const m = new Map<string, { invoices: number; value: number; returns: number; cash: number }>();
      for (const o of invoiced) {
        const k = keyOf(o) ?? 'none';
        const g = m.get(k) ?? { invoices: 0, value: 0, returns: 0, cash: 0 };
        g.invoices++; g.value = r2(g.value + o.total); g.returns = r2(g.returns + o.returnsValue); g.cash = r2(g.cash + o.cashCollected);
        m.set(k, g);
      }
      return m;
    };
    const top = new Map<string, { baseQty: number; value: number }>();
    for (const i of items) {
      const t = top.get(i.productId) ?? { baseQty: 0, value: 0 };
      t.baseQty = r4(t.baseQty + i.baseQty); t.value = r2(t.value + i.total);
      top.set(i.productId, t);
    }
    const bySchemeMap = new Map<string, { lines: number; discount: number; freeBaseQty: number; freeCost: number }>();
    for (const i of items) {
      if (!i.schemeId) continue;
      const s = bySchemeMap.get(i.schemeId) ?? { lines: 0, discount: 0, freeBaseQty: 0, freeCost: 0 };
      s.lines++; s.discount = r2(s.discount + i.schemeDiscount); s.freeBaseQty = r4(s.freeBaseQty + i.freeBaseQty);
      s.freeCost = r2(s.freeCost + i.freeBaseQty * (Number(pMap.get(i.freeProductId ?? i.productId)?.costPrice) || 0));
      bySchemeMap.set(i.schemeId, s);
    }
    const sMap = new Map(schemes.map((s) => [s.id, s]));
    const count = (f: (o: (typeof booked)[number]) => boolean) => booked.filter(f).length;
    return {
      from: range.from, to: range.to,
      booked: { orders: booked.length, value: r2(booked.reduce((s, o) => s + o.total, 0)), cancelled: count((o) => o.status === 'CANCELLED') },
      invoiced: {
        invoices: invoiced.length, value: r2(invoiced.reduce((s, o) => s + o.total, 0)),
        delivered: invoiced.filter((o) => o.deliveryStatus === 'DELIVERED').length,
        partial: invoiced.filter((o) => o.deliveryStatus === 'PARTIAL').length,
        returned: invoiced.filter((o) => o.deliveryStatus === 'RETURNED').length,
        notSettled: invoiced.filter((o) => !o.deliveryStatus).length,
        returnsValue: r2(invoiced.reduce((s, o) => s + o.returnsValue, 0)),
        cashAtDelivery: r2(invoiced.reduce((s, o) => s + o.cashCollected, 0)),
        schemeDiscount: r2(invoiced.reduce((s, o) => s + o.schemeDiscount, 0)),
      },
      recoveries: { verified: r2(recovered._sum.amount ?? 0), verifiedCount: recovered._count._all, pending: r2(pendingMoney._sum.amount ?? 0), pendingCount: pendingMoney._count._all },
      byRoute: [...group((o) => o.routeId).entries()].map(([id, g]) => ({ routeId: id === 'none' ? null : id, routeName: id === 'none' ? 'Bina route' : rMap.get(id) ?? null, ...g })).sort((a, b) => b.value - a.value),
      byBooker: [...group((o) => o.bookedById).entries()].map(([id, g]) => ({ bookerId: id, bookerName: users.get(id) ?? null, ...g })).sort((a, b) => b.value - a.value),
      topProducts: [...top.entries()].map(([id, t]) => ({ productId: id, name: pMap.get(id)?.name ?? null, baseUnit: pMap.get(id)?.unit ?? 'pcs', ...t })).sort((a, b) => b.value - a.value).slice(0, 20),
      bySchemes: [...bySchemeMap.entries()].map(([id, s]) => ({
        schemeId: id, name: sMap.get(id)?.name ?? null, type: sMap.get(id)?.type ?? null, isClaimable: sMap.get(id)?.isClaimable ?? false,
        lines: s.lines, discount: s.discount, freeBaseQty: s.freeBaseQty, ...(showCost && { freeCost: s.freeCost }),
      })).sort((a, b) => b.discount - a.discount),
    };
  }

  /** Receivables per route with ageing of the oldest debt, for the AI tool. */
  async routeReceivables(user: AuthenticatedUser, routeId?: string) {
    const tenantId = user.tenantId;
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, balance: { gt: 0.005 }, routeId: routeId ? routeId : { not: null } },
      select: { id: true, routeId: true, balance: true },
    });
    const routes = await this.prisma.distRoute.findMany({ where: { tenantId, id: { in: [...new Set(customers.map((c) => c.routeId!))] } }, select: { id: true, name: true } });
    const by = new Map<string, { customers: number; balance: number }>();
    for (const c of customers) {
      const g = by.get(c.routeId!) ?? { customers: 0, balance: 0 };
      g.customers++; g.balance = r2(g.balance + c.balance);
      by.set(c.routeId!, g);
    }
    return routes.map((r) => ({ routeId: r.id, routeName: r.name, ...by.get(r.id)! })).sort((a, b) => b.balance - a.balance);
  }
}
