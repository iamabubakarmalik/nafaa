/**
 * Everything the sending branch can send: its products with their own
 * branch stock (per variant), pack units, and — by industry — IMEI phones
 * and used phones (mobile) or serial units (electronics). Built once per
 * branch and searched in memory, so typing and scanning stay instant.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productUnitsApi, type ProductUnit } from '@modules/inventory/products/api/product-units.api';
import { mobilePosApi } from '@industries/mobile/api/mobile-pos.api';
import { CONDITION_LABELS } from '@industries/mobile/api/used-phones.api';
import { serialTrackingApi } from '@industries/electronics/api/serial-tracking.api';

export const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);

export interface UnitChoice {
  name: string;
  /** Base units in one of this unit. */
  rate: number;
  barcode?: string | null;
}

export interface VariantChoice {
  id: string;
  name: string;
  /** Stock at the sending branch. */
  stock: number;
  cost: number;
  colorHex?: string | null;
  barcode?: string | null;
  sku?: string | null;
}

export interface SendProduct {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  /** Cost of one base unit. */
  cost: number;
  /** Stock at the sending branch, all variants together. */
  stock: number;
  category?: string | null;
  image?: string | null;
  variants: VariantChoice[];
  units: UnitChoice[];
  /** How a line of it is sent: by count, by roll, by IMEI or by serial. */
  kind: 'plain' | 'carpet' | 'imei' | 'serial';
  hay: string;
}

export interface Device {
  key: string;
  kind: 'imei' | 'serial' | 'used';
  id: string;
  productId?: string;
  variantId?: string | null;
  name: string;
  ref: string;
  detail?: string;
  cost: number;
  hay: string;
}

export type CodeHit =
  | { type: 'product'; product: SendProduct; variant?: VariantChoice; unit?: UnitChoice }
  | { type: 'device'; device: Device };

export function useTransferSources(shopId: string, industryId?: string) {
  const mobile = industryId === 'mobile';
  const electronics = industryId === 'electronics';

  const stockQ = useQuery({
    queryKey: ['transfer-sources', 'shop-stock', shopId],
    queryFn: () => productsApi.shopStock(shopId),
    enabled: !!shopId,
    staleTime: 30_000,
  });
  const unitsQ = useQuery({ queryKey: ['pos-product-units'], queryFn: () => productUnitsApi.listAll(), staleTime: 5 * 60_000 });
  const mobileQ = useQuery({
    queryKey: ['mobile-pos-catalog', shopId, ''],
    queryFn: () => mobilePosApi.catalog({ shopId }),
    enabled: !!shopId && mobile,
    staleTime: 30_000,
  });
  const serialsQ = useQuery({
    queryKey: ['electronics-serials-for-transfer', shopId],
    queryFn: () => serialTrackingApi.list({ shopId, status: 'IN_STOCK' }),
    enabled: !!shopId && electronics,
    staleTime: 30_000,
  });

  const devices = useMemo<Device[]>(() => {
    const phones = (mobileQ.data?.phones ?? []).map((p): Device => ({
      key: `imei:${p.id}`, kind: 'imei', id: p.id, productId: p.productId, variantId: p.variantId ?? null,
      name: `${p.productName}${p.variant?.name ? ` (${p.variant.name})` : ''}`, ref: p.imei1,
      detail: [p.color, p.ptaStatus].filter(Boolean).join(' · ') || undefined, cost: Number(p.resolvedCostPrice) || 0,
      hay: [p.productName, p.variant?.name, p.imei1, p.imei2, p.serialNumber, p.color].filter(Boolean).join(' ').toLowerCase(),
    }));
    const used = (mobileQ.data?.usedPhones ?? []).map((u): Device => ({
      key: `used:${u.id}`, kind: 'used', id: u.id,
      name: `${u.brand} ${u.model}${u.storage ? ` ${u.storage}` : ''}`, ref: u.usedPhoneCode,
      detail: [CONDITION_LABELS[u.condition], u.color].filter(Boolean).join(' · ') || undefined, cost: Number(u.totalCost) || Number(u.buybackPrice) || 0,
      hay: [u.brand, u.model, u.storage, u.color, u.usedPhoneCode, u.imei1, 'used purana'].filter(Boolean).join(' ').toLowerCase(),
    }));
    const serials = (Array.isArray(serialsQ.data) ? serialsQ.data : []).map((s): Device => ({
      key: `serial:${s.id}`, kind: 'serial', id: s.id, productId: s.productId,
      name: s.product?.name ?? 'Serial unit', ref: s.serialNumber,
      detail: [s.imei && `IMEI ${s.imei}`, s.physicalCondition].filter(Boolean).join(' · ') || undefined,
      cost: Number(s.purchasePrice) || Number(s.product?.costPrice) || 0,
      hay: [s.product?.name, s.serialNumber, s.imei, s.imei2, s.macAddress].filter(Boolean).join(' ').toLowerCase(),
    }));
    return [...phones, ...used, ...serials];
  }, [mobileQ.data, serialsQ.data]);

  const products = useMemo<SendProduct[]>(() => {
    const unitsBy = new Map<string, ProductUnit[]>();
    for (const u of (Array.isArray(unitsQ.data) ? unitsQ.data : []) as ProductUnit[]) {
      if (!u.isActive || u.variantId) continue;
      unitsBy.set(u.productId, [...(unitsBy.get(u.productId) ?? []), u]);
    }
    const imeiProducts = new Set(devices.filter((d) => d.kind === 'imei').map((d) => d.productId));
    const serialProducts = new Set(devices.filter((d) => d.kind === 'serial').map((d) => d.productId));

    const byId = new Map<string, SendProduct>();
    for (const row of stockQ.data ?? []) {
      const p = row.product;
      if (!p || p.isActive === false) continue;
      let sp = byId.get(p.id);
      if (!sp) {
        const unit = p.unit || 'pcs';
        const extra = (unitsBy.get(p.id) ?? [])
          .filter((u) => (u.unitName || '').toLowerCase() !== unit.toLowerCase() && Number(u.conversionRate) > 0)
          .sort((a, b) => a.conversionRate - b.conversionRate)
          .map((u) => ({ name: u.unitName, rate: Number(u.conversionRate), barcode: u.barcode }));
        sp = {
          id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, unit, cost: Number(p.costPrice) || 0, stock: 0,
          category: p.category?.name ?? null, image: p.images?.[0]?.url ?? null, variants: [], units: [{ name: unit, rate: 1 }, ...extra],
          kind: CARPET_UNITS.has(unit) ? 'carpet' : imeiProducts.has(p.id) ? 'imei' : serialProducts.has(p.id) ? 'serial' : 'plain',
          hay: [p.name, p.sku, p.barcode, p.category?.name, ...extra.map((u) => u.barcode)].filter(Boolean).join(' ').toLowerCase(),
        };
        byId.set(p.id, sp);
      }
      const stock = Number(row.stock) || 0;
      sp.stock += stock;
      if (row.variantId && row.variant && p.hasVariants) {
        const v = row.variant;
        sp.variants.push({ id: v.id, name: v.name, stock, cost: Number(v.costPrice) || sp.cost, colorHex: v.colorHex, barcode: v.barcode, sku: v.sku });
        sp.hay += ` ${[v.name, v.barcode, v.sku].filter(Boolean).join(' ').toLowerCase()}`;
      }
    }
    return [...byId.values()];
  }, [stockQ.data, unitsQ.data, devices]);

  /** Exact barcode / SKU / IMEI / serial / used phone code. */
  const byCode = useMemo(() => {
    const m = new Map<string, CodeHit>();
    for (const p of products) {
      for (const c of [p.barcode, p.sku]) if (c) m.set(c.toLowerCase(), { type: 'product', product: p });
      for (const u of p.units) if (u.barcode) m.set(u.barcode.toLowerCase(), { type: 'product', product: p, unit: u });
      for (const v of p.variants) for (const c of [v.barcode, v.sku]) if (c) m.set(c.toLowerCase(), { type: 'product', product: p, variant: v });
    }
    for (const d of devices) {
      m.set(d.ref.toLowerCase(), { type: 'device', device: d });
      for (const w of d.hay.split(' ')) if (/^\d{14,16}$/.test(w)) m.set(w, { type: 'device', device: d });
    }
    return m;
  }, [products, devices]);

  return {
    products,
    devices,
    byCode,
    loading: stockQ.isLoading || (mobile && mobileQ.isLoading) || (electronics && serialsQ.isLoading),
  };
}

/** Best matches: all words must appear; names starting with the text first. */
export function searchIn<T extends { name: string; hay: string }>(list: T[], text: string, limit = 20): T[] {
  const q = text.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/);
  return list
    .filter((s) => words.every((w) => s.hay.includes(w)))
    .sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)) || a.name.localeCompare(b.name))
    .slice(0, limit);
}
