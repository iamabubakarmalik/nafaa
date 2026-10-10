/**
 * Appearance state.
 *
 * Holds the four appearance layers and the resolved result. Only the personal
 * layer is persisted here (per device); platform and business layers come from
 * the API and are cached so the next launch paints correctly while offline.
 *
 * Components read from this store through `useAppearance()`; nothing else
 * should keep its own copy of theme state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  normalizeMode, resolveAppearance,
  type AppearanceLayer, type AppearanceLayers, type ResolvedAppearance, type ThemeMode,
} from './appearance';

interface AppearanceState extends Required<Pick<AppearanceLayers, 'platform' | 'business' | 'personal'>> {
  industryColor: string | null;
  systemPrefersDark: boolean;
  resolved: ResolvedAppearance;

  setPersonal: (patch: AppearanceLayer) => void;
  /** Replaces the personal layer with the copy stored on the server. */
  replacePersonal: (layer: AppearanceLayer) => void;
  resetPersonal: (keys?: (keyof AppearanceLayer)[]) => void;
  setBusiness: (layer: AppearanceLayer | null) => void;
  setPlatform: (layer: AppearanceLayer | null) => void;
  setIndustryColor: (hex: string | null) => void;
  setSystemPrefersDark: (dark: boolean) => void;
  /** Convenience for the light/dark/system switch in the profile menu. */
  setMode: (mode: ThemeMode) => void;
}

type Layers = Pick<AppearanceState, 'platform' | 'business' | 'personal' | 'industryColor'>;
const resolveFrom = (s: Layers) =>
  resolveAppearance({ platform: s.platform, business: s.business, personal: s.personal, industryColor: s.industryColor });

/** The previous theme store kept only the mode under this key. */
function legacyMode(): ThemeMode | undefined {
  try {
    const raw = localStorage.getItem('nafaa-theme');
    return raw ? normalizeMode(JSON.parse(raw)?.state?.mode) : undefined;
  } catch {
    return undefined;
  }
}

const initialPersonal: AppearanceLayer = (() => {
  const mode = typeof window !== 'undefined' ? legacyMode() : undefined;
  return mode ? { mode } : {};
})();

const initialLayers: Layers = { platform: null, business: null, personal: initialPersonal, industryColor: null };

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set, get) => {
      const update = (patch: Partial<AppearanceState>) => {
        const next = { ...get(), ...patch };
        set({ ...patch, resolved: resolveFrom(next) });
      };
      return {
        ...initialLayers,
        systemPrefersDark: false,
        resolved: resolveFrom(initialLayers),

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
        setSystemPrefersDark: (dark) => set({ systemPrefersDark: dark }),
        setMode: (mode) => update({ personal: { ...get().personal, mode } }),
      };
    },
    {
      name: 'nafaa-appearance',
      version: 1,
      partialize: (s) => ({ personal: s.personal, business: s.business, platform: s.platform, industryColor: s.industryColor }),
      // Recompute the resolved value from the restored layers instead of trusting a stale copy.
      merge: (persisted, current) => {
        const next = { ...current, ...(persisted as Partial<AppearanceState>) };
        return { ...next, resolved: resolveFrom(next) };
      },
    },
  ),
);

/** Resolved appearance plus whether dark mode is currently showing. */
export function useAppearance() {
  const resolved = useAppearanceStore((s) => s.resolved);
  const systemPrefersDark = useAppearanceStore((s) => s.systemPrefersDark);
  const isDark = resolved.mode === 'dark' || (resolved.mode === 'system' && systemPrefersDark);
  return { ...resolved, isDark };
}
