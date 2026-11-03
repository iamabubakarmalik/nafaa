/*
 * Copy of apps/api/src/modules/distribution/helpers/pricing.ts so the booker app
 * prices and warns offline exactly like the server. Keep the logic identical:
 * change the server file first, then copy it here.
 */

/**
 * Order line pricing for distribution: the customer's price list, the pack
 * (carton, dozen) and the trade schemes give each line its price, rupees off
 * and free goods.
 *
 * Pure functions with no Nest or Prisma imports, shared by the order desk,
 * the booker app (which runs a copy offline), the POS price lookup and the
 * discount guard. The server always prices an order again on save; prices
 * sent by a client are kept only for staff with distribution.price_override.
 *
 * Price of a line, first match wins:
 *   1. A list row for the product, variant and pack (the one with the highest
 *      minQty the quantity reaches).
 *   2. A list row for the base unit (or the product without variant) times
 *      the pack size.
 *   3. The list's rule: PRICE, WHOLESALE or COST of the pack (or base × pack
 *      size when the pack has no price of its own), plus adjustPct percent.
 *   4. Without a list: the tier price (customer's tier, else wholesale) of the
 *      pack, falling back to retail like the POS does.
 */

import { applySchemes, type SchemeResult, type SchemeRule } from './scheme-resolver';

export type Tier = 'RETAIL' | 'WHOLESALE' | 'CREDIT';
export type ListBase = 'PRICE' | 'WHOLESALE' | 'COST';
export const LIST_BASES: ListBase[] = ['PRICE', 'WHOLESALE', 'COST'];

export interface PricedThing {
  price: number;
  wholesalePrice?: number | null;
  creditPrice?: number | null;
  costPrice?: number | null;
}

export interface PricingProduct extends PricedThing {
  id: string;
  name: string;
  brandId?: string | null;
  categoryId?: string | null;
  unit?: string | null;
  taxRate?: number | null;
}

export interface PricingVariant extends PricedThing {
  id: string;
  productId: string;
  name?: string | null;
}

export interface PricingUnit extends PricedThing {
  id: string;
  productId: string;
  variantId?: string | null;
  unitName: string;
  conversionRate: number;
}

export interface PricingListItem {
  productId: string;
  variantId?: string | null;
  unitId?: string | null;
  price: number;
  minQty?: number | null;
}

export interface PricingList {
  id: string;
  name?: string;
  basedOn: ListBase | string;
  adjustPct: number;
  items: PricingListItem[];
}

export type PriceSource = 'LIST_ITEM' | 'LIST_RULE' | 'TIER' | 'OVERRIDE';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
const r4 = (v: number) => Math.round((Number(v) || 0) * 10_000) / 10_000;
const pos = (v: unknown) => (Number(v) > 0 ? Number(v) : 0);
const same = (a?: string | null, b?: string | null) => (a ?? null) === (b ?? null);

function tierOf(src: PricedThing, tier: Tier): number {
  const retail = pos(src.price);
  if (tier === 'WHOLESALE') return pos(src.wholesalePrice) || retail;
  if (tier === 'CREDIT') return pos(src.creditPrice) || retail;
  return retail;
}

function baseOf(src: PricedThing, basedOn: string): number {
  if (basedOn === 'COST') return pos(src.costPrice);
  if (basedOn === 'PRICE') return pos(src.price);
  return pos(src.wholesalePrice) || pos(src.price);
}

/** Best list row: exact match on product, variant and pack, highest minQty reached. */
function pickRow(items: PricingListItem[], productId: string, variantId: string | null, unitId: string | null, qty: number) {
  let best: PricingListItem | null = null;
  for (const it of items) {
    if (it.productId !== productId || !same(it.variantId, variantId) || !same(it.unitId, unitId)) continue;
    if (pos(it.minQty) > 0 && qty + 1e-9 < pos(it.minQty)) continue;
    if (!best || pos(it.minQty) > pos(best.minQty)) best = it;
  }
  return best;
}

export interface ListPriceInput {
  product: PricingProduct;
  variant?: PricingVariant | null;
  unit?: PricingUnit | null;
  list?: PricingList | null;
  tier?: Tier;
  /** Quantity in the pack, for minQty rows. */
  qty?: number;
}

/** Price of one pack (base unit when no pack) for a customer. */
export function listPrice(input: ListPriceInput): { price: number; source: PriceSource } {
  const { product, variant, unit, list } = input;
  const rate = unit ? pos(unit.conversionRate) || 1 : 1;
  const qty = input.qty ?? 1;
  const variantId = variant?.id ?? null;
  const unitId = unit?.id ?? null;
  const plain: PricedThing = variant ?? product;

  if (list) {
    const exact = pickRow(list.items, product.id, variantId, unitId, qty);
    if (exact) return { price: r2(exact.price), source: 'LIST_ITEM' };
    if (unitId) {
      const baseRow = pickRow(list.items, product.id, variantId, null, qty * rate);
      if (baseRow) return { price: r2(baseRow.price * rate), source: 'LIST_ITEM' };
    }
    if (variantId) {
      const productRow = pickRow(list.items, product.id, null, unitId, qty);
      if (productRow) return { price: r2(productRow.price), source: 'LIST_ITEM' };
      if (unitId) {
        const productBase = pickRow(list.items, product.id, null, null, qty * rate);
        if (productBase) return { price: r2(productBase.price * rate), source: 'LIST_ITEM' };
      }
    }
    const fromPack = unit ? baseOf(unit, list.basedOn) : 0;
    const base = fromPack > 0 ? fromPack : baseOf(plain, list.basedOn) * rate || baseOf(product, list.basedOn) * rate;
    return { price: r2(base * (1 + (Number(list.adjustPct) || 0) / 100)), source: 'LIST_RULE' };
  }

  const tier = input.tier ?? 'WHOLESALE';
  const packPrice = unit && pos(unit.price) > 0 ? tierOf(unit, tier) : 0;
  return { price: r2(packPrice > 0 ? packPrice : tierOf(plain, tier) * rate), source: 'TIER' };
}

/* ───────────────────────── whole order ───────────────────────── */

export interface OrderLineInput {
  productId: string;
  variantId?: string | null;
  /** ProductUnit id; empty for the base unit. */
  unitId?: string | null;
  /** Quantity in the pack. */
  qty: number;
  /** Price per pack typed by the user; kept only when `canOverride`. */
  price?: number | null;
  /** Rupees off by hand (only with `canOverride`). */
  discount?: number | null;
}

export interface PricingCatalog {
  products: Map<string, PricingProduct>;
  variants: Map<string, PricingVariant>;
  units: Map<string, PricingUnit>;
  /** Packs of each product (all variants), for scheme buy packs. */
  unitsByProduct: Map<string, PricingUnit[]>;
}

export interface PricedLine {
  index: number;
  productId: string;
  variantId: string | null;
  unitId: string | null;
  unitName: string | null;
  conversionRate: number;
  qty: number;
  baseQty: number;
  price: number;
  priceSource: PriceSource;
  /** What the list or tier would have charged, when the user's price differs. */
  listPrice: number;
  gross: number;
  schemeDiscount: number;
  discount: number;
  total: number;
  schemeId: string | null;
  schemeNote: string | null;
  freeBaseQty: number;
  freeProductId: string | null;
  /** Retail price of the pack (MRP if set on the pack), for the bill. */
  retailPrice: number;
  taxRate: number;
}

export interface PricedOrder {
  lines: PricedLine[];
  subtotal: number;
  schemeDiscount: number;
  discount: number;
  total: number;
  /** Roman Urdu notes for the user (price changed, line dropped). */
  warnings: string[];
}

export interface PriceOrderOptions {
  list?: PricingList | null;
  tier?: Tier;
  schemes?: SchemeRule[];
  at?: Date;
  /** distribution.price_override: typed prices and hand discounts are kept. */
  canOverride?: boolean;
}

/** Prices every line of an order. Throws nothing: bad lines come back as warnings and are left out. */
export function priceOrder(input: OrderLineInput[], catalog: PricingCatalog, opts: PriceOrderOptions = {}): PricedOrder {
  const warnings: string[] = [];
  const lines: PricedLine[] = [];

  input.forEach((l, index) => {
    const product = catalog.products.get(l.productId);
    if (!product) { warnings.push(`Line ${index + 1}: item nahi mila ya band hai`); return; }
    const variant = l.variantId ? catalog.variants.get(l.variantId) ?? null : null;
    if (l.variantId && (!variant || variant.productId !== product.id)) { warnings.push(`${product.name}: size/variant nahi mila`); return; }
    const unit = l.unitId ? catalog.units.get(l.unitId) ?? null : null;
    if (l.unitId && (!unit || unit.productId !== product.id || (unit.variantId && unit.variantId !== (variant?.id ?? null)))) {
      warnings.push(`${product.name}: pack nahi mila`); return;
    }
    const qty = r4(Number(l.qty) || 0);
    if (!(qty > 0)) { warnings.push(`${product.name}: quantity sahi nahi`); return; }

    const rate = unit ? pos(unit.conversionRate) || 1 : 1;
    const resolved = listPrice({ product, variant, unit, list: opts.list ?? null, tier: opts.tier, qty });
    const typed = l.price != null && Number.isFinite(Number(l.price)) && Number(l.price) >= 0 ? r2(Number(l.price)) : null;
    let price = resolved.price;
    let source: PriceSource = resolved.source;
    if (typed != null && Math.abs(typed - resolved.price) > 0.005) {
      if (opts.canOverride) { price = typed; source = 'OVERRIDE'; }
      else warnings.push(`${product.name}: price Rs ${typed} ki jagah price list ka Rs ${resolved.price} lagaya`);
    }
    const gross = r2(price * qty);
    const discount = opts.canOverride ? Math.min(gross, r2(Math.max(0, Number(l.discount) || 0))) : 0;
    if (!opts.canOverride && Number(l.discount) > 0) warnings.push(`${product.name}: haath ka discount nahi lag sakta (permission nahi)`);
    const retail = unit ? (pos(unit.price) || pos((variant ?? product).price) * rate) : pos((variant ?? product).price);

    lines.push({
      index, productId: product.id, variantId: variant?.id ?? null, unitId: unit?.id ?? null,
      unitName: unit?.unitName ?? null, conversionRate: rate, qty, baseQty: r4(qty * rate),
      price, priceSource: source, listPrice: resolved.price, gross, schemeDiscount: 0, discount, total: gross,
      schemeId: null, schemeNote: null, freeBaseQty: 0, freeProductId: null,
      retailPrice: r2(retail), taxRate: Number(product.taxRate) || 0,
    });
  });

  // Schemes see each line at its price per base unit, after any hand discount.
  const results: SchemeResult[] = opts.schemes?.length
    ? applySchemes(lines.map((ln) => {
        const product = catalog.products.get(ln.productId)!;
        const packs: Record<string, number> = { [product.unit || 'pcs']: 1 };
        for (const u of catalog.unitsByProduct.get(ln.productId) ?? []) {
          if (!u.variantId || u.variantId === ln.variantId) packs[u.unitName] = pos(u.conversionRate) || 1;
        }
        return {
          productId: ln.productId, brandId: product.brandId ?? null, categoryId: product.categoryId ?? null,
          baseQty: ln.baseQty, unitPrice: ln.baseQty > 0 ? (ln.gross - ln.discount) / ln.baseQty : 0, packs,
        };
      }), opts.schemes, { priceListId: opts.list?.id ?? null, at: opts.at })
    : [];

  lines.forEach((ln, i) => {
    const res = results[i];
    if (res?.schemeId) {
      ln.schemeId = res.schemeId;
      ln.schemeNote = res.note;
      ln.schemeDiscount = Math.min(r2(ln.gross - ln.discount), res.discount);
      ln.freeBaseQty = res.freeBaseQty;
      ln.freeProductId = res.freeProductId;
    }
    ln.total = r2(ln.gross - ln.discount - ln.schemeDiscount);
  });

  const sum = (f: (l: PricedLine) => number) => r2(lines.reduce((s, l) => s + f(l), 0));
  return {
    lines,
    subtotal: sum((l) => l.gross),
    schemeDiscount: sum((l) => l.schemeDiscount),
    discount: sum((l) => l.discount),
    total: sum((l) => l.total),
    warnings,
  };
}
