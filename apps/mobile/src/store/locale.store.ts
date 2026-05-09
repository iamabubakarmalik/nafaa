import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { I18nManager } from 'react-native';

export type Locale = 'en' | 'ur';

interface LocaleState {
  locale: Locale;
  isRTL: boolean;
  setLocale: (locale: Locale) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: 'en',
  isRTL: false,
  setLocale: async (locale) => {
    await SecureStore.setItemAsync('locale', locale);
    const isRTL = locale === 'ur';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
    }
    set({ locale, isRTL });
  },
  initialize: async () => {
    const stored = await SecureStore.getItemAsync('locale');
    const locale = (stored as Locale) || 'en';
    const isRTL = locale === 'ur';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
    }
    set({ locale, isRTL });
  },
}));
