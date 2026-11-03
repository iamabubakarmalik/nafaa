/**
 * Crash reporting and analytics through Firebase, when the native modules are
 * present. Expo Go, web and builds without Firebase skip every call silently.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

type Firebase = {
  crashlytics: () => {
    setCrashlyticsCollectionEnabled: (on: boolean) => Promise<void>;
    setUserId: (id: string) => Promise<void>;
    log: (message: string) => void;
    recordError: (error: Error) => void;
  };
  analytics: () => {
    setAnalyticsCollectionEnabled: (on: boolean) => Promise<void>;
    logEvent: (name: string, params?: Record<string, unknown>) => Promise<void>;
    logScreenView: (params: { screen_name: string; screen_class: string }) => Promise<void>;
  };
};

const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
let initialized = false;
let cached: Firebase | null | undefined;

function firebase(): Firebase | null {
  if (cached !== undefined) return cached;
  if (Platform.OS === 'web' || isExpoGo) return (cached = null);
  try {
    cached = {
      crashlytics: require('@react-native-firebase/crashlytics').default,
      analytics: require('@react-native-firebase/analytics').default,
    };
  } catch {
    cached = null;
  }
  return cached;
}

export async function initCrashReporting() {
  const fb = firebase();
  if (initialized || !fb) return;
  try {
    await fb.analytics().setAnalyticsCollectionEnabled(true);
    await fb.crashlytics().setCrashlyticsCollectionEnabled(true);
    initialized = true;
  } catch {
    // Firebase is optional; a missing config must never block the app.
  }
}

export async function setCrashUser(userId: string | null) {
  try {
    await firebase()?.crashlytics().setUserId(userId ?? '');
  } catch {}
}

export function recordError(error: unknown, context?: string) {
  const fb = firebase();
  if (!fb) return;
  try {
    if (context) fb.crashlytics().log(context);
    if (error instanceof Error) fb.crashlytics().recordError(error);
    else fb.crashlytics().log(String(error));
  } catch {}
}

export async function logAnalyticsEvent(name: string, params?: Record<string, unknown>) {
  try {
    await firebase()?.analytics().logEvent(name, params);
  } catch {}
}

export async function trackScreen(screenName: string) {
  try {
    await firebase()?.analytics().logScreenView({ screen_name: screenName, screen_class: screenName });
  } catch {}
}
