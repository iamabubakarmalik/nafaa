import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'en' | 'ur';

interface LocaleState {
  locale: Locale;
  isRTL: boolean;
  setLocale: (locale: Locale) => void;
  initialize: () => void;
}

const applyDOM = (locale: Locale) => {
  if (typeof document === 'undefined') return;
  const isRTL = locale === 'ur';
  document.documentElement.lang = locale;
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
};

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
