/**
 * Layout tokens: density and corner radius.
 *
 * Both work app-wide without touching components: Tailwind's spacing and
 * border-radius scales are multiplied by `--density-scale` and
 * `--radius-scale` (see tailwind.config.js), which apply.ts sets on <html>.
 */

import { t } from '@core/i18n';
export const DENSITIES = {
  comfortable: { label: t('Comfortable'), scale: 1 },
  compact: { label: t('Compact'), scale: 0.88 },
} as const;
export type Density = keyof typeof DENSITIES;

export const RADII = {
  sharp: { label: t('Sharp'), scale: 0.45 },
  default: { label: t('Rounded'), scale: 1 },
  round: { label: t('Extra round'), scale: 1.4 },
} as const;
export type Radius = keyof typeof RADII;

/** How wide page content may grow on big screens. */
export const PAGE_WIDTHS = {
  normal: { label: t('Normal'), max: '80rem' },
  wide: { label: t('Chauri'), max: '96rem' },
  full: { label: t('Poori screen'), max: '100%' },
} as const;
export type PageWidth = keyof typeof PAGE_WIDTHS;
