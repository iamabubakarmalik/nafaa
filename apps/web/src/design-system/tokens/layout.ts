/**
 * Layout tokens: density and corner radius.
 *
 * Both are applied as data attributes on <html> (`data-density`,
 * `data-radius`) and as CSS variables, so components can opt in with plain
 * CSS instead of reading React state.
 */

export const DENSITIES = {
  comfortable: { label: 'Comfortable', controlHeight: '2.5rem', gap: '1rem' },
  compact: { label: 'Compact', controlHeight: '2.125rem', gap: '0.75rem' },
} as const;
export type Density = keyof typeof DENSITIES;

export const RADII = {
  sharp: { label: 'Sharp', base: '0.375rem' },
  default: { label: 'Rounded', base: '0.75rem' },
  round: { label: 'Extra round', base: '1rem' },
} as const;
export type Radius = keyof typeof RADII;

/** Content width at which page grids switch layout (used by container queries). */
export const CONTENT_BREAKPOINTS = {
  narrow: 640,
  medium: 900,
  wide: 1200,
} as const;
