/**
 * Whether distribution is usable for this business: the plan must carry the
 * feature and the switch in Settings must be on. Read once from
 * GET /distribution/settings (open to anyone who can see orders, book them
 * or view settings) and shared by the sidebar, the page gate and the
 * reports tab.
 */

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MASK, useMasked } from '@modules/dashboard/engine/useMasked';
import { useAuthStore } from '@core/stores/auth.store';
import { hasAnyPermission, PERMISSIONS } from '@core/lib/permissions';
import { DIST_KEY, distributionApi, type SettingsResponse } from '../api/distribution.api';
import { rs } from '../lib/meta';

export type DistributionState = 'loading' | 'on' | 'off' | 'plan';

const READERS = [PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.DISTRIBUTION_ORDERS_VIEW, PERMISSIONS.DISTRIBUTION_ORDERS_BOOK];

export function useDistributionSettings() {
  const user = useAuthStore((s) => s.user);
  const canRead = !!user && hasAnyPermission(user.role as never, user.permissions, READERS);
  return useQuery<SettingsResponse>({
    queryKey: [DIST_KEY, 'settings'],
    queryFn: distributionApi.settings,
    enabled: canRead,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useDistributionState(): { state: DistributionState; data?: SettingsResponse } {
  const q = useDistributionSettings();
  if (q.isLoading && q.fetchStatus !== 'idle') return { state: 'loading' };
  const a = q.data?.access;
  if (!a) return { state: 'off' };
  if (!a.planAllows) return { state: 'plan', data: q.data };
  return { state: a.enabled ? 'on' : 'off', data: q.data };
}

export function useDistributionEnabled(): boolean {
  return useDistributionState().state === 'on';
}

/** Whole rupees for the distribution screens, hidden while the user hides sales. */
export function useMoney() {
  const { salesHidden } = useMasked();
  return useCallback((n: number | null | undefined) => (salesHidden ? MASK : rs(n)), [salesHidden]);
}

/**
 * Staff who can use the delivery app (distribution.delivery.report), for the
 * "Delivery wala" pickers. `keep` adds a person already chosen who no longer
 * has the permission, so the picker still shows who it is.
 */
export function useDeliveryStaff(keep?: { id: string | null | undefined; name: string | null | undefined }[]) {
  const q = useQuery({ queryKey: [DIST_KEY, 'delivery-staff'], queryFn: distributionApi.deliveryStaff, staleTime: 5 * 60_000 });
  const list = (q.data ?? []).map((u) => ({ id: u.id, label: u.role === 'STAFF' ? u.fullName : `${u.fullName} (${ROLE_LABEL[u.role] ?? u.role})` }));
  for (const k of keep ?? []) {
    if (k.id && !list.some((u) => u.id === k.id)) list.push({ id: k.id, label: k.name ?? 'Delivery' });
  }
  return { list, isLoading: q.isLoading };
}

const ROLE_LABEL: Record<string, string> = { OWNER: 'Owner', MANAGER: 'Manager', CASHIER: 'Cashier' };
