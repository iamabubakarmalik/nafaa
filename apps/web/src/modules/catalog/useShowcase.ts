/**
 * Catalog page state: the active section's data, filters kept in the URL (so
 * a copied link opens the same view), the chosen view and sort, and the
 * filtered list with its counts.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useShopParam } from '@core/stores/auth.store';
import type { CatalogConfig, CatalogEntry, CatalogMode } from './types';

export type SortBy = 'featured' | 'new' | 'name' | 'priceLow' | 'priceHigh';
const PREF_KEY = 'nafaa-catalog-view';
const QUERY_KEY = 'catalog-showcase';

function readPrefs(): { mode?: CatalogMode; sort?: SortBy } {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch { return {}; }
}

/** Value counts for one facet across entries, most common first. */
function countBy(entries: CatalogEntry[], pick: (e: CatalogEntry) => string | string[] | undefined) {
  const map = new Map<string, number>();
  for (const e of entries) {
    const v = pick(e);
    for (const x of Array.isArray(v) ? v : v ? [v] : []) map.set(x, (map.get(x) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, count }));
}

export function useShowcase(config: CatalogConfig) {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const shopId = useShopParam();
  const saved = useMemo(readPrefs, []);
  const [modeState, setMode] = useState<CatalogMode | undefined>(saved.mode);
  const [sort, setSort] = useState<SortBy>(saved.sort ?? 'featured');
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [query, setQuery] = useState(search);
  const mode: CatalogMode = modeState && config.modes.includes(modeState) ? modeState : config.modes[0];

  useEffect(() => { try { localStorage.setItem(PREF_KEY, JSON.stringify({ mode: modeState, sort })); } catch { /* storage blocked */ } }, [modeState, sort]);

  const update = (patch: Record<string, string | null | undefined>) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    return next;
  }, { replace: true });

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search); update({ q: search.trim() || null }); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const section = config.sections.find((s) => s.id === params.get('sec')) ?? config.sections[0];
  const list = useQuery({
    queryKey: [QUERY_KEY, section.source.key, shopId ?? 'all'],
    queryFn: () => section.source.load({ shopId }),
    staleTime: 60_000,
  });
  const all = useMemo(() => list.data ?? [], [list.data]);

  const f = {
    cat: params.get('cat') ?? '',
    brand: params.get('brand') ?? '',
    featured: params.get('featured') === '1',
    stock: params.get('stock') === '1',
    min: params.get('min') ?? '',
    max: params.get('max') ?? '',
    quick: (params.get('quick') ?? '').split(',').filter(Boolean),
    facet: Object.fromEntries((config.facets ?? []).map((d) => [d.key, params.get(`f_${d.key}`) ?? ''])) as Record<string, string>,
  };
  const customer = params.get('view') === 'customer';

  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color?: string; count: number }>();
    for (const e of all) if (e.category) {
      const c = map.get(e.category.id) ?? { ...e.category, count: 0 };
      c.count += 1;
      map.set(e.category.id, c);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [all]);
  const brands = useMemo(() => countBy(all, (e) => e.brand ?? undefined), [all]);
  const facetValues = useMemo(() => Object.fromEntries((config.facets ?? []).map((d) => [d.key, countBy(all, (e) => e.facets?.[d.key])])), [all, config.facets]);

  const quickTests = (config.quick ?? []).filter((q) => f.quick.includes(q.id));
  const term = query.trim().toLowerCase();
  const min = Number(f.min || 0);
  const max = f.max ? Number(f.max) : Infinity;

  const items = useMemo(() => {
    const out = all.filter((e) => {
      if (f.cat && e.category?.id !== f.cat) return false;
      if (f.brand && e.brand !== f.brand) return false;
      if (f.featured && !e.featured) return false;
      if (f.stock && e.inStock === false) return false;
      if ((f.min || f.max) && (e.price < min || e.price >= max)) return false;
      for (const [k, v] of Object.entries(f.facet)) {
        if (!v) continue;
        const have = e.facets?.[k];
        if (Array.isArray(have) ? !have.includes(v) : have !== v) return false;
      }
      if (!quickTests.every((q) => q.test(e))) return false;
      if (term) {
        const hay = [e.name, e.description, e.brand, e.category?.name, e.keywords, ...(e.chips ?? []).map((c) => c.label)].join(' ').toLowerCase();
        if (!term.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    const by: Record<SortBy, (a: CatalogEntry, b: CatalogEntry) => number> = {
      featured: (a, b) => Number(b.featured) - Number(a.featured) || Number(b.inStock !== false) - Number(a.inStock !== false) || a.name.localeCompare(b.name),
      new: (a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
      name: (a, b) => a.name.localeCompare(b.name),
      priceLow: (a, b) => a.price - b.price,
      priceHigh: (a, b) => b.price - a.price,
    };
    return out.sort(by[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, params, term, sort]);

  const prices = all.map((e) => e.price).filter((p) => p > 0);
  const stats = {
    total: all.length,
    featured: all.filter((e) => e.featured).length,
    inStock: all.filter((e) => e.inStock).length,
    categories: categories.length,
    low: prices.length ? Math.min(...prices) : 0,
    high: prices.length ? Math.max(...prices) : 0,
  };

  const hasFilters = !!(term || f.cat || f.brand || f.featured || f.stock || f.min || f.max || f.quick.length || Object.values(f.facet).some(Boolean));

  return {
    section, setSection: (id: string) => update({ sec: id === config.sections[0].id ? null : id, cat: null, brand: null, quick: null, ...Object.fromEntries((config.facets ?? []).map((d) => [`f_${d.key}`, null])) }),
    all, items, categories, brands, facetValues, stats, f, hasFilters,
    loading: list.isLoading, fetching: list.isFetching, error: list.error,
    refresh: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
    search, setSearch, sort, setSort, mode, setMode,
    set: (key: 'cat' | 'brand' | 'min' | 'max', v: string) => update({ [key]: v || null }),
    setPrice: (lo: string, hi: string) => update({ min: lo || null, max: hi || null }),
    setFacet: (key: string, v: string) => update({ [`f_${key}`]: v || null }),
    toggleFeatured: () => update({ featured: f.featured ? null : '1' }),
    toggleStock: () => update({ stock: f.stock ? null : '1' }),
    toggleQuick: (id: string) => update({ quick: (f.quick.includes(id) ? f.quick.filter((x) => x !== id) : [...f.quick, id]).join(',') || null }),
    clear: () => {
      setSearch(''); setQuery('');
      update({ q: null, cat: null, brand: null, featured: null, stock: null, min: null, max: null, quick: null, ...Object.fromEntries((config.facets ?? []).map((d) => [`f_${d.key}`, null])) });
    },
    customer, setCustomer: (on: boolean) => update({ view: on ? 'customer' : null }),
  };
}

export type Showcase = ReturnType<typeof useShowcase>;
