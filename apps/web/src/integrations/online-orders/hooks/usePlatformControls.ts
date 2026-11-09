/**
 * Platform-wide commerce controls set by the Nafaa admin
 * (GET /online-store/platform-controls): channel types whose pushes are
 * paused, modules that show a "Coming soon" tile instead of the module, and
 * default WhatsApp texts and custom statuses for shops that have none saved.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { useAuthStore } from '@core/stores/auth.store';
import { unwrap } from '../api/online-orders.api';

export type CommerceModule =
  | 'orders' | 'catalog' | 'dispatch' | 'couriers' | 'cod' | 'returns'
  | 'abandoned_carts' | 'growth' | 'whatsapp' | 'storefront' | 'payment_links' | 'social'
  | 'marketing'
  | 'retention' | 'affiliates';

export interface PlatformControls {
  pausedChannelTypes: string[];
  pausedNote: string | null;
  comingSoon: Partial<Record<CommerceModule, boolean>>;
  newShopDefaults: { autoLink: boolean; postOrderCosts: boolean; stockMode: 'all' | 'percent' | 'fixed' };
  whatsappTemplates: Array<{ key: string; label: string; text: string }>;
  customStatuses: Array<{ key: string; label: string; color: string }>;
}

/** Pages that belong to each module (the first one is the module's home). */
export const MODULE_PATHS: Record<CommerceModule, string[]> = {
  orders: ['/online-orders', '/online-orders/new'],
  catalog: ['/online-store/products', '/online-store/price-calculator'],
  dispatch: ['/online-orders/dispatch', '/online-orders/dispatch-scan', '/online-orders/dispatch-report', '/online-orders/post-office', '/online-orders/pack'],
  couriers: ['/online-store/couriers', '/online-store/couriers/rules'],
  cod: ['/online-orders/cod', '/online-orders/cod/reconcile', '/online-orders/payment-health'],
  returns: ['/online-orders/returns-scan'],
  abandoned_carts: ['/online-orders/abandoned'],
  growth: ['/online-orders/profit'],
  whatsapp: ['/online-store/whatsapp-templates'],
  storefront: [],
  payment_links: ['/online-store/payments'],
  social: ['/online-store/social'],
  marketing: ['/online-store/marketing'],
  retention: ['/online-store/campaigns', '/online-store/reviews', '/online-store/loyalty'],
  affiliates: ['/online-store/affiliates'],
};

/** The module a page belongs to, if any. */
export function moduleForPath(path: string): CommerceModule | undefined {
  return (Object.keys(MODULE_PATHS) as CommerceModule[]).find((m) => MODULE_PATHS[m].includes(path));
}

export function usePlatformControls() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['online-store', 'platform-controls'],
    queryFn: () => apiClient.get('/online-store/platform-controls').then((r) => unwrap<PlatformControls>(r)),
    enabled: isAuthenticated,
    staleTime: 10 * 60_000,
    retry: 1,
  });
}

/** True when the admin has replaced this module with a "Coming soon" tile. */
export function useModuleSoon() {
  const soon = usePlatformControls().data?.comingSoon ?? {};
  return (path: string) => {
    const m = moduleForPath(path);
    return m ? !!soon[m] : false;
  };
}
