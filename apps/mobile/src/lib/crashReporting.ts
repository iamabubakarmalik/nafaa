import { Platform } from 'react-native';
import Constants from 'expo-constants';

let initialized = false;

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === 'storeClient';

async function loadFirebase() {
  if (Platform.OS === 'web' || isExpoGo) return null;

  try {
    const crashlytics = require('@react-native-firebase/crashlytics').default;
    const analytics = require('@react-native-firebase/analytics').default;
    return { crashlytics, analytics };
  } catch (error) {
    console.log('[crashReporting] Firebase native modules unavailable, skipping');
    return null;
  }
}

export async function initCrashReporting() {
  if (initialized) return;

  const firebase = await loadFirebase();
  if (!firebase) return;

  try {
    await firebase.analytics().setAnalyticsCollectionEnabled(true);
    await firebase.crashlytics().setCrashlyticsCollectionEnabled(true);
    initialized = true;
    console.log('[crashReporting] initialized');
  } catch (error) {
    console.log('[crashReporting] init skipped');
  }
}

export async function logAnalyticsEvent(
  name: string,
  params?: Record<string, any>,
) {
  const firebase = await loadFirebase();
  if (!firebase) return;

  try {
    await firebase.analytics().logEvent(name, params);
  } catch {}
}

export async function setCrashUser(userId: string) {
  const firebase = await loadFirebase();
  if (!firebase) return;

  try {
    await firebase.crashlytics().setUserId(userId);
  } catch {}
}

export async function clearCrashUser() {
  const firebase = await loadFirebase();
  if (!firebase) return;

  try {
    await firebase.crashlytics().setUserId('');
  } catch {}
}

export async function recordError(error: unknown, context?: string) {
  const firebase = await loadFirebase();
  if (!firebase) return;

  try {
    if (context) {
      firebase.crashlytics().log(context);
    }

    if (error instanceof Error) {
      firebase.crashlytics().recordError(error);
    } else {
      firebase.crashlytics().log(String(error));
    }
  } catch {}
}

export async function trackScreen(screenName: string) {
  const firebase = await loadFirebase();
  if (!firebase) return;

  try {
    await firebase.analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenName,
    });
  } catch {}
}
