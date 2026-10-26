/**
 * Page header (PageHero) options offered in Settings → Appearance.
 *
 * The colors for each style are CSS variables in styles/hero.css, set per
 * style on `.nafaa-hero[data-hero-style=…]`, so they follow the accent color
 * and dark mode at runtime. This file holds the option lists and labels.
 */

export const HERO_STYLES = {
  modern: { label: 'Modern', description: 'Gradient, glow aur dots' },
  simple: { label: 'Simple', description: 'Seedha brand rang, saaf' },
  soft: { label: 'Halka (Soft)', description: 'Halka rang, gehra text' },
  dark: { label: 'Dark', description: 'Gehra dabba, rang ki chamak' },
  aurora: { label: 'Aurora', description: 'Rang ke kai shade mile hue' },
  outline: { label: 'Outline', description: 'Sirf kinara, andar khaali' },
} as const;
export type HeroStyle = keyof typeof HERO_STYLES;

/** Styles drawn on a light surface; white content inside them is remapped to dark text. */
export const LIGHT_HERO_STYLES: readonly HeroStyle[] = ['soft', 'outline'];

/** Styles that never draw a background pattern. */
export const PLAIN_HERO_STYLES: readonly HeroStyle[] = ['simple'];

export const HERO_PATTERNS = {
  dots: { label: 'Dots' },
  grid: { label: 'Grid' },
  lines: { label: 'Lines' },
  none: { label: 'Koi nahi' },
} as const;
export type HeroPattern = keyof typeof HERO_PATTERNS;

export const HERO_SIZES = {
  comfortable: { label: 'Comfortable', description: 'Khula, bara number' },
  compact: { label: 'Compact', description: 'Kam jagah, chhota number' },
} as const;
export type HeroSize = keyof typeof HERO_SIZES;

export const HERO_STATS_LAYOUTS = {
  inline: { label: 'Ek line me', description: 'Number saath saath' },
  cards: { label: 'Cards', description: 'Har number alag dabbe me' },
} as const;
export type HeroStatsLayout = keyof typeof HERO_STATS_LAYOUTS;

/** Everything PageHero needs to know about its look. */
export interface HeroLook {
  style: HeroStyle;
  pattern: HeroPattern;
  size: HeroSize;
  stats: HeroStatsLayout;
}
