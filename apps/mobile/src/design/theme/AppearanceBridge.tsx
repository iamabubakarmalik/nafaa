/**
 * Keeps the appearance layers in step with the server (same rules as the web
 * AppearanceBridge):
 *  - GET /appearance after sign-in: platform, business and personal layers
 *  - the industry identity color is the accent fallback
 *  - personal changes are saved (debounced) with PUT /appearance/personal,
 *    so a choice follows the user to the web and other devices
 *  - the first load decides who wins: a stored copy replaces the device's,
 *    with none stored the device's choices are uploaded
 *  - a device change that has not reached the server yet (the app reloaded
 *    for a language change inside the save delay, or was offline) always
 *    wins and is uploaded; it is never replaced by an older server copy
 *  - the query is not kept in the saved screen data: the personal layer is
 *    already on the device, and a stale saved copy would undo a newer choice
 *
 * Render once inside the query provider (the root layout does).
 */

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { useAuthStore } from '@/core/auth/store';
import { kv } from '@/core/storage/kv';
import { industryIdentity } from '../industries/identities';
import { industryIdForBusinessType } from '../industries/businessTypes';
import type { AppearanceLayer } from './appearance';
import { useAppearanceStore } from './store';

export interface StoredAppearance {
  platform: AppearanceLayer | null;
  business: AppearanceLayer | null;
  personal: AppearanceLayer | null;
  canEditBusiness: boolean;
}

export const APPEARANCE_QUERY_KEY = ['appearance'] as const;
const SAVE_DELAY_MS = 800;
/** Set while the device's personal layer has changes the server has not got. */
const UNSAVED_KEY = 'nafaa.appearance.unsaved';

function pushPersonal() {
  const layer = useAppearanceStore.getState().personal ?? {};
  appearanceApi.savePersonal(layer)
    .then(() => {
      // A newer change made while this save was on its way keeps the flag.
      if (useAppearanceStore.getState().personal === layer) kv.remove(UNSAVED_KEY);
    })
    .catch(() => undefined);
}

export const appearanceApi = {
  get: () => apiClient.get<StoredAppearance>('/appearance').then((r) => r.data),
  savePersonal: (layer: AppearanceLayer) => apiClient.put<AppearanceLayer>('/appearance/personal', layer).then((r) => r.data),
  saveBusiness: (layer: AppearanceLayer) => apiClient.put<AppearanceLayer>('/appearance/business', layer).then((r) => r.data),
};

export function AppearanceBridge() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const businessType = useAuthStore((s) => s.tenant?.businessType);
  const qc = useQueryClient();
  const { setIndustryColor, setBusiness, setPlatform, replacePersonal, setCanEditBusiness } = useAppearanceStore.getState();

  const { data: stored } = useQuery({
    queryKey: APPEARANCE_QUERY_KEY,
    queryFn: appearanceApi.get,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
    retry: 1,
    meta: { persist: false },
  });

  useEffect(() => {
    setIndustryColor(isAuthenticated ? industryIdentity(industryIdForBusinessType(businessType)).color : null);
  }, [isAuthenticated, businessType, setIndustryColor]);

  const synced = useRef(false);
  const applyingRemote = useRef(false);

  const wasAuthenticated = useRef(isAuthenticated);
  useEffect(() => {
    if (!isAuthenticated) {
      synced.current = false;
      setBusiness(null);
      setCanEditBusiness(false);
      // After a sign-out the next account's stored choices win.
      if (wasAuthenticated.current) kv.remove(UNSAVED_KEY);
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, setBusiness, setCanEditBusiness]);

  useEffect(() => {
    if (!stored) return;
    applyingRemote.current = true;
    setPlatform(stored.platform);
    setBusiness(stored.business);
    setCanEditBusiness(!!stored.canEditBusiness);
    const local = useAppearanceStore.getState().personal ?? {};
    if (kv.get<boolean>(UNSAVED_KEY, false)) {
      qc.setQueryData<StoredAppearance>(APPEARANCE_QUERY_KEY, (old) => (old ? { ...old, personal: local } : old));
      pushPersonal();
    } else if (stored.personal && Object.keys(stored.personal).length) replacePersonal(stored.personal);
    else if (Object.keys(local).length) pushPersonal();
    applyingRemote.current = false;
    synced.current = true;
  }, [stored, setPlatform, setBusiness, replacePersonal, setCanEditBusiness, qc]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useAppearanceStore.subscribe((state, prev) => {
      if (state.personal === prev.personal || applyingRemote.current) return;
      // Marked before the save delay, so a reload in between keeps the choice.
      kv.set(UNSAVED_KEY, true);
      if (!synced.current) return;
      qc.setQueryData<StoredAppearance>(APPEARANCE_QUERY_KEY, (old) => (old ? { ...old, personal: state.personal } : old));
      clearTimeout(timer);
      timer = setTimeout(pushPersonal, SAVE_DELAY_MS);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [isAuthenticated, qc]);

  return null;
}
