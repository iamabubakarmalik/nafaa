import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../api/orders.api';

/**
 * Looks up the RestaurantOrder linked to a given Sale (by its saleId).
 * Cached, so multiple slots on the same page share one network call.
 */
export function useRestaurantOrderForSale(saleId?: string, _saleNumber?: string) {
  return useQuery({
    queryKey: ['restaurant-order-for-sale', saleId],
    queryFn: async () => {
      if (!saleId) return null;
      try {
        const orders = await ordersApi.list({ saleId });
        return orders.find((o: any) => o.saleId === saleId) ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!saleId,
    staleTime: 30_000,
  });
}
