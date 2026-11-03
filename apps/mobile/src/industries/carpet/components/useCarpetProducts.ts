/** Active products from the phone's mirror; callers keep the ones with a carpet unit. */

import { useProductSearch, type ProductRow } from '@/core/offline';

export function useCarpetProducts(enabled = true): { items: ProductRow[]; loading: boolean } {
  const q = useProductSearch({ limit: 1000, includeRaw: true }, { enabled });
  return { items: q.data ?? [], loading: q.isLoading };
}
