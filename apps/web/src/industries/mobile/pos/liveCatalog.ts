/**
 * The counter's live list of phones and used phones for this branch. Kept
 * by the query cache, so the last list still shows when the internet drops.
 */

import { useQuery } from '@tanstack/react-query';
import { useShopParam } from '@core/stores/auth.store';
import { mobilePosApi } from '../api/mobile-pos.api';

export const CATALOG_KEY = 'mobile-pos-catalog';

export function useLiveCatalog() {
  const shopId = useShopParam();
  return useQuery({
    queryKey: [CATALOG_KEY, shopId],
    queryFn: () => mobilePosApi.catalog({ shopId: shopId || undefined }),
    enabled: !!shopId,
    staleTime: 15_000,
  });
}
