/**
 * Where the chosen language is kept.
 *
 * The server copy (User.language) is the source of truth and follows the user
 * to every device. A local copy decides the language before login and before
 * the server answers, so the first paint is already in the right language.
 *
 * Changing the language reloads the page; see runtime.ts for why.
 */

import { DEFAULT_LOCALE, normalizeLocale, type Locale } from './locales';

const STORAGE_KEY = 'nafaa-language';
/** Persisted auth session written by core/stores/auth.store.ts. */
const AUTH_STORAGE_KEY = 'nafaa-auth';

interface Stored {
  locale: Locale;
  /** The local choice has not reached the server yet. */
  unsynced?: boolean;
}

function read(): Stored | null {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Stored | null;
    const locale = normalizeLocale(raw?.locale);
    return locale ? { locale, unsynced: !!raw?.unsynced } : null;
  } catch {
    return null;
  }
}

function write(value: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Private mode: the language still applies for this page load.
  }
}

function hasSavedSession(): boolean {
  try {
    const raw = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
    return !!raw?.state?.isAuthenticated;
  } catch {
    return false;
  }
}

/**
 * Locale for this page load. A device that was already signed in before
 * languages existed has no stored choice; its user was moved to Roman Urdu on
 * the server, so it starts in Roman Urdu instead of flashing English.
 */
export function initialLocale(): Locale {
  const stored = read();
  if (stored) return stored.locale;
  return hasSavedSession() ? 'roman' : DEFAULT_LOCALE;
}

export const hasUnsyncedChoice = (): boolean => !!read()?.unsynced;

export function rememberLocale(locale: Locale, unsynced = false) {
  write({ locale, unsynced });
}

export function markSynced() {
  const stored = read();
  if (stored?.unsynced) write({ locale: stored.locale });
}

export function reloadPage() {
  window.location.reload();
}
