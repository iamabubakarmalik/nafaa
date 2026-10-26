/**
 * The print queue: one line per product, variant or package unit with its
 * label count. Lines keep only ids plus a variant snapshot, and are turned
 * into label data with the latest product and unit prices when printing.
 * The queue stays on this device between visits.
 */
import { tierPrice } from '@core/lib/priceTiers';

import type { Product } from '@modules/inventory/products/api/products.api';
import type { ProductVariant } from '@modules/inventory/products/api/product-variants.api';
import type { ProductUnit } from '@modules/inventory/products/api/product-units.api';
import type { LabelConfig } from '../api/barcode-labels.api';
import type { LabelData } from './renderLabels';

export interface VariantSnap {
  id: string;
  name: string;
  barcode?: string | null;
  sku?: string | null;
  price: number;
  wholesalePrice?: number | null;
  stock: number;
}

export interface QueueLine {
  id: string;
  productId: string;
  variant?: VariantSnap;
  unitId?: string;
  qty: number;
  /** Nearest batch expiry, already formatted (MM/YYYY). */
  expiry?: string | null;
}

export interface ResolvedLine {
  line: QueueLine;
  product?: Product;
  unit?: ProductUnit;
  data: LabelData | null;
  stock: number;
  missingCode: boolean;
}

export const MAX_QTY = 5000;
const STORE = 'nafaa-label-queue-v1';

export function loadQueue(): QueueLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) || '[]');
    return Array.isArray(raw) ? raw.filter((l) => l && typeof l.productId === 'string' && l.qty > 0) : [];
  } catch { return []; }
}

export function saveQueue(lines: QueueLine[]) {
  try { localStorage.setItem(STORE, JSON.stringify(lines)); } catch { /* storage full or blocked */ }
}

export const sameItem = (a: Pick<QueueLine, 'productId' | 'variant' | 'unitId'>, b: Pick<QueueLine, 'productId' | 'variant' | 'unitId'>) =>
  a.productId === b.productId && a.variant?.id === b.variant?.id && (a.unitId ?? '') === (b.unitId ?? '');

export const snapVariant = (v: ProductVariant): VariantSnap => ({
  id: v.id, name: v.name, barcode: v.barcode, sku: v.sku, price: v.price, wholesalePrice: v.wholesalePrice, stock: v.stock,
});

/** Nearest expiry among batches still in stock for the product or variant. */
export function nearestExpiry(p: Product, variantId?: string): string | null {
  const dates = (p.batches ?? [])
    .filter((b) => b.expiryDate && b.quantity > 0 && (!variantId || !b.variantId || b.variantId === variantId))
    .map((b) => new Date(b.expiryDate as string))
    .sort((a, b) => a.getTime() - b.getTime());
  const d = dates[0];
  return d ? `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : null;
}

export const unitName = (u: ProductUnit) => u.unitLabel || u.unitName;

/** Units a line can be printed in: the product's (or this variant's) packs, not the base unit. */
export const unitsFor = (units: ProductUnit[] | undefined, variantId?: string) =>
  (units ?? []).filter((u) => u.isActive && !u.isBase && (!u.variantId || u.variantId === variantId));

export function resolveLine(line: QueueLine, product: Product | undefined, units: ProductUnit[] | undefined, c: LabelConfig): ResolvedLine {
  if (!product) return { line, data: null, stock: 0, missingCode: false };
  const unit = line.unitId ? units?.find((u) => u.id === line.unitId) : undefined;
  const v = line.variant;
  const rate = unit?.conversionRate || 1;
  const tier = c.priceSource === 'wholesale' ? 'WHOLESALE' : c.priceSource === 'credit' ? 'CREDIT' : 'RETAIL';

  // Same tier rule as the counter: a variant's own tier price, then the product's, else retail.
  const baseRetail = v?.price ?? product.price;
  const pv = v as { wholesalePrice?: number | null; creditPrice?: number | null } | undefined;
  let price = tierPrice({
    price: baseRetail,
    wholesalePrice: pv?.wholesalePrice ?? product.wholesalePrice,
    creditPrice: pv?.creditPrice ?? product.creditPrice,
  }, tier);
  if (unit) {
    // A unit saved with price 0 means "not set": fall back to base price × units in the pack.
    const u = unit as { price: number; wholesalePrice?: number | null; creditPrice?: number | null };
    const own = tier === 'WHOLESALE' ? u.wholesalePrice : tier === 'CREDIT' ? u.creditPrice : u.price;
    price = own && own > 0 ? own : price * rate;
  }
  const mrpUnit = unit ?? units?.find((u) => u.isBase && (!u.variantId || u.variantId === v?.id));
  const oldPrice = mrpUnit?.mrpPrice && mrpUnit.mrpPrice > price ? mrpUnit.mrpPrice : null;

  // A pack or variant must scan as itself, so it never borrows the product barcode.
  const code = (unit ? unit.barcode : v ? v.barcode : product.barcode) || '';
  const baseStock = v ? v.stock : product.stock;
  const stock = Math.max(0, Math.floor(baseStock / rate));

  return {
    line, product, unit, stock,
    missingCode: !code,
    data: {
      name: product.name,
      variant: v?.name,
      unit: unit ? unitName(unit) : product.unit,
      sku: unit?.sku || v?.sku || product.sku || undefined,
      code,
      price: Math.round(price * 100) / 100,
      oldPrice,
      expiry: line.expiry,
    },
  };
}
