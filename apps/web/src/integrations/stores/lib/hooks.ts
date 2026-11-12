/**
 * React Query hooks shared by the website pages: the shop's stores, the one
 * being edited, its full settings and the theme schema. Query keys live here
 * so a save on one page refreshes the others.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storesApi, type StoreSummary } from '../api/stores.api';

export const SK = {
  list: ['stores', 'list'] as const,
  schema: ['stores', 'theme-schema'] as const,
  full: (id: string) => ['stores', id, 'full'] as const,
  home: (id: string) => ['stores', id, 'home'] as const,
  theme: (id: string) => ['stores', id, 'theme'] as const,
  pages: (id: string) => ['stores', id, 'pages'] as const,
  menus: (id: string) => ['stores', id, 'menus'] as const,
  posts: (id: string) => ['stores', id, 'posts'] as const,
  redirects: (id: string) => ['stores', id, 'redirects'] as const,
  policies: (id: string) => ['stores', id, 'policies'] as const,
  collections: (id: string) => ['stores', id, 'collections'] as const,
  products: (id: string) => ['stores', id, 'products'] as const,
  domains: (id: string) => ['stores', id, 'domains'] as const,
  shipping: (id: string) => ['stores', id, 'shipping'] as const,
  checkout: (id: string) => ['stores', id, 'checkout'] as const,
  payments: (id: string) => ['stores', id, 'payments'] as const,
  analytics: (id: string, days: number) => ['stores', id, 'analytics', days] as const,
  migration: (id: string) => ['stores', id, 'migration'] as const,
};

/** Plan feature and add-on that unlock the website builder. */
export const WEBSITE_FEATURE = 'integration.website';
export const WEBSITE_ADDON = 'website';

export function useStoreList() {
  return useQuery({ queryKey: SK.list, queryFn: storesApi.list, staleTime: 30_000 });
}

// The store being edited (a shop may have up to 3). Remembered per browser.
const PICK_KEY = 'nafaa.website.store';
const listeners = new Set<() => void>();
const readPick = () => { try { return localStorage.getItem(PICK_KEY); } catch { return null; } };
export function pickStore(id: string) {
  try { localStorage.setItem(PICK_KEY, id); } catch { /* private mode */ }
  listeners.forEach((l) => l());
}

export function useCurrentStore(): { store: StoreSummary | null; list: ReturnType<typeof useStoreList> } {
  const list = useStoreList();
  const picked = useSyncExternalStore(useCallback((cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); }, []), readPick);
  const items = list.data?.items ?? [];
  // `?store=<id>` (links from the admin panel) picks that store once.
  const wanted = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('store');
  useEffect(() => { if (wanted && wanted !== picked && items.some((s) => s.id === wanted)) pickStore(wanted); }, [wanted, picked, items]);
  const store = items.find((s) => s.id === (wanted && items.some((x) => x.id === wanted) ? wanted : picked)) ?? items[0] ?? null;
  return { store, list };
}

export function useStoreFull(id: string | undefined) {
  return useQuery({ queryKey: SK.full(id ?? ''), queryFn: () => storesApi.get(id!), enabled: !!id, staleTime: 30_000 });
}

export function useThemeSchema() {
  return useQuery({ queryKey: SK.schema, queryFn: storesApi.schema, staleTime: 10 * 60_000 });
}

/** Public link for "Store dekhein": the live address, or the local storefront with ?store= in development. */
export function storeLink(store: Pick<StoreSummary, 'slug' | 'url'>, storefrontUrl?: string, path = '/') {
  if (import.meta.env.DEV && storefrontUrl) {
    const u = new URL(path, `${storefrontUrl.replace(/\/$/, '')}/`);
    u.searchParams.set('store', store.slug);
    return u.toString();
  }
  return new URL(path, `${store.url.replace(/\/$/, '')}/`).toString();
}
