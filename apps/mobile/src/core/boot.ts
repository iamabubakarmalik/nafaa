/**
 * Startup, before the first app frame (the native splash is still up):
 *  1. read the stored session (moves 1.x storage once)
 *  2. settle the language: stored choice, else the account's language, else
 *     Roman Urdu for people updating from 1.x (all existing users), else
 *     English for new installs
 *  3. make the native layout direction match (Urdu is right-to-left); this
 *     may reload the app once
 *  4. start connection watching and language sync
 *
 * Returns false when a reload was started.
 */

import { useAuthStore } from './auth/store';
import { authApi } from './auth/api';
import { useBiometric } from './auth/biometric';
import { normalizeLocale } from './i18n/locales';
import { rememberLocale, storedLocale } from './i18n/preference';
import { loadLocale } from './i18n/runtime';
import { ensureDirection, startLanguageSync } from './i18n/sync';
import { startNetworkWatch } from './net/network';

export async function boot(): Promise<boolean> {
  await useAuthStore.getState().initialize();
  const { isAuthenticated, user } = useAuthStore.getState();

  if (!storedLocale() && isAuthenticated) {
    const locale = normalizeLocale(user?.language) ?? 'roman';
    rememberLocale(locale);
    loadLocale(locale);
  }

  if (await ensureDirection()) return false;

  startNetworkWatch();
  startLanguageSync();

  if (isAuthenticated) {
    useBiometric.getState().lockIfNeeded(true);
    // Fresh user and tenant (permissions, plan, language) in the background.
    authApi.me().then(({ user: u, tenant }) => {
      const store = useAuthStore.getState();
      if (!store.isAuthenticated) return;
      store.updateUser(u);
      store.updateTenant(tenant);
    }).catch(() => undefined);
  }
  return true;
}
