/*
 * postcss-import runs first so the shared design-system stylesheets
 * (apps/web/src/design-system/styles) are inlined before Tailwind sees their
 * @layer blocks.
 */
module.exports = {
  plugins: {
    'postcss-import': {},
    tailwindcss: {},
    autoprefixer: {},
  },
};
