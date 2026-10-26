/**
 * Sales split by price tier (Retail, Wholesale, Credit) for reports.
 *
 * The split follows business-math.helper so the three tiers always add up to
 * the headline figures of the same bills:
 *   - A line's tier is SaleItem.priceTier; null and unknown values are retail.
 *   - Line value is the line total (line discount already inside) after its
 *     share of the bill discount (LINE_NET, k = (subtotal − discount) ÷ Σ line
 *     totals, i.e. the bill discount is spread in proportion to line totals);
 *     net value also takes off the line's refunds (LINE_REVENUE). Cost is the
 *     kept quantity at the line's cost (LINE_COST).
 *   - Whatever a bill holds beyond its lines (service charges, tax, rounding,
 *     the cost kept on the bill only, a refund not tied to a line) is shared
 *     out across the bill's tiers in proportion to their line totals, or
 *     evenly when the lines total zero. A bill with no lines counts as retail.
 *   - A bill whose lines are all one tier goes to that tier whole, so only
 *     bills mixing tiers need sharing out; those come back one row per bill
 *     and tier, and are shared out here (allocateTierRows).
 *   - Bills per tier count the bills holding at least one line of that tier,
 *     so a mixed bill counts once in each of its tiers.
 *   - Each tier is rounded to paisa; when the caller passes the headline
 *     figures, a rounding difference of a few paisa goes to the largest tier.
 */

import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BILL_NET, KEPT_QTY, LINE_COST, LINE_COST_JOINS, LINE_NET, LINE_REVENUE, billMathCte } from './business-math.helper';
import { PRICE_TIERS, PRICE_TIER_LABELS, tierOf, type PriceTier } from './price-tier.helper';

type Db = Prisma.TransactionClient;

/**
 * One row from the split query. Rows with `saleId` null are whole bills of a
 * single tier, already summed. Rows with a `saleId` are one tier of a bill
 * that mixes tiers: line figures plus the bill's own figures to share out.
 */
export interface TierSplitRow {
  tier: string | null;
  saleId: string | null;
  bills: number;
  qty: number;
  /** Bill value before returns (full-value day-close footing). */
  gross: number;
  /** Value after returns (sales and profit footing). */
  net: number;
  cost: number;
  /** Σ line totals, the sharing-out weight (mixed-bill rows only). */
  weight?: number | null;
  billGross?: number | null;
  billNet?: number | null;
  billCost?: number | null;
}

export interface TierFigures {
  tier: PriceTier;
  label: string;
  bills: number;
  qty: number;
  gross: number;
  net: number;
  cost: number;
  profit: number;
  /** Profit ÷ net sale, in percent. */
  margin: number;
}

export interface TierSplit {
  /** True when any line in the window was sold at a wholesale or credit price. */
  mixed: boolean;
  /** Always the three tiers, in the order Retail, Wholesale, Credit. */
  tiers: TierFigures[];
}

/** Headline figures the tiers should add up to (rounded). */
export interface TierTarget {
  gross?: number;
  net?: number;
  cost?: number;
}

const num = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;
/** Largest rounding gap closed against the headline; anything bigger is left visible. */
const MAX_ROUNDING_GAP = 0.05;

type Sum = { bills: number; qty: number; gross: number; net: number; cost: number };
const emptySums = (): Record<PriceTier, Sum> =>
  Object.fromEntries(PRICE_TIERS.map((t) => [t, { bills: 0, qty: 0, gross: 0, net: 0, cost: 0 }])) as Record<PriceTier, Sum>;

/**
 * Sums split rows per tier, sharing out what each mixed bill holds beyond its
 * lines. Returns unrounded sums.
 */
export function allocateTierRows(rows: TierSplitRow[]): Record<PriceTier, Sum> {
  const sums = emptySums();
  const mixed = new Map<string, TierSplitRow[]>();
  for (const r of rows) {
    if (r.saleId) {
      const list = mixed.get(r.saleId) ?? [];
      list.push(r);
      mixed.set(r.saleId, list);
      continue;
    }
    const s = sums[tierOf(r.tier)];
    s.bills += num(r.bills); s.qty += num(r.qty); s.gross += num(r.gross); s.net += num(r.net); s.cost += num(r.cost);
  }
  for (const parts of mixed.values()) {
    const head = parts[0];
    const lineGross = parts.reduce((a, p) => a + num(p.gross), 0);
    const lineNet = parts.reduce((a, p) => a + num(p.net), 0);
    const lineCost = parts.reduce((a, p) => a + num(p.cost), 0);
    const weight = parts.reduce((a, p) => a + Math.max(0, num(p.weight)), 0);
    const rest = {
      gross: num(head.billGross) - lineGross,
      net: num(head.billNet) - lineNet,
      cost: num(head.billCost) - lineCost,
    };
    for (const p of parts) {
      const share = weight > 0 ? Math.max(0, num(p.weight)) / weight : 1 / parts.length;
      const s = sums[tierOf(p.tier)];
      s.bills += 1;
      s.qty += num(p.qty);
      s.gross += num(p.gross) + rest.gross * share;
      s.net += num(p.net) + rest.net * share;
      s.cost += num(p.cost) + rest.cost * share;
    }
  }
  return sums;
}

/** Puts a small rounding gap against the headline on the largest tier. */
function closeGap(tiers: TierFigures[], key: 'gross' | 'net' | 'cost', target: number | undefined) {
  if (target == null) return;
  const gap = r2(target - tiers.reduce((a, t) => a + t[key], 0));
  if (!gap || Math.abs(gap) > MAX_ROUNDING_GAP) return;
  const big = tiers.reduce((a, t) => (Math.abs(t[key]) > Math.abs(a[key]) ? t : a), tiers[0]);
  big[key] = r2(big[key] + gap);
}

/** Rounded per-tier figures from split rows, matched to the headline when given. */
export function foldTierSplit(rows: TierSplitRow[], target: TierTarget = {}): TierSplit {
  const sums = allocateTierRows(rows);
  const tiers: TierFigures[] = PRICE_TIERS.map((tier) => {
    const s = sums[tier];
    return { tier, label: PRICE_TIER_LABELS[tier], bills: s.bills, qty: r2(s.qty), gross: r2(s.gross), net: r2(s.net), cost: r2(s.cost), profit: 0, margin: 0 };
  });
  closeGap(tiers, 'gross', target.gross);
  closeGap(tiers, 'net', target.net);
  closeGap(tiers, 'cost', target.cost);
  for (const t of tiers) {
    t.profit = r2(t.net - t.cost);
    t.margin = t.net > 0 ? r2((t.profit / t.net) * 100) : 0;
  }
  return { mixed: tiers.some((t) => t.tier !== 'RETAIL' && t.bills > 0), tiers };
}

/** Tier of a sale line in SQL (alias `si`); anything but WHOLESALE or CREDIT is retail. */
const LINE_TIER = Prisma.sql`(CASE WHEN si."priceTier" IN ('WHOLESALE', 'CREDIT') THEN si."priceTier" ELSE 'RETAIL' END)`;

/**
 * Split rows for the live bills in `where` (alias `s`): one summed row per
 * tier for single-tier bills, one row per bill and tier for mixed bills.
 */
export function tierSplitRows(db: Db, where: Prisma.Sql): Promise<TierSplitRow[]> {
  return db.$queryRaw<TierSplitRow[]>`
    WITH ${billMathCte(where)},
    lt AS (
      SELECT s.id, ${LINE_TIER} AS tier,
        SUM(${KEPT_QTY}) AS qty, SUM(${LINE_NET}) AS gross, SUM(${LINE_REVENUE}) AS net,
        SUM(${LINE_COST}) AS cost, SUM(si.total) AS weight
      FROM "Sale" s JOIN bm ON bm.id = s.id JOIN "SaleItem" si ON si."saleId" = s.id
      ${LINE_COST_JOINS}
      WHERE ${where}
      GROUP BY 1, 2),
    bt AS (SELECT id, COUNT(*) AS tiers, MIN(tier) AS tier FROM lt GROUP BY 1)
    SELECT COALESCE(bt.tier, 'RETAIL') AS tier, NULL::text AS "saleId", COUNT(*)::int AS bills,
      COALESCE(SUM(lt.qty), 0)::float8 AS qty, COALESCE(SUM(s.total), 0)::float8 AS gross,
      COALESCE(SUM(${BILL_NET}), 0)::float8 AS net, COALESCE(SUM(bm.cost), 0)::float8 AS cost,
      NULL::float8 AS weight, NULL::float8 AS "billGross", NULL::float8 AS "billNet", NULL::float8 AS "billCost"
    FROM "Sale" s JOIN bm ON bm.id = s.id LEFT JOIN bt ON bt.id = s.id LEFT JOIN lt ON lt.id = s.id
    WHERE ${where} AND COALESCE(bt.tiers, 1) = 1
    GROUP BY 1
    UNION ALL
    SELECT lt.tier, lt.id AS "saleId", 1 AS bills,
      lt.qty::float8, lt.gross::float8, lt.net::float8, lt.cost::float8, lt.weight::float8,
      s.total::float8 AS "billGross", (${BILL_NET})::float8 AS "billNet", bm.cost::float8 AS "billCost"
    FROM lt JOIN bt ON bt.id = lt.id AND bt.tiers > 1
    JOIN "Sale" s ON s.id = lt.id JOIN bm ON bm.id = s.id`;
}

const logger = new Logger('PriceTierSplit');

/**
 * Split rows, or null when the query fails (for example before the
 * price-tier migration has run), so a report still loads without the split.
 */
export async function tierSplitRowsSafe(db: Db, where: Prisma.Sql): Promise<TierSplitRow[] | null> {
  try {
    return await tierSplitRows(db, where);
  } catch (e) {
    logger.warn(`Price tier split skipped: ${(e as Error).message}`);
    return null;
  }
}

/** Per-tier figures for the live bills in `where`; null when the split could not be read. */
export async function tierSplit(db: Db, where: Prisma.Sql, target: TierTarget = {}): Promise<TierSplit | null> {
  const rows = await tierSplitRowsSafe(db, where);
  return rows && foldTierSplit(rows, target);
}
