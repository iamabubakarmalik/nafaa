/**
 * Tells the server this device is in use: on start, on sign-in and whenever
 * the app comes back to the foreground (at most once every two minutes).
 * When the server reports newer settings, the config is refetched.
 */

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { sendHeartbeat } from './api';
import { appPlatform, deviceFacts } from './device';
import { setup } from './setup';
import { APP_CONFIG_QUERY_KEY } from './useAppConfig';
import type { AppConfig } from './types';

const MIN_GAP_MS = 2 * 60_000;

export interface HeartbeatOptions {
  /** Send only while signed in. */
  enabled: boolean;
  /**
   * Expo push token from the app's notification setup. Leave undefined to let
   * the module read it when permission is already granted (it never asks);
   * pass null when the person turned notifications off.
   */
  pushToken?: string | null;
}

async function currentPushToken(): Promise<string | null | undefined> {
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return null;
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return token.data;
  } catch {
    // Unknown: keep whatever the server has.
    return undefined;
  }
}

export function useDeviceHeartbeat({ enabled, pushToken }: HeartbeatOptions) {
  const qc = useQueryClient();
  const last = useRef(0);
  const tokenRef = useRef(pushToken);
  tokenRef.current = pushToken;

  useEffect(() => {
    if (!enabled || !appPlatform()) return;
    let cancelled = false;

    const beat = async (force = false) => {
      if (!force && Date.now() - last.current < MIN_GAP_MS) return;
      last.current = Date.now();
      try {
        const facts = await deviceFacts();
        const token = tokenRef.current !== undefined ? tokenRef.current : await currentPushToken();
        const res = await sendHeartbeat({
          ...facts,
          language: setup().getLanguage(),
          ...(token !== undefined ? { pushToken: token } : {}),
        });
        if (cancelled || !res) return;
        const cached = qc.getQueryData<AppConfig>(APP_CONFIG_QUERY_KEY);
        if (!cached || cached.configVersion !== res.configVersion) {
          void qc.invalidateQueries({ queryKey: APP_CONFIG_QUERY_KEY });
        }
      } catch {
        // Offline or server busy: try again on the next resume.
        last.current = 0;
      }
    };

    void beat(true);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void beat(); });
    return () => { cancelled = true; sub.remove(); };
    // A new or removed push token re-runs this and is sent straight away.
  }, [enabled, pushToken, qc]);
}
