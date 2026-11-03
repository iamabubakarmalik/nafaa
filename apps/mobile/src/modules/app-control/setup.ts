/**
 * Wiring the app shell provides once at start (configureAppControl). The
 * module works without it: it falls back to the default API address, no
 * sign-in token, English, and expo-router / Linking for links.
 */

import { Linking } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import type { AppLanguage } from './types';

export interface AppControlSetup {
  /** Base URL including /api, e.g. https://api.nafaa.pk/api */
  apiUrl: string;
  /** Current access token, or null when signed out. */
  getAccessToken: () => string | null | undefined | Promise<string | null | undefined>;
  /** Current app language. */
  getLanguage: () => AppLanguage;
  /** Opens an in-app path ("/billing") or a web link. */
  openLink: (link: string) => void;
}

function defaultApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (!__DEV__) return 'https://api.nafaa.pk/api';
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:4000/api` : 'http://localhost:4000/api';
}

const state: AppControlSetup = {
  apiUrl: defaultApiUrl(),
  getAccessToken: () => null,
  getLanguage: () => 'en',
  openLink: (link) => {
    if (/^https?:\/\//.test(link)) void Linking.openURL(link);
    else router.push(link as never);
  },
};

export function configureAppControl(options: Partial<AppControlSetup>) {
  Object.assign(state, Object.fromEntries(Object.entries(options).filter(([, v]) => v !== undefined)));
}

export const setup = (): AppControlSetup => state;
