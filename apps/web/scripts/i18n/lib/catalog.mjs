/** Reads and writes catalog files: catalog/<locale>/<area>.json, keys sorted. */

import fs from 'node:fs';
import path from 'node:path';
import { CATALOG_DIR, LOCALES } from './files.mjs';

export const catalogPath = (locale, area) => path.join(CATALOG_DIR, locale, `${area}.json`);

export function readCatalog(locale, area) {
  const p = catalogPath(locale, area);
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function writeCatalog(locale, area, data) {
  const p = catalogPath(locale, area);
  const keys = Object.keys(data).sort((a, b) => a.localeCompare(b, 'en'));
  if (!keys.length) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return;
  }
  const sorted = Object.fromEntries(keys.map((k) => [k, data[k]]));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(sorted, null, 2) + '\n');
}

/** Every area that has a catalog file in any locale. */
export function catalogAreas() {
  const areas = new Set();
  for (const locale of LOCALES) {
    const dir = path.join(CATALOG_DIR, locale);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')) areas.add(f.slice(0, -5));
  }
  return [...areas].sort();
}

export const isFilled = (value) =>
  typeof value === 'string' ? value.trim() !== '' : !!value && typeof value === 'object' && typeof value.other === 'string' && value.other.trim() !== '';

export const placeholders = (text) => new Set([...String(text).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]));

export function entryTexts(value) {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return [value.one, value.other].filter((v) => typeof v === 'string');
  return [];
}
