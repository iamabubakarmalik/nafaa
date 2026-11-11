/**
 * Tailwind configuration for the partner portal.
 *
 * It extends the merchant app's configuration (apps/web/tailwind.config.js),
 * so the portal shares its colors, sizes, dark-mode rules and runtime theme
 * variables. `brand-*` follows the runtime accent (emerald for partners).
 */

import webConfig from '../web/tailwind.config.js';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [webConfig],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../web/src/design-system/**/*.{ts,tsx}',
  ],
};
