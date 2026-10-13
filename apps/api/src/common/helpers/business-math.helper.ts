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
 *   Write-offs      StockAdjustment.value: DAMAGE + LOSS + ADJUSTMENT_OUT −
 *                   ADJUSTMENT_IN. Approving a damage report writes such a
 *                   row, so DamageLog.netLoss is never added on top. Goods
 *                   taken back on a return as not fit to sell (StockMovement
 *                   DAMAGE carrying the return number) count with damage, at
 *                   the cost saved on the movement.
 *   Net profit      gross profit − expenses − write-offs. The P&L statement
 *                   also shows staff pay and kept booking advances as lines of
 *                   their own.
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

export type WriteOffKind = 'DAMAGE' | 'LOSS' | 'ADJUSTMENT_OUT' | 'ADJUSTMENT_IN' | 'RETURN_DAMAGE';
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
  /** damage + loss + countedShort − found. */
  net: number;
  count: number;
}

export const emptyWriteOffs = (): WriteOffs => foldWriteOffs([]);

export interface WriteOffOptions {
  /** Bucket key built from the row's time and branch columns. */
  key?: (at: Prisma.Sql, shop: Prisma.Sql) => Prisma.Sql;
  /** Extra filter on the product (alias `wp`). */
  product?: Prisma.Sql;
}

/** Write-off rows by kind (and by `key` when given). */
export function writeOffRows(db: Db, scope: MathScope, r: MathRange, o: WriteOffOptions = {}): Promise<WriteOffRow[]> {
  const keyA = o.key ? o.key(Prisma.sql`a."createdAt"`, Prisma.sql`a."shopId"`) : Prisma.sql`'all'::text`;
  const keyM = o.key ? o.key(Prisma.sql`m."createdAt"`, Prisma.sql`m."shopId"`) : Prisma.sql`'all'::text`;
  const product = o.product ? Prisma.sql`AND ${o.product}` : Prisma.empty;
  return db.$queryRaw<WriteOffRow[]>`
    SELECT w.k, w.kind, COALESCE(SUM(w.value), 0)::float8 AS value, COUNT(*)::int AS count
    FROM (
      SELECT ${keyA} AS k, a.type::text AS kind, a.value AS value
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
  return {
    damage: r2(damage), damageCount: c('DAMAGE') + c('RETURN_DAMAGE'),
    returnDamage: r2(v('RETURN_DAMAGE')), returnDamageCount: c('RETURN_DAMAGE'),
    loss: r2(loss), lossCount: c('LOSS'),
    countedShort: r2(short), countedShortCount: c('ADJUSTMENT_OUT'),
    found: r2(found), foundCount: c('ADJUSTMENT_IN'),
    net: r2(damage + loss + short - found),
    count: rows.reduce((s, x) => s + n(x.count), 0),
  };
}

export async function writeOffs(db: Db, scope: MathScope, r: MathRange, product?: Prisma.Sql): Promise<WriteOffs> {
  return foldWriteOffs(await writeOffRows(db, scope, r, { product }));
}

/* ───────────────────────── profit ───────────────────────── */

export const netProfit = (grossProfit: number, expenses: number, writeOff: number) => r2(grossProfit - expenses - writeOff);

export interface ProfitFigures {
  sales: SaleFigures;
  expenses: number;
  expenseCount: number;
  writeOffs: WriteOffs;
  netProfit: number;
}

/** Sales, expenses, write-offs and net profit for a tenant, branch and window. */
export async function profitFigures(db: Db, scope: MathScope, r: MathRange): Promise<ProfitFigures> {
  const [sales, expenses, w] = await Promise.all([saleFigures(db, scope, r), paidExpenses(db, scope, r), writeOffs(db, scope, r)]);
  return { sales, expenses: expenses.amount, expenseCount: expenses.count, writeOffs: w, netProfit: netProfit(sales.grossProfit, expenses.amount, w.net) };
}
