/**
 * Customers report: who buys, how often and how much, for any business-day
 * period at the active branch or all branches. Covers new against returning
 * buyers, named against walk-in sales, top customers, visit rhythm, cities,
 * RFM segments and monthly retention cohorts. Sales count net of returns and
 * leave voided bills out; profit uses the cost recorded on each sale line.
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { businessDayKey, zonedToUtc } from '../../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { ShopScope } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CustomerCohortDto, CustomerPeriodDto, CustomerSegmentDto, SEGMENTS, type SegmentKey } from './dto/customers-report.dto';
import { DAY, LIVE, bizTime, bucketKeys, bucketSql, liveSql, narrowScope, num, periodOf, r2, type Period } from './range';

interface BuyerRow {
  id: string; bills: number; visits: number; net: number; goods: number; credit: number;
  firstIn: Date; lastIn: Date; first: Date;
  name: string; phone: string | null; city: string | null; area: string | null; gender: string | null; isVip: boolean; isActive: boolean;
}

interface SegmentRow {
  id: string; last: Date; first: Date; bills: number; visits: number; net: number; lifetime: number;
  name: string; phone: string | null; city: string | null; gender: string | null; isVip: boolean; balance: number; points: number;
}

const canSeeCost = (user: AuthenticatedUser) => hasPermission(user.role, user.permissions, PERMISSIONS.COST_VIEW);

/** Recency score from days since the last visit. */
const rScore = (days: number) => (days <= 14 ? 5 : days <= 30 ? 4 : days <= 60 ? 3 : days <= 120 ? 2 : 1);
/** Frequency score from visit days in the last 12 months. */
const fScore = (visits: number) => (visits >= 12 ? 5 : visits >= 6 ? 4 : visits >= 3 ? 3 : visits === 2 ? 2 : 1);

/** Every recency × frequency pair falls in exactly one segment. */
function segmentOf(r: number, f: number): Exclude<SegmentKey, 'never'> {
  if (r >= 4 && f >= 4) return 'champions';
  if (r >= 3 && f >= 3) return 'loyal';
  if (r >= 4) return 'promising';
  if (r === 3) return 'attention';
  return f >= 3 ? 'atRisk' : 'lost';
}

const median = (list: number[]) => {
  if (!list.length) return 0;
  const s = [...list].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

@Injectable()
export class CustomerInsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /** Named buyers of a window with their first purchase ever (in the same scope). */
  private buyers(tenantId: string, scope: ShopScope, w: { gte: Date | null; lt: Date }, p: Period) {
    const where = liveSql(tenantId, scope, w);
    const day = Prisma.sql`to_char(${bizTime(Prisma.sql`s."soldAt"`, p)}, 'YYYY-MM-DD')`;
    return this.prisma.$queryRaw<BuyerRow[]>`
      WITH rc AS (
        SELECT si."saleId", SUM(si."returnedQty" * si."costPrice") AS rcost
        FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId"
        WHERE ${where} AND s."customerId" IS NOT NULL AND si."returnedQty" > 0
        GROUP BY si."saleId"),
      b AS (
        SELECT s."customerId" AS id, COUNT(*)::int AS bills, COUNT(DISTINCT ${day})::int AS visits,
          SUM(s.total - s."refundedAmount")::float AS net, SUM(s."costOfGoods" - COALESCE(rc.rcost, 0))::float AS goods,
          SUM(s."creditAmount")::float AS credit, MIN(s."soldAt") AS "firstIn", MAX(s."soldAt") AS "lastIn"
        FROM "Sale" s LEFT JOIN rc ON rc."saleId" = s.id
        WHERE ${where} AND s."customerId" IS NOT NULL
        GROUP BY 1),
      f AS (
        SELECT s."customerId" AS id, MIN(s."soldAt") AS first
        FROM "Sale" s
        WHERE ${liveSql(tenantId, scope)} AND s."customerId" IN (SELECT id FROM b)
        GROUP BY 1)
      SELECT b.*, f.first, c.name, c.phone, c.city, c.area, c.gender::text AS gender, c."isVip", c."isActive"
      FROM b JOIN f ON f.id = b.id JOIN "Customer" c ON c.id = b.id`;
  }

  private walkIn(tenantId: string, scope: ShopScope, w: { gte: Date | null; lt: Date }) {
    return this.prisma.$queryRaw<Array<{ bills: number; net: number }>>`
      SELECT COUNT(*)::int AS bills, COALESCE(SUM(s.total - s."refundedAmount"), 0)::float AS net
      FROM "Sale" s WHERE ${liveSql(tenantId, scope, w)} AND s."customerId" IS NULL`.then((r) => r[0]);
  }

  private signups(tenantId: string, scope: ShopScope, w: { gte: Date | null; lt: Date }) {
    return this.prisma.customer.count({
      where: { tenantId, ...(scope.shopId && { shopId: scope.shopId }), createdAt: { ...(w.gte && { gte: w.gte }), lt: w.lt } },
    });
  }

  private static totals(rows: BuyerRow[], walk: { bills: number; net: number }, signups: number, from: Date | null, showCost: boolean) {
    const isNew = (r: BuyerRow) => !from || r.first >= from;
    let named = 0, bills = 0, visits = 0, goods = 0, credit = 0, newBuyers = 0, newNet = 0, repeat = 0;
    for (const r of rows) {
      named += r.net; bills += r.bills; visits += r.visits; goods += r.goods; credit += r.credit;
      if (isNew(r)) { newBuyers += 1; newNet += r.net; }
      if (r.visits > 1) repeat += 1;
    }
    const all = named + walk.net;
    const buyers = rows.length;
    return {
      buyers, newBuyers, returning: buyers - newBuyers, repeat,
      repeatRate: buyers ? r2((repeat / buyers) * 100) : 0,
      signups,
      named: r2(named), namedBills: bills, newNet: r2(newNet), returningNet: r2(named - newNet),
      walkIn: r2(walk.net), walkInBills: walk.bills,
      namedShare: all > 0 ? r2((named / all) * 100) : 0,
      avgSpend: buyers ? r2(named / buyers) : 0,
      avgBasket: bills ? r2(named / bills) : 0,
      walkInBasket: walk.bills ? r2(walk.net / walk.bills) : 0,
      avgVisits: buyers ? r2(visits / buyers) : 0,
      credit: r2(credit),
      ...(showCost && { profit: r2(named - goods), margin: named > 0 ? r2(((named - goods) / named) * 100) : 0 }),
    };
  }

  // ─── Overview ─────────────────────────────────────────────

  async overview(user: AuthenticatedUser, active: ShopScope, q: CustomerPeriodDto) {
    const scope = await narrowScope(this.prisma, user.tenantId, active, q.branch);
    const tenantId = user.tenantId;
    const p = await periodOf(this.tz, tenantId, q.from, q.to);
    const showCost = canSeeCost(user);
    const where = liveSql(tenantId, scope, p);
    const key = bucketSql(Prisma.sql`s."soldAt"`, p);
    const firstKey = bucketSql(Prisma.sql`f.first`, p);

    type Trend = { key: string; newBuyers: number; returningBuyers: number; named: number; walkIn: number; namedBills: number; walkInBills: number };
    type Branch = { id: string | null; buyers: number; named: number; walkIn: number };

    const [rows, walk, signups, prevRows, prevWalk, prevSignups, trendRows, branchRows, firstSale] = await Promise.all([
      this.buyers(tenantId, scope, p, p),
      this.walkIn(tenantId, scope, p),
      this.signups(tenantId, scope, p),
      p.prev ? this.buyers(tenantId, scope, p.prev, p) : Promise.resolve(null),
      p.prev ? this.walkIn(tenantId, scope, p.prev) : Promise.resolve(null),
      p.prev ? this.signups(tenantId, scope, p.prev) : Promise.resolve(0),
      this.prisma.$queryRaw<Trend[]>`
        WITH b AS (
          SELECT ${key} AS key, s."customerId" AS id, COUNT(*)::int AS bills, SUM(s.total - s."refundedAmount")::float AS net
          FROM "Sale" s WHERE ${where}
          GROUP BY 1, 2),
        f AS (
          SELECT s."customerId" AS id, MIN(s."soldAt") AS first
          FROM "Sale" s
          WHERE ${liveSql(tenantId, scope)} AND s."customerId" IN (SELECT id FROM b WHERE id IS NOT NULL)
          GROUP BY 1)
        SELECT b.key,
          COUNT(b.id) FILTER (WHERE ${firstKey} = b.key)::int AS "newBuyers",
          COUNT(b.id) FILTER (WHERE ${firstKey} <> b.key)::int AS "returningBuyers",
          COALESCE(SUM(b.net) FILTER (WHERE b.id IS NOT NULL), 0)::float AS named,
          COALESCE(SUM(b.net) FILTER (WHERE b.id IS NULL), 0)::float AS "walkIn",
          COALESCE(SUM(b.bills) FILTER (WHERE b.id IS NOT NULL), 0)::int AS "namedBills",
          COALESCE(SUM(b.bills) FILTER (WHERE b.id IS NULL), 0)::int AS "walkInBills"
        FROM b LEFT JOIN f ON f.id = b.id
        GROUP BY 1`,
      scope.isAll
        ? this.prisma.$queryRaw<Branch[]>`
            SELECT s."shopId" AS id, COUNT(DISTINCT s."customerId")::int AS buyers,
              COALESCE(SUM(s.total - s."refundedAmount") FILTER (WHERE s."customerId" IS NOT NULL), 0)::float AS named,
              COALESCE(SUM(s.total - s."refundedAmount") FILTER (WHERE s."customerId" IS NULL), 0)::float AS "walkIn"
            FROM "Sale" s WHERE ${where}
            GROUP BY 1`
        : Promise.resolve([] as Branch[]),
      p.gte ? Promise.resolve(null) : this.prisma.sale.findFirst({
        where: { tenantId, ...scope.where, status: { in: [...LIVE] } }, orderBy: { soldAt: 'asc' }, select: { soldAt: true },
      }),
    ]);

    // Buckets with gaps filled.
    const keys = bucketKeys(p, firstSale ? businessDayKey(firstSale.soldAt, p.tz, p.dayStartHour) : null);
    const byKey = new Map(trendRows.map((t) => [t.key, t]));
    const trend = keys.map((k) => {
      const t = byKey.get(k);
      return {
        key: k, newBuyers: t?.newBuyers ?? 0, returningBuyers: t?.returningBuyers ?? 0,
        named: r2(num(t?.named)), walkIn: r2(num(t?.walkIn)), namedBills: t?.namedBills ?? 0, walkInBills: t?.walkInBills ?? 0,
      };
    });

    // How many days a customer buys on, within the period.
    const bands = [
      { key: '1', label: '1 din', min: 1, max: 1 }, { key: '2', label: '2 din', min: 2, max: 2 },
      { key: '3-5', label: '3–5 din', min: 3, max: 5 }, { key: '6-10', label: '6–10 din', min: 6, max: 10 },
      { key: '11+', label: '11+ din', min: 11, max: Infinity },
    ];
    const visits = bands.map((b) => {
      const list = rows.filter((r) => r.visits >= b.min && r.visits <= b.max);
      return { key: b.key, label: b.label, customers: list.length, net: r2(list.reduce((s, r) => s + r.net, 0)) };
    });

    // Days between visits for customers who came on two or more days.
    const gaps = rows.filter((r) => r.visits > 1).map((r) => (r.lastIn.getTime() - r.firstIn.getTime()) / DAY / (r.visits - 1));
    const frequency = {
      customers: gaps.length,
      avgDays: gaps.length ? r2(gaps.reduce((s, g) => s + g, 0) / gaps.length) : null,
      medianDays: gaps.length ? r2(median(gaps)) : null,
    };

    const now = Date.now();
    const out = (r: BuyerRow) => ({
      id: r.id, name: r.name, phone: r.phone, city: r.city, isVip: r.isVip, isActive: r.isActive,
      bills: r.bills, visits: r.visits, net: r2(r.net), average: r.bills ? r2(r.net / r.bills) : 0, credit: r2(r.credit),
      lastAt: r.lastIn, firstAt: r.first, isNew: !p.gte || r.first >= p.gte, daysSince: Math.floor((now - r.lastIn.getTime()) / DAY),
      ...(showCost && { profit: r2(r.net - r.goods) }),
    });
    const topBy = (score: (r: BuyerRow) => number) => [...rows].sort((a, b) => score(b) - score(a) || b.net - a.net).slice(0, 25).map(out);

    // Cities and areas, case and space blind.
    const group = (pick: (r: BuyerRow) => string | null, limit: number) => {
      const map = new Map<string, { name: string; buyers: number; net: number }>();
      let missing = 0, missingNet = 0;
      for (const r of rows) {
        const raw = pick(r)?.trim().replace(/\s+/g, ' ');
        if (!raw) { missing += 1; missingNet += r.net; continue; }
        const k = raw.toLowerCase();
        const g = map.get(k) ?? { name: raw, buyers: 0, net: 0 };
        g.buyers += 1; g.net += r.net;
        map.set(k, g);
      }
      const list = [...map.values()].sort((a, b) => b.net - a.net);
      return {
        rows: list.slice(0, limit).map((g) => ({ ...g, net: r2(g.net) })),
        others: list.length > limit ? { groups: list.length - limit, buyers: list.slice(limit).reduce((s, g) => s + g.buyers, 0), net: r2(list.slice(limit).reduce((s, g) => s + g.net, 0)) } : null,
        missing: { buyers: missing, net: r2(missingNet) },
      };
    };

    const genders = ['MALE', 'FEMALE', 'OTHER'].map((g) => {
      const list = rows.filter((r) => (g === 'OTHER' ? r.gender !== 'MALE' && r.gender !== 'FEMALE' : r.gender === g));
      return { key: g, buyers: list.length, net: r2(list.reduce((s, r) => s + r.net, 0)) };
    });

    const shops = branchRows.length > 1
      ? await this.prisma.shop.findMany({ where: { tenantId, id: { in: branchRows.map((b) => b.id).filter((x): x is string => !!x) } }, select: { id: true, name: true } })
      : [];
    const shopName = new Map(shops.map((s) => [s.id, s.name]));

    return {
      from: p.fromKey ?? keys[0] ?? p.toKey, to: p.toKey, grouping: p.monthly ? 'month' : 'day',
      totals: CustomerInsightsService.totals(rows, walk, signups, p.gte, showCost),
      previous: p.prev && prevRows && prevWalk ? CustomerInsightsService.totals(prevRows, prevWalk, prevSignups, p.prev.gte, showCost) : null,
      trend,
      visits,
      frequency,
      top: {
        spend: topBy((r) => r.net),
        visits: topBy((r) => r.visits),
        ...(showCost && { profit: topBy((r) => r.net - r.goods) }),
        credit: topBy((r) => r.credit).filter((r) => r.credit > 0),
      },
      cities: group((r) => r.city, 12),
      areas: group((r) => r.area, 12),
      genders,
      branches: branchRows.length > 1
        ? branchRows.map((b) => ({ id: b.id, name: b.id ? shopName.get(b.id) ?? 'Branch' : 'Baghair branch', buyers: b.buyers, named: r2(b.named), walkIn: r2(b.walkIn) }))
            .sort((a, b) => b.named + b.walkIn - (a.named + a.walkIn))
        : [],
    };
  }

  // ─── RFM segments ─────────────────────────────────────────

  /**
   * Recency (days since the last visit) and frequency (visit days in the
   * last 12 months) put every active customer who has bought in one segment.
   * Spend is the last 12 months, net of returns.
   */
  async segments(user: AuthenticatedUser, active: ShopScope, q: CustomerSegmentDto) {
    const scope = await narrowScope(this.prisma, user.tenantId, active, q.branch);
    const tenantId = user.tenantId;
    const clock = await this.tz.clock(tenantId);
    const now = new Date();
    const yearAgo = new Date(now.getTime() - 365 * DAY);
    const day = Prisma.sql`to_char(${bizTime(Prisma.sql`s."soldAt"`, clock)}, 'YYYY-MM-DD')`;
    const neverWhere: Prisma.CustomerWhereInput = {
      tenantId, isActive: true,
      ...(scope.shopId && { shopId: scope.shopId }),
      sales: { none: { status: { in: [...LIVE] }, ...(scope.shopId && { shopId: scope.shopId }) } },
    };

    const [rows, never] = await Promise.all([
      this.prisma.$queryRaw<SegmentRow[]>`
        WITH a AS (
          SELECT s."customerId" AS id, MAX(s."soldAt") AS last, MIN(s."soldAt") AS first, COUNT(*)::int AS bills,
            COUNT(DISTINCT ${day}) FILTER (WHERE s."soldAt" >= ${yearAgo})::int AS visits,
            COALESCE(SUM(s.total - s."refundedAmount") FILTER (WHERE s."soldAt" >= ${yearAgo}), 0)::float AS net,
            SUM(s.total - s."refundedAmount")::float AS lifetime
          FROM "Sale" s
          WHERE ${liveSql(tenantId, scope)} AND s."customerId" IS NOT NULL
          GROUP BY 1)
        SELECT a.*, c.name, c.phone, c.city, c.gender::text AS gender, c."isVip", c.balance, c."loyaltyPoints" AS points
        FROM a JOIN "Customer" c ON c.id = a.id
        WHERE c."isActive" = true`,
      this.prisma.customer.count({ where: neverWhere }),
    ]);

    const scored = rows.map((r) => {
      const days = Math.max(0, Math.floor((now.getTime() - r.last.getTime()) / DAY));
      const rs = rScore(days);
      const fs = fScore(r.visits);
      return { row: r, days, r: rs, f: fs, segment: segmentOf(rs, fs) };
    });

    const totalNet = scored.reduce((s, x) => s + x.row.net, 0);
    const summary = SEGMENTS.filter((k): k is Exclude<SegmentKey, 'never'> => k !== 'never').map((key) => {
      const list = scored.filter((x) => x.segment === key);
      const net = list.reduce((s, x) => s + x.row.net, 0);
      return {
        key, customers: list.length, net: r2(net),
        share: totalNet > 0 ? r2((net / totalNet) * 100) : 0,
        avgDays: list.length ? Math.round(list.reduce((s, x) => s + x.days, 0) / list.length) : 0,
        avgVisits: list.length ? r2(list.reduce((s, x) => s + x.row.visits, 0) / list.length) : 0,
        avgSpend: list.length ? r2(net / list.length) : 0,
        withPhone: list.filter((x) => x.row.phone?.trim()).length,
        owing: list.filter((x) => x.row.balance > 0.01).length,
      };
    });

    // 5 × 5 grid: grid[r - 1][f - 1] = customers.
    const grid = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 0));
    for (const x of scored) grid[x.r - 1][x.f - 1] += 1;

    let list: Array<Record<string, unknown>> | null = null;
    if (q.segment === 'never') {
      const cs = await this.prisma.customer.findMany({
        where: neverWhere, orderBy: { createdAt: 'desc' }, take: 3000,
        select: { id: true, name: true, phone: true, city: true, gender: true, isVip: true, balance: true, loyaltyPoints: true, createdAt: true },
      });
      list = cs.map((c) => ({
        id: c.id, name: c.name, phone: c.phone, city: c.city, gender: c.gender, isVip: c.isVip,
        lastAt: null, firstAt: null, joinedAt: c.createdAt, days: null, visits: 0, bills: 0, net: 0, lifetime: 0, average: 0,
        balance: r2(c.balance), points: c.loyaltyPoints, r: null, f: null,
      }));
    } else if (q.segment) {
      list = scored.filter((x) => x.segment === q.segment)
        .sort((a, b) => b.row.net - a.row.net || a.days - b.days)
        .slice(0, 3000)
        .map((x) => ({
          id: x.row.id, name: x.row.name, phone: x.row.phone, city: x.row.city, gender: x.row.gender, isVip: x.row.isVip,
          lastAt: x.row.last, firstAt: x.row.first, joinedAt: null, days: x.days, visits: x.row.visits, bills: x.row.bills,
          net: r2(x.row.net), lifetime: r2(x.row.lifetime), average: x.row.visits ? r2(x.row.net / x.row.visits) : 0,
          balance: r2(x.row.balance), points: x.row.points, r: x.r, f: x.f,
        }));
    }

    return {
      asOf: now,
      customers: scored.length,
      activeYear: scored.filter((x) => x.row.visits > 0).length,
      net: r2(totalNet),
      never,
      segments: summary,
      grid,
      segment: q.segment ?? null,
      rows: list,
    };
  }

  // ─── Retention cohorts ────────────────────────────────────

  /**
   * Customers grouped by the month of their first purchase, and how many of
   * them bought again in each later month. Months are business months in
   * the shop's timezone.
   */
  async cohorts(user: AuthenticatedUser, active: ShopScope, q: CustomerCohortDto) {
    const scope = await narrowScope(this.prisma, user.tenantId, active, q.branch);
    const tenantId = user.tenantId;
    const months = q.months ?? 12;
    const clock = await this.tz.clock(tenantId);
    const [y, m] = businessDayKey(new Date(), clock.tz, clock.dayStartHour).split('-').map(Number);
    let cy = y, cm = m - (months - 1);
    while (cm < 1) { cm += 12; cy -= 1; }
    const cohortStart = `${cy}-${String(cm).padStart(2, '0')}-01`;
    const startUtc = zonedToUtc(cy, cm, 1, clock.dayStartHour, 0, 0, clock.tz);
    const biz = bizTime(Prisma.sql`s."soldAt"`, clock);

    const rows = await this.prisma.$queryRaw<Array<{ cohort: string; offset: number; customers: number; net: number }>>`
      WITH f AS (
        SELECT s."customerId" AS id, date_trunc('month', MIN(${biz})) AS c
        FROM "Sale" s
        WHERE ${liveSql(tenantId, scope)} AND s."customerId" IS NOT NULL
        GROUP BY 1),
      a AS (
        SELECT s."customerId" AS id, date_trunc('month', ${biz}) AS m, SUM(s.total - s."refundedAmount") AS net
        FROM "Sale" s
        WHERE ${liveSql(tenantId, scope, { gte: startUtc, lt: new Date(Date.now() + DAY) })} AND s."customerId" IS NOT NULL
        GROUP BY 1, 2)
      SELECT to_char(f.c, 'YYYY-MM') AS cohort,
        ((EXTRACT(YEAR FROM a.m) - EXTRACT(YEAR FROM f.c)) * 12 + EXTRACT(MONTH FROM a.m) - EXTRACT(MONTH FROM f.c))::int AS "offset",
        COUNT(*)::int AS customers, COALESCE(SUM(a.net), 0)::float AS net
      FROM a JOIN f ON f.id = a.id
      WHERE f.c >= ${cohortStart}::timestamp
      GROUP BY 1, 2`;

    const keys: string[] = [];
    for (let i = 0, yy = cy, mm = cm; i < months; i++) {
      keys.push(`${yy}-${String(mm).padStart(2, '0')}`);
      mm += 1;
      if (mm > 12) { mm = 1; yy += 1; }
    }
    const cell = new Map(rows.map((r) => [`${r.cohort}|${r.offset}`, r]));
    const cohorts = keys.map((key, i) => {
      const size = cell.get(`${key}|0`)?.customers ?? 0;
      const age = months - 1 - i;
      const cells = Array.from({ length: age + 1 }, (_, off) => {
        const c = cell.get(`${key}|${off}`);
        return { offset: off, customers: c?.customers ?? 0, pct: size ? r2(((c?.customers ?? 0) / size) * 100) : 0, net: r2(num(c?.net)) };
      });
      return { key, size, net: r2(cells.reduce((s, c) => s + c.net, 0)), cells };
    });

    // Average retention per month offset, weighted by cohort size, over cohorts old enough.
    const curve = Array.from({ length: months }, (_, off) => {
      const ready = cohorts.filter((c) => c.cells.length > off && c.size > 0);
      const base = ready.reduce((s, c) => s + c.size, 0);
      const back = ready.reduce((s, c) => s + c.cells[off].customers, 0);
      return { offset: off, pct: base ? r2((back / base) * 100) : null, cohorts: ready.length };
    });

    return {
      months, from: keys[0], to: keys[keys.length - 1],
      newCustomers: cohorts.reduce((s, c) => s + c.size, 0),
      cohorts,
      curve,
    };
  }
}
