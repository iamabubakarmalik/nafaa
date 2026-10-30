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
 * Lookup order:  active locale  ->  English (for Urdu)  ->  the key itself.
 */

import type { Entry } from './catalog/merge';
import { DEFAULT_LOCALE, type Locale } from './locales';

export type Params = Record<string, string | number | null | undefined>;

interface State {
  locale: Locale;
  ready: boolean;
  primary: Map<string, Entry>;
  fallback: Map<string, Entry> | null;
}

const state: State = { locale: DEFAULT_LOCALE, ready: false, primary: new Map(), fallback: null };

const loaders: Record<Locale, () => Promise<{ default: Map<string, Entry> }>> = {
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

/** Translates source text. Unknown text is returned as written. */
export function t(text: string, params?: Params): string {
  if (import.meta.env.DEV && !state.ready) warnEarly(text);
  const entry = state.primary.get(text) ?? state.fallback?.get(text);
  if (entry === undefined && import.meta.env.DEV) reportMissing(text);
  return interpolate(entry === undefined ? text : pick(entry, params), params);
}

/** True when the active locale (or its fallback) has its own text for this key. */
export const hasTranslation = (text: string): boolean => state.primary.has(text) || !!state.fallback?.has(text);

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
