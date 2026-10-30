#!/usr/bin/env node
/**
 * i18n:todo — lists the keys an area still needs translated, as work files.
 *
 *   node scripts/i18n/todo.mjs --area pos[,dashboard] --out <dir> [--size 400]
 *
 * Writes <dir>/todo-1.json, todo-2.json, ... each an array of
 * { key, area, where } (where = file:line of the first uses). A translator
 * fills { "<key>": { en, ur, roman? } } per TRANSLATION_GUIDE.md and the
 * result goes back in with i18n:import.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, REQUIRED_LOCALES } from './lib/files.mjs';
import { isFilled, readCatalog } from './lib/catalog.mjs';
import { scanAll } from './lib/scan.mjs';

const { flags } = parseArgs(process.argv.slice(2));
if (!flags.out) {
  console.error('Usage: node scripts/i18n/todo.mjs --area a,b --out <dir> [--size 400]');
  process.exit(2);
}
const only = flags.area ? String(flags.area).split(',') : null;
const size = Number(flags.size || 400);
const { byArea } = scanAll({ areas: only });
const todo = new Map();
for (const [area, used] of byArea) {
  const cats = REQUIRED_LOCALES.map((l) => readCatalog(l, area));
  for (const [key, where] of used) {
    if (cats.every((c) => isFilled(c[key])) || todo.has(key)) continue;
    todo.set(key, { key, area, where: where.slice(0, 2) });
  }
}
fs.mkdirSync(flags.out, { recursive: true });
const all = [...todo.values()];
for (let i = 0; i * size < all.length; i++) {
  fs.writeFileSync(path.join(flags.out, `todo-${i + 1}.json`), JSON.stringify(all.slice(i * size, (i + 1) * size), null, 1));
}
console.log(`${all.length} key(s) to translate in ${Math.ceil(all.length / size)} file(s) under ${flags.out}`);
