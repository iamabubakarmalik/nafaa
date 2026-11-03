#!/usr/bin/env node
/**
 * Fills translations into the mobile catalogs from a work file:
 *   { "<source key>": ["<English>", "<Urdu>"], … }   (an entry may be a plural object)
 * Only keys present (and empty) in a catalog are filled; use --overwrite to
 * replace existing text.
 *
 *   pnpm --filter @nafaa/mobile i18n:import /path/to/work.json
 */

const fs = require('fs');
const path = require('path');
const { CATALOG_DIR, readCatalog, writeSorted, filled } = require('./lib');

const file = process.argv[2];
const overwrite = process.argv.includes('--overwrite');
if (!file) {
  console.error('usage: i18n:import <work.json> [--overwrite]');
  process.exit(1);
}
const work = JSON.parse(fs.readFileSync(file, 'utf8'));
let count = 0;
['en', 'ur'].forEach((locale, idx) => {
  const cat = readCatalog(CATALOG_DIR, locale);
  for (const [area, table] of Object.entries(cat)) {
    let changed = false;
    for (const key of Object.keys(table)) {
      const pair = work[key];
      if (!pair || (!overwrite && filled(table[key]))) continue;
      table[key] = pair[idx];
      changed = true;
      count++;
    }
    if (changed) writeSorted(path.join(CATALOG_DIR, locale, `${area}.json`), table);
  }
});
console.log(`i18n:import — ${count} entries filled`);
