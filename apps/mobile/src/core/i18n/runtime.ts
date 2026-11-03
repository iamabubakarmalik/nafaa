/**
 * Translation runtime (mirror of apps/web/src/core/i18n/runtime.ts).
 *
 * Keys are the source text itself, so `t('Naya product')` shows that text in
 * Roman Urdu and looks it up in the English or Urdu catalog otherwise.
 *
 * The active locale is read synchronously when this module loads and a
 * language change reloads the app (see sync.ts), so `t` is a plain function:
 * it works in components, hooks, toasts, zod schemas and module-level config.
 *
 * Each source file translates in its own area. The Babel plugin in
 * scripts/i18n/babel-area-plugin.js binds the `t` and `Trans` a file imports
 * from '@/core/i18n' to that file's area (see area.ts).
 *
 * Lookup order: area -> global [-> English area -> English global, Urdu only] -> the key.
 */

import { I18nManager } from 'react-native';
import { createCatalog, type Catalog, type Entry } from './catalog';
import type { Locale } from './locales';
import { initialLocale } from './preference';

export type Params = Record<string, string | number | null | undefined>;

interface State {
  locale: Locale;
  primary: Catalog;
  fallback: Catalog | null;
}

function load(locale: Locale): State {
  return {
    locale,
    primary: createCatalog(locale),
    fallback: locale === 'ur' ? createCatalog('en') : null,
  };
}

let state: State = load(initialLocale());

/** Replaces the active catalogs. Only boot code calls this, before the app renders. */
export function loadLocale(locale: Locale): void {
  if (locale !== state.locale) state = load(locale);
}

/** The locale this JS session runs in. It changes only through a reload. */
export const currentLocale = (): Locale => state.locale;

/** True when the UI language is Urdu (right to left). */
export const isRtl = (): boolean => state.locale === 'ur';

/** True when the native layout is mirrored right now (may lag a reload behind the locale). */
export const isLayoutRtl = (): boolean => I18nManager.isRTL;

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

function pick(entry: Entry, params?: Params): string {
  if (typeof entry === 'string') return entry;
  const count = params?.count;
  return (count === 1 || count === '1') && entry.one ? entry.one : entry.other;
}

export function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(PLACEHOLDER, (whole, name: string) => {
    const value = params[name];
    return value == null ? whole : String(value);
  });
}

const find = (catalog: Catalog, area: string | undefined, text: string): Entry | undefined =>
  (area === undefined ? undefined : catalog.inArea(area, text)) ?? catalog.global(text);

function lookup(area: string | undefined, text: string): Entry | undefined {
  return find(state.primary, area, text) ?? (state.fallback ? find(state.fallback, area, text) : undefined);
}

/** Translates source text in the given catalog area. Unknown text is returned as written. */
export function translateIn(area: string | undefined, text: string, params?: Params): string {
  const entry = lookup(area, text);
  if (entry === undefined && __DEV__) reportMissing(text);
  return interpolate(entry === undefined ? text : pick(entry, params), params);
}

/** Translates source text. Rebound per file to the file's area at build time. */
export function t(text: string, params?: Params): string {
  return translateIn(undefined, text, params);
}

export const hasTranslation = (text: string, area?: string): boolean => lookup(area, text) !== undefined;

/** Marks text for extraction without translating it; translate where shown with t(). */
export const msg = <T extends string>(text: T): T => text;

const missing = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | undefined;

function reportMissing(text: string) {
  if (state.locale === 'roman' || missing.has(text) || !/\p{L}/u.test(text)) return;
  missing.add(text);
  (globalThis as { __i18nMissing?: string[] }).__i18nMissing = [...missing];
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    console.warn(`[i18n] ${missing.size} text(s) have no ${state.locale} translation. Run: pnpm --filter @nafaa/mobile i18n:check`);
  }, 2000);
}
