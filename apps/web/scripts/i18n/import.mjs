#!/usr/bin/env node
/**
 * i18n:import — merges translations made outside the catalogs (by a
 * translator or a translation agent) into the area catalogs.
 *
 *   node scripts/i18n/import.mjs <file.json...> [--area pos,dashboard] [--overwrite]
 *
 * Input files hold { "<key>": { "en": "...", "ur": "...", "roman": "..." } }.
 * Every area catalog that uses a key gets its text; existing translations are
 * kept unless --overwrite is given. `roman` is written only when present.
 * Run i18n:extract first so the area files list their keys.
 */

import fs from 'node:fs';
import { LOCALES, parseArgs } from './lib/files.mjs';
import { catalogAreas, isFilled, readCatalog, writeCatalog } from './lib/catalog.mjs';
import { scanAll } from './lib/scan.mjs';

const { flags, positional } = parseArgs(process.argv.slice(2), ['overwrite']);
if (!positional.length) {
  console.error('Usage: node scripts/i18n/import.mjs <file.json...> [--area a,b] [--overwrite]');
  process.exit(2);
}
const incoming = {};
for (const file of positional) Object.assign(incoming, JSON.parse(fs.readFileSync(file, 'utf8')));

const only = flags.area ? String(flags.area).split(',') : null;
const { byArea } = scanAll({ areas: only });
const areas = only ?? [...new Set([...byArea.keys(), ...catalogAreas()])];
let written = 0;
for (const area of areas) {
  const used = byArea.get(area);
  if (!used) continue;
  for (const locale of LOCALES) {
    const cat = readCatalog(locale, area);
    let changed = false;
    for (const key of used.keys()) {
      const value = incoming[key]?.[locale];
      if (value === undefined || value === null || value === '') continue;
      if (isFilled(cat[key]) && !flags.overwrite) continue;
      cat[key] = value;
      changed = true;
      written++;
    }
    if (changed) writeCatalog(locale, area, cat);
  }
}
console.log(`Imported ${written} translation(s) into ${areas.length} area(s).`);
