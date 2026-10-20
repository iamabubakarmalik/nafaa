#!/usr/bin/env node
/**
 * SEO crawl gate (ARCH 14). Crawls a running site and checks what search and
 * answer engines read.
 *
 *   node scripts/seo-crawl.mjs --base=http://127.0.0.1:3310 --expect=noindex [--site-url=…] [--routes=/a,/b] [--json=out.json]
 *
 *   --base       where to fetch from (a local `next start` or the staging URL)
 *   --site-url   the SITE_URL the build used, when it differs from --base
 *                (canonicals and sitemap <loc>s carry it); defaults to --base
 *   --expect     noindex: staging guard. robots.txt must disallow everything
 *                and every page must send noindex (header or meta).
 *                index: production. robots.txt allows crawling and lists the
 *                sitemap; sitemap URLs must not be noindex.
 *   --routes     extra paths to crawl besides the sitemap and the key routes
 *   --max=400    page cap
 *
 * Per page: status 200, self canonical, title 30-60 and unique, one H1,
 * meta description, <html lang>, JSON-LD parses into exactly one @graph with
 * unique @ids, no AggregateRating, no Product offer at price 0, LocalBusiness
 * only with an address, FAQPage questions equal the visible <details> FAQ,
 * images have alt. Links: every internal link answers 200 (3xx and 4xx fail).
 * Plus 30 junk URLs that must 404 (no soft 404s, no 500s), robots.txt,
 * sitemap index, section sitemaps, llms.txt and llms-full.txt.
 *
 * Exit code 1 on any error; warnings are printed but do not fail.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { blocks, ciHeaders, locs, pool, tags, text } from './ci/html.mjs';
import { FIXTURE_ONLY_ROUTES, keyRoutes } from './ci/routes.mjs';

function arg(name, fallback) {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : true;
}

const BASE = String(arg('base', process.env.SITE_CI_BASE || '')).replace(/\/+$/, '');
if (!BASE) {
  console.error('seo-crawl: --base=<url> is required');
  process.exit(2);
}
const SITE_URL = String(arg('site-url', BASE)).replace(/\/+$/, '');
const EXPECT = String(arg('expect', 'noindex'));
const MAX = Number(arg('max', 400));
const FIXTURES = Boolean(arg('fixtures', false));
const JSON_OUT = arg('json', null);
const extraRoutes = String(arg('routes', '')).split(',').map((s) => s.trim()).filter(Boolean);

if (!['noindex', 'index'].includes(EXPECT)) {
  console.error('seo-crawl: --expect must be noindex or index');
  process.exit(2);
}

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

/** Site path for a URL on BASE or SITE_URL; null for other origins. */
function sitePath(href, from = BASE) {
  let url;
  try {
    url = new URL(href, from + '/');
  } catch {
    return null;
  }
  const origin = url.origin;
  if (origin !== new URL(BASE).origin && origin !== new URL(SITE_URL).origin) return null;
  return url.pathname + url.search;
}

async function get(path, { redirect = 'manual' } = {}) {
  const started = Date.now();
  try {
    const res = await fetch(BASE + path, { redirect, headers: { 'user-agent': 'nafaa-site-ci/1.0 (+seo-crawl)', ...ciHeaders() }, signal: AbortSignal.timeout(30_000) });
    const body = await res.text();
    return { status: res.status, headers: res.headers, body, ms: Date.now() - started };
  } catch (error) {
    return { status: 0, headers: new Headers(), body: '', ms: Date.now() - started, error: String(error) };
  }
}

// ── robots.txt, sitemaps, llms ──
async function checkRobots() {
  const res = await get('/robots.txt');
  if (res.status !== 200) return err('/robots.txt', `status ${res.status}`);
  const lines = res.body.split('\n').map((l) => l.trim());
  const disallowAll = /User-agent:\s*\*\s*\n\s*Disallow:\s*\/\s*(\n|$)/i.test(res.body.replace(/\r/g, ''));
  if (EXPECT === 'noindex') {
    if (!disallowAll) err('/robots.txt', 'staging guard: expected "User-agent: *" + "Disallow: /"');
    if (lines.some((l) => /^Sitemap:/i.test(l))) warn('/robots.txt', 'staging robots.txt lists a sitemap');
  } else {
    if (disallowAll) err('/robots.txt', 'production robots.txt disallows everything (SITE_INDEXABLE is not true)');
    if (!lines.some((l) => /^Sitemap:\s*\S+\/sitemap\.xml$/i.test(l))) err('/robots.txt', 'no Sitemap: …/sitemap.xml line');
    for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) {
      if (!res.body.includes(bot)) warn('/robots.txt', `AI crawler ${bot} is not named`);
    }
  }
}

async function sitemapPaths() {
  const index = await get('/sitemap.xml');
  if (index.status !== 200) {
    err('/sitemap.xml', `status ${index.status}`);
    return [];
  }
  if (!/<sitemapindex\b/.test(index.body)) err('/sitemap.xml', 'not a <sitemapindex>');
  const out = [];
  for (const loc of locs(index.body)) {
    const path = sitePath(loc);
    if (!path) {
      err('/sitemap.xml', `section on another origin: ${loc}`);
      continue;
    }
    const section = await get(path);
    if (section.status !== 200) {
      err(path, `status ${section.status}`);
      continue;
    }
    if (!/<urlset\b/.test(section.body)) err(path, 'not a <urlset>');
    if (/<(changefreq|priority)>/.test(section.body)) err(path, 'has changefreq/priority (ARCH 9)');
    for (const url of locs(section.body)) {
      if (!url.startsWith(SITE_URL)) err(path, `<loc> not on SITE_URL ${SITE_URL}: ${url}`);
      const p = sitePath(url);
      if (p) out.push(p);
    }
  }
  if (out.length === 0) warn('/sitemap.xml', 'no URLs in any section sitemap');
  return [...new Set(out)];
}

async function checkLlms() {
  for (const path of ['/llms.txt', '/llms-full.txt']) {
    const res = await get(path);
    if (res.status !== 200) {
      err(path, `status ${res.status}`);
      continue;
    }
    if (!/^text\/(plain|markdown)/.test(res.headers.get('content-type') ?? '')) warn(path, `content-type ${res.headers.get('content-type')}`);
    if (!/^# /m.test(res.body)) err(path, 'no "# " title line');
    if (path === '/llms-full.txt' && Buffer.byteLength(res.body) > 500 * 1024) err(path, 'over 500 KB');
  }
}

// ── Page checks ──
const titles = new Map();
const internalLinks = new Map(); // path → first page that links to it

function robotsOf(res, html) {
  const header = (res.headers.get('x-robots-tag') ?? '').toLowerCase();
  const meta = tags(html, 'meta')
    .filter((t) => (t.attrs.name ?? '').toLowerCase() === 'robots')
    .map((t) => (t.attrs.content ?? '').toLowerCase())
    .join(',');
  return { noindex: header.includes('noindex') || meta.includes('noindex'), header, meta };
}

function graphNodes(json) {
  if (Array.isArray(json)) return json.flatMap(graphNodes);
  if (json && typeof json === 'object') {
    if (Array.isArray(json['@graph'])) return json['@graph'];
    return [json];
  }
  return [];
}

function typesOf(node) {
  const t = node?.['@type'];
  return Array.isArray(t) ? t : t ? [t] : [];
}

function checkSchema(path, html, visibleFaq) {
  const scripts = blocks(html, 'script').filter((s) => (s.attrs.type ?? '').toLowerCase() === 'application/ld+json');
  if (scripts.length === 0) return err(path, 'no JSON-LD');
  const parsed = [];
  for (const s of scripts) {
    try {
      parsed.push(JSON.parse(s.inner));
    } catch (e) {
      err(path, `JSON-LD does not parse: ${String(e).slice(0, 120)}`);
    }
  }
  const graphs = parsed.filter((p) => p && typeof p === 'object' && Array.isArray(p['@graph']));
  if (graphs.length !== 1 || parsed.length !== 1) err(path, `expected one JSON-LD @graph, found ${parsed.length} script(s) / ${graphs.length} graph(s)`);
  for (const p of parsed) {
    const ctx = p?.['@context'];
    if (typeof ctx !== 'string' || !/^https?:\/\/schema\.org\/?$/.test(ctx)) err(path, `JSON-LD @context is ${JSON.stringify(ctx)}`);
  }
  const raw = scripts.map((s) => s.inner).join('\n');
  if (/AggregateRating|"aggregateRating"/.test(raw)) err(path, 'AggregateRating in JSON-LD (never allowed)');

  const nodes = parsed.flatMap(graphNodes);
  const ids = new Map();
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;
    if (typesOf(node).length === 0) err(path, 'JSON-LD node without @type');
    const id = node['@id'];
    if (id) {
      if (ids.has(id)) err(path, `duplicate @id ${id}`);
      ids.set(id, node);
    }
  }
  // References to this page's or the site's own @ids must resolve inside the
  // graph; ids of other pages (an author's Person, the glossary set) may not.
  const pageUrl = SITE_URL + (path === '/' ? '/' : path.split('?')[0]);
  const local = (id) => id.startsWith(`${pageUrl}#`) || id.startsWith(`${SITE_URL}/#`);
  const refs = raw.match(/"@id"\s*:\s*"([^"]+)"/g) ?? [];
  for (const ref of refs) {
    const id = /"@id"\s*:\s*"([^"]+)"/.exec(ref)?.[1];
    if (id && !ids.has(id) && local(id)) err(path, `@id reference not in the graph: ${id}`);
  }
  const typeSet = new Set(nodes.flatMap(typesOf));
  for (const required of ['Organization', 'WebSite']) if (!typeSet.has(required)) err(path, `graph has no ${required}`);
  if (![...typeSet].some((t) => /Page$/.test(t))) warn(path, 'graph has no WebPage-type node');

  for (const node of nodes) {
    const types = typesOf(node);
    if (types.includes('LocalBusiness') && !node.address) err(path, 'LocalBusiness without a real address');
    if (types.includes('Product') || types.includes('SoftwareApplication')) {
      const offers = [node.offers].flat().filter(Boolean).flatMap((o) => (o.offers ? [o.offers].flat() : [o]));
      if (types.includes('Product') && offers.some((o) => Number(o.price) === 0)) err(path, 'Product offer with price 0');
      for (const o of offers) if (o.price != null && o.priceCurrency !== 'PKR') warn(path, `offer currency ${o.priceCurrency}`);
    }
  }

  const faqNodes = nodes.filter((n) => typesOf(n).includes('FAQPage'));
  if (faqNodes.length > 1) err(path, 'more than one FAQPage');
  const norm = (s) => text(String(s)).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const schemaQs = faqNodes.flatMap((n) => [n.mainEntity].flat().filter(Boolean).map((q) => norm(q.name ?? '')));
  const visibleQs = visibleFaq.map(norm);
  if (faqNodes.length && visibleQs.length === 0) err(path, 'FAQPage in JSON-LD but no visible FAQ (<details><summary>)');
  if (faqNodes.length && visibleQs.length) {
    const a = [...schemaQs].sort().join('|');
    const b = [...visibleQs].sort().join('|');
    if (a !== b) err(path, `FAQPage (${schemaQs.length}) does not match the visible FAQ (${visibleQs.length})`);
  }
  if (!faqNodes.length && visibleQs.length >= 2) warn(path, `visible FAQ (${visibleQs.length}) without FAQPage`);
}

async function checkPage(path, { expectIndexable }) {
  const res = await get(path);
  if (res.status !== 200) {
    err(path, `status ${res.status}${res.error ? ` (${res.error})` : ''}${res.headers.get('location') ? ` → ${res.headers.get('location')}` : ''}`);
    return;
  }
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('text/html')) return;
  const html = res.body;
  const robots = robotsOf(res, html);

  if (EXPECT === 'noindex' && !robots.noindex) err(path, 'staging guard: page is indexable (no X-Robots-Tag/meta noindex)');
  if (EXPECT === 'index' && expectIndexable && robots.noindex) err(path, `in the sitemap but noindex (${robots.header || robots.meta})`);

  const htmlTag = tags(html, 'html')[0];
  if (!htmlTag?.attrs.lang) err(path, '<html> has no lang');

  const title = text(blocks(html, 'title')[0]?.inner ?? '');
  if (!title) err(path, 'no <title>');
  else {
    if (title.length < 30 || title.length > 60) err(path, `title length ${title.length} (30-60): "${title}"`);
    if ((title.match(/Nafaa/g) ?? []).length > 1) err(path, `brand appears more than once in the title: "${title}"`);
    if (!robots.noindex || EXPECT === 'noindex') {
      if (titles.has(title)) err(path, `duplicate title with ${titles.get(title)}: "${title}"`);
      else titles.set(title, path);
    }
  }

  const desc = tags(html, 'meta').find((t) => (t.attrs.name ?? '').toLowerCase() === 'description')?.attrs.content ?? '';
  if (!desc) err(path, 'no meta description');
  else if (desc.length < 140 || desc.length > 155) warn(path, `description length ${desc.length} (140-155)`);
  if (tags(html, 'meta').some((t) => (t.attrs.name ?? '').toLowerCase() === 'keywords')) err(path, 'has meta keywords (ARCH 8)');

  const canonicals = tags(html, 'link').filter((t) => (t.attrs.rel ?? '').toLowerCase().split(/\s+/).includes('canonical'));
  if (canonicals.length !== 1) err(path, `${canonicals.length} canonical links`);
  else {
    const href = canonicals[0].attrs.href ?? '';
    const expected = SITE_URL + (path === '/' ? '' : path.split('?')[0]);
    const normalize = (u) => u.replace(/\/$/, '');
    if (!/^https?:\/\//.test(href)) err(path, `canonical is not absolute: ${href}`);
    else if (normalize(href) !== normalize(expected)) {
      // A different canonical is allowed only when the editor set one (it must then not be indexable here).
      if (robots.noindex) warn(path, `canonical ${href} is not self`);
      else err(path, `canonical ${href} is not self (${expected})`);
    }
  }

  const h1s = blocks(html, 'h1');
  if (h1s.length !== 1) err(path, `${h1s.length} <h1> elements`);
  const headings = [...html.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
  for (let i = 1; i < headings.length; i += 1) {
    if (headings[i] > headings[i - 1] + 1) {
      warn(path, `heading level skips from h${headings[i - 1]} to h${headings[i]}`);
      break;
    }
  }

  for (const img of tags(html, 'img')) {
    if (!('alt' in img.attrs)) err(path, `<img> without alt (${(img.attrs.src ?? '').slice(0, 80)})`);
  }

  const visibleFaq = blocks(html, 'summary').map((s) => text(s.inner));
  checkSchema(path, html, visibleFaq);

  for (const a of tags(html, 'a')) {
    const href = a.attrs.href;
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript|data):/i.test(href)) continue;
    const p = sitePath(href, BASE + path);
    if (p === null) continue;
    const clean = p.split('#')[0] || '/';
    if (!internalLinks.has(clean)) internalLinks.set(clean, path);
  }
}

// ── Junk URLs ──
function junkPaths() {
  const r = Math.random().toString(36).slice(2, 8);
  return [
    `/ci-junk-${r}`, `/ci-junk-${r}/deeper`, `/product/ci-junk-${r}`, `/industries/ci-junk-${r}`, `/solutions/ci-junk-${r}`,
    `/services/ci-junk-${r}`, `/integrations/ci-junk-${r}`, `/compliance/ci-junk-${r}`, `/pos-software/ci-junk-${r}`,
    `/pos-software/lahore/ci-junk-${r}`, `/best/ci-junk-${r}`, `/compare/ci-junk-${r}`, `/alternatives/ci-junk-${r}`,
    `/blog/ci-junk-${r}`, `/blog/category/ci-junk-${r}`, `/guides/ci-junk-${r}`, `/glossary/ci-junk-${r}`,
    `/tools/ci-junk-${r}`, `/templates/ci-junk-${r}`, `/customers/ci-junk-${r}`, `/team/ci-junk-${r}`,
    `/developers/ci-junk-${r}`, `/changelog/ci-junk-${r}`, `/ur/ci-junk-${r}`, `/CI-JUNK-${r.toUpperCase()}`,
    `/ci-junk-${r}.php`, `/wp-login.php`, `/ci_junk_${r}`, `/ci-junk-${r}/../../etc`, `/sitemaps/ci-junk-${r}.xml`,
  ];
}

async function checkJunk() {
  const results = await pool(junkPaths(), 6, async (path) => ({ path, res: await get(path) }));
  for (const { path, res } of results) {
    if (res.status === 404 || res.status === 410) continue;
    if (res.status >= 300 && res.status < 400) {
      // Normalising redirects are fine as long as they end in a 404.
      const final = await get(path, { redirect: 'follow' });
      if (final.status !== 404 && final.status !== 410) err(path, `junk URL redirects and ends in ${final.status}`);
      continue;
    }
    err(path, `junk URL answered ${res.status}${res.status === 200 ? ' (soft 404)' : ''}`);
  }
  // The 404 page itself must be noindex.
  const nf = results.find((r) => r.res.status === 404 && r.res.body.includes('<html'));
  if (nf && !robotsOf(nf.res, nf.res.body).noindex) err(nf.path, '404 page is not noindex');
}

// ── Run ──
const started = Date.now();
await checkRobots();
const fromSitemap = await sitemapPaths();
await checkLlms();

const seeds = [...keyRoutes().map((r) => r.path), ...(FIXTURES ? FIXTURE_ONLY_ROUTES : []), ...extraRoutes];
const sitemapSet = new Set(fromSitemap);
const pages = [...new Set([...fromSitemap, ...seeds])].slice(0, MAX);
await pool(pages, 6, (path) => checkPage(path, { expectIndexable: sitemapSet.has(path) }));

// Link checker: every internal link must answer 200 directly.
const skipLink = (p) => /^\/(api|_next|_vercel)\//.test(p) || /^\/_dev(\/|$)/.test(p) || /^\/cdn-cgi\//.test(p);
const linkTargets = [...internalLinks.keys()].filter((p) => !pages.includes(p) && !skipLink(p));
const linkResults = await pool(linkTargets, 6, async (path) => ({ path, res: await get(path) }));
for (const { path, res } of linkResults) {
  if (res.status !== 200) err(path, `linked from ${internalLinks.get(path)} answers ${res.status}${res.headers.get('location') ? ` → ${res.headers.get('location')}` : ''}`);
}
// Pages already crawled: a non-200 there is reported once by checkPage; note the linking page.
await checkJunk();

const summary = {
  base: BASE,
  siteUrl: SITE_URL,
  expect: EXPECT,
  pages: pages.length,
  sitemapUrls: fromSitemap.length,
  linksChecked: internalLinks.size,
  seconds: Math.round((Date.now() - started) / 100) / 10,
  errors,
  warnings,
};
if (JSON_OUT) writeFileSync(resolve(String(JSON_OUT)), JSON.stringify(summary, null, 2));

for (const w of warnings) console.log(`  warn  ${w}`);
for (const e of errors) console.log(`  ERROR ${e}`);
console.log(
  `\nseo-crawl: ${pages.length} pages (${fromSitemap.length} from sitemaps), ${internalLinks.size} internal links, 30 junk URLs; ` +
    `${errors.length} error(s), ${warnings.length} warning(s) in ${summary.seconds}s.`,
);
process.exit(errors.length ? 1 : 0);
