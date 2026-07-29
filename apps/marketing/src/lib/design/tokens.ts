/**
 * NAFAA DESIGN TOKENS — Aurora Retail System
 * Single source of truth for every visual decision.
 * Never hard-code colors, spacing, or motion anywhere else.
 */

// ─── COLORS ─────────────────────────────────────────────────────
export const colors = {
  // Nafaa Green — evolved, richer, more depth
  brand: {
    50:  '#ecfdf3',
    100: '#d1fadf',
    200: '#a6f4c5',
    300: '#6ce9a6',
    400: '#32d583',
    500: '#12b76a',   // primary
    600: '#039855',   // hover/active
    700: '#027a48',
    800: '#05603a',
    900: '#054f31',
    950: '#053321',
  },

  // Pakistan Flag Heritage — used for 🇵🇰 moments
  pakistan: {
    green:  '#01411C',   // official flag green
    light:  '#0d5c2d',
    white:  '#ffffff',
    accent: '#f4c531',   // crescent gold
  },

  // Aurora — marketplace/cosmic accents
  aurora: {
    purple:  '#8b5cf6',
    pink:    '#ec4899',
    cyan:    '#06b6d4',
    indigo:  '#6366f1',
    violet:  '#a855f7',
  },

  // Semantic
  sunset:  '#f97316',   // CTAs, urgency
  trust:   '#0284c7',   // integrations, trust
  gold:    '#f59e0b',   // premium, rating
  danger:  '#ef4444',
  success: '#10b981',

  // Neutral (dark-first)
  ink: {
    0:   '#ffffff',
    50:  '#fafbff',    // page bg light
    100: '#f4f6fb',
    200: '#e5e9f2',
    300: '#c9d0e0',
    400: '#8792ad',
    500: '#5b6785',
    600: '#3d4762',
    700: '#252d47',
    800: '#151b30',
    900: '#0a0e27',    // page bg dark
    950: '#050716',    // deepest
  },
} as const;

// ─── GRADIENTS ──────────────────────────────────────────────────
export const gradients = {
  brand:       'linear-gradient(135deg, #12b76a 0%, #039855 50%, #027a48 100%)',
  brandGlow:   'linear-gradient(135deg, #32d583 0%, #12b76a 100%)',

  aurora:      'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f97316 100%)',
  auroraNight: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 40%, #ec4899 100%)',

  pakistan:    'linear-gradient(135deg, #01411C 0%, #0d5c2d 50%, #12b76a 100%)',

  sunset:      'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
  ocean:       'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',

  // Mesh (for hero backgrounds) — use with SVG or CSS
  meshDark:    'radial-gradient(at 20% 20%, #12b76a20 0%, transparent 50%), radial-gradient(at 80% 10%, #8b5cf620 0%, transparent 50%), radial-gradient(at 50% 90%, #ec489920 0%, transparent 50%)',
  meshLight:   'radial-gradient(at 20% 20%, #12b76a15 0%, transparent 50%), radial-gradient(at 80% 10%, #8b5cf615 0%, transparent 50%), radial-gradient(at 50% 90%, #ec489915 0%, transparent 50%)',

  // Text
  textBrand:   'linear-gradient(120deg, #12b76a 0%, #06b6d4 50%, #8b5cf6 100%)',
  textAurora:  'linear-gradient(120deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)',
  textGold:    'linear-gradient(120deg, #f59e0b 0%, #f97316 100%)',

  // Glass
  glassLight:  'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 100%)',
  glassDark:   'linear-gradient(135deg, rgba(21,27,48,0.7) 0%, rgba(10,14,39,0.4) 100%)',
} as const;

// ─── TYPOGRAPHY SCALE ───────────────────────────────────────────
export const typography = {
  display: {
    '2xl': { size: '5.5rem', lh: '1.02', tracking: '-0.04em', weight: '800' },
    xl:    { size: '4.5rem', lh: '1.05', tracking: '-0.035em', weight: '800' },
    lg:    { size: '3.75rem', lh: '1.08', tracking: '-0.03em', weight: '800' },
    md:    { size: '3rem',  lh: '1.1',  tracking: '-0.025em', weight: '700' },
    sm:    { size: '2.25rem', lh: '1.15', tracking: '-0.02em', weight: '700' },
  },
  heading: {
    h1: { size: '2.5rem',  lh: '1.15', tracking: '-0.02em', weight: '700' },
    h2: { size: '2rem',    lh: '1.2',  tracking: '-0.015em', weight: '700' },
    h3: { size: '1.5rem',  lh: '1.3',  tracking: '-0.01em', weight: '700' },
    h4: { size: '1.25rem', lh: '1.4',  tracking: '-0.005em', weight: '600' },
    h5: { size: '1.125rem', lh: '1.5',  tracking: '0',        weight: '600' },
    h6: { size: '1rem',    lh: '1.5',  tracking: '0',        weight: '600' },
  },
  body: {
    xl: { size: '1.25rem', lh: '1.7', weight: '400' },
    lg: { size: '1.125rem', lh: '1.7', weight: '400' },
    md: { size: '1rem',    lh: '1.65', weight: '400' },
    sm: { size: '0.875rem', lh: '1.6', weight: '400' },
    xs: { size: '0.75rem', lh: '1.5', weight: '400' },
  },
  eyebrow: {
    size: '0.75rem', lh: '1.4', tracking: '0.15em', weight: '700', transform: 'uppercase',
  },
} as const;

// ─── SPACING ────────────────────────────────────────────────────
export const spacing = {
  section:   { sm: '4rem', md: '6rem', lg: '8rem', xl: '10rem' },
  container: { xs: '1rem', sm: '1.5rem', md: '2rem', lg: '3rem' },
} as const;

// ─── RADII ──────────────────────────────────────────────────────
export const radii = {
  xs:   '0.375rem',
  sm:   '0.625rem',
  md:   '0.875rem',
  lg:   '1.25rem',
  xl:   '1.75rem',
  '2xl':'2.25rem',
  '3xl':'2.75rem',
  full: '9999px',
} as const;

// ─── SHADOWS (multi-layered, brand-tinted) ──────────────────────
export const shadows = {
  xs:      '0 1px 2px rgba(5,7,22,0.05)',
  sm:      '0 2px 4px rgba(5,7,22,0.06), 0 1px 2px rgba(5,7,22,0.04)',
  md:      '0 4px 12px rgba(5,7,22,0.08), 0 2px 4px rgba(5,7,22,0.04)',
  lg:      '0 12px 32px rgba(5,7,22,0.1), 0 4px 12px rgba(5,7,22,0.06)',
  xl:      '0 24px 64px rgba(5,7,22,0.12), 0 8px 24px rgba(5,7,22,0.08)',
  '2xl':   '0 32px 96px rgba(5,7,22,0.16), 0 12px 32px rgba(5,7,22,0.1)',

  // Colored glows
  brandGlow:  '0 12px 40px -8px rgba(18,183,106,0.5), 0 4px 12px rgba(18,183,106,0.3)',
  auroraGlow: '0 12px 40px -8px rgba(139,92,246,0.5), 0 4px 12px rgba(236,72,153,0.3)',
  goldGlow:   '0 12px 40px -8px rgba(245,158,11,0.5)',
  sunsetGlow: '0 12px 40px -8px rgba(249,115,22,0.5)',

  // Inner
  innerSm:    'inset 0 1px 2px rgba(5,7,22,0.06)',
  innerMd:    'inset 0 2px 4px rgba(5,7,22,0.08)',
} as const;

// ─── MOTION ─────────────────────────────────────────────────────
export const motion = {
  spring: {
    soft:   { type: 'spring', stiffness: 260, damping: 30 },
    snappy: { type: 'spring', stiffness: 400, damping: 28 },
    bouncy: { type: 'spring', stiffness: 500, damping: 20 },
    slow:   { type: 'spring', stiffness: 120, damping: 24 },
  },
  ease: {
    out:    [0.16, 1, 0.3, 1] as const,    // out-expo-ish, our signature
    inOut:  [0.65, 0, 0.35, 1] as const,
    smooth: [0.22, 1, 0.36, 1] as const,
  },
  duration: {
    instant: 0.15,
    fast:    0.3,
    base:    0.5,
    slow:    0.8,
    epic:    1.2,
  },
  stagger: { tight: 0.03, base: 0.05, loose: 0.08 },
} as const;

// ─── Z-INDEX ────────────────────────────────────────────────────
export const zIndex = {
  base:      0,
  raised:    10,
  sticky:    50,
  header:    60,
  overlay:   80,
  modal:     90,
  toast:     100,
  cursor:    9999,
} as const;

// ─── BREAKPOINTS ────────────────────────────────────────────────
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export type BrandColor = keyof typeof colors.brand;
