import { useEffect, useRef, useState } from 'react';
import { useUpdateSettings } from './useSettings';
import type { TenantSettings } from '../api/settings.api';

/**
 * Local draft with a debounced save. Every change made inside the debounce
 * window is collected and sent in one request, so quick edits to several
 * fields are all saved. A refetch keeps edits that are still waiting to save.
 */
export function useAutoSave(initial: TenantSettings) {
  const [draft, setDraft] = useState<TenantSettings>(initial);
  const [dirty, setDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Partial<TenantSettings>>({});
  const update = useUpdateSettings();

  useEffect(() => {
    setDraft({ ...initial, ...pendingRef.current });
    if (!Object.keys(pendingRef.current).length) setDirty(false);
  }, [initial]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const flush = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    const patch = pendingRef.current;
    if (!Object.keys(patch).length) return;
    pendingRef.current = {};
    update.mutate(patch, {
      onSuccess: () => { if (!Object.keys(pendingRef.current).length) setDirty(false); },
      // Put the failed fields back so the next save retries them.
      onError: () => { pendingRef.current = { ...patch, ...pendingRef.current }; },
    });
  };

  const set = <K extends keyof TenantSettings>(key: K, value: TenantSettings[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    pendingRef.current = { ...pendingRef.current, [key]: value };
    setDirty(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(flush, 800);
  };

  return { draft, set, saveNow: flush, dirty, saving: update.isPending };
}
