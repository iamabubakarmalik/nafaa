/**
 * Colors and brand assets for OG cards.
 *
 * Satori draws with inline styles only and cannot read CSS variables, so the
 * values the cards use are copied here from src/styles/tokens.css (brand
 * scale, synced from apps/web) and Tailwind's slate scale. Keep them in step
 * with the tokens when the brand scale changes.
 */

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
 * The Nafaa mark, identical to public/logo.svg (the logo used by the app and
 * the current site). Embedded as a data URI so card rendering reads no files.
 */
const LOGO_MARK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">' +
  '<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">' +
  '<stop offset="0%" stop-color="#22c55e"/><stop offset="50%" stop-color="#16a34a"/><stop offset="100%" stop-color="#15803d"/>' +
  '</linearGradient><linearGradient id="a" x1="0%" y1="0%" x2="100%" y2="100%">' +
  '<stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient></defs>' +
  '<rect x="4" y="4" width="72" height="72" rx="18" ry="18" fill="url(#g)"/>' +
  '<g transform="translate(40, 42)" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">' +
  '<line x1="-16" y1="-16" x2="-16" y2="16"/><line x1="-16" y1="16" x2="16" y2="-16"/>' +
  '<line x1="16" y1="-16" x2="16" y2="16"/><polyline points="7,-16 16,-16 16,-7"/></g>' +
  '<circle cx="62" cy="18" r="5" fill="url(#a)"/></svg>';

export const LOGO_MARK_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(LOGO_MARK_SVG).toString('base64')}`;
