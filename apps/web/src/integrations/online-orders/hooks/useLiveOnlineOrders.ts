import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@core/stores/auth.store';
import { onlineOrdersApi } from '../api/online-orders.api';

export const LIVE_ORDERS_KEY = ['online-orders-live'] as const;

/**
 * Pending online orders — ek hi query jo sidebar ka badge, naye order ka
 * popup aur Online Orders safha sab share karte hain (ek hi request).
 */
export function useLiveOnlineOrders() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const shopId = useAuthStore((s) => s.currentShopId);

  return useQuery({
    queryKey: [...LIVE_ORDERS_KEY, shopId],
    queryFn: onlineOrdersApi.live,
    enabled: isAuthenticated,
    refetchInterval: 12_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
    retry: 1,
  });
}
