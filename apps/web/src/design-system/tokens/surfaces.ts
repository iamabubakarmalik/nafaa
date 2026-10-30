/**
 * Page background (canvas) tones and the matching sidebar surface.
 *
 * Values are RGB channels. "tinted" is mixed from the accent color at runtime.
 */

import { t } from '@core/i18n';
type Rgb = [number, number, number];

export interface CanvasToneDef {
  label: string;
  description: string;
  light: { canvas: Rgb; sidebar: Rgb };
  dark: { canvas: Rgb; sidebar: Rgb };
}

export const CANVAS_TONES = {
  soft: {
    label: t('Soft grey'),
    description: t('Calm and neutral'),
    light: { canvas: [246, 247, 249], sidebar: [238, 240, 243] },
    dark: { canvas: [9, 13, 24], sidebar: [6, 10, 20] },
  },
  white: {
    label: t('Clean white'),
    description: t('Bright, minimal'),
    light: { canvas: [255, 255, 255], sidebar: [248, 250, 252] },
    dark: { canvas: [13, 18, 31], sidebar: [9, 13, 24] },
  },
  warm: {
    label: t('Warm'),
    description: t('Paper-like, easy on the eyes'),
    light: { canvas: [250, 248, 244], sidebar: [243, 240, 234] },
    dark: { canvas: [17, 15, 13], sidebar: [12, 11, 9] },
  },
  cool: {
    label: t('Cool'),
    description: t('Crisp blue-grey'),
    light: { canvas: [243, 246, 251], sidebar: [233, 238, 246] },
    dark: { canvas: [8, 13, 27], sidebar: [5, 9, 21] },
  },
  tinted: {
    label: t('Brand tint'),
    description: t('A hint of your color'),
    // Placeholders; apply.ts mixes the accent into these.
    light: { canvas: [246, 247, 249], sidebar: [238, 240, 243] },
    dark: { canvas: [9, 13, 24], sidebar: [6, 10, 20] },
  },
} satisfies Record<string, CanvasToneDef>;

export type CanvasToneId = keyof typeof CANVAS_TONES;
