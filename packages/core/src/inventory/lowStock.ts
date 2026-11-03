/**
 * Low stock and reorder rules, the same as the API (inventory/low-stock):
 * status by the alert level and days of cover, how much to order to cover the
 * target days, and supplier order messages. Lets the app work out the list
 * from the phone's own data when offline.
 */

export type StockStatus = 'in' | 'low' | 'out';
export type LowFlag = 'out' | 'low' | 'soon' | 'expiry' | 'registration' | 'season';

export interface LowSettings { days: number; targetDays: number; soonDays: number; expiryDays: number }
export const LOW_DEFAULTS: LowSettings = { days: 30, targetDays: 30, soonDays: 7, expiryDays: 30 };

/** in / low / out by the alert level (at or under the level is low). */
export function stockStatus(stock: number | null | undefined, alert: number | null | undefined): StockStatus {
  const s = Number(stock) || 0;
  if (s <= 0) return 'out';
  if (s <= (Number(alert) || 0)) return 'low';
  return 'in';
}

/** Sold per day over the window. */
export const perDay = (sold: number, days: number) => (days > 0 ? Math.max(0, Number(sold) || 0) / days : 0);

/** Days the stock lasts at this rate; null when it is not selling. */
export const daysLeft = (stock: number, rate: number) => (rate > 0 ? Math.max(0, Number(stock) || 0) / rate : null);

/** First flag decides the status: out, then low, then "runs out soon". */
export function lowFlags(input: { stock: number; alert: number; rate: number; soonDays?: number; expiring?: boolean }): LowFlag[] {
  const flags: LowFlag[] = [];
  const left = daysLeft(input.stock, input.rate);
  if (input.stock <= 0) flags.push('out');
  else if (input.stock <= input.alert) flags.push('low');
  else if (left !== null && left <= (input.soonDays ?? LOW_DEFAULTS.soonDays)) flags.push('soon');
  if (input.expiring) flags.push('expiry');
  return flags;
}

/** Stock to hold: made goods cover about a day, bought goods the target days (at least the alert level). */
export function reorderTarget(input: { rate: number; alert: number; targetDays?: number; made?: boolean }): number {
  const { rate, alert } = input;
  if (input.made) return Math.max(alert, Math.ceil(rate));
  if (rate > 0) return Math.max(rate * (input.targetDays ?? LOW_DEFAULTS.targetDays), alert);
  return Math.max(alert * 2, 1);
}

/** Quantity to order: up to the target, minus stock and what is already ordered. Only for lines that need stock. */
export function suggestQty(input: { stock: number; target: number; onOrder?: number; flags: ReadonlyArray<LowFlag> }): number {
  const needs = input.flags.includes('out') || input.flags.includes('low') || input.flags.includes('soon') || input.flags.includes('season');
  if (!needs) return 0;
  return Math.max(0, Math.ceil(input.target - Math.max(0, input.stock) - (input.onOrder ?? 0)));
}

export interface OrderLine {
  shopId: string;
  shopName: string;
  name: string;
  unit: string;
  stock: number;
  alert: number;
  suggestQty: number;
  supplier: { id: string; name: string; phone?: string | null } | null;
}

export interface OrderGroup<L extends OrderLine = OrderLine> {
  key: string;
  shopId: string;
  shopName: string;
  supplier: L['supplier'];
  rows: L[];
}

/** One order per supplier and branch; lines without a supplier go last. */
export function groupBySupplier<L extends OrderLine>(rows: ReadonlyArray<L>): Array<OrderGroup<L>> {
  const m = new Map<string, OrderGroup<L>>();
  for (const r of rows) {
    const key = `${r.shopId}:${r.supplier?.id ?? 'none'}`;
    const g: OrderGroup<L> = m.get(key) ?? { key, shopId: r.shopId, shopName: r.shopName, supplier: r.supplier, rows: [] as L[] };
    g.rows.push(r);
    m.set(key, g);
  }
  return [...m.values()].sort((a, b) => Number(!a.supplier) - Number(!b.supplier)
    || (a.supplier?.name ?? '').localeCompare(b.supplier?.name ?? '') || a.shopName.localeCompare(b.shopName));
}

const q2 = (v: number) => String(Number(v.toFixed(2)));

/**
 * WhatsApp order for a supplier. Sent in Roman Urdu (the shop's message
 * language on the web too); `qtyOf` passes edited quantities.
 */
export function orderMessage<L extends OrderLine>(g: OrderGroup<L>, shop: string, qtyOf: (r: L) => number = (r) => r.suggestQty): string {
  const lines = g.rows.filter((r) => qtyOf(r) > 0).map((r, i) => `${i + 1}. ${r.name} — ${q2(qtyOf(r))} ${r.unit}`);
  return [
    `Assalam-o-Alaikum${g.supplier ? ` ${g.supplier.name}` : ''},`,
    '',
    `${shop} ke liye ye maal bhej dein:`,
    '',
    ...lines,
    '',
    'Rate aur pohanchne ka din bata dein. Shukriya',
  ].join('\n');
}

/** Short reminder for one item. */
export function itemMessage(r: OrderLine, shop: string): string {
  const need = r.suggestQty > 0 ? r.suggestQty : Math.max(r.alert - r.stock, 1);
  return [
    `Assalam-o-Alaikum${r.supplier ? ` ${r.supplier.name}` : ''},`,
    '',
    `${r.name} ${r.stock <= 0 ? 'khatam ho gaya hai' : `sirf ${q2(r.stock)} ${r.unit} bacha hai`}.`,
    `${q2(need)} ${r.unit} bhej dein.`,
    '',
    `Shukriya — ${shop}`,
  ].join('\n');
}

/** wa.me link for a Pakistani number (0300… or +92…); without a usable number it opens the chat picker. */
export function whatsappLink(phone: string | null | undefined, text: string): string {
  const digits = String(phone ?? '').replace(/\D/g, '');
  const intl = digits.startsWith('92') ? digits : digits.startsWith('0') ? `92${digits.slice(1)}` : digits;
  const base = intl.length >= 11 ? `https://wa.me/${intl}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(text)}`;
}
