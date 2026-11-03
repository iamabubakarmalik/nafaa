/**
 * The languages the app speaks. Same ids and rules as the web
 * (apps/web/src/core/i18n/locales.ts).
 *
 * `roman` (Urdu in Latin letters) is the source language: keys in code are
 * Roman Urdu or English text, and the roman catalog holds rewordings only.
 * `ur` is the only right-to-left locale.
 */

export type Locale = 'en' | 'ur' | 'roman';

export interface LocaleInfo {
  id: Locale;
  name: string;
  /** Name written in the language itself, shown in pickers. */
  native: string;
  /** Short line under the name so people recognise their language. */
  sample: string;
  dir: 'ltr' | 'rtl';
}

export const LOCALES: readonly LocaleInfo[] = [
  { id: 'en', name: 'English', native: 'English', sample: "Today's sale: Rs 12,500", dir: 'ltr' },
  { id: 'ur', name: 'Urdu', native: 'اردو', sample: 'آج کی سیل: Rs 12,500', dir: 'rtl' },
  { id: 'roman', name: 'Roman Urdu', native: 'Roman Urdu', sample: 'Aaj ki Sale: Rs 12,500', dir: 'ltr' },
];

export const DEFAULT_LOCALE: Locale = 'en';
export const SOURCE_LOCALE: Locale = 'roman';

export const localeInfo = (id: Locale): LocaleInfo => LOCALES.find((l) => l.id === id) ?? LOCALES[0];

/** Reads any stored or legacy value ('roman_ur', 'ur-PK', 'en-US'). */
export function normalizeLocale(value: unknown): Locale | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (v === 'en' || v.startsWith('en-')) return 'en';
  if (v === 'roman' || v === 'roman_ur' || v === 'ur-latn') return 'roman';
  if (v === 'ur' || v === 'ur-pk' || v === 'ur-arab') return 'ur';
  return null;
}
