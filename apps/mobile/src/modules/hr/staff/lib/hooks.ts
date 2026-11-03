/** Shared staff hooks: role presets, permission groups, distribution presets, refresh. */

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { useAuthStore } from '@/core/auth/store';
import { DEFAULT_ROLE_PERMISSIONS, hasAnyPermission, permissionGroupsFor, PERMISSIONS, type PermissionGroup } from '@/core/permissions';
import { useIndustry } from '@/modules/shell/hooks/useIndustry';
import { peopleApi, type Preset } from '../api/people';
import { AFFECTED_KEYS } from './meta';

/** Role presets: the server's list for the owner, else the synced copy in core. */
export function useRoleDefaults(): Record<string, string[]> {
  const isOwner = useAuthStore((s) => s.user?.role === 'OWNER' || s.user?.role === 'SUPER_ADMIN');
  const q = useQuery({ queryKey: ['team-permissions-catalog'], queryFn: peopleApi.catalog, enabled: isOwner, staleTime: 10 * 60_000, retry: false });
  return (q.data?.defaultsByRole as Record<string, string[]> | undefined) ?? (DEFAULT_ROLE_PERMISSIONS as Record<string, string[]>);
}

/** Permission groups for this shop's industry. */
export function usePermissionGroups(): PermissionGroup[] {
  const { id } = useIndustry();
  return useMemo(() => permissionGroupsFor(id), [id]);
}

/** Order Booker, Delivery and similar presets, only while distribution is on. */
export function useDistributionPresets(): Preset[] {
  const user = useAuthStore((s) => s.user);
  const can = !!user && hasAnyPermission(user.role, user.permissions, [PERMISSIONS.TEAM_VIEW, PERMISSIONS.STAFF_VIEW]);
  const settings = useQuery({
    queryKey: ['distribution', 'access'],
    queryFn: () => apiClient.get<{ data: { access?: { planAllows: boolean; enabled: boolean } } }>('/distribution/settings').then((r) => (r.data as any)?.access ?? r.data.data?.access ?? null),
    enabled: can, staleTime: 5 * 60_000, retry: false,
  });
  const on = !!settings.data?.planAllows && !!settings.data?.enabled;
  const q = useQuery({ queryKey: ['distribution', 'presets'], queryFn: peopleApi.presets, enabled: on, staleTime: 10 * 60_000, retry: false });
  return on ? q.data?.presets ?? [] : [];
}

export function useRefreshPeople() {
  const qc = useQueryClient();
  return () => AFFECTED_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}
