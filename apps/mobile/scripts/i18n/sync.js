#!/usr/bin/env node
/**
 * Fills the mobile catalogs (src/core/i18n/catalog/<locale>/<area>.json).
 *
 * 1. Extracts every key used in src/ and app/ (t(), msg(), <Trans text>),
 *    grouped by area (scripts/i18n/areas.js).
 * 2. For each key keeps the mobile translation if there is one, else copies
 *    the web translation of the identical key (mapped web areas first, then
 *    the majority across all web areas). Roman Urdu stores rewordings only.
 * 3. Keys nobody translated yet are written as "" and listed by i18n:check.
 *
 *   pnpm --filter @nafaa/mobile i18n:sync            add keys, prefill from web
 *   pnpm --filter @nafaa/mobile i18n:sync --prune    also drop keys no longer used
 */

const path = require('path');
const { LOCALES, CATALOG_DIR, WEB_CATALOG_DIR, extract, readCatalog, globalTable, writeSorted, filled } = require('./lib');
const { WEB_AREAS } = require('./areas');

const prune = process.argv.includes('--prune');
const { areas, warnings } = extract();

const report = [];
for (const locale of LOCALES) {
  const mobile = readCatalog(CATALOG_DIR, locale);
  const web = readCatalog(WEB_CATALOG_DIR, locale);
  const webGlobal = globalTable(web);
  let fromWeb = 0;
  let missing = 0;
  const allAreas = new Set([...Object.keys(areas), ...(prune ? [] : Object.keys(mobile))]);
  for (const area of allAreas) {
    const keys = areas[area] ?? new Set();
    const current = mobile[area] ?? {};
    const next = prune ? {} : { ...current };
    for (const key of keys) {
      if (filled(current[key])) {
        next[key] = current[key];
        continue;
      }
      const sources = [...(WEB_AREAS[area] ?? []), area];
      let value;
      for (const a of sources) if (web[a] && filled(web[a][key])) { value = web[a][key]; break; }
      if (value === undefined && filled(webGlobal[key])) value = webGlobal[key];
      if (value !== undefined) {
        next[key] = value;
        fromWeb++;
      } else if (locale === 'roman') {
        delete next[key];
      } else {
        next[key] = '';
        missing++;
      }
    }
    if (Object.keys(next).length || keys.size) writeSorted(path.join(CATALOG_DIR, locale, `${area}.json`), next);
  }
  report.push(`${locale}: ${fromWeb} copied from web${locale === 'roman' ? '' : `, ${missing} still to translate`}`);
}

const total = Object.values(areas).reduce((n, s) => n + s.size, 0);
console.log(`i18n:sync — ${total} keys in ${Object.keys(areas).length} areas`);
for (const line of report) console.log(`  ${line}`);
for (const w of warnings) console.warn(`  ! ${w}`);
