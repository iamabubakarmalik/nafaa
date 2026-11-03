/**
 * Typography tokens: font choices (same ids as the web), weights and the
 * type scale.
 *
 * Inter and Noto Naskh Arabic ship inside the app. Every other font in the
 * lists is downloaded from Google Fonts the first time it is chosen (see
 * theme/fonts.ts) and the bundled font is used until it arrives, so a choice
 * made on the web also works here.
 *
 * Urdu: the Text component renders Urdu script with the Urdu font and
 * everything else (digits, English words, amounts) with the Latin font — the
 * same "Latin first" stack the web uses — with a taller line height so Naskh
 * is never clipped.
 */

import { msg } from '@/core/i18n';

export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy';
export const WEIGHT_NUM: Record<FontWeight, number> = { regular: 400, medium: 500, semibold: 600, bold: 700, heavy: 800 };

export interface FontOption {
  id: string;
  label: string;
  /** Google Fonts family name, or null for bundled/system fonts. */
  family: string | null;
  sample: string;
}

export const CUSTOM_FONT_PREFIX = 'gf:';
export const isCustomFontId = (id: string | undefined): id is string => !!id && id.startsWith(CUSTOM_FONT_PREFIX);

export const LATIN_FONTS: readonly FontOption[] = [
  { id: 'inter', label: msg('Inter'), family: null, sample: 'Aa 123' },
  { id: 'jakarta', label: msg('Plus Jakarta Sans'), family: 'Plus Jakarta Sans', sample: 'Aa 123' },
  { id: 'manrope', label: msg('Manrope'), family: 'Manrope', sample: 'Aa 123' },
  { id: 'poppins', label: msg('Poppins'), family: 'Poppins', sample: 'Aa 123' },
  { id: 'nunito', label: msg('Nunito'), family: 'Nunito', sample: 'Aa 123' },
  { id: 'ibm-plex', label: msg('IBM Plex Sans'), family: 'IBM Plex Sans', sample: 'Aa 123' },
  { id: 'system', label: msg('System font'), family: null, sample: 'Aa 123' },
];

export const URDU_FONTS: readonly FontOption[] = [
  { id: 'naskh', label: msg('Noto Naskh (clear)'), family: null, sample: 'نفع — آپ کا کاروبار' },
  { id: 'nastaliq', label: msg('Noto Nastaliq (classic)'), family: 'Noto Nastaliq Urdu', sample: 'نفع — آپ کا کاروبار' },
  { id: 'gulzar', label: msg('Gulzar (Nastaliq)'), family: 'Gulzar', sample: 'نفع — آپ کا کاروبار' },
  { id: 'noto-sans-arabic', label: msg('Noto Sans Arabic (modern)'), family: 'Noto Sans Arabic', sample: 'نفع — آپ کا کاروبار' },
];

export const DEFAULT_LATIN_FONT = 'inter';
export const DEFAULT_URDU_FONT = 'naskh';

export function findLatinFont(id: string | undefined): FontOption {
  if (isCustomFontId(id)) {
    const family = id.slice(CUSTOM_FONT_PREFIX.length);
    return { id, label: family, family, sample: 'Aa 123' };
  }
  return LATIN_FONTS.find((f) => f.id === id) ?? LATIN_FONTS[0];
}

export function findUrduFont(id: string | undefined): FontOption {
  if (isCustomFontId(id)) {
    const family = id.slice(CUSTOM_FONT_PREFIX.length);
    return { id, label: family, family, sample: 'نفع' };
  }
  return URDU_FONTS.find((f) => f.id === id) ?? URDU_FONTS[0];
}

/** Bundled font family names (keys passed to useFonts in theme/fonts.ts). */
export const BUNDLED = {
  latin: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    heavy: 'Inter_800ExtraBold',
  },
  urdu: {
    regular: 'NotoNaskhArabic_400Regular',
    medium: 'NotoNaskhArabic_500Medium',
    semibold: 'NotoNaskhArabic_600SemiBold',
    bold: 'NotoNaskhArabic_700Bold',
    heavy: 'NotoNaskhArabic_700Bold',
  },
} as const satisfies Record<'latin' | 'urdu', Record<FontWeight, string>>;

/**
 * Text-size setting. Same ids and factors as the web root font percentages.
 */
export const TEXT_SCALES = {
  sm: { label: msg('Small'), factor: 0.9375 },
  md: { label: msg('Normal'), factor: 1 },
  lg: { label: msg('Large'), factor: 1.0625 },
  xl: { label: msg('Extra large'), factor: 1.125 },
} as const;
export type TextScale = keyof typeof TEXT_SCALES;

/**
 * Type scale in points at Normal size: [fontSize, lineHeight].
 * Nothing on screen goes below 11pt.
 */
export const TYPE = {
  '2xs': [11, 14],
  xs: [12, 16],
  sm: [13, 18],
  base: [15, 21],
  md: [16, 22],
  lg: [18, 24],
  xl: [20, 26],
  '2xl': [24, 30],
  '3xl': [30, 36],
  '4xl': [36, 42],
} as const;
export type TypeSize = keyof typeof TYPE;

/** Urdu (Naskh) needs more room above and below the letters. */
export const URDU_LINE_FACTOR = 1.55;

/** Largest OS font scale honoured (beyond this, layouts break on phones). */
export const MAX_FONT_SCALE = 1.35;
