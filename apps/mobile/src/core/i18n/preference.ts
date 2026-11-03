/**
 * Where the chosen language is kept on this device.
 *
 * User.language on the server is the source of truth; this local copy decides
 * the language before login and before the server answers, so the first frame
 * is already right. It is read synchronously at startup (core/storage/kv).
 */

import { kv } from '../storage/kv';
import { DEFAULT_LOCALE, normalizeLocale, type Locale } from './locales';

const KEY = 'nafaa.language';

interface Stored {
  locale: Locale;
  /** Chosen on this device but not saved to the account yet. */
  unsynced?: boolean;
}

function read(): Stored | null {
  const raw = kv.get<Stored | null>(KEY, null);
  const locale = normalizeLocale(raw?.locale);
  return locale ? { locale, unsynced: !!raw?.unsynced } : null;
}

export const storedLocale = (): Locale | null => read()?.locale ?? null;
export const initialLocale = (): Locale => read()?.locale ?? DEFAULT_LOCALE;
export const hasUnsyncedChoice = (): boolean => !!read()?.unsynced;

export function rememberLocale(locale: Locale, unsynced = false): void {
  kv.set(KEY, { locale, unsynced });
}

export function markSynced(): void {
  const stored = read();
  if (stored?.unsynced) kv.set(KEY, { locale: stored.locale });
}
