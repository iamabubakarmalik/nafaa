/** The shop's bill language (Settings → Language: settings.language), cached for offline printing. */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { normalizeLocale } from '@/core/i18n';
import { apiKey } from '@/core/offline';
import { kv } from '@/core/storage/kv';
import type { ReceiptLang } from './words';

const KEY = 'nafaa.receipt.lang';

export function useBillLanguage(): ReceiptLang {
  // Same query as the settings screens and the online store, so one request serves all.
  const q = useQuery({
    queryKey: apiKey('/settings'),
    queryFn: async () => (await apiClient.get('/settings')).data,
    staleTime: 10 * 60_000,
  });
  const raw = (q.data as { data?: { settings?: { language?: string } }; settings?: { language?: string } } | undefined);
  const lang = normalizeLocale(raw?.settings?.language ?? raw?.data?.settings?.language);
  if (lang) {
    if (kv.get<string | null>(KEY, null) !== lang) kv.set(KEY, lang);
    return lang;
  }
  return normalizeLocale(kv.get<string | null>(KEY, null)) ?? 'roman';
}
