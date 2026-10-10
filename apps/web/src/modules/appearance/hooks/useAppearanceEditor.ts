/**
 * Edits one appearance layer: the signed-in user's own preferences
 * ("personal") or the business defaults every staff member inherits
 * ("business").
 *
 * Personal edits go straight into the appearance store; AppearanceBridge
 * saves them to the server. Business edits are saved here (debounced) and
 * pushed into the store so the whole app updates immediately.
 *
 * For each field the editor reports where the current value comes from, so
 * the page can show "Using business default" and offer a reset.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  appearanceApi, APPEARANCE_QUERY_KEY, DEFAULT_APPEARANCE, resolveAppearance, useAppearanceStore,
  type Appearance, type AppearanceLayer, type StoredAppearance,
} from '@/design-system';

export type Scope = 'personal' | 'business';
export type ValueSource = 'personal' | 'business' | 'platform' | 'default';

const SAVE_DELAY_MS = 600;

export function useAppearanceEditor(scope: Scope) {
  const qc = useQueryClient();
  const { data: stored } = useQuery({ queryKey: APPEARANCE_QUERY_KEY, queryFn: appearanceApi.get, staleTime: 5 * 60_000 });
  const personal = useAppearanceStore((s) => s.personal) ?? {};
  const business = useAppearanceStore((s) => s.business) ?? {};
  const platform = useAppearanceStore((s) => s.platform) ?? {};
  const industryColor = useAppearanceStore((s) => s.industryColor);
  const { setPersonal, resetPersonal, setBusiness } = useAppearanceStore.getState();

  const [saving, setSaving] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const canEditBusiness = !!stored?.canEditBusiness;
  const layer: AppearanceLayer = scope === 'personal' ? personal : business;

  /** What this scope produces: business scope ignores personal overrides. */
  const resolved = useMemo(
    () => resolveAppearance({ platform, business, personal: scope === 'personal' ? personal : {}, industryColor }),
    [platform, business, personal, industryColor, scope],
  );

  const sourceOf = useCallback(<K extends keyof Appearance>(key: K): ValueSource => {
    if (scope === 'personal' && personal[key] !== undefined) return 'personal';
    if (business[key] !== undefined) return 'business';
    if (platform[key] !== undefined) return 'platform';
    return 'default';
  }, [scope, personal, business, platform]);

  const saveBusiness = useCallback((next: AppearanceLayer) => {
    setBusiness(next);
    window.clearTimeout(timer.current);
    setSaving(true);
    timer.current = window.setTimeout(async () => {
      try {
        const saved = await appearanceApi.saveBusiness(next);
        qc.setQueryData<StoredAppearance>(APPEARANCE_QUERY_KEY, (prev) => (prev ? { ...prev, business: saved } : prev));
      } catch {
        toast.error('Business look save nahi hua — dobara koshish karein');
      } finally {
        setSaving(false);
      }
    }, SAVE_DELAY_MS);
  }, [qc, setBusiness]);

  const set = useCallback(<K extends keyof Appearance>(key: K, value: Appearance[K] | null) => {
    if (scope === 'personal') {
      if (value === null) resetPersonal([key]);
      else setPersonal({ [key]: value } as AppearanceLayer);
      return;
    }
    const next: AppearanceLayer = { ...business };
    if (value === null) delete next[key];
    else (next as Record<string, unknown>)[key] = value;
    saveBusiness(next);
  }, [scope, business, setPersonal, resetPersonal, saveBusiness]);

  const resetAll = useCallback(() => {
    if (scope === 'personal') resetPersonal();
    else saveBusiness({});
  }, [scope, resetPersonal, saveBusiness]);

  return {
    scope,
    resolved,
    layer,
    stored,
    canEditBusiness,
    saving,
    isSet: (key: keyof Appearance) => layer[key] !== undefined,
    sourceOf,
    set,
    reset: (key: keyof Appearance) => set(key, null),
    resetAll,
    defaults: DEFAULT_APPEARANCE,
  };
}

export type AppearanceEditor = ReturnType<typeof useAppearanceEditor>;
