/**
 * Appearance model and resolution rules — the same four layers as the web
 * (apps/web/src/design-system/theme/appearance.ts):
 *
 *   1. Built-in defaults           (this file)
 *   2. Platform defaults           set by Nafaa staff in the admin panel
 *   3. Business defaults           set by the owner in Settings → Appearance
 *   4. Personal preferences        set by each user for themselves
 *
 * The accent falls back to the industry identity color when neither the
 * business nor the user picked one.
 *
 * Mobile-only options are flat `mobile*` fields in the same layers (tab bar,
 * start screen, POS grid size, home blocks, animations, haptics). Admins set
 * platform defaults in the admin panel; owners and users in Appearance.
 */

import { isHexColor } from '../tokens/color';
import { DEFAULT_BRAND_HEX } from '../tokens/presets';
import { DEFAULT_LATIN_FONT, DEFAULT_URDU_FONT, type TextScale } from '../tokens/typography';
import type { Density, PageWidth, Radius } from '../tokens/layout';
import type { CanvasToneId } from '../tokens/surfaces';
import { HERO_PATTERNS, HERO_SIZES, HERO_STATS_LAYOUTS, HERO_STYLES, type HeroPattern, type HeroSize, type HeroStatsLayout, type HeroStyle } from '../tokens/hero';

export type ThemeMode = 'light' | 'dark' | 'system';

/*
 * Mobile-only fields (flat keys in the same layers, validated by the API
 * appearance.schema.ts). The web keeps them untouched when it saves.
 */
export const TAB_BAR_STYLES = ['floating', 'labels', 'icons'] as const;
export type TabBarStyle = (typeof TAB_BAR_STYLES)[number];

export const HEADER_SIZES = ['compact', 'standard', 'large'] as const;
export type HeaderSize = (typeof HEADER_SIZES)[number];

export const START_SCREENS = ['home', 'pos'] as const;
export type StartScreen = (typeof START_SCREENS)[number];

export const POS_GRID_SIZES = ['list', 'small', 'medium', 'large'] as const;
export type PosGridSize = (typeof POS_GRID_SIZES)[number];

/**
 * Old Home block list (API MOBILE_HOME_WIDGETS). Kept so stored appearance
 * layers stay valid; Home now uses the dashboard layout shared with the web
 * (modules/home/layout).
 */
export const HOME_WIDGETS = [
  'sales-today', 'quick-actions', 'cash-register', 'khata-due', 'low-stock', 'recent-sales', 'top-products', 'online-orders', 'ai-insights',
  'sales-trend', 'peak-hours', 'payment-mix', 'profit-loss', 'money-map', 'category-mix', 'staff-sales', 'weekday', 'top-customers', 'monthly', 'expenses-month', 'purchases', 'slow-movers', 'day-report', 'kpis',
] as const;
export type HomeWidgetId = (typeof HOME_WIDGETS)[number];

/** Shown when nobody has chosen; the dashboard widgets stay off until turned on. */
export const DEFAULT_HOME_WIDGETS: HomeWidgetId[] = ['sales-today', 'quick-actions', 'cash-register', 'khata-due', 'low-stock', 'recent-sales', 'top-products'];

/** Convenient read-only view of the mobile fields (derived, never stored). */
export interface MobileAppearance {
  tabBar: TabBarStyle;
  /** Screen headers and PageHero: compact (default), standard, large. */
  header: HeaderSize;
  startScreen: StartScreen;
  posGrid: PosGridSize;
  animations: boolean;
  haptics: boolean;
}

export interface Appearance {
  mode: ThemeMode;
  /** Hex accent color, or null to follow the industry identity. */
  brandColor: string | null;
  canvasTone: CanvasToneId;
  sidebarStyle: 'light' | 'dark' | 'brand';
  sidebarMode: 'auto' | 'expanded' | 'collapsed';
  latinFont: string;
  urduFont: string;
  textScale: TextScale;
  density: Density;
  radius: Radius;
  pageWidth: PageWidth;
  reduceMotion: boolean;
  contrast: 'normal' | 'high';
  heroStyle: HeroStyle;
  heroPattern: HeroPattern;
  heroSize: HeroSize;
  heroStats: HeroStatsLayout;
  mobileTabBar: TabBarStyle;
  mobileHeader: HeaderSize;
  mobileStartScreen: StartScreen;
  mobilePosGrid: PosGridSize;
  mobileHomeWidgets: HomeWidgetId[];
  mobileAnimations: boolean;
  mobileHaptics: boolean;
}

export type AppearanceLayer = Partial<Appearance>;

export const DEFAULT_APPEARANCE: Appearance = {
  mode: 'system',
  brandColor: null,
  canvasTone: 'soft',
  sidebarStyle: 'light',
  sidebarMode: 'auto',
  latinFont: DEFAULT_LATIN_FONT,
  urduFont: DEFAULT_URDU_FONT,
  textScale: 'md',
  density: 'comfortable',
  radius: 'default',
  pageWidth: 'wide',
  reduceMotion: false,
  contrast: 'normal',
  heroStyle: 'modern',
  heroPattern: 'dots',
  heroSize: 'comfortable',
  heroStats: 'inline',
  mobileTabBar: 'floating',
  mobileHeader: 'compact',
  mobileStartScreen: 'home',
  mobilePosGrid: 'medium',
  mobileHomeWidgets: DEFAULT_HOME_WIDGETS,
  mobileAnimations: true,
  mobileHaptics: true,
};

export interface AppearanceLayers {
  platform?: AppearanceLayer | null;
  business?: AppearanceLayer | null;
  personal?: AppearanceLayer | null;
  industryColor?: string | null;
}

export interface ResolvedAppearance extends Appearance {
  /** Final accent hex after every fallback; never null. */
  accentHex: string;
  mobile: MobileAppearance;
}

const OPTIONS: Partial<Record<keyof Appearance, Record<string, unknown>>> = {
  heroStyle: HERO_STYLES,
  heroPattern: HERO_PATTERNS,
  heroSize: HERO_SIZES,
  heroStats: HERO_STATS_LAYOUTS,
  mobileTabBar: Object.fromEntries(TAB_BAR_STYLES.map((x) => [x, 1])),
  mobileHeader: Object.fromEntries(HEADER_SIZES.map((x) => [x, 1])),
  mobileStartScreen: Object.fromEntries(START_SCREENS.map((x) => [x, 1])),
  mobilePosGrid: Object.fromEntries(POS_GRID_SIZES.map((x) => [x, 1])),
};

/** Known widget ids once each, in the given order. */
export function normalizeWidgets(list: unknown): HomeWidgetId[] {
  if (!Array.isArray(list)) return DEFAULT_HOME_WIDGETS;
  return [...new Set(list.filter((id): id is HomeWidgetId => (HOME_WIDGETS as readonly unknown[]).includes(id)))];
}

/** Drops empty values and anything that fails validation. */
export function cleanLayer(layer: AppearanceLayer | null | undefined): AppearanceLayer {
  if (!layer) return {};
  const out: AppearanceLayer = {};
  for (const [key, value] of Object.entries(layer) as [keyof Appearance, unknown][]) {
    if (value === undefined || value === null || value === '') continue;
    if (key === 'mobileHomeWidgets') {
      if (Array.isArray(value)) out.mobileHomeWidgets = normalizeWidgets(value);
      continue;
    }
    if ((key === 'mobileAnimations' || key === 'mobileHaptics' || key === 'reduceMotion') && typeof value !== 'boolean') continue;
    if (key === 'brandColor' && !isHexColor(value)) continue;
    const allowed = OPTIONS[key];
    if (allowed && !(typeof value === 'string' && Object.prototype.hasOwnProperty.call(allowed, value))) continue;
    (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

export function resolveAppearance(layers: AppearanceLayers): ResolvedAppearance {
  const platform = cleanLayer(layers.platform);
  const business = cleanLayer(layers.business);
  const personal = cleanLayer(layers.personal);
  const merged: Appearance = { ...DEFAULT_APPEARANCE, ...platform, ...business, ...personal };
  const mobile: MobileAppearance = {
    tabBar: merged.mobileTabBar,
    header: merged.mobileHeader,
    startScreen: merged.mobileStartScreen,
    posGrid: merged.mobilePosGrid,
    animations: merged.mobileAnimations,
    haptics: merged.mobileHaptics,
  };

  const accentHex =
    personal.brandColor ??
    business.brandColor ??
    (isHexColor(layers.industryColor) ? layers.industryColor : null) ??
    platform.brandColor ??
    DEFAULT_BRAND_HEX;

  return { ...merged, mobile, accentHex: accentHex.startsWith('#') ? accentHex : `#${accentHex}` };
}

export function normalizeMode(value: unknown): ThemeMode | undefined {
  if (value === 'light' || value === 'dark' || value === 'system') return value;
  if (value === 'auto') return 'system';
  return undefined;
}
