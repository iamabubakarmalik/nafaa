#!/usr/bin/env node
/**
 * Performance budget gate (ARCH 4.8, 14). Run after `next build`.
 *
 *   node scripts/check-budgets.mjs [--dist=.next] [--json=out.json] [--warn-only]
 *
 * Reads the build's manifests, so it does not depend on the format of Next's
 * printed route table, and measures gzip sizes the way Next does
 * (app-build-manifest entries, level-9 gzip):
 * - First Load JS per page route: ≤ 110 KB on content pages, ≤ 150 KB on
 *   pricing and tool pages.
 * - Page-specific JS (files only that route loads): ≤ 10 KB on content pages.
 * - Prerendered HTML: ≤ 60 KB gzip; element count ≤ 1,000 (home ≤ 1,200) as an
 *   estimate. Lighthouse's dom-size audit is the exact DOM check.
 * Internal /_dev galleries are reported but never fail the gate.
 *
 * Exit code 1 when any budget is over (0 with --warn-only).
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

// kB = 1,000 bytes, the unit Next prints in its route table, so the numbers
// here match what developers see after `next build`.
const KB = 1000;
export const BUDGETS = {
  firstLoadJs: { content: 110 * KB, heavy: 150 * KB },
  pageJs: { content: 10 * KB },
  htmlGzip: 60 * KB,
  domNodes: { default: 1000, home: 1200 },
};
/** Routes that get the 150 KB budget (ARCH 4.8: tool and pricing pages). */
const HEAVY_ROUTES = [/^\/pricing$/, /^\/tools(\/|$)/];
const IGNORED_ROUTES = [/^\/_dev(\/|$)/, /^\/%5Fdev(\/|$)/, /^\/_not-found$/, /^\/_global-error$/];

function arg(name, fallback) {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : true;
}

const siteRoot = resolve(new URL('..', import.meta.url).pathname);
const dist = resolve(siteRoot, String(arg('dist', '.next')));
const jsonOut = arg('json', null);
const warnOnly = Boolean(arg('warn-only', false));

if (!existsSync(join(dist, 'app-build-manifest.json'))) {
  console.error(`check-budgets: no production build at ${dist} (run next build first).`);
  process.exit(1);
}

const sizeCache = new Map();
function gz(file) {
  if (!sizeCache.has(file)) {
    try {
      sizeCache.set(file, gzipSync(readFileSync(join(dist, file)), { level: 9 }).length);
    } catch {
      sizeCache.set(file, 0);
    }
  }
  return sizeCache.get(file);
}
const kb = (bytes) => `${(bytes / KB).toFixed(1)} kB`;

/** "/[...slug]/page" → "/[...slug]"; "/(group)/x/page" → "/x". Mirrors Next's normalizeAppPath. */
function normalizeAppPath(key) {
  const parts = key.split('/').filter((seg, i, all) => {
    if (!seg) return false;
    if (seg.startsWith('(') && seg.endsWith(')')) return false;
    if (seg.startsWith('@')) return false;
    if ((seg === 'page' || seg === 'route') && i === all.length - 1) return false;
    return true;
  });
  return `/${parts.join('/')}`;
}

// ── JS ──
const app = JSON.parse(readFileSync(join(dist, 'app-build-manifest.json'), 'utf8'));
const allKeys = Object.keys(app.pages);
const counts = new Map();
for (const key of allKeys) for (const f of new Set(app.pages[key])) counts.set(f, (counts.get(f) ?? 0) + 1);
const common = new Set([...counts].filter(([, n]) => n === allKeys.length).map(([f]) => f));

const rows = [];
for (const key of allKeys.filter((k) => k.endsWith('/page'))) {
  const route = normalizeAppPath(key);
  const files = [...new Set(app.pages[key])].filter((f) => f.endsWith('.js'));
  const firstLoad = files.reduce((s, f) => s + gz(f), 0);
  const own = files.filter((f) => counts.get(f) === 1 && !common.has(f)).reduce((s, f) => s + gz(f), 0);
  const heavy = HEAVY_ROUTES.some((re) => re.test(route));
  const ignored = IGNORED_ROUTES.some((re) => re.test(route));
  const limit = heavy ? BUDGETS.firstLoadJs.heavy : BUDGETS.firstLoadJs.content;
  const problems = [];
  if (firstLoad > limit) problems.push(`First Load JS ${kb(firstLoad)} > ${kb(limit)}`);
  if (!heavy && own > BUDGETS.pageJs.content) problems.push(`page JS ${kb(own)} > ${kb(BUDGETS.pageJs.content)}`);
  rows.push({ route, firstLoad, own, limit, heavy, ignored, problems });
}
rows.sort((a, b) => a.route.localeCompare(b.route));

// ── Prerendered HTML ──
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}
/** Elements outside <script>/<style>/<template>, a close estimate of Lighthouse's DOM size. */
function elementCount(html) {
  const stripped = html.replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, '<x>');
  return (stripped.match(/<[a-zA-Z][^>]*>/g) ?? []).length;
}
const appDir = join(dist, 'server', 'app');
const html = [];
for (const file of walk(appDir)) {
  let route = `/${relative(appDir, file).replace(/\.html$/, '')}`;
  if (route === '/index') route = '/';
  if (IGNORED_ROUTES.some((re) => re.test(route)) || route === '/_not-found') continue;
  const buf = readFileSync(file);
  const gzip = gzipSync(buf, { level: 9 }).length;
  const nodes = elementCount(buf.toString('utf8'));
  const nodeLimit = route === '/' ? BUDGETS.domNodes.home : BUDGETS.domNodes.default;
  const problems = [];
  if (gzip > BUDGETS.htmlGzip) problems.push(`HTML ${kb(gzip)} gz > ${kb(BUDGETS.htmlGzip)}`);
  if (nodes > nodeLimit) problems.push(`~${nodes} elements > ${nodeLimit}`);
  html.push({ route, gzip, nodes, nodeLimit, problems });
}
html.sort((a, b) => a.route.localeCompare(b.route));

// ── Report ──
const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);
console.log('\nJS budgets (gzip)');
console.log(`${pad('Route', 44)}${lpad('First Load', 12)}${lpad('Budget', 10)}${lpad('Page JS', 10)}  Result`);
for (const r of rows) {
  const result = r.problems.length ? (r.ignored ? 'over (dev page, ignored)' : `FAIL: ${r.problems.join('; ')}`) : 'ok';
  console.log(`${pad(r.route, 44)}${lpad(kb(r.firstLoad), 12)}${lpad(kb(r.limit), 10)}${lpad(kb(r.own), 10)}  ${result}`);
}
if (html.length) {
  console.log('\nPrerendered HTML');
  console.log(`${pad('Route', 44)}${lpad('HTML gz', 12)}${lpad('Elements', 10)}  Result`);
  for (const h of html) {
    console.log(`${pad(h.route, 44)}${lpad(kb(h.gzip), 12)}${lpad(h.nodes, 10)}  ${h.problems.length ? `FAIL: ${h.problems.join('; ')}` : 'ok'}`);
  }
}

const failures = [
  ...rows.filter((r) => r.problems.length && !r.ignored).map((r) => `${r.route}: ${r.problems.join('; ')}`),
  ...html.filter((h) => h.problems.length).map((h) => `${h.route}: ${h.problems.join('; ')}`),
];
if (jsonOut) {
  writeFileSync(resolve(String(jsonOut)), JSON.stringify({ budgets: BUDGETS, js: rows, html, failures }, null, 2));
}
console.log(failures.length ? `\ncheck-budgets: ${failures.length} over budget${warnOnly ? ' (warn only)' : ''}.` : '\ncheck-budgets: all routes within budget.');
process.exit(failures.length && !warnOnly ? 1 : 0);
