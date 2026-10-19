/** Appliance details (type, size, warranty, fitting) for every product, keyed by product id. */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { applianceProductsApi } from '../api/products.api';
import { PROFILE_KEY } from './meta';

export function useApplianceProfiles() {
  const { data } = useQuery({ queryKey: [PROFILE_KEY, 'all'], queryFn: () => applianceProductsApi.list(), staleTime: 5 * 60_000 });
  return useMemo(() => new Map((data ?? []).map((p) => [p.productId, p])), [data]);
}
