import { useEffect, useRef, useState } from 'react';
import { useUpdateSettings } from './useSettings';
import type { TenantSettings } from '../api/settings.api';

/**
 * Local draft + debounced auto-save.
 * Field pe input change → 800ms baad backend save → toast.
 * Save button bhi expose karta hai for instant save.
 */
export function useAutoSave(initial: TenantSettings) {
  const [draft, setDraft] = useState<TenantSettings>(initial);
  const [dirty, setDirty] = useState(false);
  const debounceRef = useRef<any>(null);
  const update = useUpdateSettings();

  // Sync initial when refetched
  useEffect(() => {
    setDraft(initial);
    setDirty(false);
  }, [initial]);

  const set = <K extends keyof TenantSettings>(key: K, value: TenantSettings[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      update.mutate({ [key]: value } as any, {
        onSuccess: () => setDirty(false),
      });
    }, 800);
  };

  const saveNow = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!dirty) return;
    update.mutate(draft, { onSuccess: () => setDirty(false) });
  };

  return { draft, set, saveNow, dirty, saving: update.isPending };
}
