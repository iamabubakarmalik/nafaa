/**
 * Appearance state: the four layers and the resolved result (mirror of the
 * web theme/store.ts). Persisted synchronously on the device so the first
 * frame already has the right colors, also offline.
 *
 * Read it through `useAppearance()` or `useTheme()`; nothing else should
 * keep its own copy of theme state.
 */

import { Appearance as RNAppearance } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { kvZustandStorage } from '@/core/storage/kv';
import {
  resolveAppearance,
  type AppearanceLayer, type ResolvedAppearance, type ThemeMode,
} from './appearance';

interface Layers {
  platform: AppearanceLayer | null;
  business: AppearanceLayer | null;
  personal: AppearanceLayer;
  industryColor: string | null;
}

interface AppearanceState extends Layers {
  systemDark: boolean;
  resolved: ResolvedAppearance;
  /** Whether the signed-in user may change the business layer. */
  canEditBusiness: boolean;

  setPersonal: (patch: AppearanceLayer) => void;
  replacePersonal: (layer: AppearanceLayer) => void;
  resetPersonal: (keys?: (keyof AppearanceLayer)[]) => void;
  setBusiness: (layer: AppearanceLayer | null) => void;
  setPlatform: (layer: AppearanceLayer | null) => void;
  setIndustryColor: (hex: string | null) => void;
  setSystemDark: (dark: boolean) => void;
  setCanEditBusiness: (can: boolean) => void;
  setMode: (mode: ThemeMode) => void;
}

const resolveFrom = (s: Layers) =>
  resolveAppearance({ platform: s.platform, business: s.business, personal: s.personal, industryColor: s.industryColor });

const initial: Layers = { platform: null, business: null, personal: {}, industryColor: null };

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set, get) => {
      const update = (patch: Partial<Layers>) => {
        const next = { ...get(), ...patch };
        set({ ...patch, resolved: resolveFrom(next) });
      };
      return {
        ...initial,
        systemDark: RNAppearance.getColorScheme() === 'dark',
        resolved: resolveFrom(initial),
        canEditBusiness: false,

        setPersonal: (patch) => update({ personal: { ...get().personal, ...patch } }),
        replacePersonal: (layer) => update({ personal: { ...layer } }),
        resetPersonal: (keys) => {
          if (!keys) return update({ personal: {} });
          const personal = { ...get().personal };
          for (const k of keys) delete personal[k];
          update({ personal });
        },
        setBusiness: (layer) => update({ business: layer }),
        setPlatform: (layer) => update({ platform: layer }),
        setIndustryColor: (hex) => update({ industryColor: hex }),
        setSystemDark: (dark) => set({ systemDark: dark }),
        setCanEditBusiness: (can) => set({ canEditBusiness: can }),
        setMode: (mode) => update({ personal: { ...get().personal, mode } }),
      };
    },
    {
      name: 'nafaa.appearance',
      version: 1,
      storage: createJSONStorage(() => kvZustandStorage),
      partialize: (s) => ({ personal: s.personal, business: s.business, platform: s.platform, industryColor: s.industryColor }),
      merge: (persisted, current) => {
        const next = { ...current, ...(persisted as Partial<AppearanceState>) };
        return { ...next, resolved: resolveFrom(next) };
      },
    },
  ),
);

/** Resolved appearance plus whether dark mode is showing right now. */
export function useAppearance() {
  const resolved = useAppearanceStore((s) => s.resolved);
  const systemDark = useAppearanceStore((s) => s.systemDark);
  const isDark = resolved.mode === 'dark' || (resolved.mode === 'system' && systemDark);
  return { ...resolved, isDark };
}

/** Non-hook read for code outside React (haptics, toasts). */
export const getAppearance = () => useAppearanceStore.getState().resolved;
