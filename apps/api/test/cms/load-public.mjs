#!/usr/bin/env node
/**
 * Load test for the public CMS read API (`/public/site/*`, ARCH 7.2).
 *
 * GET requests only: it never writes (the redirect hit counter is left out).
 * Use it against a local or staging API, not production.
 *
 *   node apps/api/test/cms/load-public.mjs [--base=http://localhost:4000/api]
 *       [--concurrency=20] [--seconds=15] [--etag]
 *
 * --etag replays the ETag of the first response for each URL, measuring the
 * 304 path the site's fetch cache uses.
 *
 * Prints per-endpoint status counts and latency percentiles. Exits 1 when any
 * request fails at the network level, returns 5xx (other than the 503 that
 * layout, entity and llms answer while site settings are unsaved) or 429
 * (public reads must not be throttled).
 */
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  }),
);
const base = (args.base ?? process.env.CMS_API_URL ?? 'http://localhost:4000/api').replace(/\/+$/, '');
const concurrency = Number(args.concurrency ?? 20);
const seconds = Number(args.seconds ?? 15);
const useEtag = args.etag === 'true';

if (/nafaa\.pk/.test(base) && args.force !== 'true') {
  console.error('Refusing to load-test a production host without --force=true');
  process.exit(2);
}

const paths = [
  '/public/site/plans',
  '/public/site/paths',
  '/public/site/paths?type=INDUSTRY',
  '/public/site/redirects',
  '/public/site/entries?type=INDUSTRY&limit=12',
  '/public/site/entries?type=INTEGRATION&status=coming,beta',
  '/public/site/entry?path=/',
  '/public/site/entry?path=/pos-software/lahore',
  '/public/site/layout',
  '/public/site/entity',
  '/public/site/faqs',
  '/public/site/sitemap?section=pages',
  '/public/site/search-index',
  '/public/site/llms',
  '/public/site/stats?metrics=industries.count,integrations.live.count',
  '/public/site/testimonials',
  '/public/site/customers',
];

/** Endpoints that answer 503 until settings `site` / `entity` are saved. */
const NEEDS_SETTINGS = new Set(['/public/site/layout', '/public/site/entity', '/public/site/llms']);

const stats = new Map(paths.map((p) => [p, { statuses: new Map(), times: [], errors: 0 }]));
const etags = new Map();
let total = 0;

async function hit(path) {
  const s = stats.get(path);
  const headers = {};
  if (useEtag && etags.has(path)) headers['if-none-match'] = etags.get(path);
  const t0 = performance.now();
  try {
    const res = await fetch(`${base}${path}`, { headers });
    await res.arrayBuffer();
    s.times.push(performance.now() - t0);
    s.statuses.set(res.status, (s.statuses.get(res.status) ?? 0) + 1);
    const tag = res.headers.get('etag');
    if (tag && !etags.has(path)) etags.set(path, tag);
  } catch {
    s.errors += 1;
  }
  total += 1;
}

function pct(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function worker(deadline, offset) {
  let i = offset;
  while (Date.now() < deadline) {
    await hit(paths[i % paths.length]);
    i += 1;
  }
}

const started = Date.now();
const deadline = started + seconds * 1000;
await Promise.all(Array.from({ length: concurrency }, (_, i) => worker(deadline, i)));
const elapsed = (Date.now() - started) / 1000;

let failed = false;
console.log(`\n${base}  concurrency=${concurrency}  ${seconds}s  ${total} requests  ${(total / elapsed).toFixed(1)} req/s${useEtag ? '  (ETag replay)' : ''}\n`);
console.log('endpoint'.padEnd(64), 'statuses'.padEnd(22), 'p50'.padStart(7), 'p95'.padStart(7), 'p99'.padStart(7), 'max'.padStart(7));
for (const [path, s] of stats) {
  const sorted = [...s.times].sort((a, b) => a - b);
  const statuses = [...s.statuses].map(([code, n]) => `${code}:${n}`).join(' ') + (s.errors ? ` ERR:${s.errors}` : '');
  const bad = s.errors > 0 || [...s.statuses.keys()].some((c) => c === 429 || (c >= 500 && !(c === 503 && NEEDS_SETTINGS.has(path))));
  if (bad) failed = true;
  const ms = (v) => `${v.toFixed(0)}ms`.padStart(7);
  console.log(`${bad ? '!' : ' '} ${path}`.padEnd(64), statuses.padEnd(22), ms(pct(sorted, 50)), ms(pct(sorted, 95)), ms(pct(sorted, 99)), ms(sorted.at(-1) ?? 0));
}
process.exit(failed ? 1 : 0);
