/**
 * Applies the appearance to the document and keeps it in sync.
 *
 * Mount once near the root. It listens to:
 *  - the appearance store (any layer changing re-applies the theme),
 *  - the operating-system color scheme, including Electron's native theme
 *    events on the desktop app (this replaces the old `useDesktopTheme` hook,
 *    which toggled `.dark` behind the store's back).
 *
 * `AppearanceBridge` feeds the business and industry layers. It needs the
 * authenticated tenant and the industry context, so it is rendered further
 * down the tree, inside `IndustryProvider`.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@core/stores/auth.store';
import { useSettings } from '@modules/organization/settings/hooks/useSettings';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { getElectron } from '@core/lib/desktop/electron';
import { industryIdentity, MARKETPLACE_IDENTITY } from '../industries/identities';
import { normalizeMode, type AppearanceLayer } from './appearance';
import { applyAppearance } from './apply';
import { appearanceApi, APPEARANCE_QUERY_KEY } from './appearance.api';
import { useAppearanceStore } from './store';

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const resolved = useAppearanceStore((s) => s.resolved);
  const systemPrefersDark = useAppearanceStore((s) => s.systemPrefersDark);
  const setSystemPrefersDark = useAppearanceStore((s) => s.setSystemPrefersDark);

  useEffect(() => {
    applyAppearance(resolved, systemPrefersDark);
  }, [resolved, systemPrefersDark]);

  // Browser / OS color scheme.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mq.matches);
    const onChange = () => setSystemPrefersDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [setSystemPrefersDark]);

  // Desktop app: Electron reports the native theme more reliably than matchMedia.
  useEffect(() => {
    const electron = getElectron() as { isDarkMode?: () => Promise<boolean>; onThemeChanged?: (cb: (t: 'light' | 'dark') => void) => (() => void) | void } | null;
    if (!electron?.isDarkMode) return;
    electron.isDarkMode().then(setSystemPrefersDark).catch(() => undefined);
    const off = electron.onThemeChanged?.((t) => setSystemPrefersDark(t === 'dark'));
    return typeof off === 'function' ? off : undefined;
  }, [setSystemPrefersDark]);

  return <>{children}</>;
}

/** Values the database fills in for every tenant; they do not mean "chosen". */
const LEGACY_DEFAULT_BRAND = '#16a34a';
const LEGACY_DEFAULT_THEME = 'light';
const SAVE_DELAY_MS = 800;

/**
 * Feeds the appearance layers from the server and the active industry, and
 * saves personal changes back so they follow the user to every device.
 *
 * Business layer: the stored business appearance; until an owner saves one,
 * the older tenant settings (theme, brand color, compact mode) are used.
 */
export function AppearanceBridge() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const industry = useCurrentIndustry();
  const { setIndustryColor, setBusiness, setPlatform, replacePersonal } = useAppearanceStore.getState();
  const isMarketplace = useLocation().pathname.startsWith('/marketplace');

  const { data: stored } = useQuery({
    queryKey: APPEARANCE_QUERY_KEY,
    queryFn: appearanceApi.get,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const { data: publicPlatform } = useQuery({
    queryKey: [...APPEARANCE_QUERY_KEY, 'platform'],
    queryFn: appearanceApi.platform,
    enabled: !isAuthenticated,
    staleTime: 30 * 60_000,
    retry: false,
  });
  // Staff without settings access get a 403; that simply means no legacy layer.
  const { data: settings } = useSettings({ enabled: isAuthenticated && !!stored && !stored.business, retry: false });

  useEffect(() => {
    if (!isAuthenticated) return;
    setIndustryColor((isMarketplace ? MARKETPLACE_IDENTITY : industryIdentity(industry?.id)).color);
  }, [isAuthenticated, isMarketplace, industry?.id, setIndustryColor]);

  useEffect(() => {
    if (!isAuthenticated && publicPlatform !== undefined) setPlatform(publicPlatform);
  }, [isAuthenticated, publicPlatform, setPlatform]);

  // Server layers. The first load also decides who wins for the personal layer:
  // a stored copy replaces the local one; with none stored, the local choices are uploaded.
  const synced = useRef(false);
  const applyingRemote = useRef(false);
  useEffect(() => {
    if (!stored) return;
    applyingRemote.current = true;
    setPlatform(stored.platform);
    if (stored.business) setBusiness(stored.business);
    if (stored.personal) replacePersonal(stored.personal);
    else {
      const local = useAppearanceStore.getState().personal ?? {};
      if (Object.keys(local).length) appearanceApi.savePersonal(local).catch(() => undefined);
    }
    applyingRemote.current = false;
    synced.current = true;
  }, [stored, setPlatform, setBusiness, replacePersonal]);

  useEffect(() => {
    if (!settings || stored?.business) return;
    const s = settings as { theme?: string; brandColor?: string; compactMode?: boolean };
    const layer: AppearanceLayer = {};
    if (s.theme && s.theme !== LEGACY_DEFAULT_THEME) layer.mode = normalizeMode(s.theme);
    if (s.brandColor && s.brandColor.toLowerCase() !== LEGACY_DEFAULT_BRAND) layer.brandColor = s.brandColor;
    if (s.compactMode) layer.density = 'compact';
    setBusiness(layer);
  }, [settings, stored?.business, setBusiness]);

  // Save personal changes (debounced) once the server copy has been loaded.
  useEffect(() => {
    if (!isAuthenticated) return;
    let timer: number | undefined;
    const unsubscribe = useAppearanceStore.subscribe((state, prev) => {
      if (state.personal === prev.personal || applyingRemote.current || !synced.current) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        appearanceApi.savePersonal(useAppearanceStore.getState().personal ?? {}).catch(() => undefined);
      }, SAVE_DELAY_MS);
    });
    return () => { unsubscribe(); window.clearTimeout(timer); };
  }, [isAuthenticated]);

  return null;
}
