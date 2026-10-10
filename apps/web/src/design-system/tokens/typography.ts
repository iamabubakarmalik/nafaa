/**
 * Typography tokens: the fonts a user can choose and the text-size scale.
 *
 * Fonts are loaded on demand from Google Fonts, so only the fonts that are
 * actually selected are downloaded. "System" uses the operating system font
 * and loads nothing.
 *
 * The default Latin font is Inter on every platform. Earlier builds used
 * Segoe UI first, which made text wider on Windows than on macOS and broke
 * layouts that were only checked on a Mac.
 */

export interface FontOption {
  id: string;
  label: string;
  /** CSS font-family stack, including fallbacks. */
  stack: string;
  /** Google Fonts `family=` value, or null for fonts that need no download. */
  google: string | null;
  /** Short sample shown in the font picker. */
  sample: string;
}

const LATIN_FALLBACK = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const URDU_FALLBACK = "'Noto Naskh Arabic', 'Segoe UI', Tahoma, serif";

export const LATIN_FONTS: readonly FontOption[] = [
  { id: 'inter', label: 'Inter', stack: `'Inter', ${LATIN_FALLBACK}`, google: 'Inter:wght@400;500;600;700;800;900', sample: 'Aa 123' },
  { id: 'jakarta', label: 'Plus Jakarta Sans', stack: `'Plus Jakarta Sans', ${LATIN_FALLBACK}`, google: 'Plus+Jakarta+Sans:wght@400;500;600;700;800', sample: 'Aa 123' },
  { id: 'manrope', label: 'Manrope', stack: `'Manrope', ${LATIN_FALLBACK}`, google: 'Manrope:wght@400;500;600;700;800', sample: 'Aa 123' },
  { id: 'poppins', label: 'Poppins', stack: `'Poppins', ${LATIN_FALLBACK}`, google: 'Poppins:wght@400;500;600;700;800', sample: 'Aa 123' },
  { id: 'nunito', label: 'Nunito', stack: `'Nunito', ${LATIN_FALLBACK}`, google: 'Nunito:wght@400;500;600;700;800;900', sample: 'Aa 123' },
  { id: 'ibm-plex', label: 'IBM Plex Sans', stack: `'IBM Plex Sans', ${LATIN_FALLBACK}`, google: 'IBM+Plex+Sans:wght@400;500;600;700', sample: 'Aa 123' },
  { id: 'system', label: 'System font', stack: LATIN_FALLBACK, google: null, sample: 'Aa 123' },
];

export const URDU_FONTS: readonly FontOption[] = [
  { id: 'naskh', label: 'Noto Naskh (clear)', stack: `'Noto Naskh Arabic', ${URDU_FALLBACK}`, google: 'Noto+Naskh+Arabic:wght@400;500;600;700', sample: 'نفع — آپ کا کاروبار' },
  { id: 'nastaliq', label: 'Noto Nastaliq (classic)', stack: `'Noto Nastaliq Urdu', ${URDU_FALLBACK}`, google: 'Noto+Nastaliq+Urdu:wght@400;500;600;700', sample: 'نفع — آپ کا کاروبار' },
  { id: 'gulzar', label: 'Gulzar (Nastaliq)', stack: `'Gulzar', ${URDU_FALLBACK}`, google: 'Gulzar', sample: 'نفع — آپ کا کاروبار' },
  { id: 'noto-sans-arabic', label: 'Noto Sans Arabic (modern)', stack: `'Noto Sans Arabic', ${URDU_FALLBACK}`, google: 'Noto+Sans+Arabic:wght@400;500;600;700', sample: 'نفع — آپ کا کاروبار' },
];

export const MONO_STACK = "'JetBrains Mono', 'Cascadia Code', 'SF Mono', Consolas, ui-monospace, monospace";

export const DEFAULT_LATIN_FONT = 'inter';
export const DEFAULT_URDU_FONT = 'naskh';

export const findLatinFont = (id: string | undefined) => LATIN_FONTS.find((f) => f.id === id) ?? LATIN_FONTS[0];
export const findUrduFont = (id: string | undefined) => URDU_FONTS.find((f) => f.id === id) ?? URDU_FONTS[0];

/**
 * Text size scales the root font size. All type in the app is expressed in
 * rem, so one value resizes every screen consistently.
 */
export const TEXT_SCALES = {
  sm: { label: 'Small', rootPercent: 93.75 },
  md: { label: 'Normal', rootPercent: 100 },
  lg: { label: 'Large', rootPercent: 106.25 },
  xl: { label: 'Extra large', rootPercent: 112.5 },
} as const;
export type TextScale = keyof typeof TEXT_SCALES;
