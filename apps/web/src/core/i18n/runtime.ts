/**
 * Translation runtime.
 *
 * Keys are the source text itself (mostly the Roman Urdu the screens were
 * written in), so `t('Naya product')` shows that text untouched in Roman Urdu
 * and looks it up in the English or Urdu catalog otherwise.
 *
 * The active catalog is loaded before the app modules are imported (see
 * boot.ts) and a language change reloads the page. That is why `t` is a plain
 * function: it works in components, hooks, toasts, zod schemas and
 * module-level config alike, and never returns stale text.
 *
 * Each source file translates in its own area (the catalog file its keys were
 * extracted to). The Vite plugin in scripts/i18n/vite-area-plugin.mjs binds
 * the `t` and `Trans` a file imports from '@core/i18n' to that file's area;
 * see area.ts. Unbound calls (this module's `t`) have no area.
 *
 * Lookup order:  area  ->  global  [-> English area -> English global, Urdu only]  ->  the key.
 */

import type { Catalog, Entry } from './catalog/merge';
import { DEFAULT_LOCALE, type Locale } from './locales';

export type Params = Record<string, string | number | null | undefined>;

interface State {
  locale: Locale;
  ready: boolean;
  primary: Catalog;
  fallback: Catalog | null;
}

const empty: Catalog = { areas: new Map(), global: new Map() };
const state: State = { locale: DEFAULT_LOCALE, ready: false, primary: empty, fallback: null };

const loaders: Record<Locale, () => Promise<{ default: Catalog }>> = {
  en: () => import('./catalog/en/index'),
  ur: () => import('./catalog/ur/index'),
  roman: () => import('./catalog/roman/index'),
};

/** Loads the catalogs for a locale. Called once by boot.ts before the app renders. */
export async function loadLocale(locale: Locale): Promise<void> {
  const [primary, fallback] = await Promise.all([
    loaders[locale]().then((m) => m.default),
    locale === 'ur' ? loaders.en().then((m) => m.default) : Promise.resolve(null),
  ]);
  state.locale = locale;
  state.primary = primary;
  state.fallback = fallback;
  state.ready = true;
}

/** The locale the page was loaded in. It only changes through a reload. */
export const currentLocale = (): Locale => state.locale;
export const isRtl = (): boolean => state.locale === 'ur';

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
  (area === undefined ? undefined : catalog.areas.get(area)?.get(text)) ?? catalog.global.get(text);

function lookup(area: string | undefined, text: string): Entry | undefined {
  return find(state.primary, area, text) ?? (state.fallback ? find(state.fallback, area, text) : undefined);
}

/** Translates source text in the given catalog area. Unknown text is returned as written. */
export function translateIn(area: string | undefined, text: string, params?: Params): string {
  if (import.meta.env.DEV && !state.ready) warnEarly(text);
  const entry = lookup(area, text);
  if (entry === undefined && import.meta.env.DEV) reportMissing(text);
  return interpolate(entry === undefined ? text : pick(entry, params), params);
}

/**
 * Translates source text. In app code this name is rebound per file to the
 * file's area at build time; called directly it uses the global table only.
 */
export function t(text: string, params?: Params): string {
  return translateIn(undefined, text, params);
}

/** True when the active locale (or its fallback) has its own text for this key. */
export const hasTranslation = (text: string, area?: string): boolean => lookup(area, text) !== undefined;

/**
 * Marks text for extraction without translating it. Use it for values that are
 * stored or compared (enum labels kept in data) and translated where shown.
 */
export const msg = <T extends string>(text: T): T => text;

// ---- Development diagnostics ------------------------------------------------

const missing = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | undefined;

function reportMissing(text: string) {
  // Roman Urdu shows source text by design; only English and Urdu can miss.
  if (state.locale === 'roman' || missing.has(text) || !/\p{L}/u.test(text)) return;
  missing.add(text);
  (globalThis as { __i18nMissing?: string[] }).__i18nMissing = [...missing];
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    console.warn(`[i18n] ${missing.size} text(s) have no ${state.locale} translation. See window.__i18nMissing`);
  }, 1500);
}

const early = new Set<string>();
function warnEarly(text: string) {
  if (early.has(text)) return;
  early.add(text);
  console.warn(`[i18n] t("${text}") ran before the catalog loaded; it will not be translated. Import this module after boot.`);
}
