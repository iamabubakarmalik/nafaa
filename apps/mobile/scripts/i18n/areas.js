/**
 * Which catalog area a source file belongs to. Shared by the Babel plugin
 * (runtime lookups) and the extract/check scripts, so a key is always looked
 * up in the file it was extracted to.
 *
 *   src/modules/<m>/…      -> <m>
 *   src/industries/<id>/…  -> industry-<id>
 *   src/core, src/design   -> core
 *   app/…, anything else   -> shell
 */

const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

function areaOf(file) {
  const rel = path.relative(ROOT, path.resolve(file)).split(path.sep).join('/');
  let m = /^src\/modules\/([^/]+)\//.exec(rel);
  if (m) return m[1];
  m = /^src\/industries\/([^/]+)\//.exec(rel);
  if (m) return `industry-${m[1]}`;
  if (/^src\/(core|design)\//.test(rel)) return 'core';
  return 'shell';
}

/**
 * Web catalog areas to borrow translations from, per mobile area, in order.
 * Areas not listed borrow from the web area with the same name.
 */
const WEB_AREAS = {
  'online-store': ['integrations-online-orders', 'growth', 'shell', 'core', 'dashboard', 'customers'],
  home: ['dashboard', 'shell'],
  settings: ['appearance', 'organization', 'profile', 'shell'],
  shell: ['shell', 'core'],
  core: ['core', 'shell', 'appearance'],
  auth: ['auth', 'onboarding'],
  onboarding: ['onboarding', 'auth'],
  pos: ['pos', 'sales', 'customers', 'core', 'shell'],
  register: ['finance', 'dashboard', 'core', 'shell'],
  loyalty: ['customers', 'sales', 'core', 'shell'],
  'industry-restaurant': ['industry-restaurant', 'pos', 'sales', 'customers', 'core', 'shell'],
  'industry-bakery': ['industry-bakery', 'manufacturing', 'inventory', 'pos', 'sales', 'core', 'shell'],
  'industry-retail': ['industry-retail', 'inventory', 'pos', 'sales', 'customers', 'core', 'shell'],
  'industry-pharmacy': ['industry-pharmacy', 'inventory', 'pos', 'sales', 'customers', 'core', 'shell'],
  'industry-cosmetics': ['industry-cosmetics', 'inventory', 'pos', 'sales', 'customers', 'core', 'shell'],
  'industry-garments': ['industry-garments', 'inventory', 'pos', 'sales', 'customers', 'core', 'shell'],
  'industry-shoe': ['industry-shoe', 'inventory', 'pos', 'sales', 'customers', 'core', 'shell'],
  'industry-sports': ['industry-sports', 'inventory', 'pos', 'sales', 'customers', 'core', 'shell'],
  'industry-toystore': ['industry-toystore', 'inventory', 'pos', 'sales', 'customers', 'core', 'shell'],
  'industry-bookstore': ['industry-bookstore', 'inventory', 'pos', 'sales', 'customers', 'core', 'shell'],
  'industry-florist': ['industry-florist', 'inventory', 'pos', 'sales', 'customers', 'core', 'shell'],
  'industry-petshop': ['industry-petshop', 'inventory', 'pos', 'sales', 'customers', 'core', 'shell'],
  'industry-jewelry': ['industry-jewelry', 'inventory', 'pos', 'sales', 'customers', 'core', 'shell'],
  'industry-optical': ['industry-optical', 'inventory', 'pos', 'sales', 'customers', 'core', 'shell'],
};

module.exports = { ROOT, areaOf, WEB_AREAS };
