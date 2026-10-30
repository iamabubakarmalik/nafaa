#!/usr/bin/env node
/**
 * i18n:validate — checks a translator's work file against its todo file
 * before import: every key present, en and ur filled, same {{placeholders}},
 * same edge spaces, Latin digits in Urdu.
 *
 *   node scripts/i18n/validate.mjs todo-1.json out-1.json
 */
import fs from 'fs';
const [chunkPath, outPath] = process.argv.slice(2);
const chunk = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
let out;
try { out = JSON.parse(fs.readFileSync(outPath, 'utf8')); } catch (e) { console.log('Invalid JSON:', e.message); process.exit(1); }
const ph = (s) => [...String(s).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort().join(',');
const texts = (v) => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? [v.one, v.other].filter(Boolean) : []);
const problems = [];
for (const { key } of chunk) {
  const e = out[key];
  if (!e) { problems.push(`missing: ${key}`); continue; }
  for (const loc of ['en', 'ur', 'roman']) {
    if (loc !== 'roman' && !texts(e[loc]).length) problems.push(`${loc} empty: ${key}`);
    for (const t of texts(e[loc])) {
      if (ph(t) !== ph(key)) problems.push(`${loc} placeholders differ: ${key}  =>  ${t}`);
      if (/^\s/.test(key) !== /^\s/.test(t) || /\s$/.test(key) !== /\s$/.test(t)) problems.push(`${loc} edge spaces differ: "${key}" => "${t}"`);
      if (loc === 'ur' && /[٠-٩۰-۹]/.test(t)) problems.push(`ur uses Arabic digits: ${key}`);
    }
  }
}
const extra = Object.keys(out).filter((k) => !chunk.some((c) => c.key === k));
for (const k of extra) problems.push(`extra key (not in chunk, check exact spelling): ${k}`);
console.log(problems.length ? problems.join('\n') : `OK ${chunk.length} keys`);
process.exit(problems.length ? 1 : 0);
