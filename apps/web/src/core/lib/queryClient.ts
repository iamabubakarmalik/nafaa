import { QueryClient } from '@tanstack/react-query';

/**
 * The app's single QueryClient.
 *
 * It lives in its own module (rather than inside App.tsx) so non-React code —
 * the auth store, the shop switcher, the offline sync engine — can reach it
 * without importing the whole route tree.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      // ── OFFLINE-FIRST ──
      gcTime: 1000 * 60 * 60 * 24 * 7,   // 7 din cache rakho (persistence ke liye)
      networkMode: 'offlineFirst',        // offline me queries pause NAHI — API layer fallback karega
    },
    mutations: {
      networkMode: 'offlineFirst',        // offline mutations bhi chalein (queue handle karta hai)
    },
  },
});

/**
 * Throw away every branch-specific server response and refetch what is on
 * screen right now.
 *
 * `resetQueries()` — not `clear()`. `clear()` evicts the queries but leaves
 * their mounted observers orphaned: they report no data and never refetch, so
 * the page stays permanently empty until it is remounted. `resetQueries()`
 * drops the data *and* re-runs every active query, which is exactly what a
 * branch switch needs.
 */
export function resetServerCache(): void {
  void queryClient.resetQueries();
}
