/**
 * Profit and loss statement.
 *
 *   Revenue        bills (not voided) of the period less what was refunded on
 *                  them, whenever the return was made
 *   Cost of goods  cost saved on each line; lines sold with no cost fall back
 *                  to today's variant or product cost; returned goods give
 *                  their cost back
 *   Expenses       paid expenses by category, plus salaries and commission
 *                  paid (can be switched off when they are also booked as
 *                  expenses)
 *   Gross profit   on the shop's khata basis: profit whose money came in
 *                  ("Haath mein aaya profit", default) or the whole profit of
 *                  the period's bills; both, with "Udhaar mein profit", are
 *                  sent (business-math.helper, "Khata profit")
 *   Write-offs     Stock nuksan (damaged, expired, lost, counted short, used in
 *                  the shop, returned goods not fit to sell) less Stock faida
 *                  (counted extra, free or bonus goods), at cost; data
 *                  corrections count in neither
 *   Other income   OtherIncome records (incentives, scheme claims, commission,
 *                  rent, interest) and booking advances kept on cancelled or
 *                  expired bookings
 *
 * Sales, cost, expense and write-off rules come from business-math.helper,
 * so these figures match the Reports centre and the Profit report. Every
 * figure is tenant- and branch-scoped and cut on business days in the
 * shop's own timezone. One set of grouped queries serves the period, the
 * monthly columns and the branch columns.
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey, zonedToUtc } from '../../../common/helpers/business-time.helper';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import {
  LINE_COST, LINE_COST_JOINS, LINE_NET, LINE_REFUND, billMathCte, emptyCreditProfit, emptyWriteOffs, foldCreditProfit, foldWriteOffs,
  liveSaleSql, noCostSales, paidExpenseSql, creditProfitRows, otherIncomeRows, profitBasis, profitSplit,
  writeOffRows, type CreditProfit, type CreditProfitRow, type ProfitBasis, type ProfitSplit, type WriteOffRow, type WriteOffs,
} from '../../../common/helpers/business-math.helper';
import { MoneyService } from '../../finance/money/money.service';
import { PnlDetailDto, PnlMonthlyDto, PnlQueryDto, PnlScopeDto } from './dto/pnl-query.dto';

/** Labels of the fixed other-income categories (as on the Income page). */
const INCOME_LABELS: Record<string, string> = {
  COMPANY_INCENTIVE: 'Company incentive', SCHEME_CLAIM: 'Scheme claim', COMMISSION: 'Commission',
  RENT: 'Kiraya mila', INTEREST: 'Bank profit / interest', OTHER: 'Doosri',
};

/** Note prefix of commission payouts written by payroll; that money is counted in the salary. */
const PAID_WITH_SALARY = 'Tankhwah PAY-';

type Range = { gte: Date; lt: Date };
type Bucket = 'all' | 'month' | 'shop' | 'channel';

interface Ctx {
  tenantId: string;
  shopId: string | null;
  branch: { id: string; name: string } | null;
  tz: string;
  h: number;
  staff: boolean;
  costVisible: boolean;
  basis: ProfitBasis;
}

const DAY = 86_400_000;
const MAX_DAYS = 5 * 366;
const DETAIL_LIMIT = 300;
const NONE = '-';

const n = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;
const pct = (part: number, whole: number) => (Math.abs(whole) < 0.005 ? 0 : Math.round((part / whole) * 1000) / 10);
const col = (sql: string) => Prisma.raw(sql);

/** Raw totals for one bucket (the period, a month, a branch or a channel). */
interface Figures {
  bills: number; gross: number; discount: number; code: number; loyalty: number; service: number; sales: number; credit: number;
  cost: number; est: number; estLines: number; unknownLines: number; unknownRev: number;
  returnCount: number; returns: number; returnCost: number;
  expenses: Map<string, { amount: number; count: number }>;
  salaries: number; salaryCount: number; commission: number; commissionCount: number;
  writeOffs: WriteOffs;
  booking: number; bookingCount: number;
  income: number; incomeCount: number;
  /** Khata profit split of the bucket. */
  khata: CreditProfit;
}

const blank = (): Figures => ({
  bills: 0, gross: 0, discount: 0, code: 0, loyalty: 0, service: 0, sales: 0, credit: 0,
  cost: 0, est: 0, estLines: 0, unknownLines: 0, unknownRev: 0,
  returnCount: 0, returns: 0, returnCost: 0,
  expenses: new Map(),
  salaries: 0, salaryCount: 0, commission: 0, commissionCount: 0,
  writeOffs: emptyWriteOffs(),
  booking: 0, bookingCount: 0,
  income: 0, incomeCount: 0,
  khata: emptyCreditProfit(),
});

export interface ExpenseCategoryRef { id: string; name: string; color: string }

export interface PnlStatement {
  revenue: {
    gross: number; discount: number; manualDiscount: number; codeDiscount: number; loyaltyDiscount: number;
    serviceCharges: number; sales: number; returns: number; net: number;
    bills: number; returnCount: number; credit: number; avgBill: number;
  };
  /** Null when the user may not see cost. */
  cogs: { saved: number; estimated: number; returned: number; total: number; estimatedLines: number; unknownLines: number; unknownRevenue: number } | null;
  /** Headline gross profit on the shop's khata basis. */
  grossProfit: number | null;
  grossMargin: number | null;
  /** Khata profit: bill profit, in hand, still on khata. Null when the user may not see cost. */
  profitSplit: ProfitSplit | null;
  expenses: {
    paid: number; count: number;
    categories: Array<ExpenseCategoryRef & { amount: number; count: number }>;
    salaries: number; salaryCount: number; commission: number; commissionCount: number;
    /** Paid expenses plus staff pay when included. */
    total: number;
  };
  writeOffs: {
    damage: number; loss: number; countedShort: number; found: number; net: number; count: number;
    /** Stock nuksan and Stock faida; net = stockLoss − stockGain. */
    stockLoss: number; stockGain: number; correction: number; correctionCount: number;
  } | null;
  otherIncome: { income: number; incomeCount: number; bookingKept: number; bookingCount: number; total: number };
  operatingProfit: number | null;
  netProfit: number | null;
  netMargin: number | null;
}

/** One record behind a statement line. */
export interface PnlDetailRow {
  id: string; at: Date; title: string; ref: string | null; note: string | null;
  branch: string | null; by: string | null; amount: number; kind?: string; link?: string | null;
}

@Injectable()
export class PnlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tzs: TenantTimezoneService,
    private readonly money: MoneyService,
  ) {}

  /* ═════════════════════════ context and periods ═════════════════════════ */

  /** Tenant, branch (the one in view, or the owner's pick), clock and switches. */
  private async ctx(user: AuthenticatedUser, scope: ShopScope, q: PnlScopeDto): Promise<Ctx> {
    const tenantId = user.tenantId;
    const shopId = scope.shopId ?? q.shopId ?? null;
    let branch: Ctx['branch'] = null;
    if (shopId) {
      branch = await this.prisma.shop.findFirst({ where: { id: shopId, tenantId }, select: { id: true, name: true } });
      if (!branch) throw new NotFoundException('Branch nahi mili');
    }
    const { tz, dayStartHour } = await this.tzs.clock(tenantId);
    return {
      tenantId, shopId, branch, tz, h: dayStartHour,
      staff: q.staff !== 'false',
      costVisible: hasPermission(user.role, user.permissions, PERMISSIONS.COST_VIEW),
      basis: await profitBasis(this.prisma, tenantId),
    };
  }

  private at(c: Ctx, key: string) {
    const [y, m, d] = key.split('-').map(Number);
    return zonedToUtc(y, m, d, c.h, 0, 0, c.tz);
  }

  private shiftKey(key: string, days: number) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
  }

  /** The asked period (this month so far by default) and the one it is compared with. */
  private period(c: Ctx, q: PnlQueryDto) {
    const today = businessDayKey(new Date(), c.tz, c.h);
    const fromKey = q.from ?? `${today.slice(0, 7)}-01`;
    const toKey = q.to ?? today;
    if (fromKey > toKey) throw new BadRequestException('"Se" ki date "Tak" se pehle honi chahiye');
    const days = Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / DAY) + 1;
    if (days > MAX_DAYS) throw new BadRequestException('Period 5 saal se lambi nahi ho sakti');

    const compare = q.compare ?? 'prev';
    let prevFrom: string;
    let prevTo: string;
    if (compare === 'year') {
      const back = (k: string) => `${Number(k.slice(0, 4)) - 1}${k.slice(4)}`;
      prevFrom = back(fromKey);
      prevTo = back(toKey);
      // 29 Feb has no twin in a normal year.
      if (prevTo.endsWith('-02-29')) prevTo = `${prevTo.slice(0, 8)}28`;
      if (prevFrom.endsWith('-02-29')) prevFrom = `${prevFrom.slice(0, 8)}28`;
    } else {
      prevTo = this.shiftKey(fromKey, -1);
      prevFrom = this.shiftKey(fromKey, -days);
    }
    return {
      fromKey, toKey, days, compare, prevFrom, prevTo,
      range: { gte: this.at(c, fromKey), lt: this.at(c, this.shiftKey(toKey, 1)) },
      prev: { gte: this.at(c, prevFrom), lt: this.at(c, this.shiftKey(prevTo, 1)) },
    };
  }

  /* ═════════════════════════ grouped queries ═════════════════════════ */

  private shopSql(c: Ctx, column: Prisma.Sql) {
    return c.shopId ? Prisma.sql`AND ${column} = ${c.shopId}` : Prisma.empty;
  }

  /** Bucket key: the period, the business month, the branch or the sales channel. */
  private key(c: Ctx, b: Bucket, at: Prisma.Sql, shop: Prisma.Sql, channel?: Prisma.Sql): Prisma.Sql {
    switch (b) {
      case 'month':
        return Prisma.sql`to_char(((${at} AT TIME ZONE 'UTC') AT TIME ZONE ${c.tz}) - make_interval(hours => ${c.h}::int), 'YYYY-MM')`;
      case 'shop':
        return Prisma.sql`COALESCE(${shop}, ${NONE})`;
      case 'channel':
        return channel ?? Prisma.sql`'all'::text`;
      default:
        return Prisma.sql`'all'::text`;
    }
  }

  private saleWhere(c: Ctx, r: Range) {
    return liveSaleSql({ tenantId: c.tenantId, shopId: c.shopId }, r);
  }

  /**
   * Bills of the period with what was refunded on them and their cost, by the
   * shared rules (returns count against the bill's own period).
   */
  private salesRows(c: Ctx, r: Range, b: Bucket) {
    const k = this.key(c, b, col('s."soldAt"'), col('s."shopId"'), col('s.source::text'));
    const where = this.saleWhere(c, r);
    return this.prisma.$queryRaw<Array<Record<string, unknown> & { k: string }>>(Prisma.sql`
      WITH ${billMathCte(where)}
      SELECT ${k} AS k, COUNT(*)::int AS bills,
        COALESCE(SUM(s.subtotal), 0)::float8 AS gross,
        COALESCE(SUM(s.discount), 0)::float8 AS discount,
        COALESCE(SUM(s."codeDiscount"), 0)::float8 AS code,
        COALESCE(SUM(s."loyaltyDiscount"), 0)::float8 AS loyalty,
        COALESCE(SUM(s."serviceCharges"), 0)::float8 AS service,
        COALESCE(SUM(s.total), 0)::float8 AS sales,
        COALESCE(SUM(s."creditAmount"), 0)::float8 AS credit,
        COALESCE(SUM(bm."soldCost" - bm."estCost"), 0)::float8 AS cost,
        COALESCE(SUM(bm."estCost"), 0)::float8 AS est,
        COALESCE(SUM(bm."fallbackLines"), 0)::int AS est_lines,
        COALESCE(SUM(bm."noCostLines"), 0)::int AS unknown_lines,
        COALESCE(SUM(bm."noCostRevenue"), 0)::float8 AS unknown_rev,
        COALESCE(SUM(s."refundedAmount"), 0)::float8 AS returns,
        COALESCE(SUM(CASE WHEN s."refundedAmount" > 0 THEN (SELECT COUNT(*) FROM "SaleReturn" x WHERE x."saleId" = s.id) ELSE 0 END), 0)::int AS return_count,
        COALESCE(SUM(bm."soldCost" - bm.cost), 0)::float8 AS return_cost
      FROM "Sale" s JOIN bm ON bm.id = s.id
      WHERE ${where}
      GROUP BY 1`);
  }

  private expenseRows(c: Ctx, r: Range, b: Bucket) {
    const k = this.key(c, b, col('e."expenseDate"'), col('e."shopId"'));
    return this.prisma.$queryRaw<Array<{ k: string; cat: string; amount: number; n: number }>>(Prisma.sql`
      SELECT ${k} AS k, COALESCE(e."categoryId", ${NONE}) AS cat, COALESCE(SUM(e.amount), 0)::float8 AS amount, COUNT(*)::int AS n
      FROM "Expense" e
      WHERE ${paidExpenseSql({ tenantId: c.tenantId, shopId: c.shopId }, r)}
      GROUP BY 1, 2`);
  }

  /** Salaries paid; the branch is the staff member's branch. */
  private salaryRows(c: Ctx, r: Range, b: Bucket) {
    const k = this.key(c, b, col('sp."paidAt"'), col('st."shopId"'));
    return this.prisma.$queryRaw<Array<{ k: string; amount: number; n: number }>>(Prisma.sql`
      SELECT ${k} AS k, COALESCE(SUM(sp."paidAmount"), 0)::float8 AS amount, COUNT(*)::int AS n
      FROM "SalaryPayment" sp
      JOIN "Staff" st ON st.id = sp."staffId"
      WHERE sp."tenantId" = ${c.tenantId} AND sp.status::text IN ('PAID', 'PARTIAL') AND sp."paidAmount" > 0
        AND sp."paidAt" >= ${r.gte} AND sp."paidAt" < ${r.lt} ${this.shopSql(c, col('st."shopId"'))}
      GROUP BY 1`);
  }

  /**
   * Commission paid; the branch comes from the person's staff record, if any.
   * Payouts written by payroll (note "Tankhwah PAY-…") are already inside the
   * salary's paidAmount, so they are left out here.
   */
  private commissionRows(c: Ctx, r: Range, b: Bucket) {
    const k = this.key(c, b, col('cp."paidAt"'), col('st."shopId"'));
    return this.prisma.$queryRaw<Array<{ k: string; amount: number; n: number }>>(Prisma.sql`
      SELECT ${k} AS k, COALESCE(SUM(cp.amount), 0)::float8 AS amount, COUNT(*)::int AS n
      FROM "CommissionPayout" cp
      LEFT JOIN "Staff" st ON st."userId" = cp."userId" AND st."tenantId" = cp."tenantId"
      WHERE cp."tenantId" = ${c.tenantId} AND cp.amount > 0
        AND (cp.note IS NULL OR cp.note NOT LIKE ${`${PAID_WITH_SALARY}%`})
        AND cp."paidAt" >= ${r.gte} AND cp."paidAt" < ${r.lt} ${this.shopSql(c, col('st."shopId"'))}
      GROUP BY 1`);
  }

  /** Stock written off or found, by the shared write-off rule. */
  private writeOffRows(c: Ctx, r: Range, b: Bucket): Promise<WriteOffRow[]> {
    return writeOffRows(this.prisma, { tenantId: c.tenantId, shopId: c.shopId }, r, { key: (at, shop) => this.key(c, b, at, shop) });
  }

  /** Advances kept on bookings that were cancelled or expired. */
  private bookingRows(c: Ctx, r: Range, b: Bucket) {
    const when = col('COALESCE(b."cancelledAt", b."updatedAt")');
    const k = this.key(c, b, when, col('b."shopId"'));
    return this.prisma.$queryRaw<Array<{ k: string; amount: number; n: number }>>(Prisma.sql`
      SELECT ${k} AS k, COALESCE(SUM(b."totalPaid" - b."totalRefunded"), 0)::float8 AS amount, COUNT(*)::int AS n
      FROM "Booking" b
      WHERE b."tenantId" = ${c.tenantId} AND b.status::text IN ('CANCELLED', 'EXPIRED')
        AND b."totalPaid" - b."totalRefunded" > 0.005
        AND ${when} >= ${r.gte} AND ${when} < ${r.lt} ${this.shopSql(c, col('b."shopId"'))}
      GROUP BY 1`);
  }

  /** Khata profit parts by the shared rule. */
  private creditRows(c: Ctx, r: Range, b: Bucket): Promise<CreditProfitRow[]> {
    return creditProfitRows(this.prisma, { tenantId: c.tenantId, shopId: c.shopId }, r, { key: (at, shop) => this.key(c, b, at, shop) });
  }

  /** Other income by the shared rule. */
  private incomeRows(c: Ctx, r: Range, b: Bucket) {
    return otherIncomeRows(this.prisma, { tenantId: c.tenantId, shopId: c.shopId }, r, { key: (at, shop) => this.key(c, b, at, shop) });
  }

  /** Every figure of the period, grouped by the bucket. */
  private async collect(c: Ctx, r: Range, b: Bucket): Promise<Map<string, Figures>> {
    const none = Promise.resolve([] as Array<{ k: string; amount: number; n: number }>);
    const [sales, expenses, salaries, commission, writeOffs, bookings, credit, income] = await Promise.all([
      this.salesRows(c, r, b),
      b === 'channel' ? Promise.resolve([]) : this.expenseRows(c, r, b),
      c.staff && b !== 'channel' ? this.salaryRows(c, r, b) : none,
      c.staff && b !== 'channel' ? this.commissionRows(c, r, b) : none,
      b === 'channel' ? Promise.resolve([] as WriteOffRow[]) : this.writeOffRows(c, r, b),
      b === 'channel' ? none : this.bookingRows(c, r, b),
      b === 'channel' ? Promise.resolve([] as CreditProfitRow[]) : this.creditRows(c, r, b),
      b === 'channel' ? Promise.resolve([] as Array<{ k: string; amount: number; count: number }>) : this.incomeRows(c, r, b),
    ]);
    const out = new Map<string, Figures>();
    const get = (k: string) => {
      let f = out.get(k);
      if (!f) { f = blank(); out.set(k, f); }
      return f;
    };
    for (const x of sales) {
      const f = get(x.k);
      f.bills = n(x.bills); f.gross = n(x.gross); f.discount = n(x.discount); f.code = n(x.code); f.loyalty = n(x.loyalty);
      f.service = n(x.service); f.sales = n(x.sales); f.credit = n(x.credit); f.cost = n(x.cost); f.est = n(x.est);
      f.estLines = n(x.est_lines); f.unknownLines = n(x.unknown_lines); f.unknownRev = n(x.unknown_rev);
      f.returnCount = n(x.return_count); f.returns = n(x.returns); f.returnCost = n(x.return_cost);
    }
    for (const x of expenses) get(x.k).expenses.set(x.cat, { amount: n(x.amount), count: n(x.n) });
    for (const x of salaries) { const f = get(x.k); f.salaries = n(x.amount); f.salaryCount = n(x.n); }
    for (const x of commission) { const f = get(x.k); f.commission = n(x.amount); f.commissionCount = n(x.n); }
    const lossBy = new Map<string, WriteOffRow[]>();
    for (const x of writeOffs) lossBy.set(x.k, [...(lossBy.get(x.k) ?? []), x]);
    for (const [k, rows] of lossBy) get(k).writeOffs = foldWriteOffs(rows);
    for (const x of bookings) { const f = get(x.k); f.booking = n(x.amount); f.bookingCount = n(x.n); }
    for (const x of income) { const f = get(x.k); f.income = n(x.amount); f.incomeCount = n(x.count); }
    const creditBy = new Map<string, CreditProfitRow[]>();
    for (const x of credit) creditBy.set(x.k, [...(creditBy.get(x.k) ?? []), x]);
    for (const [k, rows] of creditBy) get(k).khata = foldCreditProfit(rows);
    return out;
  }

  /* ═════════════════════════ statement ═════════════════════════ */

  private async expenseCategories(tenantId: string, figures: Iterable<Figures>): Promise<Map<string, ExpenseCategoryRef>> {
    const ids = new Set<string>();
    for (const f of figures) for (const id of f.expenses.keys()) if (id !== NONE) ids.add(id);
    const rows = ids.size
      ? await this.prisma.expenseCategory.findMany({ where: { tenantId, id: { in: [...ids] } }, select: { id: true, name: true, color: true } })
      : [];
    const map = new Map<string, ExpenseCategoryRef>(rows.map((x) => [x.id, x]));
    map.set(NONE, { id: NONE, name: 'Bina category', color: '#64748b' });
    return map;
  }

  private statement(c: Ctx, f: Figures, cats: Map<string, ExpenseCategoryRef>): PnlStatement {
    const net = f.sales - f.returns;
    const cogs = f.cost + f.est - f.returnCost;
    // The bill-basis profit of the period's bills; the khata split may hold a few
    // paisa of rounding, so the bill figure always comes from the bills themselves.
    const split = profitSplit({ ...f.khata, billProfit: r2(net - cogs) }, c.basis);
    const gross = split.headline;
    const paid = [...f.expenses.values()].reduce((s, x) => s + x.amount, 0);
    const count = [...f.expenses.values()].reduce((s, x) => s + x.count, 0);
    const opex = paid + f.salaries + f.commission;
    const w = f.writeOffs;
    const writeOff = w.net;
    const other = f.booking + f.income;
    const netProfit = gross - opex - writeOff + other;
    const show = c.costVisible;

    return {
      revenue: {
        gross: r2(f.gross), discount: r2(f.discount), manualDiscount: r2(Math.max(0, f.discount - f.code - f.loyalty)),
        codeDiscount: r2(f.code), loyaltyDiscount: r2(f.loyalty), serviceCharges: r2(f.service),
        sales: r2(f.sales), returns: r2(f.returns), net: r2(net),
        bills: f.bills, returnCount: f.returnCount, credit: r2(f.credit), avgBill: f.bills ? r2(f.sales / f.bills) : 0,
      },
      cogs: show ? {
        saved: r2(f.cost), estimated: r2(f.est), returned: r2(f.returnCost), total: r2(cogs),
        estimatedLines: f.estLines, unknownLines: f.unknownLines, unknownRevenue: r2(f.unknownRev),
      } : null,
      grossProfit: show ? r2(gross) : null,
      grossMargin: show ? pct(gross, net) : null,
      profitSplit: show ? split : null,
      expenses: {
        paid: r2(paid), count,
        categories: [...f.expenses.entries()]
          .map(([id, x]) => ({ ...(cats.get(id) ?? { id, name: 'Doosra', color: '#64748b' }), amount: r2(x.amount), count: x.count }))
          .sort((a, b) => b.amount - a.amount),
        salaries: r2(f.salaries), salaryCount: f.salaryCount, commission: r2(f.commission), commissionCount: f.commissionCount,
        total: r2(opex),
      },
      writeOffs: show ? {
        damage: w.damage, loss: w.loss, countedShort: w.countedShort, found: w.found, net: w.net, count: w.count,
        stockLoss: w.lossTotal, stockGain: w.gain, correction: w.correction, correctionCount: w.correctionCount,
      } : null,
      otherIncome: { income: r2(f.income), incomeCount: f.incomeCount, bookingKept: r2(f.booking), bookingCount: f.bookingCount, total: r2(other) },
      operatingProfit: show ? r2(gross - opex) : null,
      netProfit: show ? r2(netProfit) : null,
      netMargin: show ? pct(netProfit, net) : null,
    };
  }

  /* ═════════════════════════ channels and product categories ═════════════════════════ */

  private async channels(c: Ctx, r: Range) {
    const rows = await this.collect(c, r, 'channel');
    return [...rows.entries()].map(([source, f]) => {
      const net = f.sales - f.returns;
      const cost = f.cost + f.est - f.returnCost;
      return {
        source, bills: f.bills, sales: r2(f.sales), returns: r2(f.returns), net: r2(net),
        cost: c.costVisible ? r2(cost) : null, profit: c.costVisible ? r2(net - cost) : null, margin: c.costVisible ? pct(net - cost, net) : null,
      };
    }).sort((a, b) => b.net - a.net);
  }

  /** Line totals by product category after the bill discount, less what was refunded on them. */
  private async categories(c: Ctx, r: Range) {
    const where = this.saleWhere(c, r);
    const rows = await this.prisma.$queryRaw<Array<{ k: string; bills: number; revenue: number; returns: number; cost: number; qty: number }>>(Prisma.sql`
      WITH ${billMathCte(where)}
      SELECT COALESCE(bm_p."categoryId", ${NONE}) AS k, COUNT(DISTINCT s.id)::int AS bills,
        COALESCE(SUM(${LINE_NET}), 0)::float8 AS revenue, COALESCE(SUM(${LINE_REFUND}), 0)::float8 AS returns,
        COALESCE(SUM(${LINE_COST}), 0)::float8 AS cost, COALESCE(SUM(si.quantity), 0)::float8 AS qty
      FROM "SaleItem" si
      JOIN "Sale" s ON s.id = si."saleId"
      JOIN bm ON bm.id = s.id
      ${LINE_COST_JOINS}
      WHERE ${where}
      GROUP BY 1`);
    const ids = rows.map((x) => x.k).filter((k) => k !== NONE);
    const names = ids.length
      ? await this.prisma.category.findMany({ where: { tenantId: c.tenantId, id: { in: ids } }, select: { id: true, name: true, color: true } })
      : [];
    const meta = new Map(names.map((x) => [x.id, x]));
    return rows.map((x) => {
      const net = n(x.revenue) - n(x.returns);
      const cost = n(x.cost);
      return {
        id: x.k, name: x.k === NONE ? 'Bina category' : meta.get(x.k)?.name ?? 'Doosri', color: (x.k !== NONE && meta.get(x.k)?.color) || '#64748b',
        bills: n(x.bills), qty: r2(n(x.qty)), revenue: r2(n(x.revenue)), returns: r2(n(x.returns)), net: r2(net),
        cost: c.costVisible ? r2(cost) : null, profit: c.costVisible ? r2(net - cost) : null, margin: c.costVisible ? pct(net - cost, net) : null,
      };
    }).sort((a, b) => b.net - a.net);
  }

  /* ═════════════════════════ endpoints ═════════════════════════ */

  /** The statement for a period against the comparison period, with channels and categories. */
  async report(user: AuthenticatedUser, scope: ShopScope, q: PnlQueryDto) {
    const c = await this.ctx(user, scope, q);
    const p = this.period(c, q);
    const [now, before, channels, categories, pending, bare] = await Promise.all([
      this.collect(c, p.range, 'all'),
      this.collect(c, p.prev, 'all'),
      this.channels(c, p.range),
      this.categories(c, p.range),
      this.prisma.expense.aggregate({
        where: { tenantId: c.tenantId, status: 'PENDING', expenseDate: p.range, ...(c.shopId && { shopId: c.shopId }) },
        _sum: { amount: true }, _count: { _all: true },
      }),
      // Lines sold with no cost: their whole sale counts as profit.
      noCostSales(this.prisma, { tenantId: c.tenantId, shopId: c.shopId }, p.range),
    ]);
    const cur = now.get('all') ?? blank();
    const prev = before.get('all') ?? blank();
    const cats = await this.expenseCategories(c.tenantId, [cur, prev]);
    return {
      period: { from: p.fromKey, to: p.toKey, days: p.days, compare: p.compare, prevFrom: p.prevFrom, prevTo: p.prevTo },
      branch: c.branch,
      costVisible: c.costVisible,
      staffIncluded: c.staff,
      current: (() => {
        const st = this.statement(c, cur, cats);
        return st.profitSplit ? { ...st, profitSplit: { ...st.profitSplit, noCost: bare } } : st;
      })(),
      previous: this.statement(c, prev, cats),
      channels,
      categories,
      pendingExpenses: { amount: r2(n(pending._sum.amount)), count: pending._count._all },
    };
  }

  /** One statement per business month, the current month last. */
  async monthly(user: AuthenticatedUser, scope: ShopScope, q: PnlMonthlyDto) {
    const c = await this.ctx(user, scope, q);
    const count = q.months ?? 12;
    const today = businessDayKey(new Date(), c.tz, c.h);
    const [y, m] = today.split('-').map(Number);
    const keys = Array.from({ length: count }, (_, i) => {
      const d = new Date(Date.UTC(y, m - count + i, 1));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    });
    const range = { gte: zonedToUtc(y, m - count + 1, 1, c.h, 0, 0, c.tz), lt: zonedToUtc(y, m + 1, 1, c.h, 0, 0, c.tz) };
    const rows = await this.collect(c, range, 'month');
    const cats = await this.expenseCategories(c.tenantId, rows.values());
    return {
      branch: c.branch,
      costVisible: c.costVisible,
      staffIncluded: c.staff,
      today,
      months: keys.map((key) => ({ key, partial: key === today.slice(0, 7), statement: this.statement(c, rows.get(key) ?? blank(), cats) })),
      expenseCategories: [...cats.values()],
    };
  }

  /** The period's statement for every branch side by side, plus the total. */
  async branches(user: AuthenticatedUser, scope: ShopScope, q: PnlQueryDto) {
    const c = await this.ctx(user, scope, q);
    const p = this.period(c, q);
    const [rows, total, shops] = await Promise.all([
      this.collect(c, p.range, 'shop'),
      this.collect(c, p.range, 'all'),
      this.prisma.shop.findMany({
        where: { tenantId: c.tenantId, ...(c.shopId && { id: c.shopId }) },
        select: { id: true, name: true, isMain: true, isActive: true },
        orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
      }),
    ]);
    const all = [...rows.values(), total.get('all') ?? blank()];
    const cats = await this.expenseCategories(c.tenantId, all);
    const list = shops
      .filter((s) => s.isActive || rows.has(s.id))
      .map((s) => ({ id: s.id, name: s.name, isMain: s.isMain, statement: this.statement(c, rows.get(s.id) ?? blank(), cats) }));
    // Records never tagged with a branch (old expenses, staff without a branch).
    if (!c.shopId && rows.has(NONE)) list.push({ id: NONE, name: 'Bina branch', isMain: false, statement: this.statement(c, rows.get(NONE)!, cats) });
    return {
      period: { from: p.fromKey, to: p.toKey, days: p.days },
      costVisible: c.costVisible,
      staffIncluded: c.staff,
      branches: list,
      total: this.statement(c, total.get('all') ?? blank(), cats),
    };
  }

  /** Money in and out for the same period, from the shop accounts ledger. */
  async cashFlow(user: AuthenticatedUser, scope: ShopScope, q: PnlQueryDto) {
    const c = await this.ctx(user, scope, q);
    const p = this.period(c, q);
    if (p.days > 366) throw new BadRequestException('Paisa aaya/gaya ek saal tak ki period ke liye hai');
    const shop = new ShopScope(c.shopId, !c.shopId);
    return this.money.analytics(user, shop, { from: p.fromKey, to: p.toKey });
  }

  /** The records behind one line of the statement. */
  async detail(user: AuthenticatedUser, scope: ShopScope, q: PnlDetailDto) {
    const c = await this.ctx(user, scope, q);
    const p = this.period(c, q);
    const r = p.range;
    const shop = c.shopId ? { shopId: c.shopId } : {};
    let rows: PnlDetailRow[] = [];

    switch (q.kind) {
      case 'expense': {
        const list = await this.prisma.expense.findMany({
          where: {
            tenantId: c.tenantId, status: 'PAID', expenseDate: r, ...shop,
            ...(q.categoryId && { categoryId: q.categoryId === 'none' || q.categoryId === NONE ? null : q.categoryId }),
          },
          select: {
            id: true, expenseDate: true, title: true, expenseNumber: true, description: true, amount: true, paymentMethod: true,
            category: { select: { name: true } }, shop: { select: { name: true } }, createdBy: { select: { fullName: true } },
          },
          orderBy: { expenseDate: 'desc' }, take: DETAIL_LIMIT + 1,
        });
        rows = list.map((e) => ({
          id: e.id, at: e.expenseDate, title: e.title, ref: e.expenseNumber, note: e.description, kind: e.category?.name ?? 'Bina category',
          branch: e.shop?.name ?? null, by: e.createdBy?.fullName ?? null, amount: r2(e.amount),
        }));
        break;
      }
      case 'staff': {
        if (!c.staff) break;
        const [salaries, commission] = await Promise.all([
          this.prisma.salaryPayment.findMany({
            where: { tenantId: c.tenantId, status: { in: ['PAID', 'PARTIAL'] }, paidAmount: { gt: 0 }, paidAt: r, ...(c.shopId && { staff: { shopId: c.shopId } }) },
            select: { id: true, paidAt: true, paymentNumber: true, paidAmount: true, notes: true, staffId: true, staff: { select: { fullName: true, shop: { select: { name: true } } } } },
            orderBy: { paidAt: 'desc' }, take: DETAIL_LIMIT + 1,
          }),
          this.prisma.commissionPayout.findMany({
            where: {
              tenantId: c.tenantId, amount: { gt: 0 }, paidAt: r, ...(c.shopId && { user: { staffProfile: { shopId: c.shopId } } }),
              // Paid with the salary: already in the salary line above.
              OR: [{ note: null }, { NOT: { note: { startsWith: PAID_WITH_SALARY } } }],
            },
            select: { id: true, paidAt: true, period: true, amount: true, note: true, user: { select: { fullName: true, staffProfile: { select: { shop: { select: { name: true } } } } } } },
            orderBy: { paidAt: 'desc' }, take: DETAIL_LIMIT + 1,
          }),
        ]);
        rows = [
          ...salaries.map((s) => ({
            id: s.id, at: s.paidAt!, title: s.staff.fullName, ref: s.paymentNumber, note: s.notes, kind: 'Tankhwah',
            branch: s.staff.shop?.name ?? null, by: null, amount: r2(s.paidAmount), link: `/staff/${s.staffId}`,
          })),
          ...commission.map((x) => ({
            id: x.id, at: x.paidAt, title: x.user.fullName, ref: x.period, note: x.note, kind: 'Commission',
            branch: x.user.staffProfile?.shop?.name ?? null, by: null, amount: r2(x.amount), link: '/staff/commission',
          })),
        ].sort((a, b) => b.at.getTime() - a.at.getTime());
        break;
      }
      case 'writeoff': {
        if (!c.costVisible) throw new ForbiddenException('Cost dekhne ki permission nahi');
        const [adjustments, returned] = await Promise.all([
          this.prisma.stockAdjustment.findMany({
            where: {
              tenantId: c.tenantId, type: { in: ['DAMAGE', 'LOSS', 'ADJUSTMENT_OUT', 'ADJUSTMENT_IN'] }, createdAt: r, ...shop,
              // Data corrections move stock only; they are not in the write-off line.
              OR: [{ profitEffect: null }, { profitEffect: { not: 'NONE' } }],
            },
            select: {
              id: true, createdAt: true, type: true, quantity: true, value: true, reason: true, note: true, groupRef: true, productId: true, profitEffect: true,
              product: { select: { name: true, unit: true } }, shop: { select: { name: true } }, createdBy: { select: { fullName: true } },
            },
            orderBy: { createdAt: 'desc' }, take: DETAIL_LIMIT + 1,
          }),
          // Goods taken back on a return as not fit to sell.
          this.prisma.$queryRaw<Array<{ id: string; at: Date; qty: number; value: number; ref: string; note: string | null; productId: string; product: string; unit: string; branch: string | null }>>(Prisma.sql`
            SELECT m.id, m."createdAt" AS at, ABS(m.quantity)::float8 AS qty,
              (ABS(m.quantity) * COALESCE(NULLIF(m."unitCost", 0), p."costPrice", 0))::float8 AS value,
              m.reference AS ref, m.note, m."productId", p.name AS product, p.unit, sh.name AS branch
            FROM "StockMovement" m
            JOIN "SaleReturn" x ON x."tenantId" = m."tenantId" AND x."returnNumber" = m.reference
            JOIN "Product" p ON p.id = m."productId"
            LEFT JOIN "Shop" sh ON sh.id = m."shopId"
            WHERE m."tenantId" = ${c.tenantId} AND m.type::text = 'DAMAGE'
              AND m."createdAt" >= ${r.gte} AND m."createdAt" < ${r.lt} ${this.shopSql(c, col('m."shopId"'))}
            ORDER BY m."createdAt" DESC
            LIMIT ${DETAIL_LIMIT + 1}`),
        ]);
        const label: Record<string, string> = { DAMAGE: 'Kharab', LOSS: 'Gum / chori', ADJUSTMENT_OUT: 'Ginti me kam', ADJUSTMENT_IN: 'Stock faida' };
        // A gain lowers the write-off: shown negative, like business-math.helper counts it.
        const gain = (m: { type: string; profitEffect: string | null }) => (m.profitEffect ? m.profitEffect === 'GAIN' : m.type === 'ADJUSTMENT_IN');
        rows = [
          ...adjustments.map((m) => ({
            id: m.id, at: m.createdAt, title: `${m.product.name} × ${Math.abs(m.quantity)} ${m.product.unit}`, ref: m.groupRef,
            note: [m.reason, m.note].filter(Boolean).join(' — ') || null,
            kind: gain(m) ? 'Stock faida' : label[m.type] ?? m.type, branch: m.shop?.name ?? null, by: m.createdBy?.fullName ?? null,
            amount: r2(gain(m) ? -m.value : m.value), link: `/products/${m.productId}`,
          })),
          ...returned.map((m) => ({
            id: m.id, at: m.at, title: `${m.product} × ${m.qty} ${m.unit}`, ref: m.ref, note: m.note,
            kind: 'Wapsi par kharab', branch: m.branch, by: null, amount: r2(n(m.value)), link: `/products/${m.productId}`,
          })),
        ].sort((a, b) => b.at.getTime() - a.at.getTime());
        break;
      }
      case 'income': {
        const list = await this.prisma.otherIncome.findMany({
          where: { tenantId: c.tenantId, incomeDate: r, ...shop },
          select: {
            id: true, incomeDate: true, title: true, incomeNumber: true, note: true, amount: true, category: true,
            customCategory: { select: { name: true } }, supplier: { select: { name: true } }, shop: { select: { name: true } }, createdBy: { select: { fullName: true } },
          },
          orderBy: { incomeDate: 'desc' }, take: DETAIL_LIMIT + 1,
        });
        rows = list.map((x) => ({
          id: x.id, at: x.incomeDate, title: x.supplier ? `${x.title} — ${x.supplier.name}` : x.title, ref: x.incomeNumber, note: x.note,
          kind: x.customCategory?.name ?? INCOME_LABELS[x.category] ?? x.category, branch: x.shop?.name ?? null, by: x.createdBy?.fullName ?? null,
          amount: r2(x.amount), link: '/income',
        }));
        break;
      }
      case 'credit': {
        // Khata bills of the period with what is still owed on them.
        if (!c.costVisible) throw new ForbiddenException('Cost dekhne ki permission nahi');
        const list = await this.prisma.$queryRaw<Array<{ id: string; at: Date; number: string; customer: string | null; branch: string | null; net: number; settled: number }>>(Prisma.sql`
          SELECT s.id, s."soldAt" AS at, s."saleNumber" AS number, cu.name AS customer, sh.name AS branch,
            (s.total - s."refundedAmount")::float8 AS net,
            COALESCE((SELECT SUM(z.amount) FROM "SaleSettlement" z WHERE z."saleId" = s.id AND z."settledAt" < ${r.lt}), 0)::float8 AS settled
          FROM "Sale" s
          LEFT JOIN "Customer" cu ON cu.id = s."customerId"
          LEFT JOIN "Shop" sh ON sh.id = s."shopId"
          WHERE s."tenantId" = ${c.tenantId} AND s.status::text <> 'VOIDED' AND s."soldAt" >= ${r.gte} AND s."soldAt" < ${r.lt}
            ${this.shopSql(c, col('s."shopId"'))}
            AND EXISTS (SELECT 1 FROM "SaleSettlement" t WHERE t."saleId" = s.id)
          ORDER BY s."soldAt" DESC
          LIMIT ${DETAIL_LIMIT + 1}`);
        rows = list.filter((b) => n(b.net) - n(b.settled) > 0.5).map((b) => ({
          id: b.id, at: b.at, title: b.customer ?? 'Customer', ref: b.number, note: `Bill ${r2(n(b.net))} · baqi ${r2(n(b.net) - n(b.settled))}`,
          kind: 'Udhaar baqi', branch: b.branch, by: null, amount: r2(n(b.net) - n(b.settled)), link: `/sales/${b.id}`,
        }));
        break;
      }
      case 'booking': {
        const list = await this.prisma.$queryRaw<Array<{ id: string; at: Date; number: string; status: string; reason: string | null; amount: number; customer: string | null; branch: string | null }>>(Prisma.sql`
          SELECT b.id, COALESCE(b."cancelledAt", b."updatedAt") AS at, b."bookingNumber" AS number, b.status::text AS status,
            b."cancelReason" AS reason, (b."totalPaid" - b."totalRefunded")::float8 AS amount, cu.name AS customer, sh.name AS branch
          FROM "Booking" b
          LEFT JOIN "Customer" cu ON cu.id = b."customerId"
          LEFT JOIN "Shop" sh ON sh.id = b."shopId"
          WHERE b."tenantId" = ${c.tenantId} AND b.status::text IN ('CANCELLED', 'EXPIRED')
            AND b."totalPaid" - b."totalRefunded" > 0.005
            AND COALESCE(b."cancelledAt", b."updatedAt") >= ${r.gte} AND COALESCE(b."cancelledAt", b."updatedAt") < ${r.lt}
            ${this.shopSql(c, col('b."shopId"'))}
          ORDER BY 2 DESC
          LIMIT ${DETAIL_LIMIT + 1}`);
        rows = list.map((b) => ({
          id: b.id, at: b.at, title: b.customer ?? 'Customer', ref: b.number, note: b.reason, kind: b.status === 'EXPIRED' ? 'Waqt guzar gaya' : 'Cancel',
          branch: b.branch, by: null, amount: r2(n(b.amount)), link: `/bookings/${b.id}`,
        }));
        break;
      }
    }

    const truncated = rows.length > DETAIL_LIMIT;
    const shown = rows.slice(0, DETAIL_LIMIT);
    return { rows: shown, count: shown.length, total: r2(shown.reduce((s, x) => s + x.amount, 0)), truncated };
  }
}
