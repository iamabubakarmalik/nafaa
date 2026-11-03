/**
 * Loads expo-apple-authentication only on iOS builds that contain it. The
 * module is never evaluated on Android or in older binaries that receive this
 * JS through an over-the-air update (its import would throw there), so every
 * Apple call goes through `appleAuth()` and treats null as "not available".
 */

import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

type AppleModule = typeof import('expo-apple-authentication');

let cached: AppleModule | null | undefined;

export function appleAuth(): AppleModule | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (Platform.OS !== 'ios') return cached;
  try {
    if (!requireOptionalNativeModule('ExpoAppleAuthentication')) return cached;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-apple-authentication') as AppleModule;
  } catch {
    cached = null;
  }
  return cached;
}
