/**
 * Booking cart: turns what the booker picked (packs plus loose pieces per
 * product) into order lines, prices them with the copied server pricing,
 * and builds the sync payload and the WhatsApp text.
 */

import { priceOrder, type OrderLineInput, type PricedOrder } from '../../../lib/distribution/pricing';
import { creditStatus, type CreditStatus } from '../../../lib/distribution/credit';
import type { CustomerPricing } from './repo';
import type { CustomerRow, OrderLinePayload, OrderPayload } from './types';

export interface CartItem {
  productId: string;
  name: string;
  baseUnit: string;
  variantId: string | null;
  /** The pack chosen for `packQty` (e.g. Carton); null when the product has no pack. */
  packId: string | null;
  packName: string | null;
  packSize: number;
  packQty: number;
  /** Loose base units (pcs) on top of the packs. */
  pcsQty: number;
  /** Typed price per pack / per piece; used only with price_override. */
  packPrice?: number | null;
  pcsPrice?: number | null;
}

/** Order lines for the cart, in cart order: the pack line first, then loose pieces. */
export function cartLines(cart: CartItem[]): { line: OrderLineInput; item: number; loose: boolean }[] {
  const out: { line: OrderLineInput; item: number; loose: boolean }[] = [];
  cart.forEach((c, i) => {
    if (c.packId && c.packQty > 0) {
      out.push({ item: i, loose: false, line: { productId: c.productId, variantId: c.variantId, unitId: c.packId, qty: c.packQty, price: c.packPrice ?? null } });
    }
    if (c.pcsQty > 0) {
      out.push({ item: i, loose: true, line: { productId: c.productId, variantId: c.variantId, unitId: null, qty: c.pcsQty, price: c.pcsPrice ?? null } });
    }
  });
  return out;
}

export function priceCart(cart: CartItem[], pricing: CustomerPricing, canOverride: boolean): { priced: PricedOrder; map: ReturnType<typeof cartLines> } {
  const map = cartLines(cart);
  const priced = priceOrder(map.map((m) => m.line), pricing.catalog, {
    list: pricing.list, tier: pricing.tier, schemes: pricing.schemes, canOverride,
  });
  return { priced, map };
}

export function creditFor(customer: CustomerRow, orderTotal: number): CreditStatus | null {
  if (customer.balance == null) return null;
  return creditStatus({
    balance: customer.balance,
    creditLimit: customer.creditLimit ?? 0,
    creditDays: customer.creditDays,
    oldestDueAt: customer.oldestDueAt ? new Date(customer.oldestDueAt) : null,
    orderTotal,
  });
}

/** The CreateOrder body with documented fields only; prices are sent only when the booker may set them. */
export function orderPayload(input: {
  clientRef: string;
  customer: CustomerRow;
  cart: CartItem[];
  canOverride: boolean;
  note?: string;
  gps?: { latitude: number; longitude: number; accuracy: number | null } | null;
  bookedAt?: Date;
}): OrderPayload {
  const items: OrderLinePayload[] = cartLines(input.cart).map(({ line }) => {
    const l: OrderLinePayload = { productId: line.productId, qty: line.qty };
    if (line.variantId) l.variantId = line.variantId;
    if (line.unitId) l.unitId = line.unitId;
    if (input.canOverride && line.price != null && Number.isFinite(line.price)) l.price = line.price;
    return l;
  });
  const p: OrderPayload = { clientRef: input.clientRef, customerId: input.customer.id, items, bookedAt: (input.bookedAt ?? new Date()).toISOString() };
  if (input.customer.routeId) p.routeId = input.customer.routeId;
  if (input.gps) {
    p.latitude = input.gps.latitude;
    p.longitude = input.gps.longitude;
    if (input.gps.accuracy != null) p.gpsAccuracy = Math.round(input.gps.accuracy);
  }
  const note = input.note?.trim();
  if (note) p.note = note.slice(0, 500);
  return p;
}

const rs = (v: number) => `Rs ${Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const qty = (v: number) => String(Math.round(v * 10000) / 10000);

/** Plain-text order for WhatsApp. */
export function orderText(input: {
  business: string | null;
  customer: CustomerRow;
  cart: CartItem[];
  priced: PricedOrder;
  map: ReturnType<typeof cartLines>;
  productName: (id: string) => string;
  dayKey: string;
  number?: string | null;
}): string {
  const lines: string[] = [];
  if (input.business) lines.push(`*${input.business}*`);
  lines.push(`Order${input.number ? ` ${input.number}` : ''} — ${input.dayKey}`);
  lines.push(input.customer.businessName || input.customer.name);
  lines.push('');
  input.priced.lines.forEach((ln, i) => {
    const item = input.cart[input.map[ln.index]?.item ?? -1];
    const unit = ln.unitName ?? item?.baseUnit ?? 'pcs';
    lines.push(`${i + 1}. ${item?.name ?? input.productName(ln.productId)} — ${qty(ln.qty)} ${unit} x ${rs(ln.price)} = ${rs(ln.gross)}`);
    if (ln.schemeNote) lines.push(`   ${ln.schemeNote}`);
    if (ln.freeBaseQty > 0) {
      const freeName = ln.freeProductId ? input.productName(ln.freeProductId) : item?.name ?? '';
      lines.push(`   Free: ${qty(ln.freeBaseQty)} ${ln.freeProductId ? 'pcs' : item?.baseUnit ?? 'pcs'} ${freeName}`.trimEnd());
    }
  });
  lines.push('');
  if (input.priced.schemeDiscount > 0) lines.push(`Scheme discount: ${rs(input.priced.schemeDiscount)}`);
  lines.push(`Total: ${rs(input.priced.total)}`);
  lines.push('Final bill office se aayega.');
  return lines.join('\n');
}
