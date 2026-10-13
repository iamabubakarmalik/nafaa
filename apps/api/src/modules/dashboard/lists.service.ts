/**
 * Product and sale lists for dashboard widgets, with the controls the
 * widgets expose: period, sort, how many rows and category.
 *
 *   top     best sellers in the period (qty, revenue or profit)
 *   slow    in-stock products with no sale in the period
 *   low     products at or below their alert level (branch stock when a shop is picked)
 *   recent  latest bills, optionally one payment method
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { startOfBusinessDayTz, subDaysTz } from '../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import {
  KEPT_QTY, LINE_COST, LINE_COST_JOINS, LINE_REVENUE, LIVE_BILL, billMathCte, liveSaleSql,
} from '../../common/helpers/business-math.helper';
const METHODS = Object.values(PaymentMethod) as string[];

export interface ListQuery {
  kind?: string;
  days?: string;
  limit?: string;
  sort?: string;
  categoryId?: string;
  filter?: string;
  method?: string;
}

const pick = <T extends string>(v: string | undefined, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(v ?? '') ? (v as T) : fallback;

const num = (v: string | undefined, allowed: readonly number[], fallback: number) => {
  const n = Number(v);
  return allowed.includes(n) ? n : fallback;
};

const productSelect = {
  id: true, name: true, unit: true, price: true, costPrice: true,
  category: { select: { id: true, name: true } },
  images: { take: 1, select: { url: true } },
} as const;

@Injectable()
export class DashboardListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  async list(user: AuthenticatedUser, shopId: string | undefined, q: ListQuery) {
    const limit = num(q.limit, [5, 10, 20, 50], 10);
    const categoryId = q.categoryId && /^[\w-]{1,64}$/.test(q.categoryId) ? q.categoryId : undefined;
    switch (q.kind) {
      case 'top': return this.top(user, shopId, num(q.days, [1, 7, 30, 90], 30), pick(q.sort, ['qty', 'revenue', 'profit'] as const, 'revenue'), limit, categoryId);
      case 'slow': return this.slow(user, shopId, num(q.days, [30, 60, 90], 30), pick(q.sort, ['value', 'stock'] as const, 'value'), limit, categoryId);
      case 'low': return this.low(user, shopId, pick(q.filter, ['all', 'out', 'low'] as const, 'all'), limit, categoryId);
      case 'recent': return this.recent(user, shopId, limit, METHODS.includes(q.method ?? '') ? (q.method as PaymentMethod) : undefined);
      default: throw new BadRequestException('kind must be top, slow, low or recent');
    }
  }

  private async since(tenantId: string, days: number) {
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const today = startOfBusinessDayTz(new Date(), tz, dayStartHour);
    return subDaysTz(today, days - 1, tz);
  }

  private async top(user: AuthenticatedUser, shopId: string | undefined, days: number, sort: 'qty' | 'revenue' | 'profit', limit: number, categoryId?: string) {
    const from = await this.since(user.tenantId, days);
    // Revenue after the bill discount and returns, cost of what was kept: business-math.helper.
    const where = liveSaleSql({ tenantId: user.tenantId, shopId }, { gte: from });
    const rows = await this.prisma.$queryRaw<Array<{ id: string; qty: number; revenue: number; cost: number; bills: number }>>`
      WITH ${billMathCte(where)}
      SELECT si."productId" AS id, COALESCE(SUM(${KEPT_QTY}), 0)::float8 AS qty, COALESCE(SUM(${LINE_REVENUE}), 0)::float8 AS revenue,
        COALESCE(SUM(${LINE_COST}), 0)::float8 AS cost, COUNT(DISTINCT si."saleId")::int AS bills
      FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId" JOIN bm ON bm.id = s.id
      ${LINE_COST_JOINS}
      WHERE ${where} AND si."productId" IS NOT NULL ${categoryId ? Prisma.sql`AND bm_p."categoryId" = ${categoryId}` : Prisma.empty}
      GROUP BY 1`;
    const map = new Map(rows.map((r) => [r.id, r]));
    const key = { qty: (r: { qty: number }) => r.qty, revenue: (r: { revenue: number }) => r.revenue, profit: (r: { revenue: number; cost: number }) => r.revenue - r.cost }[sort];
    const ranked = [...map.entries()].sort((a, b) => key(b[1]) - key(a[1])).slice(0, limit);
    const products = await this.prisma.product.findMany({ where: { id: { in: ranked.map(([id]) => id) } }, select: productSelect });
    const byId = new Map(products.map((p) => [p.id, p]));

    return {
      kind: 'top', days, sort, total: map.size,
      items: ranked.map(([id, r]) => {
        const p = byId.get(id);
        return {
          id, name: p?.name ?? 'Product', unit: p?.unit ?? 'pcs', category: p?.category?.name ?? null,
          image: p?.images[0]?.url ?? null, qty: r.qty, revenue: r.revenue, profit: r.revenue - r.cost, bills: r.bills,
        };
      }),
    };
  }

  private async slow(user: AuthenticatedUser, shopId: string | undefined, days: number, sort: 'value' | 'stock', limit: number, categoryId?: string) {
    const from = await this.since(user.tenantId, days);
    const saleScope = { tenantId: user.tenantId, status: LIVE_BILL, ...(shopId && { shopId }) };
    const sold = await this.prisma.saleItem.findMany({
      where: { productId: { not: null }, sale: { ...saleScope, soldAt: { gte: from } } },
      select: { productId: true },
      distinct: ['productId'],
    });
    const soldIds = sold.map((s) => s.productId!);

    // Stock is per branch when a shop is picked.
    const rows = shopId
      ? (await this.prisma.shopStock.findMany({
        where: {
          shopId, isActive: true, stock: { gt: 0 }, productId: { notIn: soldIds },
          product: { isActive: true, ...(categoryId && { categoryId }) },
        },
        select: { stock: true, shopCostPrice: true, product: { select: productSelect } },
      })).map((r) => ({ ...r.product, stock: r.stock, costPrice: r.shopCostPrice ?? r.product.costPrice }))
      : await this.prisma.product.findMany({
        where: { tenantId: user.tenantId, isActive: true, stock: { gt: 0 }, id: { notIn: soldIds }, ...(categoryId && { categoryId }) },
        select: { ...productSelect, stock: true },
      });

    const valued = rows.map((p) => ({ ...p, value: p.stock * (p.costPrice || p.price || 0) }));
    valued.sort((a, b) => (sort === 'value' ? b.value - a.value : b.stock - a.stock));
    const page = valued.slice(0, limit);

    const last = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: { productId: { in: page.map((p) => p.id) }, sale: saleScope },
      _max: { createdAt: true },
    });
    const lastMap = new Map(last.map((l) => [l.productId, l._max.createdAt]));

    return {
      kind: 'slow', days, sort, total: valued.length,
      totalValue: valued.reduce((x, p) => x + p.value, 0),
      items: page.map((p) => ({
        id: p.id, name: p.name, unit: p.unit, category: p.category?.name ?? null, image: p.images[0]?.url ?? null,
        stock: p.stock, value: p.value, lastSoldAt: lastMap.get(p.id) ?? null,
      })),
    };
  }

  private async low(user: AuthenticatedUser, shopId: string | undefined, filter: 'all' | 'out' | 'low', limit: number, categoryId?: string) {
    const stockWhere = (alertField: unknown) =>
      filter === 'out' ? { lte: 0 } : filter === 'low' ? { gt: 0, lte: alertField } : { lte: alertField };

    const rows = shopId
      ? (await this.prisma.shopStock.findMany({
        where: {
          shopId, isActive: true,
          stock: stockWhere(this.prisma.shopStock.fields.lowStockAlert) as never,
          product: { isActive: true, ...(categoryId && { categoryId }) },
        },
        orderBy: { stock: 'asc' },
        take: 200,
        select: { stock: true, lowStockAlert: true, product: { select: productSelect } },
      })).map((r) => ({ ...r.product, stock: r.stock, lowStockAlert: r.lowStockAlert }))
      : await this.prisma.product.findMany({
        where: {
          tenantId: user.tenantId, isActive: true, ...(categoryId && { categoryId }),
          stock: stockWhere(this.prisma.product.fields.lowStockAlert) as never,
        },
        orderBy: { stock: 'asc' },
        take: 200,
        select: { ...productSelect, stock: true, lowStockAlert: true },
      });

    return {
      kind: 'low', filter, total: rows.length,
      outCount: rows.filter((r) => r.stock <= 0).length,
      items: rows.slice(0, limit).map((p) => ({
        id: p.id, name: p.name, unit: p.unit, category: p.category?.name ?? null, image: p.images[0]?.url ?? null,
        stock: p.stock, lowStockAlert: p.lowStockAlert, price: p.price,
      })),
    };
  }

  private async recent(user: AuthenticatedUser, shopId: string | undefined, limit: number, method?: PaymentMethod) {
    const sales = await this.prisma.sale.findMany({
      where: { tenantId: user.tenantId, status: LIVE_BILL, ...(shopId && { shopId }), ...(method && { paymentMethod: method }) },
      orderBy: { soldAt: 'desc' },
      take: limit,
      select: {
        id: true, saleNumber: true, total: true, creditAmount: true, paymentMethod: true, soldAt: true, source: true,
        customer: { select: { id: true, name: true } },
        soldBy: { select: { fullName: true } },
        createdBy: { select: { fullName: true } },
        _count: { select: { items: true } },
      },
    });
    return {
      kind: 'recent', method: method ?? null,
      items: sales.map((s) => ({
        id: s.id, saleNumber: s.saleNumber, total: s.total, credit: s.creditAmount, method: s.paymentMethod,
        soldAt: s.soldAt, source: s.source, customer: s.customer?.name ?? null,
        staff: s.soldBy?.fullName ?? s.createdBy?.fullName ?? null, items: s._count.items,
      })),
    };
  }
}
