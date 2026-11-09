/**
 * Marketing hub figures. Pure functions shared by the service and the tests.
 *
 * Orders are counted by outcome: an ad is judged on parcels that were
 * delivered, not on orders placed (cash on delivery returns are common).
 *
 *   ROAS              delivered sales ÷ spend
 *   cost per order    spend ÷ delivered orders
 *   CAC               spend ÷ new customers (first order from that phone, delivered)
 *   profit after ads  profit of the campaign's orders (after product cost and
 *                     selling costs, from online-economics) − spend
 *   ad fatigue        cost per placed order went up three days in a row
 *   budget moves      campaigns with ROAS below 1 hand their daily spend to
 *                     the best campaign with ROAS of 2 or more
 */

import { costPerOrder, r2, roas } from '../ads/ads-math';

export type OrderOutcome = 'DELIVERED' | 'RETURNED' | 'CANCELLED' | 'OPEN';

export function outcomeOf(orderStatus: string): OrderOutcome {
  const s = String(orderStatus ?? '').toUpperCase();
  if (s === 'DELIVERED') return 'DELIVERED';
  if (s === 'RETURNED') return 'RETURNED';
  if (s === 'CANCELLED' || s === 'REJECTED') return 'CANCELLED';
  return 'OPEN';
}

export interface Tally {
  spend: number;
  placed: number;
  delivered: number;
  returned: number;
  cancelled: number;
  open: number;
  placedSales: number;
  deliveredSales: number;
  /** Profit of the orders with a bill (delivered ones and returned ones' losses). */
  profit: number;
  newCustomers: number;
}

export const blankTally = (): Tally => ({ spend: 0, placed: 0, delivered: 0, returned: 0, cancelled: 0, open: 0, placedSales: 0, deliveredSales: 0, profit: 0, newCustomers: 0 });

export interface TallyOrder {
  outcome: OrderOutcome;
  total: number;
  /** Delivered sale from the bill (net of refunds), when known. */
  sale?: number | null;
  /** Profit after selling costs, when the order has a bill. */
  profit?: number | null;
  newCustomer?: boolean;
}

export function addOrder(t: Tally, o: TallyOrder) {
  t.placed += 1;
  t.placedSales += o.total;
  if (o.outcome === 'DELIVERED') {
    t.delivered += 1;
    t.deliveredSales += o.sale ?? o.total;
    if (o.newCustomer) t.newCustomers += 1;
  } else if (o.outcome === 'RETURNED') t.returned += 1;
  else if (o.outcome === 'CANCELLED') t.cancelled += 1;
  else t.open += 1;
  // Open orders' profit is not known yet; returned ones carry their loss.
  if ((o.outcome === 'DELIVERED' || o.outcome === 'RETURNED') && o.profit !== null && o.profit !== undefined) t.profit += o.profit;
}

export function finishTally(t: Tally, seesProfit: boolean) {
  const closed = t.delivered + t.returned;
  return {
    spend: r2(t.spend),
    placed: t.placed,
    delivered: t.delivered,
    returned: t.returned,
    cancelled: t.cancelled,
    open: t.open,
    placedSales: r2(t.placedSales),
    deliveredSales: r2(t.deliveredSales),
    deliveryRate: closed > 0 ? Math.round((t.delivered / closed) * 1000) / 10 : null,
    roas: roas(t.deliveredSales, t.spend),
    costPerOrder: costPerOrder(t.spend, t.delivered),
    newCustomers: t.newCustomers,
    cac: t.newCustomers > 0 && t.spend > 0 ? r2(t.spend / t.newCustomers) : null,
    profitBeforeAds: seesProfit ? r2(t.profit) : null,
    profitAfterAds: seesProfit ? r2(t.profit - t.spend) : null,
  };
}

export interface DayPoint { day: string; spend: number; orders: number }

/**
 * Ad fatigue: cost per placed order rose on each of the last three days with
 * spend. A day with spend and no order counts as its whole spend. Needs four
 * spend days; returns the points looked at when rising, else null.
 */
export function fatigueOf(days: DayPoint[]): { from: number; to: number; days: Array<{ day: string; cpo: number }> } | null {
  const live = [...days].filter((d) => d.spend > 0).sort((a, b) => a.day.localeCompare(b.day)).slice(-4);
  if (live.length < 4) return null;
  const pts = live.map((d) => ({ day: d.day, cpo: r2(d.orders > 0 ? d.spend / d.orders : d.spend) }));
  for (let i = 1; i < pts.length; i++) if (!(pts[i].cpo > pts[i - 1].cpo)) return null;
  return { from: pts[0].cpo, to: pts[pts.length - 1].cpo, days: pts };
}

export interface BudgetCampaign { key: string; name: string; spend: number; roas: number | null; spendDays: number; closed: number }

export interface BudgetMove {
  /** MOVE: shift the daily amount to `to`; CUT: no good campaign to move to, lower or pause. */
  kind: 'MOVE' | 'CUT';
  from: { key: string; name: string; roas: number | null };
  to: { key: string; name: string; roas: number | null } | null;
  /** Average daily spend of the weak campaign in the period. */
  dailyAmount: number;
}

/**
 * Budget suggestions. A campaign is judged once it has at least Rs 1,000
 * spend and 5 delivered-or-returned orders, or Rs 3,000 spend with no
 * delivery at all; weaker evidence gives no advice.
 */
export function budgetMoves(list: BudgetCampaign[], opts: { minSpend?: number; minClosed?: number } = {}): BudgetMove[] {
  const minSpend = opts.minSpend ?? 1000;
  const minClosed = opts.minClosed ?? 5;
  const judged = (c: BudgetCampaign) => c.spend >= minSpend && (c.closed >= minClosed || (c.spend >= minSpend * 3 && (c.roas ?? 0) === 0));
  const weak = list.filter((c) => judged(c) && (c.roas ?? 0) < 1).sort((a, b) => b.spend - a.spend);
  const strong = list.filter((c) => judged(c) && (c.roas ?? 0) >= 2).sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0));
  const best = strong[0] ?? null;
  return weak.map((w) => ({
    kind: best ? 'MOVE' : 'CUT',
    from: { key: w.key, name: w.name, roas: w.roas },
    to: best ? { key: best.key, name: best.name, roas: best.roas } : null,
    dailyAmount: r2(w.spend / Math.max(1, w.spendDays)),
  }));
}
