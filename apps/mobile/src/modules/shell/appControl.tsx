/**
 * Shell wiring for the admin app-control module (src/modules/app-control):
 * maintenance / update gate, announcement banner, device check-ins and the
 * admin's module switches. Everything fails open: without a config (first
 * start offline, older API) the app works normally with every module on.
 */

import { useCallback, useEffect } from 'react';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  AnnouncementBanner as AppAnnouncementBanner, AppControlGate as Gate, configureAppControl, refreshAppConfig, useAppConfig,
  useDeviceHeartbeat as useHeartbeat,
} from '@/modules/app-control';
import { API_URL } from '@/core/api/client';
import { useAuthStore } from '@/core/auth/store';
import { currentLocale } from '@/core/i18n';
import { useAppearanceStore, useTheme } from '@/design';
import type { ReactNode } from 'react';

configureAppControl({
  apiUrl: API_URL,
  getAccessToken: () => useAuthStore.getState().accessToken,
  getLanguage: () => currentLocale(),
  openLink: (link) => {
    if (/^https?:\/\//.test(link)) return;
    router.push(link as never);
  },
});

export function AppControlGate({ children }: { children: ReactNode }) {
  const th = useTheme();
  const { config } = useAppConfig();
  const setPlatform = useAppearanceStore((s) => s.setPlatform);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // The admin's mobile appearance defaults are the platform layer before sign-in;
  // after sign-in /appearance (AppearanceBridge) supplies all layers.
  useEffect(() => {
    if (!isAuthenticated && config?.appearance) setPlatform(config.appearance);
  }, [isAuthenticated, config?.appearance, setPlatform]);

  return (
    <Gate colors={{ accent: th.colors.brand.solid, onAccent: th.colors.brand.onSolid, background: th.colors.canvas, surface: th.colors.surface, text: th.colors.text, muted: th.colors.textMuted }}>
      {children}
    </Gate>
  );
}

export function AnnouncementBanner() {
  const th = useTheme();
  return <AppAnnouncementBanner max={1} style={{ marginHorizontal: th.space(4), marginBottom: th.space(2) }} />;
}

/** Device check-in while signed in; refreshes targeted banners on sign-in/out. */
export function useDeviceHeartbeat() {
  const signedIn = useAuthStore((s) => !!s.accessToken);
  const qc = useQueryClient();
  useHeartbeat({ enabled: signedIn });
  useEffect(() => {
    refreshAppConfig(qc);
  }, [signedIn, qc]);
}

/** Whether a module is on in the admin panel (flag `module.<key>`). */
export function useModuleFlag(moduleKey: string): boolean {
  const { config } = useAppConfig();
  return config?.flags?.[`module.${moduleKey}`] ?? true;
}

/** Same check for many keys at once (menus). Stable while the flags do not change. */
export function useModuleFlags(): (moduleKey: string) => boolean {
  const { config } = useAppConfig();
  const flags = config?.flags;
  return useCallback((moduleKey: string) => flags?.[`module.${moduleKey}`] ?? true, [flags]);
}
