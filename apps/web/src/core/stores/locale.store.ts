import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'en' | 'ur';

interface LocaleState {
  locale: Locale;
  isRTL: boolean;
  setLocale: (locale: Locale) => void;
  initialize: () => void;
}

/**
 * `<html lang>` and `dir` are owned by the design-system AppearanceProvider,
 * which also gates right-to-left layout until screens are translated.
 * This store only remembers the chosen locale.
 */
const applyDOM = (_locale: Locale) => undefined;

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: 'en',
      isRTL: false,

      setLocale: (locale) => {
        const isRTL = locale === 'ur';
        applyDOM(locale);
        set({ locale, isRTL });
      },

      initialize: () => {
        const locale = get().locale;
        const isRTL = locale === 'ur';
        applyDOM(locale);
        set({ isRTL });
      },
    }),
    {
      name: 'nafaa-locale',
      partialize: (state) => ({ locale: state.locale }),
    },
  ),
);
