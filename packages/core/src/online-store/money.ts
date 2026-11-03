/**
 * Money on an online order: advances received, COD still to collect and who
 * keeps the delivery charge; COD settlement sheets; selling costs and true
 * profit. Same numbers as the API (order-money.ts, order-costs.ts).
 */

import type { CostKind, CostSource, OnlineOrder, OrderCosts, OrderMoney, OrderPaymentLink, PriceRule } from './types';
import { COST_KINDS } from './types';

const CLOSED = ['CANCELLED', 'REJECTED', 'RETURNED'];

/** Paid payment links and hand-recorded advances on the order. */
export function paidLinks(o: Pick<OnlineOrder, 'metadata'>): OrderPaymentLink[] {
  const links = ((o.metadata as { payments?: OrderPaymentLink[] } | null)?.payments ?? []) as OrderPaymentLink[];
  return links.filter((l) => l.status === 'PAID');
}

/** Open (not paid) payment links. */
export function openLinks(o: Pick<OnlineOrder, 'metadata'>): OrderPaymentLink[] {
  const links = ((o.metadata as { payments?: OrderPaymentLink[] } | null)?.payments ?? []) as OrderPaymentLink[];
  return links.filter((l) => l.provider !== 'MANUAL' && l.status !== 'PAID');
}

/** Advance, COD due and delivery mode; the API's own `money` when it sends one. */
export function moneyOf(o: OnlineOrder): OrderMoney {
  if (o.money) return o.money;
  const advance = paidLinks(o).reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const rider = Number((o.metadata as { riderDelivery?: number } | null)?.riderDelivery ?? 0) > 0;
  return {
    advance,
    codDue: o.paymentStatus === 'PAID' ? 0 : Math.max(0, Math.round(o.total - advance)),
    deliveryMode: rider ? 'RIDER' : o.deliveryFee > 0 ? 'CUSTOMER' : 'FREE',
    deliveryFee: o.deliveryFee,
  };
}

/** COD the courier collects, rounded as the booking sends it. */
export const codDue = (o: OnlineOrder) => Math.round(moneyOf(o).codDue);

/** An advance can be written while the order is open, unpaid and still has COD. */
export const canAddAdvance = (o: OnlineOrder) => !CLOSED.includes(o.orderStatus) && o.paymentStatus !== 'PAID' && moneyOf(o).codDue > 0;

/** Who pays the delivery can change only before the bill and booking. */
export function deliveryChoice(o: OnlineOrder): { show: boolean; locked: boolean } {
  const fee = moneyOf(o).originalFee ?? moneyOf(o).deliveryFee;
  const show = fee > 0 && !CLOSED.includes(o.orderStatus) && o.orderStatus !== 'DELIVERED' && !o.dispatchedAt;
  const locked = !!o.nafaaSaleId || o.orderStatus === 'ACCEPTING' || !!o.courierBooked;
  return { show, locked };
}

/** Selling cost lines worth showing (a value or a known source). */
export const shownCosts = (c: OrderCosts): CostKind[] => COST_KINDS.filter((k) => c[k].value > 0 || c[k].source !== 'NONE');

/** A cost typed or received for real (not the rate-card guess). */
export const isSavedCost = (s: CostSource) => s !== 'ESTIMATE' && s !== 'NONE';

/** Sum of the amounts of the picked rows. */
export const sumBy = <T>(rows: T[], pick: (r: T) => number) => rows.reduce((a, r) => a + (Number(pick(r)) || 0), 0);

/** Rows of a COD list whose CN or order number appears in pasted settlement text. */
export function matchSettlementText<T extends { trackingNumber?: string | null; externalOrderNumber?: string | null; externalOrderId: string }>(rows: T[], text: string): T[] {
  const tokens = new Set(text.split(/[\s,;|\t]+/).map((x) => x.trim().replace(/^#/, '').toLowerCase()).filter((x) => x.length >= 3));
  return rows.filter((o) => (o.trackingNumber && tokens.has(o.trackingNumber.toLowerCase()))
    || tokens.has(String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#/, '').toLowerCase()));
}

/** Same math as the API (channel-price.ts): the channel price from the Nafaa price and the rule. */
export function applyRule(base: number, rule: PriceRule): number {
  if (!(base > 0)) return 0;
  let p = base;
  if (rule.mode === 'PERCENT') p = base * (1 + rule.value / 100);
  else if (rule.mode === 'FIXED') p = base + rule.value;
  if (p <= 0) return 0;
  if (rule.rounding === 'NEAREST_10') return Math.max(10, Math.round(p / 10) * 10);
  if (rule.rounding === 'END_9') { const r = Math.round(p / 10) * 10 - 1; return r > 0 ? r : Math.round(p); }
  return Math.round(p * 100) / 100;
}

/** RTO tone for a percentage: good under 10, watch 10–19, bad 20 and above. */
export const rtoTone = (pct: number, warnAt = 10, badAt = 20): 'success' | 'warning' | 'danger' => (pct >= badAt ? 'danger' : pct >= warnAt ? 'warning' : 'success');

/** Percentage change (null without a previous value). */
export const change = (now: number, before: number) => (before ? Math.round(((now - before) / before) * 100) : null);
