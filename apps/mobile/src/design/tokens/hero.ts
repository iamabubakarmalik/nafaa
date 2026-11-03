/**
 * PageHero options (same ids as the web tokens/hero.ts).
 */

import { msg } from '@/core/i18n';

export const HERO_STYLES = {
  modern: { label: msg('Modern'), description: msg('Gradient, glow aur dots') },
  simple: { label: msg('Simple'), description: msg('Seedha brand rang, saaf') },
  soft: { label: msg('Halka (Soft)'), description: msg('Halka rang, gehra text') },
  dark: { label: msg('Dark'), description: msg('Gehra dabba, rang ki chamak') },
  aurora: { label: msg('Aurora'), description: msg('Rang ke kai shade mile hue') },
  outline: { label: msg('Outline'), description: msg('Sirf kinara, andar khaali') },
} as const;
export type HeroStyle = keyof typeof HERO_STYLES;

/** Styles drawn on a light surface (dark text inside). */
export const LIGHT_HERO_STYLES: readonly HeroStyle[] = ['soft', 'outline'];
export const PLAIN_HERO_STYLES: readonly HeroStyle[] = ['simple'];

export const HERO_PATTERNS = {
  dots: { label: msg('Dots') },
  grid: { label: msg('Grid') },
  lines: { label: msg('Lines') },
  none: { label: msg('Koi nahi') },
} as const;
export type HeroPattern = keyof typeof HERO_PATTERNS;

export const HERO_SIZES = {
  comfortable: { label: msg('Comfortable'), description: msg('Khula, bara number') },
  compact: { label: msg('Compact'), description: msg('Kam jagah, chhota number') },
} as const;
export type HeroSize = keyof typeof HERO_SIZES;

export const HERO_STATS_LAYOUTS = {
  inline: { label: msg('Ek line me'), description: msg('Number saath saath') },
  cards: { label: msg('Cards'), description: msg('Har number alag dabbe me') },
} as const;
export type HeroStatsLayout = keyof typeof HERO_STATS_LAYOUTS;
