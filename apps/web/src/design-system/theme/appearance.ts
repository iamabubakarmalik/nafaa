/**
 * Appearance model and resolution rules.
 *
 * What the user sees is the result of four layers, each overriding the one
 * before it for the fields it sets:
 *
 *   1. Built-in defaults           (this file)
 *   2. Platform defaults           set by Nafaa staff in the admin panel
 *   3. Business defaults           set by the owner in Settings → Appearance
 *   4. Personal preferences        set by each user for themselves
 *
 * The accent color has one extra fallback: when neither the business nor the
 * user picked a color, the industry identity color is used, so a new bakery
 * account already looks like a bakery.
 */

import { isHexColor } from '../tokens/color';
import { DEFAULT_BRAND_HEX } from '../tokens/presets';
import { DEFAULT_LATIN_FONT, DEFAULT_URDU_FONT, type TextScale } from '../tokens/typography';
import type { Density, PageWidth, Radius } from '../tokens/layout';
import {
  HERO_PATTERNS, HERO_SIZES, HERO_STATS_LAYOUTS, HERO_STYLES,
  type HeroPattern, type HeroSize, type HeroStatsLayout, type HeroStyle,
} from '../tokens/hero';

export type ThemeMode = 'light' | 'dark' | 'system';
export type Language = 'en' | 'roman_ur' | 'ur';
export type CanvasTone = 'soft' | 'white' | 'warm' | 'cool' | 'tinted';
export type SidebarStyle = 'light' | 'dark' | 'brand';
export type SidebarMode = 'auto' | 'expanded' | 'collapsed';

export interface Appearance {
  mode: ThemeMode;
  /** Hex accent color, or null to follow the industry identity. */
  brandColor: string | null;
  /** Page background behind cards. */
  canvasTone: CanvasTone;
  sidebarStyle: SidebarStyle;
  /** Full sidebar, icon rail, or automatic by screen width. */
  sidebarMode: SidebarMode;
  latinFont: string;
  urduFont: string;
  textScale: TextScale;
  density: Density;
  radius: Radius;
  /** Max width of page content on large screens. */
  pageWidth: PageWidth;
  reduceMotion: boolean;
  /** "high" darkens secondary text and lines for readability. */
  contrast: 'normal' | 'high';
  language: Language;
  /** Page header (PageHero) look: style, background pattern, size and stats layout. */
  heroStyle: HeroStyle;
  heroPattern: HeroPattern;
  heroSize: HeroSize;
  heroStats: HeroStatsLayout;
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
  language: 'roman_ur',
  heroStyle: 'modern',
  heroPattern: 'dots',
  heroSize: 'comfortable',
  heroStats: 'inline',
};

export interface AppearanceLayers {
  platform?: AppearanceLayer | null;
  business?: AppearanceLayer | null;
  personal?: AppearanceLayer | null;
  /** Industry identity color, used when no brand color is chosen. */
  industryColor?: string | null;
}

export interface ResolvedAppearance extends Appearance {
  /** Final accent hex after every fallback; never null. */
  accentHex: string;
}

/** Allowed values for the header fields; a value from a newer or older client is ignored. */
const HERO_OPTIONS: Partial<Record<keyof Appearance, Record<string, unknown>>> = {
  heroStyle: HERO_STYLES,
  heroPattern: HERO_PATTERNS,
  heroSize: HERO_SIZES,
  heroStats: HERO_STATS_LAYOUTS,
};

/** Drops undefined/null values and anything that fails validation. */
function clean(layer: AppearanceLayer | null | undefined): AppearanceLayer {
  if (!layer) return {};
  const out: AppearanceLayer = {};
  for (const [key, value] of Object.entries(layer) as [keyof Appearance, unknown][]) {
    if (value === undefined || value === null || value === '') continue;
    if (key === 'brandColor' && !isHexColor(value)) continue;
    const allowed = HERO_OPTIONS[key];
    if (allowed && !(typeof value === 'string' && Object.hasOwn(allowed, value))) continue;
    (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

export function resolveAppearance(layers: AppearanceLayers): ResolvedAppearance {
  const platform = clean(layers.platform);
  const business = clean(layers.business);
  const personal = clean(layers.personal);
  const merged: Appearance = { ...DEFAULT_APPEARANCE, ...platform, ...business, ...personal };

  // The brand color skips the platform layer until the industry color has had
  // its say: a platform-wide default should not repaint every industry.
  const accentHex =
    personal.brandColor ??
    business.brandColor ??
    (isHexColor(layers.industryColor) ? layers.industryColor : null) ??
    platform.brandColor ??
    DEFAULT_BRAND_HEX;

  return { ...merged, accentHex: accentHex.startsWith('#') ? accentHex : `#${accentHex}` };
}

/** Maps the legacy tenant setting values ('auto') onto the current model. */
export function normalizeMode(value: unknown): ThemeMode | undefined {
  if (value === 'light' || value === 'dark' || value === 'system') return value;
  if (value === 'auto') return 'system';
  return undefined;
}
