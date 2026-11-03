/**
 * Online store module: order desk, packing and returns scanning, COD,
 * couriers, selling costs, online products, customers, reports, ads and the
 * price calculator. Screens are routed from app/online; the shell mounts
 * useOnlineStore() once for push links and offline warm-up.
 */

import { registerPrewarm } from '@/core/offline';
import { PERMISSIONS } from '@/core/permissions';
import { ordersApi, couriersApi } from './api/online';
import { KEYS } from './lib/online';
import { useOnlinePushLinks } from './hooks/useOnlinePushLinks';
import { periodRange } from './lib/period';

export { onlineRouteFor } from './hooks/useOnlinePushLinks';

let warmed = false;
/** The order desk's first screens open offline after sign-in (saved screen data). */
function registerOnlinePrewarm() {
  if (warmed) return;
  warmed = true;
  const month = periodRange('month')!;
  registerPrewarm({
    permission: PERMISSIONS.SALES_VIEW,
    queryKey: [...KEYS.orders, 'counts', '', month.from, month.to],
    queryFn: () => ordersApi.list({ limit: 1, from: month.from, to: month.to }),
  });
  registerPrewarm({ permission: PERMISSIONS.SALES_VIEW, queryKey: KEYS.codSummary, queryFn: ordersApi.codSummary });
  registerPrewarm({ permission: PERMISSIONS.SALES_VIEW, queryKey: KEYS.couriers, queryFn: couriersApi.list });
  registerPrewarm({ permission: PERMISSIONS.SALES_VIEW, queryKey: KEYS.channels, queryFn: ordersApi.channels });
}

/** Mount once in the signed-in shell. */
export function useOnlineStore(signedIn: boolean) {
  registerOnlinePrewarm();
  useOnlinePushLinks(signedIn);
}
