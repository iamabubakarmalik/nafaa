/**
 * Pure helpers of the commerce growth screens: the profit waterfall, cash
 * received against COD still out, COD age and settlement forecast, matching
 * abandoned checkouts to later orders, WhatsApp message templates and the
 * custom website's abandoned-checkout payload. No database access, so the
 * service and the tests use the same numbers.
 */

import { phoneKey } from './customer-risk';
import { r2 } from './order-costs';

// ─── Profit waterfall ───────────────────────────────────────────

export interface WaterfallInput {
  /** What customers paid: goods sold plus delivery collected. */
  sales: number;
  productCost: number;
  /** Every selling cost of the period's orders (courier, COD fee, gateway, packaging, RTO). */
  sellingCosts: number;
  /** The part of `sellingCosts` spent on parcels that came back. */
  returnCosts: number;
  ads: number;
  otherExpenses: number;
}

export interface Waterfall {
  sales: number;
  productCost: number;
  ads: number;
  /** Selling costs of parcels the customer kept. */
  courier: number;
  /** Everything spent on parcels that came back. */
  returns: number;
  otherExpenses: number;
  grossProfit: number;
  net: number;
  /** Net as a % of sales; null without sales. */
  margin: number | null;
}

/** sales − product cost − ads − courier − returns − other expenses = net. */
export function profitWaterfall(i: WaterfallInput): Waterfall {
  const v = (n: number) => (Number.isFinite(n) ? n : 0);
  const sales = r2(v(i.sales));
  const productCost = r2(v(i.productCost));
  const returns = r2(Math.max(0, Math.min(v(i.returnCosts), v(i.sellingCosts))));
  const courier = r2(Math.max(0, v(i.sellingCosts) - returns));
  const ads = r2(Math.max(0, v(i.ads)));
  const otherExpenses = r2(Math.max(0, v(i.otherExpenses)));
  const grossProfit = r2(sales - productCost);
  const net = r2(grossProfit - ads - courier - returns - otherExpenses);
  return { sales, productCost, ads, courier, returns, otherExpenses, grossProfit, net, margin: sales > 0 ? Math.round((net / sales) * 1000) / 10 : null };
}

// ─── Cash on an order ───────────────────────────────────────────

export interface CashOrder {
  orderStatus: string;
  paymentStatus: string;
  isCod: boolean;
  /** What the shop gets from the order (total less an outside rider's delivery). */
  due: number;
  /** Advance already received (payment links and manual advances). */
  advance: number;
  hasBill: boolean;
  codSettled: boolean;
}

const CLOSED = ['CANCELLED', 'REJECTED', 'RETURNED'];

/** Money that reached the shop for an order, and COD still with the customer or courier. */
export function orderCash(o: CashOrder): { received: number; codOutstanding: number } {
  const advance = Math.max(0, o.advance);
  if (CLOSED.includes(o.orderStatus)) return { received: r2(advance), codOutstanding: 0 };
  if (o.paymentStatus === 'PAID' || o.codSettled) return { received: r2(Math.max(o.due, advance)), codOutstanding: 0 };
  const rest = Math.max(0, o.due - advance);
  return { received: r2(advance), codOutstanding: o.isCod && o.hasBill ? r2(rest) : 0 };
}

// ─── COD age and settlement forecast ────────────────────────────

export const AGE_BUCKETS = ['d0_7', 'd8_14', 'd15_30', 'd30p'] as const;
export type AgeBucket = (typeof AGE_BUCKETS)[number];

export function ageBucket(days: number): AgeBucket {
  if (days <= 7) return 'd0_7';
  if (days <= 14) return 'd8_14';
  if (days <= 30) return 'd15_30';
  return 'd30p';
}

/** Days a courier usually takes from delivery to paying the COD; `fallback` with fewer than 3 samples. */
export function settleDays(samples: number[], fallback = 7): number {
  const ok = samples.filter((d) => Number.isFinite(d) && d >= 0 && d < 120).sort((a, b) => a - b);
  if (ok.length < 3) return fallback;
  return Math.max(1, Math.round(ok[Math.floor(ok.length / 2)]));
}

export type ForecastWhen = 'overdue' | 'thisWeek' | 'later';

/** When a delivered parcel's COD should arrive, against `now`. */
export function forecastOf(deliveredAt: Date, days: number, now: Date): ForecastWhen {
  const expected = deliveredAt.getTime() + days * 86_400_000;
  if (expected < now.getTime() - 86_400_000) return 'overdue';
  if (expected <= now.getTime() + 7 * 86_400_000) return 'thisWeek';
  return 'later';
}

// ─── Abandoned checkout recovery ────────────────────────────────

export interface CartRef { id: string; phoneKey: string | null; email: string | null; abandonedAt: Date; completedAt?: Date | null }
export interface OrderRef { id: string; phoneKey: string | null; email: string | null; receivedAt: Date; total: number }
export interface Recovery { orderId: string | null; at: Date; value: number }

/** A later order this many days after the checkout still counts as recovered. */
export const RECOVERY_DAYS = 14;

const mail = (e?: string | null) => (e ? e.trim().toLowerCase() || null : null);

/**
 * Recovered carts: the first order from the same phone (or email) received
 * after the checkout was left and within RECOVERY_DAYS. A checkout the
 * channel itself reports as completed counts too, without an order link
 * when no order matches. Each order recovers at most one checkout (the
 * latest one before it).
 */
export function matchRecoveries(carts: CartRef[], orders: OrderRef[]): Map<string, Recovery> {
  const out = new Map<string, Recovery>();
  const sorted = [...orders].sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
  const used = new Set<string>();
  // Latest checkouts first, so an order goes to the cart just before it.
  for (const c of [...carts].sort((a, b) => b.abandonedAt.getTime() - a.abandonedAt.getTime())) {
    const start = c.abandonedAt.getTime();
    const end = start + RECOVERY_DAYS * 86_400_000;
    const email = mail(c.email);
    const hit = sorted.find((o) => !used.has(o.id)
      && o.receivedAt.getTime() > start && o.receivedAt.getTime() <= end
      && ((c.phoneKey && o.phoneKey === c.phoneKey) || (email && mail(o.email) === email)));
    if (hit) {
      used.add(hit.id);
      out.set(c.id, { orderId: hit.id, at: hit.receivedAt, value: r2(hit.total) });
    } else if (c.completedAt) {
      out.set(c.id, { orderId: null, at: c.completedAt, value: 0 });
    }
  }
  return out;
}

export interface WebsiteCheckout {
  externalId: string;
  name: string | null;
  customerName: string | null;
  customerPhone: string | null;
  phoneKey: string | null;
  customerEmail: string | null;
  customerCity: string | null;
  items: Array<{ name: string; quantity: number; price: number; sku: string | null; variant: string | null }>;
  total: number;
  currency: string | null;
  recoveryUrl: string | null;
  abandonedAt: Date;
}

const str = (v: unknown, max = 200) => {
  const s = typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '';
  return s ? s.slice(0, max) : null;
};
const amount = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? r2(Math.min(n, 100_000_000)) : 0;
};

/**
 * A custom website's abandoned checkout. Accepts `{ event: "checkout.abandoned", checkout: {...} }`
 * or the checkout object alone: id, customer {name, phone, email, city} (or flat fields),
 * items [{name, quantity, price, sku, variant}], total, currency, recovery_url, abandoned_at.
 */
export function parseWebsiteCheckout(body: unknown): WebsiteCheckout | null {
  const root = (body && typeof body === 'object' ? body : {}) as any;
  const c = (root.checkout && typeof root.checkout === 'object' ? root.checkout : root) as any;
  const externalId = str(c.id ?? c.checkout_id ?? c.token ?? c.cart_id, 120);
  if (!externalId) return null;
  const cust = (c.customer && typeof c.customer === 'object' ? c.customer : {}) as any;
  const phone = str(cust.phone ?? c.phone ?? c.customer_phone, 30);
  const items = (Array.isArray(c.items) ? c.items : Array.isArray(c.line_items) ? c.line_items : []).slice(0, 50).map((it: any) => ({
    name: str(it?.name ?? it?.title, 160) ?? 'Item',
    quantity: Math.max(1, Math.min(10_000, Math.round(Number(it?.quantity ?? it?.qty) || 1))),
    price: amount(it?.price),
    sku: str(it?.sku, 80),
    variant: str(it?.variant ?? it?.variant_title, 120),
  }));
  const at = new Date(c.abandoned_at ?? c.updated_at ?? c.created_at ?? Date.now());
  const total = c.total !== undefined ? amount(c.total) : r2(items.reduce((s: number, it: { price: number; quantity: number }) => s + it.price * it.quantity, 0));
  const url = str(c.recovery_url ?? c.recoveryUrl ?? c.cart_url, 1000);
  return {
    externalId,
    name: str(c.name ?? c.number, 60),
    customerName: str(cust.name ?? c.customer_name ?? [cust.first_name, cust.last_name].filter(Boolean).join(' '), 120),
    customerPhone: phone,
    phoneKey: phoneKey(phone),
    customerEmail: str(cust.email ?? c.email, 160),
    customerCity: str(cust.city ?? c.city, 80),
    items,
    total,
    currency: str(c.currency, 8),
    recoveryUrl: url && /^https?:\/\//i.test(url) ? url : null,
    abandonedAt: Number.isNaN(at.getTime()) || at.getTime() > Date.now() + 3_600_000 ? new Date() : at,
  };
}

// ─── WhatsApp templates ─────────────────────────────────────────

export const WA_TEMPLATE_KEYS = ['confirm', 'address', 'advance', 'dispatched', 'delivered', 'cart'] as const;
export type WaTemplateKey = (typeof WA_TEMPLATE_KEYS)[number];

/** The shop's own texts; a missing key means the app's default text. */
export function normalizeWaTemplates(raw: unknown): Partial<Record<WaTemplateKey, string>> {
  const src = (raw && typeof raw === 'object' ? (raw as any).templates ?? raw : {}) as Record<string, unknown>;
  const out: Partial<Record<WaTemplateKey, string>> = {};
  for (const k of WA_TEMPLATE_KEYS) {
    const v = src[k];
    if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 1000);
  }
  return out;
}
