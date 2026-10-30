#!/usr/bin/env node
/**
 * i18n:extract — builds and updates the catalogs from t() usage.
 *
 *   node scripts/i18n/extract.mjs [--area pos,dashboard] [--prune] [--quiet]
 *
 * For every area it writes catalog/en/<area>.json and catalog/ur/<area>.json
 * with all keys the area uses. Existing translations are kept. A new key that
 * another area already translated is pre-filled with that translation (check
 * it); otherwise it is added empty for a translator to fill. Roman Urdu files
 * only hold rewordings of the source text, so keys are never added to them,
 * but rewordings of keys no longer used are dropped with --prune.
 *
 * Keys that are in a catalog but no longer used are listed; --prune deletes
 * them. Always pass --area when other people are converting other modules at
 * the same time, so you only write your own catalog files.
 */

import { parseArgs, REQUIRED_LOCALES } from './lib/files.mjs';
import { catalogAreas, isFilled, readCatalog, writeCatalog } from './lib/catalog.mjs';
import { scanAll } from './lib/scan.mjs';

const { flags } = parseArgs(process.argv.slice(2), ['prune', 'quiet']);
const only = flags.area ? String(flags.area).split(',').map((s) => s.trim()).filter(Boolean) : null;

const { byArea, dynamic, unconverted } = scanAll({ areas: only });
const areas = only ?? [...new Set([...byArea.keys(), ...catalogAreas()])].sort();

// Translations already made anywhere, for pre-filling new keys.
const known = Object.fromEntries(REQUIRED_LOCALES.map((l) => [l, new Map()]));
for (const area of catalogAreas()) {
  for (const locale of REQUIRED_LOCALES) {
    for (const [k, v] of Object.entries(readCatalog(locale, area))) if (isFilled(v) && !known[locale].has(k)) known[locale].set(k, v);
  }
}

let added = 0;
let prefilled = 0;
let unusedTotal = 0;
for (const area of areas) {
  const used = byArea.get(area) ?? new Map();
  const unused = new Set();
  for (const locale of REQUIRED_LOCALES) {
    const cat = readCatalog(locale, area);
    for (const key of used.keys()) {
      if (key in cat) continue;
      const guess = known[locale].get(key);
      cat[key] = guess ?? '';
      if (guess) prefilled++;
      if (locale === 'en') added++;
    }
    for (const key of Object.keys(cat)) {
      if (used.has(key)) continue;
      unused.add(key);
      if (flags.prune) delete cat[key];
    }
    writeCatalog(locale, area, cat);
  }
  const roman = readCatalog('roman', area);
  for (const key of Object.keys(roman)) {
    if (used.has(key)) continue;
    unused.add(key);
    if (flags.prune) delete roman[key];
  }
  writeCatalog('roman', area, roman);
  unusedTotal += unused.size;
  if (!flags.quiet && unused.size) {
    console.log(`${area}: ${unused.size} unused key(s)${flags.prune ? ' removed' : ' (run with --prune to remove)'}`);
    for (const k of [...unused].slice(0, 15)) console.log(`   - ${k}`);
    if (unused.size > 15) console.log(`   … ${unused.size - 15} more`);
  }
}

if (!flags.quiet && dynamic.length) {
  console.log(`\nt() called with a non-literal in ${dynamic.length} place(s); those texts cannot be extracted:`);
  for (const d of dynamic.slice(0, 30)) console.log(`   ${d.where}  ${d.code}`);
}
if (!flags.quiet && unconverted.length && (!only || only.includes('api'))) {
  console.log(`\nAPI messages built with template literals (${unconverted.length}); convert them to apiMessage() to translate:`);
  for (const u of unconverted.slice(0, 30)) console.log(`   ${u.where}  ${u.code}`);
}
console.log(`\nAreas: ${areas.length}. New keys: ${added} (${prefilled} pre-filled from other areas). Unused: ${unusedTotal}.`);
