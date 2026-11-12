/**
 * Tailwind config for the storefront.
 *
 * Every colour, font and radius reads a CSS variable set by the shop's theme
 * (src/lib/theme/tokens.ts writes them on the shell). Section components use
 * only these names, so one component looks right in all four themes and
 * follows the merchant's own colours.
 */
import type { Config } from 'tailwindcss';

const c = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
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
        bg: c('bg'),
        surface: c('surface'),
        fg: c('fg'),
        muted: c('muted'),
        line: c('line'),
        primary: { DEFAULT: c('primary'), fg: c('primary-fg') },
        accent: { DEFAULT: c('accent'), fg: c('accent-fg') },
        secondary: { DEFAULT: c('secondary'), fg: c('secondary-fg') },
        sale: c('sale'),
        ok: c('ok'),
        warn: c('warn'),
        wa: '#25D366',
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        urdu: ['var(--font-urdu)', 'serif'],
      },
      borderRadius: {
        card: 'var(--r-card)',
        btn: 'var(--r-btn)',
        input: 'var(--r-input)',
        badge: 'var(--r-badge)',
      },
      maxWidth: {
        page: 'var(--page-width)',
      },
      spacing: {
        section: 'var(--section-y)',
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 4px 16px -4px rgb(0 0 0 / 0.08)',
        pop: '0 12px 40px -8px rgb(0 0 0 / 0.25)',
      },
      keyframes: {
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'slide-in-left': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'rise': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        'slide-in': 'slide-in 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-in-left': 'slide-in-left 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in': 'fade-in 200ms ease-out',
        rise: 'rise 320ms cubic-bezier(0.22, 1, 0.36, 1)',
        marquee: 'marquee 30s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
