/**
 * Fills the saved screen data right after sign-in and each full sync, so
 * the main screens open offline even if the user never visited them.
 *
 * Built-in: plain GET endpoints, cached under ['api', path, params] (the key
 * useApiQuery uses). Modules add their own with registerPrewarm().
 */

import { apiClient } from '@/core/api/client';
import { queryClient } from '@/core/query/client';
import { hasPermission } from '@/core/permissions';
import { useAuthStore } from '@/core/auth/store';
import type { OfflineEngine } from '../engine/engine';

export interface PrewarmEntry {
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
  /** Only for people with this permission. */
  permission?: string;
}

const extra: PrewarmEntry[] = [];

/** Adds a query to warm after sign-in (call at module load of a screen module). */
export function registerPrewarm(entry: PrewarmEntry): void {
  extra.push(entry);
}

export const apiKey = (path: string, params?: Record<string, unknown>) => ['api', path, params ?? {}] as const;

const get = (path: string, params?: Record<string, unknown>) => async () => (await apiClient.get(path, { params })).data;

const BUILT_IN: Array<{ path: string; params?: Record<string, unknown>; permission?: string }> = [
  { path: '/dashboard/overview', permission: 'dashboard.view' },
  { path: '/settings' },
  { path: '/settings/counter' },
  { path: '/sales/summary', permission: 'sales.view' },
  { path: '/customers/stats', permission: 'customers.view' },
  { path: '/expenses/overview', permission: 'expenses.view' },
  { path: '/suppliers', permission: 'suppliers.view' },
  { path: '/staff', permission: 'staff.view' },
  { path: '/notifications', params: { limit: 50 } },
  { path: '/shops' },
];

let running = false;

export async function prewarm(engine: OfflineEngine): Promise<void> {
  if (running || !engine.status.online) return;
  running = true;
  try {
    const user = useAuthStore.getState().user;
    const allowed = (p?: string) => !p || hasPermission(user?.role, user?.permissions, p as never);
    const entries: PrewarmEntry[] = [
      ...BUILT_IN.filter((b) => allowed(b.permission)).map((b) => ({ queryKey: apiKey(b.path, b.params), queryFn: get(b.path, b.params) })),
      ...extra.filter((e) => allowed(e.permission)),
    ];
    // Four at a time; a failed one is skipped quietly.
    for (let i = 0; i < entries.length; i += 4) {
      await Promise.allSettled(entries.slice(i, i + 4).map((e) =>
        queryClient.prefetchQuery({ queryKey: e.queryKey, queryFn: e.queryFn, staleTime: 60_000 })));
      if (!engine.status.online) break;
    }
  } finally {
    running = false;
  }
}
