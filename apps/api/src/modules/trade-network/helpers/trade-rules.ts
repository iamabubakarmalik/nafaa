/**
 * Pure rules of the trade network, kept free of Nest and Prisma so they are
 * easy to test: phone and invite code handling, which seller order state the
 * buyer sees, what a delivered order puts into the buyer's purchase, and how
 * a seller's products are matched to the buyer's own.
 */

export const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
export const r4 = (v: number) => Math.round((Number(v) || 0) * 10_000) / 10_000;

/* ───────────── phones and codes ───────────── */

/** Last ten digits of a Pakistani number (0300…, +92300…, 92-300…), or null. */
export function phoneKey(v: string | null | undefined): string | null {
  const digits = String(v ?? '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** A new invite code like "NF-7K2P9Q". */
export function newInviteCode(rand: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)];
  return `NF-${s}`;
}

/** Accepts "nf-7k2p9q", "7K2P9Q" or a full invite link; returns "NF-7K2P9Q" or null. */
export function cleanInviteCode(v: string | null | undefined): string | null {
  const raw = String(v ?? '').trim().toUpperCase();
  const tail = raw.split('/').filter(Boolean).pop() ?? '';
  const body = tail.replace(/^NF-?/, '').replace(/[^A-Z0-9]/g, '');
  return body.length === 6 ? `NF-${body}` : null;
}

/* ───────────── link states ───────────── */

export const LINK_STATUSES = ['PENDING', 'ACTIVE', 'PAUSED', 'REJECTED', 'UNLINKED', 'CANCELLED'] as const;
export type LinkStatus = (typeof LINK_STATUSES)[number];

/** States from which a buyer may send a fresh request on the same pair. */
export const REOPENABLE: LinkStatus[] = ['REJECTED', 'UNLINKED', 'CANCELLED'];

/* ───────────── order states ───────────── */

export const TRADE_STATUSES = ['BOOKED', 'APPROVED', 'INVOICED', 'LOADED', 'DELIVERED', 'PARTIAL', 'RETURNED', 'CANCELLED'] as const;
export type TradeStatus = (typeof TRADE_STATUSES)[number];
export const DONE_STATUSES: TradeStatus[] = ['DELIVERED', 'PARTIAL', 'RETURNED'];
export const OPEN_TRADE_STATUSES: TradeStatus[] = ['BOOKED', 'APPROVED', 'INVOICED', 'LOADED'];
const RANK: Record<TradeStatus, number> = { BOOKED: 0, APPROVED: 1, INVOICED: 2, LOADED: 3, DELIVERED: 4, PARTIAL: 4, RETURNED: 4, CANCELLED: 4 };

/** The buyer-facing state of a seller's sales order status. */
export function tradeStatusOf(salesOrderStatus: string): TradeStatus {
  switch (salesOrderStatus) {
    case 'APPROVED':
    case 'INVOICING':
      return 'APPROVED';
    case 'INVOICED':
    case 'LOADED':
    case 'DELIVERED':
    case 'PARTIAL':
    case 'RETURNED':
    case 'CANCELLED':
      return salesOrderStatus;
    default:
      return 'BOOKED';
  }
}

/** True when moving from `from` to `to` is news for the buyer (never backwards, except a load sheet taken apart). */
export function isForward(from: string, to: string): boolean {
  if (from === to) return false;
  const a = RANK[from as TradeStatus];
  const b = RANK[to as TradeStatus];
  if (a == null || b == null) return true;
  return b > a || (from === 'LOADED' && to === 'INVOICED');
}

/* ───────────── what was delivered ───────────── */

export interface SellerOrderItem {
  id?: string;
  productId: string;
  variantId: string | null;
  baseQty: number;
  total: number;
  freeBaseQty: number;
  freeProductId: string | null;
  deliveredBaseQty: number | null;
  deliveredFreeQty: number | null;
}

export interface DeliveredLine {
  sellerProductId: string;
  sellerVariantId: string | null;
  baseQty: number;
  /** Net cost of one base unit as invoiced (after scheme and discounts). Free goods are 0. */
  unitCost: number;
  free: boolean;
}

/**
 * Goods the buyer actually got, per invoice line, in base units. Settled
 * lines use what settlement recorded; an order marked DELIVERED without
 * line figures counts as delivered in full, RETURNED as nothing.
 */
export function deliveredLines(items: SellerOrderItem[], status: string): DeliveredLine[] {
  const out: DeliveredLine[] = [];
  for (const it of items) {
    const full = status === 'RETURNED' ? 0 : it.baseQty;
    const fullFree = status === 'RETURNED' ? 0 : it.freeBaseQty;
    const paid = r4(it.deliveredBaseQty ?? full);
    const free = r4(it.deliveredFreeQty ?? fullFree);
    if (paid > 0) {
      out.push({
        sellerProductId: it.productId, sellerVariantId: it.variantId ?? null, baseQty: paid,
        unitCost: it.baseQty > 0 ? r4(it.total / it.baseQty) : 0, free: false,
      });
    }
    if (free > 0) {
      const other = !!it.freeProductId && it.freeProductId !== it.productId;
      out.push({
        sellerProductId: other ? it.freeProductId! : it.productId, sellerVariantId: other ? null : it.variantId ?? null,
        baseQty: free, unitCost: 0, free: true,
      });
    }
  }
  return out;
}

/**
 * Discount or extra charge that makes the purchase total equal what the
 * seller's khata says this delivery is worth (invoice total less returns).
 * Rounding and invoice tax land here so both ledgers agree to the rupee.
 */
export function balancingFigures(lines: Array<{ baseQty: number; unitCost: number }>, target: number) {
  const subtotal = r2(lines.reduce((s, l) => s + r2(l.baseQty * l.unitCost), 0));
  const gap = r2(target - subtotal);
  return { subtotal, discount: gap < 0 ? -gap : 0, otherCharges: gap > 0 ? gap : 0 };
}

/* ───────────── product matching ───────────── */

export interface MatchableProduct {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  /** Pack barcodes and similar alternates. */
  barcodes?: Array<string | null | undefined>;
}

export type MatchedBy = 'BARCODE' | 'SKU' | 'NAME';

const norm = (v: string | null | undefined) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const nameKey = (v: string | null | undefined) => norm(v).replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

/**
 * Matches each seller product to one buyer product: barcode first, then SKU,
 * then the same name (letters and digits only, case and spaces ignored).
 * A key shared by two buyer products is ambiguous and not used.
 */
export function matchProducts(seller: MatchableProduct[], buyer: MatchableProduct[]): Map<string, { buyerProductId: string; by: MatchedBy }> {
  const index = (keys: (p: MatchableProduct) => string[]) => {
    const m = new Map<string, string | null>();
    for (const p of buyer) {
      for (const k of new Set(keys(p).filter(Boolean))) m.set(k, m.has(k) && m.get(k) !== p.id ? null : p.id);
    }
    return m;
  };
  const byBarcode = index((p) => [p.barcode, ...(p.barcodes ?? [])].map((b) => norm(b)));
  const bySku = index((p) => [norm(p.sku)]);
  const byName = index((p) => [nameKey(p.name)]);
  const out = new Map<string, { buyerProductId: string; by: MatchedBy }>();
  for (const s of seller) {
    const tries: Array<[MatchedBy, Map<string, string | null>, string[]]> = [
      ['BARCODE', byBarcode, [s.barcode, ...(s.barcodes ?? [])].map((b) => norm(b)).filter(Boolean)],
      ['SKU', bySku, [norm(s.sku)].filter(Boolean)],
      ['NAME', byName, [nameKey(s.name)].filter(Boolean)],
    ];
    for (const [by, map, keys] of tries) {
      const hit = keys.map((k) => map.get(k)).find((x) => !!x);
      if (hit) { out.set(s.id, { buyerProductId: hit, by }); break; }
    }
  }
  return out;
}

/* ───────────── reorder suggestion ───────────── */

/**
 * How much to order for a low item: up to twice its low-stock level, at
 * least one. Returned in base units and, when a pack fits, in packs.
 */
export function reorderQty(stock: number, lowStockAlert: number, packSize?: number | null) {
  const level = Math.max(0, Number(lowStockAlert) || 0);
  const target = Math.max(level * 2, level + 1);
  const need = Math.max(1, Math.ceil(target - Math.max(0, Number(stock) || 0)));
  const size = Number(packSize) || 0;
  if (size > 1 && need >= size / 2) return { baseQty: need, packs: Math.max(1, Math.round(need / size)), packSize: size };
  return { baseQty: need, packs: null as number | null, packSize: null as number | null };
}

/* ───────────── schemes ───────────── */

/** Short label for a running scheme: "10 Carton + 1 free", "5% off", "Rs 20 off / Carton". */
export function schemeLabel(s: { type: string; buyQty?: number | null; buyUnitName?: string | null; freeQty?: number | null; value?: number | null; name?: string }, baseUnit = 'pcs'): string {
  const unit = s.buyUnitName || baseUnit;
  const buy = Number(s.buyQty) || 0;
  switch (s.type) {
    case 'FREE_QTY':
      return `${buy || 1} ${unit} + ${Number(s.freeQty) || 0} free`;
    case 'PERCENT_OFF':
      return `${Number(s.value) || 0}% off${buy > 1 ? ` (${buy} ${unit} se)` : ''}`;
    case 'AMOUNT_PER_UNIT':
      return `Rs ${Number(s.value) || 0} off / ${unit}${buy > 1 ? ` (${buy} se)` : ''}`;
    case 'SLAB':
      return 'Slab scheme';
    default:
      return s.name ?? 'Scheme';
  }
}
