import { useQuery } from '@tanstack/react-query';
import { carpetRollsApi, type CarpetProductSummary } from '@/api/carpet-rolls.api';

/**
 * Fetch carpet stock summary for a list of products.
 * Returns totalSqft, rollCount, price ranges, cut pieces info.
 */
export function useCarpetSummary(productIds: string[], enabled = true) {
  return useQuery({
    queryKey: ['carpet-product-summary', productIds.sort().join(',')],
    queryFn: () => carpetRollsApi.productSummary(productIds),
    enabled: enabled && productIds.length > 0,
    staleTime: 30_000, // 30s cache
  });
}
