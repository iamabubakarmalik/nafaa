/**
 * Language switching and keeping the device choice in step with the account
 * (same rules as the web sync.ts):
 *
 *  - After a login the server setting (User.language) wins; if it differs from
 *    the running language the app reloads into it.
 *  - A user without a server setting gets the current language saved.
 *  - A choice made on the login screen or offline is saved to the account at
 *    the next login.
 *
 * Changing language reloads the JS app: catalogs are read once at start, and
 * Urdu needs the native right-to-left layout, which only applies on reload.
 */

import { I18nManager } from 'react-native';
import { reloadAppAsync } from 'expo';
import { apiClient } from '../api/client';
import { useAuthStore } from '../auth/store';
import { kv } from '../storage/kv';
import { normalizeLocale, type Locale } from './locales';
import { hasUnsyncedChoice, markSynced, rememberLocale } from './preference';
import { currentLocale } from './runtime';

const SAVE_TIMEOUT_MS = 2500;
const SKIP_INTRO_KEY = 'nafaa.skip-intro-once';
const RTL_GUARD_KEY = 'nafaa.rtl-reload-at';

async function saveToServer(locale: Locale): Promise<boolean> {
  try {
    await apiClient.patch('/auth/me', { language: locale }, { timeout: SAVE_TIMEOUT_MS });
    markSynced();
    useAuthStore.getState().updateUser({ language: locale });
    return true;
  } catch {
    return false;
  }
}

function applyDirection(locale: Locale) {
  const rtl = locale === 'ur';
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
}

/** Reloads the app without replaying the opening animation. */
export async function reloadApp(reason = 'language'): Promise<void> {
  kv.set(SKIP_INTRO_KEY, true);
  await reloadAppAsync(reason);
}

/** Switches the app language for this user and device, then reloads. */
export async function changeLanguage(locale: Locale): Promise<void> {
  rememberLocale(locale, true);
  if (useAuthStore.getState().isAuthenticated) await saveToServer(locale);
  applyDirection(locale);
  await reloadApp();
}

/** True once after a language reload: the opening animation is skipped. */
export function consumeSkipIntro(): boolean {
  const skip = kv.get<boolean>(SKIP_INTRO_KEY, false);
  if (skip) kv.remove(SKIP_INTRO_KEY);
  return skip;
}

/**
 * Makes the native layout direction match the language. Returns true when a
 * reload was started (the caller should render nothing). Guarded so a device
 * that refuses RTL never loops.
 */
export async function ensureDirection(): Promise<boolean> {
  const rtl = currentLocale() === 'ur';
  if (I18nManager.isRTL === rtl) return false;
  const last = kv.get<number>(RTL_GUARD_KEY, 0);
  if (Date.now() - last < 30_000) return false;
  kv.set(RTL_GUARD_KEY, Date.now());
  applyDirection(currentLocale());
  await reloadApp('direction');
  return true;
}

let started = false;

/** Call once after the auth store is initialized. */
export function startLanguageSync() {
  if (started) return;
  started = true;

  const reconcile = (isLogin: boolean) => {
    const { user, isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated || !user || !('language' in user)) return;
    const server = normalizeLocale(user.language);
    if (hasUnsyncedChoice() || !server) {
      void saveToServer(currentLocale());
      return;
    }
    if (server === currentLocale()) return;
    rememberLocale(server);
    if (isLogin) {
      applyDirection(server);
      void reloadApp();
    }
  };

  reconcile(false);
  useAuthStore.subscribe((state, prev) => {
    if (state.user === prev.user) return;
    const isLogin = !prev.isAuthenticated || prev.user?.id !== state.user?.id;
    reconcile(isLogin);
  });
}
