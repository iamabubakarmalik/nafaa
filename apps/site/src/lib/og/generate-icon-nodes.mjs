#!/usr/bin/env node
/**
 * Generates src/lib/og/icon-nodes.ts: the SVG drawing data of every icon in the
 * CMS allow-list (ALLOWED_ICONS in the contract), for the OG card renderer.
 *
 * Why a generated file: OG cards are drawn by Satori, which cannot render
 * lucide-react components (they are forwardRef client components that read a
 * React context). The raw path data renders fine as plain <svg> children.
 *
 * Usage (from apps/site):
 *   node src/lib/og/generate-icon-nodes.mjs          write the file
 *   node src/lib/og/generate-icon-nodes.mjs --check  exit 1 when it is stale
 *
 * Run it after a lucide-react upgrade or a change to ALLOWED_ICONS.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(here, '../../..');
const outFile = path.join(here, 'icon-nodes.ts');
const check = process.argv.includes('--check');

// Node 22.6+ strips TypeScript types on import; the contract uses erasable syntax only.
const contract = await import(pathToFileURL(path.join(siteRoot, 'src/lib/cms/contract/cms-contract.ts')).href);
const names = [...contract.ALLOWED_ICONS];

const require = createRequire(path.join(siteRoot, 'package.json'));
const lucidePkgPath = require.resolve('lucide-react/package.json');
const lucideDir = path.dirname(lucidePkgPath);
const lucideVersion = JSON.parse(await readFile(lucidePkgPath, 'utf8')).version;

/** Attributes Satori understands; lucide's React `key` is dropped. */
const KEEP_ATTRS = new Set(['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'points']);

// Renamed icons keep their old export name as an alias in the barrel file, so
// map every exported PascalCase name to the icon file that defines it.
const barrel = await readFile(path.join(lucideDir, 'dist/esm/lucide-react.mjs'), 'utf8');
const exportToFile = new Map();
for (const match of barrel.matchAll(/export \{([^}]*)\} from '\.\/icons\/([a-z0-9-]+)\.mjs'/g)) {
  for (const alias of match[1].matchAll(/default as (\w+)/g)) exportToFile.set(alias[1], match[2]);
}

const entries = [];
const missing = [];
for (const name of names) {
  const fileName = exportToFile.get(contract.iconExportName(name)) ?? name;
  const file = path.join(lucideDir, 'dist/esm/icons', `${fileName}.mjs`);
  let mod;
  try {
    mod = await import(pathToFileURL(file).href);
  } catch {
    missing.push(name);
    continue;
  }
  const node = mod.__iconData?.node ?? mod.__iconNode;
  if (!Array.isArray(node)) {
    missing.push(name);
    continue;
  }
  const cleaned = node.map(([tag, attrs]) => {
    const kept = {};
    for (const [key, value] of Object.entries(attrs)) {
      if (KEEP_ATTRS.has(key)) kept[key] = String(value);
    }
    return [tag, kept];
  });
  entries.push(`  ${JSON.stringify(name)}: ${JSON.stringify(cleaned)},`);
}

if (missing.length > 0) {
  console.error(`lucide-react ${lucideVersion} has no icon file for: ${missing.join(', ')}`);
  process.exit(1);
}

const output = `// GENERATED FILE. Do not edit.
// Source: ALLOWED_ICONS in the CMS contract + lucide-react ${lucideVersion} icon data (ISC licence).
// Regenerate: node src/lib/og/generate-icon-nodes.mjs
import type { IconName } from '@/lib/cms/contract/cms-contract';

export type IconNode = readonly (readonly [string, Readonly<Record<string, string>>])[];

export const ICON_NODES: Readonly<Record<IconName, IconNode>> = {
${entries.join('\n')}
};
`;

if (check) {
  const current = await readFile(outFile, 'utf8').catch(() => '');
  if (current !== output) {
    console.error('src/lib/og/icon-nodes.ts is out of date. Run: node src/lib/og/generate-icon-nodes.mjs');
    process.exit(1);
  }
  console.log(`icon-nodes.ts is current (${entries.length} icons, lucide-react ${lucideVersion}).`);
} else {
  await writeFile(outFile, output);
  console.log(`Wrote ${path.relative(siteRoot, outFile)} (${entries.length} icons, lucide-react ${lucideVersion}).`);
}
