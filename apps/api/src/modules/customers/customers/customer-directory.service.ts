/**
 * Customer directory for the customers and khata pages. Search, filters and
 * sort run on the server over every customer, so totals and paging agree.
 * Each customer carries visits, spend, last visit and, when they owe money,
 * the age of the oldest unpaid credit (payments settle the oldest first).
 * Also returns per-customer insights for the detail page.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey, dateKeyTz, safeDayStart, tzParts, weekdayInTz, zonedToUtc } from '../../../common/helpers/business-time.helper';

export type DirectoryType = 'all' | 'vip' | 'khata' | 'advance' | 'overLimit' | 'clear';
export type DirectoryActivity = 'all' | 'new' | 'active30' | 'inactive30' | 'inactive60' | 'inactive90' | 'never';
export type DirectorySort = 'recent' | 'old' | 'name' | 'nameDesc' | 'spent' | 'balance' | 'lastVisit' | 'visits' | 'average' | 'aging';

export interface DirectoryQuery {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  type?: DirectoryType;
  activity?: DirectoryActivity;
  aging?: 'd0' | 'd7' | 'd30' | 'd90';
  city?: string;
  birthday?: string;
  sort?: DirectorySort;
  scope?: 'branch' | 'all';
  /** Business-day keys (YYYY-MM-DD) for a period; without them, all time. */
  from?: string;
  to?: string;
  /** What the period filters on: bought in it, joined in it, or khata activity in it. */
  dateOn?: 'sales' | 'joined' | 'khata';
  page?: string | number;
  limit?: string | number;
}

const TYPES: DirectoryType[] = ['all', 'vip', 'khata', 'advance', 'overLimit', 'clear'];
const ACTIVITIES: DirectoryActivity[] = ['all', 'new', 'active30', 'inactive30', 'inactive60', 'inactive90', 'never'];
const SORTS: DirectorySort[] = ['recent', 'old', 'name', 'nameDesc', 'spent', 'balance', 'lastVisit', 'visits', 'average', 'aging'];
const LIVE = ['COMPLETED', 'PARTIALLY_RETURNED', 'FULLY_RETURNED'] as const;
const DAY = 86_400_000;
const EPS = 0.009;
const n = (v: unknown) => Number(v ?? 0);

/** Digits only, with +92 / 92 turned into a leading 0, so "0300-1234567" and "+923001234567" match. */
export const phoneDigits = (v?: string | null) => {
  const d = (v ?? '').replace(/\D/g, '');
  return d.startsWith('92') && d.length >= 12 ? `0${d.slice(2)}` : d;
};

/** Oldest still-unpaid credit, settling payments against the oldest debts first. */
export function oldestUnpaid(entries: Array<{ amount: number; createdAt: Date }>): Date | null {
  const debts: Array<{ left: number; at: Date }> = [];
  let credit = 0;
  for (const e of [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    if (e.amount > 0) {
      let left = e.amount;
      const use = Math.min(left, credit);
      left -= use; credit -= use;
      if (left > EPS) debts.push({ left, at: e.createdAt });
    } else {
      let pay = -e.amount;
      while (pay > EPS && debts.length) {
        const use = Math.min(pay, debts[0].left);
        debts[0].left -= use; pay -= use;
        if (debts[0].left <= EPS) debts.shift();
      }
      credit += pay;
    }
  }
  return debts[0]?.at ?? null;
}

interface Row {
  id: string; name: string; phone: string | null; email: string | null; cnic: string | null; city: string | null; area: string | null;
  gender: string | null; dateOfBirth: Date | null; avatarUrl: string | null; creditLimit: number; totalBalance: number; loyaltyPoints: number;
  isActive: boolean; isVip: boolean; createdAt: Date; shopId: string | null;
  balance: number; visits: number; spent: number; lastSaleAt: Date | null; firstSaleAt: Date | null; oldestDueAt: Date | null;
  periodVisits: number; periodSpent: number; periodCredit: number; periodPaid: number;
}

const KEY = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class CustomerDirectoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  async list(user: AuthenticatedUser, scope: ShopScope, q: DirectoryQuery) {
    const type = q.type ?? 'all';
    const activity = q.activity ?? 'all';
    const sort = q.sort ?? 'recent';
    if (!TYPES.includes(type) || !ACTIVITIES.includes(activity) || !SORTS.includes(sort)) throw new BadRequestException('Ghalat filter');
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(q.limit) || 40));
    const tenantId = user.tenantId;
    const shopId = scope.shopId ?? undefined;
    const now = Date.now();
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const monthKey = businessDayKey(new Date(), tz, safeDayStart(dayStartHour)).slice(0, 7);
    const [my, mm] = monthKey.split('-').map(Number);
    const monthStart = zonedToUtc(my, mm, 1, safeDayStart(dayStartHour), 0, 0, tz);

    // Optional period, on business days in the shop's time zone.
    const start = safeDayStart(dayStartHour);
    const at = (key: string) => { const [y, m, d] = key.split('-').map(Number); return zonedToUtc(y, m, d, start, 0, 0, tz); };
    const range = q.from && KEY.test(q.from) && q.to && KEY.test(q.to)
      ? { gte: at(q.from), lt: new Date(at(q.to).getTime() + DAY) }
      : null;
    if (range && range.gte >= range.lt) throw new BadRequestException('Date ulti hai');

    const [customers, saleAgg, branchLedger, debtLedger, periodSales, periodLedger] = await Promise.all([
      this.prisma.customer.findMany({
        where: { tenantId },
        select: {
          id: true, name: true, phone: true, email: true, cnic: true, city: true, area: true, gender: true, dateOfBirth: true, avatarUrl: true,
          creditLimit: true, balance: true, loyaltyPoints: true, isActive: true, isVip: true, createdAt: true, shopId: true,
        },
      }),
      this.prisma.sale.groupBy({
        by: ['customerId'],
        where: { tenantId, customerId: { not: null }, status: { in: [...LIVE] }, ...(shopId && { shopId }) },
        _count: { _all: true }, _sum: { total: true }, _max: { soldAt: true }, _min: { soldAt: true },
      }),
      shopId ? this.prisma.customerLedger.groupBy({ by: ['customerId'], where: { tenantId, shopId }, _sum: { amount: true } }) : Promise.resolve([]),
      // Ledger of everyone who owes money, for the age of their oldest debt.
      this.prisma.customerLedger.findMany({
        where: { tenantId, ...(shopId && { shopId }), customer: shopId ? undefined : { balance: { gt: EPS } } },
        select: { customerId: true, amount: true, createdAt: true },
      }),
      range ? this.prisma.sale.groupBy({
        by: ['customerId'],
        where: { tenantId, customerId: { not: null }, status: { in: [...LIVE] }, soldAt: range, ...(shopId && { shopId }) },
        _count: { _all: true }, _sum: { total: true },
      }) : Promise.resolve([]),
      range ? this.prisma.customerLedger.groupBy({
        by: ['customerId', 'type'],
        where: { tenantId, createdAt: range, ...(shopId && { shopId }) },
        _sum: { amount: true },
      }) : Promise.resolve([]),
    ]);
    const pSales = new Map(periodSales.map((s) => [s.customerId!, s]));
    const pLedger = new Map<string, { credit: number; paid: number }>();
    for (const l of periodLedger) {
      const cur = pLedger.get(l.customerId) ?? { credit: 0, paid: 0 };
      const amt = n(l._sum.amount);
      if (l.type === 'PAYMENT_RECEIVED') cur.paid += -amt;
      else if (amt > 0) cur.credit += amt;
      pLedger.set(l.customerId, cur);
    }

    const sales = new Map(saleAgg.map((s) => [s.customerId!, s]));
    const branchBal = new Map(branchLedger.map((b) => [b.customerId, n(b._sum.amount)]));
    const ledgerBy = new Map<string, Array<{ amount: number; createdAt: Date }>>();
    for (const l of debtLedger) {
      const list = ledgerBy.get(l.customerId) ?? [];
      list.push({ amount: n(l.amount), createdAt: l.createdAt });
      ledgerBy.set(l.customerId, list);
    }

    // On a branch: customers registered here, or who bought or took credit here.
    const branchOnly = !!shopId && q.scope !== 'all' && !q.search?.trim();
    const rows: Row[] = customers
      .filter((c) => !branchOnly || c.shopId === shopId || sales.has(c.id) || branchBal.has(c.id))
      .map((c) => {
        const s = sales.get(c.id);
        const balance = shopId ? (branchBal.get(c.id) ?? 0) : n(c.balance);
        return {
          ...c, totalBalance: n(c.balance), balance,
          visits: s?._count._all ?? 0, spent: n(s?._sum.total), lastSaleAt: s?._max.soldAt ?? null, firstSaleAt: s?._min.soldAt ?? null,
          oldestDueAt: balance > EPS ? oldestUnpaid(ledgerBy.get(c.id) ?? []) : null,
          periodVisits: pSales.get(c.id)?._count._all ?? 0, periodSpent: n(pSales.get(c.id)?._sum.total),
          periodCredit: pLedger.get(c.id)?.credit ?? 0, periodPaid: pLedger.get(c.id)?.paid ?? 0,
        };
      });

    const daysSince = (d: Date | null) => (d ? Math.floor((now - d.getTime()) / DAY) : null);
    const ageOf = (r: Row) => daysSince(r.oldestDueAt);
    const isKhata = (r: Row) => r.balance > EPS;
    const isAdvance = (r: Row) => r.balance < -EPS;
    const isOverLimit = (r: Row) => r.creditLimit > 0 && r.balance > r.creditLimit;
    const typeTest: Record<DirectoryType, (r: Row) => boolean> = {
      all: () => true, vip: (r) => r.isVip, khata: isKhata, advance: isAdvance, overLimit: isOverLimit, clear: (r) => Math.abs(r.balance) <= EPS,
    };
    const actTest: Record<DirectoryActivity, (r: Row) => boolean> = {
      all: () => true,
      new: (r) => r.createdAt >= monthStart,
      active30: (r) => (daysSince(r.lastSaleAt) ?? 1e9) <= 30,
      inactive30: (r) => r.visits > 0 && (daysSince(r.lastSaleAt) ?? 0) > 30,
      inactive60: (r) => r.visits > 0 && (daysSince(r.lastSaleAt) ?? 0) > 60,
      inactive90: (r) => r.visits > 0 && (daysSince(r.lastSaleAt) ?? 0) > 90,
      never: (r) => r.visits === 0,
    };
    const agingTest = (r: Row) => {
      if (!q.aging) return true;
      const a = ageOf(r);
      if (a === null) return false;
      return q.aging === 'd0' ? a < 7 : q.aging === 'd7' ? a >= 7 && a < 30 : q.aging === 'd30' ? a >= 30 && a < 90 : a >= 90;
    };

    const term = q.search?.trim().toLowerCase();
    const digits = term ? phoneDigits(term) : '';
    const matches = (r: Row) => !term
      || [r.name, r.email, r.cnic, r.city, r.area].some((v) => v?.toLowerCase().includes(term))
      || (digits.length >= 3 && phoneDigits(r.phone).includes(digits));
    const statusOk = (r: Row) => (q.status === 'all' ? true : q.status === 'inactive' ? !r.isActive : r.isActive);
    const birthdayOk = (r: Row) => q.birthday !== 'month' || (r.dateOfBirth && tzParts(r.dateOfBirth, tz).month === mm);
    const cityOk = (r: Row) => !q.city || (r.city ?? '').toLowerCase() === q.city.toLowerCase();

    const dateOn = q.dateOn ?? 'sales';
    const periodOk = (r: Row) => !range
      || (dateOn === 'joined' ? r.createdAt >= range.gte && r.createdAt < range.lt
        : dateOn === 'khata' ? r.periodCredit > EPS || r.periodPaid > EPS
          : r.periodVisits > 0);
    const base = rows.filter((r) => matches(r) && statusOk(r) && cityOk(r) && birthdayOk(r) && periodOk(r));
    const filtered = base.filter((r) => typeTest[type](r) && actTest[activity](r) && agingTest(r));

    const avg = (r: Row) => (r.visits ? r.spent / r.visits : 0);
    const cmp: Record<DirectorySort, (a: Row, b: Row) => number> = {
      recent: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      old: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      name: (a, b) => a.name.localeCompare(b.name),
      nameDesc: (a, b) => b.name.localeCompare(a.name),
      spent: (a, b) => b.spent - a.spent,
      balance: (a, b) => b.balance - a.balance,
      lastVisit: (a, b) => (b.lastSaleAt?.getTime() ?? 0) - (a.lastSaleAt?.getTime() ?? 0),
      visits: (a, b) => b.visits - a.visits,
      average: (a, b) => avg(b) - avg(a),
      aging: (a, b) => (a.oldestDueAt?.getTime() ?? Infinity) - (b.oldestDueAt?.getTime() ?? Infinity),
    };
    filtered.sort((a, b) => cmp[sort](a, b) || a.name.localeCompare(b.name));

    const out = (r: Row) => ({
      id: r.id, name: r.name, phone: r.phone, email: r.email, cnic: r.cnic, city: r.city, area: r.area, gender: r.gender,
      dateOfBirth: r.dateOfBirth, avatarUrl: r.avatarUrl, creditLimit: r.creditLimit, loyaltyPoints: r.loyaltyPoints,
      isActive: r.isActive, isVip: r.isVip, createdAt: r.createdAt,
      balance: r.balance, totalBalance: r.totalBalance, overLimit: isOverLimit(r),
      visits: r.visits, spent: r.spent, average: avg(r), lastSaleAt: r.lastSaleAt, firstSaleAt: r.firstSaleAt,
      daysSinceVisit: daysSince(r.lastSaleAt), oldestDueAt: r.oldestDueAt, dueDays: ageOf(r),
      period: range ? { visits: r.periodVisits, spent: r.periodSpent, credit: r.periodCredit, paid: r.periodPaid } : null,
    });

    // Totals cover every customer in scope (active ones), not just this page.
    const live = rows.filter((r) => r.isActive);
    const owing = live.filter(isKhata);
    const bucket = (lo: number, hi: number) => {
      const list = owing.filter((r) => { const a = ageOf(r) ?? 0; return a >= lo && a < hi; });
      return { count: list.length, amount: list.reduce((s, r) => s + r.balance, 0) };
    };
    const cityCount = new Map<string, number>();
    for (const r of base) if (r.city?.trim()) cityCount.set(r.city.trim(), (cityCount.get(r.city.trim()) ?? 0) + 1);

    return {
      page, limit, count: filtered.length, hasMore: page * limit < filtered.length,
      items: filtered.slice((page - 1) * limit, page * limit).map(out),
      tabs: Object.fromEntries(TYPES.map((t) => [t, base.filter(typeTest[t]).length])) as Record<DirectoryType, number>,
      activity: Object.fromEntries(ACTIVITIES.map((a) => [a, base.filter(actTest[a]).length])) as Record<DirectoryActivity, number>,
      cities: [...cityCount.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 40),
      period: range ? {
        from: q.from, to: q.to,
        visits: rows.reduce((s, r) => s + r.periodVisits, 0),
        spent: rows.reduce((s, r) => s + r.periodSpent, 0),
        buyers: rows.filter((r) => r.periodVisits > 0).length,
        credit: rows.reduce((s, r) => s + r.periodCredit, 0),
        paid: rows.reduce((s, r) => s + r.periodPaid, 0),
        joined: rows.filter((r) => r.createdAt >= range.gte && r.createdAt < range.lt).length,
      } : null,
      stats: {
        total: live.length,
        inactive: rows.length - live.length,
        vip: live.filter((r) => r.isVip).length,
        newThisMonth: live.filter((r) => r.createdAt >= monthStart).length,
        buyers: live.filter((r) => r.visits > 0).length,
        spent: live.reduce((s, r) => s + r.spent, 0),
        receivable: owing.reduce((s, r) => s + r.balance, 0),
        owingCount: owing.length,
        advance: live.filter(isAdvance).reduce((s, r) => s - r.balance, 0),
        advanceCount: live.filter(isAdvance).length,
        overLimit: live.filter(isOverLimit).length,
        aging: { d0: bucket(0, 7), d7: bucket(7, 30), d30: bucket(30, 90), d90: bucket(90, 1e9) },
        inactive30: live.filter(actTest.inactive30).length,
        inactive90: live.filter(actTest.inactive90).length,
        never: live.filter(actTest.never).length,
        birthdays: live.filter((r) => r.dateOfBirth && tzParts(r.dateOfBirth, tz).month === mm)
          .map((r) => ({ id: r.id, name: r.name, phone: r.phone, day: tzParts(r.dateOfBirth!, tz).day }))
          .sort((a, b) => a.day - b.day).slice(0, 30),
        topSpenders: [...live].sort((a, b) => b.spent - a.spent).filter((r) => r.spent > 0).slice(0, 5).map(out),
      },
    };
  }

  /** How one customer buys: months, favourite products, rhythm, payment habits and credit age. */
  async insights(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const tenantId = user.tenantId;
    const customer = await this.prisma.customer.findFirst({ where: { id, tenantId }, select: { id: true, balance: true } });
    if (!customer) throw new NotFoundException('Customer not found');
    const shopId = scope.shopId ?? undefined;
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const start = safeDayStart(dayStartHour);
    const shift = start * 3600_000;
    const sale = { tenantId, customerId: id, ...(shopId && { shopId }) };

    const [sales, items, ledger] = await Promise.all([
      this.prisma.sale.findMany({
        where: sale,
        select: { id: true, soldAt: true, total: true, creditAmount: true, paymentMethod: true, status: true },
        orderBy: { soldAt: 'asc' },
      }),
      this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: { productId: { not: null }, sale: { ...sale, status: { in: [...LIVE] } } },
        _sum: { quantity: true, returnedQty: true, total: true },
        _count: { _all: true },
        _max: { createdAt: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 8,
      }),
      this.prisma.customerLedger.findMany({
        where: { tenantId, customerId: id, ...(shopId && { shopId }) },
        select: { amount: true, type: true, createdAt: true },
      }),
    ]);

    const live = sales.filter((s) => (LIVE as readonly string[]).includes(s.status));
    const products = items.length
      ? await this.prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId!) } }, select: { id: true, name: true, unit: true } })
      : [];
    const pName = new Map(products.map((p) => [p.id, p]));

    // Last 12 business months, oldest first, with empty months kept.
    const todayKey = businessDayKey(new Date(), tz, start);
    let [y, m] = todayKey.split('-').map(Number);
    const months: Array<{ key: string; spent: number; bills: number }> = [];
    for (let i = 0; i < 12; i++) {
      months.unshift({ key: `${y}-${String(m).padStart(2, '0')}`, spent: 0, bills: 0 });
      m -= 1; if (m === 0) { m = 12; y -= 1; }
    }
    const monthOf = new Map(months.map((x) => [x.key, x]));
    const weekdays = Array(7).fill(0);
    const hours = Array(24).fill(0);
    const methods = new Map<string, { bills: number; total: number }>();
    for (const s of live) {
      const biz = new Date(s.soldAt.getTime() - shift);
      const mo = monthOf.get(dateKeyTz(biz, tz).slice(0, 7));
      if (mo) { mo.spent += n(s.total); mo.bills += 1; }
      weekdays[weekdayInTz(biz, tz)] += 1;
      hours[tzParts(s.soldAt, tz).hour] += 1;
      const pm = methods.get(s.paymentMethod) ?? { bills: 0, total: 0 };
      pm.bills += 1; pm.total += n(s.total);
      methods.set(s.paymentMethod, pm);
    }
    const gaps = live.slice(1).map((s, i) => (s.soldAt.getTime() - live[i].soldAt.getTime()) / DAY);
    const spent = live.reduce((x, s) => x + n(s.total), 0);
    const oldest = customer.balance > EPS ? oldestUnpaid(ledger.map((l) => ({ amount: n(l.amount), createdAt: l.createdAt }))) : null;
    const sumBy = (types: string[]) => ledger.filter((l) => types.includes(l.type)).reduce((x, l) => x + Math.abs(n(l.amount)), 0);
    const maxIdx = (arr: number[]) => (arr.some((v) => v > 0) ? arr.indexOf(Math.max(...arr)) : null);

    return {
      months,
      visits: {
        count: live.length,
        first: live[0]?.soldAt ?? null,
        last: live[live.length - 1]?.soldAt ?? null,
        averageGapDays: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null,
        average: live.length ? spent / live.length : 0,
        best: live.reduce((b, s) => Math.max(b, n(s.total)), 0),
        spent,
        voided: sales.filter((s) => s.status === 'VOIDED').length,
        returned: sales.filter((s) => s.status === 'PARTIALLY_RETURNED' || s.status === 'FULLY_RETURNED').length,
        favouriteWeekday: maxIdx(weekdays),
        favouriteHour: maxIdx(hours),
      },
      products: items.map((i) => ({
        productId: i.productId!, name: pName.get(i.productId!)?.name ?? 'Product', unit: pName.get(i.productId!)?.unit ?? 'pcs',
        qty: n(i._sum.quantity) - n(i._sum.returnedQty), spent: n(i._sum.total), times: i._count._all, lastAt: i._max.createdAt,
      })),
      payments: [...methods.entries()].map(([method, v]) => ({ method, ...v })).sort((a, b) => b.total - a.total),
      credit: {
        taken: ledger.filter((l) => n(l.amount) > 0).reduce((x, l) => x + n(l.amount), 0),
        paid: sumBy(['PAYMENT_RECEIVED']),
        /** Credit removed without a payment: voids, returns, corrections. */
        reduced: ledger.filter((l) => n(l.amount) < 0 && l.type !== 'PAYMENT_RECEIVED').reduce((x, l) => x - n(l.amount), 0),
        oldestDueAt: oldest,
        dueDays: oldest ? Math.floor((Date.now() - oldest.getTime()) / DAY) : null,
      },
    };
  }
}
