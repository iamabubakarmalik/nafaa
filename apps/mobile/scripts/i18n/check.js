#!/usr/bin/env node
/**
 * Checks the mobile catalogs, like the web `i18n:check`:
 *  - every key used in code exists with an English and an Urdu translation
 *  - placeholders ({{name}}) match between key and translation
 *  - no catalog file lists a key twice
 *  - keys no longer used (info; remove with i18n:sync --prune)
 *
 *   pnpm --filter @nafaa/mobile i18n:check            report
 *   pnpm --filter @nafaa/mobile i18n:check --strict   exit 1 on problems (CI)
 *   pnpm --filter @nafaa/mobile i18n:check --area auth
 */

const fs = require('fs');
const path = require('path');
const { CATALOG_DIR, extract, readCatalog, filled, placeholders } = require('./lib');

const strict = process.argv.includes('--strict');
const areaArg = process.argv.includes('--area') ? process.argv[process.argv.indexOf('--area') + 1] : null;
const { areas, warnings } = extract();
const problems = [];
const info = [];

for (const locale of ['en', 'ur']) {
  const cat = readCatalog(CATALOG_DIR, locale);
  for (const [area, keys] of Object.entries(areas)) {
    if (areaArg && area !== areaArg) continue;
    const table = cat[area] ?? {};
    const missing = [...keys].filter((k) => !filled(table[k]));
    if (missing.length) problems.push(`${locale}/${area}.json: ${missing.length} missing\n${missing.slice(0, 40).map((k) => `      - ${k}`).join('\n')}${missing.length > 40 ? '\n      …' : ''}`);
    for (const k of keys) {
      if (filled(table[k]) && placeholders(k) !== placeholders(table[k])) problems.push(`${locale}/${area}.json: placeholders differ for "${k}"`);
    }
    const unused = Object.keys(table).filter((k) => !keys.has(k));
    if (unused.length) info.push(`${locale}/${area}.json: ${unused.length} unused key(s)`);
  }
}

for (const locale of ['en', 'ur', 'roman']) {
  const dir = path.join(CATALOG_DIR, locale);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    const seen = new Set();
    for (const m of raw.matchAll(/^\s{2}"((?:\\.|[^"\\])*)":/gm)) {
      if (seen.has(m[1])) problems.push(`${locale}/${f}: key listed twice: "${m[1]}"`);
      seen.add(m[1]);
    }
  }
}

const total = Object.values(areas).reduce((n, s) => n + s.size, 0);
console.log(`i18n:check — ${total} keys in ${Object.keys(areas).length} areas`);
for (const w of warnings) console.warn(`  ! ${w}`);
for (const i of info) console.log(`  · ${i}`);
if (problems.length) {
  for (const p of problems) console.log(`  ✗ ${p}`);
  if (strict) process.exit(1);
} else {
  console.log('  OK');
}
