/**
 * Layout tokens: density and corner radius.
 *
 * Both work app-wide without touching components: Tailwind's spacing and
 * border-radius scales are multiplied by `--density-scale` and
 * `--radius-scale` (see tailwind.config.js), which apply.ts sets on <html>.
 */

export const DENSITIES = {
  comfortable: { label: 'Comfortable', scale: 1 },
  compact: { label: 'Compact', scale: 0.88 },
} as const;
export type Density = keyof typeof DENSITIES;

export const RADII = {
  sharp: { label: 'Sharp', scale: 0.45 },
  default: { label: 'Rounded', scale: 1 },
  round: { label: 'Extra round', scale: 1.4 },
} as const;
export type Radius = keyof typeof RADII;
