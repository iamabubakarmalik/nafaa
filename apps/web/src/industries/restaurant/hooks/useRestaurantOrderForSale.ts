import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../api/orders.api';

/**
 * Looks up the RestaurantOrder linked to a given Sale (by saleNumber).
 * Cached, so multiple slots on the same page share one network call.
 */
export function useRestaurantOrderForSale(saleId?: string, saleNumber?: string) {
  return useQuery({
    queryKey: ['restaurant-order-for-sale', saleId],
    queryFn: async () => {
      if (!saleId || !saleNumber) return null;
      try {
        const orders = await ordersApi.list({ search: saleNumber });
        return orders.find((o: any) => o.saleId === saleId) ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!saleId && !!saleNumber,
    staleTime: 30_000,
  });
}
