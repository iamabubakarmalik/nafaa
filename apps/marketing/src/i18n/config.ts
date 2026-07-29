export const locales = ['en', 'ur'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ur: 'اردو',
};

export const localeNativeNames: Record<Locale, string> = {
  en: 'English',
  ur: 'اردو',
};

export const localeDirs: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ur: 'rtl',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇬🇧',
  ur: '🇵🇰',
};
