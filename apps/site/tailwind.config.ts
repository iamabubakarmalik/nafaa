/**
 * Tailwind config for apps/site (ARCH section 4).
 *
 * Colours map to CSS variables from src/styles/tokens.css (synced from the web
 * app), so `brand-*` stays identical to the product. Neutrals are Tailwind's
 * slate; `ink` is slate-950 for dark bands. The type, radius, shadow and motion
 * scales below are the only ones components should use.
 */
import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';
import colors from 'tailwindcss/colors';
import plugin from 'tailwindcss/plugin';
import { motion, radii, shadows, typeScale, widths } from './src/styles/scale';

const brand = (step: number) => `rgb(var(--brand-${step}) / <alpha-value>)`;
/** Semantic colour that follows the section theme (see globals.css). */
const semantic = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  future: { hoverOnlyWhenSupported: true },
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      colors: {
        canvas: semantic('canvas'),
        surface: {
          DEFAULT: semantic('surface'),
          2: semantic('surface-2'),
          3: semantic('surface-3'),
        },
        fg: {
          DEFAULT: semantic('fg'),
          strong: semantic('fg-strong'),
          muted: semantic('fg-muted'),
          subtle: semantic('fg-subtle'),
        },
        line: {
          DEFAULT: semantic('line'),
          strong: semantic('line-strong'),
        },
        link: semantic('link'),
        brand: {
          50: brand(50),
          100: brand(100),
          200: brand(200),
          300: brand(300),
          400: brand(400),
          500: brand(500),
          600: brand(600),
          700: brand(700),
          800: brand(800),
          900: brand(900),
          950: brand(950),
          DEFAULT: brand(700),
        },
        ink: {
          DEFAULT: colors.slate[950],
          raised: colors.slate[900],
          line: colors.slate[800],
        },
        // Per-block accent (for example an industry colour) set as RGB channels
        // in --accent by the block. Falls back to the brand.
        accent: 'rgb(var(--accent, var(--brand-700)) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', ...defaultTheme.fontFamily.sans],
        mono: ['var(--font-code)'],
        urdu: ['var(--font-urdu)'],
      },
      fontSize: Object.fromEntries(
        Object.entries(typeScale).map(([name, t]) => [
          name,
          [t.size, { lineHeight: t.lineHeight, letterSpacing: t.tracking, fontWeight: t.weight }],
        ]),
      ) as Record<string, [string, { lineHeight: string; letterSpacing: string; fontWeight: string }]>,
      fontWeight: {
        650: '650',
      },
      spacing: {
        section: 'var(--section-y)',
        gutter: 'var(--gutter)',
      },
      maxWidth: widths,
      borderRadius: radii,
      boxShadow: {
        ...shadows,
        'inset-line': 'inset 0 0 0 1px rgb(15 23 42 / 0.06)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
      },
      transitionDuration: {
        fast: motion.duration.fast,
        base: motion.duration.base,
        slow: motion.duration.slow,
      },
    },
  },
  plugins: [
    // `ink:` applies a utility only inside a dark band (Section theme="ink").
    plugin(({ addVariant }) => {
      addVariant('ink', '.theme-ink &');
    }),
  ],
};

export default config;
