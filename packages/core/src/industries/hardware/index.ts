/**
 * Pure rules of the hardware pack (shared by web and mobile): quantity rates
 * (tiers), quotation money, slip units, challan quantities, project stages,
 * reorder severity and contractor credit aging. No labels here; screens
 * translate keys.
 */

export const r2 = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;
/** A quantity without trailing noise: 2.50 -> "2.5". */
export const qty = (n: unknown) => String(Number((Number(n) || 0).toFixed(3)));

/* ── Quantity rates ── */

export interface Tier { id: string; productId?: string; minQuantity: number; maxQuantity?: number | null; price: number; label?: string | null }

/** The rate tier that applies to a quantity (the highest minimum reached), or null. */
export function tierFor<T extends Tier>(tiers: T[] | undefined, quantity: number): T | null {
  let hit: T | null = null;
  for (const t of [...(tiers ?? [])].sort((a, b) => a.minQuantity - b.minQuantity)) {
    if (quantity >= t.minQuantity && (t.maxQuantity == null || quantity <= t.maxQuantity)) hit = t;
  }
  return hit;
}

/** Rate for a quantity: the tier price when it is cheaper than the base rate. */
export function rateFor(base: number, tiers: Tier[] | undefined, quantity: number): { price: number; tier: Tier | null } {
  const t = tierFor(tiers, quantity);
  return t && t.price < base ? { price: t.price, tier: t } : { price: base, tier: null };
}

/** The base rate for a mode: wholesale when set and positive, else retail. */
export const modeRate = (retail: number | undefined, wholesale: number | undefined, mode: 'retail' | 'wholesale') =>
  mode === 'wholesale' && wholesale && wholesale > 0 ? wholesale : retail ?? 0;

/** A bulk rate holds only while the line keeps the bulk quantity. Notes carry "Bulk rate 50+". */
const BULK_NOTE = /Bulk rate (\d+(?:\.\d+)?)\+/;
export function bulkBreak(lines: Array<{ name: string; note?: string; quantity: number }>): { name: string; min: number; quantity: number } | null {
  for (const l of lines) {
    const m = l.note?.match(BULK_NOTE);
    if (m && l.quantity < Number(m[1])) return { name: l.name, min: Number(m[1]), quantity: l.quantity };
  }
  return null;
}

/* ── Quotation money ── */

export interface QuoteLine { quantity: number; unitPrice: number; discount?: number }
export interface QuoteExtras { discount?: number; taxPct?: number; delivery?: number; labour?: number; other?: number }

export const lineTotal = (l: QuoteLine) => Math.max(r2((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0) - (Number(l.discount) || 0)), 0);

export function quoteTotals(lines: QuoteLine[], x: QuoteExtras = {}) {
  const subtotal = r2(lines.reduce((s, l) => s + lineTotal(l), 0));
  const disc = Math.min(Math.max(Number(x.discount) || 0, 0), subtotal);
  const tax = r2(((subtotal - disc) * (Number(x.taxPct) || 0)) / 100);
  const charges = r2((x.delivery || 0) + (x.labour || 0) + (x.other || 0));
  return { subtotal, disc, tax, charges, total: r2(subtotal - disc + tax + charges) };
}

export type QuoteProblem = 'name' | 'items' | 'itemName' | 'quantity' | 'rate' | 'lineDiscount' | 'charges' | 'discount';
export function quoteProblems(name: string, lines: Array<QuoteLine & { itemName: string }>, x: QuoteExtras): QuoteProblem[] {
  const out = new Set<QuoteProblem>();
  if (!name.trim()) out.add('name');
  if (!lines.length) out.add('items');
  for (const l of lines) {
    if (!l.itemName.trim()) out.add('itemName');
    if (!(l.quantity > 0)) out.add('quantity');
    if (!(l.unitPrice >= 0)) out.add('rate');
    if ((l.discount ?? 0) < 0 || (l.discount ?? 0) > l.quantity * l.unitPrice) out.add('lineDiscount');
  }
  if ([x.discount, x.taxPct, x.delivery, x.labour, x.other].some((v) => (v ?? 0) < 0)) out.add('charges');
  if ((x.discount ?? 0) > quoteTotals(lines, {}).subtotal) out.add('discount');
  return [...out];
}

/** What a quotation becomes at the bill: each line at its net rate, charges as bill charges. */
export function billPlan(q: { items: Array<{ productId?: string; quantity: number; total: number }>; subtotal: number; discount: number; deliveryCharges: number; laborCharges: number; otherCharges: number }) {
  const total = r2(q.subtotal - q.discount + q.deliveryCharges + q.laborCharges + q.otherCharges);
  const charges = [
    q.deliveryCharges > 0 && { type: 'DELIVERY', label: 'Delivery', amount: q.deliveryCharges },
    q.laborCharges > 0 && { type: 'INSTALLATION', label: 'Mazdoori', amount: q.laborCharges },
    q.otherCharges > 0 && { type: 'OTHER', label: 'Aur kharcha', amount: q.otherCharges },
  ].filter(Boolean) as Array<{ type: string; label: string; amount: number }>;
  const items = q.items.map((i) => ({ productId: i.productId ?? '', quantity: i.quantity, priceOverride: Math.round((i.total / i.quantity) * 10000) / 10000 }));
  return { total, charges, items, missing: q.items.filter((i) => !i.productId).length };
}

/* ── Units ── */

/** Product unit (lowercase) to the slip unit that quotations and challans store. */
const SLIP: Record<string, string> = {
  bag: 'BAG', kg: 'KG', ton: 'TON', pcs: 'PIECE', piece: 'PIECE', dozen: 'DOZEN', carton: 'CARTON', meter: 'METER', feet: 'FEET', inch: 'INCH', sqft: 'SQFT', sqm: 'SQMETER',
  cft: 'CUBIC_FEET', liter: 'LITER', gallon: 'GALLON', bundle: 'BUNDLE', roll: 'ROLL', sheet: 'SHEET', box: 'BOX', set: 'SET', trip: 'TRIP',
};
export const slipUnit = (unit?: string | null) => SLIP[(unit ?? '').toLowerCase()] ?? 'PIECE';
export const SLIP_UNITS = ['BAG', 'KG', 'TON', 'PIECE', 'DOZEN', 'CARTON', 'METER', 'FEET', 'INCH', 'SQFT', 'SQMETER', 'CUBIC_FEET', 'CUBIC_METER', 'LITER', 'GALLON', 'BUNDLE', 'ROLL', 'SHEET', 'BOX', 'SET', 'TRIP'];
export const SLIP_SHORT: Record<string, string> = {
  BAG: 'bag', KG: 'kg', TON: 'ton', PIECE: 'pcs', DOZEN: 'dozen', CARTON: 'carton', METER: 'meter', FEET: 'feet', INCH: 'inch', SQFT: 'sq ft', SQMETER: 'sq m', CUBIC_FEET: 'cft',
  CUBIC_METER: 'cu m', LITER: 'liter', GALLON: 'gallon', BUNDLE: 'bundle', ROLL: 'roll', SHEET: 'sheet', BOX: 'box', SET: 'set', TRIP: 'trip',
};

/* ── Challans ── */

export const OPEN_CHALLAN = ['PENDING', 'SCHEDULED', 'LOADED', 'DISPATCHED', 'IN_TRANSIT'];
/** The one-tap next move of an open challan. */
export const CHALLAN_NEXT: Record<string, string> = { PENDING: 'LOADED', SCHEDULED: 'LOADED', LOADED: 'DISPATCHED' };

export interface ChallanRow { itemId: string; ordered: number; delivered: number; damaged: number }
/** A site hand-over: delivered plus damaged cannot pass what the challan carried, and something must have arrived. */
export function confirmProblem(rows: ChallanRow[]): { kind: 'over' | 'negative' | 'nothing'; itemId?: string } | null {
  for (const r of rows) {
    if (r.delivered < 0 || r.damaged < 0) return { kind: 'negative', itemId: r.itemId };
    if (r.delivered + r.damaged > r.ordered + 1e-6) return { kind: 'over', itemId: r.itemId };
  }
  if (rows.every((r) => r.delivered <= 0)) return { kind: 'nothing' };
  return null;
}

/** Quantities of a bill still to send: sold less sent, never below zero. */
export const remainingToSend = (sold: number, sent: number) => Math.max(Number((sold - sent).toFixed(3)), 0);

/* ── Projects ── */

export const PROJECT_NEXT: Record<string, string[]> = {
  PLANNING: ['QUOTED', 'IN_PROGRESS', 'CANCELLED'], QUOTED: ['APPROVED', 'IN_PROGRESS', 'CANCELLED'], APPROVED: ['IN_PROGRESS', 'ON_HOLD'],
  IN_PROGRESS: ['ON_HOLD', 'COMPLETED'], ON_HOLD: ['IN_PROGRESS', 'CANCELLED'], COMPLETED: ['IN_PROGRESS'], CANCELLED: ['PLANNING'],
};
/** Share of ordered goods that reached the site, 0 to 100. */
export const deliveredPct = (ordered: number, delivered: number) => (ordered > 0 ? Math.min(Math.round((delivered / ordered) * 100), 100) : 0);

/* ── Reorder ── */

export type Severity = 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW' | 'OK';
export const SEVERITY_ORDER: Record<Severity, number> = { OUT_OF_STOCK: 0, CRITICAL: 1, LOW: 2, OK: 3 };
/** How urgent an item is against its rule. */
export function severityOf(stock: number, rule: { minStock: number; reorderPoint: number }): Severity {
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= rule.minStock) return 'CRITICAL';
  if (stock <= rule.reorderPoint) return 'LOW';
  return 'OK';
}
export function ruleProblem(r: { reorderPoint: number; minStock: number; reorderQty: number }): 'point' | 'min' | 'qty' | null {
  if (!(r.reorderPoint > 0)) return 'point';
  if (r.minStock > r.reorderPoint) return 'min';
  if (!(r.reorderQty > 0)) return 'qty';
  return null;
}

/* ── Contractor credit ── */

export interface Aging { age0To30Days: number; age31To60Days: number; age61To90Days: number; ageOver90Days: number }
export const sumAging = (rows: Aging[]) => ({
  d30: r2(rows.reduce((s, a) => s + (a.age0To30Days || 0), 0)), d60: r2(rows.reduce((s, a) => s + (a.age31To60Days || 0), 0)),
  d90: r2(rows.reduce((s, a) => s + (a.age61To90Days || 0), 0)), over90: r2(rows.reduce((s, a) => s + (a.ageOver90Days || 0), 0)),
});
export const overLimit = (a: { creditLimit: number; currentBalance: number }) => a.creditLimit > 0 && a.currentBalance > a.creditLimit;
/** Share of the credit limit in use, 0 to 100 (0 when there is no limit). */
export const limitUsed = (a: { creditLimit: number; currentBalance: number }) => (a.creditLimit > 0 ? Math.min((a.currentBalance / a.creditLimit) * 100, 100) : 0);
