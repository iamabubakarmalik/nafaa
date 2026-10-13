/**
 * Bill money that sits outside the sale lines: service charges such as
 * delivery, wrapping or fitting (pass-through charges are never inside
 * Sale.serviceCharges), and the cost kept on the bill beyond its lines (a
 * rider's fare, older bills that saved cost on the bill only).
 *
 * Worked out per bill as the shared net and cost (business-math.helper)
 * less what its lines earned and cost, so line figures plus these always
 * equal the shared figures used by every other report.
 */

import { Prisma } from '@prisma/client';
import { LINE_COST, LINE_COST_JOINS, LINE_REVENUE, billMathCte } from '../../../common/helpers/business-math.helper';

type Db = Prisma.TransactionClient;

export interface BillChargeRow {
  k: string;
  /** Net bill money beyond line revenue. */
  revenue: number;
  /** Bill cost beyond line cost. */
  cost: number;
  /** Sum of Sale.serviceCharges as billed. */
  billed: number;
  /** Bills that carry service charges. */
  bills: number;
}

/**
 * Bill charges for the live bills in `where` (alias `s`), grouped by `key`
 * (one row keyed "all" when left out).
 */
export function billChargeRows(db: Db, where: Prisma.Sql, key: Prisma.Sql = Prisma.sql`'all'::text`): Promise<BillChargeRow[]> {
  return db.$queryRaw<BillChargeRow[]>`
    WITH ${billMathCte(where)},
    bl AS (
      SELECT si."saleId", COALESCE(SUM(${LINE_REVENUE}), 0) AS rev, COALESCE(SUM(${LINE_COST}), 0) AS cost
      FROM "SaleItem" si
      JOIN "Sale" s ON s.id = si."saleId"
      JOIN bm ON bm.id = s.id
      ${LINE_COST_JOINS}
      WHERE ${where}
      GROUP BY si."saleId")
    SELECT ${key} AS k,
      COALESCE(SUM(s.total - s."refundedAmount" - COALESCE(bl.rev, 0)), 0)::float8 AS revenue,
      COALESCE(SUM(bm.cost - COALESCE(bl.cost, 0)), 0)::float8 AS cost,
      COALESCE(SUM(s."serviceCharges"), 0)::float8 AS billed,
      (COUNT(*) FILTER (WHERE s."serviceCharges" > 0))::int AS bills
    FROM "Sale" s
    JOIN bm ON bm.id = s.id
    LEFT JOIN bl ON bl."saleId" = s.id
    WHERE ${where}
    GROUP BY 1`;
}

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** Totals of the rows, rounded; tiny rounding left-overs read as zero. */
export function sumBillCharges(rows: BillChargeRow[]) {
  const revenue = r2(rows.reduce((s, x) => s + Number(x.revenue || 0), 0));
  const cost = r2(rows.reduce((s, x) => s + Number(x.cost || 0), 0));
  return {
    revenue,
    cost,
    profit: r2(revenue - cost),
    billed: r2(rows.reduce((s, x) => s + Number(x.billed || 0), 0)),
    bills: rows.reduce((s, x) => s + Number(x.bills || 0), 0),
  };
}
