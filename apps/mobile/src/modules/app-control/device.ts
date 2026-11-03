/** Facts about this install: a stable install id plus app, update and device details. */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as Updates from 'expo-updates';

const INSTALL_ID_KEY = 'nafaa.installId';
let installIdPromise: Promise<string> | null = null;

/** A uuid created on first launch and kept in the secure store. */
export function getInstallId(): Promise<string> {
  installIdPromise ??= (async () => {
    try {
      const saved = await SecureStore.getItemAsync(INSTALL_ID_KEY);
      if (saved) return saved;
      const id = Crypto.randomUUID();
      await SecureStore.setItemAsync(INSTALL_ID_KEY, id);
      return id;
    } catch {
      // Secure store unavailable (e.g. web): a per-session id is still useful.
      return Crypto.randomUUID();
    }
  })();
  return installIdPromise;
}

export type AppPlatform = 'ios' | 'android';

export const appPlatform = (): AppPlatform | null => (Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null);

/** Marketing version from app.json, e.g. "2.0.0". */
export const appVersion = (): string => Constants.expoConfig?.version ?? '0.0.0';

export function buildNumber(): string | null {
  const cfg = Constants.expoConfig;
  if (Platform.OS === 'ios') return cfg?.ios?.buildNumber ?? null;
  if (Platform.OS === 'android') return cfg?.android?.versionCode != null ? String(cfg.android.versionCode) : null;
  return null;
}

const clip = (v: string | null | undefined, max: number) => (v ? v.slice(0, max) : undefined);

/** The heartbeat body without the push token and language. */
export async function deviceFacts() {
  return {
    installId: await getInstallId(),
    platform: appPlatform() as AppPlatform,
    appVersion: appVersion(),
    buildNumber: clip(buildNumber(), 32),
    runtimeVersion: clip(Updates.runtimeVersion, 64),
    updateId: clip(Updates.updateId, 64),
    osVersion: clip(Device.osVersion, 32),
    deviceModel: clip(Device.modelName, 80),
    deviceBrand: clip(Device.brand, 40),
  };
}
