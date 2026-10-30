/**
 * Prepares the language before any app module is imported.
 *
 * main.tsx awaits `bootI18n()` and only then imports the app, so module-level
 * `t()` calls (navigation config, zod schemas, option lists) already see the
 * right catalog. The <html lang/dir> values are set here for the first paint;
 * the design-system AppearanceProvider keeps them in place afterwards.
 */

import { localeInfo } from './locales';
import { initialLocale } from './preference';
import { loadLocale } from './runtime';

export async function bootI18n(): Promise<void> {
  const locale = initialLocale();
  const info = localeInfo(locale);
  document.documentElement.lang = info.htmlLang;
  document.documentElement.dir = info.dir;
  try {
    await loadLocale(locale);
  } catch {
    // A failed chunk load (offline first visit) falls back to source text.
    await loadLocale('roman').catch(() => undefined);
  }
}
