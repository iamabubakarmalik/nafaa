/**
 * Text bridge for the shared design system.
 *
 * Files from apps/web/src/design-system import `t` from '@core/i18n'. The
 * admin panel is English-only, so this module stands in for the web
 * translation runtime: it looks the key up in ds-en.json (the English text
 * of the keys those files use, copied from the web catalog) and otherwise
 * returns the key unchanged. Regenerate ds-en.json when shared components
 * add new text (see README.md).
 */

import EN from './ds-en.json';
import { LOCALES, DEFAULT_LOCALE, localeInfo, type Locale, type LocaleInfo } from '../../../web/src/core/i18n/locales';

export type Params = Record<string, string | number | null | undefined>;
type Entry = string | { one?: string; other: string };

const CATALOG = EN as Record<string, Entry>;
const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

export function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(PLACEHOLDER, (whole, name: string) => {
    const value = params[name];
    return value == null ? whole : String(value);
  });
}

export function t(key: string, params?: Params): string {
  const entry = CATALOG[key];
  if (entry === undefined) return interpolate(key, params);
  if (typeof entry === 'string') return interpolate(entry, params);
  const count = params?.count;
  return interpolate((count === 1 || count === '1') && entry.one ? entry.one : entry.other, params);
}

export const msg = (key: string) => key;
export const hasTranslation = (key: string) => key in CATALOG;
export const currentLocale = (): Locale => 'en';
export const isRtl = () => false;

export { LOCALES, DEFAULT_LOCALE, localeInfo, type Locale, type LocaleInfo };
