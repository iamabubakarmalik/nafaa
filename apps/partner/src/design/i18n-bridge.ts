/**
 * Text bridge for the shared design system.
 *
 * Files from apps/web/src/design-system import `t` from '@core/i18n'. Their
 * keys are written in Roman Urdu, which is also the partner portal's
 * language, so the key itself is the text: only {{name}} placeholders are
 * filled in. No translation catalog is needed.
 */

import { LOCALES, DEFAULT_LOCALE, localeInfo, type Locale, type LocaleInfo } from '../../../web/src/core/i18n/locales';

export type Params = Record<string, string | number | null | undefined>;

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

export function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(PLACEHOLDER, (whole, name: string) => {
    const value = params[name];
    return value == null ? whole : String(value);
  });
}

export const t = (key: string, params?: Params): string => interpolate(key, params);
export const msg = (key: string) => key;
export const hasTranslation = () => true;
export const currentLocale = (): Locale => 'roman';
export const isRtl = () => false;

export { LOCALES, DEFAULT_LOCALE, localeInfo, type Locale, type LocaleInfo };
