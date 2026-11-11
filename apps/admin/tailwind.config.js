/**
 * Tailwind configuration for the admin panel.
 *
 * It extends the merchant app's configuration (apps/web/tailwind.config.js),
 * so both apps share one set of colors, sizes, dark-mode rules and runtime
 * theme variables. Only admin-specific aliases are added here.
 */

import webConfig from '../web/tailwind.config.js';
import tw from 'tailwindcss/colors';
import palette from '../web/src/design-system/tailwind/palette.cjs';

const { buildPalettes, brandPalettes } = palette;
const { palettes } = buildPalettes({});
const brand = brandPalettes();

/*
 * `admin-*` (older admin screens) follows the runtime accent, like `brand-*`.
 * The web app maps `emerald` to the accent too; in admin it stays a real green,
 * because admin screens use it for "healthy / paid / active".
 */
const usage = (kind) => ({ admin: brand[kind], emerald: palettes[kind].green });

/** @type {import('tailwindcss').Config} */
export default {
  presets: [webConfig],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../web/src/design-system/**/*.{ts,tsx}',
    '../web/src/app/shell/ui/**/*.{ts,tsx}',
    '../web/src/app/shell/useSidebarState.ts',
    '../web/src/core/components/PageGuide.tsx',
  ],
  theme: {
    extend: {
      colors: { admin: brand.bg, emerald: tw.emerald },
      backgroundColor: usage('bg'),
      gradientColorStops: usage('bg'),
      textColor: usage('text'),
      borderColor: usage('border'),
      divideColor: usage('border'),
      ringColor: usage('border'),
      fill: usage('text'),
      stroke: usage('text'),
    },
  },
};
