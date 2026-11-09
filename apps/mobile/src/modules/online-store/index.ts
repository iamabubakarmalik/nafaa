/**
 * Online store module: home, orders board (status moves, team tools, bulk
 * courier booking, labels), add / edit order, packing, dispatch and returns
 * scanning, COD and payment health, couriers, selling costs, profit, online
 * products, customers, abandoned carts, WhatsApp messages, reports, ads and
 * the price calculator. Screens are routed from app/online; the shell mounts
 * useOnlineStore() once for push links and offline warm-up. Later features
 * plug in through lib/extensions (home sections, order cards, menu links).
 */

import { registerPrewarm } from '@/core/offline';
import { PERMISSIONS } from '@/core/permissions';
import { ordersApi, couriersApi } from './api/online';
import { KEYS } from './lib/online';
import { useOnlinePushLinks } from './hooks/useOnlinePushLinks';
import { periodRange } from './lib/period';

export { onlineRouteFor } from './hooks/useOnlinePushLinks';
export { registerHomeSection, registerOrderCard, registerOnlineLink } from './lib/extensions';

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
