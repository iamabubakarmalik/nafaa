/**
 * Counter actions shared by every part of the POS: putting items on the
 * bill (packs, weights, variants, open price, combos, quick keys, scans and
 * scale labels), changing lines, holding and resuming bills. Pickers the
 * flow needs (unit, variant, weight, price) open through the POS UI store.
 *
 * Everything reads the phone's own database, so the counter works the same
 * with or without internet.
 */

import { useMemo } from 'react';
import { create } from 'zustand';
import {
  addComboLine, addItemLine, derivePosUnits, isWeightUnit, NO_LIMIT, packUnit, parseScaleLabel, posHeldId, scaleQuantity,
  setLineDiscount, setLineNote, setLinePrice, setLineQty, setLineTier, stepLine,
  type ComboInput, type PosCartLine, type PosCheckoutMode, type PosUnitOption, type PriceTier,
} from '@nafaa/core/pos';
import { useAuthStore } from '@/core/auth/store';
import { shopParam } from '@/core/auth/shopScope';
import { haptic } from '@/core/device/haptics';
import { t } from '@/core/i18n';
import { offline, type HeldBill, type ProductDetail } from '@/core/offline';
import { kv } from '@/core/storage/kv';
import { queryClient } from '@/core/query/client';
import { toast } from '@/design';
import { snapshotBill, useBill, type HeldBillData } from './bill';
import { useCounter, type Counter } from './counter';
import { posConfigFor, type PosIndustryConfig } from './industry';
import { useIndustry } from '@/modules/shell/hooks/useIndustry';
import type { PosCombo } from './catalog';

export interface AddOptions {
  qty?: number;
  unit?: PosUnitOption;
  variant?: { id: string; name: string; price?: number | null; wholesalePrice?: number | null; creditPrice?: number | null; stock?: number | null };
  /** A rate given by the caller (open price, industry rate). */
  price?: number;
  oversell?: boolean;
  /** Quantity the industry already checked (carpet cut from a roll); skips the stock check. */
  limit?: number;
  note?: string;
  separate?: boolean;
  serial?: { id: string; serialNumber: string; imei?: string | null };
  imei?: { id: string; imei1: string; imei2?: string | null };
  warrantyMonths?: number;
}

export type Picker =
  | { kind: 'unit'; product: ProductDetail; units: PosUnitOption[]; opts: AddOptions }
  | { kind: 'variant'; product: ProductDetail; opts: AddOptions }
  | { kind: 'weigh'; product: ProductDetail; unit: PosUnitOption; opts: AddOptions }
  | { kind: 'price'; product: ProductDetail; unit: PosUnitOption; opts: AddOptions };

export type PosSheet = 'cart' | 'customer' | 'discount' | 'charges' | 'checkout' | 'held' | 'scanner' | 'line' | 'more' | 'done' | 'tier' | null;

interface PosUi {
  picker: Picker | null;
  sheet: PosSheet;
  lineId: string | null;
  /** Bump to animate the cart bar after an add. */
  pulse: number;
  /** Last item added (shown in the scanner). */
  lastAdded: { name: string; at: number } | null;
  /** How checkout opens: full payment, part payment or all on khata. */
  mode: PosCheckoutMode;
  /** Open checkout straight in split payment. */
  split: boolean;
}

export const usePosUi = create<PosUi>(() => ({ picker: null, sheet: null, lineId: null, pulse: 0, lastAdded: null, mode: 'full', split: false }));
export const openCheckoutSheet = (mode: PosCheckoutMode = 'full', split = false) => usePosUi.setState({ sheet: 'checkout', mode, split });
export const openSheet = (sheet: PosSheet, lineId: string | null = null) => usePosUi.setState({ sheet, lineId });
export const closeSheet = () => usePosUi.setState({ sheet: null });
export const closePicker = () => usePosUi.setState({ picker: null });

/* ───────────── most sold on this counter ───────────── */

const RECENT_KEY = 'nafaa.pos.recent';
type RecentMap = Record<string, { n: number; t: number }>;

export function bumpRecent(productIds: string[]) {
  const m = kv.get<RecentMap>(RECENT_KEY, {});
  for (const id of productIds) m[id] = { n: (m[id]?.n ?? 0) + 1, t: Date.now() };
  const top = Object.entries(m).sort((a, b) => b[1].n - a[1].n || b[1].t - a[1].t).slice(0, 60);
  kv.set(RECENT_KEY, Object.fromEntries(top));
}

export const topRecent = (limit = 12) =>
  Object.entries(kv.get<RecentMap>(RECENT_KEY, {})).sort((a, b) => b[1].n - a[1].n || b[1].t - a[1].t).slice(0, limit).map(([id]) => id);

/* ───────────── the API ───────────── */

export interface PosQuickKey {
  id: string;
  label: string;
  color?: string | null;
  group?: string | null;
  productId?: string | null;
  comboId?: string | null;
  variantId?: string | null;
  unitId?: string | null;
  isActive: boolean;
  position: number;
}

export interface PosApi {
  shopId: string | null;
  counter: Counter;
  config: PosIndustryConfig;
  addProduct: (productId: string, opts?: AddOptions) => Promise<boolean>;
  /** Puts a unit of a product on the bill (after a picker answered). */
  place: (product: ProductDetail, unit: PosUnitOption, opts: AddOptions) => boolean;
  push: (product: ProductDetail, unit: PosUnitOption, qty: number, opts: AddOptions) => boolean;
  addCombo: (combo: ComboInput, qty?: number) => Promise<boolean>;
  addQuickKey: (key: PosQuickKey, combos: ComboInput[]) => Promise<boolean>;
  /** Scanned or typed code: industry codes, combos, packs, variants, products. False when nothing matched. */
  handleCode: (code: string, opts?: { qty?: number | null; combos?: PosCombo[]; quiet?: boolean }) => Promise<boolean>;
  addScaleLabel: (code: string) => Promise<boolean>;
  step: (lineId: string, delta: number) => void;
  setQty: (lineId: string, qty: number) => void;
  setPrice: (lineId: string, price: number) => void;
  setLineDiscount: (lineId: string, rupees: number) => void;
  setNote: (lineId: string, note: string) => void;
  setLineTier: (lineId: string, tier: PriceTier) => void;
  remove: (lineId: string) => void;
  hold: (label?: string) => Promise<void>;
  resume: (held: HeldBill<HeldBillData>) => Promise<void>;
}

const stockLimit = (counter: Counter, product: ProductDetail, opts: AddOptions) => {
  if (opts.limit != null) return opts.limit;
  if (opts.oversell || counter.rules.negativeStock) return NO_LIMIT;
  if (opts.variant) return opts.variant.stock == null ? NO_LIMIT : Math.max(Number(opts.variant.stock), 0);
  // No stock row in this branch: services, made on sale; the server decides.
  return product.stock == null ? NO_LIMIT : Math.max(product.stock, 0);
};

/** Base unit and packs of a product (a variant's own packs first when it has them). */
export function unitsOf(product: ProductDetail, variantId?: string | null): PosUnitOption[] {
  const packs = product.packs.filter((p) => !p.isBase && (!p.variantId || p.variantId === variantId));
  return derivePosUnits({ unit: product.unit, price: product.price, wholesalePrice: product.wholesalePrice, creditPrice: product.creditPrice, barcode: product.barcode, sku: product.sku }, packs);
}

function createApi(shopId: string | null, counter: Counter, config: PosIndustryConfig): PosApi {
  const fail = (message: string) => { haptic('error'); toast.error(message); return false; };
  const added = (name: string) => {
    haptic('tap');
    usePosUi.setState((s) => ({ pulse: s.pulse + 1, lastAdded: { name, at: Date.now() } }));
  };

  /** Applies the industry's rate for the line's quantity (never to a rate typed by hand). */
  const repriced = (lines: PosCartLine[], lineId: string): PosCartLine[] => {
    if (!config.repriceLine) return lines;
    return lines.map((l) => {
      if (l.id !== lineId || l.type !== 'product' || !l.productId || l.priceEdited || l.fixedPrice) return l;
      const rate = config.repriceLine!(l, l.productId);
      return rate != null && rate >= 0 && Math.abs(rate - l.unitPrice) > 0.0001 ? { ...l, unitPrice: rate, lineTotal: l.quantity * rate } : l;
    });
  };
  /** Back to the list rate so an equal line merges and grows (then it is repriced for the new total). */
  const unrepriced = (lines: PosCartLine[], productId: string): PosCartLine[] => (config.repriceLine
    ? lines.map((l) => (l.productId === productId && !l.priceEdited && !l.fixedPrice && l.unitPrice !== l.basePrice ? { ...l, unitPrice: l.basePrice, lineTotal: l.quantity * l.basePrice } : l))
    : lines);

  const api: PosApi = {
    shopId, counter, config,

    push(product, unit, qty, opts) {
      const bill = useBill.getState();
      const r = addItemLine(unrepriced(bill.lines, product.id), {
        product: { id: product.id, name: product.name, unit: product.unit, image: product.imageUrl, wholesalePrice: product.wholesalePrice, creditPrice: product.creditPrice },
        unit, qty, limit: stockLimit(counter, product, opts), tier: bill.tier,
        variant: opts.variant, price: opts.price, serial: opts.serial, imei: opts.imei, warrantyMonths: opts.warrantyMonths,
        note: opts.note, oversell: opts.oversell, separate: opts.separate,
      });
      if (!r.ok) {
        if (r.reason === 'duplicate') return fail(t('This item is already on the bill'));
        return fail(t('Only {{qty}} {{unit}} in stock', { qty: Number(r.available.toFixed(2)), unit: product.unit }));
      }
      bill.setLines(() => repriced(r.lines, r.lineId), r.lineId);
      added(opts.variant ? `${product.name} · ${opts.variant.name}` : product.name);
      return true;
    },

    place(product, unit, opts) {
      // A known quantity (scale label) goes straight on the bill without the weight sheet.
      if (isWeightUnit(unit.unitName) && opts.qty == null) {
        usePosUi.setState({ picker: { kind: 'weigh', product, unit, opts } });
        return true;
      }
      return api.push(product, unit, opts.qty ?? 1, opts);
    },

    async addProduct(productId, opts = {}) {
      if (config.beforeAdd && config.beforeAdd(productId, opts, api) === 'handled') return true;
      const product = await offline.products.get(productId, shopId);
      if (!product || !product.isActive) return fail(t('Product not found'));
      // Variants: pick the size/colour first.
      if (product.hasVariants && !opts.variant && !opts.imei && product.variants.length) {
        usePosUi.setState({ picker: { kind: 'variant', product, opts } });
        return true;
      }
      const priced = opts.price != null && opts.price > 0;
      const units = unitsOf(product, opts.variant?.id);
      const unit = opts.unit ?? units[0];
      const basePrice = opts.variant?.price ?? product.price;
      // Open price: an item without a rate asks for it at the counter.
      if (!priced && !(basePrice > 0) && !(unit.price > 0)) {
        if (!counter.canEditPrice) return fail(t('{{name}} has no price. Set a price on the product first.', { name: product.name }));
        usePosUi.setState({ picker: { kind: 'price', product, unit, opts } });
        return true;
      }
      if (!opts.oversell && !opts.imei && !counter.rules.negativeStock && !opts.variant && !product.hasVariants && product.stock != null && product.stock <= 0) {
        return fail(t('{{name}} is out of stock', { name: product.name }));
      }
      if (opts.unit || opts.serial || opts.imei) return api.place(product, unit, opts);
      // A quantity from a scale label is in the base unit, so no unit picker.
      if (units.length > 1 && opts.qty == null) {
        usePosUi.setState({ picker: { kind: 'unit', product, units, opts } });
        return true;
      }
      return api.place(product, unit, opts);
    },

    async addCombo(combo, qty = 1) {
      if (!counter.rules.negativeStock && shopId) {
        for (const part of combo.items) {
          const have = await offline.products.stock(shopId, part.productId, part.variantId ?? null);
          if (have != null && have < part.quantity * qty) {
            const p = await offline.products.get(part.productId, shopId);
            return fail(t('{{name}}: only {{have}} in stock, the combo needs {{need}}', { name: p?.name ?? '', have: Number(have.toFixed(2)), need: part.quantity * qty }));
          }
        }
      }
      const r = addComboLine(useBill.getState().lines, combo, qty);
      useBill.getState().setLines(() => r.lines, r.lineId);
      added(combo.name);
      return true;
    },

    async addQuickKey(key, combos) {
      if (key.comboId) {
        const c = combos.find((x) => x.id === key.comboId);
        return c ? api.addCombo(c) : fail(t('Combo not found'));
      }
      if (!key.productId) return fail(t('This quick key has no product'));
      const product = await offline.products.get(key.productId, shopId);
      if (!product) return fail(t('Product not found'));
      const v = key.variantId ? product.variants.find((x) => x.id === key.variantId) : undefined;
      const unit = key.unitId ? unitsOf(product, v?.id).find((u) => u.id === key.unitId) : undefined;
      return api.addProduct(product.id, {
        ...(unit && { unit }),
        ...(v && { variant: { id: v.id, name: v.name, price: v.price, wholesalePrice: v.wholesalePrice, creditPrice: v.creditPrice, stock: v.stock } }),
      });
    },

    async addScaleLabel(code) {
      const label = parseScaleLabel(code);
      if (!label) return false;
      if (await offline.products.byBarcode(code, shopId)) return false;
      for (const c of label.codes) {
        const hit = await offline.products.byBarcode(c, shopId);
        if (!hit) continue;
        const qty = scaleQuantity(hit.product.unit, label.grams);
        if (qty == null) continue;
        if (!(label.grams > 0)) { fail(t('The scale label shows weight 0')); return true; }
        await api.addProduct(hit.product.id, { qty });
        return true;
      }
      return false;
    },

    async handleCode(raw, o = {}) {
      const code = raw.trim();
      if (!code) return false;
      const withQty: AddOptions = o.qty && o.qty > 0 ? { qty: o.qty } : {};
      if (config.scan && await config.scan(code, api)) return true;
      const lower = code.toLowerCase();
      const combo = o.combos?.find((b) => b.barcode?.toLowerCase() === lower || b.sku?.toLowerCase() === lower);
      if (combo) return api.addCombo(combo, o.qty && o.qty > 0 ? o.qty : 1);
      const hit = await offline.products.byBarcode(code, shopId);
      if (hit) {
        const p = hit.product;
        const v = hit.variantId ? p.variants.find((x) => x.id === hit.variantId) : undefined;
        const variant = v ? { id: v.id, name: v.name, price: v.price, wholesalePrice: v.wholesalePrice, creditPrice: v.creditPrice, stock: v.stock } : undefined;
        // A pack barcode (carton, dozen) says which pack: no unit picker.
        const unit = hit.pack && !hit.pack.isBase ? packUnit(hit.pack, variant?.price ?? p.price) : undefined;
        return api.addProduct(p.id, { ...withQty, ...(variant && { variant }), ...(unit && { unit }) });
      }
      if (!o.quiet) fail(t('Barcode "{{code}}" not found', { code }));
      return false;
    },

    step(lineId, delta) {
      const r = stepLine(useBill.getState().lines, lineId, delta);
      if (!r.ok) { fail(r.reason === 'locked' ? t('Serial / IMEI item: one only') : t('Not enough stock')); return; }
      haptic('select');
      useBill.getState().setLines(() => repriced(r.lines, lineId), lineId);
    },
    setQty(lineId, qty) {
      const r = setLineQty(useBill.getState().lines, lineId, qty);
      if (!r.ok) { fail(r.reason === 'locked' ? t('Serial / IMEI item: one only') : t('Only {{qty}} in stock', { qty: Number((r.available ?? 0).toFixed(2)) })); return; }
      useBill.getState().setLines(() => repriced(r.lines, lineId), lineId);
    },
    setPrice: (lineId, price) => useBill.getState().setLines((l) => setLinePrice(l, lineId, price), lineId),
    setLineDiscount: (lineId, rupees) => useBill.getState().setLines((l) => setLineDiscount(l, lineId, rupees), lineId),
    setNote: (lineId, note) => useBill.getState().setLines((l) => setLineNote(l, lineId, note)),
    setLineTier: (lineId, tier) => useBill.getState().setLines((l) => setLineTier(l, lineId, tier, useBill.getState().tier), lineId),
    remove: (lineId) => { haptic('impact'); useBill.getState().setLines((l) => l.filter((x) => x.id !== lineId), null); },

    async hold(label) {
      const bill = useBill.getState();
      if (!bill.lines.length) return;
      await offline.heldBills.save<HeldBillData>({ id: posHeldId(), label: label || bill.customer?.name || undefined, shopId, data: snapshotBill() });
      bill.clear(counter.parts.priceTiers ? counter.parts.defaultPriceTier : 'RETAIL');
      void queryClient.invalidateQueries({ queryKey: ['offline', 'pos', 'held'] });
      haptic('success');
      toast.success(t('Bill held'));
    },

    async resume(held) {
      const bill = useBill.getState();
      if (bill.lines.length) await offline.heldBills.save<HeldBillData>({ id: posHeldId(), label: bill.customer?.name || undefined, shopId, data: snapshotBill() });
      await offline.heldBills.remove(held.id);
      // The held lines keep their prices: the bill goes back to the tier it was held at.
      bill.load({ ...held.data, lastLineId: null });
      void queryClient.invalidateQueries({ queryKey: ['offline', 'pos', 'held'] });
      haptic('success');
      toast.success(t('Bill resumed'));
    },
  };
  return api;
}

/** The counter API for the active branch, industry and shop rules. */
export function usePos(): PosApi {
  const shopId = shopParam(useAuthStore((s) => s.currentShopId)) ?? null;
  const counter = useCounter();
  const { id: industry } = useIndustry();
  const config = useMemo(() => posConfigFor(industry), [industry]);
  return useMemo(() => createApi(shopId, counter, config), [shopId, counter, config]);
}
