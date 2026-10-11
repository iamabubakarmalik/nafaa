/** Shop name, address, phone and logo for printed headers, from receipt settings. */

import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { useAuthStore } from '@core/stores/auth.store';
import type { BusinessHeader } from './types';

interface SettingsShape {
  name?: string;
  phone?: string;
  settings?: { shopName?: string; shopAddress?: string; shopCity?: string; shopPhone?: string; logoUrl?: string };
}

export function useBusinessHeader(): BusinessHeader {
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const branch = useAuthStore((s) => s.user?.assignedShop?.name);
  const { data } = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get(), staleTime: 5 * 60_000 });
  const t = data as SettingsShape | undefined;
  const s = t?.settings;
  const name = s?.shopName || t?.name || tenantName || 'Nafaa';
  return {
    name: branch && branch !== name ? `${name} — ${branch}` : name,
    address: [s?.shopAddress, s?.shopCity].filter(Boolean).join(', ') || undefined,
    phone: s?.shopPhone || t?.phone || undefined,
    logoUrl: s?.logoUrl || undefined,
  };
}
