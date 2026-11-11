/**
 * What the shop may use (GET /plan-usage/entitlements), for the menu: optional
 * modules (online store, distribution) show only once turned on. While the
 * answer is unknown (offline first start, older API) nothing is hidden.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { useAuthStore } from '@/core/auth/store';

export interface Entitlements {
  state: 'trial' | 'active' | 'free' | 'grace' | 'expired';
  features: string[];
  /** Optional modules turned on or in use (add-on keys). */
  apps: string[];
}

export function useEntitlements() {
  const tenantId = useAuthStore((s) => s.tenant?.id ?? null);
  return useQuery({
    queryKey: ['entitlements', tenantId],
    queryFn: () => apiClient.get<Entitlements>('/plan-usage/entitlements').then((r) => r.data),
    enabled: !!tenantId,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

/** True when one of the add-on keys is on, or while entitlements are unknown. */
export function hasApp(e: Entitlements | undefined, keys: string[]): boolean {
  return !e || !Array.isArray(e.apps) || keys.some((k) => e.apps.includes(k));
}
