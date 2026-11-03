/** One report request: keyed by branch and period, kept on the phone, shown with its last-updated note offline. */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/core/auth/store';

export function useReport<T>(name: string, params: object, fn: () => Promise<T>, opts: { enabled?: boolean; refetchInterval?: number } = {}) {
  const shop = useAuthStore((s) => s.currentShopId);
  return useQuery({
    queryKey: ['report', name, shop, params],
    queryFn: fn,
    staleTime: 60_000,
    // Keep the old numbers while the period changes, never across different reports.
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[1] === name ? prev : undefined),
    enabled: opts.enabled ?? true,
    refetchInterval: opts.refetchInterval,
  });
}

/** Rupees without decimals for charts and tables. */
export const rs0 = (n: number | null | undefined) => `Rs ${Math.round(n ?? 0).toLocaleString('en-US')}`;
