/**
 * Branch figures.
 *
 *   analytics()  today / yesterday / 7 days / this month for every branch, plus
 *                drawers, stock value, staff on duty and khata. Feeds the
 *                Branches page cards and the all-shops dashboard.
 *   compare()    any period side by side with the period before it, a daily
 *                trend and busy hours per branch. Feeds Branch analytics.
 *
 * Money follows the shared business maths (common/helpers/business-math) and
 * every window follows the shop's own clock and business-day start hour.
 * Owners see every branch; anyone else tied to a branch sees only theirs.
 * Without cost access the cost, profit and stock-value fields come back as 0
 * with `costHidden: true`.
 */

import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { businessDayKey, zonedToUtc } from '../../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { computeLiveCash } from '../../../common/helpers/live-cash.helper';
import {
  BILL_NET, creditProfitRows, emptySaleFigures, foldCreditProfit, foldWriteOffs, headlineGross, liveSaleSql, otherIncomeRows, paidExpenseWhere,
  profitBasis, saleFiguresBy, writeOffRows, type CreditProfitRow,
  type MathRange, type MathScope, type SaleFigures, type WriteOffRow,
} from '../../../common/helpers/business-math.helper';

const DAY = 86_400_000;
const KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 366;

const n = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;
const pct = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : now > 0 ? 100 : 0);

interface Viewer {
  /** Branch the viewer is tied to; null for every branch. */
  shopId: string | null;
  costHidden: boolean;
}

interface Clock { tz: string; h: number }

/** One window's money for one branch. */
/** `gross` is the headline gross profit on the shop's khata basis; `income` is other income. */
interface WindowMoney { sales: SaleFigures; expenses: number; writeOff: number; gross: number; income: number }

@Injectable()
export class ShopsAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clocks: TenantTimezoneService,
  ) {}

  /** Branch money needs reports access; branch-tied staff see their own branch only. */
  private viewer(user: AuthenticatedUser): Viewer {
    if (!hasPermission(user.role, user.permissions, PERMISSIONS.REPORTS_VIEW)) {
      throw new ForbiddenException('Branch ka hisaab dekhne ke liye "Reports dekhna" ki permission chahiye');
    }
    const owner = user.role === UserRole.OWNER || user.role === UserRole.SUPER_ADMIN;
    return {
      shopId: owner ? null : user.shopId ?? null,
      costHidden: !hasPermission(user.role, user.permissions, PERMISSIONS.COST_VIEW),
    };
  }

  private async clock(tenantId: string): Promise<Clock> {
    const c = await this.clocks.clock(tenantId);
    return { tz: c.tz, h: c.dayStartHour };
  }

  private dayStart(key: string, c: Clock): Date {
    const [y, m, d] = key.split('-').map(Number);
    return zonedToUtc(y, m, d, c.h, 0, 0, c.tz);
  }

  private shiftKey(key: string, days: number): string {
    const d = new Date(`${key}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  private activeShops(tenantId: string, v: Viewer) {
    return this.prisma.shop.findMany({
      where: { tenantId, isActive: true, ...(v.shopId && { id: v.shopId }) },
      include: { _count: { select: { users: true, sales: true, shopStocks: true } } },
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
    });
  }

  /** Sales, paid expenses and write-offs of one window, keyed by branch. */
  private async windowMoney(tenantId: string, v: Viewer, r: MathRange): Promise<Map<string, WindowMoney>> {
    const scope: MathScope = { tenantId, shopId: v.shopId };
    const [sales, expenses, writeOff, credit, income, basis] = await Promise.all([
      saleFiguresBy(this.prisma, liveSaleSql(scope, r), Prisma.sql`s."shopId"`),
      this.prisma.expense.groupBy({ by: ['shopId'], where: paidExpenseWhere(scope, r), _sum: { amount: true } }),
      writeOffRows(this.prisma, scope, r, { key: (_at, shop) => shop }),
      creditProfitRows(this.prisma, scope, r, { key: (_at, shop) => shop }),
      otherIncomeRows(this.prisma, scope, r, { key: (_at, shop) => shop }),
      profitBasis(this.prisma, tenantId),
    ]);
    const byShop = new Map<string, WriteOffRow[]>();
    for (const row of writeOff) {
      if (!row.k) continue;
      byShop.set(row.k, [...(byShop.get(row.k) ?? []), row]);
    }
    const out = new Map<string, WindowMoney>();
    const ensure = (id: string) => {
      if (!out.has(id)) {
        const f = sales.get(id) ?? emptySaleFigures();
        out.set(id, { sales: f, expenses: 0, writeOff: 0, gross: f.grossProfit, income: 0 });
      }
      return out.get(id)!;
    };
    for (const id of sales.keys()) if (id) ensure(id);
    for (const e of expenses) if (e.shopId) ensure(e.shopId).expenses = r2(n(e._sum.amount));
    for (const [id, rows] of byShop) ensure(id).writeOff = foldWriteOffs(rows).net;
    for (const x of income) if (x.k) ensure(x.k).income = r2(n(x.amount));
    const creditBy = new Map<string, CreditProfitRow[]>();
    for (const x of credit) if (x.k) creditBy.set(x.k, [...(creditBy.get(x.k) ?? []), x]);
    for (const [id, rows] of creditBy) ensure(id).gross = headlineGross(foldCreditProfit(rows), basis);
    return out;
  }

  /** Stock rows, units, low-stock count and value at cost and at sale price, per branch. */
  private async stockByShop(tenantId: string, v: Viewer) {
    const rows = await this.prisma.$queryRaw<Array<{ k: string; qty: number; low: number; cost: number; retail: number }>>`
      SELECT ss."shopId" AS k,
        COALESCE(SUM(ss.stock), 0)::float8 AS qty,
        COUNT(*) FILTER (WHERE ss.stock <= ss."lowStockAlert")::int AS low,
        COALESCE(SUM(GREATEST(ss.stock, 0) * COALESCE(ss."shopCostPrice", NULLIF(pv."costPrice", 0), p."costPrice", 0)), 0)::float8 AS cost,
        COALESCE(SUM(GREATEST(ss.stock, 0) * COALESCE(ss."shopPrice", NULLIF(pv.price, 0), p.price, 0)), 0)::float8 AS retail
      FROM "ShopStock" ss
      JOIN "Product" p ON p.id = ss."productId"
      LEFT JOIN "ProductVariant" pv ON pv.id = ss."variantId"
      WHERE ss."tenantId" = ${tenantId} AND ss."isActive" = true AND p."isActive" = true
        ${v.shopId ? Prisma.sql`AND ss."shopId" = ${v.shopId}` : Prisma.empty}
      GROUP BY 1`;
    return new Map(rows.map((x) => [x.k, { qty: n(x.qty), low: n(x.low), cost: r2(n(x.cost)), retail: r2(n(x.retail)) }]));
  }

  /** Open drawers with live cash, and who is on duty (open drawer or checked in), per branch. */
  private async peopleAndDrawers(tenantId: string, v: Viewer, todayKey: string) {
    const shopFilter = v.shopId ? { shopId: v.shopId } : {};
    const [registers, attendance, staffCount] = await Promise.all([
      this.prisma.cashRegister.findMany({
        where: { tenantId, status: 'OPEN', shopId: v.shopId ?? { not: null } },
        select: {
          id: true, shopId: true, openedAt: true, openingBalance: true, expectedBalance: true, registerNumber: true,
          openedBy: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.attendance.findMany({
        where: { tenantId, date: new Date(`${todayKey}T00:00:00.000Z`), checkIn: { not: null }, checkOut: null, staff: { status: 'ACTIVE', ...shopFilter } },
        select: { staff: { select: { id: true, fullName: true, shopId: true, userId: true } } },
      }),
      this.prisma.staff.groupBy({ by: ['shopId'], where: { tenantId, status: 'ACTIVE', ...shopFilter }, _count: { _all: true } }),
    ]);

    const live = await Promise.all(registers.map((r) => computeLiveCash(this.prisma, tenantId, r).then((c) => c.expected)));
    const drawers = new Map<string, { open: number; cash: number; opening: number; openedAt: Date | null }>();
    const duty = new Map<string, Map<string, string>>();
    const onDuty = (shopId: string | null, key: string, name: string) => {
      if (!shopId) return;
      const m = duty.get(shopId) ?? new Map<string, string>();
      m.set(key, name);
      duty.set(shopId, m);
    };
    registers.forEach((r, i) => {
      if (!r.shopId) return;
      const d = drawers.get(r.shopId) ?? { open: 0, cash: 0, opening: 0, openedAt: null };
      d.open += 1;
      d.cash += live[i];
      d.opening += n(r.openingBalance);
      if (!d.openedAt || r.openedAt < d.openedAt) d.openedAt = r.openedAt;
      drawers.set(r.shopId, d);
      onDuty(r.shopId, r.openedBy.id, r.openedBy.fullName);
    });
    for (const a of attendance) onDuty(a.staff.shopId, a.staff.userId ?? a.staff.id, a.staff.fullName);

    return {
      drawers,
      duty: new Map([...duty].map(([k, m]) => [k, [...m.values()]])),
      staff: new Map(staffCount.filter((s) => s.shopId).map((s) => [s.shopId!, s._count._all])),
    };
  }

  /* ───────────────────────── today's cards ───────────────────────── */

  async analytics(user: AuthenticatedUser) {
    const v = this.viewer(user);
    const tenantId = user.tenantId;
    const c = await this.clock(tenantId);
    const now = new Date();
    const today = businessDayKey(now, c.tz, c.h);
    const todayStart = this.dayStart(today, c);
    const yesterdayStart = this.dayStart(this.shiftKey(today, -1), c);
    const weekStart = this.dayStart(this.shiftKey(today, -6), c);
    const monthStart = this.dayStart(`${today.slice(0, 7)}-01`, c);

    const [shops, todayM, yesterdayM, weekM, monthM, stock, people, credit] = await Promise.all([
      this.activeShops(tenantId, v),
      this.windowMoney(tenantId, v, { gte: todayStart }),
      this.windowMoney(tenantId, v, { gte: yesterdayStart, lt: todayStart }),
      this.windowMoney(tenantId, v, { gte: weekStart }),
      this.windowMoney(tenantId, v, { gte: monthStart }),
      this.stockByShop(tenantId, v),
      this.peopleAndDrawers(tenantId, v, today),
      this.prisma.customerLedger.groupBy({
        by: ['shopId'], where: { tenantId, ...(v.shopId ? { shopId: v.shopId } : { shopId: { not: null } }) }, _sum: { amount: true },
      }),
    ]);
    const creditBy = new Map(credit.map((x) => [x.shopId, Math.max(n(x._sum.amount), 0)]));
    const money = (m: Map<string, WindowMoney>, id: string): WindowMoney => m.get(id) ?? { sales: emptySaleFigures(), expenses: 0, writeOff: 0, gross: 0, income: 0 };
    const cost = (x: number) => (v.costHidden ? 0 : r2(x));

    const rows = shops.map((shop) => {
      const t = money(todayM, shop.id);
      const y = money(yesterdayM, shop.id);
      const w = money(weekM, shop.id);
      const m = money(monthM, shop.id);
      const s = stock.get(shop.id) ?? { qty: 0, low: 0, cost: 0, retail: 0 };
      const d = people.drawers.get(shop.id);
      const duty = people.duty.get(shop.id) ?? [];
      const net = (x: WindowMoney) => x.gross - x.expenses - x.writeOff + x.income;
      return {
        ...shop,
        todaySales: t.sales.net,
        todayProfit: cost(t.gross),
        todayOrders: t.sales.bills,
        todayPaid: t.sales.cashIn,
        todayCredit: t.sales.credit,
        todayRefunds: t.sales.refunds,
        monthSales: m.sales.net,
        monthProfit: cost(m.gross),
        monthOrders: m.sales.bills,
        lowStockCount: s.low,
        totalStock: r2(s.qty),
        stockValue: cost(s.cost),
        stockRetailValue: s.retail,
        registerOpen: !!d,
        openDrawers: d?.open ?? 0,
        registerBalance: r2(d?.cash ?? 0),
        registerOpening: r2(d?.opening ?? 0),
        registerOpenedAt: d?.openedAt ?? null,
        yesterdaySales: y.sales.net,
        growthVsYesterday: r2(pct(t.sales.net, y.sales.net)),
        weekSales: w.sales.net,
        weekProfit: cost(w.gross),
        weekOrders: w.sales.bills,
        weekExpenses: w.expenses,
        weekNetProfit: cost(net(w)),
        avgOrderValue: w.sales.bills > 0 ? r2(w.sales.net / w.sales.bills) : 0,
        todayExpenses: t.expenses,
        monthExpenses: m.expenses,
        todayWriteOff: cost(t.writeOff),
        monthWriteOff: cost(m.writeOff),
        todayNetProfit: cost(net(t)),
        monthNetProfit: cost(net(m)),
        outstandingCredit: r2(creditBy.get(shop.id) ?? 0),
        staffCount: people.staff.get(shop.id) ?? 0,
        staffOnDuty: duty.length,
        onDutyNames: duty.slice(0, 6),
      };
    });

    const sum = (f: (r: (typeof rows)[number]) => number) => r2(rows.reduce((a, r) => a + f(r), 0));
    const totals = {
      todaySales: sum((r) => r.todaySales),
      todayOrders: sum((r) => r.todayOrders),
      todayNetProfit: sum((r) => r.todayNetProfit),
      todayExpenses: sum((r) => r.todayExpenses),
      monthSales: sum((r) => r.monthSales),
      monthNetProfit: sum((r) => r.monthNetProfit),
      outstandingCredit: sum((r) => r.outstandingCredit),
      lowStockCount: sum((r) => r.lowStockCount),
      totalStock: sum((r) => r.totalStock),
      stockValue: sum((r) => r.stockValue),
      registersOpen: rows.filter((r) => r.registerOpen).length,
      drawerCash: sum((r) => r.registerBalance),
      staffCount: sum((r) => r.staffCount),
      staffOnDuty: sum((r) => r.staffOnDuty),
      shopCount: rows.length,
    };

    const ranked = rows
      .map((r) => ({ ...r, monthShare: totals.monthSales > 0 ? r2((r.monthSales / totals.monthSales) * 100) : 0 }))
      .sort((a, b) => b.monthSales - a.monthSales)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    return {
      shops: ranked,
      totals,
      best: ranked[0] ?? null,
      costHidden: v.costHidden,
      day: today,
      needsAttention: ranked
        .map((s) => ({
          shopId: s.id,
          name: s.name,
          reasons: [
            s.lowStockCount > 0 ? `${s.lowStockCount} cheezon ka stock kam` : null,
            s.outstandingCredit > 0 ? `Rs ${Math.round(s.outstandingCredit).toLocaleString('en-PK')} udhaar baqi` : null,
            !s.registerOpen && s.type === 'SHOP' ? 'Drawer band hai' : null,
          ].filter((r): r is string => r !== null),
        }))
        .filter((x) => x.reasons.length > 0),
    };
  }

  /* ───────────────────────── period comparison ───────────────────────── */

  async compare(user: AuthenticatedUser, from?: string, to?: string) {
    const v = this.viewer(user);
    const tenantId = user.tenantId;
    const c = await this.clock(tenantId);
    const today = businessDayKey(new Date(), c.tz, c.h);
    const toKey = to && KEY.test(to) ? to : today;
    const fromKey = from && KEY.test(from) ? from : `${toKey.slice(0, 7)}-01`;
    if (fromKey > toKey) throw new BadRequestException('Shuru ki date aakhri date ke baad hai');
    const gte = this.dayStart(fromKey, c);
    const lt = new Date(this.dayStart(toKey, c).getTime() + DAY);
    const days = Math.round((lt.getTime() - gte.getTime()) / DAY);
    if (days > MAX_DAYS) throw new BadRequestException('Ek dafa me zyada se zyada ek saal ka muqabla ho sakta hai');
    const prevGte = new Date(gte.getTime() - days * DAY);
    const scope: MathScope = { tenantId, shopId: v.shopId };
    const local = (col: Prisma.Sql) => Prisma.sql`((${col} AT TIME ZONE 'UTC') AT TIME ZONE ${c.tz})`;
    const where = liveSaleSql(scope, { gte, lt });

    const [shops, now, before, trend, hours] = await Promise.all([
      this.activeShops(tenantId, v),
      this.windowMoney(tenantId, v, { gte, lt }),
      this.windowMoney(tenantId, v, { gte: prevGte, lt: gte }),
      this.prisma.$queryRaw<Array<{ k: string; day: string; net: number; bills: number }>>`
        SELECT s."shopId" AS k,
          to_char(${local(Prisma.sql`s."soldAt"`)} - make_interval(hours => ${c.h}::int), 'YYYY-MM-DD') AS day,
          COALESCE(SUM(${BILL_NET}), 0)::float8 AS net, COUNT(*)::int AS bills
        FROM "Sale" s WHERE ${where} GROUP BY 1, 2`,
      this.prisma.$queryRaw<Array<{ k: string; hour: number; bills: number }>>`
        SELECT s."shopId" AS k, EXTRACT(HOUR FROM ${local(Prisma.sql`s."soldAt"`)})::int AS hour, COUNT(*)::int AS bills
        FROM "Sale" s WHERE ${where} GROUP BY 1, 2`,
    ]);

    const cost = (x: number) => (v.costHidden ? 0 : r2(x));
    const empty: WindowMoney = { sales: emptySaleFigures(), expenses: 0, writeOff: 0, gross: 0, income: 0 };
    const rows = shops.map((shop) => {
      const a = now.get(shop.id) ?? empty;
      const b = before.get(shop.id) ?? empty;
      const netProfit = a.gross - a.expenses - a.writeOff + a.income;
      const prevNetProfit = b.gross - b.expenses - b.writeOff + b.income;
      return {
        id: shop.id, name: shop.name, type: shop.type, isMain: shop.isMain,
        bills: a.sales.bills, gross: a.sales.gross, refunds: a.sales.refunds, net: a.sales.net,
        discount: r2(a.sales.discount + a.sales.codeDiscount + a.sales.loyaltyDiscount),
        cashIn: a.sales.cashIn, credit: a.sales.credit,
        cost: cost(a.sales.cost), grossProfit: cost(a.gross),
        expenses: a.expenses, writeOff: cost(a.writeOff), otherIncome: a.income, netProfit: cost(netProfit),
        margin: v.costHidden || a.sales.net <= 0 ? 0 : r2((a.gross / a.sales.net) * 100),
        avgBill: a.sales.bills ? r2(a.sales.net / a.sales.bills) : 0,
        share: 0,
        prev: { bills: b.sales.bills, net: b.sales.net, netProfit: cost(prevNetProfit) },
        growth: r2(pct(a.sales.net, b.sales.net)),
      };
    });
    const totalNet = rows.reduce((s, r) => s + r.net, 0);
    for (const r of rows) r.share = totalNet > 0 ? r2((r.net / totalNet) * 100) : 0;

    const sum = (f: (r: (typeof rows)[number]) => number) => r2(rows.reduce((s, r) => s + f(r), 0));
    const totals = {
      bills: sum((r) => r.bills), gross: sum((r) => r.gross), refunds: sum((r) => r.refunds), net: sum((r) => r.net),
      discount: sum((r) => r.discount), cashIn: sum((r) => r.cashIn), credit: sum((r) => r.credit),
      cost: sum((r) => r.cost), grossProfit: sum((r) => r.grossProfit), expenses: sum((r) => r.expenses),
      writeOff: sum((r) => r.writeOff), netProfit: sum((r) => r.netProfit),
      prevNet: sum((r) => r.prev.net), prevNetProfit: sum((r) => r.prev.netProfit), prevBills: sum((r) => r.prev.bills),
    };

    const ids = new Set(rows.map((r) => r.id));
    const dayKeys: string[] = [];
    for (let k = fromKey; k <= toKey; k = this.shiftKey(k, 1)) dayKeys.push(k);
    const trendRows = dayKeys.map((day) => {
      const row: Record<string, number | string> = { day };
      for (const id of ids) row[id] = 0;
      return row;
    });
    const trendAt = new Map(trendRows.map((r) => [r.day as string, r]));
    for (const t of trend) {
      const row = trendAt.get(t.day);
      if (row && ids.has(t.k)) row[t.k] = r2(n(t.net));
    }
    const hourRows = Array.from({ length: 24 }, (_, hour) => {
      const row: Record<string, number> = { hour };
      for (const id of ids) row[id] = 0;
      return row;
    });
    for (const h of hours) if (ids.has(h.k) && hourRows[h.hour]) hourRows[h.hour][h.k] = n(h.bills);

    return {
      range: { from: fromKey, to: toKey, days },
      previous: { from: this.shiftKey(fromKey, -days), to: this.shiftKey(fromKey, -1) },
      costHidden: v.costHidden,
      shops: rows.sort((a, b) => b.net - a.net),
      totals,
      trend: trendRows,
      hours: hourRows,
    };
  }
}
