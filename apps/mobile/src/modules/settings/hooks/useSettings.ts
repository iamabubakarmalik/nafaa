/**
 * Settings data and saving. `useAutoSave` is the mobile twin of the web hook:
 * a local draft, a debounced save that sends every edit made inside the wait
 * as one request, and a refetch that never undoes edits still waiting.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from '@/core/net';
import { apiKey } from '@/core/offline';
import { settingsApi, type TenantSettings } from '../api/settings';

export const SETTINGS_KEY = ['settings'];

export function useSettings() {
  return useQuery({ queryKey: SETTINGS_KEY, queryFn: settingsApi.get, staleTime: 30_000 });
}

/** Settings changes need the server. */
export function useSettingsOnline() {
  return useOnlineStatus();
}

export function useAutoSave(initial: TenantSettings | undefined) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<TenantSettings | undefined>(initial);
  const [dirty, setDirty] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Partial<TenantSettings>>({});

  const save = useMutation({
    mutationFn: (patch: Partial<TenantSettings>) => settingsApi.update(patch),
    onSuccess: () => { setFailed(false); void qc.invalidateQueries({ queryKey: SETTINGS_KEY }); void qc.invalidateQueries({ queryKey: ['receipt-setup'] }); void qc.invalidateQueries({ queryKey: apiKey('/settings') }); },
  });

  useEffect(() => {
    if (!initial) return;
    setDraft({ ...initial, ...pending.current });
    if (!Object.keys(pending.current).length) setDirty(false);
  }, [initial]);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const patch = pending.current;
    if (!Object.keys(patch).length) return;
    pending.current = {};
    save.mutate(patch, {
      onSuccess: () => { if (!Object.keys(pending.current).length) setDirty(false); },
      onError: () => { pending.current = { ...patch, ...pending.current }; setFailed(true); },
    });
  }, [save]);

  useEffect(() => () => { if (timer.current) { clearTimeout(timer.current); flush(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = useCallback(<K extends keyof TenantSettings>(key: K, value: TenantSettings[K], opts: { now?: boolean } = {}) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    pending.current = { ...pending.current, [key]: value };
    setDirty(true);
    if (timer.current) clearTimeout(timer.current);
    if (opts.now) flush();
    else timer.current = setTimeout(flush, 800);
  }, [flush]);

  return { draft, set, flush, dirty, saving: save.isPending, failed };
}
