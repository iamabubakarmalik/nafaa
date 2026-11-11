/**
 * Regenerates src/design/ds-en.json: the English text for every t('…') key
 * used by the shared web files the admin panel imports (design system,
 * date ranges, page guide, shell popovers), taken from the web English catalog.
 *
 *   node scripts/sync-ds-text.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(here, '../../web/src');
const out = path.resolve(here, '../src/design/ds-en.json');

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const sources = [
  ...walk(path.join(web, 'design-system')),
  ...walk(path.join(web, 'app/shell/ui')),
  path.join(web, 'app/shell/useSidebarState.ts'),
  path.join(web, 'core/lib/dateRange.ts'),
  path.join(web, 'core/components/PageGuide.tsx'),
].filter((f) => /\.(ts|tsx)$/.test(f));

const keys = new Set();
for (const f of sources) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\b(?:t|tr)\(\s*'((?:[^'\\]|\\.)*)'/g)) keys.add(m[1].replace(/\\'/g, "'"));
}

const catDir = path.join(web, 'core/i18n/catalog/en');
const first = ['core.json', 'appearance.json', 'shell.json'];
const files = [...first, ...fs.readdirSync(catDir).filter((f) => f.endsWith('.json') && !first.includes(f))];
const catalogs = files.map((f) => JSON.parse(fs.readFileSync(path.join(catDir, f), 'utf8')));

const map = {};
for (const key of [...keys].sort()) {
  for (const c of catalogs) {
    const v = c[key];
    if (v === undefined) continue;
    if ((typeof v === 'string' ? v : v.other) !== key) map[key] = v;
    break;
  }
}
fs.writeFileSync(out, `${JSON.stringify(map, null, 2)}\n`);
console.log(`${keys.size} keys, ${Object.keys(map).length} with English text → ${path.relative(process.cwd(), out)}`);
