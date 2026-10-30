/**
 * Page header (PageHero) options offered in Settings → Appearance.
 *
 * The colors for each style are CSS variables in styles/hero.css, set per
 * style on `.nafaa-hero[data-hero-style=…]`, so they follow the accent color
 * and dark mode at runtime. This file holds the option lists and labels.
 */

import { t } from '@core/i18n';
export const HERO_STYLES = {
  modern: { label: t('Modern'), description: t('Gradient, glow aur dots') },
  simple: { label: t('Simple'), description: t('Seedha brand rang, saaf') },
  soft: { label: t('Halka (Soft)'), description: t('Halka rang, gehra text') },
  dark: { label: t('Dark'), description: t('Gehra dabba, rang ki chamak') },
  aurora: { label: t('Aurora'), description: t('Rang ke kai shade mile hue') },
  outline: { label: t('Outline'), description: t('Sirf kinara, andar khaali') },
} as const;
export type HeroStyle = keyof typeof HERO_STYLES;

/** Styles drawn on a light surface; white content inside them is remapped to dark text. */
export const LIGHT_HERO_STYLES: readonly HeroStyle[] = ['soft', 'outline'];

/** Styles that never draw a background pattern. */
export const PLAIN_HERO_STYLES: readonly HeroStyle[] = ['simple'];

export const HERO_PATTERNS = {
  dots: { label: t('Dots') },
  grid: { label: t('Grid') },
  lines: { label: t('Lines') },
  none: { label: t('Koi nahi') },
} as const;
export type HeroPattern = keyof typeof HERO_PATTERNS;

export const HERO_SIZES = {
  comfortable: { label: t('Comfortable'), description: t('Khula, bara number') },
  compact: { label: t('Compact'), description: t('Kam jagah, chhota number') },
} as const;
export type HeroSize = keyof typeof HERO_SIZES;

export const HERO_STATS_LAYOUTS = {
  inline: { label: t('Ek line me'), description: t('Number saath saath') },
  cards: { label: t('Cards'), description: t('Har number alag dabbe me') },
} as const;
export type HeroStatsLayout = keyof typeof HERO_STATS_LAYOUTS;

/** Everything PageHero needs to know about its look. */
export interface HeroLook {
  style: HeroStyle;
  pattern: HeroPattern;
  size: HeroSize;
  stats: HeroStatsLayout;
}
