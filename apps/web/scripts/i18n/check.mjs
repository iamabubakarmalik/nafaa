#!/usr/bin/env node
/**
 * i18n:check — fails when translations are missing or broken. CI-friendly.
 *
 *   node scripts/i18n/check.mjs [--area pos,dashboard] [--locales en,ur] [--leftovers] [--json out.json]
 *
 * Errors (exit code 1):
 *   - a key used in code has no English or Urdu text in its area catalog
 *   - a translation uses different {{placeholders}} than its key
 * Warnings:
 *   - the same key is translated differently in two areas
 *   - with --leftovers, sentence-like strings in the area's files that are
 *     still not wrapped in t() (from the wrap codemod's report)
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { areaOf, listFiles, parseArgs, REQUIRED_LOCALES, rel, WEB_ROOT } from './lib/files.mjs';
import { catalogAreas, entryTexts, isFilled, placeholders, readCatalog } from './lib/catalog.mjs';
import { scanAll } from './lib/scan.mjs';

const { flags } = parseArgs(process.argv.slice(2), ['leftovers']);
const only = flags.area ? String(flags.area).split(',').map((s) => s.trim()).filter(Boolean) : null;
const locales = flags.locales ? String(flags.locales).split(',') : REQUIRED_LOCALES;

const { byArea } = scanAll({ areas: only });
const errors = [];
const warnings = [];

for (const [area, used] of [...byArea.entries()].sort()) {
  for (const locale of locales) {
    const cat = readCatalog(locale, area);
    for (const [key, where] of used) {
      if (!isFilled(cat[key])) errors.push({ area, locale, key, where: where[0], problem: key in cat ? 'empty' : 'not extracted' });
    }
  }
  for (const locale of [...locales, 'roman']) {
    const cat = readCatalog(locale, area);
    for (const [key, value] of Object.entries(cat)) {
      const want = placeholders(key);
      for (const text of entryTexts(value)) {
        if (!text) continue;
        const got = placeholders(text);
        // The singular form may spell the count out ("1 item") but must not invent placeholders.
        const isOne = typeof value === 'object' && text === value.one && text !== value.other;
        const ok = isOne
          ? [...got].every((p) => want.has(p)) && [...want].every((p) => got.has(p) || p === 'count')
          : want.size === got.size && [...want].every((p) => got.has(p));
        if (!ok) errors.push({ area, locale, key, problem: `placeholders differ: "${text}"` });
      }
    }
  }
}

// Conflicting translations of the same key in different areas.
for (const locale of locales) {
  const seen = new Map();
  for (const area of catalogAreas()) {
    for (const [key, value] of Object.entries(readCatalog(locale, area))) {
      if (!isFilled(value)) continue;
      const v = JSON.stringify(value);
      const prev = seen.get(key);
      if (prev && prev.v !== v && (!only || only.includes(area) || only.includes(prev.area))) {
        warnings.push({ locale, key, problem: `${prev.area}: ${prev.v}  vs  ${area}: ${v}` });
      } else if (!prev) seen.set(key, { area, v });
    }
  }
}

let leftovers = [];
if (flags.leftovers) {
  const files = listFiles(['src']).filter((f) => !only || only.includes(areaOf(f)));
  const out = path.join(os.tmpdir(), `i18n-left-${process.pid}.json`);
  execFileSync(process.execPath, [path.join(WEB_ROOT, 'scripts/i18n/wrap.mjs'), ...files.map(rel), '--quiet', '--json', out], { cwd: WEB_ROOT, stdio: 'ignore', maxBuffer: 64 << 20 });
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  fs.unlinkSync(out);
  for (const f of report.files) {
    for (const w of f.wrapped) leftovers.push({ where: `${f.file}:${w.line}`, text: w.key, why: 'not wrapped yet' });
    for (const l of f.left) leftovers.push({ where: `${f.file}:${l.line}`, text: l.text, why: l.why });
  }
}

const byKind = (list, fmt) => list.slice(0, 200).forEach((x) => console.log(fmt(x)));
if (errors.length) {
  console.log(`Missing or broken translations: ${errors.length}`);
  byKind(errors, (e) => `  [${e.area}/${e.locale}] ${e.problem}: ${e.key}${e.where ? `   (${e.where})` : ''}`);
}
if (warnings.length) {
  console.log(`\nWarnings: ${warnings.length}`);
  byKind(warnings, (w) => `  [${w.locale}] "${w.key}" translated differently — ${w.problem}`);
}
if (flags.leftovers) {
  console.log(`\nText not wrapped in t(): ${leftovers.length}`);
  byKind(leftovers, (l) => `  ${l.where}  ${l.text}   [${l.why}]`);
}
if (flags.json) fs.writeFileSync(flags.json, JSON.stringify({ errors, warnings, leftovers }, null, 2));

const areasChecked = only ? only.join(', ') : 'all areas';
console.log(`\n${errors.length ? 'FAILED' : 'OK'} — ${areasChecked}; locales ${locales.join(', ')}; ${errors.length} error(s), ${warnings.length} warning(s)${flags.leftovers ? `, ${leftovers.length} unwrapped` : ''}.`);
process.exit(errors.length ? 1 : 0);
