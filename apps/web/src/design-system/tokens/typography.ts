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

import { t } from '@core/i18n';
export interface FontOption {
  id: string;
  label: string;
  /** CSS font-family stack, including fallbacks. */
  stack: string;
  /** Google Fonts `family=` value, or null for fonts that need no download. */
  google: string | null;
  /** Full stylesheet URL; used for custom fonts instead of `google`. */
  href?: string;
  /** Short sample shown in the font picker. */
  sample: string;
}

/**
 * Any Google Font can be used by name. Its id is "gf:<Family Name>". The
 * legacy css API is used because it returns whichever of the requested
 * weights exist, while the css2 API rejects the whole request if one weight
 * is missing (common for display fonts).
 */
export const CUSTOM_FONT_PREFIX = 'gf:';
const CUSTOM_FONT_NAME = /^[A-Za-z0-9 ]{2,40}$/;

export const isCustomFontId = (id: string | undefined): id is string => !!id && id.startsWith(CUSTOM_FONT_PREFIX);
export const customFontId = (family: string) => `${CUSTOM_FONT_PREFIX}${family.trim().replace(/\s+/g, ' ')}`;
export const isValidFontFamily = (family: string) => CUSTOM_FONT_NAME.test(family.trim());

function customFont(id: string, fallback: string, sample: string): FontOption | null {
  const family = id.slice(CUSTOM_FONT_PREFIX.length);
  if (!isValidFontFamily(family)) return null;
  return {
    id,
    label: family,
    stack: `'${family}', ${fallback}`,
    google: null,
    href: `https://fonts.googleapis.com/css?family=${encodeURIComponent(family).replace(/%20/g, '+')}:400,500,600,700,800&display=swap`,
    sample,
  };
}

const LATIN_FALLBACK = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const URDU_FALLBACK = "'Noto Naskh Arabic', 'Segoe UI', Tahoma, serif";

export const LATIN_FONTS: readonly FontOption[] = [
  { id: 'inter', label: t('Inter'), stack: `'Inter', ${LATIN_FALLBACK}`, google: 'Inter:wght@400;500;600;700;800;900', sample: t('Aa 123') },
  { id: 'jakarta', label: t('Plus Jakarta Sans'), stack: `'Plus Jakarta Sans', ${LATIN_FALLBACK}`, google: 'Plus+Jakarta+Sans:wght@400;500;600;700;800', sample: t('Aa 123') },
  { id: 'manrope', label: t('Manrope'), stack: `'Manrope', ${LATIN_FALLBACK}`, google: 'Manrope:wght@400;500;600;700;800', sample: t('Aa 123') },
  { id: 'poppins', label: t('Poppins'), stack: `'Poppins', ${LATIN_FALLBACK}`, google: 'Poppins:wght@400;500;600;700;800', sample: t('Aa 123') },
  { id: 'nunito', label: t('Nunito'), stack: `'Nunito', ${LATIN_FALLBACK}`, google: 'Nunito:wght@400;500;600;700;800;900', sample: t('Aa 123') },
  { id: 'ibm-plex', label: t('IBM Plex Sans'), stack: `'IBM Plex Sans', ${LATIN_FALLBACK}`, google: 'IBM+Plex+Sans:wght@400;500;600;700', sample: t('Aa 123') },
  { id: 'system', label: t('System font'), stack: LATIN_FALLBACK, google: null, sample: t('Aa 123') },
];

export const URDU_FONTS: readonly FontOption[] = [
  { id: 'naskh', label: t('Noto Naskh (clear)'), stack: `'Noto Naskh Arabic', ${URDU_FALLBACK}`, google: 'Noto+Naskh+Arabic:wght@400;500;600;700', sample: t('نفع — آپ کا کاروبار') },
  { id: 'nastaliq', label: t('Noto Nastaliq (classic)'), stack: `'Noto Nastaliq Urdu', ${URDU_FALLBACK}`, google: 'Noto+Nastaliq+Urdu:wght@400;500;600;700', sample: t('نفع — آپ کا کاروبار') },
  { id: 'gulzar', label: t('Gulzar (Nastaliq)'), stack: `'Gulzar', ${URDU_FALLBACK}`, google: 'Gulzar', sample: t('نفع — آپ کا کاروبار') },
  { id: 'noto-sans-arabic', label: t('Noto Sans Arabic (modern)'), stack: `'Noto Sans Arabic', ${URDU_FALLBACK}`, google: 'Noto+Sans+Arabic:wght@400;500;600;700', sample: t('نفع — آپ کا کاروبار') },
];

export const MONO_STACK = "'JetBrains Mono', 'Cascadia Code', 'SF Mono', Consolas, ui-monospace, monospace";

export const DEFAULT_LATIN_FONT = 'inter';
export const DEFAULT_URDU_FONT = 'naskh';

export const findLatinFont = (id: string | undefined): FontOption =>
  (isCustomFontId(id) && customFont(id, LATIN_FALLBACK, 'Aa 123')) || LATIN_FONTS.find((f) => f.id === id) || LATIN_FONTS[0];
export const findUrduFont = (id: string | undefined): FontOption =>
  (isCustomFontId(id) && customFont(id, URDU_FALLBACK, 'نفع')) || URDU_FONTS.find((f) => f.id === id) || URDU_FONTS[0];

/**
 * Text size scales the root font size. All type in the app is expressed in
 * rem, so one value resizes every screen consistently.
 */
export const TEXT_SCALES = {
  sm: { label: t('Small'), rootPercent: 93.75 },
  md: { label: t('Normal'), rootPercent: 100 },
  lg: { label: t('Large'), rootPercent: 106.25 },
  xl: { label: t('Extra large'), rootPercent: 112.5 },
} as const;
export type TextScale = keyof typeof TEXT_SCALES;
