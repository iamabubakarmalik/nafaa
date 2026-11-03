/**
 * Cake and bulk orders: the status flow (next and previous step), money
 * (total, advance asked, balance) and the bill made at hand-over. Same rules
 * as apps/web/src/industries/bakery/components/meta.ts and OrderDeliverModal.
 */

export type BakeryOrderStatus = 'DRAFT' | 'QUOTED' | 'CONFIRMED' | 'DEPOSIT_PAID' | 'IN_PRODUCTION'
  | 'BAKING' | 'DECORATING' | 'QUALITY_CHECK' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
  | 'CANCELLED' | 'REFUNDED';

export const CLOSED_ORDER: ReadonlyArray<BakeryOrderStatus> = ['DELIVERED', 'CANCELLED', 'REFUNDED'];
export const isClosedOrder = (s?: string | null) => CLOSED_ORDER.includes(s as BakeryOrderStatus);

/** Pickup kinds that need no address. */
export const isDelivery = (t?: string | null) => !!t && !['SELF_PICKUP', 'PICKUP', 'DINE_IN'].includes(t);

/** The step a button moves to; 'DELIVER' means "make the bill and hand over". */
export type StepKey = 'quote' | 'confirm' | 'start' | 'decorate' | 'ready' | 'send' | 'deliver' | 'arrived';
export interface NextStep { to: BakeryOrderStatus | 'DELIVER'; step: StepKey }

export function cakeNext(o: { status: string; deliveryType?: string | null }): NextStep | null {
  switch (o.status) {
    case 'DRAFT':
    case 'QUOTED': return { to: 'CONFIRMED', step: 'confirm' };
    case 'CONFIRMED':
    case 'DEPOSIT_PAID': return { to: 'IN_PRODUCTION', step: 'start' };
    case 'IN_PRODUCTION':
    case 'BAKING': return { to: 'DECORATING', step: 'decorate' };
    case 'DECORATING':
    case 'QUALITY_CHECK': return { to: 'READY', step: 'ready' };
    case 'READY': return isDelivery(o.deliveryType) ? { to: 'OUT_FOR_DELIVERY', step: 'send' } : { to: 'DELIVER', step: 'deliver' };
    case 'OUT_FOR_DELIVERY': return { to: 'DELIVER', step: 'arrived' };
    default: return null;
  }
}

export const CAKE_PREV: Partial<Record<BakeryOrderStatus, BakeryOrderStatus>> = {
  CONFIRMED: 'DRAFT', DEPOSIT_PAID: 'CONFIRMED', IN_PRODUCTION: 'CONFIRMED', BAKING: 'IN_PRODUCTION',
  DECORATING: 'IN_PRODUCTION', QUALITY_CHECK: 'DECORATING', READY: 'DECORATING', OUT_FOR_DELIVERY: 'READY',
};

/** Visible steps of a cake order for the progress strip. */
export const CAKE_FLOW: BakeryOrderStatus[] = ['CONFIRMED', 'IN_PRODUCTION', 'DECORATING', 'READY', 'DELIVERED'];

export function flowIndex(s: string): number {
  const map: Partial<Record<BakeryOrderStatus, number>> = {
    DRAFT: -1, QUOTED: -1, CONFIRMED: 0, DEPOSIT_PAID: 0, IN_PRODUCTION: 1, BAKING: 1, DECORATING: 2, QUALITY_CHECK: 2,
    READY: 3, OUT_FOR_DELIVERY: 3, DELIVERED: 4,
  };
  return map[s as BakeryOrderStatus] ?? -1;
}

export function bulkNext(status: string): NextStep | null {
  switch (status) {
    case 'DRAFT': return { to: 'QUOTED', step: 'quote' };
    case 'QUOTED': return { to: 'CONFIRMED', step: 'confirm' };
    case 'CONFIRMED':
    case 'DEPOSIT_PAID': return { to: 'IN_PRODUCTION', step: 'start' };
    case 'IN_PRODUCTION':
    case 'BAKING':
    case 'DECORATING':
    case 'QUALITY_CHECK': return { to: 'READY', step: 'ready' };
    case 'READY':
    case 'OUT_FOR_DELIVERY': return { to: 'DELIVER', step: 'deliver' };
    default: return null;
  }
}

export const BULK_PREV: Partial<Record<BakeryOrderStatus, BakeryOrderStatus>> = {
  QUOTED: 'DRAFT', CONFIRMED: 'QUOTED', DEPOSIT_PAID: 'CONFIRMED', IN_PRODUCTION: 'CONFIRMED', READY: 'IN_PRODUCTION', OUT_FOR_DELIVERY: 'READY',
};

/* ───────────────────────── money ───────────────────────── */

export const r2 = (n: number) => Math.round(n * 100) / 100;

/** What is still owed on an order. */
export const dueOf = (o: { total: number; paidAmount: number }) => Math.max(r2(Number(o.total || 0) - Number(o.paidAmount || 0)), 0);

/** Bulk order price: the agreed final price, else the quote. */
export const bulkPrice = (o: { finalPrice?: number | null; quotedPrice: number }) => Number(o.finalPrice ?? o.quotedPrice ?? 0);

export interface CakePriceInput {
  basePrice: number;
  customizationCharges?: number;
  photoCakeCharges?: number;
  deliveryCharges?: number;
  taxAmount?: number;
  discount?: number;
  deliveryType?: string | null;
}

/** Cake order total: delivery charges count only when the order is delivered. */
export function cakeTotal(p: CakePriceInput): number {
  const n = (v?: number) => Number(v) || 0;
  return Math.max(r2(n(p.basePrice) + n(p.customizationCharges) + n(p.photoCakeCharges) + (isDelivery(p.deliveryType) ? n(p.deliveryCharges) : 0) + n(p.taxAmount) - n(p.discount)), 0);
}

/** Advance to ask for: what was typed, else half of the total. */
export const advanceAsk = (total: number, typed: number | null | undefined) => (typed == null ? Math.round(total * 0.5) : Number(typed) || 0);

/** Balance left at hand-over after what was received before and now. */
export const balanceAfter = (total: number, alreadyPaid: number, now = 0) => Math.max(r2(total - alreadyPaid - now), 0);

/** Advance still missing on a booked order (draft and quoted orders ask for none). */
export function advanceShort(o: { status: string; advanceRequired: number; paidAmount: number }) {
  if (isClosedOrder(o.status) || o.status === 'DRAFT' || o.status === 'QUOTED') return 0;
  return Math.max(r2(Number(o.advanceRequired || 0) - Number(o.paidAmount || 0)), 0);
}

/** Quick amounts for a payment: full, the missing advance, half. */
export function payChips(due: number, advanceLeft: number): Array<{ kind: 'full' | 'advance' | 'half'; value: number }> {
  const all = [
    { kind: 'full' as const, value: r2(due) },
    { kind: 'advance' as const, value: r2(Math.min(advanceLeft, due)) },
    { kind: 'half' as const, value: Math.round(due / 2) },
  ];
  return all.filter((c, i, a) => c.value > 0 && a.findIndex((x) => x.value === c.value) === i);
}

/* ───────────────────────── bill at hand-over ───────────────────────── */

export interface BillLine { productId?: string; qty: number; rate: number }

/**
 * The bill must equal the agreed order total: lines above it become a
 * discount; lines not linked to a product, and any shortfall, become an
 * extra charge on the bill.
 */
export function orderBill(lines: BillLine[], orderTotal: number) {
  const linesTotal = r2(lines.reduce((s, l) => s + l.qty * l.rate, 0));
  const unlinked = r2(lines.filter((l) => !l.productId).reduce((s, l) => s + l.qty * l.rate, 0));
  return {
    linesTotal,
    discount: Math.max(r2(linesTotal - orderTotal), 0),
    extra: r2(unlinked + Math.max(orderTotal - linesTotal, 0)),
    linked: lines.filter((l) => !!l.productId),
  };
}

/** Money received earlier: the part on the customer's khata, and older money paid outside it. */
export function heldMoney(paidAmount: number, khataPaid: number | null | undefined) {
  const paid = Number(paidAmount) || 0;
  const khata = Math.min(Number(khataPaid) || 0, paid);
  return { khata, legacy: r2(Math.max(paid - khata, 0)) };
}

/** Payment parts with the change given back taken off (cash first). */
export function netOfChange<P extends { method: string; amount: number }>(handed: P[], keep: number): P[] {
  let over = r2(handed.reduce((s, p) => s + p.amount, 0) - keep);
  const parts = handed.map((p) => ({ ...p }));
  for (const p of [...parts].sort((a, b) => (a.method === 'CASH' ? -1 : 0) - (b.method === 'CASH' ? -1 : 0))) {
    if (over <= 0) break;
    const take = Math.min(p.amount, over);
    p.amount = r2(p.amount - take);
    over = r2(over - take);
  }
  return parts.filter((p) => p.amount > 0);
}

/* ───────────────────────── time ───────────────────────── */

export const hoursTo = (iso?: string | null, now = Date.now()) => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : (t - now) / 3_600_000;
};

export type LeftKind = 'none' | 'minutesLate' | 'hoursLate' | 'daysLate' | 'minutes' | 'hours' | 'days';

/** "3 hours to go", "2 days late" as a kind and a number, for the screen to word. */
export function leftOf(h: number | null): { kind: LeftKind; value: number } {
  if (h === null) return { kind: 'none', value: 0 };
  if (h < 0) {
    const p = Math.abs(h);
    return p < 1 ? { kind: 'minutesLate', value: Math.round(p * 60) } : p < 24 ? { kind: 'hoursLate', value: Math.round(p) } : { kind: 'daysLate', value: Math.round(p / 24) };
  }
  if (h < 1) return { kind: 'minutes', value: Math.max(Math.round(h * 60), 1) };
  if (h < 24) return { kind: 'hours', value: Math.round(h) };
  return { kind: 'days', value: Math.round(h / 24) };
}

/* ───────────────────────── bulk lines ───────────────────────── */

export interface BulkLine { productId?: string; name: string; qty: number; rate: number; unit?: string }

export function bulkLines(items: unknown): BulkLine[] {
  return (Array.isArray(items) ? items : []).map((i: Record<string, unknown>) => ({
    productId: typeof i.productId === 'string' ? i.productId : undefined,
    name: String(i.name ?? i.productName ?? 'Cheez'),
    qty: Number(i.qty ?? i.quantity ?? 0) || 0,
    rate: Number(i.rate ?? i.price ?? 0) || 0,
    unit: typeof i.unit === 'string' ? i.unit : undefined,
  }));
}

/** What the kitchen has to make for open bulk orders, by product (or name). */
export function kitchenList(orders: Array<{ items: unknown; eventDate: string; orderNumber: string }>) {
  const map = new Map<string, { key: string; productId?: string; name: string; unit?: string; qty: number; orders: string[]; first: string }>();
  for (const o of orders) {
    for (const l of bulkLines(o.items)) {
      const key = l.productId ?? `name:${l.name.trim().toLowerCase()}`;
      const row = map.get(key) ?? { key, productId: l.productId, name: l.name, unit: l.unit, qty: 0, orders: [], first: o.eventDate };
      row.qty = Math.round((row.qty + l.qty) * 1000) / 1000;
      if (!row.orders.includes(o.orderNumber)) row.orders.push(o.orderNumber);
      if (o.eventDate < row.first) row.first = o.eventDate;
      map.set(key, row);
    }
  }
  return [...map.values()].sort((a, b) => a.first.localeCompare(b.first) || b.qty - a.qty);
}
