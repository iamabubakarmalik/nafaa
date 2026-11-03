/**
 * React hooks over the offline engine. Lookups are React Query queries
 * under ['offline', kind, ...]; they refresh by themselves when the engine
 * changes that data (a download, a sale, a sync).
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { useAuthStore } from '@/core/auth/store';
import type { CustomerSearch, ProductSearch, SalesQuery } from '../engine/lookups';
import type { CustomerRow, OutboxItem, ProductRow, SaleRow, SyncNote } from '../engine/types';
import { requireEngine, useEngineStatus } from './runtime';
import { apiKey } from './prewarm';

/** Product search on the phone (instant, works offline). Stock is for the active branch. */
export function useProductSearch(q: ProductSearch, opts: { enabled?: boolean } = {}): UseQueryResult<ProductRow[]> {
  const shopId = useAuthStore((s) => s.currentShopId);
  const params = { ...q, shopId: q.shopId === undefined ? shopId : q.shopId };
  return useQuery({
    queryKey: ['offline', 'products', 'search', params],
    queryFn: async () => (await requireEngine()).products.search(params),
    networkMode: 'always',
    placeholderData: (prev) => prev,
    staleTime: Infinity,
    enabled: opts.enabled ?? true,
  });
}

export function useProduct(id: string | null | undefined) {
  const shopId = useAuthStore((s) => s.currentShopId);
  return useQuery({
    queryKey: ['offline', 'products', 'one', id, shopId],
    queryFn: async () => (await requireEngine()).products.get(id!, shopId),
    networkMode: 'always',
    staleTime: Infinity,
    enabled: !!id,
  });
}

/** Customer search by name (any script) or phone, balances with pending work applied. */
export function useCustomerSearch(q: CustomerSearch, opts: { enabled?: boolean } = {}): UseQueryResult<CustomerRow[]> {
  return useQuery({
    queryKey: ['offline', 'customers', 'search', q],
    queryFn: async () => (await requireEngine()).customers.search(q),
    networkMode: 'always',
    placeholderData: (prev) => prev,
    staleTime: Infinity,
    enabled: opts.enabled ?? true,
  });
}

export function useCustomer(id: string | null | undefined) {
  return useQuery({
    queryKey: ['offline', 'customers', 'one', id],
    queryFn: async () => (await requireEngine()).customers.get(id!),
    networkMode: 'always',
    staleTime: Infinity,
    enabled: !!id,
  });
}

/** Recent bills (server's last 30 days plus bills waiting to sync), newest first. */
export function useSalesHistory(q: SalesQuery = {}): UseQueryResult<SaleRow[]> {
  const shopId = useAuthStore((s) => s.currentShopId);
  const params = { ...q, shopId: q.shopId === undefined ? shopId : q.shopId };
  return useQuery({
    queryKey: ['offline', 'sales', 'list', params],
    queryFn: async () => (await requireEngine()).sales.list(params),
    networkMode: 'always',
    placeholderData: (prev) => prev,
    staleTime: Infinity,
  });
}

export function useSale(id: string | null | undefined) {
  return useQuery({
    queryKey: ['offline', 'sales', 'one', id],
    queryFn: async () => (await requireEngine()).sales.get(id!),
    networkMode: 'always',
    staleTime: Infinity,
    enabled: !!id,
  });
}

/** Changes waiting to reach the server (and issues), oldest first. */
export function useOutbox(): { items: OutboxItem[]; isLoading: boolean } {
  const pending = useEngineStatus((s) => s.pending + s.issues);
  const q = useQuery({
    queryKey: ['offline', 'outbox', 'list', pending],
    queryFn: async () => (await requireEngine()).outbox.list(),
    networkMode: 'always',
    staleTime: Infinity,
  });
  return { items: q.data ?? [], isLoading: q.isLoading };
}

/** Changes the server would not take, with plain explanations and actions. */
export function useSyncIssues() {
  const count = useEngineStatus((s) => s.issues);
  const q = useQuery({
    queryKey: ['offline', 'issues', 'list', count],
    queryFn: async () => (await requireEngine()).issues.list(),
    networkMode: 'always',
    staleTime: Infinity,
  });
  return {
    issues: q.data ?? [],
    count,
    isLoading: q.isLoading,
    /** Send again (optionally with an edited body, e.g. with a manager PIN). */
    retry: async (id: string, patch?: { body?: unknown }) => (await requireEngine()).issues.retry(id, patch),
    retryAll: async () => (await requireEngine()).issues.retryAll(),
    /** Remove the change and undo it on the phone (stock, khata, the bill). Changes that need it go too. */
    discard: async (id: string) => (await requireEngine()).issues.discard(id),
    /** For "customer already exists": use the server's customer instead. */
    useExistingCustomer: async (opId: string, customerId: string) => (await requireEngine()).issues.useExistingCustomer(opId, customerId),
  };
}

/** Notes after sync, e.g. the server's bill total differed from the phone's. */
export function useSyncNotes(): { notes: SyncNote[]; unseen: number; markSeen: () => Promise<void> } {
  const q = useQuery({
    queryKey: ['offline', 'issues', 'notes'],
    queryFn: async () => (await requireEngine()).notes.list(),
    networkMode: 'always',
    staleTime: Infinity,
  });
  const notes = q.data ?? [];
  return { notes, unseen: notes.filter((n) => !n.seen).length, markSeen: async () => (await requireEngine()).notes.markSeen() };
}

/** Small lists from the last download: shops, categories, brands, staff, sellers, expense categories ... */
export function useOfflineList<T = Record<string, unknown>>(type: 'shop' | 'category' | 'brand' | 'expenseCategory' | 'incomeCategory' | 'seller' | 'staff' | 'register') {
  return useQuery({
    queryKey: ['offline', 'meta', 'list', type],
    queryFn: async () => (await requireEngine()).lists.get<T>(type),
    networkMode: 'always',
    staleTime: Infinity,
  });
}

/** Shop rules, receipt settings and the signed-in person's rights from the last download. */
export function useOfflineManifest() {
  return useQuery({
    queryKey: ['offline', 'meta', 'manifest'],
    queryFn: async () => (await requireEngine()).manifest(),
    networkMode: 'always',
    staleTime: Infinity,
  });
}

/**
 * A plain GET as a React Query, saved for offline reading and warmed after
 * sign-in when listed in prewarm.ts. Same key as prewarm uses.
 */
export function useApiQuery<T = unknown>(path: string, params?: Record<string, unknown>, opts: { enabled?: boolean; staleTime?: number } = {}) {
  return useQuery<T>({
    queryKey: apiKey(path, params),
    queryFn: async () => (await apiClient.get<T>(path, { params })).data,
    enabled: opts.enabled ?? true,
    staleTime: opts.staleTime ?? 60_000,
  });
}
