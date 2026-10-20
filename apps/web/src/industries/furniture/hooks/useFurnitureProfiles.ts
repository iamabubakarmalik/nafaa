import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { furnitureProductsApi, type FurnitureProductProfile } from '../api/products.api';
import { FURNITURE_KEYS } from '../lib/meta';

/** Furniture details of every product, by product id. */
export function useFurnitureProfiles() {
  const q = useQuery({ queryKey: [FURNITURE_KEYS.profiles], queryFn: () => furnitureProductsApi.list(), staleTime: 60_000 });
  return useMemo(() => new Map<string, FurnitureProductProfile>((q.data ?? []).map((p) => [p.productId, p])), [q.data]);
}
