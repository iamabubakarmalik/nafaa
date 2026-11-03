/**
 * Whether distribution is usable for this business: the plan must carry the
 * feature and the switch in Settings must be on. Read once from
 * GET /distribution/settings and shared by every manager screen.
 */

import { useQuery } from '@tanstack/react-query';
import { t } from '@/core/i18n';
import { hasAnyPermission, PERMISSIONS } from '@/core/permissions';
import { useAuthStore } from '@/core/auth/store';
import { DIST_KEY, distributionApi, type SettingsResponse } from '../api/distribution.api';

export type DistributionState = 'loading' | 'on' | 'off' | 'plan';

const READERS = [PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.DISTRIBUTION_ORDERS_VIEW, PERMISSIONS.DISTRIBUTION_ORDERS_BOOK];

export function useDistributionSettings() {
  const user = useAuthStore((s) => s.user);
  const canRead = !!user && hasAnyPermission(user.role, user.permissions, READERS);
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

const ROLE_LABEL: Record<string, string> = { OWNER: t('Owner'), MANAGER: t('Manager'), CASHIER: t('Cashier') };

/** Staff who can use the delivery app, for the "Delivery wala" pickers. */
export function useDeliveryStaff(keep?: { id: string | null | undefined; name: string | null | undefined }[]) {
  const q = useQuery({ queryKey: [DIST_KEY, 'delivery-staff'], queryFn: distributionApi.deliveryStaff, staleTime: 5 * 60_000 });
  const list = (q.data ?? []).map((u) => ({ id: u.id, label: u.role === 'STAFF' ? u.fullName : `${u.fullName} (${ROLE_LABEL[u.role] ?? u.role})` }));
  for (const k of keep ?? []) {
    if (k.id && !list.some((u) => u.id === k.id)) list.push({ id: k.id, label: k.name ?? t('Delivery') });
  }
  return { list, isLoading: q.isLoading };
}
