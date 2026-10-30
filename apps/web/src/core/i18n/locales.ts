/**
 * The languages the web app speaks.
 *
 * `en` is the default for new accounts. `roman` is Urdu written in Latin
 * letters, the language most screens were first written in, so it is also
 * the source language of the translation catalogs. `ur` is Urdu script and
 * the only right-to-left locale.
 */

export type Locale = 'en' | 'ur' | 'roman';

export interface LocaleInfo {
  id: Locale;
  /** Name in English, for logs and admin tools. */
  name: string;
  /** Name written in the language itself, shown in pickers. */
  native: string;
  /** One short line shown under the name so people recognise their language. */
  sample: string;
  /** Value for <html lang>. Roman Urdu is "ur-Latn" so Urdu-script CSS does not match it. */
  htmlLang: string;
  dir: 'ltr' | 'rtl';
}

export const LOCALES: readonly LocaleInfo[] = [
  { id: 'en', name: 'English', native: 'English', sample: "Today's sale: Rs 12,500", htmlLang: 'en', dir: 'ltr' },
  { id: 'ur', name: 'Urdu', native: 'اردو', sample: 'آج کی سیل: Rs 12,500', htmlLang: 'ur', dir: 'rtl' },
  { id: 'roman', name: 'Roman Urdu', native: 'Roman Urdu', sample: 'Aaj ki Sale: Rs 12,500', htmlLang: 'ur-Latn', dir: 'ltr' },
];

export const DEFAULT_LOCALE: Locale = 'en';

/** Locale whose text is used as catalog keys; its catalog holds only rewordings. */
export const SOURCE_LOCALE: Locale = 'roman';

export const localeInfo = (id: Locale): LocaleInfo => LOCALES.find((l) => l.id === id) ?? LOCALES[0];

/**
 * Reads any stored or legacy language value. Older builds and the tenant
 * settings use "roman_ur" for Roman Urdu.
 */
export function normalizeLocale(value: unknown): Locale | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (v === 'en' || v.startsWith('en-')) return 'en';
  if (v === 'roman' || v === 'roman_ur' || v === 'ur-latn') return 'roman';
  if (v === 'ur' || v === 'ur-pk' || v === 'ur-arab') return 'ur';
  return null;
}
