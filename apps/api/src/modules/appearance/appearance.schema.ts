/**
 * Appearance layer validation.
 *
 * A layer is a partial set of appearance preferences. Only known keys with
 * allowed values are kept, so stored layers stay small and the web client can
 * trust what it reads. Mirrors apps/web/src/design-system/theme/appearance.ts.
 */

export type AppearanceLayer = Partial<{
  mode: 'light' | 'dark' | 'system';
  brandColor: string | null;
  canvasTone: 'soft' | 'white' | 'warm' | 'cool' | 'tinted';
  sidebarStyle: 'light' | 'dark' | 'brand';
  sidebarMode: 'auto' | 'expanded' | 'collapsed';
  latinFont: string;
  urduFont: string;
  textScale: 'sm' | 'md' | 'lg' | 'xl';
  density: 'comfortable' | 'compact';
  radius: 'sharp' | 'default' | 'round';
  reduceMotion: boolean;
  contrast: 'normal' | 'high';
  language: 'en' | 'roman_ur' | 'ur';
}>;

const ENUMS: Record<string, readonly string[]> = {
  mode: ['light', 'dark', 'system'],
  canvasTone: ['soft', 'white', 'warm', 'cool', 'tinted'],
  sidebarStyle: ['light', 'dark', 'brand'],
  sidebarMode: ['auto', 'expanded', 'collapsed'],
  textScale: ['sm', 'md', 'lg', 'xl'],
  density: ['comfortable', 'compact'],
  radius: ['sharp', 'default', 'round'],
  language: ['en', 'roman_ur', 'ur'],
  contrast: ['normal', 'high'],
};

/** Built-in font ids, or "gf:<Family Name>" for any Google Font. */
const FONT_ID = /^([a-z0-9-]{2,32}|gf:[A-Za-z0-9 ]{2,40})$/;
const HEX = /^#[0-9a-f]{6}$/i;

/** Keeps valid fields only. `null` clears a field so the layer below shows through. */
export function sanitizeLayer(input: unknown): AppearanceLayer {
  if (!input || typeof input !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === null || value === undefined) continue;
    if (ENUMS[key]) {
      if (typeof value === 'string' && ENUMS[key].includes(value)) out[key] = value;
    } else if (key === 'brandColor') {
      if (typeof value === 'string' && HEX.test(value)) out[key] = value.toLowerCase();
    } else if (key === 'latinFont' || key === 'urduFont') {
      if (typeof value === 'string' && FONT_ID.test(value)) out[key] = value;
    } else if (key === 'reduceMotion') {
      if (typeof value === 'boolean') out[key] = value;
    }
  }
  return out as AppearanceLayer;
}
