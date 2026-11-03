/** Shared helpers for the mobile i18n scripts. */

const fs = require('fs');
const path = require('path');
const { ROOT, areaOf } = require('./areas');

const LOCALES = ['en', 'ur', 'roman'];
const CATALOG_DIR = path.join(ROOT, 'src/core/i18n/catalog');
const WEB_CATALOG_DIR = path.resolve(ROOT, '../web/src/core/i18n/catalog');
const SCAN_DIRS = ['src', 'app'].map((d) => path.join(ROOT, d));

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || full.startsWith(CATALOG_DIR)) continue;
      walk(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const STRING = String.raw`'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"`;
const CALL = new RegExp(String.raw`\b(?:t|msg)\(\s*(?:${STRING})`, 'g');
const TRANS = new RegExp(String.raw`<Trans\b[^>]*?\btext=(?:\{\s*)?(?:${STRING})`, 'g');
const TEMPLATE = /\b(?:t|msg)\(\s*`/g;

const unescape = (s) => s.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n');

/** Files that import the translation helpers. */
const usesI18n = (src) => /from ['"]@\/core\/i18n['"]/.test(src) || /from ['"]\.\/runtime['"]/.test(src);

/** { area: Set(keys) } plus template-literal warnings. */
function extract() {
  const areas = {};
  const warnings = [];
  for (const file of SCAN_DIRS.flatMap((d) => walk(d))) {
    const raw = fs.readFileSync(file, 'utf8');
    if (!usesI18n(raw)) continue;
    // Usage examples in comments are not real keys.
    const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/\s.*$/gm, '');
    const area = areaOf(file);
    const keys = (areas[area] ??= new Set());
    for (const re of [CALL, TRANS]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(src))) keys.add(unescape(m[1] ?? m[2]));
    }
    TEMPLATE.lastIndex = 0;
    if (TEMPLATE.test(src)) warnings.push(`${path.relative(ROOT, file)}: t()/msg() with a template literal is not extracted; use {{params}}`);
  }
  for (const key of indirectKeys()) (areas.core ??= new Set()).add(key);
  return { areas, warnings };
}

/**
 * Keys that reach t() indirectly: the offline engine's ONLINE_ONLY texts
 * (engine code cannot import the i18n runtime; onlineNeededText() translates
 * them in the core area).
 */
function indirectKeys() {
  const file = path.join(ROOT, 'src/core/offline/engine/rules.ts');
  if (!fs.existsSync(file)) return [];
  const block = /export const ONLINE_ONLY = \{([\s\S]*?)\n\}/.exec(fs.readFileSync(file, 'utf8'));
  if (!block) return [];
  const keys = [];
  const re = new RegExp(String.raw`^\s*\w+:\s*(?:${STRING}),?\s*$`, 'gm');
  let m;
  while ((m = re.exec(block[1]))) keys.push(unescape(m[1] ?? m[2]));
  return keys;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function readCatalog(dir, locale) {
  const out = {};
  const folder = path.join(dir, locale);
  if (!fs.existsSync(folder)) return out;
  for (const f of fs.readdirSync(folder)) if (f.endsWith('.json')) out[f.replace(/\.json$/, '')] = readJson(path.join(folder, f));
  return out;
}

const filled = (v) => (typeof v === 'string' ? v !== '' : !!v && typeof v.other === 'string' && v.other !== '');

/** Most common translation per key across all areas of one locale. */
function globalTable(catalog) {
  const votes = new Map();
  for (const table of Object.values(catalog)) {
    for (const [k, v] of Object.entries(table)) {
      if (!filled(v)) continue;
      const id = JSON.stringify(v);
      const opts = votes.get(k) ?? new Map();
      opts.set(id, (opts.get(id) ?? 0) + 1);
      votes.set(k, opts);
    }
  }
  const out = {};
  for (const [k, opts] of votes) out[k] = JSON.parse([...opts.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  return out;
}

function writeSorted(file, obj) {
  const sorted = Object.fromEntries(Object.keys(obj).sort((a, b) => a.localeCompare(b)).map((k) => [k, obj[k]]));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`);
}

const placeholders = (s) => [...String(typeof s === 'string' ? s : s?.other ?? '').matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort().join(',');

module.exports = { LOCALES, CATALOG_DIR, WEB_CATALOG_DIR, extract, readCatalog, readJson, globalTable, writeSorted, filled, placeholders };
