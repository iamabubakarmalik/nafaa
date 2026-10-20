/**
 * Site-only design scales (ARCH 4.2). tailwind.config.ts builds the theme
 * from these, and the /_dev/design gallery documents them from the same
 * objects, so the two cannot drift. Plain data: no imports.
 */

export interface TypeStep {
  size: string;
  lineHeight: string;
  weight: string;
  tracking: string;
  use: string;
}

export const typeScale = {
  display: { size: 'clamp(2.5rem, 1.6rem + 3.6vw, 4.5rem)', lineHeight: '1.05', weight: '650', tracking: '-0.035em', use: 'Home hero only' },
  h1: { size: 'clamp(2.125rem, 1.5rem + 2.5vw, 3.5rem)', lineHeight: '1.1', weight: '650', tracking: '-0.03em', use: 'Page H1' },
  h2: { size: 'clamp(1.75rem, 1.35rem + 1.6vw, 2.5rem)', lineHeight: '1.15', weight: '650', tracking: '-0.02em', use: 'Section titles' },
  h3: { size: 'clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem)', lineHeight: '1.3', weight: '600', tracking: '-0.01em', use: 'Cards, sub-sections' },
  h4: { size: '1.0625rem', lineHeight: '1.45', weight: '600', tracking: '-0.005em', use: 'Card titles, small headings' },
  'body-lg': { size: 'clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)', lineHeight: '1.6', weight: '400', tracking: '0', use: 'Lead paragraphs, AnswerBox' },
  body: { size: '1rem', lineHeight: '1.65', weight: '400', tracking: '0', use: 'Body' },
  small: { size: '0.875rem', lineHeight: '1.5', weight: '400', tracking: '0', use: 'Captions, meta' },
  eyebrow: { size: '0.75rem', lineHeight: '1.4', weight: '600', tracking: '0.08em', use: 'Section labels (uppercase)' },
} as const satisfies Record<string, TypeStep>;

export type TypeToken = keyof typeof typeScale;

export const radii = {
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '20px',
} as const;

export const shadows = {
  e1: '0 0 0 1px rgb(15 23 42 / 0.04), 0 1px 2px rgb(15 23 42 / 0.06)',
  e2: '0 0 0 1px rgb(15 23 42 / 0.04), 0 2px 4px rgb(15 23 42 / 0.04), 0 12px 24px -6px rgb(15 23 42 / 0.10)',
  e3: '0 0 0 1px rgb(15 23 42 / 0.05), 0 4px 8px rgb(15 23 42 / 0.04), 0 24px 48px -12px rgb(15 23 42 / 0.18)',
} as const;

export const widths = {
  container: '72rem',
  wide: '80rem',
  prose: '68ch',
  measure: '42rem',
} as const;

/** Motion tokens, mirrored as CSS variables in motion.css. */
export const motion = {
  easing: {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
  },
  duration: {
    fast: '150ms',
    base: '250ms',
    slow: '450ms',
    draw: '1200ms',
  },
} as const;
