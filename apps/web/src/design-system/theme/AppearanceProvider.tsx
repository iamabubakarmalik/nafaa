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

import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@core/stores/auth.store';
import { useSettings } from '@modules/organization/settings/hooks/useSettings';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { getElectron } from '@core/lib/desktop/electron';
import { industryIdentity, MARKETPLACE_IDENTITY } from '../industries/identities';
import { normalizeMode, type AppearanceLayer } from './appearance';
import { applyAppearance } from './apply';
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

/**
 * Translates tenant settings into the business appearance layer, and the
 * active industry into the identity color.
 */
export function AppearanceBridge() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const industry = useCurrentIndustry();
  const setIndustryColor = useAppearanceStore((s) => s.setIndustryColor);
  const setBusiness = useAppearanceStore((s) => s.setBusiness);
  // Staff without settings access get a 403; that simply means "no business layer".
  const { data: settings } = useSettings({ enabled: isAuthenticated, retry: false });
  const isMarketplace = useLocation().pathname.startsWith('/marketplace');

  useEffect(() => {
    if (!isAuthenticated) return;
    setIndustryColor((isMarketplace ? MARKETPLACE_IDENTITY : industryIdentity(industry?.id)).color);
  }, [isAuthenticated, isMarketplace, industry?.id, setIndustryColor]);

  useEffect(() => {
    if (!settings) return;
    const s = settings as { theme?: string; brandColor?: string; compactMode?: boolean };
    const layer: AppearanceLayer = {};
    if (s.theme && s.theme !== LEGACY_DEFAULT_THEME) layer.mode = normalizeMode(s.theme);
    if (s.brandColor && s.brandColor.toLowerCase() !== LEGACY_DEFAULT_BRAND) layer.brandColor = s.brandColor;
    if (s.compactMode) layer.density = 'compact';
    setBusiness(layer);
  }, [settings, setBusiness]);

  return null;
}
