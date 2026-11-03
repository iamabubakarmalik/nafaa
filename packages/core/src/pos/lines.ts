/**
 * Bill lines: adding an item (merging with an equal line), quantity and rate
 * changes, combos, and turning the bill into the items POST /sales takes.
 * Pure functions: each returns the new lines and, when it refused, why.
 */

import { packNote, qtyStep } from './units';
import { tierPrice, tierSrcFor } from './tiers';
import type { PosCartLine, PosComboPart, PosComboSerial, PosUnitOption, PriceTier, SaleItemBody, ServiceChargeItem } from './types';

let seq = 0;
const rid = () => `${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const posLineId = () => `l-${rid()}`;
export const posHeldId = () => `h-${rid()}`;

/** Unlimited stock for a line (oversell allowed, services, made on sale). */
export const NO_LIMIT = Number.MAX_SAFE_INTEGER;

export interface AddItemInput {
  product: { id: string; name: string; unit: string; image?: string | null; wholesalePrice?: number | null; creditPrice?: number | null };
  unit: PosUnitOption;
  qty: number;
  /** Most base units that may be sold (NO_LIMIT when stock is not checked). */
  limit: number;
  tier: PriceTier;
  variant?: { id: string; name: string; price?: number | null; wholesalePrice?: number | null; creditPrice?: number | null };
  /** A rate fixed by the caller (an industry price); otherwise the tier prices the line. */
  price?: number;
  serial?: { id: string; serialNumber: string; imei?: string | null };
  imei?: { id: string; imei1: string; imei2?: string | null };
  warrantyMonths?: number;
  note?: string;
  /** Sold although stock is zero; noted on the line. */
  oversell?: boolean;
  /** Always a line of its own. */
  separate?: boolean;
  batchId?: string;
  batchNumber?: string;
}

export type AddResult =
  | { ok: true; lines: PosCartLine[]; lineId: string; merged: boolean }
  | { ok: false; reason: 'stock'; available: number }
  | { ok: false; reason: 'duplicate' };

/** Puts an item on the bill; an equal line (same unit, rate, tier, variant) grows instead. */
export function addItemLine(lines: PosCartLine[], a: AddItemInput): AddResult {
  const single = !!(a.serial || a.imei || a.separate);
  const qty = a.imei ? 1 : a.qty;
  const limit = a.imei ? 1 : a.limit;
  const baseQty = qty * a.unit.conversionRate;
  const fixed = a.price != null && a.unit.conversionRate === 1;
  const src = fixed ? undefined : tierSrcFor(a.product, a.unit, a.variant);
  const price = fixed ? Number(a.price) : tierPrice(src!, a.tier);
  if (a.imei && lines.some((l) => l.imeiId === a.imei!.id)) return { ok: false, reason: 'duplicate' };
  const existing = !single && lines.find((l) =>
    l.productId === a.product.id && l.unitName === a.unit.unitName && !l.dist?.free
    && (l.dist ? !l.priceEdited : l.unitPrice === price && (l.priceTier ?? 'RETAIL') === a.tier)
    && (l.variantId ?? '') === (a.variant?.id ?? '') && !l.serialId && !l.imeiId && (l.batchId ?? '') === (a.batchId ?? ''));
  if (existing) {
    const nq = Number((existing.quantity + qty).toFixed(3));
    const nb = nq * a.unit.conversionRate;
    if (nb > existing.baseStock) return { ok: false, reason: 'stock', available: existing.baseStock };
    return {
      ok: true, merged: true, lineId: existing.id,
      lines: lines.map((l) => (l.id === existing.id ? { ...l, quantity: nq, baseQuantity: nb, lineTotal: nq * l.unitPrice } : l)),
    };
  }
  if (baseQty > limit) return { ok: false, reason: 'stock', available: Math.max(limit, 0) };
  const id = posLineId();
  const notes = [
    packNote(qty, a.unit, a.product.unit),
    a.serial ? `S/N: ${a.serial.serialNumber}${a.serial.imei ? ` · IMEI: ${a.serial.imei}` : ''}` : '',
    a.imei ? `IMEI: ${a.imei.imei1}${a.imei.imei2 ? ` / ${a.imei.imei2}` : ''}` : '',
    // Saved with the sale; the same text in every language.
    a.oversell ? 'Stock chadhe bagair becha' : '',
    a.note ?? '',
  ].filter(Boolean);
  const line: PosCartLine = {
    id, type: 'product', productId: a.product.id, name: a.product.name, image: a.product.image ?? undefined,
    unitName: a.unit.unitName, unitLabel: a.unit.label, emoji: a.unit.emoji,
    unitPrice: price, basePrice: price,
    quantity: qty, baseQuantity: baseQty, conversionRate: a.unit.conversionRate, baseUnit: a.product.unit, baseStock: limit,
    lineTotal: qty * price, note: notes.join(' • ') || undefined,
    variantId: a.variant?.id, variantName: a.variant?.name,
    serialId: a.serial?.id, serialNumber: a.serial?.serialNumber, imei: a.imei?.imei1 ?? a.serial?.imei ?? undefined,
    imeiId: a.imei?.id, warrantyMonths: a.warrantyMonths, lockQty: single,
    batchId: a.batchId, batchNumber: a.batchNumber,
    priceTier: a.tier, tierSrc: src, fixedPrice: fixed || undefined,
  };
  return { ok: true, merged: false, lineId: id, lines: [...lines, line] };
}

export interface ComboInput {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  savings?: number;
  items: PosComboPart[];
}

/** Puts a combo on the bill as one line (split into its products when sent). */
export function addComboLine(lines: PosCartLine[], b: ComboInput, qty = 1, serials?: PosComboSerial[]): { lines: PosCartLine[]; lineId: string; merged: boolean } {
  const picked = serials?.length ? serials : undefined;
  const existing = !picked && lines.find((l) => l.comboId === b.id && !l.comboSerials);
  if (existing) {
    return {
      merged: true, lineId: existing.id,
      lines: lines.map((l) => (l.id === existing.id ? { ...l, quantity: l.quantity + qty, baseQuantity: l.quantity + qty, lineTotal: (l.quantity + qty) * l.unitPrice } : l)),
    };
  }
  const id = posLineId();
  return {
    merged: false, lineId: id,
    lines: [...lines, {
      id, type: 'combo', comboId: b.id, name: b.name, image: b.image ?? undefined,
      unitName: 'combo', unitLabel: 'COMBO', emoji: '🎁',
      unitPrice: b.price, basePrice: b.price, quantity: qty, baseQuantity: qty, conversionRate: 1, baseUnit: 'combo', baseStock: 9999,
      lineTotal: qty * b.price, comboItems: b.items, savings: b.savings ?? 0,
      comboSerials: picked, lockQty: !!picked,
      note: (picked ?? []).map((s) => `S/N: ${s.serialNumber}${s.imei ? ` · IMEI: ${s.imei}` : ''}`).join(' • ') || undefined,
    }],
  };
}

export type QtyResult = { ok: true; lines: PosCartLine[] } | { ok: false; reason: 'locked' | 'stock'; available?: number };

/** One step up or down (0.25 kg, 50 g, 1 piece); at zero the line goes. */
export function stepLine(lines: PosCartLine[], id: string, delta: number): QtyResult {
  const l = lines.find((x) => x.id === id);
  if (!l) return { ok: true, lines };
  return setLineQty(lines, id, Number((l.quantity + delta * qtyStep(l.unitName)).toFixed(3)));
}

/** A new quantity for a line; zero or less removes it. */
export function setLineQty(lines: PosCartLine[], id: string, qty: number): QtyResult {
  const l = lines.find((x) => x.id === id);
  if (!l) return { ok: true, lines };
  if (qty <= 0) return { ok: true, lines: lines.filter((x) => x.id !== id) };
  if (l.lockQty && qty > l.quantity) return { ok: false, reason: 'locked' };
  const nb = qty * l.conversionRate;
  if (l.type === 'product' && nb > l.baseStock) return { ok: false, reason: 'stock', available: l.baseStock };
  return { ok: true, lines: lines.map((x) => (x.id === id ? { ...x, quantity: qty, baseQuantity: l.type === 'combo' ? qty : nb, lineTotal: qty * x.unitPrice } : x)) };
}

/** A rate typed for one line; marked edited when it differs from the normal rate. */
export function setLinePrice(lines: PosCartLine[], id: string, price: number): PosCartLine[] {
  const p = Math.max(Number(price) || 0, 0);
  return lines.map((l) => (l.id === id ? { ...l, unitPrice: p, lineTotal: l.quantity * p, priceEdited: Math.abs(p - (Number(l.basePrice) || 0)) > 0.001 } : l));
}

/** Rupees off one line: lowers its rate (same as the web's price edit; counts toward the discount limit). */
export function setLineDiscount(lines: PosCartLine[], id: string, rupees: number): PosCartLine[] {
  const l = lines.find((x) => x.id === id);
  if (!l || !(l.quantity > 0)) return lines;
  const off = Math.min(Math.max(rupees, 0), l.basePrice * l.quantity);
  return setLinePrice(lines, id, Number((l.basePrice - off / l.quantity).toFixed(4)));
}

export const setLineNote = (lines: PosCartLine[], id: string, note: string) =>
  lines.map((l) => (l.id === id ? { ...l, customNote: note.trim() || undefined } : l));

/** One line at its own tier (a fixed or untiered line keeps its rate). */
export function setLineTier(lines: PosCartLine[], id: string, tier: PriceTier, billTier: PriceTier): PosCartLine[] {
  return lines.map((l) => {
    if (l.id !== id || l.fixedPrice || !l.tierSrc) return l;
    const price = tierPrice(l.tierSrc, tier);
    return { ...l, priceTier: tier, tierLocked: tier !== billTier, priceEdited: false, unitPrice: price, basePrice: price, lineTotal: l.quantity * price };
  });
}

/** Base units of each product already on the bill (for stock shown on the cards). */
export function inCartBy(lines: PosCartLine[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of lines) {
    if (l.productId) m.set(l.productId, (m.get(l.productId) ?? 0) + l.baseQuantity);
    if (l.comboId) m.set(`combo:${l.comboId}`, (m.get(`combo:${l.comboId}`) ?? 0) + l.quantity);
  }
  return m;
}

/** A sale item with the name the offline receipt shows until the server answers. */
export type NamedSaleItem = SaleItemBody & { name?: string; variantName?: string };

/**
 * The bill as POST /sales items. Quantities are base units and
 * `priceOverride` is per base unit. A combo is spread over its products in
 * proportion to their normal prices; serial units picked for it leave as
 * lines of one.
 */
export function cartToSaleItems(lines: PosCartLine[]): NamedSaleItem[] {
  const items: NamedSaleItem[] = [];
  for (const l of lines) {
    if (l.type === 'combo' && l.comboItems) {
      const orig = l.comboItems.reduce((s, it) => s + Number(it.quantity || 0) * (Number(it.originalPrice) || 0), 0);
      const factor = orig > 0 ? l.unitPrice / orig : 1;
      const picks = [...(l.comboSerials ?? [])];
      for (const ci of l.comboItems) {
        const op = Number(ci.originalPrice) || 0;
        const dp = op * factor;
        // Saved with the sale; the same text in every language.
        const line: NamedSaleItem = { productId: ci.productId, variantId: ci.variantId || undefined, quantity: 0, priceOverride: Number.isFinite(dp) && dp > 0 ? dp : op, note: `Combo: ${l.name}` };
        let qty = Number(ci.quantity) * l.quantity;
        while (qty >= 1) {
          const at = picks.findIndex((p) => p.productId === ci.productId);
          if (at < 0) break;
          items.push({ ...line, quantity: 1, serialId: picks.splice(at, 1)[0].id });
          qty -= 1;
        }
        if (qty > 0) items.push({ ...line, quantity: qty });
      }
    } else if (l.productId) {
      items.push({
        productId: l.productId,
        variantId: l.variantId,
        quantity: l.baseQuantity,
        priceOverride: l.unitPrice / l.conversionRate,
        ...(l.priceTier && { priceTier: l.priceTier }),
        note: [l.note, l.customNote].filter(Boolean).join(' • ') || undefined,
        ...(l.serialId ? { serialId: l.serialId } : {}),
        ...(l.imeiId ? { imeiId: l.imeiId } : {}),
        ...(l.batchId ? { batchId: l.batchId } : {}),
        ...(l.conversionRate !== 1 || l.dist ? { unitName: l.unitName, unitQty: l.quantity, conversionRate: l.conversionRate } : {}),
        ...(l.dist?.schemeId && (l.dist.free || !l.priceEdited) ? { schemeId: l.dist.schemeId } : {}),
        name: l.name,
        variantName: l.variantName,
      });
    } else if (l.usedPhoneId) {
      items.push({ usedPhoneId: l.usedPhoneId, quantity: 1, priceOverride: l.unitPrice, note: l.note, name: l.name });
    }
  }
  return items;
}

/* ───────────── delivery ───────────── */

export interface DeliveryState {
  on: boolean;
  /** Charge taken from the customer. */
  charge: number;
  /** Paid to the rider; the shop's own cost. */
  riderCost: number;
  address: string;
  /** An outside rider collects the charge directly: printed only, not in the sale or drawer. */
  byRider?: boolean;
}

export const emptyDelivery = (byRider = false): DeliveryState => ({ on: false, charge: 0, riderCost: 0, address: '', byRider });

/** Amount added to the bill (nothing for an outside rider). */
export const deliveryAmount = (d: DeliveryState) => (d.on && !d.byRider ? Number(d.charge) || 0 : 0);
/** An outside rider's charge, printed on the bill only. */
export const deliveryRiderAmount = (d: DeliveryState) => (d.on && d.byRider ? Number(d.charge) || 0 : 0);

/** Delivery as a sale service charge; labels are saved as written (English) and translated where shown. */
export function deliveryCharge(d: DeliveryState): ServiceChargeItem | null {
  const rider = deliveryRiderAmount(d);
  if (rider > 0) return { type: 'DELIVERY', label: 'Delivery (rider)', amount: rider, passThrough: true, note: d.address || undefined };
  const amount = deliveryAmount(d);
  if (amount <= 0) return null;
  return { type: 'DELIVERY', label: 'Delivery', amount, cost: Number(d.riderCost) || 0, note: d.address || undefined };
}
