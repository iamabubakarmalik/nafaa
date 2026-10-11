/**
 * Sales history: filtered, paginated bills with totals for the whole filter
 * (not just the loaded page), plus analytics for the same filter.
 *
 * The older `GET /sales` returns the latest 200 bills only, so any period
 * longer than that showed wrong totals. Dates here are business days in the
 * tenant's timezone, like every report.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod, Prisma, SaleSource } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import {
  businessDayKey, dateKeyTz, safeDayStart, tzParts, weekdayInTz, zonedToUtc,
} from '../../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';

export interface SalesHistoryQuery {
  from?: string;
  to?: string;
  method?: string;
  status?: string;
  source?: string;
  staffId?: string;
  customerId?: string;
  search?: string;
  sort?: string;
  page?: string;
  limit?: string;
}

const DAY = 24 * 3600_000;
const LIVE = ['COMPLETED', 'PARTIALLY_RETURNED', 'FULLY_RETURNED'] as const;
const n = (v: unknown) => Number(v ?? 0);
const KEY = /^\d{4}-\d{2}-\d{2}$/;
const METHODS = Object.values(PaymentMethod) as string[];
const SOURCES = Object.values(SaleSource) as string[];

@Injectable()
export class SalesHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  private async range(tenantId: string, from?: string, to?: string) {
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const start = safeDayStart(dayStartHour);
    const today = businessDayKey(new Date(), tz, start);
    const f = from && KEY.test(from) ? from : from === 'all' ? null : today;
    const t = to && KEY.test(to) ? to : today;
    if (f && f > t) throw new BadRequestException('from is after to');
    const at = (key: string) => { const [y, m, d] = key.split('-').map(Number); return zonedToUtc(y, m, d, start, 0, 0, tz); };
    return { tz, dayStartHour: start, gte: f ? at(f) : undefined, lt: new Date(at(t).getTime() + DAY), fromKey: f, toKey: t };
  }

  private where(user: AuthenticatedUser, shopId: string | undefined, q: SalesHistoryQuery, gte: Date | undefined, lt: Date): Prisma.SaleWhereInput {
    const w: Prisma.SaleWhereInput = { tenantId: user.tenantId, soldAt: { ...(gte && { gte }), lt }, ...(shopId && { shopId }) };
    if (q.method && METHODS.includes(q.method)) w.paymentMethod = q.method as PaymentMethod;
    if (q.source && SOURCES.includes(q.source)) w.source = q.source as SaleSource;
    if (q.customerId) w.customerId = q.customerId;
    if (q.staffId) w.OR = [{ soldById: q.staffId }, { soldById: null, createdById: q.staffId }];
    switch (q.status) {
      case 'voided': w.status = 'VOIDED'; break;
      case 'returned': w.status = { in: ['PARTIALLY_RETURNED', 'FULLY_RETURNED'] }; break;
      case 'credit': w.status = { not: 'VOIDED' }; w.creditAmount = { gt: 0 }; break;
      case 'active': w.status = { not: 'VOIDED' }; break;
      default: break;
    }
    const s = q.search?.trim();
    if (s) {
      const text = { contains: s, mode: 'insensitive' as const };
      const search: Prisma.SaleWhereInput[] = [
        { saleNumber: text },
        { sourceRef: text },
        { receivedByName: text },
        { customer: { OR: [{ name: text }, { phone: { contains: s } }] } },
        { items: { some: { product: { OR: [{ name: text }, { sku: text }, { barcode: s }] } } } },
      ];
      w.AND = [...((w.AND as Prisma.SaleWhereInput[]) ?? []), { OR: search }];
    }
    return w;
  }

  async list(user: AuthenticatedUser, shopId: string | undefined, q: SalesHistoryQuery) {
    const r = await this.range(user.tenantId, q.from, q.to);
    const where = this.where(user, shopId, q, r.gte, r.lt);
    const limit = Math.min(Math.max(Number(q.limit) || 50, 10), 100);
    const page = Math.max(Number(q.page) || 1, 1);
    const orderBy: Prisma.SaleOrderByWithRelationInput =
      q.sort === 'old' ? { soldAt: 'asc' } : q.sort === 'high' ? { total: 'desc' } : q.sort === 'low' ? { total: 'asc' } : { soldAt: 'desc' };
    // Money totals leave voided bills out, whatever the status filter.
    const liveWhere: Prisma.SaleWhereInput = { AND: [where, { status: { in: [...LIVE] } }] };

    const [rows, count, agg, voided, creditCount, qty, best] = await Promise.all([
      this.prisma.sale.findMany({
        where, orderBy, skip: (page - 1) * limit, take: limit,
        select: {
          id: true, saleNumber: true, soldAt: true, status: true, source: true, sourceRef: true,
          subtotal: true, discount: true, total: true, paidAmount: true, creditAmount: true, changeAmount: true,
          refundedAmount: true, paymentMethod: true, costOfGoods: true, receivedByName: true,
          customer: { select: { id: true, name: true, phone: true } },
          shop: { select: { id: true, name: true } },
          soldBy: { select: { id: true, fullName: true } },
          createdBy: { select: { id: true, fullName: true } },
          items: {
            select: {
              id: true, quantity: true, returnedQty: true, price: true, total: true,
              product: { select: { id: true, name: true, unit: true, barcode: true, sku: true } },
              variantLink: { select: { variant: { select: { name: true } } } },
            },
          },
        },
      }),
      this.prisma.sale.count({ where }),
      this.prisma.sale.aggregate({
        where: liveWhere,
        _sum: { total: true, paidAmount: true, creditAmount: true, discount: true, costOfGoods: true, changeAmount: true, refundedAmount: true },
        _count: { _all: true },
      }),
      this.prisma.sale.count({ where: { AND: [where, { status: 'VOIDED' }] } }),
      this.prisma.sale.count({ where: { AND: [liveWhere, { creditAmount: { gt: 0 } }] } }),
      this.prisma.saleItem.aggregate({ where: { sale: liveWhere }, _sum: { quantity: true, returnedQty: true }, _count: { _all: true } }),
      this.prisma.sale.findFirst({ where: liveWhere, orderBy: { total: 'desc' }, select: { id: true, saleNumber: true, total: true, soldAt: true } }),
    ]);

    const total = n(agg._sum.total);
    const cogs = n(agg._sum.costOfGoods);
    const bills = agg._count._all;
    return {
      from: r.fromKey, to: r.toKey, page, limit, count, hasMore: page * limit < count,
      items: rows.map((s) => ({
        ...s,
        staff: s.soldBy?.fullName ?? s.createdBy?.fullName ?? null,
        items: s.items.map((i) => ({
          id: i.id, productId: i.product?.id ?? null, name: i.product?.name ?? 'Item', variant: i.variantLink?.variant?.name ?? null,
          unit: i.product?.unit ?? 'pcs', barcode: i.product?.barcode ?? null, quantity: i.quantity, returnedQty: i.returnedQty,
          price: i.price, total: i.total,
        })),
      })),
      stats: {
        bills, voided, creditCount,
        total, paid: n(agg._sum.paidAmount), credit: n(agg._sum.creditAmount), discount: n(agg._sum.discount),
        change: n(agg._sum.changeAmount), refunded: n(agg._sum.refundedAmount),
        cogs, profit: total - cogs, margin: total > 0 ? ((total - cogs) / total) * 100 : 0,
        average: bills ? total / bills : 0,
        lines: qty._count._all, qty: n(qty._sum.quantity) - n(qty._sum.returnedQty),
        best,
      },
    };
  }

  async analytics(user: AuthenticatedUser, shopId: string | undefined, q: SalesHistoryQuery) {
    const r = await this.range(user.tenantId, q.from, q.to);
    const where = this.where(user, shopId, q, r.gte, r.lt);
    const live: Prisma.SaleWhereInput = { AND: [where, { status: { in: [...LIVE] } }] };

    const [sales, payments, sources, itemGroups, customerGroups, staffGroups] = await Promise.all([
      this.prisma.sale.findMany({ where: live, select: { soldAt: true, total: true, costOfGoods: true } }),
      this.prisma.sale.groupBy({ by: ['paymentMethod'], where: live, _sum: { total: true, paidAmount: true }, _count: { _all: true } }),
      this.prisma.sale.groupBy({ by: ['source'], where: live, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.saleItem.groupBy({
        by: ['productId'], where: { sale: live, productId: { not: null } },
        _sum: { quantity: true, returnedQty: true, total: true }, _count: { _all: true },
        orderBy: { _sum: { total: 'desc' } }, take: 15,
      }),
      this.prisma.sale.groupBy({
        by: ['customerId'], where: { AND: [live, { customerId: { not: null } }] },
        _sum: { total: true, creditAmount: true }, _count: { _all: true }, orderBy: { _sum: { total: 'desc' } }, take: 10,
      }),
      this.prisma.sale.groupBy({ by: ['soldById', 'createdById'], where: live, _sum: { total: true }, _count: { _all: true } }),
    ]);

    // Daily buckets for up to ~3 months, monthly beyond that.
    const first = r.fromKey ?? (sales.length ? dateKeyTz(new Date(Math.min(...sales.map((s) => s.soldAt.getTime()))), r.tz) : r.toKey);
    const spanDays = Math.round((new Date(`${r.toKey}T00:00:00Z`).getTime() - new Date(`${first}T00:00:00Z`).getTime()) / DAY) + 1;
    const monthly = spanDays > 92;
    const buckets = new Map<string, { key: string; sales: number; profit: number; bills: number }>();
    if (!monthly) {
      for (let i = 0; i < spanDays; i++) {
        const k = new Date(new Date(`${first}T00:00:00Z`).getTime() + i * DAY).toISOString().slice(0, 10);
        buckets.set(k, { key: k, sales: 0, profit: 0, bills: 0 });
      }
    }
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, sales: 0, bills: 0 }));
    const weekdays = Array.from({ length: 7 }, (_, d) => ({ day: d, sales: 0, bills: 0 }));
    const shift = r.dayStartHour * 3600_000;
    for (const s of sales) {
      const biz = new Date(s.soldAt.getTime() - shift);
      const key = monthly ? dateKeyTz(biz, r.tz).slice(0, 7) : dateKeyTz(biz, r.tz);
      const b = buckets.get(key) ?? { key, sales: 0, profit: 0, bills: 0 };
      b.sales += s.total; b.profit += s.total - s.costOfGoods; b.bills += 1;
      buckets.set(key, b);
      const h = hours[tzParts(s.soldAt, r.tz).hour]; h.sales += s.total; h.bills += 1;
      const w = weekdays[weekdayInTz(biz, r.tz)]; w.sales += s.total; w.bills += 1;
    }

    const productIds = itemGroups.map((g) => g.productId!).filter(Boolean);
    const customerIds = customerGroups.map((g) => g.customerId!).filter(Boolean);
    const staffTotals = new Map<string, { total: number; bills: number }>();
    for (const g of staffGroups) {
      const id = g.soldById ?? g.createdById;
      if (!id) continue;
      const cur = staffTotals.get(id) ?? { total: 0, bills: 0 };
      cur.total += n(g._sum.total); cur.bills += g._count._all;
      staffTotals.set(id, cur);
    }
    const [products, customers, users] = await Promise.all([
      this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, unit: true } }),
      this.prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, name: true, phone: true, balance: true } }),
      this.prisma.user.findMany({ where: { id: { in: [...staffTotals.keys()] } }, select: { id: true, fullName: true } }),
    ]);
    const pMap = new Map(products.map((p) => [p.id, p]));
    const cMap = new Map(customers.map((c) => [c.id, c]));

    return {
      from: r.fromKey ?? first, to: r.toKey, grouping: monthly ? 'month' : 'day',
      trend: [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key)),
      hours, weekdays,
      payments: payments.map((p) => ({ method: p.paymentMethod, total: n(p._sum.total), collected: n(p._sum.paidAmount), bills: p._count._all })).sort((a, b) => b.total - a.total),
      sources: sources.map((s) => ({ source: s.source, total: n(s._sum.total), bills: s._count._all })).sort((a, b) => b.total - a.total),
      topProducts: itemGroups.map((g) => {
        const p = pMap.get(g.productId!);
        return { productId: g.productId, name: p?.name ?? 'Product', unit: p?.unit ?? 'pcs', qty: n(g._sum.quantity) - n(g._sum.returnedQty), revenue: n(g._sum.total), lines: g._count._all };
      }),
      topCustomers: customerGroups.map((g) => {
        const c = cMap.get(g.customerId!);
        return { customerId: g.customerId, name: c?.name ?? 'Customer', phone: c?.phone ?? null, balance: n(c?.balance), total: n(g._sum.total), credit: n(g._sum.creditAmount), bills: g._count._all };
      }),
      staff: users.map((u) => ({ userId: u.id, name: u.fullName, ...staffTotals.get(u.id)! })).sort((a, b) => b.total - a.total),
    };
  }
}
