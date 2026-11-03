/** Shared team queries: role presets, permission groups, distribution presets. */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { useAuthStore } from '@/core/auth/store';
import { DEFAULT_ROLE_PERMISSIONS, permissionGroupsFor, isOwner } from '@/core/permissions';
import { useIndustry } from '@/modules/shell/hooks/useIndustry';
import { teamApi } from '../api/organization';

export interface DistributionPreset { key: string; label: string; role: 'STAFF' | 'MANAGER'; description: string; permissions: string[] }

/** Role presets: the server's list for the owner, else the synced copy in core. */
export function useRoleDefaults(): Record<string, string[]> {
  const owner = isOwner(useAuthStore((s) => s.user?.role));
  const q = useQuery({ queryKey: ['team-permissions-catalog'], queryFn: teamApi.catalog, enabled: owner, staleTime: 10 * 60_000, retry: false });
  return (q.data?.defaultsByRole as Record<string, string[]> | undefined) ?? (DEFAULT_ROLE_PERMISSIONS as Record<string, string[]>);
}

/** Permission groups for this business's industry. */
export function usePermissionGroups() {
  const { id } = useIndustry();
  return useMemo(() => permissionGroupsFor(id), [id]);
}

/** Order Booker, Delivery, Van and Distribution Manager presets (empty while distribution is off). */
export function useDistributionPresets(): DistributionPreset[] {
  const q = useQuery({
    queryKey: ['distribution-presets'],
    queryFn: () => apiClient.get('/distribution/presets').then((r) => (r.data?.data ?? r.data) as { presets: DistributionPreset[] }),
    staleTime: 10 * 60_000,
    retry: false,
  });
  return q.data?.presets ?? [];
}
