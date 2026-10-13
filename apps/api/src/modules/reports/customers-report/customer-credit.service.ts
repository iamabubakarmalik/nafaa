/**
 * Customers report, money side: udhaar (khata) ageing, collection rate and
 * the slowest payers, plus loyalty points issued, redeemed and still owed.
 * On a single branch the khata is that branch's own ledger; for all
 * branches it is each customer's total balance.
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { businessDayKey } from '../../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ShopScope } from '../../../common/shop-scope';
import { BILL_NET } from '../../../common/helpers/business-math.helper';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CustomerPeriodDto } from './dto/customers-report.dto';
import { DAY, bucketKeys, bucketSql, liveSql, narrowScope, num, periodOf, r2, type Period } from './range';

const EPS = 0.009;

/** Age bands for unpaid credit, in days. */
const AGE_BANDS = [
  { key: 'd30', label: '0–30 din', max: 30 },
  { key: 'd60', label: '31–60 din', max: 60 },
  { key: 'd90', label: '61–90 din', max: 90 },
  { key: 'd180', label: '91–180 din', max: 180 },
  { key: 'old', label: '180+ din', max: Infinity },
] as const;
type AgeKey = (typeof AGE_BANDS)[number]['key'];
const bandOf = (days: number): AgeKey => AGE_BANDS.find((b) => days <= b.max)!.key;

/**
 * Credit still unpaid, piece by piece, with payments settling the oldest
 * debts first. Advance paid before a debt is used against it.
 */
function unpaidPieces(entries: Array<{ amount: number; createdAt: Date }>) {
  const debts: Array<{ left: number; at: Date }> = [];
  let credit = 0;
  for (const e of [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    if (e.amount > 0) {
      const use = Math.min(e.amount, credit);
      credit -= use;
      if (e.amount - use > EPS) debts.push({ left: e.amount - use, at: e.createdAt });
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
  return debts;
}

@Injectable()
export class CustomerCreditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  private ledgerSql(tenantId: string, scope: ShopScope, w: { gte: Date | null; lt: Date }) {
    return Prisma.sql`l."tenantId" = ${tenantId}
      ${scope.shopId ? Prisma.sql`AND l."shopId" = ${scope.shopId}` : Prisma.empty}
      ${w.gte ? Prisma.sql`AND l."createdAt" >= ${w.gte}` : Prisma.empty}
      AND l."createdAt" < ${w.lt}`;
  }

  /** Credit given, money received and other reductions in a window. */
  private flow(tenantId: string, scope: ShopScope, w: { gte: Date | null; lt: Date }) {
    return this.prisma.$queryRaw<Array<{ given: number; received: number; reduced: number; payments: number; payers: number; takers: number }>>`
      SELECT COALESCE(SUM(l.amount) FILTER (WHERE l.amount > 0), 0)::float AS given,
        COALESCE(-SUM(l.amount) FILTER (WHERE l.type::text = 'PAYMENT_RECEIVED'), 0)::float AS received,
        COALESCE(-SUM(l.amount) FILTER (WHERE l.amount < 0 AND l.type::text <> 'PAYMENT_RECEIVED'), 0)::float AS reduced,
        COUNT(*) FILTER (WHERE l.type::text = 'PAYMENT_RECEIVED')::int AS payments,
        COUNT(DISTINCT l."customerId") FILTER (WHERE l.type::text = 'PAYMENT_RECEIVED')::int AS payers,
        COUNT(DISTINCT l."customerId") FILTER (WHERE l.amount > 0)::int AS takers
      FROM "CustomerLedger" l WHERE ${this.ledgerSql(tenantId, scope, w)}`.then((r) => r[0]);
  }

  private opening(tenantId: string, scope: ShopScope, before: Date | null) {
    if (!before) return Promise.resolve(0);
    return this.prisma.customerLedger
      .aggregate({ where: { tenantId, ...(scope.shopId && { shopId: scope.shopId }), createdAt: { lt: before } }, _sum: { amount: true } })
      .then((a) => num(a._sum.amount));
  }

  private static rates(opening: number, f: { given: number; received: number }, days: number, receivable: number) {
    const due = Math.max(0, opening) + f.given;
    return {
      collectionRate: due > EPS ? r2((f.received / due) * 100) : null,
      /** Receivable divided by average credit given per day. */
      daysToCollect: f.given > EPS && days > 0 ? Math.round(receivable / (f.given / days)) : null,
    };
  }

  // ─── Khata ────────────────────────────────────────────────

  async khata(user: AuthenticatedUser, active: ShopScope, q: CustomerPeriodDto) {
    const scope = await narrowScope(this.prisma, user.tenantId, active, q.branch);
    const tenantId = user.tenantId;
    const p = await periodOf(this.tz, tenantId, q.from, q.to);
    const shopWhere = scope.shopId ? { shopId: scope.shopId } : {};

    // Current balances: the branch's own ledger, or each customer's total.
    let balances: Array<{ id: string; balance: number }>;
    if (scope.shopId) {
      const g = await this.prisma.customerLedger.groupBy({ by: ['customerId'], where: { tenantId, shopId: scope.shopId }, _sum: { amount: true } });
      balances = g.map((x) => ({ id: x.customerId, balance: num(x._sum.amount) }));
    } else {
      const c = await this.prisma.customer.findMany({ where: { tenantId, OR: [{ balance: { gt: EPS } }, { balance: { lt: -EPS } }] }, select: { id: true, balance: true } });
      balances = c.map((x) => ({ id: x.id, balance: num(x.balance) }));
    }
    const owing = balances.filter((b) => b.balance > EPS).sort((a, b) => b.balance - a.balance);
    const advance = balances.filter((b) => b.balance < -EPS);
    const ids = owing.map((o) => o.id);
    const receivable = owing.reduce((s, o) => s + o.balance, 0);

    const key = bucketSql(Prisma.sql`l."createdAt"`, p);
    const periodDays = p.gte ? Math.round((p.lt.getTime() - p.gte.getTime()) / DAY) : 0;
    const [entries, people, lastPay, paidIn, flow, prevFlow, opening, prevOpening, trendRows, creditSales, firstEntry] = await Promise.all([
      ids.length ? this.prisma.customerLedger.findMany({ where: { tenantId, ...shopWhere, customerId: { in: ids } }, select: { customerId: true, amount: true, createdAt: true } }) : Promise.resolve([]),
      ids.length ? this.prisma.customer.findMany({
        where: { tenantId, id: { in: ids } },
        select: { id: true, name: true, phone: true, city: true, gender: true, isVip: true, isActive: true, creditLimit: true },
      }) : Promise.resolve([]),
      ids.length ? this.prisma.customerLedger.groupBy({
        by: ['customerId'], where: { tenantId, ...shopWhere, customerId: { in: ids }, type: 'PAYMENT_RECEIVED' }, _max: { createdAt: true },
      }) : Promise.resolve([]),
      ids.length ? this.prisma.customerLedger.groupBy({
        by: ['customerId'], where: { tenantId, ...shopWhere, customerId: { in: ids }, type: 'PAYMENT_RECEIVED', createdAt: { ...(p.gte && { gte: p.gte }), lt: p.lt } }, _sum: { amount: true },
      }) : Promise.resolve([]),
      this.flow(tenantId, scope, p),
      p.prev ? this.flow(tenantId, scope, p.prev) : Promise.resolve(null),
      this.opening(tenantId, scope, p.gte),
      p.prev ? this.opening(tenantId, scope, p.prev.gte) : Promise.resolve(0),
      this.prisma.$queryRaw<Array<{ key: string; given: number; received: number }>>`
        SELECT ${key} AS key, COALESCE(SUM(l.amount) FILTER (WHERE l.amount > 0), 0)::float AS given,
          COALESCE(-SUM(l.amount) FILTER (WHERE l.type::text = 'PAYMENT_RECEIVED'), 0)::float AS received
        FROM "CustomerLedger" l WHERE ${this.ledgerSql(tenantId, scope, p)}
        GROUP BY 1`,
      this.prisma.$queryRaw<Array<{ bills: number; credit: number; net: number }>>`
        SELECT COUNT(*) FILTER (WHERE s."creditAmount" > 0)::int AS bills, COALESCE(SUM(s."creditAmount"), 0)::float AS credit,
          COALESCE(SUM(${BILL_NET}), 0)::float AS net
        FROM "Sale" s WHERE ${liveSql(tenantId, scope, p)}`.then((r) => r[0]),
      p.gte ? Promise.resolve(null) : this.prisma.customerLedger.findFirst({ where: { tenantId, ...shopWhere }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    ]);

    // Ageing per customer from unpaid pieces.
    const now = Date.now();
    const byCustomer = new Map<string, Array<{ amount: number; createdAt: Date }>>();
    for (const e of entries) {
      const list = byCustomer.get(e.customerId) ?? [];
      list.push({ amount: num(e.amount), createdAt: e.createdAt });
      byCustomer.set(e.customerId, list);
    }
    const person = new Map(people.map((x) => [x.id, x]));
    const payAt = new Map(lastPay.map((x) => [x.customerId, x._max.createdAt]));
    const paid = new Map(paidIn.map((x) => [x.customerId, -num(x._sum.amount)]));
    const bands = Object.fromEntries(AGE_BANDS.map((b) => [b.key, { amount: 0, customers: 0 }])) as Record<AgeKey, { amount: number; customers: number }>;

    const rows = owing.map((o) => {
      const pieces = unpaidPieces(byCustomer.get(o.id) ?? []);
      const ages: Record<AgeKey, number> = { d30: 0, d60: 0, d90: 0, d180: 0, old: 0 };
      let counted = 0;
      for (const pc of pieces) {
        const share = Math.min(pc.left, o.balance - counted);
        if (share <= EPS) break;
        ages[bandOf(Math.floor((now - pc.at.getTime()) / DAY))] += share;
        counted += share;
      }
      // Balance with no matching ledger entries (old imports) counts as the oldest band it can be.
      const oldestDays = pieces.length ? Math.floor((now - pieces[0].at.getTime()) / DAY) : null;
      if (o.balance - counted > EPS) ages[oldestDays != null ? bandOf(oldestDays) : 'old'] += o.balance - counted;
      for (const b of AGE_BANDS) if (ages[b.key] > EPS) { bands[b.key].amount += ages[b.key]; bands[b.key].customers += 1; }
      const c = person.get(o.id);
      const last = payAt.get(o.id) ?? null;
      return {
        id: o.id, name: c?.name ?? 'Customer', phone: c?.phone ?? null, city: c?.city ?? null, gender: c?.gender ?? null,
        isVip: c?.isVip ?? false, isActive: c?.isActive ?? true,
        balance: r2(o.balance), creditLimit: r2(num(c?.creditLimit)), overLimit: num(c?.creditLimit) > 0 && o.balance > num(c?.creditLimit),
        oldestDays, over60: r2(ages.d90 + ages.d180 + ages.old),
        ages: Object.fromEntries(AGE_BANDS.map((b) => [b.key, r2(ages[b.key])])) as Record<AgeKey, number>,
        lastPaymentAt: last, daysSincePayment: last ? Math.floor((now - last.getTime()) / DAY) : null,
        paidInPeriod: r2(paid.get(o.id) ?? 0),
      };
    });
    rows.sort((a, b) => b.over60 - a.over60 || b.balance - a.balance);

    const keys = bucketKeys(p, firstEntry ? businessDayKey(firstEntry.createdAt, p.tz, p.dayStartHour) : null);
    const byKey = new Map(trendRows.map((t) => [t.key, t]));
    const trend = keys.map((k) => ({ key: k, given: r2(num(byKey.get(k)?.given)), received: r2(num(byKey.get(k)?.received)) }));

    const closing = opening + flow.given - flow.received - flow.reduced;
    return {
      from: p.fromKey ?? keys[0] ?? p.toKey, to: p.toKey, grouping: p.monthly ? 'month' : 'day',
      totals: {
        receivable: r2(receivable), owing: owing.length,
        advance: r2(-advance.reduce((s, a) => s + a.balance, 0)), advanceCount: advance.length,
        overLimit: rows.filter((r) => r.overLimit).length,
        noPayment60: rows.filter((r) => (r.daysSincePayment ?? Infinity) > 60).length,
        over60: r2(rows.reduce((s, r) => s + r.over60, 0)),
        opening: r2(opening), closing: r2(closing),
        given: r2(flow.given), received: r2(flow.received), reduced: r2(flow.reduced),
        payments: flow.payments, payers: flow.payers, takers: flow.takers,
        creditBills: creditSales.bills, creditShare: creditSales.net > 0 ? r2((creditSales.credit / creditSales.net) * 100) : 0,
        ...CustomerCreditService.rates(opening, flow, periodDays, receivable),
      },
      previous: prevFlow && p.prev ? {
        given: r2(prevFlow.given), received: r2(prevFlow.received),
        ...CustomerCreditService.rates(prevOpening, prevFlow, periodDays, receivable),
      } : null,
      aging: AGE_BANDS.map((b) => ({ key: b.key, label: b.label, amount: r2(bands[b.key].amount), customers: bands[b.key].customers })),
      trend,
      rows: rows.slice(0, 2000),
    };
  }

  // ─── Loyalty ──────────────────────────────────────────────

  async loyalty(user: AuthenticatedUser, active: ShopScope, q: CustomerPeriodDto) {
    const scope = await narrowScope(this.prisma, user.tenantId, active, q.branch);
    const tenantId = user.tenantId;
    const p: Period = await periodOf(this.tz, tenantId, q.from, q.to);
    const where = (w: { gte: Date | null; lt: Date }) => Prisma.sql`t."tenantId" = ${tenantId}
      ${scope.shopId ? Prisma.sql`AND t."shopId" = ${scope.shopId}` : Prisma.empty}
      ${w.gte ? Prisma.sql`AND t."createdAt" >= ${w.gte}` : Prisma.empty}
      AND t."createdAt" < ${w.lt}`;
    type Sum = { issued: number; redeemed: number; expired: number; adjusted: number; earners: number; redeemers: number };
    const sum = (w: { gte: Date | null; lt: Date }) => this.prisma.$queryRaw<Sum[]>`
      SELECT COALESCE(SUM(t.points) FILTER (WHERE t.type::text = 'EARNED'), 0)::float AS issued,
        COALESCE(-SUM(t.points) FILTER (WHERE t.type::text = 'REDEEMED'), 0)::float AS redeemed,
        COALESCE(-SUM(t.points) FILTER (WHERE t.type::text = 'EXPIRED'), 0)::float AS expired,
        COALESCE(SUM(t.points) FILTER (WHERE t.type::text = 'ADJUSTMENT'), 0)::float AS adjusted,
        COUNT(DISTINCT t."customerId") FILTER (WHERE t.type::text = 'EARNED')::int AS earners,
        COUNT(DISTINCT t."customerId") FILTER (WHERE t.type::text = 'REDEEMED')::int AS redeemers
      FROM "LoyaltyTransaction" t WHERE ${where(w)}`.then((r) => r[0]);
    const key = bucketSql(Prisma.sql`t."createdAt"`, p);

    const [settings, now, prev, outstanding, trendRows, sales, top, firstEntry] = await Promise.all([
      this.prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { enableLoyalty: true, loyaltyPointsPerRupee: true, loyaltyRedemptionRate: true, loyaltyExpiryDays: true, loyaltyMinRedeem: true },
      }),
      sum(p),
      p.prev ? sum(p.prev) : Promise.resolve(null),
      this.prisma.customer.aggregate({ where: { tenantId, loyaltyPoints: { gt: 0 } }, _sum: { loyaltyPoints: true }, _count: { _all: true } }),
      this.prisma.$queryRaw<Array<{ key: string; issued: number; redeemed: number }>>`
        SELECT ${key} AS key, COALESCE(SUM(t.points) FILTER (WHERE t.type::text = 'EARNED'), 0)::float AS issued,
          COALESCE(-SUM(t.points) FILTER (WHERE t.type::text = 'REDEEMED'), 0)::float AS redeemed
        FROM "LoyaltyTransaction" t WHERE ${where(p)}
        GROUP BY 1`,
      this.prisma.$queryRaw<Array<{ value: number; bills: number; memberNet: number; net: number }>>`
        SELECT COALESCE(SUM(s."loyaltyDiscount"), 0)::float AS value, COUNT(*) FILTER (WHERE s."loyaltyUsed" > 0)::int AS bills,
          COALESCE(SUM(${BILL_NET}) FILTER (WHERE s."loyaltyEarned" > 0 OR s."loyaltyUsed" > 0), 0)::float AS "memberNet",
          COALESCE(SUM(${BILL_NET}), 0)::float AS net
        FROM "Sale" s WHERE ${liveSql(tenantId, scope, p)}`.then((r) => r[0]),
      this.prisma.customer.findMany({
        where: { tenantId, isActive: true, loyaltyPoints: { gt: 0 } }, orderBy: { loyaltyPoints: 'desc' }, take: 25,
        select: { id: true, name: true, phone: true, city: true, gender: true, loyaltyPoints: true, totalSpent: true, isVip: true },
      }),
      p.gte ? Promise.resolve(null) : this.prisma.loyaltyTransaction.findFirst({ where: { tenantId, ...(scope.shopId && { shopId: scope.shopId }) }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    ]);

    const rate = settings?.loyaltyRedemptionRate ?? 1;
    const keys = bucketKeys(p, firstEntry ? businessDayKey(firstEntry.createdAt, p.tz, p.dayStartHour) : null);
    const byKey = new Map(trendRows.map((t) => [t.key, t]));
    const points = num(outstanding._sum.loyaltyPoints);
    const shape = (s: Sum) => ({
      issued: s.issued, redeemed: s.redeemed, expired: s.expired, adjusted: s.adjusted, earners: s.earners, redeemers: s.redeemers,
      issuedValue: r2(s.issued * rate),
      redeemRate: s.issued > 0 ? r2((s.redeemed / s.issued) * 100) : null,
    });

    return {
      from: p.fromKey ?? keys[0] ?? p.toKey, to: p.toKey, grouping: p.monthly ? 'month' : 'day',
      enabled: !!settings?.enableLoyalty,
      settings: {
        pointsPerRupee: settings?.loyaltyPointsPerRupee ?? 0.01, redemptionRate: rate,
        expiryDays: settings?.loyaltyExpiryDays ?? 0, minRedeem: settings?.loyaltyMinRedeem ?? 0,
      },
      outstanding: { points, value: r2(points * rate), holders: outstanding._count._all },
      totals: {
        ...shape(now),
        redeemedValue: r2(sales.value), redeemBills: sales.bills,
        memberShare: sales.net > 0 ? r2((sales.memberNet / sales.net) * 100) : 0,
      },
      previous: prev ? shape(prev) : null,
      trend: keys.map((k) => ({ key: k, issued: num(byKey.get(k)?.issued), redeemed: num(byKey.get(k)?.redeemed) })),
      top: top.map((c) => ({ id: c.id, name: c.name, phone: c.phone, city: c.city, gender: c.gender, isVip: c.isVip, points: c.loyaltyPoints, value: r2(c.loyaltyPoints * rate), spent: r2(c.totalSpent) })),
    };
  }
}
