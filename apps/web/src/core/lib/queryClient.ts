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
      /**
       * Tab/window par wapas aate hi data taaza.
       *
       * Pehle ye `false` tha. Dukaan-daar Purchases me maal
       * khareedta, phir POS ki tab par jata — aur POS wahi purana
       * stock dikhata rehta jab tak safha reload na karo. Logon ko
       * "cache clear karo" kehna parta tha.
       *
       * `staleTime` 30 second hai, is liye baar baar tab badalne
       * par bhi server par bojh nahi parta.
       */
      refetchOnWindowFocus: true,
      /** Net wapas aate hi bhi taaza kar lein */
      refetchOnReconnect: true,
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
