/**
 * Everything that can go on a purchase bill: products (with their pack
 * units, e.g. carton = 24) and, for bakeries, raw materials. Built once and
 * searched in memory, so typing and scanning are instant and work offline.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { offlineProductsApi } from '@core/lib/offline/offlineProducts';
import { productUnitsApi, type ProductUnit } from '@modules/inventory/products/api/product-units.api';

export interface UnitChoice {
  /** ProductUnit id; null for the base unit or a purchase-only unit. */
  id: string | null;
  name: string;
  /** Base units in one of this unit. */
  rate: number;
  barcode?: string | null;
}

export interface Source {
  key: string;
  kind: 'product' | 'ingredient';
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  baseUnit: string;
  stock: number;
  lowAt: number;
  /** Cost of one base unit today. */
  cost: number;
  /** Selling price of one base unit (products). */
  price?: number;
  hasVariants?: boolean;
  expiryTracked?: boolean;
  isRaw?: boolean;
  category?: string | null;
  image?: string | null;
  units: UnitChoice[];
  hay: string;
}

export function usePurchaseSources(withIngredients: boolean) {
  const productsQ = useQuery({
    queryKey: ['purchase-sources', 'products'],
    queryFn: () => offlineProductsApi.list({ page: 1, limit: 100_000 }),
    staleTime: 60_000,
  });
  const unitsQ = useQuery({
    queryKey: ['pos-product-units'],
    queryFn: () => productUnitsApi.listAll(),
    staleTime: 5 * 60_000,
  });
  const ingredientsQ = useQuery({
    queryKey: ['purchase-sources', 'ingredients'],
    queryFn: async () => {
      const { ingredientsApi } = await import('@industries/bakery/api/ingredients.api');
      return ingredientsApi.list({});
    },
    enabled: withIngredients,
    staleTime: 60_000,
  });

  const sources = useMemo<Source[]>(() => {
    const unitsBy = new Map<string, ProductUnit[]>();
    for (const u of (Array.isArray(unitsQ.data) ? unitsQ.data : []) as ProductUnit[]) {
      if (!u.isActive || u.variantId) continue;
      const list = unitsBy.get(u.productId) ?? [];
      list.push(u);
      unitsBy.set(u.productId, list);
    }
    const products = ((productsQ.data?.items ?? []) as any[]).filter((p) => p.isActive !== false).map((p): Source => {
      const extra = (unitsBy.get(p.id) ?? [])
        .filter((u) => (u.unitName || '').toLowerCase() !== (p.unit || '').toLowerCase())
        .sort((a, b) => a.conversionRate - b.conversionRate)
        .map((u) => ({ id: u.id, name: u.unitName, rate: Number(u.conversionRate) || 1, barcode: u.barcode }));
      return {
        key: `p:${p.id}`, kind: 'product', id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, baseUnit: p.unit || 'pcs',
        stock: Number(p.stock) || 0, lowAt: Number(p.lowStockAlert) || 0, cost: Number(p.costPrice) || 0, price: Number(p.price) || 0,
        hasVariants: !!p.hasVariants, expiryTracked: !!p.expiryTracked, isRaw: !!p.isRawMaterial,
        category: p.category?.name ?? null, image: p.images?.[0]?.url ?? p.imageUrl ?? null,
        units: [{ id: null, name: p.unit || 'pcs', rate: 1 }, ...extra],
        hay: [p.name, p.sku, p.barcode, p.category?.name, ...extra.map((u) => u.barcode)].filter(Boolean).join(' ').toLowerCase(),
      };
    });
    const ingredients = ((ingredientsQ.data ?? []) as any[]).filter((i) => i.isActive !== false).map((i): Source => ({
      key: `i:${i.id}`, kind: 'ingredient', id: i.id, name: i.name, sku: i.code, baseUnit: i.unit || 'kg',
      stock: Number(i.currentStock) || 0, lowAt: Number(i.reorderLevel ?? i.minStock) || 0, cost: Number(i.costPerUnit) || 0,
      isRaw: true, category: i.category, units: [{ id: null, name: i.unit || 'kg', rate: 1 }],
      hay: [i.name, i.code, i.category, i.brand, 'raw material kacha maal'].filter(Boolean).join(' ').toLowerCase(),
    }));
    return [...products, ...ingredients];
  }, [productsQ.data, unitsQ.data, ingredientsQ.data]);

  /** Exact barcode / SKU match, including pack barcodes (returns the pack unit). */
  const byCode = useMemo(() => {
    const m = new Map<string, { source: Source; unit: UnitChoice }>();
    for (const s of sources) {
      for (const c of [s.barcode, s.sku]) if (c) m.set(c.toLowerCase(), { source: s, unit: s.units[0] });
      for (const u of s.units) if (u.barcode) m.set(u.barcode.toLowerCase(), { source: s, unit: u });
    }
    return m;
  }, [sources]);

  return {
    sources,
    byCode,
    loading: productsQ.isLoading || unitsQ.isLoading || (withIngredients && ingredientsQ.isLoading),
    refresh: () => { void productsQ.refetch(); void unitsQ.refetch(); if (withIngredients) void ingredientsQ.refetch(); },
  };
}

/** Best matches for a search: all words must appear; names starting with the text first. */
export function searchSources(sources: Source[], text: string, limit = 30): Source[] {
  const q = text.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/);
  return sources
    .filter((s) => words.every((w) => s.hay.includes(w)))
    .sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)) || a.name.localeCompare(b.name))
    .slice(0, limit);
}
