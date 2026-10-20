#!/usr/bin/env node
/**
 * Fixture CMS API for the site quality gates (ARCH 14, 15 Q1).
 *
 *   node scripts/ci/fixture-api.mjs --port=4310 --site=http://127.0.0.1:3310 [--real=http://localhost:4000/api] [--fixtures-only]
 *
 * Serves GET /api/public/site/* in the public contract's shapes.
 * - With --real (default http://localhost:4000/api, or CMS_REAL_API_URL), each
 *   request goes to the real API first and its answer wins whenever it holds
 *   data. The fixtures fill in only what the CMS does not have yet, so the
 *   checks move to real content automatically as entries are published.
 * - --fixtures-only (GitHub Actions) never calls a real API.
 * - Every fixture is parsed with the contract's zod schemas at start-up; a
 *   fixture that drifts from the contract stops the server.
 * - Responses served from fixtures carry `x-cms-source: fixture`.
 *
 * Dev and CI only: nothing under src/ imports this, and builds made against it
 * run with SITE_INDEXABLE=false.
 */
import http from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = join(HERE, '..', '..');

function arg(name, fallback) {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : true;
}

const PORT = Number(arg('port', process.env.FIXTURE_API_PORT || 4310));
const SITE = String(arg('site', process.env.SITE_URL || 'http://127.0.0.1:3310')).replace(/\/+$/, '');
const FIXTURES_ONLY = Boolean(arg('fixtures-only', false));
const REAL = FIXTURES_ONLY ? null : String(arg('real', process.env.CMS_REAL_API_URL || 'http://localhost:4000/api')).replace(/\/+$/, '');
const QUIET = Boolean(arg('quiet', false));

const contract = await import(pathToFileURL(join(SITE_ROOT, 'src/lib/cms/contract/cms-contract.ts')).href);
const { buildFixtures } = await import(pathToFileURL(join(HERE, 'fixtures.ts')).href);
const fx = buildFixtures(SITE);

// ── Validate every fixture against the contract ──
const problems = [];
function check(label, schema, value) {
  const res = schema.safeParse(value);
  if (!res.success) problems.push(`${label}: ${res.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
}
for (const entry of fx.entries) {
  check(`entry ${entry.path}`, contract.publicEntrySchema, entry);
  check(`entry ${entry.path} blocks`, contract.blocksSchema, entry.blocks);
  const dataRes = contract.parseEntryData(entry.type, entry.data, 'publish');
  if (!dataRes.success) problems.push(`entry ${entry.path} data: ${dataRes.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
}
check('layout', contract.publicLayoutSchema, fx.layout);
for (const plan of fx.plans) check(`plan ${plan.slug}`, contract.publicPlanSchema, plan);
if (problems.length) {
  console.error(`fixture-api: ${problems.length} fixture(s) do not match the contract:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

// ── Fixture answers ──
const indexable = fx.entries.filter((e) => e.seo.robots.index);
const cardOf = (e) => ({
  id: e.id, type: e.type, locale: e.locale, path: e.path, url: e.url, title: e.title, summary: e.summary, image: null,
  ...(e.data.icon ? { icon: e.data.icon } : {}),
  ...(e.data.shortName ? { shortName: e.data.shortName } : {}),
  ...(e.data.status ? { status: e.data.status } : {}),
  contentUpdatedAt: e.dateModified,
});

let realPlans = null;
async function plans() {
  if (realPlans) return realPlans;
  const real = await fromReal('/public/site/plans');
  if (real.ok && Array.isArray(real.data) && real.data.length) {
    realPlans = real.data;
    return realPlans;
  }
  return fx.plans;
}

async function entity() {
  const list = await plans();
  const paid = list.filter((p) => p.priceMonthly > 0).map((p) => p.priceMonthly);
  const count = (types) => fx.entries.filter((e) => types.includes(e.type) && e.seo.robots.index).length;
  return {
    ...fx.entity,
    counts: {
      industries: count(['INDUSTRY']),
      cities: count(['CITY']),
      integrationsLive: count(['INTEGRATION']),
      glossaryTerms: count(['GLOSSARY_TERM']),
      posts: count(['BLOG_POST']),
    },
    plans: list.map((p) => ({ slug: p.slug, name: p.name, priceMonthly: p.priceMonthly })),
    minPaidMonthly: paid.length ? Math.min(...paid) : null,
  };
}

function allFaqs() {
  const seen = new Map();
  for (const e of fx.entries) for (const f of e.faqs) seen.set(f.id, f);
  return [...seen.values()];
}

const fixtureHandlers = {
  '/public/site/layout': () => fx.layout,
  '/public/site/entity': () => entity(),
  '/public/site/plans': () => plans(),
  '/public/site/entry': (q) => fx.entries.find((e) => e.path === (q.get('path') || '/')) ?? null,
  '/public/site/entries': (q) => {
    const type = q.get('type');
    const statuses = (q.get('status') || '').split(',').filter(Boolean);
    const limit = Number(q.get('limit') || 50);
    const items = fx.entries
      .filter((e) => e.type === type)
      .filter((e) => !statuses.length || statuses.includes(e.data.status ?? 'live'))
      .slice(0, limit)
      .map(cardOf);
    return { items, nextCursor: null };
  },
  '/public/site/paths': (q) => {
    const type = q.get('type');
    return { items: fx.entries.filter((e) => !type || e.type === type).map((e) => ({ type: e.type, path: e.path, locale: e.locale, updatedAt: e.dateModified })) };
  },
  '/public/site/faqs': () => ({ topics: [{ key: 'fixtures', label: 'Fixtures', faqs: allFaqs() }] }),
  '/public/site/testimonials': () => [],
  '/public/site/customers': () => [],
  '/public/site/stats': async (q) => {
    const wanted = (q.get('metrics') || '').split(',').filter(Boolean);
    const ent = await entity();
    const values = {
      'industries.count': ent.counts.industries,
      'cities.count': ent.counts.cities,
      'integrations.live.count': ent.counts.integrationsLive,
      'glossary.count': ent.counts.glossaryTerms,
      'posts.count': ent.counts.posts,
      'plans.count': ent.plans.length,
      ...(ent.minPaidMonthly != null ? { 'plans.minPaid.monthly': ent.minPaidMonthly } : {}),
    };
    const out = {};
    for (const m of wanted) if (m in values) out[m] = { value: values[m], formatted: String(values[m]), asOf: fx.entity.generatedAt };
    return out;
  },
  '/public/site/redirects': () => ({
    rules: [{ id: 'fixture-redirect', from: '/ci-fixture-old', to: '/about', status: 301, pattern: false }],
    updatedAt: fx.entity.generatedAt,
  }),
  '/public/site/sitemap': (q) => {
    const section = q.get('section');
    const types = contract.SITEMAP_SECTIONS[section] ?? [];
    return {
      items: indexable
        .filter((e) => types.includes(e.type) && e.seo.canonical === e.url)
        .map((e) => ({ url: e.url, lastmod: e.dateModified, images: [], alternates: [] })),
    };
  },
  '/public/site/llms': async () => ({
    entity: await entity(),
    sections: contract.SITEMAP_SECTION_KEYS.map((key) => ({
      key,
      title: key[0].toUpperCase() + key.slice(1),
      items: indexable.filter((e) => contract.SITEMAP_SECTIONS[key].includes(e.type)).map((e) => ({ title: e.title, url: e.url, summary: e.summary })),
    })).filter((s) => s.items.length),
    topFaqs: allFaqs().slice(0, 10),
    full: indexable.filter((e) => e.path === '/' || e.path === '/pricing').map((e) => ({ url: e.url, title: e.title, summary: e.summary, keyFacts: [], faqs: e.faqs })),
    generatedAt: fx.entity.generatedAt,
  }),
  '/public/site/search-index': () => ({ items: indexable.map((e) => ({ title: e.title, path: e.path, type: e.type, summary: e.summary ?? undefined })) }),
};

// ── Real API first ──
async function fromReal(pathWithQuery) {
  if (!REAL) return { ok: false };
  try {
    const res = await fetch(`${REAL}${pathWithQuery}`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return { ok: false, status: res.status };
    const body = await res.json();
    const data = body && typeof body === 'object' && 'success' in body && 'data' in body ? body.data : body;
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}

/** True when the real API's answer holds content worth using over a fixture. */
function hasContent(pathname, data) {
  if (data == null) return false;
  if (Array.isArray(data)) return data.length > 0;
  if (pathname === '/public/site/faqs') return Array.isArray(data.topics) && data.topics.length > 0;
  if (pathname === '/public/site/redirects') return Array.isArray(data.rules) && data.rules.length > 0;
  if (pathname === '/public/site/stats') return Object.keys(data).length > 0;
  if ('items' in data) return Array.isArray(data.items) && data.items.length > 0;
  return true;
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

function send(res, status, body, source) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'x-cms-source': source, ...CORS });
  res.end(JSON.stringify(body));
}

const stats = { real: 0, fixture: 0 };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://fixture.local');
  const pathname = url.pathname.replace(/^\/api(?=\/)/, '');
  try {
    if (pathname === '/health') return send(res, 200, { ok: true, real: REAL, ...stats }, 'fixture');
    // Analytics and lead forms post here from the browser; accept and drop them.
    if (req.method === 'OPTIONS' || pathname === contract.PUBLIC_SITE_ENDPOINTS.redirectHit || (req.method === 'POST' && pathname.startsWith('/public/marketing/'))) {
      req.resume();
      res.writeHead(204, CORS);
      return res.end();
    }
    if (pathname === contract.PUBLIC_SITE_ENDPOINTS.preview) return send(res, 401, { success: false, message: 'No preview in CI' }, 'fixture');
    if (req.method !== 'GET') return send(res, 405, { success: false }, 'fixture');

    const handler = fixtureHandlers[pathname];
    const real = await fromReal(`${pathname}${url.search}`);
    if (real.ok && hasContent(pathname, real.data)) {
      stats.real += 1;
      return send(res, 200, { success: true, data: real.data }, 'real');
    }
    if (!handler) {
      if (real.status) return send(res, real.status, { success: false }, 'real');
      return send(res, 404, { success: false, message: `No fixture for ${pathname}` }, 'fixture');
    }
    const data = await handler(url.searchParams);
    stats.fixture += 1;
    if (data === null) return send(res, 404, { success: false, message: 'Not found' }, 'fixture');
    return send(res, 200, { success: true, data }, 'fixture');
  } catch (error) {
    return send(res, 500, { success: false, message: String(error) }, 'fixture');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  if (!QUIET) {
    console.log(`fixture-api: http://127.0.0.1:${PORT}/api (site ${SITE}; real API ${REAL ?? 'off'}; ${fx.entries.length} fixture entries)`);
  }
});

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
