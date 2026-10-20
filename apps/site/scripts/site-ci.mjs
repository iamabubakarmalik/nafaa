#!/usr/bin/env node
/**
 * Runs the site quality gates locally, the same way .github/workflows/site-ci.yml
 * does (ARCH 14, 15 Q1).
 *
 *   node scripts/site-ci.mjs                      all gates against a local build
 *   node scripts/site-ci.mjs --target=https://…   crawl + Lighthouse against a deployment (staging)
 *
 * Gates, in order (skip some with --skip=a,b or pick with --only=a,b):
 *   contract    scripts/sync-cms-contract.mjs --check (repo root)
 *   tokens      scripts/sync-tokens.mjs --check
 *   typecheck   tsc --noEmit
 *   lint        eslint .
 *   build       next build against the CMS (see "Data" below), SITE_INDEXABLE=false
 *   budgets     scripts/check-budgets.mjs (First Load JS, page JS, HTML size)
 *   crawl       scripts/seo-crawl.mjs --expect=noindex|index (SEO, schema, links, junk URLs, staging guard)
 *   uniqueness  scripts/uniqueness.mjs (city pages < 0.50)
 *   lighthouse  Lighthouse CI, mobile, on one URL per template (lighthouserc.json)
 *
 * Where it builds: by default in a copy of apps/site under the OS temp folder
 * (node_modules linked, not copied), so the running `next dev` and its .next
 * folder are never touched. --in-place builds in apps/site (GitHub Actions).
 *
 * Data: the build reads scripts/ci/fixture-api.mjs, which answers from the real
 * API (--real, default http://localhost:4000/api) whenever it has content and
 * from typed fixtures otherwise. --fixtures-only ignores any real API (CI).
 * --api=<url> builds straight against a CMS API instead (no fixtures).
 *
 * Other options: --workdir=<dir>, --runs=3 (Lighthouse runs per URL),
 * --expect=index (only for the production deployment; default noindex),
 * --site-url=<url> (with --target, when the deployment's SITE_URL differs),
 * --no-build-typecheck (copy mode only: skip the type and lint pass inside
 * next build, since typecheck and lint run as their own gates), --keep (leave
 * the servers running at the end).
 *
 * Writes <workdir>/ci-summary.json and the Lighthouse reports under
 * <workdir>/.lighthouseci/. Exit code 1 when any gate fails.
 */
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync, createWriteStream } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ciHeaders } from './ci/html.mjs';
import { FIXTURE_ONLY_ROUTES, keyRoutes } from './ci/routes.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(SITE_ROOT, '..', '..');
const LHCI = '@lhci/cli@0.15.1';

function arg(name, fallback) {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : true;
}
const list = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

const TARGET = arg('target', null) ? String(arg('target')).replace(/\/+$/, '') : null;
const IN_PLACE = Boolean(arg('in-place', false));
const FIXTURES_ONLY = Boolean(arg('fixtures-only', false));
const API = arg('api', null);
const REAL = String(arg('real', process.env.CMS_REAL_API_URL || 'http://localhost:4000/api'));
const RUNS = Number(arg('runs', 3));
/** noindex for local builds and staging; index only for the production deployment. */
const EXPECT = String(arg('expect', 'noindex'));
const KEEP = Boolean(arg('keep', false));
const NO_BUILD_TYPECHECK = Boolean(arg('no-build-typecheck', false));
const WORK = IN_PLACE ? SITE_ROOT : resolve(String(arg('workdir', join(tmpdir(), 'nafaa-site-ci'))));
const LOGS = join(IN_PLACE ? join(SITE_ROOT, '.site-ci') : WORK, 'logs');

const ALL = ['contract', 'tokens', 'typecheck', 'lint', 'build', 'budgets', 'crawl', 'uniqueness', 'lighthouse'];
const REMOTE = ['crawl', 'uniqueness', 'lighthouse'];
const only = list(arg('only', ''));
const skip = new Set(list(arg('skip', '')));
const gates = (only.length ? only : TARGET ? REMOTE : ALL).filter((g) => !skip.has(g));

// ── Process helpers ──
const children = new Set();
function run(name, cmd, args, { cwd = SITE_ROOT, env = {}, quiet = false } = {}) {
  mkdirSync(LOGS, { recursive: true });
  const logFile = join(LOGS, `${name}.log`);
  const log = createWriteStream(logFile);
  return new Promise((done) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let tail = '';
    const onData = (chunk) => {
      log.write(chunk);
      tail = (tail + chunk.toString()).slice(-6000);
      if (!quiet) process.stdout.write(chunk);
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('close', (code) => {
      log.end();
      done({ code: code ?? 1, tail, logFile });
    });
  });
}

function startServer(name, cmd, args, { cwd, env }) {
  mkdirSync(LOGS, { recursive: true });
  const log = createWriteStream(join(LOGS, `${name}.log`));
  const child = spawn(cmd, args, { cwd, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  children.add(child);
  child.on('close', () => children.delete(child));
  return child;
}

function stopAll() {
  for (const child of children) child.kill('SIGTERM');
}
process.on('SIGINT', () => {
  stopAll();
  process.exit(130);
});

async function freePort() {
  return new Promise((done, fail) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', fail);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => done(port));
    });
  });
}

async function waitFor(url, ms = 60_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.status < 500) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// ── Work copy ──
function prepareCopy() {
  mkdirSync(WORK, { recursive: true });
  for (const name of readdirSync(WORK)) {
    if (['node_modules', '.next', 'logs', '.lighthouseci'].includes(name)) continue;
    rmSync(join(WORK, name), { recursive: true, force: true });
  }
  const skipNames = new Set(['node_modules', '.next', '.lighthouseci', '.site-ci', 'tsconfig.tsbuildinfo', 'out']);
  for (const name of readdirSync(SITE_ROOT)) {
    if (skipNames.has(name) || name.startsWith('.env')) continue;
    cpSync(join(SITE_ROOT, name), join(WORK, name), {
      recursive: true,
      filter: (src) => !src.includes('/scripts/capture/out') && !src.endsWith('/node_modules'),
    });
  }
  if (!existsSync(join(WORK, 'node_modules'))) symlinkSync(join(SITE_ROOT, 'node_modules'), join(WORK, 'node_modules'), 'dir');
  rmSync(join(WORK, '.next'), { recursive: true, force: true });
  if (NO_BUILD_TYPECHECK) {
    renameSync(join(WORK, 'next.config.ts'), join(WORK, 'next.config.base.ts'));
    writeFileSync(
      join(WORK, 'next.config.ts'),
      [
        "// Generated by scripts/site-ci.mjs (--no-build-typecheck) in the CI work copy only.",
        "import type { NextConfig } from 'next';",
        "import base from './next.config.base';",
        'const config: NextConfig = { ...base, typescript: { ...base.typescript, ignoreBuildErrors: true }, eslint: { ...base.eslint, ignoreDuringBuilds: true } };',
        'export default config;',
        '',
      ].join('\n'),
    );
  }
}

// ── Lighthouse summary ──
function lighthouseSummary(dir) {
  const lhDir = join(dir, '.lighthouseci');
  if (!existsSync(lhDir)) return [];
  const byUrl = new Map();
  for (const file of readdirSync(lhDir).filter((f) => /^lhr-.*\.json$/.test(f))) {
    const lhr = JSON.parse(readFileSync(join(lhDir, file), 'utf8'));
    const url = lhr.requestedUrl ?? lhr.finalUrl;
    const row = byUrl.get(url) ?? [];
    row.push({
      performance: lhr.categories.performance?.score ?? null,
      accessibility: lhr.categories.accessibility?.score ?? null,
      bestPractices: lhr.categories['best-practices']?.score ?? null,
      seo: lhr.categories.seo?.score ?? null,
      lcp: lhr.audits['largest-contentful-paint']?.numericValue ?? null,
      tbt: lhr.audits['total-blocking-time']?.numericValue ?? null,
      cls: lhr.audits['cumulative-layout-shift']?.numericValue ?? null,
      dom: lhr.audits['dom-size']?.numericValue ?? null,
    });
    byUrl.set(url, row);
  }
  const median = (xs) => {
    const v = xs.filter((x) => x != null).sort((a, b) => a - b);
    return v.length ? v[Math.floor((v.length - 1) / 2)] : null;
  };
  return [...byUrl].map(([url, runs]) => {
    // The median run by performance, as LHCI's median-run aggregation picks it.
    const sorted = [...runs].sort((a, b) => (a.performance ?? 0) - (b.performance ?? 0));
    const mid = sorted[Math.floor((sorted.length - 1) / 2)];
    return { url, runs: runs.length, ...mid, lcp: median(runs.map((r) => r.lcp)), tbt: median(runs.map((r) => r.tbt)) };
  });
}

// ── Main ──
const results = [];
const record = (gate, ok, note = '') => {
  results.push({ gate, ok, note });
  console.log(`\n${ok ? 'PASS' : 'FAIL'}  ${gate}${note ? `  (${note})` : ''}\n`);
};

let base = TARGET;
// A preview URL can differ from the SITE_URL the deployment was built with
// (canonicals and sitemaps carry the latter); pass it with --site-url.
let siteUrl = TARGET ? String(arg('site-url', TARGET)).replace(/\/+$/, '') : null;
const buildDir = IN_PLACE ? SITE_ROOT : WORK;
const fixtureMode = !TARGET && !API;

console.log(`site-ci: gates ${gates.join(', ')}`);
console.log(`site-ci: ${TARGET ? `target ${TARGET}` : `build in ${buildDir}`}${fixtureMode ? `, data: fixture API${FIXTURES_ONLY ? ' (fixtures only)' : ` over ${REAL}`}` : API ? `, data: ${API}` : ''}`);

if (gates.includes('contract')) {
  const script = join(REPO_ROOT, 'scripts', 'sync-cms-contract.mjs');
  if (!existsSync(script)) record('contract', true, 'skipped: not in the monorepo');
  else record('contract', (await run('contract', 'node', [script, '--check'], { cwd: REPO_ROOT })).code === 0);
}
if (gates.includes('tokens')) record('tokens', (await run('tokens', 'node', ['scripts/sync-tokens.mjs', '--check'])).code === 0);
if (gates.includes('typecheck')) record('typecheck', (await run('typecheck', join(SITE_ROOT, 'node_modules/.bin/tsc'), ['--noEmit'])).code === 0);
if (gates.includes('lint')) record('lint', (await run('lint', join(SITE_ROOT, 'node_modules/.bin/eslint'), ['.'])).code === 0);

const needsServer = !TARGET && gates.some((g) => ['crawl', 'uniqueness', 'lighthouse'].includes(g));
let apiUrl = API ? String(API).replace(/\/+$/, '') : null;
let sitePort = null;
if (!TARGET && (gates.includes('build') || needsServer)) {
  sitePort = Number(arg('port', 0)) || (await freePort());
  siteUrl = `http://127.0.0.1:${sitePort}`;
  base = siteUrl;
  if (fixtureMode) {
    const apiPort = await freePort();
    apiUrl = `http://127.0.0.1:${apiPort}/api`;
    const fxArgs = ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', join(SITE_ROOT, 'scripts/ci/fixture-api.mjs'), `--port=${apiPort}`, `--site=${siteUrl}`];
    fxArgs.push(FIXTURES_ONLY ? '--fixtures-only' : `--real=${REAL}`);
    startServer('fixture-api', 'node', fxArgs, { cwd: SITE_ROOT, env: {} });
    if (!(await waitFor(`http://127.0.0.1:${apiPort}/health`, 20_000))) {
      console.error(`site-ci: the fixture API did not start; see ${join(LOGS, 'fixture-api.log')}`);
      stopAll();
      process.exit(1);
    }
  }
}

const buildEnv = {
  CMS_API_URL: apiUrl ?? '',
  NEXT_PUBLIC_API_URL: apiUrl ?? '',
  SITE_URL: siteUrl ?? '',
  SITE_INDEXABLE: 'false',
  SITE_DEV_PAGES: 'false',
};

let built = !gates.includes('build') && existsSync(join(buildDir, '.next', 'BUILD_ID'));
if (gates.includes('build')) {
  if (!IN_PLACE) prepareCopy();
  const res = await run('build', join(SITE_ROOT, 'node_modules/.bin/next'), ['build'], { cwd: buildDir, env: buildEnv });
  built = res.code === 0;
  record('build', built, built ? '' : `see ${res.logFile}`);
}

if (gates.includes('budgets')) {
  if (!built) record('budgets', false, 'no build');
  else {
    const res = await run('budgets', 'node', [join(SITE_ROOT, 'scripts/check-budgets.mjs'), `--dist=${join(buildDir, '.next')}`, `--json=${join(LOGS, 'budgets.json')}`], { cwd: buildDir });
    record('budgets', res.code === 0);
  }
}

if (needsServer) {
  if (!built) {
    for (const g of ['crawl', 'uniqueness', 'lighthouse'].filter((x) => gates.includes(x))) record(g, false, 'no build');
  } else {
    startServer('next-start', join(SITE_ROOT, 'node_modules/.bin/next'), ['start', '-p', String(sitePort), '-H', '127.0.0.1'], { cwd: buildDir, env: buildEnv });
    if (!(await waitFor(`${siteUrl}/robots.txt`, 60_000))) {
      console.error(`site-ci: next start did not answer; see ${join(LOGS, 'next-start.log')}`);
      stopAll();
      process.exit(1);
    }
  }
}

const serverUp = Boolean(TARGET) || (needsServer && built);
if (serverUp && gates.includes('crawl')) {
  const args = [join(SITE_ROOT, 'scripts/seo-crawl.mjs'), `--base=${base}`, `--site-url=${siteUrl}`, `--expect=${EXPECT}`, `--json=${join(LOGS, 'seo-crawl.json')}`];
  if (fixtureMode) args.push('--fixtures');
  record('crawl', (await run('crawl', 'node', args)).code === 0);
}
if (serverUp && gates.includes('uniqueness')) {
  const res = await run('uniqueness', 'node', [join(SITE_ROOT, 'scripts/uniqueness.mjs'), `--base=${base}`, `--site-url=${siteUrl}`, `--json=${join(LOGS, 'uniqueness.json')}`]);
  record('uniqueness', res.code === 0);
}

let lhRows = [];
if (serverUp && gates.includes('lighthouse')) {
  const lhDir = TARGET ? WORK : buildDir;
  mkdirSync(lhDir, { recursive: true });
  rmSync(join(lhDir, '.lighthouseci'), { recursive: true, force: true });
  const routes = [...keyRoutes().map((r) => r.path), ...(fixtureMode ? FIXTURE_ONLY_ROUTES : [])];
  // Only routes that answer 200 are measured; a missing template is reported by the crawl.
  const live = [];
  for (const path of routes) {
    try {
      const res = await fetch(base + path, { redirect: 'manual', headers: ciHeaders(), signal: AbortSignal.timeout(30_000) });
      if (res.status === 200) live.push(path);
      else console.log(`site-ci: lighthouse skips ${path} (${res.status})`);
    } catch {
      console.log(`site-ci: lighthouse skips ${path} (no answer)`);
    }
  }
  // Effective config: lighthouserc.json plus bypass headers; production also
  // runs is-crawlable (staging and local builds are noindex by design).
  const rc = JSON.parse(readFileSync(join(SITE_ROOT, 'lighthouserc.json'), 'utf8'));
  const headers = ciHeaders();
  if (Object.keys(headers).length) rc.ci.collect.settings.extraHeaders = headers;
  if (EXPECT === 'index') delete rc.ci.collect.settings.skipAudits;
  const config = join(lhDir, 'lighthouserc.effective.json');
  writeFileSync(config, JSON.stringify(rc, null, 2));
  const urlArgs = live.map((p) => `--url=${base}${p}`);
  const collect = await run('lighthouse-collect', 'npx', ['--yes', LHCI, 'collect', `--config=${config}`, `--numberOfRuns=${RUNS}`, ...urlArgs], { cwd: lhDir, quiet: true });
  let ok = collect.code === 0 && live.length > 0;
  if (collect.code === 0) {
    const assert = await run('lighthouse-assert', 'npx', ['--yes', LHCI, 'assert', `--config=${config}`], { cwd: lhDir });
    ok = ok && assert.code === 0;
    await run('lighthouse-upload', 'npx', ['--yes', LHCI, 'upload', `--config=${config}`], { cwd: lhDir, quiet: true });
  } else {
    console.log(collect.tail);
  }
  lhRows = lighthouseSummary(lhDir);
  record('lighthouse', ok, `${live.length}/${routes.length} routes, ${RUNS} run(s) each; reports in ${join(lhDir, '.lighthouseci')}`);
}

// ── Summary ──
if (lhRows.length) {
  const pct = (v) => (v == null ? '  -' : String(Math.round(v * 100)).padStart(3));
  const ms = (v) => (v == null ? '-' : `${Math.round(v)}`);
  console.log('\nLighthouse (mobile, median run)');
  console.log(`${'URL'.padEnd(46)} Perf  A11y  BP   SEO   LCP ms  TBT ms  CLS    DOM`);
  for (const r of lhRows) {
    const path = r.url.replace(base, '') || '/';
    console.log(`${path.padEnd(46)} ${pct(r.performance)}   ${pct(r.accessibility)}   ${pct(r.bestPractices)}  ${pct(r.seo)}   ${ms(r.lcp).padStart(6)}  ${ms(r.tbt).padStart(6)}  ${(r.cls ?? 0).toFixed(3)}  ${r.dom ?? '-'}`);
  }
}
console.log('\nsite-ci summary');
for (const r of results) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.gate}${r.note ? `  ${r.note}` : ''}`);

const summaryFile = join(IN_PLACE ? join(SITE_ROOT, '.site-ci') : WORK, 'ci-summary.json');
mkdirSync(dirname(summaryFile), { recursive: true });
writeFileSync(summaryFile, JSON.stringify({ at: new Date().toISOString(), base, siteUrl, fixtureMode, gates: results, lighthouse: lhRows }, null, 2));
console.log(`\nsite-ci: summary in ${summaryFile}; logs in ${LOGS}`);

if (KEEP && children.size) {
  console.log(`site-ci: --keep: site on ${siteUrl}${apiUrl ? `, API on ${apiUrl}` : ''}. Ctrl+C to stop.`);
} else {
  stopAll();
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
