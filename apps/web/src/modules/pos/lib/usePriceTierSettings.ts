/**
 * The shop's price-tier setup (Settings → POS counter), read from the same
 * `/settings/counter` query the counter uses. `on` is false until the owner
 * turns price tiers on, so screens can hide tier fields until then.
 */

import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { normalizePosCounter } from './posCounterConfig';

export function usePriceTierSettings() {
  const { data } = useQuery({ queryKey: ['settings', 'counter'], queryFn: () => settingsApi.counter(), staleTime: 5 * 60_000 });
  const c = normalizePosCounter(data?.posCounter);
  return {
    on: c.priceTiers,
    tiers: c.priceTierList,
    defaultTier: c.defaultPriceTier,
    creditOnUdhaar: c.tierCreditOnUdhaar,
    fromCustomer: c.tierFromCustomer,
    lineOverride: c.tierLineOverride,
    onReceipt: c.tierOnReceipt,
  };
}
