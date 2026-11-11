/**
 * Plan data for the whole app.
 *
 * useEntitlements() is read by the sidebar, the banners, the plan gate and
 * any screen that hides or upsells a feature. It is cached per shop, kept for
 * offline use and refreshed when the window gets focus. While it is unknown
 * (first load, older API) every helper answers "allowed", so nothing is
 * hidden by mistake.
 */

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@core/stores/auth.store';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { clearPlanEnded } from '@core/api/billing-notice';
import { pricingApi, type Entitlements } from '../api/pricing.api';

export const ENTITLEMENTS_KEY = 'entitlements';
const REFRESH_KEYS = [ENTITLEMENTS_KEY, 'billing-overview', 'billing-invoices', 'billing-payments', 'subscription-current', 'subscription-pending', 'plan-usage'];

export function useEntitlements() {
  const tenantId = useAuthStore((s) => s.tenant?.id ?? null);
  const signedIn = useAuthStore((s) => !!s.accessToken);
  return useQuery({
    queryKey: [ENTITLEMENTS_KEY, tenantId],
    queryFn: async () => {
      const e = await pricingApi.entitlements();
      if (e && e.state !== 'expired') clearPlanEnded();
      return e;
    },
    enabled: signedIn && !!tenantId,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 10 * 60_000,
    retry: 1,
  });
}

/** True when the shop has the feature; true while unknown. */
export function hasFeature(e: Entitlements | undefined, key: string | string[]): boolean {
  if (!e) return true;
  const keys = Array.isArray(key) ? key : [key];
  return keys.some((k) => e.features.includes(k));
}

/** True when the optional module is turned on or in use; true while unknown. */
export function hasApp(e: Entitlements | undefined, key: string | string[]): boolean {
  if (!e) return true;
  const keys = Array.isArray(key) ? key : [key];
  return keys.some((k) => e.apps.includes(k));
}

export function useFeature(key: string | string[]): boolean {
  const { data } = useEntitlements();
  return hasFeature(data, key);
}

export function useApp(key: string | string[]): boolean {
  const { data } = useEntitlements();
  return hasApp(data, key);
}

export function usePricingCatalog() {
  return useQuery({ queryKey: ['pricing-catalog'], queryFn: pricingApi.catalog, staleTime: 10 * 60_000 });
}

export function useBillingOverview(enabled = true) {
  const canView = usePermission(PERMISSIONS.BILLING_VIEW);
  return useQuery({ queryKey: ['billing-overview'], queryFn: pricingApi.overview, enabled: enabled && canView, staleTime: 30_000, retry: 1 });
}

export function useRefreshBilling() {
  const qc = useQueryClient();
  return () => REFRESH_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export const errorText = (e: unknown, fallback: string) => {
  const m = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return Array.isArray(m) ? String(m[0]) : typeof m === 'string' && m ? m : fallback;
};

/** Turn add-ons on and off, move to the Free plan; every change refreshes the plan data. */
export function useAddOnActions() {
  const refresh = useRefreshBilling();
  const qc = useQueryClient();
  const turnOn = useMutation({
    mutationFn: ({ key, quantity }: { key: string; quantity?: number }) => pricingApi.turnOn(key, quantity ?? 1),
    onSuccess: (r) => { qc.setQueryData(['billing-overview'], r.overview); refresh(); },
  });
  const turnOff = useMutation({
    mutationFn: (key: string) => pricingApi.turnOff(key),
    onSuccess: (r) => { qc.setQueryData(['billing-overview'], r.overview); refresh(); },
  });
  const goFree = useMutation({
    mutationFn: pricingApi.goFree,
    onSuccess: (o) => { qc.setQueryData(['billing-overview'], o); clearPlanEnded(); refresh(); },
  });
  return useMemo(() => ({ turnOn, turnOff, goFree }), [turnOn, turnOff, goFree]);
}

export function useCanManageBilling() {
  return usePermission(PERMISSIONS.BILLING_MANAGE);
}
