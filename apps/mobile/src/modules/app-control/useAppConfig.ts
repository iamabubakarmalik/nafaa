/**
 * Remote app settings with an offline copy.
 *
 * The last good config is kept in storage and shown at once on the next start,
 * then refreshed from the server. Without network the stored copy is used; on
 * a first start without network the result stays empty and the app runs with
 * defaults (every feature on, no prompts).
 */

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAppConfig } from './api';
import { setup } from './setup';
import type { AppConfig, LocalizedText } from './types';

export const APP_CONFIG_QUERY_KEY = ['app-control', 'config'] as const;
const STORAGE_KEY = 'nafaa.appConfig.v1';

let memory: AppConfig | undefined;
let loaded: Promise<AppConfig | undefined> | null = null;

function loadStored(): Promise<AppConfig | undefined> {
  loaded ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => (raw ? (JSON.parse(raw) as AppConfig) : undefined))
    .catch(() => undefined)
    .then((cfg) => (memory ??= cfg));
  return loaded;
}

async function queryConfig(): Promise<AppConfig> {
  try {
    const fresh = await fetchAppConfig();
    memory = fresh;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)).catch(() => undefined);
    return fresh;
  } catch (err) {
    const stored = memory ?? (await loadStored());
    if (stored) return stored;
    throw err;
  }
}

/** Text in the current app language, falling back to English. */
export function pickText(text: LocalizedText | null | undefined, lang = setup().getLanguage()): string {
  if (!text) return '';
  return (text[lang] ?? '').trim() || text.en || '';
}

export function useAppConfig() {
  const qc = useQueryClient();
  const [stored, setStored] = useState<AppConfig | undefined>(memory);

  useEffect(() => {
    if (stored) return;
    let alive = true;
    void loadStored().then((cfg) => {
      if (!alive || !cfg) return;
      setStored(cfg);
      if (!qc.getQueryData(APP_CONFIG_QUERY_KEY)) qc.setQueryData(APP_CONFIG_QUERY_KEY, cfg, { updatedAt: 0 });
    });
    return () => { alive = false; };
  }, [qc, stored]);

  const query = useQuery({
    queryKey: APP_CONFIG_QUERY_KEY,
    queryFn: queryConfig,
    staleTime: 60_000,
    gcTime: Infinity,
    refetchInterval: 10 * 60_000,
    refetchOnReconnect: true,
    retry: 1,
    placeholderData: stored,
  });

  return {
    config: query.data,
    isLoading: query.isLoading && !query.data,
    refresh: query.refetch,
    t: pickText,
  };
}

/** Refetch the config now, e.g. after sign-in (announcements depend on the business). */
export function refreshAppConfig(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: APP_CONFIG_QUERY_KEY });
}
