/**
 * Business maths: the one set of rules every report, dashboard, summary and
 * statement uses for sales, cost, profit, expenses, write-offs and cash.
 *
 *   Live bill       Sale.status is not VOIDED. Fully returned bills stay in;
 *                   their refund brings them to zero.
 *   Net sales       Sale.total − Sale.refundedAmount. The bill total holds
 *                   service charges; refunds never go above the goods value.
 *   Line revenue    SaleItem.total × k − refunds on the line (SaleReturnItem
 *                   .total), where k = (subtotal − discount) ÷ Σ line totals of
 *                   the bill, kept between 0 and 1. Line discounts are already
 *                   inside SaleItem.total, so k only spreads the bill discount
 *                   (manual, code and points). Lines add up to net sales less
 *                   service charges.
 *   Line cost       unit cost × kept quantity (quantity − returnedQty). Unit
 *                   cost is SaleItem.costPrice; when that is 0 it falls back to
 *                   today's variant cost, then product cost. Those lines are
 *                   counted as "fallback" lines; lines with no cost anywhere
 *                   are counted as "no cost" lines. There is no fallback when
 *                   the bill already carries more cost than its lines (older
 *                   bills kept the cost on the bill only).
 *   Bill cost       Σ line cost + the cost kept on the bill beyond its lines
 *                   (service-charge cost such as a rider's fare, older bills).
 *   Gross profit    net sales − bill cost.
 *   Expenses        status PAID only, dated by expenseDate (paying a pending
 *                   bill moves expenseDate to the payment day). PENDING bills
 *                   are shown apart and never inside the total.
 *   Write-offs      StockAdjustment.value by its profit effect: stock loss
 *                   (Stock nuksan: DAMAGE + LOSS + ADJUSTMENT_OUT) less stock
 *                   gain (Stock faida: ADJUSTMENT_IN). Rows marked as a data
 *                   correction (profitEffect NONE) move stock only and count
 *                   in neither. Older rows have no profitEffect and go by
 *                   their type. Approving a damage report writes such a
 *                   row, so DamageLog.netLoss is never added on top. Goods
 *                   taken back on a return as not fit to sell (StockMovement
 *                   DAMAGE carrying the return number) count with damage, at
 *                   the cost saved on the movement.
 *   Khata profit    A bill paid in full at the counter earns its profit on the
 *                   bill day. On a bill with a khata part, the counter part
 *                   earns its share on the bill day and the khata part earns
 *                   its share when the customer pays (SaleSettlement rows,
 *                   built FIFO by sale-settlement.helper):
 *                     share = bill profit × amount settled ÷ bill net.
 *                   "Haath mein aaya profit" (realised) is the profit whose
 *                   money came in during the period; "Udhaar mein profit"
 *                   (pending) is the profit of the period's bills still owed
 *                   at the period end. For the period's bills:
 *                     bill profit = realised on them + pending + written off.
 *                   The shop picks which one is the headline (Settings →
 *                   Reports, creditProfit: 'paid' by default, or 'bill').
 *   Other income    OtherIncome by incomeDate (company incentives, scheme
 *                   claims, commission, rent, interest).
 *   Net profit      headline gross profit − expenses − stock loss + stock gain
 *                   + other income. The P&L statement also shows staff pay
 *                   and kept booking advances as lines of their own.
 *   Cash in         the bill's SalePayment rows (cash net of change), so it
 *                   equals paidAmount − changeAmount less any trade-in, which
 *                   is goods, not money. Splits by method read the rows too.
 *                   Drawer views also leave out bills made from a booking
 *                   (that money was counted when the booking was paid).
 *   Returns dating  Sales and profit views (Reports centre, Profit report,
 *                   P&L, Staff, Customers, dashboards) count a return against
 *                   the day of its bill, so a period's figures follow its own
 *                   bills. Day-close and money views (Returns tab, Day book,
 *                   Daily summary, cash and accounts) count it on the day it
 *                   was made: the day's bills at full value less that day's
 *                   returns and the cost of what came back.
 *
 * SQL fragments use the aliases `s` ("Sale"), `si` ("SaleItem") and
 * `ri` ("SaleReturnItem"); `billMathCte` adds the per-bill CTE `bm`.
 */

import { Prisma } from '@prisma/client';
import { readReportsConfig } from './reports-config.helper';
import { syncTenantSettlements } from './sale-settlement.helper';

type Db = Prisma.TransactionClient;

/** Tenant and branch (null or missing for every branch). */
export interface MathScope {
  tenantId: string;
  shopId?: string | null;
}

/** Time window; a missing end means "up to now", a missing start "from the beginning". */
export interface MathRange {
  gte?: Date | null;
  lt?: Date | null;
}

const n = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;

/* ───────────────────────── bills ───────────────────────── */

/** Net sales of one bill. */
export const BILL_NET = Prisma.sql`(s.total - s."refundedAmount")`;

/** Money taken on one bill: its payment rows without trade-in. */
export const BILL_CASH_IN = Prisma.sql`(SELECT COALESCE(SUM(sp.amount), 0) FROM "SalePayment" sp WHERE sp."saleId" = s.id AND sp.method <> 'TRADE_IN')`;

/** Prisma filter for live bills. */
export const LIVE_BILL = { not: 'VOIDED' as const };

function rangeSql(col: Prisma.Sql, r: MathRange) {
  return Prisma.sql`${r.gte ? Prisma.sql`AND ${col} >= ${r.gte}` : Prisma.empty} ${r.lt ? Prisma.sql`AND ${col} < ${r.lt}` : Prisma.empty}`;
}

function shopSql(col: Prisma.Sql, scope: MathScope) {
  return scope.shopId ? Prisma.sql`AND ${col} = ${scope.shopId}` : Prisma.empty;
}

/** WHERE for live bills of the tenant, branch and window (alias `s`). */
export function liveSaleSql(scope: MathScope, r: MathRange) {
  return Prisma.sql`s."tenantId" = ${scope.tenantId} AND s.status::text <> 'VOIDED'
    ${shopSql(Prisma.sql`s."shopId"`, scope)} ${rangeSql(Prisma.sql`s."soldAt"`, r)}`;
}

/* ───────────────────────── lines ───────────────────────── */

/** Joins for today's variant and product cost of a line (aliases bm_sv, bm_pv, bm_p). */
export const LINE_COST_JOINS = Prisma.sql`
  LEFT JOIN "SaleItemVariant" bm_sv ON bm_sv."saleItemId" = si.id
  LEFT JOIN "ProductVariant" bm_pv ON bm_pv.id = bm_sv."variantId"
  LEFT JOIN "Product" bm_p ON bm_p.id = si."productId"`;

/** Today's cost of the line's variant, else its product. Needs LINE_COST_JOINS. */
const TODAY_COST = Prisma.sql`COALESCE(NULLIF(bm_pv."costPrice", 0), bm_p."costPrice", 0)`;

/** Quantity the customer kept. */
export const KEPT_QTY = Prisma.sql`(si.quantity - LEAST(si."returnedQty", si.quantity))`;

/**
 * Per-bill CTE `bm` for the bills in `where` (alias `s`), with
 *   k                the bill-discount share applied to each line total
 *   keeps            true when the bill carries cost beyond its lines
 *   cost             cost of the goods kept plus the bill's own cost
 *   "soldCost"       the same before any return (day-close views)
 *   "estCost"        of "soldCost", the part costed at today's cost
 *   "fallbackLines"  lines costed at today's cost
 *   "noCostLines"    lines with no cost anywhere, and "noCostRevenue" their line totals
 * Join it with `JOIN bm ON bm.id = s.id`.
 */
export function billMathCte(where: Prisma.Sql) {
  return Prisma.sql`bm_raw AS (
      SELECT s.id,
        CASE WHEN COALESCE(SUM(si.total), 0) > 0
             THEN LEAST(1, GREATEST(0, (s.subtotal - s.discount) / SUM(si.total))) ELSE 1 END AS k,
        GREATEST(s."costOfGoods" - COALESCE(SUM(si.quantity * si."costPrice"), 0), 0) AS extra,
        COALESCE(SUM(${KEPT_QTY} * si."costPrice"), 0) AS saved_kept,
        COALESCE(SUM(si.quantity * si."costPrice"), 0) AS saved_sold,
        COALESCE(SUM(${KEPT_QTY} * ${TODAY_COST}) FILTER (WHERE si."costPrice" <= 0), 0) AS est_kept,
        COALESCE(SUM(si.quantity * ${TODAY_COST}) FILTER (WHERE si."costPrice" <= 0), 0) AS est_sold,
        COUNT(si.id) FILTER (WHERE si."costPrice" <= 0 AND ${TODAY_COST} > 0) AS est_lines,
        COUNT(si.id) FILTER (WHERE si."costPrice" <= 0 AND ${TODAY_COST} <= 0) AS bare_lines,
        COALESCE(SUM(si.total) FILTER (WHERE si."costPrice" <= 0 AND ${TODAY_COST} <= 0), 0) AS bare_rev
      FROM "Sale" s
      LEFT JOIN "SaleItem" si ON si."saleId" = s.id
      ${LINE_COST_JOINS}
      WHERE ${where}
      GROUP BY s.id),
    bm AS (
      SELECT id, k, extra > 0.005 AS keeps,
        saved_kept + extra + CASE WHEN extra > 0.005 THEN 0 ELSE est_kept END AS cost,
        saved_sold + extra + CASE WHEN extra > 0.005 THEN 0 ELSE est_sold END AS "soldCost",
        CASE WHEN extra > 0.005 THEN 0 ELSE est_sold END AS "estCost",
        CASE WHEN extra > 0.005 THEN 0 ELSE est_lines END AS "fallbackLines",
        CASE WHEN extra > 0.005 THEN 0 ELSE bare_lines END AS "noCostLines",
        CASE WHEN extra > 0.005 THEN 0 ELSE bare_rev END AS "noCostRevenue"
      FROM bm_raw)`;
}

/** Line total after its share of the bill discount. Needs `bm`. */
export const LINE_NET = Prisma.sql`(si.total * bm.k)`;

/** Money given back on the line's returns. */
export const LINE_REFUND = Prisma.sql`(CASE WHEN si."returnedQty" > 0
  THEN COALESCE((SELECT SUM(bm_ri.total) FROM "SaleReturnItem" bm_ri WHERE bm_ri."saleItemId" = si.id), 0) ELSE 0 END)`;

/** What the line earned after the bill discount and its refunds. Needs `bm`. */
export const LINE_REVENUE = Prisma.sql`(${LINE_NET} - ${LINE_REFUND})`;

/** Unit cost of a line: saved cost, else today's cost unless the bill keeps its cost. Needs `bm` and LINE_COST_JOINS. */
export const LINE_UNIT_COST = Prisma.sql`(CASE WHEN si."costPrice" > 0 THEN si."costPrice" WHEN bm.keeps THEN 0 ELSE ${TODAY_COST} END)`;

/** Cost of the goods the customer kept. Needs `bm` and LINE_COST_JOINS. */
export const LINE_COST = Prisma.sql`(${KEPT_QTY} * ${LINE_UNIT_COST})`;

/** Line costed at today's cost. Needs `bm` and LINE_COST_JOINS. */
export const LINE_FALLBACK = Prisma.sql`(si."costPrice" <= 0 AND NOT bm.keeps AND ${TODAY_COST} > 0)`;

/** Line with no cost anywhere. Needs `bm` and LINE_COST_JOINS. */
export const LINE_NO_COST = Prisma.sql`(si."costPrice" <= 0 AND NOT bm.keeps AND ${TODAY_COST} <= 0)`;

/**
 * Cost of goods that came back on return line `ri` (joined to `si` and its
 * bill `s`, plus LINE_COST_JOINS), by the same rule as LINE_UNIT_COST. Used by
 * day-close views, where the bill may lie outside the period.
 */
export const RETURN_LINE_COST = Prisma.sql`(ri.quantity * CASE WHEN si."costPrice" > 0 THEN si."costPrice"
  WHEN s."costOfGoods" > (SELECT COALESCE(SUM(z.quantity * z."costPrice"), 0) FROM "SaleItem" z WHERE z."saleId" = s.id) + 0.005 THEN 0
  ELSE ${TODAY_COST} END)`;

/* ───────────────────────── sale figures ───────────────────────── */

export interface SaleFigures {
  bills: number;
  /** Bill totals before returns. */
  gross: number;
  refunds: number;
  /** gross − refunds. */
  net: number;
  cost: number;
  grossProfit: number;
  cashIn: number;
  credit: number;
  subtotal: number;
  discount: number;
  codeDiscount: number;
  loyaltyDiscount: number;
  service: number;
  fallbackLines: number;
  noCostLines: number;
}

export const emptySaleFigures = (): SaleFigures => ({
  bills: 0, gross: 0, refunds: 0, net: 0, cost: 0, grossProfit: 0, cashIn: 0, credit: 0,
  subtotal: 0, discount: 0, codeDiscount: 0, loyaltyDiscount: 0, service: 0, fallbackLines: 0, noCostLines: 0,
});

/** Column list shared by every bill-level query that wants sale figures. Needs `bm`. */
export const SALE_FIGURE_COLUMNS = Prisma.sql`
  COUNT(*)::int AS bills,
  COALESCE(SUM(s.total), 0)::float8 AS gross,
  COALESCE(SUM(s."refundedAmount"), 0)::float8 AS refunds,
  COALESCE(SUM(bm.cost), 0)::float8 AS cost,
  COALESCE(SUM(${BILL_CASH_IN}), 0)::float8 AS "cashIn",
  COALESCE(SUM(s."creditAmount"), 0)::float8 AS credit,
  COALESCE(SUM(s.subtotal), 0)::float8 AS subtotal,
  COALESCE(SUM(s.discount), 0)::float8 AS discount,
  COALESCE(SUM(s."codeDiscount"), 0)::float8 AS "codeDiscount",
  COALESCE(SUM(s."loyaltyDiscount"), 0)::float8 AS "loyaltyDiscount",
  COALESCE(SUM(s."serviceCharges"), 0)::float8 AS service,
  COALESCE(SUM(bm."fallbackLines"), 0)::int AS "fallbackLines",
  COALESCE(SUM(bm."noCostLines"), 0)::int AS "noCostLines"`;

type FigureRow = Omit<SaleFigures, 'net' | 'grossProfit'>;

/** Rounds a raw row and adds net and gross profit. */
export function toSaleFigures(row: Partial<FigureRow> | null | undefined): SaleFigures {
  if (!row) return emptySaleFigures();
  const gross = n(row.gross);
  const refunds = n(row.refunds);
  const cost = n(row.cost);
  return {
    bills: n(row.bills), gross: r2(gross), refunds: r2(refunds), net: r2(gross - refunds),
    cost: r2(cost), grossProfit: r2(gross - refunds - cost),
    cashIn: r2(n(row.cashIn)), credit: r2(n(row.credit)), subtotal: r2(n(row.subtotal)),
    discount: r2(n(row.discount)), codeDiscount: r2(n(row.codeDiscount)), loyaltyDiscount: r2(n(row.loyaltyDiscount)),
    service: r2(n(row.service)), fallbackLines: n(row.fallbackLines), noCostLines: n(row.noCostLines),
  };
}

/**
 * Sale figures for the live bills in `where` (alias `s`), grouped by `key`
 * (one row keyed "all" when left out).
 */
export async function saleFiguresBy(db: Db, where: Prisma.Sql, key: Prisma.Sql = Prisma.sql`'all'::text`): Promise<Map<string, SaleFigures>> {
  const rows = await db.$queryRaw<Array<FigureRow & { k: string | null }>>`
    WITH ${billMathCte(where)}
    SELECT ${key} AS k, ${SALE_FIGURE_COLUMNS}
    FROM "Sale" s JOIN bm ON bm.id = s.id
    WHERE ${where}
    GROUP BY 1`;
  return new Map(rows.map((x) => [x.k ?? '', toSaleFigures(x)]));
}

/** Sale figures for a tenant, branch and window. */
export async function saleFigures(db: Db, scope: MathScope, r: MathRange): Promise<SaleFigures> {
  return (await saleFiguresBy(db, liveSaleSql(scope, r))).get('all') ?? emptySaleFigures();
}

/**
 * Day-close cost: the cost of the window's bills at full quantity, and the
 * cost of goods that came back on returns made in the window (a return
 * belongs to the branch it was made at; older rows fall back to the bill's).
 */
export async function dayCloseCost(db: Db, scope: MathScope, r: MathRange): Promise<{ sold: number; returned: number }> {
  const where = liveSaleSql(scope, r);
  const [sold, back] = await Promise.all([
    db.$queryRaw<Array<{ cost: number }>>`
      WITH ${billMathCte(where)}
      SELECT COALESCE(SUM(bm."soldCost"), 0)::float8 AS cost FROM bm`,
    db.$queryRaw<Array<{ cost: number }>>`
      SELECT COALESCE(SUM(${RETURN_LINE_COST}), 0)::float8 AS cost
      FROM "SaleReturnItem" ri
      JOIN "SaleReturn" x ON x.id = ri."returnId"
      JOIN "SaleItem" si ON si.id = ri."saleItemId"
      JOIN "Sale" s ON s.id = x."saleId"
      ${LINE_COST_JOINS}
      WHERE x."tenantId" = ${scope.tenantId} ${rangeSql(Prisma.sql`x."returnedAt"`, r)}
        ${scope.shopId ? Prisma.sql`AND (x."shopId" = ${scope.shopId} OR (x."shopId" IS NULL AND s."shopId" = ${scope.shopId}))` : Prisma.empty}`,
  ]);
  return { sold: r2(n(sold[0]?.cost)), returned: r2(n(back[0]?.cost)) };
}

/* ───────────────────────── expenses ───────────────────────── */

/** Prisma filter for expenses that count: PAID, by expenseDate. */
export function paidExpenseWhere(scope: MathScope, r: MathRange): Prisma.ExpenseWhereInput {
  return {
    tenantId: scope.tenantId,
    ...(scope.shopId && { shopId: scope.shopId }),
    status: 'PAID',
    ...((r.gte || r.lt) && { expenseDate: { ...(r.gte && { gte: r.gte }), ...(r.lt && { lt: r.lt }) } }),
  };
}

/** SQL filter for expenses that count (alias `e`). */
export function paidExpenseSql(scope: MathScope, r: MathRange) {
  return Prisma.sql`e."tenantId" = ${scope.tenantId} AND e.status::text = 'PAID'
    ${shopSql(Prisma.sql`e."shopId"`, scope)} ${rangeSql(Prisma.sql`e."expenseDate"`, r)}`;
}

export async function paidExpenses(db: Db, scope: MathScope, r: MathRange): Promise<{ amount: number; count: number }> {
  const a = await db.expense.aggregate({ where: paidExpenseWhere(scope, r), _sum: { amount: true }, _count: { _all: true } });
  return { amount: r2(n(a._sum.amount)), count: a._count._all };
}

/* ───────────────────────── write-offs ───────────────────────── */

export type WriteOffKind = 'DAMAGE' | 'LOSS' | 'ADJUSTMENT_OUT' | 'ADJUSTMENT_IN' | 'RETURN_DAMAGE' | 'CORRECTION';
const ADJUSTMENT_KINDS = ['DAMAGE', 'LOSS', 'ADJUSTMENT_OUT', 'ADJUSTMENT_IN'] as const;

export interface WriteOffRow { k: string; kind: WriteOffKind; value: number; count: number }

export interface WriteOffs {
  /** Damage reports, damaged stock and goods returned not fit to sell. */
  damage: number;
  damageCount: number;
  /** Of `damage`, goods taken back on a return as not fit to sell. */
  returnDamage: number;
  returnDamageCount: number;
  loss: number;
  lossCount: number;
  /** Counted short or taken out by hand. */
  countedShort: number;
  countedShortCount: number;
  /** Counted extra or added by hand; reduces the write-off. */
  found: number;
  foundCount: number;
  /** Stock nuksan: damage + loss + countedShort. */
  lossTotal: number;
  /** Stock faida: found (same as `found`). */
  gain: number;
  /** Data corrections: stock moved, no profit effect. Shown for reference only. */
  correction: number;
  correctionCount: number;
  /** lossTotal − gain: what comes off profit. */
  net: number;
  /** Rows that count in profit (corrections left out). */
  count: number;
}

export const emptyWriteOffs = (): WriteOffs => foldWriteOffs([]);

export interface WriteOffOptions {
  /** Bucket key built from the row's time and branch columns. */
  key?: (at: Prisma.Sql, shop: Prisma.Sql) => Prisma.Sql;
  /** Extra filter on the product (alias `wp`). */
  product?: Prisma.Sql;
}

/**
 * Kind of an adjustment row (alias `a`) for profit: a data correction
 * (profitEffect NONE) is CORRECTION, a gain is ADJUSTMENT_IN, a loss keeps its
 * stock-out type. Older rows without profitEffect keep their type.
 */
const ADJUSTMENT_KIND = Prisma.sql`(CASE
  WHEN a."profitEffect"::text = 'NONE' THEN 'CORRECTION'
  WHEN a."profitEffect"::text = 'GAIN' THEN 'ADJUSTMENT_IN'
  WHEN a."profitEffect"::text = 'LOSS' AND a.type::text = 'ADJUSTMENT_IN' THEN 'ADJUSTMENT_OUT'
  ELSE a.type::text END)`;

/** Write-off rows by kind (and by `key` when given). */
export function writeOffRows(db: Db, scope: MathScope, r: MathRange, o: WriteOffOptions = {}): Promise<WriteOffRow[]> {
  const keyA = o.key ? o.key(Prisma.sql`a."createdAt"`, Prisma.sql`a."shopId"`) : Prisma.sql`'all'::text`;
  const keyM = o.key ? o.key(Prisma.sql`m."createdAt"`, Prisma.sql`m."shopId"`) : Prisma.sql`'all'::text`;
  const product = o.product ? Prisma.sql`AND ${o.product}` : Prisma.empty;
  return db.$queryRaw<WriteOffRow[]>`
    SELECT w.k, w.kind, COALESCE(SUM(w.value), 0)::float8 AS value, COUNT(*)::int AS count
    FROM (
      SELECT ${keyA} AS k, ${ADJUSTMENT_KIND} AS kind, a.value AS value
      FROM "StockAdjustment" a JOIN "Product" wp ON wp.id = a."productId"
      WHERE a."tenantId" = ${scope.tenantId} AND a.type::text IN (${Prisma.join([...ADJUSTMENT_KINDS])})
        ${shopSql(Prisma.sql`a."shopId"`, scope)} ${rangeSql(Prisma.sql`a."createdAt"`, r)} ${product}
      UNION ALL
      SELECT ${keyM} AS k, 'RETURN_DAMAGE' AS kind, ABS(m.quantity) * COALESCE(NULLIF(m."unitCost", 0), wp."costPrice", 0) AS value
      FROM "StockMovement" m
      JOIN "SaleReturn" x ON x."tenantId" = m."tenantId" AND x."returnNumber" = m.reference
      JOIN "Product" wp ON wp.id = m."productId"
      WHERE m."tenantId" = ${scope.tenantId} AND m.type::text = 'DAMAGE'
        ${shopSql(Prisma.sql`m."shopId"`, scope)} ${rangeSql(Prisma.sql`m."createdAt"`, r)} ${product}
    ) w
    GROUP BY 1, 2`;
}

/** Adds rows of one bucket into the write-off summary. */
export function foldWriteOffs(rows: Array<Pick<WriteOffRow, 'kind' | 'value' | 'count'>>): WriteOffs {
  const v = (k: WriteOffKind) => rows.filter((x) => x.kind === k).reduce((s, x) => s + n(x.value), 0);
  const c = (k: WriteOffKind) => rows.filter((x) => x.kind === k).reduce((s, x) => s + n(x.count), 0);
  const damage = v('DAMAGE') + v('RETURN_DAMAGE');
  const loss = v('LOSS');
  const short = v('ADJUSTMENT_OUT');
  const found = v('ADJUSTMENT_IN');
  const counted = rows.filter((x) => x.kind !== 'CORRECTION').reduce((s, x) => s + n(x.count), 0);
  return {
    damage: r2(damage), damageCount: c('DAMAGE') + c('RETURN_DAMAGE'),
    returnDamage: r2(v('RETURN_DAMAGE')), returnDamageCount: c('RETURN_DAMAGE'),
    loss: r2(loss), lossCount: c('LOSS'),
    countedShort: r2(short), countedShortCount: c('ADJUSTMENT_OUT'),
    found: r2(found), foundCount: c('ADJUSTMENT_IN'),
    lossTotal: r2(damage + loss + short), gain: r2(found),
    correction: r2(v('CORRECTION')), correctionCount: c('CORRECTION'),
    net: r2(damage + loss + short - found),
    count: counted,
  };
}

export async function writeOffs(db: Db, scope: MathScope, r: MathRange, product?: Prisma.Sql): Promise<WriteOffs> {
  return foldWriteOffs(await writeOffRows(db, scope, r, { product }));
}

/* ───────────────────────── other income ───────────────────────── */

export interface OtherIncomeRow { k: string; amount: number; count: number }

/** Other income by `key` (time and branch columns), one row "all" when left out. */
export function otherIncomeRows(db: Db, scope: MathScope, r: MathRange, o: { key?: (at: Prisma.Sql, shop: Prisma.Sql) => Prisma.Sql } = {}): Promise<OtherIncomeRow[]> {
  const key = o.key ? o.key(Prisma.sql`oi."incomeDate"`, Prisma.sql`oi."shopId"`) : Prisma.sql`'all'::text`;
  return db.$queryRaw<OtherIncomeRow[]>`
    SELECT ${key} AS k, COALESCE(SUM(oi.amount), 0)::float8 AS amount, COUNT(*)::int AS count
    FROM "OtherIncome" oi
    WHERE oi."tenantId" = ${scope.tenantId} ${shopSql(Prisma.sql`oi."shopId"`, scope)} ${rangeSql(Prisma.sql`oi."incomeDate"`, r)}
    GROUP BY 1`;
}

export async function otherIncome(db: Db, scope: MathScope, r: MathRange): Promise<{ amount: number; count: number }> {
  const row = (await otherIncomeRows(db, scope, r))[0];
  return { amount: r2(n(row?.amount)), count: n(row?.count) };
}

/* ───────────────────────── khata profit ───────────────────────── */

/** Which gross profit is the headline: profit when the money comes ('PAID') or on the bill day ('BILL'). */
export type ProfitBasis = 'PAID' | 'BILL';

export async function profitBasis(db: Db, tenantId: string): Promise<ProfitBasis> {
  const config = await readReportsConfig(db as never, tenantId);
  return config.creditProfit === 'bill' ? 'BILL' : 'PAID';
}

export interface CreditProfit {
  /** Gross profit of the period's bills (bill basis). */
  billProfit: number;
  /** "Haath mein aaya profit": profit whose money came in during the period. */
  realised: number;
  /** Of `realised`, from bills made before the period (khata paid now). */
  fromOlderBills: number;
  /** "Udhaar mein profit": of `billProfit`, still owed at the period end. */
  pending: number;
  /** Of `billProfit`, khata forgiven or reduced without money. */
  writtenOff: number;
}

export const emptyCreditProfit = (): CreditProfit => ({ billProfit: 0, realised: 0, fromOlderBills: 0, pending: 0, writtenOff: 0 });

export interface CreditProfitRow { k: string; part: 'bill' | 'plain' | 'same' | 'sameOff' | 'older'; value: number }

/**
 * Khata profit parts by `key` (time and branch columns of the bill or of the
 * settlement). For each bucket:
 *   bill     profit of the bucket's bills
 *   plain    of those, bills with no khata part (all realised on the bill day)
 *   same     realised on the bucket's khata bills within the bucket
 *   sameOff  written off on them within the bucket
 *   older    realised in the bucket on bills from before it
 * Settlement rows are brought up to date first (sale-settlement.helper).
 */
export async function creditProfitRows(
  db: Db, scope: MathScope, r: MathRange, o: { key?: (at: Prisma.Sql, shop: Prisma.Sql) => Prisma.Sql } = {},
): Promise<CreditProfitRow[]> {
  await syncTenantSettlements(db, scope.tenantId);
  const key = o.key ?? (() => Prisma.sql`'all'::text`);
  const end = r.lt ?? new Date();
  const inPeriod = (col: Prisma.Sql) => Prisma.sql`(TRUE ${rangeSql(col, { gte: r.gte, lt: end })})`;
  const where = Prisma.sql`s."tenantId" = ${scope.tenantId} AND s.status::text <> 'VOIDED' ${shopSql(Prisma.sql`s."shopId"`, scope)}
    AND (${inPeriod(Prisma.sql`s."soldAt"`)} OR s.id IN (
      SELECT z."saleId" FROM "SaleSettlement" z WHERE z."tenantId" = ${scope.tenantId} AND ${inPeriod(Prisma.sql`z."settledAt"`)}))`;
  const kb = key(Prisma.sql`b."soldAt"`, Prisma.sql`b."shopId"`);
  const kzSold = key(Prisma.sql`z."soldAt"`, Prisma.sql`z."shopId"`);
  const kzPaid = key(Prisma.sql`z."settledAt"`, Prisma.sql`z."shopId"`);
  return db.$queryRaw<CreditProfitRow[]>`
    WITH ${billMathCte(where)},
    b AS (
      SELECT s.id, s."soldAt", s."shopId", (s.total - s."refundedAmount") AS net,
        (s.total - s."refundedAmount" - bm.cost) AS profit,
        ${inPeriod(Prisma.sql`s."soldAt"`)} AS inr,
        EXISTS (SELECT 1 FROM "SaleSettlement" t WHERE t."saleId" = s.id) AS tracked
      FROM "Sale" s JOIN bm ON bm.id = s.id),
    z AS (
      SELECT st.kind::text AS kind, st."settledAt", b."soldAt", b."shopId", b.inr,
        CASE WHEN b.net > 0.005 THEN st.amount * b.profit / b.net ELSE 0 END AS p
      FROM "SaleSettlement" st JOIN b ON b.id = st."saleId"
      WHERE st."settledAt" < ${end})
    SELECT k, part, COALESCE(SUM(v), 0)::float8 AS value FROM (
      SELECT ${kb} AS k, 'bill' AS part, b.profit AS v FROM b WHERE b.inr
      UNION ALL
      SELECT ${kb}, 'plain', b.profit FROM b WHERE b.inr AND NOT b.tracked
      UNION ALL
      SELECT ${kzSold}, CASE WHEN z.kind = 'WRITE_OFF' THEN 'sameOff' ELSE 'same' END, z.p
      FROM z WHERE z.inr AND ${kzPaid} = ${kzSold}
      UNION ALL
      SELECT ${kzPaid}, 'older', z.p
      FROM z WHERE z.kind <> 'WRITE_OFF' AND ${inPeriod(Prisma.sql`z."settledAt"`)} AND NOT (z.inr AND ${kzPaid} = ${kzSold})
    ) x
    GROUP BY 1, 2`;
}

/** Adds the parts of one bucket into khata profit figures. */
export function foldCreditProfit(rows: Array<Pick<CreditProfitRow, 'part' | 'value'>>): CreditProfit {
  const v = (p: CreditProfitRow['part']) => rows.filter((x) => x.part === p).reduce((s, x) => s + n(x.value), 0);
  const bill = v('bill');
  const same = v('plain') + v('same');
  const off = v('sameOff');
  const older = v('older');
  const pending = bill - same - off;
  return {
    billProfit: r2(bill),
    realised: r2(same + older),
    fromOlderBills: r2(older),
    pending: r2(Math.abs(pending) < 0.005 ? 0 : pending),
    writtenOff: r2(off),
  };
}

export async function creditProfit(db: Db, scope: MathScope, r: MathRange): Promise<CreditProfit> {
  return foldCreditProfit(await creditProfitRows(db, scope, r));
}

/**
 * One customer's khata bills (bills with a khata part), all time: their
 * profit, the part already in hand and the part still on khata.
 */
export async function customerKhataProfit(db: Db, tenantId: string, customerId: string, shopId?: string | null): Promise<{ bills: number; billProfit: number; realised: number; pending: number; writtenOff: number }> {
  await syncTenantSettlements(db, tenantId);
  const where = Prisma.sql`s."tenantId" = ${tenantId} AND s.status::text <> 'VOIDED' ${shopSql(Prisma.sql`s."shopId"`, { tenantId, shopId })}
    AND s.id IN (SELECT z."saleId" FROM "SaleSettlement" z WHERE z."tenantId" = ${tenantId} AND z."customerId" = ${customerId})`;
  const [row] = await db.$queryRaw<Array<{ bills: number; profit: number; realised: number; off: number }>>`
    WITH ${billMathCte(where)},
    b AS (SELECT s.id, (s.total - s."refundedAmount") AS net, (s.total - s."refundedAmount" - bm.cost) AS profit FROM "Sale" s JOIN bm ON bm.id = s.id)
    SELECT COUNT(*)::int AS bills, COALESCE(SUM(b.profit), 0)::float8 AS profit,
      COALESCE(SUM((SELECT SUM(z.amount) FROM "SaleSettlement" z WHERE z."saleId" = b.id AND z.kind::text <> 'WRITE_OFF') * CASE WHEN b.net > 0.005 THEN b.profit / b.net ELSE 0 END), 0)::float8 AS realised,
      COALESCE(SUM((SELECT SUM(z.amount) FROM "SaleSettlement" z WHERE z."saleId" = b.id AND z.kind::text = 'WRITE_OFF') * CASE WHEN b.net > 0.005 THEN b.profit / b.net ELSE 0 END), 0)::float8 AS off
    FROM b`;
  const profit = n(row?.profit);
  const realised = n(row?.realised);
  const off = n(row?.off);
  const pending = profit - realised - off;
  return { bills: n(row?.bills), billProfit: r2(profit), realised: r2(realised), pending: r2(Math.abs(pending) < 0.005 ? 0 : pending), writtenOff: r2(off) };
}

/** The gross profit a basis puts in the headline. */
export const headlineGross = (c: CreditProfit, basis: ProfitBasis) => (basis === 'BILL' ? c.billProfit : c.realised);

/**
 * Sale lines with no cost anywhere (LINE_NO_COST): their whole sale counts as
 * profit. `products` is how many different products they are.
 */
export interface NoCostSales { products: number; lines: number; revenue: number }

export async function noCostSales(db: Db, scope: MathScope, r: MathRange): Promise<NoCostSales> {
  const where = liveSaleSql(scope, r);
  const [row] = await db.$queryRaw<Array<{ products: number; lines: number; revenue: number }>>`
    WITH ${billMathCte(where)}
    SELECT COUNT(DISTINCT si."productId")::int AS products, COUNT(*)::int AS lines, COALESCE(SUM(${LINE_REVENUE}), 0)::float8 AS revenue
    FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId" JOIN bm ON bm.id = s.id
    ${LINE_COST_JOINS}
    WHERE ${where} AND ${LINE_NO_COST} AND ${KEPT_QTY} > 0`;
  return { products: n(row?.products), lines: n(row?.lines), revenue: r2(n(row?.revenue)) };
}

/** Khata profit with the shop's basis and the headline it picks. Sent to the app as-is. */
export interface ProfitSplit extends CreditProfit {
  basis: ProfitBasis;
  /** Gross profit in the headline: `realised` ('PAID') or `billProfit` ('BILL'). */
  headline: number;
  /** Lines in scope sold with no cost (their sale counted as profit), when the caller looked them up. */
  noCost?: NoCostSales;
}

export const profitSplit = (c: CreditProfit, basis: ProfitBasis, noCost?: NoCostSales): ProfitSplit =>
  ({ ...c, basis, headline: headlineGross(c, basis), ...(noCost && { noCost }) });

/** Khata profit split and other income for a window: what a screen adds to its own sale and expense figures. */
export async function profitParts(db: Db, scope: MathScope, r: MathRange): Promise<{ split: ProfitSplit; otherIncome: number; otherIncomeCount: number }> {
  const [credit, basis, income, bare] = await Promise.all([
    creditProfit(db, scope, r), profitBasis(db, scope.tenantId), otherIncome(db, scope, r), noCostSales(db, scope, r),
  ]);
  return { split: profitSplit(credit, basis, bare), otherIncome: income.amount, otherIncomeCount: income.count };
}

/* ───────────────────────── profit ───────────────────────── */

/**
 * Net profit = gross profit − expenses − stock write-off (loss − gain) + other
 * income. Pass the headline gross profit (headlineGross) for the shop's basis.
 */
export const netProfit = (grossProfit: number, expenses: number, writeOff: number, income = 0) => r2(grossProfit - expenses - writeOff + income);

export interface ProfitFigures {
  sales: SaleFigures;
  expenses: number;
  expenseCount: number;
  writeOffs: WriteOffs;
  otherIncome: number;
  otherIncomeCount: number;
  /** Khata profit split; `sales.grossProfit` equals `credit.billProfit`. */
  credit: CreditProfit;
  /** The same with the basis and headline, for the app. */
  split: ProfitSplit;
  basis: ProfitBasis;
  /** Gross profit in the headline: realised ('PAID') or bill profit ('BILL'). */
  grossProfit: number;
  /** Net profit on the headline gross profit. */
  netProfit: number;
  /** Net profit with every bill's whole profit on its bill day. */
  billNetProfit: number;
}

/** Sales, expenses, write-offs, other income, khata profit and net profit for a tenant, branch and window. */
export async function profitFigures(db: Db, scope: MathScope, r: MathRange): Promise<ProfitFigures> {
  const [sales, expenses, w, income, credit, basis, bare] = await Promise.all([
    saleFigures(db, scope, r), paidExpenses(db, scope, r), writeOffs(db, scope, r), otherIncome(db, scope, r),
    creditProfit(db, scope, r), profitBasis(db, scope.tenantId), noCostSales(db, scope, r),
  ]);
  const gross = headlineGross(credit, basis);
  return {
    sales, expenses: expenses.amount, expenseCount: expenses.count, writeOffs: w,
    otherIncome: income.amount, otherIncomeCount: income.count, credit, split: profitSplit(credit, basis, bare), basis, grossProfit: gross,
    netProfit: netProfit(gross, expenses.amount, w.net, income.amount),
    billNetProfit: netProfit(sales.grossProfit, expenses.amount, w.net, income.amount),
  };
}
