#!/usr/bin/env node
/**
 * City page uniqueness backstop (ARCH 5.5, 14). The API blocks publishing a
 * CITY or CITY_INDUSTRY page that is too close to another; this re-checks the
 * rendered pages, so template text added on the site is counted as well.
 *
 *   node scripts/uniqueness.mjs --base=http://127.0.0.1:3310 [--site-url=…] [--max=0.5] [--json=out.json]
 *
 * Reads /sitemaps/locations.xml (and /sitemaps/<locale>-locations.xml when
 * present), takes the text inside <main> of each page, and compares every pair
 * with the API's measure: Jaccard similarity of word 5-gram shingles
 * (apps/api/src/admin-marketing/cms/seo/seo-rules.ts). Any pair at or above
 * --max (default 0.50) fails.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ciHeaders, locs, mainHtml, pool, text } from './ci/html.mjs';

function arg(name, fallback) {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : true;
}

const BASE = String(arg('base', process.env.SITE_CI_BASE || '')).replace(/\/+$/, '');
if (!BASE) {
  console.error('uniqueness: --base=<url> is required');
  process.exit(2);
}
const SITE_URL = String(arg('site-url', BASE)).replace(/\/+$/, '');
const MAX = Number(arg('max', 0.5));
const JSON_OUT = arg('json', null);

export function shingles(input, n = 5) {
  const words = input.toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, ' ').split(/\s+/).filter(Boolean);
  const out = new Set();
  for (let i = 0; i + n <= words.length; i += 1) out.add(words.slice(i, i + n).join(' '));
  return out;
}

export function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  for (const s of small) if (big.has(s)) inter += 1;
  return inter / (a.size + b.size - inter);
}

async function get(path) {
  try {
    const res = await fetch(BASE + path, { headers: ciHeaders(), signal: AbortSignal.timeout(30_000) });
    return { status: res.status, body: await res.text() };
  } catch {
    return { status: 0, body: '' };
  }
}

const toPath = (url) => (url.startsWith(SITE_URL) ? url.slice(SITE_URL.length) || '/' : new URL(url).pathname);

const index = await get('/sitemap.xml');
const sectionFiles = locs(index.body).map(toPath).filter((p) => /^\/sitemaps\/(?:[a-z]{2}-)?locations\.xml$/.test(p));
const pagePaths = [];
for (const file of sectionFiles) {
  const res = await get(file);
  if (res.status === 200) pagePaths.push(...locs(res.body).map(toPath));
}

const pages = (
  await pool([...new Set(pagePaths)], 6, async (path) => {
    const res = await get(path);
    return res.status === 200 ? { path, set: shingles(text(mainHtml(res.body))) } : null;
  })
).filter(Boolean);

const pairs = [];
for (let i = 0; i < pages.length; i += 1) {
  for (let j = i + 1; j < pages.length; j += 1) {
    pairs.push({ a: pages[i].path, b: pages[j].path, value: jaccard(pages[i].set, pages[j].set) });
  }
}
pairs.sort((x, y) => y.value - x.value);
const failures = pairs.filter((p) => p.value >= MAX);

if (JSON_OUT) writeFileSync(resolve(String(JSON_OUT)), JSON.stringify({ max: MAX, pages: pages.map((p) => p.path), pairs, failures }, null, 2));
for (const p of pairs.slice(0, 5)) console.log(`  ${p.value.toFixed(3)}  ${p.a}  ~  ${p.b}`);
for (const f of failures) console.log(`  ERROR ${f.a} and ${f.b} are ${(f.value * 100).toFixed(0)}% similar (max ${(MAX * 100).toFixed(0)}%)`);
console.log(
  pages.length < 2
    ? `uniqueness: ${pages.length} city page(s) in the sitemap; nothing to compare.`
    : `uniqueness: ${pages.length} city pages, ${pairs.length} pairs, highest ${pairs[0]?.value.toFixed(3) ?? '0'}; ${failures.length} over ${MAX}.`,
);
process.exit(failures.length ? 1 : 0);
