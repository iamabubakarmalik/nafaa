/**
 * Firebase Crashlytics + Analytics wrapper.
 *
 * Safe to call anywhere — gracefully no-ops if Firebase native
 * modules aren't available (Expo Go, web, or before native init).
 */
import crashlytics from '@react-native-firebase/crashlytics';
import analytics from '@react-native-firebase/analytics';

let isInitialized = false;

function safe<T>(fn: () => T, fallback?: T): T | undefined {
  try {
    return fn();
  } catch (e) {
    if (__DEV__) console.warn('[crashReporting] safe() failed:', e);
    return fallback;
  }
}

export const Crash = {
  /** Mark Firebase as ready (called after native init) */
  init() {
    isInitialized = true;
    safe(() => crashlytics().setCrashlyticsCollectionEnabled(!__DEV__));
    safe(() => analytics().setAnalyticsCollectionEnabled(!__DEV__));
  },

  /** Log a non-fatal error (visible in Crashlytics dashboard) */
  recordError(error: Error, context?: Record<string, string | number | boolean>) {
    if (!isInitialized) return;
    safe(() => {
      if (context) {
        Object.entries(context).forEach(([k, v]) => {
          crashlytics().setAttribute(k, String(v));
        });
      }
      crashlytics().recordError(error);
    });
    if (__DEV__) console.error('[Crash]', error.message, context);
  },

  /** Log a breadcrumb / event message */
  log(message: string) {
    if (!isInitialized) return;
    safe(() => crashlytics().log(message));
    if (__DEV__) console.log('[Crash]', message);
  },

  /** Associate crash reports with a specific user */
  setUser(userId: string, attrs?: Record<string, string>) {
    if (!isInitialized) return;
    safe(() => {
      crashlytics().setUserId(userId);
      if (attrs) {
        Object.entries(attrs).forEach(([k, v]) => {
          crashlytics().setAttribute(k, v);
        });
      }
      analytics().setUserId(userId);
      if (attrs) analytics().setUserProperties(attrs);
    });
  },

  /** Clear user identification (on logout) */
  clearUser() {
    if (!isInitialized) return;
    safe(() => {
      crashlytics().setUserId('');
      analytics().setUserId(null);
    });
  },

  /** Track screen views (Analytics) */
  logScreen(screenName: string, params?: Record<string, any>) {
    if (!isInitialized) return;
    safe(() =>
      analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenName,
        ...params,
      }),
    );
  },

  /** Track custom events (Analytics) */
  logEvent(name: string, params?: Record<string, any>) {
    if (!isInitialized) return;
    safe(() => analytics().logEvent(name, params));
  },

  /** Force a native crash (dev-only — for testing Crashlytics setup) */
  testCrash() {
    if (!__DEV__) return;
    safe(() => crashlytics().crash());
  },
};
