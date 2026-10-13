/**
 * Report centre: one endpoint per section (sales, items, customers,
 * purchases, expenses, profit, tax, returns) for any business-day period,
 * scoped to the tenant and branch. Every sale, cost, expense and write-off
 * figure follows common/helpers/business-math.helper: sales net of returns
 * on the bill's own day, voided bills left out, cost from each sale line
 * (today's cost when a line has none), PAID expenses only. The returns
 * section counts returns on the day they were made. Every section also
 * returns the previous period of the same length.
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { businessDayKey } from '../../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import {
  BILL_CASH_IN, BILL_NET, KEPT_QTY, LINE_COST, LINE_COST_JOINS, LINE_FALLBACK, LINE_NO_COST, LINE_REVENUE, RETURN_LINE_COST,
  billMathCte, emptySaleFigures, foldWriteOffs, netProfit, paidExpenseSql, paidExpenseWhere, saleFiguresBy, writeOffRows,
  type SaleFigures,
} from '../../../common/helpers/business-math.helper';
import { ShopScope } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import {
  DAY, LIVE_SALE, bizTime, bucketKeys, localTime, num, r2, reportRange, saleSql, within,
  type ReportQuery, type ReportRange,
} from './report-range';

const PURCHASE_ACTIVE = ['RECEIVED', 'PARTIAL'] as const;

@Injectable()
export class ReportsCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  private range(user: AuthenticatedUser, q: ReportQuery) {
    return reportRange(this.tz, user.tenantId, q);
  }

  private async saleTotals(user: AuthenticatedUser, scope: ShopScope, r: { gte: Date | null; lt: Date }): Promise<SaleFigures> {
    return (await saleFiguresBy(this.prisma, saleSql(user.tenantId, scope, r))).get('all') ?? emptySaleFigures();
  }

  /** Net sales, cost and gross profit of grouped bill rows. */
  private static net(t: { gross: number; refunds: number; cost: number }) {
    const net = num(t.gross) - num(t.refunds);
    const cost = num(t.cost);
    return { net: r2(net), cost: r2(cost), profit: r2(net - cost) };
  }

  private meta(r: ReportRange, first?: string | null) {
    return { from: r.fromKey ?? first ?? r.toKey, to: r.toKey, grouping: r.monthly ? 'month' : 'day' };
  }

  private async firstSaleKey(user: AuthenticatedUser, scope: ShopScope, r: ReportRange) {
    if (r.fromKey) return null;
    const first = await this.prisma.sale.findFirst({ where: { tenantId: user.tenantId, ...scope.where }, orderBy: { soldAt: 'asc' }, select: { soldAt: true } });
    return first ? businessDayKey(first.soldAt, r.tz, r.dayStartHour) : null;
  }

  // ─── Bikri ────────────────────────────────────────────────

  async sales(user: AuthenticatedUser, scope: ShopScope, q: ReportQuery) {
    const r = await this.range(user, q);
    const where = saleSql(user.tenantId, scope, r);
    const bm = billMathCte(where);
    const biz = bizTime(Prisma.sql`s."soldAt"`, r);
    const loc = localTime(Prisma.sql`s."soldAt"`, r);

    type Grid = { day: string; hour: number; bills: number; gross: number; refunds: number; cost: number };
    type Group = { id: string | null; bills: number; gross: number; refunds: number; cost: number; cashin: number };
    const groupBy = (col: Prisma.Sql) => this.prisma.$queryRaw<Group[]>`
      WITH ${bm}
      SELECT ${col} AS id, COUNT(*)::int AS bills, SUM(s.total)::float AS gross, SUM(s."refundedAmount")::float AS refunds,
        SUM(bm.cost)::float AS cost, SUM(${BILL_CASH_IN})::float AS cashin
      FROM "Sale" s JOIN bm ON bm.id = s.id
      WHERE ${where}
      GROUP BY 1`;

    // Payment methods: a split bill's sale and cost are shared out by its
    // payment rows; a bill with no rows (full udhaar) goes to its main method.
    const byMethod = this.prisma.$queryRaw<Group[]>`
      WITH ${bm}, parts AS (
        SELECT sp."saleId", sp.method::text AS method, SUM(sp.amount) AS amount
        FROM "SalePayment" sp JOIN "Sale" s ON s.id = sp."saleId"
        WHERE ${where}
        GROUP BY 1, 2
      ), shares AS (
        SELECT s.id, COALESCE(p.method, s."paymentMethod"::text) AS method,
          COALESCE(p.amount / NULLIF(SUM(p.amount) OVER (PARTITION BY s.id), 0), 1) AS k,
          CASE WHEN p.method = 'TRADE_IN' THEN 0 ELSE COALESCE(p.amount, 0) END AS money
        FROM "Sale" s LEFT JOIN parts p ON p."saleId" = s.id
        WHERE ${where}
      )
      SELECT sh.method AS id, COUNT(DISTINCT s.id)::int AS bills, SUM(s.total * sh.k)::float AS gross,
        SUM(s."refundedAmount" * sh.k)::float AS refunds, SUM(bm.cost * sh.k)::float AS cost, SUM(sh.money)::float AS cashin
      FROM shares sh JOIN "Sale" s ON s.id = sh.id JOIN bm ON bm.id = s.id
      GROUP BY 1`;

    const [totals, prev, grid, payments, staff, channels, shops, voided, items, customers, first] = await Promise.all([
      this.saleTotals(user, scope, r),
      r.prev ? this.saleTotals(user, scope, r.prev) : Promise.resolve(null),
      this.prisma.$queryRaw<Grid[]>`
        WITH ${bm}
        SELECT to_char(${biz}, 'YYYY-MM-DD') AS day, EXTRACT(HOUR FROM ${loc})::int AS hour, COUNT(*)::int AS bills,
          SUM(s.total)::float AS gross, SUM(s."refundedAmount")::float AS refunds, SUM(bm.cost)::float AS cost
        FROM "Sale" s JOIN bm ON bm.id = s.id
        WHERE ${where}
        GROUP BY 1, 2`,
      byMethod,
      groupBy(Prisma.sql`COALESCE(s."soldById", s."createdById")`),
      groupBy(Prisma.sql`s.source::text`),
      scope.isAll ? groupBy(Prisma.sql`s."shopId"`) : Promise.resolve([] as Group[]),
      this.prisma.$queryRaw<Array<{ bills: number; value: number }>>`
        SELECT COUNT(*)::int AS bills, COALESCE(SUM(s.total), 0)::float AS value FROM "Sale" s WHERE ${saleSql(user.tenantId, scope, r, ['VOIDED'])}`,
      this.prisma.$queryRaw<Array<{ qty: number; lines: number }>>`
        SELECT COALESCE(SUM(${KEPT_QTY}), 0)::float AS qty, COUNT(*)::int AS lines
        FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId" WHERE ${where}`,
      this.prisma.$queryRaw<Array<{ named: number; customers: number }>>`
        SELECT COUNT(*) FILTER (WHERE s."customerId" IS NOT NULL)::int AS named, COUNT(DISTINCT s."customerId")::int AS customers
        FROM "Sale" s WHERE ${where}`,
      this.firstSaleKey(user, scope, r),
    ]);

    // Buckets, hours, weekdays and the busy-time grid from one pass over the day × hour rows.
    const keys = bucketKeys(r, first);
    const trend = new Map(keys.map((k) => [k, { key: k, net: 0, profit: 0, bills: 0 }]));
    const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, net: 0, bills: 0 }));
    const weekdays = Array.from({ length: 7 }, (_, day) => ({ day, net: 0, bills: 0 }));
    const heatmap = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    for (const g of grid) {
      const v = ReportsCenterService.net(g);
      const key = r.monthly ? g.day.slice(0, 7) : g.day;
      const b = trend.get(key) ?? { key, net: 0, profit: 0, bills: 0 };
      b.net += v.net; b.profit += v.profit; b.bills += g.bills;
      trend.set(key, b);
      const h = hours[g.hour] ?? hours[0];
      h.net += v.net; h.bills += g.bills;
      const dow = new Date(`${g.day}T12:00:00Z`).getUTCDay();
      weekdays[dow].net += v.net; weekdays[dow].bills += g.bills;
      heatmap[dow][g.hour] += g.bills;
    }

    const userIds = staff.map((x) => x.id).filter((x): x is string => !!x);
    const shopIds = shops.map((x) => x.id).filter((x): x is string => !!x);
    const [users, shopRows] = await Promise.all([
      userIds.length ? this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } }) : [],
      shopIds.length ? this.prisma.shop.findMany({ where: { id: { in: shopIds } }, select: { id: true, name: true } }) : [],
    ]);
    const userName = new Map(users.map((u) => [u.id, u.fullName]));
    const shopName = new Map(shopRows.map((s) => [s.id, s.name]));
    const groupRow = (g: Group) => { const v = ReportsCenterService.net(g); return { bills: g.bills, net: v.net, profit: v.profit, cashIn: r2(g.cashin) }; };

    const t = ReportsCenterService.net(totals);
    const p = prev ? ReportsCenterService.net(prev) : null;
    return {
      ...this.meta(r, first),
      totals: {
        bills: totals.bills, gross: r2(totals.gross), refunds: r2(totals.refunds), net: t.net, cost: t.cost, profit: t.profit,
        margin: t.net > 0 ? r2((t.profit / t.net) * 100) : 0,
        cashIn: totals.cashIn, credit: r2(totals.credit), discount: r2(totals.discount), service: r2(totals.service),
        average: totals.bills ? r2(t.net / totals.bills) : 0,
        qty: r2(num(items[0]?.qty)), lines: num(items[0]?.lines),
        fallbackLines: totals.fallbackLines, noCostLines: totals.noCostLines,
        customers: num(customers[0]?.customers), walkInBills: totals.bills - num(customers[0]?.named),
        voidedBills: num(voided[0]?.bills), voidedValue: r2(num(voided[0]?.value)),
      },
      previous: prev && p ? { bills: prev.bills, net: p.net, profit: p.profit, cashIn: prev.cashIn, credit: prev.credit, average: prev.bills ? r2(p.net / prev.bills) : 0 } : null,
      trend: [...trend.values()].map((b) => ({ ...b, net: r2(b.net), profit: r2(b.profit) })),
      hours: hours.map((h) => ({ ...h, net: r2(h.net) })),
      weekdays: weekdays.map((w) => ({ ...w, net: r2(w.net) })),
      heatmap,
      payments: payments.map((g) => ({ method: g.id ?? 'CASH', ...groupRow(g) })).sort((a, b) => b.net - a.net),
      staff: staff.map((g) => ({ id: g.id, name: (g.id && userName.get(g.id)) || 'Na-maloom', ...groupRow(g) })).sort((a, b) => b.net - a.net),
      channels: channels.map((g) => ({ source: g.id ?? 'POS', ...groupRow(g) })).sort((a, b) => b.net - a.net),
      shops: shops.map((g) => ({ id: g.id, name: (g.id && shopName.get(g.id)) || 'Baghair branch', ...groupRow(g) })).sort((a, b) => b.net - a.net),
    };
  }

  // ─── Maal ─────────────────────────────────────────────────

  async items(user: AuthenticatedUser, scope: ShopScope, q: ReportQuery) {
    const r = await this.range(user, q);
    const where = saleSql(user.tenantId, scope, r);
    type Line = { id: string; qty: number; revenue: number; cost: number; bills: number; nocost: number; fallback: number };
    type Slow = { id: string; name: string; unit: string; stock: number; stockValue: number; lastSold: Date | null; count: number; totalValue: number };

    const stockJoin = scope.shopId
      ? Prisma.sql`JOIN (SELECT "productId", SUM(stock) AS stock FROM "ShopStock" WHERE "shopId" = ${scope.shopId} GROUP BY 1) st ON st."productId" = p.id`
      : Prisma.sql`JOIN (SELECT p2.id AS "productId", p2.stock FROM "Product" p2 WHERE p2."tenantId" = ${user.tenantId}) st ON st."productId" = p.id`;

    const [lines, slow] = await Promise.all([
      this.prisma.$queryRaw<Line[]>`
        WITH ${billMathCte(where)}
        SELECT si."productId" AS id, SUM(${KEPT_QTY})::float AS qty,
          SUM(${LINE_REVENUE})::float AS revenue,
          SUM(${LINE_COST})::float AS cost,
          COUNT(DISTINCT si."saleId")::int AS bills,
          COUNT(*) FILTER (WHERE ${LINE_NO_COST})::int AS nocost,
          COUNT(*) FILTER (WHERE ${LINE_FALLBACK})::int AS fallback
        FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId" JOIN bm ON bm.id = s.id
        ${LINE_COST_JOINS}
        WHERE ${where} AND si."productId" IS NOT NULL
        GROUP BY si."productId"`,
      this.prisma.$queryRaw<Slow[]>`
        SELECT p.id, p.name, p.unit, st.stock::float AS stock, (st.stock * p."costPrice")::float AS "stockValue",
          (SELECT MAX(s2."soldAt") FROM "SaleItem" si2 JOIN "Sale" s2 ON s2.id = si2."saleId"
            WHERE si2."productId" = p.id AND s2.status::text IN (${Prisma.join([...LIVE_SALE])})) AS "lastSold",
          COUNT(*) OVER()::int AS count, SUM(st.stock * p."costPrice") OVER()::float AS "totalValue"
        FROM "Product" p ${stockJoin}
        WHERE p."tenantId" = ${user.tenantId} AND p."isActive" = true AND p."isRawMaterial" = false AND st.stock > 0
          AND NOT EXISTS (SELECT 1 FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId" WHERE si."productId" = p.id AND ${where})
        ORDER BY "stockValue" DESC
        LIMIT 30`,
    ]);

    const products = lines.length
      ? await this.prisma.product.findMany({
          where: { id: { in: lines.map((l) => l.id) } },
          select: { id: true, name: true, unit: true, sku: true, categoryId: true, brandId: true },
        })
      : [];
    const pMap = new Map(products.map((p) => [p.id, p]));
    const catIds = [...new Set(products.map((p) => p.categoryId).filter((x): x is string => !!x))];
    const brandIds = [...new Set(products.map((p) => p.brandId).filter((x): x is string => !!x))];
    const [cats, brands] = await Promise.all([
      catIds.length ? this.prisma.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true, color: true } }) : [],
      brandIds.length ? this.prisma.brand.findMany({ where: { id: { in: brandIds } }, select: { id: true, name: true } }) : [],
    ]);
    const catMap = new Map(cats.map((c) => [c.id, c]));
    const brandMap = new Map(brands.map((b) => [b.id, b]));

    const rows = lines.map((l) => {
      const p = pMap.get(l.id);
      const revenue = r2(l.revenue);
      const cost = r2(l.cost);
      return {
        id: l.id, name: p?.name ?? 'Product', unit: p?.unit ?? 'pcs', sku: p?.sku ?? null,
        category: p?.categoryId ? catMap.get(p.categoryId)?.name ?? null : null,
        brand: p?.brandId ? brandMap.get(p.brandId)?.name ?? null : null,
        qty: r2(l.qty), revenue, cost, profit: r2(revenue - cost), margin: revenue > 0 ? r2(((revenue - cost) / revenue) * 100) : 0,
        bills: l.bills,
        _cat: p?.categoryId ?? null, _brand: p?.brandId ?? null,
      };
    });

    type Agg = { id: string | null; name: string; color: string | null; revenue: number; cost: number; profit: number; qty: number; products: number };
    const fold = (pick: (x: (typeof rows)[number]) => string | null, label: (id: string) => { name: string; color: string | null }, none: string) => {
      const m = new Map<string, Agg>();
      for (const x of rows) {
        const id = pick(x);
        const key = id ?? 'none';
        const a = m.get(key) ?? { id, ...(id ? label(id) : { name: none, color: null }), revenue: 0, cost: 0, profit: 0, qty: 0, products: 0 };
        a.revenue += x.revenue; a.cost += x.cost; a.profit += x.profit; a.qty += x.qty; a.products += 1;
        m.set(key, a);
      }
      return [...m.values()].map((a) => ({ ...a, revenue: r2(a.revenue), cost: r2(a.cost), profit: r2(a.profit), qty: r2(a.qty) })).sort((a, b) => b.revenue - a.revenue);
    };
    const clean = rows.map(({ _cat, _brand, ...x }) => x);
    const by = <K extends 'revenue' | 'profit' | 'qty'>(k: K) => [...clean].sort((a, b) => b[k] - a[k]).slice(0, 25);

    return {
      ...this.meta(r),
      totals: {
        products: rows.length,
        revenue: r2(rows.reduce((s, x) => s + x.revenue, 0)),
        cost: r2(rows.reduce((s, x) => s + x.cost, 0)),
        profit: r2(rows.reduce((s, x) => s + x.profit, 0)),
        qty: r2(rows.reduce((s, x) => s + x.qty, 0)),
        noCostLines: lines.reduce((s, l) => s + l.nocost, 0),
        fallbackLines: lines.reduce((s, l) => s + l.fallback, 0),
        slowCount: num(slow[0]?.count),
        stockValue: r2(num(slow[0]?.totalValue)),
      },
      topRevenue: by('revenue'),
      topProfit: by('profit'),
      topQty: by('qty'),
      lowest: [...clean].sort((a, b) => a.revenue - b.revenue).slice(0, 15),
      slow: slow.map((s) => ({ id: s.id, name: s.name, unit: s.unit, stock: r2(s.stock), stockValue: r2(s.stockValue), lastSold: s.lastSold })),
      categories: fold((x) => x._cat, (id) => ({ name: catMap.get(id)?.name ?? 'Category', color: catMap.get(id)?.color ?? null }), 'Baghair category'),
      brands: fold((x) => x._brand, (id) => ({ name: brandMap.get(id)?.name ?? 'Brand', color: null }), 'Baghair brand'),
    };
  }

  // ─── Customers ────────────────────────────────────────────

  async customers(user: AuthenticatedUser, scope: ShopScope, q: ReportQuery) {
    const r = await this.range(user, q);
    const where = saleSql(user.tenantId, scope, r);
    type Mix = { customers: number; newCount: number; newValue: number; returning: number; returningValue: number; repeat: number; named: number; walkin: number; walkinBills: number };
    type Top = { id: string; bills: number; net: number; last: Date };
    const firstBefore = r.gte ?? new Date(0);

    const ledgerShop = scope.shopId ? { shopId: scope.shopId } : {};
    const [mixRows, top, totals, prevTotals, signups, recovered] = await Promise.all([
      this.prisma.$queryRaw<Mix[]>`
        WITH p AS (
          SELECT s."customerId" AS id, COUNT(*)::int AS bills, SUM(${BILL_NET}) AS net
          FROM "Sale" s WHERE ${where} AND s."customerId" IS NOT NULL GROUP BY 1),
        f AS (
          SELECT s."customerId" AS id, MIN(s."soldAt") AS first
          FROM "Sale" s
          WHERE s."tenantId" = ${user.tenantId} AND s.status::text IN (${Prisma.join([...LIVE_SALE])})
            ${scope.shopId ? Prisma.sql`AND s."shopId" = ${scope.shopId}` : Prisma.empty}
            AND s."customerId" IN (SELECT id FROM p)
          GROUP BY 1),
        w AS (SELECT COUNT(*)::int AS bills, COALESCE(SUM(${BILL_NET}), 0)::float AS net FROM "Sale" s WHERE ${where} AND s."customerId" IS NULL)
        SELECT COUNT(p.id)::int AS customers,
          COUNT(p.id) FILTER (WHERE f.first >= ${firstBefore})::int AS "newCount",
          COALESCE(SUM(p.net) FILTER (WHERE f.first >= ${firstBefore}), 0)::float AS "newValue",
          COUNT(p.id) FILTER (WHERE f.first < ${firstBefore})::int AS returning,
          COALESCE(SUM(p.net) FILTER (WHERE f.first < ${firstBefore}), 0)::float AS "returningValue",
          COUNT(p.id) FILTER (WHERE p.bills > 1)::int AS repeat,
          COALESCE(SUM(p.net), 0)::float AS named,
          (SELECT net FROM w) AS walkin, (SELECT bills FROM w) AS "walkinBills"
        FROM p LEFT JOIN f ON f.id = p.id`,
      this.prisma.$queryRaw<Top[]>`
        SELECT s."customerId" AS id, COUNT(*)::int AS bills, SUM(${BILL_NET})::float AS net, MAX(s."soldAt") AS last
        FROM "Sale" s WHERE ${where} AND s."customerId" IS NOT NULL
        GROUP BY 1 ORDER BY net DESC LIMIT 20`,
      this.saleTotals(user, scope, r),
      r.prev ? this.saleTotals(user, scope, r.prev) : Promise.resolve(null),
      this.prisma.customer.count({ where: { tenantId: user.tenantId, ...(scope.shopId && { shopId: scope.shopId }), createdAt: within(r) } }),
      this.prisma.customerLedger.aggregate({
        where: { tenantId: user.tenantId, ...ledgerShop, type: 'PAYMENT_RECEIVED', createdAt: within(r) },
        _sum: { amount: true }, _count: { _all: true },
      }),
    ]);

    // Who owes money now: the customer balance for all branches, the branch's own ledger otherwise.
    let owing: Array<{ id: string; balance: number }>;
    if (scope.shopId) {
      const g = await this.prisma.customerLedger.groupBy({ by: ['customerId'], where: { tenantId: user.tenantId, shopId: scope.shopId }, _sum: { amount: true } });
      owing = g.map((x) => ({ id: x.customerId, balance: num(x._sum.amount) })).filter((x) => x.balance > 0.01);
    } else {
      const c = await this.prisma.customer.findMany({ where: { tenantId: user.tenantId, balance: { gt: 0.01 } }, select: { id: true, balance: true } });
      owing = c.map((x) => ({ id: x.id, balance: x.balance }));
    }
    const owingIds = owing.map((o) => o.id);
    const [lastPay, firstEntry] = owingIds.length
      ? await Promise.all([
          this.prisma.customerLedger.groupBy({ by: ['customerId'], where: { tenantId: user.tenantId, ...ledgerShop, customerId: { in: owingIds }, type: 'PAYMENT_RECEIVED' }, _max: { createdAt: true } }),
          this.prisma.customerLedger.groupBy({ by: ['customerId'], where: { tenantId: user.tenantId, ...ledgerShop, customerId: { in: owingIds } }, _min: { createdAt: true } }),
        ])
      : [[], []];
    const payAt = new Map(lastPay.map((x) => [x.customerId, x._max.createdAt]));
    const firstAt = new Map(firstEntry.map((x) => [x.customerId, x._min.createdAt]));
    const now = Date.now();
    const debtors = owing.map((o) => {
      const since = payAt.get(o.id) ?? firstAt.get(o.id) ?? null;
      return { ...o, lastPayment: payAt.get(o.id) ?? null, days: since ? Math.floor((now - since.getTime()) / DAY) : null };
    }).sort((a, b) => b.balance - a.balance);
    const aging = [
      { key: '0-30', label: '30 din tak', min: 0, max: 30 },
      { key: '31-60', label: '31–60 din', min: 31, max: 60 },
      { key: '61-90', label: '61–90 din', min: 61, max: 90 },
      { key: '90+', label: '90 din se zyada', min: 91, max: Infinity },
    ].map((b) => {
      const inB = debtors.filter((d) => (d.days ?? 0) >= b.min && (d.days ?? 0) <= b.max);
      return { key: b.key, label: b.label, count: inB.length, amount: r2(inB.reduce((s, d) => s + d.balance, 0)) };
    });

    const needIds = [...new Set([...top.map((t) => t.id), ...debtors.slice(0, 25).map((d) => d.id)])];
    const people = needIds.length
      ? await this.prisma.customer.findMany({ where: { id: { in: needIds } }, select: { id: true, name: true, phone: true, balance: true } })
      : [];
    const who = new Map(people.map((p) => [p.id, p]));
    const mix = mixRows[0];

    return {
      ...this.meta(r),
      totals: {
        customers: num(mix?.customers), newCount: num(mix?.newCount), newValue: r2(num(mix?.newValue)),
        returning: num(mix?.returning), returningValue: r2(num(mix?.returningValue)), repeat: num(mix?.repeat),
        namedValue: r2(num(mix?.named)), walkInValue: r2(num(mix?.walkin)), walkInBills: num(mix?.walkinBills),
        signups,
        creditGiven: r2(totals.credit), recovered: r2(Math.abs(num(recovered._sum.amount))), payments: recovered._count._all,
        outstanding: r2(debtors.reduce((s, d) => s + d.balance, 0)), debtors: debtors.length,
      },
      previous: prevTotals ? { creditGiven: r2(prevTotals.credit), bills: prevTotals.bills } : null,
      top: top.map((t) => ({ id: t.id, name: who.get(t.id)?.name ?? 'Customer', phone: who.get(t.id)?.phone ?? null, bills: t.bills, net: r2(t.net), last: t.last, balance: r2(who.get(t.id)?.balance ?? 0) })),
      debtors: debtors.slice(0, 25).map((d) => ({ id: d.id, name: who.get(d.id)?.name ?? 'Customer', phone: who.get(d.id)?.phone ?? null, balance: r2(d.balance), lastPayment: d.lastPayment, days: d.days })),
      aging,
    };
  }

  // ─── Kharidari ────────────────────────────────────────────

  async purchases(user: AuthenticatedUser, scope: ShopScope, q: ReportQuery) {
    const r = await this.range(user, q);
    const base = { tenantId: user.tenantId, ...scope.where, status: { in: [...PURCHASE_ACTIVE] } } as Prisma.PurchaseWhereInput;
    const where: Prisma.PurchaseWhereInput = { ...base, purchasedAt: within(r) };
    const sumOf = (w: Prisma.PurchaseWhereInput) => this.prisma.purchase.aggregate({ where: w, _sum: { receivedValue: true, paidAmount: true, returnedAmount: true, taxAmount: true }, _count: { _all: true } });
    const pSql = Prisma.sql`p."tenantId" = ${user.tenantId} AND p.status::text IN (${Prisma.join([...PURCHASE_ACTIVE])})
      ${scope.shopId ? Prisma.sql`AND p."shopId" = ${scope.shopId}` : Prisma.empty}
      ${r.gte ? Prisma.sql`AND p."purchasedAt" >= ${r.gte}` : Prisma.empty} AND p."purchasedAt" < ${r.lt}`;
    const biz = bizTime(Prisma.sql`p."purchasedAt"`, r);

    const [agg, prev, bySupplier, items, trend, returns, dues] = await Promise.all([
      sumOf(where),
      r.prev ? sumOf({ ...base, purchasedAt: within(r.prev) }) : Promise.resolve(null),
      this.prisma.purchase.groupBy({ by: ['supplierId'], where, _sum: { receivedValue: true, paidAmount: true }, _count: { _all: true }, orderBy: { _sum: { receivedValue: 'desc' } }, take: 20 }),
      this.prisma.$queryRaw<Array<{ name: string; qty: number; value: number; bills: number }>>`
        SELECT MAX(pi."itemName") AS name,
          SUM(CASE WHEN pi."baseQuantity" > 0 THEN pi."receivedQty" ELSE pi.quantity * pi."conversionRate" END)::float AS qty,
          SUM(CASE WHEN pi."baseQuantity" > 0 THEN pi.total * pi."receivedQty" / pi."baseQuantity" ELSE pi.total END)::float AS value,
          COUNT(DISTINCT pi."purchaseId")::int AS bills
        FROM "PurchaseItem" pi JOIN "Purchase" p ON p.id = pi."purchaseId"
        WHERE ${pSql}
        GROUP BY COALESCE(pi."productId", pi."ingredientId", lower(pi."itemName"))
        ORDER BY value DESC LIMIT 20`,
      this.prisma.$queryRaw<Array<{ day: string; value: number; paid: number; bills: number }>>`
        SELECT to_char(${biz}, 'YYYY-MM-DD') AS day, SUM(p."receivedValue")::float AS value, SUM(p."paidAmount")::float AS paid, COUNT(*)::int AS bills
        FROM "Purchase" p WHERE ${pSql} GROUP BY 1`,
      this.prisma.purchaseReturn.aggregate({ where: { tenantId: user.tenantId, ...scope.where, createdAt: within(r) }, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.supplier.findMany({ where: { tenantId: user.tenantId, outstandingDue: { gt: 0.01 } }, orderBy: { outstandingDue: 'desc' }, take: 20, select: { id: true, name: true, phone: true, outstandingDue: true } }),
    ]);
    const [dueTotal, suppliers] = await Promise.all([
      this.prisma.supplier.aggregate({ where: { tenantId: user.tenantId, outstandingDue: { gt: 0.01 } }, _sum: { outstandingDue: true }, _count: { _all: true } }),
      bySupplier.length ? this.prisma.supplier.findMany({ where: { id: { in: bySupplier.map((s) => s.supplierId) } }, select: { id: true, name: true } }) : [],
    ]);
    const sName = new Map(suppliers.map((s) => [s.id, s.name]));
    const value = num(agg._sum.receivedValue);
    const paid = num(agg._sum.paidAmount);
    const first = trend.length ? trend.map((t) => t.day).sort()[0] : null;
    const buckets = new Map(bucketKeys(r, first).map((k) => [k, { key: k, value: 0, paid: 0, bills: 0 }]));
    for (const t of trend) {
      const k = r.monthly ? t.day.slice(0, 7) : t.day;
      const b = buckets.get(k) ?? { key: k, value: 0, paid: 0, bills: 0 };
      b.value += t.value; b.paid += t.paid; b.bills += t.bills;
      buckets.set(k, b);
    }

    return {
      ...this.meta(r, first),
      totals: {
        bills: agg._count._all, value: r2(value), paid: r2(paid), credit: r2(Math.max(0, value - paid)), tax: r2(num(agg._sum.taxAmount)),
        returned: r2(num(returns._sum.total)), returns: returns._count._all,
        dueTotal: r2(num(dueTotal._sum.outstandingDue)), dueSuppliers: dueTotal._count._all,
        average: agg._count._all ? r2(value / agg._count._all) : 0,
      },
      previous: prev ? { bills: prev._count._all, value: r2(num(prev._sum.receivedValue)), paid: r2(num(prev._sum.paidAmount)) } : null,
      trend: [...buckets.values()].map((b) => ({ ...b, value: r2(b.value), paid: r2(b.paid) })),
      suppliers: bySupplier.map((s) => ({
        id: s.supplierId, name: sName.get(s.supplierId) ?? 'Supplier', bills: s._count._all,
        value: r2(num(s._sum.receivedValue)), paid: r2(num(s._sum.paidAmount)),
        share: value > 0 ? r2((num(s._sum.receivedValue) / value) * 100) : 0,
      })),
      items: items.map((i) => ({ name: i.name, qty: r2(i.qty), value: r2(i.value), bills: i.bills })),
      dues: dues.map((d) => ({ id: d.id, name: d.name, phone: d.phone, due: r2(d.outstandingDue) })),
    };
  }

  // ─── Kharche ──────────────────────────────────────────────

  async expenses(user: AuthenticatedUser, scope: ShopScope, q: ReportQuery) {
    const r = await this.range(user, q);
    // Paid expenses only; bills still to pay are shown apart as `pending`.
    const mathScope = { tenantId: user.tenantId, shopId: scope.shopId };
    const where = paidExpenseWhere(mathScope, r);
    const eSql = paidExpenseSql(mathScope, r);
    const biz = bizTime(Prisma.sql`e."expenseDate"`, r);

    const [agg, prev, byCat, pending, byMethod, biggest, trend, sales] = await Promise.all([
      this.prisma.expense.aggregate({ where, _sum: { amount: true }, _count: { _all: true } }),
      r.prev ? this.prisma.expense.aggregate({ where: paidExpenseWhere(mathScope, r.prev), _sum: { amount: true }, _count: { _all: true } }) : Promise.resolve(null),
      this.prisma.expense.groupBy({ by: ['categoryId'], where, _sum: { amount: true }, _count: { _all: true } }),
      this.prisma.expense.aggregate({ where: { tenantId: user.tenantId, ...scope.where, status: 'PENDING', expenseDate: within(r) }, _sum: { amount: true }, _count: { _all: true } }),
      this.prisma.expense.groupBy({ by: ['paymentMethod'], where, _sum: { amount: true }, _count: { _all: true } }),
      this.prisma.expense.findMany({
        where, orderBy: { amount: 'desc' }, take: 15,
        select: { id: true, title: true, amount: true, expenseDate: true, status: true, category: { select: { name: true } } },
      }),
      this.prisma.$queryRaw<Array<{ day: string; amount: number; count: number }>>`
        SELECT to_char(${biz}, 'YYYY-MM-DD') AS day, SUM(e.amount)::float AS amount, COUNT(*)::int AS count
        FROM "Expense" e WHERE ${eSql} GROUP BY 1`,
      this.saleTotals(user, scope, r),
    ]);
    const catIds = byCat.map((c) => c.categoryId).filter((x): x is string => !!x);
    const cats = catIds.length ? await this.prisma.expenseCategory.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true, color: true } }) : [];
    const cMap = new Map(cats.map((c) => [c.id, c]));
    const total = num(agg._sum.amount);
    const first = trend.length ? trend.map((t) => t.day).sort()[0] : null;
    const buckets = new Map(bucketKeys(r, first).map((k) => [k, { key: k, amount: 0, count: 0 }]));
    for (const t of trend) {
      const k = r.monthly ? t.day.slice(0, 7) : t.day;
      const b = buckets.get(k) ?? { key: k, amount: 0, count: 0 };
      b.amount += t.amount; b.count += t.count;
      buckets.set(k, b);
    }
    const net = ReportsCenterService.net(sales).net;

    return {
      ...this.meta(r, first),
      totals: {
        count: agg._count._all, amount: r2(total),
        pending: r2(num(pending._sum.amount)), pendingCount: pending._count._all,
        perDay: r2(total / Math.max(1, buckets.size * (r.monthly ? 30 : 1))),
        ofSales: net > 0 ? r2((total / net) * 100) : 0,
      },
      previous: prev ? { count: prev._count._all, amount: r2(num(prev._sum.amount)) } : null,
      trend: [...buckets.values()].map((b) => ({ ...b, amount: r2(b.amount) })),
      categories: byCat.map((c) => ({
        id: c.categoryId, name: c.categoryId ? cMap.get(c.categoryId)?.name ?? 'Category' : 'Baghair category',
        color: c.categoryId ? cMap.get(c.categoryId)?.color ?? null : null,
        amount: r2(num(c._sum.amount)), count: c._count._all, share: total > 0 ? r2((num(c._sum.amount) / total) * 100) : 0,
      })).sort((a, b) => b.amount - a.amount),
      methods: byMethod.map((m) => ({ method: m.paymentMethod, amount: r2(num(m._sum.amount)), count: m._count._all })).sort((a, b) => b.amount - a.amount),
      biggest: biggest.map((e) => ({ id: e.id, title: e.title, amount: r2(e.amount), date: e.expenseDate, status: e.status, category: e.category?.name ?? null })),
    };
  }

  // ─── Munafa ───────────────────────────────────────────────

  async profit(user: AuthenticatedUser, scope: ShopScope, q: ReportQuery) {
    const r = await this.range(user, q);
    const where = saleSql(user.tenantId, scope, r);
    const mathScope = { tenantId: user.tenantId, shopId: scope.shopId };
    const dayKey = (at: Prisma.Sql) => Prisma.sql`to_char(${bizTime(at, r)}, 'YYYY-MM-DD')`;

    const [cur, prev, exp, prevExp, losses, prevLosses, saleDays, expDays, first] = await Promise.all([
      this.saleTotals(user, scope, r),
      r.prev ? this.saleTotals(user, scope, r.prev) : Promise.resolve(null),
      this.prisma.expense.aggregate({ where: paidExpenseWhere(mathScope, r), _sum: { amount: true } }),
      r.prev ? this.prisma.expense.aggregate({ where: paidExpenseWhere(mathScope, r.prev), _sum: { amount: true } }) : Promise.resolve(null),
      writeOffRows(this.prisma, mathScope, r, { key: (at) => dayKey(at) }),
      r.prev ? writeOffRows(this.prisma, mathScope, r.prev) : Promise.resolve([]),
      saleFiguresBy(this.prisma, where, dayKey(Prisma.sql`s."soldAt"`)),
      this.prisma.$queryRaw<Array<{ day: string; amount: number }>>`
        SELECT ${dayKey(Prisma.sql`e."expenseDate"`)} AS day, SUM(e.amount)::float AS amount
        FROM "Expense" e WHERE ${paidExpenseSql(mathScope, r)} GROUP BY 1`,
      this.firstSaleKey(user, scope, r),
    ]);

    const rows = new Map(bucketKeys(r, first).map((k) => [k, { key: k, sales: 0, cost: 0, expenses: 0, damage: 0 }]));
    const bucket = (day: string) => {
      const k = r.monthly ? day.slice(0, 7) : day;
      const b = rows.get(k) ?? { key: k, sales: 0, cost: 0, expenses: 0, damage: 0 };
      rows.set(k, b);
      return b;
    };
    for (const [day, f] of saleDays) { const b = bucket(day); b.sales += f.net; b.cost += f.cost; }
    for (const d of expDays) bucket(d.day).expenses += d.amount;
    for (const w of losses) bucket(w.k).damage += foldWriteOffs([w]).net;

    const summary = (t: SaleFigures, expenses: number, loss: number) => {
      const net = netProfit(t.grossProfit, expenses, loss);
      return {
        sales: t.net, gross: t.gross, refunds: t.refunds, discount: t.discount, cost: t.cost, grossProfit: t.grossProfit,
        margin: t.net > 0 ? r2((t.grossProfit / t.net) * 100) : 0,
        expenses: r2(expenses), damage: r2(loss), netProfit: net,
        netMargin: t.net > 0 ? r2((net / t.net) * 100) : 0,
      };
    };
    const w = foldWriteOffs(losses);
    return {
      ...this.meta(r, first),
      totals: {
        ...summary(cur, num(exp._sum.amount), w.net), damageCount: w.count,
        fallbackLines: cur.fallbackLines, noCostLines: cur.noCostLines,
      },
      previous: prev ? summary(prev, num(prevExp?._sum.amount), foldWriteOffs(prevLosses).net) : null,
      rows: [...rows.values()].sort((a, b) => a.key.localeCompare(b.key)).map((b) => ({
        key: b.key, sales: r2(b.sales), cost: r2(b.cost), grossProfit: r2(b.sales - b.cost), expenses: r2(b.expenses),
        damage: r2(b.damage), netProfit: r2(b.sales - b.cost - b.expenses - b.damage),
      })),
    };
  }

  // ─── Tax ──────────────────────────────────────────────────

  async tax(user: AuthenticatedUser, scope: ShopScope, q: ReportQuery) {
    const r = await this.range(user, q);
    type Inv = { authority: string; kind: string; status: string; rate: number; count: number; value: number; tax: number };
    let invoices: Inv[] = [];
    let migrationPending = false;
    try {
      invoices = await this.prisma.$queryRaw<Inv[]>`
        SELECT authority, kind, status, "taxRate"::float AS rate, COUNT(*)::int AS count,
          COALESCE(SUM("saleValue"), 0)::float AS value, COALESCE(SUM("taxAmount"), 0)::float AS tax
        FROM tax_authority_invoices
        WHERE "tenantId" = ${user.tenantId}
          ${scope.shopId ? Prisma.sql`AND "shopId" = ${scope.shopId}` : Prisma.empty}
          ${r.gte ? Prisma.sql`AND "createdAt" >= ${r.gte}` : Prisma.empty} AND "createdAt" < ${r.lt}
        GROUP BY 1, 2, 3, 4`;
    } catch {
      migrationPending = true;
    }
    // Older FBR integration; branch is not recorded there, so it shows for all branches only.
    let fbr: Array<{ status: string; count: number; value: number; tax: number }> = [];
    if (!scope.shopId) {
      try {
        const g = await this.prisma.fbrInvoice.groupBy({
          by: ['status'], where: { tenantId: user.tenantId, createdAt: within(r) },
          _sum: { netAmount: true, taxAmount: true }, _count: { _all: true },
        });
        fbr = g.map((x) => ({ status: x.status, count: x._count._all, value: num(x._sum.netAmount), tax: num(x._sum.taxAmount) }));
      } catch { /* table missing on older databases */ }
    }

    const sales = await this.saleTotals(user, scope, r);
    type Auth = { authority: string; bills: number; returns: number; value: number; tax: number; failed: number; pending: number };
    const byAuthority = new Map<string, Auth>();
    const byRate = new Map<number, { rate: number; bills: number; value: number; tax: number }>();
    const slot = (name: string) => {
      const a = byAuthority.get(name) ?? { authority: name, bills: 0, returns: 0, value: 0, tax: 0, failed: 0, pending: 0 };
      byAuthority.set(name, a);
      return a;
    };
    // Same rule as the tax hub: only invoices the authority accepted, returns subtracted.
    for (const i of invoices) {
      const a = slot(i.authority);
      if (i.status === 'FAILED') { a.failed += i.count; continue; }
      if (i.status !== 'SUCCESS') { a.pending += i.count; continue; }
      const sign = i.kind === 'RETURN' ? -1 : 1;
      if (sign > 0) a.bills += i.count; else a.returns += i.count;
      a.value += sign * i.value; a.tax += sign * i.tax;
      const br = byRate.get(i.rate) ?? { rate: i.rate, bills: 0, value: 0, tax: 0 };
      if (sign > 0) br.bills += i.count;
      br.value += sign * i.value; br.tax += sign * i.tax;
      byRate.set(i.rate, br);
    }
    for (const f of fbr) {
      const a = slot('FBR');
      if (f.status === 'REJECTED') a.failed += f.count;
      else if (['PENDING', 'SUBMITTING', 'RETRY_QUEUED'].includes(f.status)) a.pending += f.count;
      else if (['SUBMITTED', 'ACKNOWLEDGED'].includes(f.status)) { a.bills += f.count; a.value += f.value; a.tax += f.tax; }
    }
    const list = [...byAuthority.values()].map((a) => ({ ...a, value: r2(a.value), tax: r2(a.tax) }));
    const net = ReportsCenterService.net(sales).net;
    const taxed = list.reduce((s, a) => s + a.value, 0);
    return {
      ...this.meta(r),
      migrationPending,
      totals: {
        sales: net, taxedValue: r2(taxed), tax: r2(list.reduce((s, a) => s + a.tax, 0)),
        bills: list.reduce((s, a) => s + a.bills, 0), failed: list.reduce((s, a) => s + a.failed, 0), pending: list.reduce((s, a) => s + a.pending, 0),
        coverage: net > 0 ? r2(Math.min(100, (taxed / net) * 100)) : 0,
        discount: r2(sales.discount), codeDiscount: r2(sales.codeDiscount), loyaltyDiscount: r2(sales.loyaltyDiscount), service: r2(sales.service),
      },
      authorities: list,
      rates: [...byRate.values()].map((x) => ({ ...x, value: r2(x.value), tax: r2(x.tax) })).sort((a, b) => b.rate - a.rate),
    };
  }

  // ─── Wapsi ────────────────────────────────────────────────

  async returns(user: AuthenticatedUser, scope: ShopScope, q: ReportQuery) {
    const r = await this.range(user, q);
    const base: Prisma.SaleReturnWhereInput = { tenantId: user.tenantId, ...scope.where };
    const where: Prisma.SaleReturnWhereInput = { ...base, returnedAt: within(r) };
    const rSql = Prisma.sql`x."tenantId" = ${user.tenantId}
      ${scope.shopId ? Prisma.sql`AND x."shopId" = ${scope.shopId}` : Prisma.empty}
      ${r.gte ? Prisma.sql`AND x."returnedAt" >= ${r.gte}` : Prisma.empty} AND x."returnedAt" < ${r.lt}`;
    const voidWhere: Prisma.SaleWhereInput = { tenantId: user.tenantId, ...scope.where, status: 'VOIDED', soldAt: within(r) };

    const [agg, prev, byMethod, byReason, byProduct, byStaff, trend, voided, voidList, sales, lostCost] = await Promise.all([
      this.prisma.saleReturn.aggregate({ where, _sum: { refundAmount: true }, _count: { _all: true } }),
      r.prev ? this.prisma.saleReturn.aggregate({ where: { ...base, returnedAt: within(r.prev) }, _sum: { refundAmount: true }, _count: { _all: true } }) : Promise.resolve(null),
      this.prisma.saleReturn.groupBy({ by: ['refundMethod'], where, _sum: { refundAmount: true }, _count: { _all: true } }),
      this.prisma.$queryRaw<Array<{ reason: string | null; count: number; amount: number }>>`
        SELECT NULLIF(lower(trim(x.reason)), '') AS reason, COUNT(*)::int AS count, SUM(x."refundAmount")::float AS amount
        FROM "SaleReturn" x WHERE ${rSql} GROUP BY 1 ORDER BY amount DESC LIMIT 15`,
      this.prisma.saleReturnItem.groupBy({ by: ['productId'], where: { return: where }, _sum: { quantity: true, total: true }, _count: { _all: true }, orderBy: { _sum: { total: 'desc' } }, take: 20 }),
      this.prisma.saleReturn.groupBy({ by: ['createdById'], where, _sum: { refundAmount: true }, _count: { _all: true } }),
      this.prisma.$queryRaw<Array<{ day: string; amount: number; count: number }>>`
        SELECT to_char(${bizTime(Prisma.sql`x."returnedAt"`, r)}, 'YYYY-MM-DD') AS day, SUM(x."refundAmount")::float AS amount, COUNT(*)::int AS count
        FROM "SaleReturn" x WHERE ${rSql} GROUP BY 1`,
      this.prisma.sale.aggregate({ where: voidWhere, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.sale.findMany({
        where: voidWhere, orderBy: { soldAt: 'desc' }, take: 15,
        select: { id: true, saleNumber: true, total: true, soldAt: true, customer: { select: { name: true } }, soldBy: { select: { fullName: true } }, createdBy: { select: { fullName: true } } },
      }),
      this.saleTotals(user, scope, r),
      this.prisma.$queryRaw<Array<{ cost: number }>>`
        SELECT COALESCE(SUM(${RETURN_LINE_COST}), 0)::float AS cost
        FROM "SaleReturnItem" ri JOIN "SaleReturn" x ON x.id = ri."returnId" JOIN "SaleItem" si ON si.id = ri."saleItemId"
        JOIN "Sale" s ON s.id = si."saleId" ${LINE_COST_JOINS}
        WHERE ${rSql}`,
    ]);
    const productIds = byProduct.map((p) => p.productId);
    const staffIds = byStaff.map((s) => s.createdById).filter((x): x is string => !!x);
    const [products, users] = await Promise.all([
      productIds.length ? this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, unit: true } }) : [],
      staffIds.length ? this.prisma.user.findMany({ where: { id: { in: staffIds } }, select: { id: true, fullName: true } }) : [],
    ]);
    const pMap = new Map(products.map((p) => [p.id, p]));
    const uMap = new Map(users.map((u) => [u.id, u.fullName]));
    const amount = num(agg._sum.refundAmount);
    const first = trend.length ? trend.map((t) => t.day).sort()[0] : null;
    const buckets = new Map(bucketKeys(r, first).map((k) => [k, { key: k, amount: 0, count: 0 }]));
    for (const t of trend) {
      const k = r.monthly ? t.day.slice(0, 7) : t.day;
      const b = buckets.get(k) ?? { key: k, amount: 0, count: 0 };
      b.amount += t.amount; b.count += t.count;
      buckets.set(k, b);
    }

    return {
      ...this.meta(r, first),
      totals: {
        count: agg._count._all, amount: r2(amount), cost: r2(num(lostCost[0]?.cost)),
        rate: sales.gross > 0 ? r2((amount / sales.gross) * 100) : 0,
        voidedBills: voided._count._all, voidedValue: r2(num(voided._sum.total)),
      },
      previous: prev ? { count: prev._count._all, amount: r2(num(prev._sum.refundAmount)) } : null,
      trend: [...buckets.values()].map((b) => ({ ...b, amount: r2(b.amount) })),
      methods: byMethod.map((m) => ({ method: m.refundMethod, amount: r2(num(m._sum.refundAmount)), count: m._count._all })).sort((a, b) => b.amount - a.amount),
      reasons: byReason.map((x) => ({ reason: x.reason, count: x.count, amount: r2(x.amount) })),
      products: byProduct.map((p) => ({ id: p.productId, name: pMap.get(p.productId)?.name ?? 'Product', unit: pMap.get(p.productId)?.unit ?? 'pcs', qty: r2(num(p._sum.quantity)), amount: r2(num(p._sum.total)), times: p._count._all })),
      staff: byStaff.map((s) => ({ id: s.createdById, name: (s.createdById && uMap.get(s.createdById)) || 'Na-maloom', amount: r2(num(s._sum.refundAmount)), count: s._count._all })).sort((a, b) => b.amount - a.amount),
      voided: voidList.map((v) => ({ id: v.id, saleNumber: v.saleNumber, total: r2(v.total), soldAt: v.soldAt, customer: v.customer?.name ?? null, staff: v.soldBy?.fullName ?? v.createdBy?.fullName ?? null })),
    };
  }
}
