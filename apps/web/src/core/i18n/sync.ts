/**
 * Keeps the local language choice and the user's server setting in step.
 *
 *  - After a login the server setting wins; if it differs from the page, the
 *    page reloads into it (the login screen has nothing to lose).
 *  - A user without a server setting (new staff, Google sign-ups) gets the
 *    language they are using now saved for them.
 *  - A choice made on the login screen or while offline is saved to the
 *    account at the next login or the next time the user data loads.
 */

import { apiClient } from '@core/api/client';
import { useAuthStore } from '@core/stores/auth.store';
import { normalizeLocale, type Locale } from './locales';
import { hasUnsyncedChoice, markSynced, rememberLocale, reloadPage } from './preference';
import { currentLocale } from './runtime';

const SAVE_TIMEOUT_MS = 2500;

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

/** Switches the app language for this user and device, then reloads. */
export async function changeLanguage(locale: Locale): Promise<void> {
  // Marked unsynced even when signed out: a choice made on the login screen
  // is saved to the account at the next login instead of being overruled.
  rememberLocale(locale, true);
  if (useAuthStore.getState().isAuthenticated) await saveToServer(locale);
  reloadPage();
}

let started = false;

/** Call once after boot. */
export function startLanguageSync() {
  if (started) return;
  started = true;

  const reconcile = (isLogin: boolean) => {
    const { user, isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated || !user || !('language' in user)) return; // older API: nothing to do
    const server = normalizeLocale(user.language);

    if (hasUnsyncedChoice() || !server) {
      void saveToServer(currentLocale());
      return;
    }
    if (server === currentLocale()) return;
    rememberLocale(server);
    if (isLogin) reloadPage();
  };

  reconcile(false);
  useAuthStore.subscribe((state, prev) => {
    if (state.user === prev.user) return;
    const isLogin = !prev.isAuthenticated || prev.user?.id !== state.user?.id;
    reconcile(isLogin);
  });
}
