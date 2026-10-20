/**
 * Colors and brand assets for OG cards.
 *
 * Satori draws with inline styles only and cannot read CSS variables, so the
 * values the cards use are copied here from src/styles/tokens.css (brand
 * scale, synced from apps/web) and Tailwind's slate scale. Keep them in step
 * with the tokens when the brand scale changes.
 */
import { LOGO_ICON_SVG, LOGO_LOCKUP, LOGO_LOCKUP_SVG } from '@/lib/brand/logo';

export const OG_COLORS = {
  brand50: '#ecfdf5',
  brand100: '#d1fae5',
  brand600: '#059669',
  brand700: '#047857',
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  slate500: '#64748b',
  slate600: '#475569',
  slate900: '#0f172a',
  ink: '#020617',
  white: '#ffffff',
} as const;

/** Default accent when an entry has no industry color. Fills with white text pass 4.5:1. */
export const OG_DEFAULT_ACCENT = OG_COLORS.brand600;

/** Same pattern as the contract's HEX_COLOR_PATTERN; accents must be #rrggbb. */
const HEX = /^#[0-9a-fA-F]{6}$/;

export function safeAccent(color: string | null | undefined): string {
  return color && HEX.test(color) ? color : OG_DEFAULT_ACCENT;
}

/** `#rrggbb` plus an alpha, as `rgba()` (Satori has no color-mix). */
export function withAlpha(hex: string, alpha: number): string {
  const value = HEX.test(hex) ? hex : OG_DEFAULT_ACCENT;
  const r = Number.parseInt(value.slice(1, 3), 16);
  const g = Number.parseInt(value.slice(3, 5), 16);
  const b = Number.parseInt(value.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * The Nafaa app icon (the noon mark on the green tile) and the horizontal
 * logo, from brand/logo via @/lib/brand/logo. Embedded as data URIs so card
 * rendering reads no files.
 */
export const LOGO_MARK_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(LOGO_ICON_SVG).toString('base64')}`;
export const LOGO_LOCKUP_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(LOGO_LOCKUP_SVG).toString('base64')}`;
/** Width : height of the horizontal logo. */
export const LOGO_LOCKUP_RATIO = LOGO_LOCKUP.width / LOGO_LOCKUP.height;
