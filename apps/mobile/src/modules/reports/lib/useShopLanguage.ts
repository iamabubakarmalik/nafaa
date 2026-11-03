/** The shop's bill language (Settings), used for customer-facing texts. Shares the cached /settings request. */

import { useQuery } from '@tanstack/react-query';
import type { MessageLang } from '@nafaa/core/customers';
import { apiClient } from '@/core/api/client';
import { useAuthStore } from '@/core/auth/store';
import { apiKey } from '@/core/offline';

export function useShopLanguage(): MessageLang {
  const q = useQuery({ queryKey: apiKey('/settings'), queryFn: async () => (await apiClient.get('/settings')).data, staleTime: 10 * 60_000 });
  const raw = (q.data as { settings?: { language?: string } } | undefined)?.settings?.language;
  return raw === 'en' || raw === 'ur' || raw === 'roman' ? raw : 'roman';
}

export function useShopName(): string {
  return useAuthStore((st) => st.tenant?.name) ?? 'Nafaa';
}
