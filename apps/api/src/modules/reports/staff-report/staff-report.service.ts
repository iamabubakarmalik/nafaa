/**
 * Staff report: what each person sold and how they handled the counter for
 * a business-day period. A bill counts for its salesperson (`soldById`),
 * else for whoever rang it up. Sales are net of returns on the bill's own
 * day and leave voided bills out; cost follows business-math.helper. A
 * void counts for whoever cancelled the bill (its SALE_VOIDED log); older
 * voids without a log count for the bill's person. Cost, profit
 * and margin keys are stripped by the cost-masking interceptor for users
 * without cost access. Drawer money is left out when Settings → Reports
 * hides it from staff.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { businessDayKey } from '../../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { hiddenFigures } from '../../../common/helpers/reports-config.helper';
import { BILL_CASH_IN, BILL_NET, KEPT_QTY, LINE_REVENUE, billMathCte } from '../../../common/helpers/business-math.helper';
import { ShopScope } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CommissionService } from '../../hr/commission/commission.service';
import { PIN_APPROVAL_ACTION } from '../../sales/returns/returns.helpers';
import { BillKind, StaffBillsDto, StaffPeriodDto } from './dto/staff-report.dto';
import {
  TOLERANCE, VOIDER, VOID_LOG, WHO, bizTime, bucketKeys, localTime, num, r2, saleWhere, staffRange, within, type StaffRange,
} from './staff-range';

const PIN_FAILED = 'PIN_VERIFY_FAILED';
const UNKNOWN = 'Bina naam';

interface SalesRow {
  id: string | null; bills: number; gross: number; refunds: number; cost: number; subtotal: number;
  discount: number; manual: number; discBills: number; credit: number; creditBills: number; collected: number;
  returnedBills: number; reassigned: number; qty: number; lines: number; customers: number; walkIns: number;
  days: number; slots: number; first: Date | null; last: Date | null; maxBill: number;
}
interface CountRow { id: string | null; count: number; amount: number }

/** Thresholds for the "needs a look" list: well above the team on enough bills. */
const above = (value: number, team: number, gap: number) => value > Math.max(team * 2, team + gap);

@Injectable()
export class StaffReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly commission: CommissionService,
  ) {}

  /** Per-bill items kept and line count for the bills in `where`. */
  private itemsCte(where: Prisma.Sql) {
    return Prisma.sql`it AS (
      SELECT si."saleId", SUM(${KEPT_QTY}) AS qty, COUNT(*) AS lines
      FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId"
      WHERE ${where}
      GROUP BY si."saleId")`;
  }

  private salesRows(where: Prisma.Sql, r: StaffRange) {
    const biz = bizTime(Prisma.sql`s."soldAt"`, r);
    return this.prisma.$queryRaw<SalesRow[]>`
      WITH ${billMathCte(where)}, ${this.itemsCte(where)}
      SELECT ${WHO} AS id, COUNT(*)::int AS bills,
        COALESCE(SUM(s.total), 0)::float AS gross, COALESCE(SUM(s."refundedAmount"), 0)::float AS refunds,
        COALESCE(SUM(bm.cost), 0)::float AS cost,
        COALESCE(SUM(s.subtotal), 0)::float AS subtotal, COALESCE(SUM(s.discount), 0)::float AS discount,
        COALESCE(SUM(GREATEST(s.discount - s."codeDiscount" - s."loyaltyDiscount", 0)), 0)::float AS manual,
        COUNT(*) FILTER (WHERE s.discount - s."codeDiscount" - s."loyaltyDiscount" > 0.009)::int AS "discBills",
        COALESCE(SUM(s."creditAmount"), 0)::float AS credit, COUNT(*) FILTER (WHERE s."creditAmount" > 0)::int AS "creditBills",
        COALESCE(SUM(${BILL_CASH_IN}), 0)::float AS collected,
        COUNT(*) FILTER (WHERE s."refundedAmount" > 0)::int AS "returnedBills",
        COUNT(*) FILTER (WHERE s."soldById" IS NOT NULL AND s."soldById" IS DISTINCT FROM s."createdById")::int AS reassigned,
        COALESCE(SUM(it.qty), 0)::float AS qty, COALESCE(SUM(it.lines), 0)::int AS lines,
        COUNT(DISTINCT s."customerId")::int AS customers, COUNT(*) FILTER (WHERE s."customerId" IS NULL)::int AS "walkIns",
        COUNT(DISTINCT to_char(${biz}, 'YYYY-MM-DD'))::int AS days,
        COUNT(DISTINCT to_char(${biz}, 'YYYY-MM-DD HH24'))::int AS slots,
        MIN(s."soldAt") AS first, MAX(s."soldAt") AS last, COALESCE(MAX(s.total), 0)::float AS "maxBill"
      FROM "Sale" s JOIN bm ON bm.id = s.id LEFT JOIN it ON it."saleId" = s.id
      WHERE ${where}
      GROUP BY 1`;
  }

  private returnsDone(user: AuthenticatedUser, scope: ShopScope, r: StaffRange) {
    return this.prisma.$queryRaw<Array<CountRow & { others: number }>>`
      SELECT x."createdById" AS id, COUNT(*)::int AS count, COALESCE(SUM(x."refundAmount"), 0)::float AS amount,
        COUNT(*) FILTER (WHERE x."createdById" IS DISTINCT FROM ${WHO})::int AS others
      FROM "SaleReturn" x JOIN "Sale" s ON s.id = x."saleId"
      WHERE x."tenantId" = ${user.tenantId}
        ${scope.shopId ? Prisma.sql`AND COALESCE(x."shopId", s."shopId") = ${scope.shopId}` : Prisma.empty}
        ${r.gte ? Prisma.sql`AND x."returnedAt" >= ${r.gte}` : Prisma.empty}
        AND x."returnedAt" < ${r.lt}
      GROUP BY 1`;
  }

  /** Refunds let through with the owner's PIN (branch of the return) and wrong PIN tries (any branch). */
  private pinEvents(user: AuthenticatedUser, scope: ShopScope, r: StaffRange) {
    return this.prisma.$queryRaw<Array<{ id: string | null; action: string; count: number }>>`
      SELECT a."userId" AS id, a.action, COUNT(*)::int AS count
      FROM "ActivityLog" a
      LEFT JOIN "SaleReturn" x ON a.action = ${PIN_APPROVAL_ACTION} AND x.id = a."entityId"
      LEFT JOIN "Sale" s ON s.id = x."saleId"
      WHERE a."tenantId" = ${user.tenantId} AND a.action IN (${PIN_APPROVAL_ACTION}, ${PIN_FAILED})
        ${r.gte ? Prisma.sql`AND a."createdAt" >= ${r.gte}` : Prisma.empty}
        AND a."createdAt" < ${r.lt}
        ${scope.shopId ? Prisma.sql`AND (a.action = ${PIN_FAILED} OR COALESCE(x."shopId", s."shopId") = ${scope.shopId})` : Prisma.empty}
      GROUP BY 1, 2`;
  }

  private shiftRows(user: AuthenticatedUser, scope: ShopScope, r: StaffRange) {
    return this.prisma.$queryRaw<Array<{
      id: string; shifts: number; closed: number; short: number; shortCount: number; over: number; overCount: number; hours: number;
    }>>`
      SELECT c."openedById" AS id, COUNT(*)::int AS shifts, COUNT(*) FILTER (WHERE c.status::text = 'CLOSED')::int AS closed,
        COALESCE(SUM(-c.difference) FILTER (WHERE c.status::text = 'CLOSED' AND c.difference < ${-TOLERANCE}), 0)::float AS short,
        COUNT(*) FILTER (WHERE c.status::text = 'CLOSED' AND c.difference < ${-TOLERANCE})::int AS "shortCount",
        COALESCE(SUM(c.difference) FILTER (WHERE c.status::text = 'CLOSED' AND c.difference > ${TOLERANCE}), 0)::float AS over,
        COUNT(*) FILTER (WHERE c.status::text = 'CLOSED' AND c.difference > ${TOLERANCE})::int AS "overCount",
        COALESCE(SUM(LEAST(EXTRACT(EPOCH FROM (c."closedAt" - c."openedAt")) / 3600, 24)) FILTER (WHERE c.status::text = 'CLOSED' AND c."closedAt" IS NOT NULL), 0)::float AS hours
      FROM "CashRegister" c
      WHERE c."tenantId" = ${user.tenantId} AND NOT (c.status::text = 'CLOSED' AND c."closedAt" IS NULL)
        ${scope.shopId ? Prisma.sql`AND c."shopId" = ${scope.shopId}` : Prisma.empty}
        ${r.gte ? Prisma.sql`AND c."openedAt" >= ${r.gte}` : Prisma.empty}
        AND c."openedAt" < ${r.lt}
      GROUP BY 1`;
  }

  private cashMoves(user: AuthenticatedUser, scope: ShopScope, r: StaffRange) {
    return this.prisma.$queryRaw<Array<CountRow & { type: string }>>`
      SELECT t."createdById" AS id, t.type::text AS type, COUNT(*)::int AS count, COALESCE(SUM(t.amount), 0)::float AS amount
      FROM "CashTransaction" t JOIN "CashRegister" c ON c.id = t."cashRegisterId"
      WHERE t."tenantId" = ${user.tenantId} AND t.type::text IN ('CASH_IN', 'CASH_OUT')
        ${scope.shopId ? Prisma.sql`AND c."shopId" = ${scope.shopId}` : Prisma.empty}
        ${r.gte ? Prisma.sql`AND t."createdAt" >= ${r.gte}` : Prisma.empty}
        AND t."createdAt" < ${r.lt}
      GROUP BY 1, 2`;
  }

  /** Attendance of HR records linked to a login, by business-day date. */
  private attendance(user: AuthenticatedUser, r: StaffRange, userId?: string) {
    return this.prisma.$queryRaw<Array<{ id: string; days: number; hours: number; late: number; absent: number; leave: number; overtime: number }>>`
      SELECT st."userId" AS id,
        COUNT(*) FILTER (WHERE a.status::text IN ('PRESENT', 'LATE', 'HALF_DAY'))::int AS days,
        COALESCE(SUM(a."workedHours"), 0)::float AS hours, COALESCE(SUM(a."overtimeHours"), 0)::float AS overtime,
        COUNT(*) FILTER (WHERE a."isLate" OR a.status::text = 'LATE')::int AS late,
        COUNT(*) FILTER (WHERE a.status::text = 'ABSENT')::int AS absent,
        COUNT(*) FILTER (WHERE a.status::text = 'ON_LEAVE')::int AS leave
      FROM "Attendance" a JOIN "Staff" st ON st.id = a."staffId"
      WHERE a."tenantId" = ${user.tenantId} AND st."userId" IS NOT NULL
        ${userId ? Prisma.sql`AND st."userId" = ${userId}` : Prisma.empty}
        ${r.fromKey ? Prisma.sql`AND a.date >= ${r.fromKey}::date` : Prisma.empty}
        AND a.date <= ${r.toKey}::date
      GROUP BY 1`;
  }

  /** Commission for the month the period ends in; null when the module is not set up. */
  private async commissionFor(user: AuthenticatedUser, r: StaffRange) {
    const period = r.toKey.slice(0, 7);
    try {
      const s = await this.commission.summary(user, period);
      return {
        period,
        scope: s.scope,
        total: s.total,
        rows: (s.rows as Array<{ userId: string; earned: number; enrolled: boolean; paid: boolean; targetPct?: number }>)
          .map((x) => ({ userId: x.userId, earned: x.earned, enrolled: x.enrolled, paid: x.paid, targetPct: x.targetPct ?? null })),
      };
    } catch {
      return null;
    }
  }

  private async firstKey(user: AuthenticatedUser, scope: ShopScope, r: StaffRange) {
    if (r.fromKey) return null;
    const first = await this.prisma.sale.findFirst({ where: { tenantId: user.tenantId, ...scope.where }, orderBy: { soldAt: 'asc' }, select: { soldAt: true } });
    return first ? businessDayKey(first.soldAt, r.tz, r.dayStartHour) : null;
  }

  // ─── Overview ─────────────────────────────────────────────

  async overview(user: AuthenticatedUser, scope: ShopScope, q: StaffPeriodDto) {
    const r = await staffRange(this.tz, user.tenantId, q);
    const drawerHidden = (await hiddenFigures(this.prisma, user)).includes('drawer');
    const where = saleWhere(user.tenantId, scope, r);
    const biz = bizTime(Prisma.sql`s."soldAt"`, r);
    const loc = localTime(Prisma.sql`s."soldAt"`, r);
    const keyFmt = r.monthly ? 'YYYY-MM' : 'YYYY-MM-DD';

    const [
      sales, prev, voided, returns, pins, shifts, moves, att, trend, grid, shops, users, commission, first,
    ] = await Promise.all([
      this.salesRows(where, r),
      r.prev
        ? this.prisma.$queryRaw<Array<{ id: string | null; bills: number; net: number; discount: number; voided: number }>>`
            SELECT ${WHO} AS id, COUNT(*) FILTER (WHERE s.status::text <> 'VOIDED')::int AS bills,
              COALESCE(SUM(${BILL_NET}) FILTER (WHERE s.status::text <> 'VOIDED'), 0)::float AS net,
              COALESCE(SUM(GREATEST(s.discount - s."codeDiscount" - s."loyaltyDiscount", 0)) FILTER (WHERE s.status::text <> 'VOIDED'), 0)::float AS discount,
              COUNT(*) FILTER (WHERE s.status::text = 'VOIDED')::int AS voided
            FROM "Sale" s
            WHERE s."tenantId" = ${user.tenantId} ${scope.shopId ? Prisma.sql`AND s."shopId" = ${scope.shopId}` : Prisma.empty}
              AND s."soldAt" >= ${r.prev.gte} AND s."soldAt" < ${r.prev.lt}
            GROUP BY 1`
        : Promise.resolve(null),
      this.prisma.$queryRaw<CountRow[]>`
        SELECT ${VOIDER} AS id, COUNT(*)::int AS count, COALESCE(SUM(s.total), 0)::float AS amount
        FROM "Sale" s ${VOID_LOG} WHERE ${saleWhere(user.tenantId, scope, r, true)} GROUP BY 1`,
      this.returnsDone(user, scope, r),
      this.pinEvents(user, scope, r),
      // Shift counts and hours stay; drawer money goes when the owner hides it from staff.
      this.shiftRows(user, scope, r).then((rows) => (drawerHidden ? rows.map((x) => ({ ...x, short: 0, shortCount: 0, over: 0, overCount: 0 })) : rows)),
      drawerHidden ? Promise.resolve([] as Array<CountRow & { type: string }>) : this.cashMoves(user, scope, r),
      this.attendance(user, r),
      this.prisma.$queryRaw<Array<{ key: string; id: string | null; bills: number; net: number }>>`
        SELECT to_char(${biz}, ${keyFmt}) AS key, ${WHO} AS id, COUNT(*)::int AS bills,
          COALESCE(SUM(${BILL_NET}), 0)::float AS net
        FROM "Sale" s WHERE ${where} GROUP BY 1, 2`,
      this.prisma.$queryRaw<Array<{ id: string | null; wd: number; h: number; bills: number; net: number }>>`
        SELECT ${WHO} AS id, EXTRACT(DOW FROM ${biz})::int AS wd, EXTRACT(HOUR FROM ${loc})::int AS h, COUNT(*)::int AS bills,
          COALESCE(SUM(${BILL_NET}), 0)::float AS net
        FROM "Sale" s WHERE ${where} GROUP BY 1, 2, 3`,
      scope.shopId
        ? Promise.resolve([] as Array<{ shopId: string | null; id: string | null; bills: number; net: number }>)
        : this.prisma.$queryRaw<Array<{ shopId: string | null; id: string | null; bills: number; net: number }>>`
            SELECT s."shopId", ${WHO} AS id, COUNT(*)::int AS bills, COALESCE(SUM(${BILL_NET}), 0)::float AS net
            FROM "Sale" s WHERE ${where} GROUP BY 1, 2`,
      this.prisma.user.findMany({
        where: { tenantId: user.tenantId, role: { not: 'SUPER_ADMIN' } },
        select: {
          id: true, fullName: true, role: true, isActive: true, avatarUrl: true, shopId: true,
          staffProfile: { select: { designation: true } },
        },
      }),
      this.commissionFor(user, r),
      this.firstKey(user, scope, r),
    ]);

    const people = new Map(users.map((u) => [u.id, u]));
    const by = <T extends { id: string | null }>(rows: T[]) => new Map(rows.map((x) => [x.id ?? '', x]));
    const vMap = by(voided);
    const rMap = by(returns);
    const sMap = new Map(shifts.map((x) => [x.id, x]));
    const aMap = new Map(att.map((x) => [x.id, x]));
    const pinOf = (id: string, action: string) => pins.find((p) => p.id === id && p.action === action)?.count ?? 0;
    const moveOf = (id: string, type: string) => moves.find((m) => m.id === id && m.type === type);

    // Everyone with any activity in the period, plus an "unknown" row for bills without a login.
    const ids = new Set<string>();
    for (const list of [sales, voided, returns, pins, moves] as Array<Array<{ id: string | null }>>) {
      for (const x of list) ids.add(x.id ?? '');
    }
    for (const x of shifts) ids.add(x.id);

    const rows = [...ids].map((key) => {
      const id = key || null;
      const s = sales.find((x) => (x.id ?? '') === key);
      const u = id ? people.get(id) : undefined;
      const v = vMap.get(key);
      const ret = rMap.get(key);
      const sh = id ? sMap.get(id) : undefined;
      const a = id ? aMap.get(id) : undefined;
      const cin = id ? moveOf(id, 'CASH_IN') : undefined;
      const cout = id ? moveOf(id, 'CASH_OUT') : undefined;

      const bills = s?.bills ?? 0;
      const gross = num(s?.gross);
      const net = gross - num(s?.refunds);
      const cost = num(s?.cost);
      const subtotal = num(s?.subtotal);
      const qty = num(s?.qty);
      const shiftHours = num(sh?.hours);
      const attHours = num(a?.hours);
      const hoursSource = attHours > 0 ? 'attendance' : shiftHours > 0 ? 'shift' : s?.slots ? 'active' : null;
      const hours = hoursSource === 'attendance' ? attHours : hoursSource === 'shift' ? shiftHours : num(s?.slots);
      const voidCount = v?.count ?? 0;

      return {
        id,
        name: u?.fullName ?? (id ? 'Purana user' : UNKNOWN),
        role: u?.role ?? null,
        designation: u?.staffProfile?.designation ?? null,
        avatarUrl: u?.avatarUrl ?? null,
        active: u?.isActive ?? false,
        bills, gross: r2(gross), refunds: r2(num(s?.refunds)), net: r2(net),
        cost: r2(cost), profit: r2(net - cost), margin: net > 0 ? r2(((net - cost) / net) * 100) : 0,
        average: bills ? r2(net / bills) : 0,
        maxBill: r2(num(s?.maxBill)),
        qty: r2(qty), lines: s?.lines ?? 0, itemsPerBill: bills ? r2(qty / bills) : 0,
        customers: s?.customers ?? 0, walkIns: s?.walkIns ?? 0,
        discount: r2(num(s?.discount)), manualDiscount: r2(num(s?.manual)), discountBills: s?.discBills ?? 0,
        discountPct: subtotal > 0 ? r2((num(s?.manual) / subtotal) * 100) : 0,
        credit: r2(num(s?.credit)), creditBills: s?.creditBills ?? 0,
        creditPct: gross > 0 ? r2((num(s?.credit) / gross) * 100) : 0,
        collected: r2(num(s?.collected)),
        returnedBills: s?.returnedBills ?? 0,
        returnPct: gross > 0 ? r2((num(s?.refunds) / gross) * 100) : 0,
        reassigned: s?.reassigned ?? 0,
        voided: voidCount, voidedValue: r2(num(v?.amount)),
        voidPct: bills + voidCount > 0 ? r2((voidCount / (bills + voidCount)) * 100) : 0,
        returnsDone: ret?.count ?? 0, returnsDoneValue: r2(num(ret?.amount)), returnsOthers: ret?.others ?? 0,
        pinApprovals: id ? pinOf(id, PIN_APPROVAL_ACTION) : 0,
        pinFailures: id ? pinOf(id, PIN_FAILED) : 0,
        shifts: sh?.shifts ?? 0, shiftsClosed: sh?.closed ?? 0,
        short: r2(num(sh?.short)), shortCount: sh?.shortCount ?? 0,
        over: r2(num(sh?.over)), overCount: sh?.overCount ?? 0,
        shiftHours: r2(shiftHours),
        cashIn: r2(num(cin?.amount)), cashInCount: cin?.count ?? 0,
        cashOut: r2(num(cout?.amount)), cashOutCount: cout?.count ?? 0,
        attendance: a ? { days: a.days, hours: r2(a.hours), late: a.late, absent: a.absent, leave: a.leave, overtime: r2(a.overtime) } : null,
        days: s?.days ?? 0,
        hours: r2(hours), hoursSource,
        perHour: hours > 0 ? r2(net / hours) : 0,
        itemsPerHour: hours > 0 ? r2(qty / hours) : 0,
        billsPerHour: hours > 0 ? r2(bills / hours) : 0,
        first: s?.first ?? null, last: s?.last ?? null,
        share: 0, rank: 0,
        prevNet: null as number | null, prevBills: null as number | null, prevRank: null as number | null,
      };
    });

    // Ranks now and in the previous period, by net sales.
    const totalNet = rows.reduce((a, x) => a + x.net, 0);
    const ranked = rows.filter((x) => x.id && x.bills > 0).sort((a, b) => b.net - a.net);
    ranked.forEach((x, i) => { x.rank = i + 1; });
    const prevRanked = (prev ?? []).filter((x) => x.id && x.bills > 0).sort((a, b) => b.net - a.net);
    for (const x of rows) {
      x.share = totalNet > 0 ? r2((x.net / totalNet) * 100) : 0;
      if (!prev) continue;
      const p = prev.find((y) => (y.id ?? '') === (x.id ?? ''));
      x.prevNet = r2(num(p?.net));
      x.prevBills = p?.bills ?? 0;
      const at = prevRanked.findIndex((y) => y.id === x.id);
      x.prevRank = at >= 0 ? at + 1 : null;
    }
    rows.sort((a, b) => b.net - a.net || b.bills - a.bills || a.name.localeCompare(b.name));

    // Team totals and averages.
    const sum = (k: 'bills' | 'gross' | 'refunds' | 'net' | 'cost' | 'qty' | 'manualDiscount' | 'discount' | 'credit' | 'collected'
      | 'voided' | 'voidedValue' | 'returnsDone' | 'returnsDoneValue' | 'pinApprovals' | 'pinFailures' | 'shifts' | 'short'
      | 'shortCount' | 'over' | 'overCount' | 'cashIn' | 'cashOut' | 'discountBills' | 'creditBills' | 'returnedBills' | 'reassigned') =>
      r2(rows.reduce((a, x) => a + x[k], 0));
    const subtotalAll = sales.reduce((a, x) => a + num(x.subtotal), 0);
    const t = {
      staff: ranked.length,
      bills: sum('bills'), gross: sum('gross'), refunds: sum('refunds'), net: sum('net'),
      cost: sum('cost'), profit: r2(sum('net') - sum('cost')),
      qty: sum('qty'), discount: sum('discount'), manualDiscount: sum('manualDiscount'), discountBills: sum('discountBills'),
      credit: sum('credit'), creditBills: sum('creditBills'), collected: sum('collected'),
      voided: sum('voided'), voidedValue: sum('voidedValue'), returnedBills: sum('returnedBills'),
      returnsDone: sum('returnsDone'), returnsDoneValue: sum('returnsDoneValue'), reassigned: sum('reassigned'),
      pinApprovals: sum('pinApprovals'), pinFailures: sum('pinFailures'),
      shifts: sum('shifts'), short: sum('short'), shortCount: sum('shortCount'), over: sum('over'), overCount: sum('overCount'),
      cashIn: sum('cashIn'), cashOut: sum('cashOut'),
    };
    const team = {
      average: t.bills ? r2(t.net / t.bills) : 0,
      itemsPerBill: t.bills ? r2(t.qty / t.bills) : 0,
      discountPct: subtotalAll > 0 ? r2((t.manualDiscount / subtotalAll) * 100) : 0,
      voidPct: t.bills + t.voided > 0 ? r2((t.voided / (t.bills + t.voided)) * 100) : 0,
      returnPct: t.gross > 0 ? r2((t.refunds / t.gross) * 100) : 0,
      creditPct: t.gross > 0 ? r2((t.credit / t.gross) * 100) : 0,
      perStaff: ranked.length ? r2(t.net / ranked.length) : 0,
      perHour: (() => {
        const withHours = rows.filter((x) => x.id && x.hours > 0);
        const h = withHours.reduce((a, x) => a + x.hours, 0);
        return h > 0 ? r2(withHours.reduce((a, x) => a + x.net, 0) / h) : 0;
      })(),
    };
    const previous = prev ? {
      bills: prev.reduce((a, x) => a + x.bills, 0),
      net: r2(prev.reduce((a, x) => a + num(x.net), 0)),
      manualDiscount: r2(prev.reduce((a, x) => a + num(x.discount), 0)),
      voided: prev.reduce((a, x) => a + x.voided, 0),
      staff: prevRanked.length,
    } : null;

    // People well above the team on discounts, voids, returns, credit, drawer shorts or wrong PINs.
    type Alert = { userId: string; name: string; kind: string; level: 'high' | 'medium'; value: number; team: number; count: number };
    const alerts: Alert[] = [];
    for (const x of rows) {
      if (!x.id) continue;
      const push = (kind: string, value: number, teamValue: number, count: number, high: boolean) =>
        alerts.push({ userId: x.id!, name: x.name, kind, level: high ? 'high' : 'medium', value, team: teamValue, count });
      if (x.discountBills >= 3 && x.manualDiscount >= 100 && above(x.discountPct, team.discountPct, 3)) {
        push('discount', x.discountPct, team.discountPct, x.discountBills, x.discountPct > Math.max(team.discountPct * 3, team.discountPct + 6));
      }
      if (x.voided >= 2 && above(x.voidPct, team.voidPct, 3)) push('void', x.voidPct, team.voidPct, x.voided, x.voidPct > Math.max(team.voidPct * 3, 10));
      if (x.returnedBills >= 2 && above(x.returnPct, team.returnPct, 3)) push('return', x.returnPct, team.returnPct, x.returnedBills, x.returnPct > Math.max(team.returnPct * 3, 10));
      if (x.creditBills >= 3 && above(x.creditPct, team.creditPct, 10)) push('credit', x.creditPct, team.creditPct, x.creditBills, false);
      if (x.shortCount >= 2 || x.short >= 1000) push('short', x.short, 0, x.shortCount, x.short >= 5000 || x.shortCount >= 4);
      if (x.pinFailures >= 3) push('pin', x.pinFailures, 0, x.pinFailures, x.pinFailures >= 6);
    }
    alerts.sort((a, b) => Number(b.level === 'high') - Number(a.level === 'high'));

    // Daily (or monthly) net for the top five and everyone else.
    const top = ranked.slice(0, 5).map((x) => x.id!);
    const keys = bucketKeys(r, first);
    const trendMap = new Map(keys.map((k) => [k, { key: k, net: 0, bills: 0, staff: {} as Record<string, number> }]));
    for (const x of trend) {
      const b = trendMap.get(x.key) ?? trendMap.set(x.key, { key: x.key, net: 0, bills: 0, staff: {} }).get(x.key)!;
      b.net = r2(b.net + num(x.net));
      b.bills += x.bills;
      const slot = x.id && top.includes(x.id) ? x.id : 'others';
      b.staff[slot] = r2((b.staff[slot] ?? 0) + num(x.net));
    }

    // Weekday × hour bills for the team, and bills by hour for each of the top ten.
    const heat = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, bills: 0, net: 0 }));
    const topTen = ranked.slice(0, 10).map((x) => x.id!);
    const staffHours = new Map(topTen.map((id) => [id, Array.from({ length: 24 }, () => 0)]));
    for (const g of grid) {
      heat[g.wd][g.h] += g.bills;
      hourly[g.h].bills += g.bills;
      hourly[g.h].net = r2(hourly[g.h].net + num(g.net));
      if (g.id && staffHours.has(g.id)) staffHours.get(g.id)![g.h] += g.bills;
    }

    // Branch split for the all-branches view.
    let byShop: Array<{ id: string | null; name: string; bills: number; net: number; staff: number; top: { id: string; name: string; net: number } | null }> = [];
    if (shops.length) {
      const shopIds = [...new Set(shops.map((x) => x.shopId).filter((x): x is string => !!x))];
      const names = new Map((await this.prisma.shop.findMany({ where: { id: { in: shopIds }, tenantId: user.tenantId }, select: { id: true, name: true } })).map((s) => [s.id, s.name]));
      const m = new Map<string, { id: string | null; bills: number; net: number; people: Map<string, number> }>();
      for (const x of shops) {
        const k = x.shopId ?? '';
        const b = m.get(k) ?? m.set(k, { id: x.shopId, bills: 0, net: 0, people: new Map() }).get(k)!;
        b.bills += x.bills;
        b.net += num(x.net);
        if (x.id) b.people.set(x.id, (b.people.get(x.id) ?? 0) + num(x.net));
      }
      byShop = [...m.values()].map((b) => {
        const best = [...b.people.entries()].sort((a, c) => c[1] - a[1])[0];
        return {
          id: b.id, name: (b.id && names.get(b.id)) || 'Bina branch', bills: b.bills, net: r2(b.net), staff: b.people.size,
          top: best ? { id: best[0], name: people.get(best[0])?.fullName ?? 'Purana user', net: r2(best[1]) } : null,
        };
      }).sort((a, b) => b.net - a.net);
    }

    // Active logins of this branch who did nothing in the period.
    const idle = users
      .filter((u) => u.isActive && !ids.has(u.id) && (!scope.shopId || !u.shopId || u.shopId === scope.shopId))
      .map((u) => ({ id: u.id, name: u.fullName, role: u.role }));

    return {
      from: r.fromKey ?? first ?? r.toKey, to: r.toKey, grouping: r.monthly ? 'month' : 'day',
      drawerHidden,
      totals: t, team, previous,
      staff: rows,
      alerts,
      trend: [...trendMap.values()].sort((a, b) => a.key.localeCompare(b.key)),
      trendStaff: top,
      heatmap: heat,
      hourly,
      staffHours: topTen.map((id) => ({ id, hours: staffHours.get(id)! })),
      byShop,
      idle,
      commission,
    };
  }

  // ─── One person ───────────────────────────────────────────

  async person(user: AuthenticatedUser, scope: ShopScope, userId: string, q: StaffPeriodDto) {
    const who = await this.prisma.user.findFirst({
      where: { id: userId, tenantId: user.tenantId },
      select: {
        id: true, fullName: true, role: true, isActive: true, avatarUrl: true, phone: true, lastLoginAt: true, createdAt: true,
        assignedShop: { select: { id: true, name: true } },
        staffProfile: { select: { id: true, staffNumber: true, designation: true, phone: true, joinDate: true, status: true } },
      },
    });
    if (!who) throw new NotFoundException('Ye banda nahi mila');

    const r = await staffRange(this.tz, user.tenantId, q);
    const drawerHidden = (await hiddenFigures(this.prisma, user)).includes('drawer');
    const mine = Prisma.sql`${saleWhere(user.tenantId, scope, r)} AND ${WHO} = ${userId}`;
    const biz = bizTime(Prisma.sql`s."soldAt"`, r);
    const loc = localTime(Prisma.sql`s."soldAt"`, r);
    const keyFmt = r.monthly ? 'YYYY-MM' : 'YYYY-MM-DD';
    const shop = scope.shopId ? { shopId: scope.shopId } : {};

    const [trend, grid, payments, products, shifts, returns, voided, pinLog, attendanceDays, attendance, commission, first] = await Promise.all([
      this.prisma.$queryRaw<Array<{ key: string; bills: number; net: number; discount: number }>>`
        SELECT to_char(${biz}, ${keyFmt}) AS key, COUNT(*)::int AS bills, COALESCE(SUM(${BILL_NET}), 0)::float AS net,
          COALESCE(SUM(GREATEST(s.discount - s."codeDiscount" - s."loyaltyDiscount", 0)), 0)::float AS discount
        FROM "Sale" s WHERE ${mine} GROUP BY 1`,
      this.prisma.$queryRaw<Array<{ wd: number; h: number; bills: number }>>`
        SELECT EXTRACT(DOW FROM ${biz})::int AS wd, EXTRACT(HOUR FROM ${loc})::int AS h, COUNT(*)::int AS bills
        FROM "Sale" s WHERE ${mine} GROUP BY 1, 2`,
      // Bills, sale and credit by the bill's main method; money collected by
      // payment rows, so the card part of a cash + card bill shows under Card.
      this.prisma.$queryRaw<Array<{ method: string; bills: number; net: number; collected: number; credit: number }>>`
        WITH b AS (
          SELECT s."paymentMethod"::text AS method, COUNT(*)::int AS bills, SUM(${BILL_NET})::float AS net,
            SUM(s."creditAmount")::float AS credit
          FROM "Sale" s WHERE ${mine} GROUP BY 1
        ), p AS (
          SELECT sp.method::text AS method, SUM(sp.amount)::float AS collected
          FROM "SalePayment" sp JOIN "Sale" s ON s.id = sp."saleId"
          WHERE ${mine} AND sp.method <> 'TRADE_IN' GROUP BY 1
        )
        SELECT COALESCE(b.method, p.method) AS method, COALESCE(b.bills, 0)::int AS bills, COALESCE(b.net, 0)::float AS net,
          COALESCE(p.collected, 0)::float AS collected, COALESCE(b.credit, 0)::float AS credit
        FROM b FULL JOIN p ON p.method = b.method ORDER BY 3 DESC`,
      this.prisma.$queryRaw<Array<{ id: string; name: string; unit: string; qty: number; net: number; bills: number }>>`
        WITH ${billMathCte(mine)}
        SELECT p.id, p.name, p.unit, SUM(${KEPT_QTY})::float AS qty,
          SUM(${LINE_REVENUE})::float AS net,
          COUNT(DISTINCT s.id)::int AS bills
        FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId" JOIN bm ON bm.id = s.id JOIN "Product" p ON p.id = si."productId"
        WHERE ${mine}
        GROUP BY 1, 2, 3 ORDER BY 5 DESC LIMIT 10`,
      drawerHidden ? Promise.resolve([]) : this.prisma.cashRegister.findMany({
        where: { tenantId: user.tenantId, ...shop, openedById: userId, openedAt: within(r), NOT: { status: 'CLOSED', closedAt: null } },
        orderBy: { openedAt: 'desc' },
        take: 20,
        select: {
          id: true, registerNumber: true, status: true, openedAt: true, closedAt: true, openingBalance: true,
          expectedBalance: true, closingBalance: true, difference: true, totalSales: true,
          closedBy: { select: { id: true, fullName: true } }, shop: { select: { name: true } },
        },
      }),
      this.prisma.saleReturn.findMany({
        where: {
          tenantId: user.tenantId, createdById: userId, returnedAt: within(r),
          ...(scope.shopId && { OR: [{ shopId: scope.shopId }, { shopId: null, sale: { shopId: scope.shopId } }] }),
        },
        orderBy: { returnedAt: 'desc' },
        take: 15,
        select: {
          id: true, returnNumber: true, returnedAt: true, refundAmount: true, refundMethod: true, reason: true,
          sale: { select: { id: true, saleNumber: true, soldById: true, createdById: true, customer: { select: { name: true } } } },
        },
      }),
      this.prisma.$queryRaw<Array<{ id: string; saleNumber: string; soldAt: Date; voidedAt: Date; total: number; customer: string | null }>>`
        SELECT s.id, s."saleNumber", s."soldAt", COALESCE(v."createdAt", s."updatedAt") AS "voidedAt", s.total::float AS total, c.name AS customer
        FROM "Sale" s ${VOID_LOG} LEFT JOIN "Customer" c ON c.id = s."customerId"
        WHERE ${saleWhere(user.tenantId, scope, r, true)} AND ${VOIDER} = ${userId}
        ORDER BY s."soldAt" DESC LIMIT 15`,
      this.prisma.activityLog.findMany({
        where: { tenantId: user.tenantId, userId, action: { in: [PIN_APPROVAL_ACTION, PIN_FAILED] }, createdAt: within(r) },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: { id: true, action: true, description: true, createdAt: true },
      }),
      who.staffProfile
        ? this.prisma.attendance.findMany({
            where: {
              tenantId: user.tenantId, staffId: who.staffProfile.id,
              date: { ...(r.fromKey && { gte: new Date(`${r.fromKey}T00:00:00Z`) }), lte: new Date(`${r.toKey}T00:00:00Z`) },
            },
            orderBy: { date: 'desc' },
            take: 31,
            select: { date: true, status: true, checkIn: true, checkOut: true, workedHours: true, isLate: true, lateMinutes: true },
          })
        : Promise.resolve([]),
      this.attendance(user, r, userId),
      this.commissionFor(user, r),
      this.firstKey(user, scope, r),
    ]);

    const keys = bucketKeys(r, first);
    const tMap = new Map(keys.map((k) => [k, { key: k, bills: 0, net: 0, discount: 0 }]));
    for (const x of trend) tMap.set(x.key, { key: x.key, bills: x.bills, net: r2(num(x.net)), discount: r2(num(x.discount)) });
    const heat = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    for (const g of grid) heat[g.wd][g.h] += g.bills;
    const a = attendance[0];
    const myCommission = commission?.rows.find((x) => x.userId === userId) ?? null;

    return {
      from: r.fromKey ?? first ?? r.toKey, to: r.toKey, grouping: r.monthly ? 'month' : 'day',
      person: {
        id: who.id, name: who.fullName, role: who.role, active: who.isActive, avatarUrl: who.avatarUrl,
        phone: who.staffProfile?.phone ?? who.phone ?? null, lastLoginAt: who.lastLoginAt, since: who.staffProfile?.joinDate ?? who.createdAt,
        shop: who.assignedShop?.name ?? null,
        staff: who.staffProfile ? { id: who.staffProfile.id, number: who.staffProfile.staffNumber, designation: who.staffProfile.designation, status: who.staffProfile.status } : null,
      },
      drawerHidden,
      trend: [...tMap.values()].sort((x, y) => x.key.localeCompare(y.key)),
      heatmap: heat,
      payments: payments.map((p) => ({ method: p.method, bills: p.bills, net: r2(num(p.net)), collected: r2(num(p.collected)), credit: r2(num(p.credit)) })),
      products: products.map((p) => ({ ...p, qty: r2(num(p.qty)), net: r2(num(p.net)) })),
      shifts: shifts.map((s) => ({
        id: s.id, number: s.registerNumber, status: s.status, shop: s.shop?.name ?? null, openedAt: s.openedAt, closedAt: s.closedAt,
        hours: s.closedAt ? r2((s.closedAt.getTime() - s.openedAt.getTime()) / 3_600_000) : null,
        opening: s.openingBalance, expected: s.status === 'CLOSED' ? s.expectedBalance : null,
        counted: s.status === 'CLOSED' ? s.closingBalance : null, difference: s.status === 'CLOSED' ? s.difference : null,
        cashSales: s.totalSales, closedBy: s.closedBy && s.closedBy.id !== userId ? s.closedBy.fullName : null,
      })),
      returns: returns.map((x) => ({
        id: x.id, number: x.returnNumber, at: x.returnedAt, amount: x.refundAmount, method: x.refundMethod, reason: x.reason,
        sale: { id: x.sale.id, number: x.sale.saleNumber, customer: x.sale.customer?.name ?? null },
        ownBill: (x.sale.soldById ?? x.sale.createdById) === userId,
      })),
      voided: voided.map((v) => ({ id: v.id, number: v.saleNumber, soldAt: v.soldAt, voidedAt: v.voidedAt, total: v.total, customer: v.customer })),
      pins: pinLog.map((p) => ({ id: p.id, ok: p.action === PIN_APPROVAL_ACTION, text: p.description, at: p.createdAt })),
      attendance: {
        summary: a ? { days: a.days, hours: r2(a.hours), late: a.late, absent: a.absent, leave: a.leave, overtime: r2(a.overtime) } : null,
        days: attendanceDays.map((d) => ({ date: d.date.toISOString().slice(0, 10), status: d.status, checkIn: d.checkIn, checkOut: d.checkOut, hours: d.workedHours, late: d.isLate ? d.lateMinutes : 0 })),
        linked: !!who.staffProfile,
      },
      commission: commission ? { period: commission.period, row: myCommission } : null,
    };
  }

  // ─── Bills of one person ──────────────────────────────────

  async bills(user: AuthenticatedUser, scope: ShopScope, q: StaffBillsDto) {
    const r = await staffRange(this.tz, user.tenantId, q);
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const kind: BillKind = q.kind ?? 'all';
    // Cancelled bills belong to whoever cancelled them; the rest to the seller.
    const voidedIds = kind === 'voided'
      ? (await this.prisma.$queryRaw<Array<{ id: string }>>`
          SELECT s.id FROM "Sale" s ${VOID_LOG}
          WHERE ${saleWhere(user.tenantId, scope, r, true)} AND ${VOIDER} = ${q.userId}
          LIMIT 5000`).map((x) => x.id)
      : null;
    const where: Prisma.SaleWhereInput = voidedIds
      ? { tenantId: user.tenantId, id: { in: voidedIds }, status: 'VOIDED' }
      : {
          tenantId: user.tenantId, ...scope.where, soldAt: within(r),
          OR: [{ soldById: q.userId }, { soldById: null, createdById: q.userId }],
          status: { not: 'VOIDED' },
        };
    if (kind === 'credit') where.creditAmount = { gt: 0 };
    if (kind === 'returned') where.refundedAmount = { gt: 0 };
    if (kind === 'discount') where.discount = { gt: 0 };
    const orderBy: Prisma.SaleOrderByWithRelationInput =
      kind === 'discount' ? { discount: 'desc' } : kind === 'big' ? { total: 'desc' } : kind === 'credit' ? { creditAmount: 'desc' } : { soldAt: 'desc' };

    const [count, rows] = await Promise.all([
      this.prisma.sale.count({ where }),
      this.prisma.sale.findMany({
        where, orderBy, skip: (page - 1) * limit, take: limit,
        select: {
          id: true, saleNumber: true, soldAt: true, status: true, subtotal: true, discount: true, codeDiscount: true, loyaltyDiscount: true,
          total: true, refundedAmount: true, creditAmount: true, paymentMethod: true, createdById: true, soldById: true,
          customer: { select: { id: true, name: true } },
          createdBy: { select: { fullName: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);
    return {
      page, limit, count, pages: Math.max(1, Math.ceil(count / limit)),
      items: rows.map((s) => ({
        id: s.id, number: s.saleNumber, soldAt: s.soldAt, status: s.status, subtotal: s.subtotal, total: s.total,
        discount: s.discount, manualDiscount: r2(Math.max(s.discount - s.codeDiscount - s.loyaltyDiscount, 0)),
        refunded: s.refundedAmount, credit: s.creditAmount, method: s.paymentMethod, lines: s._count.items,
        customer: s.customer?.name ?? null,
        // A bill rung up by someone else in this person's name.
        madeBy: s.soldById && s.createdById !== s.soldById ? s.createdBy?.fullName ?? null : null,
      })),
    };
  }
}
