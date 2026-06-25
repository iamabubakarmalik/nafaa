import { db } from './db';
import { settingsApi } from '@/api/settings.api';

const SETTINGS_CACHE_KEY = 'tenant-settings-cache';

/**
 * Cache tenant settings (shop name, logo, address, receipt config)
 */
export async function downloadSettings(): Promise<void> {
  if (!navigator.onLine) return;

  try {
    const settings = await settingsApi.get();
    await db.meta.put({
      key: SETTINGS_CACHE_KEY,
      value: settings,
      updatedAt: Date.now(),
    });
    console.log('[offline-settings] Cached');
  } catch (e) {
    console.warn('[offline-settings] Cache failed:', e);
  }
}

/**
 * Get cached tenant settings (works offline)
 */
export async function getCachedSettings(): Promise<any | null> {
  const entry = await db.meta.get(SETTINGS_CACHE_KEY);
  return entry?.value || null;
}

/**
 * Get settings — server or cache
 */
export async function getOfflineSettings(): Promise<any | null> {
  if (navigator.onLine) {
    try {
      const settings = await settingsApi.get();
      await db.meta.put({
        key: SETTINGS_CACHE_KEY,
        value: settings,
        updatedAt: Date.now(),
      });
      return settings;
    } catch {
      // Fall through
    }
  }
  return getCachedSettings();
}
