/**
 * Marketing CMS seed (ARCH section 12).
 *
 *   pnpm --filter @nafaa/api seed:cms                      dry run (default)
 *   pnpm --filter @nafaa/api seed:cms -- --apply           write drafts
 *   pnpm --filter @nafaa/api seed:cms -- --apply --overwrite=/industries/kiryana,/blog/x
 *   pnpm --filter @nafaa/api seed:cms -- --report          also print the drop and needs-owner report
 *
 * Options: --api=<base> (default CMS_API_URL or http://localhost:4000/api).
 *
 * Rules:
 * - Writes go through the admin CMS API only, never to the database.
 * - Entries are created as DRAFT and never published; publishing goes through
 *   the admin so the quality gates and revalidation run.
 * - Idempotent: entries are matched by (locale, path), FAQs by question,
 *   settings and menus by key. Anything that already exists is left alone
 *   unless its path is passed to --overwrite (entries only).
 * - Prod needs the owner's go-ahead (deploy checklist).
 */

import { ENTRY_TYPE_META } from '../../src/admin-marketing/cms/contract/cms-contract';
import type { AdminEntry, AdminEntryListItem, AdminFaq, SettingKey } from '../../src/admin-marketing/cms/contract/cms-contract';
import { droppedItems, entries, faqs, menus, redirects, redirectsNeedingOwner, settings } from './content';
import { ApiError, CmsApi, resolveToken } from './lib/api';
import type { SeedEntry } from './lib/types';
import { entryKey, validateContent } from './lib/validate';

interface Args {
  apply: boolean;
  report: boolean;
  overwrite: Set<string>;
  api: string;
}

function parseArgs(argv: string[]): Args {
  const get = (name: string): string | undefined => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  return {
    apply: argv.includes('--apply'),
    report: argv.includes('--report'),
    overwrite: new Set((get('overwrite') ?? '').split(',').map((s) => s.trim()).filter(Boolean)),
    api: (get('api') ?? process.env.CMS_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, ''),
  };
}

function pathOf(e: SeedEntry): string {
  const prefix = ENTRY_TYPE_META[e.type].prefix;
  if (!prefix) throw new Error(`${entryKey(e)}: the seed only handles types with a fixed prefix`);
  return `/${prefix}/${e.slug}`;
}

const SETTING_BUNDLE_KEY: Record<SettingKey, string> = {
  site: 'site', entity: 'entity', pricing: 'pricing', seo: 'seo', analytics: 'analytics', 'industry-groups': 'industryGroups',
};

type Action = 'create' | 'update' | 'skip';
interface Planned { key: string; path: string; action: Action; reason: string; id?: string; entry: SeedEntry }

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const content = { entries, faqs, settings, menus, redirects };

  // 1. Offline validation.
  const v = validateContent(content);
  console.log(`\nMarketing CMS seed: ${args.apply ? 'APPLY (drafts only)' : 'dry run'} → ${args.api}`);
  console.log(`Content: ${entries.length} entries, ${faqs.length} FAQs, ${settings.length} settings, ${menus.length} menus, ${redirects.length} redirects`);
  for (const w of v.warnings) console.log(`  warn  ${w}`);
  if (v.errors.length) {
    for (const e of v.errors) console.log(`  ERROR ${e}`);
    console.log(`\n${v.errors.length} error(s). Nothing was sent.`);
    process.exitCode = 1;
    return;
  }
  console.log(`Validation: 0 errors, ${v.warnings.length} warnings, ${v.publishGaps.size} entries still missing publish data (fine for drafts).`);

  // 2. Connect. A dry run without a reachable API still prints the plan.
  let api: CmsApi | null = null;
  try {
    const auth = await resolveToken(args.api);
    api = new CmsApi(args.api, auth.token);
    await api.get('/config');
    console.log(`API: connected as ${auth.as}`);
  } catch (err) {
    const msg = err instanceof ApiError ? `${err.status} on ${err.route}` : (err as Error).message;
    if (args.apply) {
      console.log(`\nAPI not usable (${msg}). Nothing was written.`);
      process.exitCode = 1;
      return;
    }
    console.log(`API: not reachable (${msg}); showing the plan against an empty CMS.`);
    api = null;
  }

  // 3. Read what exists.
  const existingByPath = new Map<string, AdminEntryListItem>();
  const existingFaqs = new Map<string, AdminFaq>();
  let bundle: Record<string, unknown> = {};
  const existingMenus = new Set<string>();
  if (api) {
    try {
      for (const item of await api.listAll<AdminEntryListItem>('/entries', { locale: 'en' })) existingByPath.set(`${item.locale}:${item.path}`, item);
      for (const f of await api.listAll<AdminFaq>('/faqs', { locale: 'en' })) existingFaqs.set(f.question.trim().toLowerCase(), f);
      bundle = await api.get<Record<string, unknown>>('/settings');
      for (const m of await api.get<{ key: string; locale: string }[]>('/menus')) existingMenus.add(`${m.locale}:${m.key}`);
    } catch (err) {
      const msg = err instanceof ApiError ? `${err.status} on ${err.route}` : (err as Error).message;
      if (args.apply) {
        console.log(`\nCould not read the current CMS state (${msg}). Nothing was written.`);
        process.exitCode = 1;
        return;
      }
      console.log(`API: could not read the current state (${msg}); showing the plan against an empty CMS.`);
      api = null;
    }
  }

  // 4. Plan.
  const plan: Planned[] = entries.map((e) => {
    const path = pathOf(e);
    const found = existingByPath.get(`${e.locale ?? 'en'}:${path}`);
    if (!found) return { key: entryKey(e), path, action: 'create', reason: 'new', entry: e };
    if (args.overwrite.has(path)) return { key: entryKey(e), path, action: 'update', reason: '--overwrite', id: found.id, entry: e };
    return { key: entryKey(e), path, action: 'skip', reason: `exists (${found.status})`, id: found.id, entry: e };
  });
  const faqPlan = faqs.map((f) => {
    const found = existingFaqs.get(f.question.trim().toLowerCase());
    return { faq: f, action: (found ? 'skip' : 'create') as Action, id: found?.id };
  });
  const settingPlan = settings.map((s) => ({ s, action: (bundle[SETTING_BUNDLE_KEY[s.key]] || v.blockedSettings.has(s.key) ? 'skip' : 'create') as Action }));
  const menuPlan = menus.map((m) => ({ m, action: (existingMenus.has(`en:${m.key}`) ? 'skip' : 'create') as Action }));

  const count = (list: { action: Action }[], a: Action): number => list.filter((x) => x.action === a).length;
  console.log('\nPlan');
  console.log(`  settings  create ${count(settingPlan, 'create')}, skip ${count(settingPlan, 'skip')}`);
  console.log(`  faqs      create ${count(faqPlan, 'create')}, skip ${count(faqPlan, 'skip')}`);
  console.log(`  entries   create ${count(plan, 'create')}, update ${count(plan, 'update')}, skip ${count(plan, 'skip')}`);
  console.log(`  menus     create ${count(menuPlan, 'create')}, skip ${count(menuPlan, 'skip')}`);
  console.log(`  redirects import ${redirects.length} (the API skips or updates existing rules)`);
  for (const p of plan) console.log(`    ${pad(p.action, 6)} ${pad(p.entry.type, 14)} ${pad(p.path, 48)} ${p.reason}`);

  if (args.report) printReport();

  if (!args.apply) {
    if (api) {
      const res = await api.post<unknown>('/redirects/import', { rows: redirects.map(toImportRow), dryRun: true }).catch((e: Error) => e.message);
      console.log(`\nRedirect import (dry run): ${JSON.stringify(res)}`);
    }
    console.log('\nDry run only. Re-run with --apply to write drafts.');
    return;
  }
  if (!api) return;

  // 5. Apply. Settings first (entries need industry groups and entity facts).
  for (const { s, action } of settingPlan) {
    if (action !== 'create' || v.blockedSettings.has(s.key)) continue;
    await api.put(`/settings/${s.key}`, { value: s.value });
    console.log(`  setting ${s.key}: created`);
  }

  const faqIds = new Map<string, string>();
  for (const { faq, action, id } of faqPlan) {
    if (action === 'skip' && id) {
      faqIds.set(faq.key, id);
      continue;
    }
    const created = await api.post<AdminFaq>('/faqs', { locale: faq.locale ?? 'en', topic: faq.topic, question: faq.question, answer: faq.answer, sourceNote: faq.sourceNote });
    faqIds.set(faq.key, created.id);
  }
  console.log(`  faqs: ${faqIds.size} ready`);

  // Entries in two passes: create every new row first so relations can point at ids.
  const ids = new Map<string, string>();
  for (const p of plan) if (p.id) ids.set(p.key, p.id);
  for (const p of plan.filter((x) => x.action === 'create')) {
    const e = p.entry;
    const created = await api.post<AdminEntry>('/entries', { type: e.type, locale: e.locale ?? 'en', title: e.title, slug: e.slug, data: { type: e.type, ...e.data } });
    p.id = created.id;
    ids.set(p.key, created.id);
    if (created.path !== p.path) console.log(`  warn  ${p.key}: API path ${created.path} differs from expected ${p.path}`);
  }

  let written = 0;
  const failed: string[] = [];
  for (const p of plan.filter((x) => x.action !== 'skip')) {
    const e = p.entry;
    try {
      const current = await api.get<AdminEntry>(`/entries/${p.id}`);
      const body = {
        version: current.version,
        title: e.title,
        summary: e.summary ?? null,
        ...(e.blocks ? { blocks: e.blocks } : {}),
        data: { type: e.type, ...e.data },
        relations: (e.relations ?? []).map((r, i) => ({ entryId: ids.get(r.ref)!, kind: r.kind, sortOrder: i })).filter((r) => r.entryId),
        faqIds: (e.faqKeys ?? []).map((k) => faqIds.get(k)!).filter(Boolean),
        ...(e.seoTitle ? { seoTitle: e.seoTitle } : {}),
        ...(e.seoDescription ? { seoDescription: e.seoDescription } : {}),
        ...(e.focusKeyword ? { focusKeyword: e.focusKeyword } : {}),
        noindex: e.noindex ?? false,
        sortOrder: e.sortOrder ?? 0,
        featured: e.featured ?? false,
      };
      await api.patch(`/entries/${p.id}`, body);
      written++;
    } catch (err) {
      failed.push(`${p.key}: ${(err as Error).message}`);
    }
  }
  console.log(`  entries: ${count(plan, 'create')} created, ${written} filled, ${failed.length} failed`);
  for (const f of failed) console.log(`  ERROR ${f}`);

  const imported = await api.post<unknown>('/redirects/import', { rows: redirects.map(toImportRow) });
  console.log(`  redirects: ${JSON.stringify(imported)}`);

  for (const { m, action } of menuPlan) {
    if (action !== 'create') continue;
    await api.put(`/menus/${m.key}`, { locale: 'en', title: m.title, items: m.items });
    console.log(`  menu ${m.key}: created`);
  }

  if (failed.length) process.exitCode = 1;
  console.log('\nDone. Everything is DRAFT; review and publish in Admin → Marketing → Website.');
}

function toImportRow(r: { from: string; to?: string | undefined; status: number; note: string }): Record<string, unknown> {
  return { from: r.from, ...(r.to ? { to: r.to } : {}), status: r.status, note: r.note };
}

function printReport(): void {
  console.log('\nDropped from apps/marketing (whole items)');
  for (const d of droppedItems) console.log(`  - ${d.what} [${d.origin}]: ${d.why}`);
  console.log('\nDropped inside imported entries');
  for (const e of entries) for (const d of e.dropped) console.log(`  - ${entryKey(e)}: ${d}`);
  console.log('\nNeeds owner');
  for (const s of settings) for (const n of s.needsOwner) console.log(`  - setting ${s.key}: ${n}`);
  for (const e of entries) for (const n of e.needsOwner) console.log(`  - ${entryKey(e)}: ${n}`);
  for (const n of redirectsNeedingOwner) console.log(`  - redirect: ${n}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
