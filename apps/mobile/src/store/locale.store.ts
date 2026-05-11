import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { I18nManager } from 'react-native';

export type Locale = 'en' | 'ur';

interface LocaleState {
  locale: Locale;
  isRTL: boolean;
  /**
   * Persists the locale and applies I18nManager flags.
   * Returns true if app reload is REQUIRED (RTL state changed).
   */
  setLocale: (locale: Locale) => Promise<{ needsReload: boolean }>;
  initialize: () => Promise<void>;
}

const computeIsRTL = (locale: Locale) => locale === 'ur';

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: 'en',
  // Initial value reflects what the NATIVE side has — trust this on app start
  isRTL: I18nManager.isRTL,

  setLocale: async (locale) => {
    const targetRTL = computeIsRTL(locale);
    const currentNativeRTL = I18nManager.isRTL;
    const needsReload = currentNativeRTL !== targetRTL;

    // Persist new locale immediately
    await SecureStore.setItemAsync('locale', locale);

    // Apply native RTL flags. These take effect on NEXT JS reload.
    if (needsReload) {
      I18nManager.allowRTL(targetRTL);
      I18nManager.forceRTL(targetRTL);
    }

    // Update JS state. We reflect the NATIVE current state (not target)
    // for isRTL, because the layout in this session still uses the native flag.
    set({ locale, isRTL: I18nManager.isRTL });

    return { needsReload };
  },

  initialize: async () => {
    const stored = await SecureStore.getItemAsync('locale');
    const locale = (stored as Locale) || 'en';
    const targetRTL = computeIsRTL(locale);

    // If saved locale and native RTL flag disagree, fix the native flag
    // (will take effect after a reload). DO NOT call forceRTL() here on
    // every launch — only when there's a mismatch — to avoid an infinite
    // reload loop.
    if (I18nManager.isRTL !== targetRTL) {
      I18nManager.allowRTL(targetRTL);
      I18nManager.forceRTL(targetRTL);
      // We can't reload from here (initialize runs before navigation is
      // ready). UI layer should detect the mismatch and prompt reload.
    }

    set({ locale, isRTL: I18nManager.isRTL });
  },
}));
