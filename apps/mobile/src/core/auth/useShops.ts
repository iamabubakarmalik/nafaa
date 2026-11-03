/** Branches the signed-in user can see (owners: all; staff: their own). */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from './store';
import { authApi } from './api';

export function useShops() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['shops', 'list'],
    queryFn: authApi.shops,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
}
