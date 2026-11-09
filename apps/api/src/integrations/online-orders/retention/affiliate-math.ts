/**
 * Influencer and affiliate math: which affiliate an order belongs to (by the
 * discount code on the order, else by the link's utm_campaign tag), the
 * commission on a delivered order, a period statement and ROI.
 */

export type CommissionType = 'PERCENT' | 'FIXED';
export type AttributionSource = 'CODE' | 'UTM' | 'MANUAL';

export interface AffiliateRule {
  id: string;
  slug: string;
  codes: string[];
  commissionType: CommissionType;
  commissionValue: number;
  active?: boolean;
}

export interface OrderAttribution {
  discountCodes?: string[] | null;
  utmCampaign?: string | null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Codes are compared upper-case without spaces. */
export const normalizeCode = (c: unknown) => String(c ?? '').trim().toUpperCase().replace(/\s+/g, '').slice(0, 40);

/** Link tag: lower-case letters, digits and dashes. */
export function slugify(v: unknown): string {
  return String(v ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/**
 * The affiliate an order belongs to. A discount code wins over a link tag,
 * because the customer typed it on purpose. Inactive affiliates still match:
 * their old orders keep their owner.
 */
export function matchAffiliate(order: OrderAttribution, rules: AffiliateRule[]): { affiliateId: string; source: AttributionSource } | null {
  const codes = (order.discountCodes ?? []).map(normalizeCode).filter(Boolean);
  if (codes.length) {
    for (const rule of rules) {
      if (rule.codes.some((c) => codes.includes(normalizeCode(c)))) return { affiliateId: rule.id, source: 'CODE' };
    }
  }
  const tag = slugify(order.utmCampaign);
  if (tag) {
    const rule = rules.find((r) => r.slug === tag);
    if (rule) return { affiliateId: rule.id, source: 'UTM' };
  }
  return null;
}

/** Commission is paid on the goods, not on the delivery charge. */
export const commissionBase = (total: number, deliveryFee: number) => r2(Math.max(0, (Number(total) || 0) - (Number(deliveryFee) || 0)));

export function commissionFor(rule: Pick<AffiliateRule, 'commissionType' | 'commissionValue'>, base: number): number {
  const v = Math.max(0, Number(rule.commissionValue) || 0);
  if (rule.commissionType === 'FIXED') return r2(v);
  return r2((Math.max(0, base) * Math.min(v, 100)) / 100);
}

export interface StatementOrder {
  id: string;
  status: string;
  total: number;
  deliveryFee: number;
  /** Commission already frozen by a payout. */
  paidCommission?: number | null;
  paid: boolean;
}

export interface StatementTotals {
  orders: number;
  delivered: number;
  pending: number;
  returned: number;
  sales: number;
  commission: number;
  paid: number;
  due: number;
}

const CLOSED = ['CANCELLED', 'REJECTED', 'RETURNED'];

/** Delivered orders earn commission; open ones are shown as "on the way"; returned and cancelled earn nothing. */
export function statementOf(rule: Pick<AffiliateRule, 'commissionType' | 'commissionValue'>, orders: StatementOrder[]) {
  const t: StatementTotals = { orders: orders.length, delivered: 0, pending: 0, returned: 0, sales: 0, commission: 0, paid: 0, due: 0 };
  const lines = orders.map((o) => {
    const base = commissionBase(o.total, o.deliveryFee);
    let commission = 0;
    if (o.status === 'DELIVERED') {
      t.delivered++;
      t.sales += Number(o.total) || 0;
      commission = o.paid && o.paidCommission != null ? Number(o.paidCommission) : commissionFor(rule, base);
      t.commission += commission;
      if (o.paid) t.paid += commission;
      else t.due += commission;
    } else if (CLOSED.includes(o.status)) {
      if (o.status === 'RETURNED') t.returned++;
    } else {
      t.pending++;
    }
    return { ...o, base, commission: r2(commission) };
  });
  for (const k of ['sales', 'commission', 'paid', 'due'] as const) t[k] = r2(t[k]);
  return { lines, totals: t };
}

/** Rupees of delivered sales for each rupee paid; null before anything is paid or owed. */
export function roiOf(sales: number, cost: number): number | null {
  return cost > 0 ? Math.round((sales / cost) * 10) / 10 : null;
}
