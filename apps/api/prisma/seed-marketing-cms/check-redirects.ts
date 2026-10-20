/**
 * Redirect coverage: does every URL of the old site still lead somewhere good?
 * Read-only everywhere (public endpoints and plain GETs).
 *
 *   pnpm --filter @nafaa/api seed:cms:check-redirects
 *   pnpm --filter @nafaa/api seed:cms:check-redirects -- --sitemap=https://nafaa.pk/sitemap.xml --probe=http://localhost:3200
 *
 * Options:
 *   --sitemap=<url|file>  old sitemap or sitemap index (default https://nafaa.pk/sitemap.xml)
 *   --api=<base>          API whose published paths count as live (default CMS_API_URL or local)
 *   --probe=<site>        also GET each old path on this site (no redirect follow) and check the answer
 *   --sample=<n>          probe only every n-th path (default 1 = all)
 *   --verbose             print every URL, not only the unresolved ones
 *
 * An old path is resolved when it is a published path on the API, or the seed
 * redirects send it (after following chains) to a published path. Paths
 * served by code routes (feeds, llms.txt, robots) are listed in CODE_ROUTES.
 */

import { readFileSync, existsSync } from 'node:fs';
import { redirects } from './content';
import { apiArg, argValue, hasFlag } from './lib/cli';

/** Routes the site serves from code, not from CMS entries. */
const CODE_ROUTES = new Set(['/llms.txt', '/llms-full.txt', '/robots.txt', '/sitemap.xml', '/blog/feed.xml', '/compare']);

interface Rule {
  from: string;
  to?: string | undefined;
  status: number;
  re: RegExp;
  names: string[];
}

function compile(from: string): { re: RegExp; names: string[] } {
  const names: string[] = [];
  const wildcard = from.endsWith('*');
  const base = wildcard ? from.slice(0, -1) : from;
  const body = base
    .split('/')
    .map((seg) => {
      if (seg.startsWith(':')) {
        names.push(seg.slice(1));
        return '([^/]+)';
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { re: new RegExp(`^${body}${wildcard ? '(.*)' : ''}$`), names };
}

function apply(rule: Rule, path: string): string | null {
  const m = rule.re.exec(path);
  if (!m) return null;
  if (!rule.to) return '';
  let to = rule.to;
  rule.names.forEach((n, i) => (to = to.replace(`:${n}`, m[i + 1] ?? '')));
  return to;
}

async function readSitemap(source: string, seen = new Set<string>()): Promise<string[]> {
  if (seen.has(source)) return [];
  seen.add(source);
  const xml = existsSync(source) ? readFileSync(source, 'utf8') : await (await fetch(source)).text();
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1] ?? '');
  if (/<sitemapindex/.test(xml)) {
    const out: string[] = [];
    for (const child of locs) out.push(...(await readSitemap(child, seen)));
    return out;
  }
  return locs;
}

function toPath(url: string): string {
  try {
    const p = new URL(url).pathname.replace(/\/+$/, '');
    return p || '/';
  } catch {
    return url;
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const sitemap = argValue(argv, 'sitemap') ?? 'https://nafaa.pk/sitemap.xml';
  const apiUrl = apiArg(argv);
  const probe = argValue(argv, 'probe')?.replace(/\/$/, '');
  const sample = Math.max(1, Number(argValue(argv, 'sample') ?? 1));
  const verbose = hasFlag(argv, 'verbose');

  const oldPaths = [...new Set((await readSitemap(sitemap)).map(toPath))].sort();
  const res = await fetch(`${apiUrl}/public/site/paths`);
  const body = (await res.json()) as { data?: { items: { path: string; locale: string }[] }; items?: { path: string; locale: string }[] };
  const live = new Set([...(body.data?.items ?? body.items ?? []).map((i) => i.path), ...CODE_ROUTES]);

  const rules: Rule[] = redirects.map((r) => ({ ...r, ...compile(r.from) }));
  // Exact rules first, then patterns, as the site does.
  rules.sort((a, b) => Number(a.names.length > 0 || a.from.endsWith('*')) - Number(b.names.length > 0 || b.from.endsWith('*')));

  const follow = (path: string): { final: string; hops: string[]; gone: boolean } => {
    const hops: string[] = [];
    let cur = path;
    for (let i = 0; i < 5; i++) {
      if (live.has(cur) && i > 0) break;
      const rule = rules.find((r) => apply(r, cur) !== null);
      if (!rule) break;
      const next = apply(rule, cur) ?? '';
      if (rule.status === 410 || next === '') return { final: cur, hops, gone: true };
      hops.push(`${rule.status} ${next}`);
      cur = next;
    }
    return { final: cur, hops, gone: false };
  };

  const rows: { path: string; how: string; ok: boolean }[] = [];
  for (const path of oldPaths) {
    if (live.has(path)) {
      rows.push({ path, how: 'live', ok: true });
      continue;
    }
    const { final, hops, gone } = follow(path);
    if (gone) rows.push({ path, how: '410 gone (intended)', ok: true });
    else if (!hops.length) rows.push({ path, how: 'NO RULE', ok: false });
    else if (live.has(final)) rows.push({ path, how: `→ ${final}${hops.length > 1 ? ` (${hops.length} hops)` : ''}`, ok: true });
    else rows.push({ path, how: `→ ${final} (TARGET NOT LIVE)`, ok: false });
  }

  const ok = rows.filter((r) => r.ok).length;
  const liveCount = rows.filter((r) => r.how === 'live').length;
  console.log(`\nOld URLs: ${oldPaths.length} from ${sitemap}`);
  console.log(`Live on the new site: ${liveCount}; redirected to a live page: ${ok - liveCount}; unresolved: ${rows.length - ok}`);
  console.log(`Coverage: ${ok} of ${rows.length} resolved\n`);
  for (const r of rows) if (verbose || !r.ok) console.log(`  ${r.ok ? 'ok ' : 'BAD'} ${r.path.padEnd(52)} ${r.how}`);

  if (probe) {
    const picked = oldPaths.filter((_, i) => i % sample === 0);
    let good = 0;
    const bad: string[] = [];
    for (const path of picked) {
      const expect = rows.find((r) => r.path === path);
      try {
        const r = await fetch(`${probe}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(60_000) });
        await r.text().catch(() => '');
        const loc = r.headers.get('location');
        const target = loc ? toPath(new URL(loc, probe).toString()) : null;
        const fine = r.status === 200 || ((r.status === 301 || r.status === 308 || r.status === 307 || r.status === 302) && target !== null);
        if (fine) good++;
        else bad.push(`${r.status} ${path}${expect ? ` (expected ${expect.how})` : ''}`);
        if (verbose) console.log(`  probe ${r.status} ${path}${target ? ` → ${target}` : ''}`);
      } catch (err) {
        bad.push(`ERR ${path}: ${(err as Error).message}`);
      }
    }
    console.log(`\nProbe ${probe}: ${good}/${picked.length} answered 200 or a redirect`);
    for (const b of bad) console.log(`  BAD ${b}`);
  }
  if (rows.some((r) => !r.ok)) process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
