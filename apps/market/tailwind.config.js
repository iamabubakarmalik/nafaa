/**
 * Tailwind configuration for Nafaa Market.
 *
 * It uses the merchant app's configuration (apps/web/tailwind.config.js) as a
 * preset, so colours, sizes, dark-mode rules and runtime theme variables are
 * the same as in the POS. Nothing is copied: the shared files are loaded from
 * apps/web at build time.
 *
 * apps/market is its own pnpm project, so on Vercel apps/web has no
 * node_modules. loadShared() evaluates a shared CommonJS file with a require
 * that resolves packages (tailwindcss, tailwindcss-animate) from this app and
 * relative paths from the shared file's own folder.
 */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const WEB = path.resolve(__dirname, '../web');

function loadShared(file) {
  const dir = path.dirname(file);
  const localRequire = Module.createRequire(path.join(__dirname, 'package.json'));
  const sharedRequire = (id) => {
    if (id.startsWith('.')) {
      const target = path.resolve(dir, id);
      if (target.endsWith('.json')) return JSON.parse(fs.readFileSync(target, 'utf8'));
      return loadShared(require.resolve(target));
    }
    return localRequire(id);
  };
  const mod = { exports: {} };
  const source = fs.readFileSync(file, 'utf8');
  new Function('require', 'module', 'exports', '__dirname', '__filename', source)(sharedRequire, mod, mod.exports, dir, file);
  return mod.exports;
}

const webConfig = loadShared(path.join(WEB, 'tailwind.config.js'));

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [webConfig],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        nastaliq: ['var(--font-nastaliq)', 'var(--font-urdu)'],
      },
    },
  },
};
