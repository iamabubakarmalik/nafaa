/**
 * Density, corner radius and spacing (same option ids and scales as the web).
 *
 * Spacing follows a 4pt grid: `space(4)` is 16pt at comfortable density and
 * ~14pt at compact. Radii are multiplied by the Corners setting.
 */

import { msg } from '@/core/i18n';

export const DENSITIES = {
  comfortable: { label: msg('Comfortable'), scale: 1 },
  compact: { label: msg('Compact'), scale: 0.88 },
} as const;
export type Density = keyof typeof DENSITIES;

export const RADII = {
  sharp: { label: msg('Sharp'), scale: 0.45 },
  default: { label: msg('Rounded'), scale: 1 },
  round: { label: msg('Extra round'), scale: 1.4 },
} as const;
export type Radius = keyof typeof RADII;

/** Web-only (page width); kept so the shared layers stay complete. */
export type PageWidth = 'normal' | 'wide' | 'full';

/** Base radius steps in points before the Corners scale. */
export const RADIUS_STEPS = { xs: 6, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 28, full: 999 } as const;
export type RadiusStep = keyof typeof RADIUS_STEPS;

/** Minimum touch target (Apple HIG 44pt, Material 48dp). */
export const TOUCH_MIN = 44;

/** Control heights by size, before density. */
export const CONTROL_HEIGHTS = { sm: 36, md: 44, lg: 52, xl: 56 } as const;
export type ControlSize = keyof typeof CONTROL_HEIGHTS;

/** Screen width from which the tablet layout (side rail, two panes) is used. */
export const TABLET_MIN_WIDTH = 768;
/** Width from which a two-pane list/detail layout is used. */
export const WIDE_MIN_WIDTH = 1024;
