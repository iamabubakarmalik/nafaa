/**
 * File discovery and catalog areas for the i18n scripts.
 *
 * An area is the unit a catalog file covers: one JSON file per area and
 * locale under src/core/i18n/catalog/<locale>/<area>.json. Areas follow the
 * folder structure, so agents converting different modules never write to the
 * same catalog file.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const SRC = path.join(WEB_ROOT, 'src');
export const CATALOG_DIR = path.join(SRC, 'core/i18n/catalog');
export const API_SRC = path.resolve(WEB_ROOT, '../api/src');
export const LOCALES = ['en', 'ur', 'roman'];
/** Locales that must translate every key. Roman Urdu is the source language. */
export const REQUIRED_LOCALES = ['en', 'ur'];

/** Folders the scripts never touch. */
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'catalog', '__tests__', '__mocks__']);
const IGNORED_PATHS = [path.join(SRC, 'marketplace')];

/**
 * Areas that differ from the folder rule below. Keep this list short; most
 * areas come from the path.
 */
const AREA_OVERRIDES = [
  ['src/app', 'shell'],
  ['src/bootstrap.tsx', 'shell'],
  ['src/main.tsx', 'shell'],
  ['src/design-system', 'core'],
  ['src/core', 'core'],
];

/**
 * Server folders whose messages the web app translates (catalog area "api").
 * Add a folder here when converting a server module's messages.
 */
export const API_DIRS = [
  'common/filters',
  'modules/auth',
  'modules/pos',
  'modules/sales',
];

export function areaOf(file) {
  const rel = path.relative(WEB_ROOT, file).split(path.sep).join('/');
  for (const [prefix, area] of AREA_OVERRIDES) {
    if (rel === prefix || rel.startsWith(prefix + '/')) return area;
  }
  const parts = rel.split('/');
  if (parts[1] === 'modules' && parts[2]) return parts[2];
  if (parts[1] === 'industries' && parts[2]) return parts[2] === '_shared' ? 'industries-shared' : `industry-${parts[2]}`;
  if (parts[1] === 'integrations' && parts[2]) return `integrations-${parts[2]}`;
  return 'misc';
}

export function isSourceFile(file) {
  return /\.(tsx?|mts)$/.test(file) && !/\.d\.ts$/.test(file) && !/\.(test|spec|stories)\.tsx?$/.test(file);
}

/** Lists source files under the given paths (files or folders). */
export function listFiles(inputs, { root = WEB_ROOT } = {}) {
  const out = new Set();
  const walk = (p) => {
    if (IGNORED_PATHS.some((ig) => p === ig || p.startsWith(ig + path.sep))) return;
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (IGNORED_DIRS.has(path.basename(p))) return;
      for (const f of fs.readdirSync(p)) walk(path.join(p, f));
    } else if (isSourceFile(p)) out.add(p);
  };
  for (const input of inputs) {
    const abs = path.resolve(root, input);
    if (!fs.existsSync(abs)) throw new Error(`Not found: ${input}`);
    walk(abs);
  }
  return [...out].sort();
}

export const rel = (file) => path.relative(WEB_ROOT, file).split(path.sep).join('/');

/** Minimal flag parser: --name value, --flag, and positional arguments. */
export function parseArgs(argv, booleans = []) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [name, inline] = a.slice(2).split('=');
      if (inline !== undefined) flags[name] = inline;
      else if (booleans.includes(name)) flags[name] = true;
      else flags[name] = argv[++i];
    } else positional.push(a);
  }
  return { flags, positional };
}
