/**
 * Dairy counter (web dairy/pos/config.ts) on the shared POS: milk, dahi and
 * lassi are sold loose by litre or kg (the shared counter weighs by amount or by
 * weight), the evening rate applies from 3 pm when the shop has one, and the bulk
 * rate applies once the line's total quantity reaches the bulk minimum (hotels, tea
 * stalls). The rates come from the product profile cached on the phone.
 */

import { counterRate } from '@nafaa/core/industries/dairy';
import { msg } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { queryClient } from '@/core/query/client';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';
import { dairyProductsApi, type DairyProduct } from './api';
import { DAIRY_KEYS, slotNow } from './meta';

const profiles = async (): Promise<DairyProduct[]> => {
  const cached = queryClient.getQueryData<DairyProduct[]>([DAIRY_KEYS.profiles]);
  if (!isOnline()) return cached ?? [];
  return queryClient.fetchQuery({ queryKey: [DAIRY_KEYS.profiles], queryFn: () => dairyProductsApi.list({}), staleTime: 60_000 }).catch(() => cached ?? []);
};
const allowOnce = new Set<string>();

export const dairyPos: PosIndustryConfig = {
  ...generalPos,
  id: 'dairy',
  searchHint: msg('Doodh, dahi, lassi… ya barcode scan karein'),
  // Warm the rate profiles so repriceLine can read them without waiting.
  beforeAdd: (productId, opts, api) => {
    if (allowOnce.delete(productId)) return 'continue';
    void (async () => {
      await profiles();
      allowOnce.add(productId);
      const ok = await api.addProduct(productId, opts);
      if (!ok) allowOnce.delete(productId);
    })();
    return 'handled';
  },
  // Evening and bulk rates follow the line's total quantity (not just the first amount added).
  repriceLine: (line) => {
    const p = queryClient.getQueryData<DairyProduct[]>([DAIRY_KEYS.profiles])?.find((x) => x.productId === line.productId);
    if (!p) return undefined;
    return counterRate(p, line.basePrice / line.conversionRate, slotNow(), line.baseQuantity) * line.conversionRate;
  },
};

registerPosIndustry(dairyPos);
