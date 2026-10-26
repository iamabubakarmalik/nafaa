/**
 * Marketing CMS seed (ARCH section 12). Order: media, settings, FAQs, entries,
 * redirects, menus.
 *
 *   pnpm --filter @nafaa/api seed:cms                      dry run (default)
 *   pnpm --filter @nafaa/api seed:cms -- --apply           write drafts
 *   pnpm --filter @nafaa/api seed:cms -- --apply --overwrite=/industries/kiryana,/blog/x
 *   pnpm --filter @nafaa/api seed:cms -- --apply --overwrite=/ur/industries/kiryana,/ur   Urdu rows: name the /ur path
 *   pnpm --filter @nafaa/api seed:cms -- --apply --overwrite-settings          every seeded setting
 *   pnpm --filter @nafaa/api seed:cms -- --apply --overwrite-settings=site,seo
 *   pnpm --filter @nafaa/api seed:cms -- --apply --overwrite-menus             every seeded menu (was push-menus.ts)
 *   pnpm --filter @nafaa/api seed:cms -- --apply --only=media                  media import only
 *   pnpm --filter @nafaa/api seed:cms -- --report          also print the drop and needs-owner report
 *
 * Options:
 *   --api=<base>     default CMS_API_URL or http://localhost:4000/api
 *   --email=<admin>  log in as this admin; the password is prompted (see lib/api.ts)
 *   --only=<steps>   comma list of media,settings,faqs,entries,redirects,menus
 *
 * Media: content refers to screenshots as `media_<key>` (lib/media.ts). The
 * media step finds or uploads every asset of media/manifest.json on the
 * target and the runner swaps the keys for the target's ids before writing.
 *
 * Rules:
 * - Writes go through the admin CMS API only, never to the database.
 * - Entries are created as DRAFT and never published; publishing goes through
 *   the admin so the quality gates and revalidation run.
 * - Idempotent: media by `seed:<key>` tag or checksum, entries by
 *   (locale, path), FAQs by (locale, question), settings and menus by key.
 *   Anything that already exists is left alone unless an --overwrite flag
 *   names it. --overwrite takes site paths: `/x` is the English row,
 *   `/ur/x` (or `/ur` for the home page) the Urdu one.
 * - Translations: a non-English entry whose English twin (same type and
 *   slug) has an id is created through POST /entries/:id/translations, so the
 *   API links both under one translationKey (hreflang, sitemap alternates);
 *   the fill pass then writes the translated content.
 * - Prod needs the owner's go-ahead (deploy checklist).
 */

import type { AdminEntry, AdminEntryListItem, AdminFaq, SettingKey } from '../../src/admin-marketing/cms/contract/cms-contract';
import { droppedItems, entries, faqs, menus, redirects, redirectsNeedingOwner, settings } from './content';
import { ApiError, type CmsApi, connect } from './lib/api';
import { apiArg, argValue, listArg } from './lib/cli';
import { collectMediaRefs, loadManifest, resolveMediaRefs, syncMedia } from './lib/media';
import { seedPath } from './lib/paths';
import type { SeedEntry } from './lib/types';
import { entryKey, validateContent } from './lib/validate';

const STEPS = ['media', 'settings', 'faqs', 'entries', 'redirects', 'menus'] as const;
type Step = (typeof STEPS)[number];

interface Args {
  apply: boolean;
  report: boolean;
  overwrite: Set<string>;
  overwriteSettings: { all: boolean; values: Set<string> };
  overwriteMenus: { all: boolean; values: Set<string> };
  only: Set<Step>;
  api: string;
  email: string | undefined;
}

function parseArgs(argv: string[]): Args {
  const only = listArg(argv, 'only').values;
  for (const s of only) if (!(STEPS as readonly string[]).includes(s)) throw new Error(`--only: unknown step "${s}" (use ${STEPS.join(', ')})`);
  return {
    apply: argv.includes('--apply'),
    report: argv.includes('--report'),
    overwrite: listArg(argv, 'overwrite').values,
    overwriteSettings: listArg(argv, 'overwrite-settings'),
    overwriteMenus: listArg(argv, 'overwrite-menus'),
    only: only.size ? (only as Set<Step>) : new Set(STEPS),
    api: apiArg(argv),
    email: argValue(argv, 'email'),
  };
}

const pathOf = (e: SeedEntry): string => seedPath(e, entries);

/** Site path for --overwrite and the plan listing: the CMS path, with the locale prefix for non-English rows. */
const sitePathOf = (e: SeedEntry, path: string): string => {
  const locale = e.locale ?? 'en';
  if (locale === 'en') return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
};

/** Seed key of the English entry a translation belongs to (`INDUSTRY:kiryana` for `INDUSTRY:kiryana@ur`). */
const twinKeyOf = (e: SeedEntry): string | null => ((e.locale ?? 'en') === 'en' ? null : entryKey({ type: e.type, slug: e.slug, parent: e.parent }));

/**
 * CITY_INDUSTRY data names its industry by id. The seed names it as the
 * entry's first INDUSTRY relation; the id is filled in once that entry exists.
 */
const withIndustryId = (e: SeedEntry, data: Record<string, unknown>, ids: Map<string, string>): Record<string, unknown> => {
  if (e.type !== 'CITY_INDUSTRY' || data.industryId) return data;
  const ref = (e.relations ?? []).find((r) => r.ref.startsWith('INDUSTRY:'))?.ref;
  const id = ref ? ids.get(ref) : undefined;
  return id ? { ...data, industryId: id } : data;
};

const SETTING_BUNDLE_KEY: Record<SettingKey, string> = {
  site: 'site', entity: 'entity', pricing: 'pricing', seo: 'seo', analytics: 'analytics', 'industry-groups': 'industryGroups',
};

type Action = 'create' | 'update' | 'skip';
interface Planned { key: string; path: string; action: Action; reason: string; id?: string; entry: SeedEntry }

function faqLookupKey(locale: string, question: string): string {
  return `${locale}:${question.trim().toLowerCase()}`;
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const content = { entries, faqs, settings, menus, redirects };

  // 1. Offline validation.
  const v = validateContent(content);
  const manifest = loadManifest();
  const manifestKeys = new Set(manifest.assets.map((a) => a.key));
  const refs = collectMediaRefs([entries, settings]);
  for (const k of refs) if (!manifestKeys.has(k)) v.errors.push(`media_${k}: not in media/manifest.json (run media-export)`);
  const runs = (step: Step): boolean => args.only.has(step);
  console.log(`\nMarketing CMS seed: ${args.apply ? 'APPLY (drafts only)' : 'dry run'} → ${args.api}${args.only.size < STEPS.length ? ` (only ${[...args.only].join(', ')})` : ''}`);
  console.log(`Media: ${manifest.assets.length} assets in the manifest, ${refs.size} referenced by content`);
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
    const conn = await connect(args.api, { email: args.email });
    api = conn.api;
    await api.get('/config');
    console.log(`API: connected as ${conn.as}`);
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
      // Every locale: Urdu rows from an earlier run must be found too.
      for (const item of await api.listAll<AdminEntryListItem>('/entries')) existingByPath.set(`${item.locale}:${item.path}`, item);
      for (const f of await api.listAll<AdminFaq>('/faqs')) existingFaqs.set(faqLookupKey(f.locale, f.question), f);
      bundle = await api.get<Record<string, unknown>>('/settings');
      // GET /menus lists every key, saved or not; a never-saved menu has no updatedAt.
      for (const m of await api.get<{ key: string; locale: string; updatedAt?: string | null }[]>('/menus')) {
        if (m.updatedAt) existingMenus.add(`${m.locale}:${m.key}`);
      }
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
    if (!found) return { key: entryKey(e), path, action: 'create', reason: twinKeyOf(e) ? 'new translation' : 'new', entry: e };
    if (args.overwrite.has(sitePathOf(e, path))) return { key: entryKey(e), path, action: 'update', reason: '--overwrite', id: found.id, entry: e };
    return { key: entryKey(e), path, action: 'skip', reason: `exists (${found.status})`, id: found.id, entry: e };
  });
  const faqPlan = faqs.map((f) => {
    const found = existingFaqs.get(faqLookupKey(f.locale ?? 'en', f.question));
    return { faq: f, action: (found ? 'skip' : 'create') as Action, id: found?.id };
  });
  const overwritesSetting = (key: string): boolean => args.overwriteSettings.all || args.overwriteSettings.values.has(key);
  const overwritesMenu = (key: string): boolean => args.overwriteMenus.all || args.overwriteMenus.values.has(key);
  const settingPlan = settings.map((s) => {
    const exists = Boolean(bundle[SETTING_BUNDLE_KEY[s.key]]);
    const action: Action = v.blockedSettings.has(s.key) ? 'skip' : !exists ? 'create' : overwritesSetting(s.key) ? 'update' : 'skip';
    return { s, action };
  });
  const menuPlan = menus.map((m) => {
    const exists = existingMenus.has(`en:${m.key}`);
    const action: Action = !exists ? 'create' : overwritesMenu(m.key) ? 'update' : 'skip';
    return { m, action };
  });

  // Media: find or (on --apply) upload every manifest asset on the target.
  let mediaIds = new Map<string, string>();
  if (api && runs('media')) {
    const sync = await syncMedia(api, manifest, { apply: args.apply, log: (l) => console.log(l) });
    mediaIds = sync.ids;
    console.log(`\nMedia on target: ${sync.matched.length} found by key, ${sync.tagged.length} found by checksum${args.apply ? ' (tagged)' : ''}, ${sync.uploaded.length} uploaded, ${args.apply ? `${sync.failed.length} failed` : `${sync.pending.length} to upload`}`);
    if (args.apply && sync.failed.length) {
      console.log('Media import failed; nothing else was written.');
      process.exitCode = 1;
      return;
    }
  } else if (api && (runs('entries') || runs('settings'))) {
    // Entries still need ids: read the mapping without uploading.
    mediaIds = (await syncMedia(api, manifest, { apply: false })).ids;
  }

  const count = (list: { action: Action }[], a: Action): number => list.filter((x) => x.action === a).length;
  console.log('\nPlan');
  const off = (step: Step): string => (runs(step) ? '' : ' (step not selected)');
  console.log(`  settings  create ${count(settingPlan, 'create')}, update ${count(settingPlan, 'update')}, skip ${count(settingPlan, 'skip')}${off('settings')}`);
  console.log(`  faqs      create ${count(faqPlan, 'create')}, skip ${count(faqPlan, 'skip')}${off('faqs')}`);
  console.log(`  entries   create ${count(plan, 'create')}, update ${count(plan, 'update')}, skip ${count(plan, 'skip')}${off('entries')}`);
  console.log(`  menus     create ${count(menuPlan, 'create')}, update ${count(menuPlan, 'update')}, skip ${count(menuPlan, 'skip')}${off('menus')}`);
  console.log(`  redirects import ${redirects.length} (the API skips or updates existing rules)${off('redirects')}`);
  if (runs('entries')) for (const p of plan) console.log(`    ${pad(p.action, 6)} ${pad(p.entry.type, 14)} ${pad(sitePathOf(p.entry, p.path), 48)} ${p.reason}`);
  const unresolved = new Set<string>();
  if (api) resolveMediaRefs(plan.filter((p) => p.action !== 'skip').map((p) => p.entry), mediaIds, unresolved);
  if (unresolved.size) console.log(`  media refs not on the target yet: ${[...unresolved].join(', ')}${args.apply ? '' : ' (uploaded on --apply)'}`);

  if (args.report) printReport();

  if (!args.apply) {
    if (api && runs('redirects')) {
      const res = await api.post<unknown>('/redirects/import', { rows: redirects.map(toImportRow), dryRun: true }).catch((e: Error) => e.message);
      console.log(`\nRedirect import (dry run): ${JSON.stringify(res)}`);
    }
    console.log('\nDry run only. Re-run with --apply to write drafts.');
    return;
  }
  if (!api) return;
  if (unresolved.size && (runs('entries') || runs('settings'))) {
    console.log(`\nMedia missing on the target (${[...unresolved].join(', ')}). Run with the media step first. Nothing else was written.`);
    process.exitCode = 1;
    return;
  }
  const failed: string[] = [];
  await applySteps(api, args, { settingPlan, faqPlan, plan, menuPlan, mediaIds, failed });
  if (failed.length) process.exitCode = 1;
  console.log('\nDone. Entries are DRAFT; publish with seed:cms:publish or in Admin → Marketing → Website.');
}

interface ApplyPlan {
  settingPlan: { s: (typeof settings)[number]; action: Action }[];
  faqPlan: { faq: (typeof faqs)[number]; action: Action; id: string | undefined }[];
  plan: Planned[];
  menuPlan: { m: (typeof menus)[number]; action: Action }[];
  mediaIds: Map<string, string>;
  failed: string[];
}

async function applySteps(api: CmsApi, args: Args, ctx: ApplyPlan): Promise<void> {
  const { settingPlan, faqPlan, plan, menuPlan, mediaIds, failed } = ctx;
  const runs = (step: Step): boolean => args.only.has(step);
  const count = (list: { action: Action }[], a: Action): number => list.filter((x) => x.action === a).length;

  // 5. Apply. Settings first (entries need industry groups and entity facts).
  for (const { s, action } of runs('settings') ? settingPlan : []) {
    if (action === 'skip') continue;
    await api.put(`/settings/${s.key}`, { value: resolveMediaRefs(s.value, mediaIds) });
    console.log(`  setting ${s.key}: ${action === 'create' ? 'created' : 'overwritten'}`);
  }
  if (!runs('faqs') && !runs('entries') && !runs('redirects') && !runs('menus')) return;

  const faqIds = new Map<string, string>();
  for (const { faq, action, id } of faqPlan) {
    if (action === 'skip' && id) {
      faqIds.set(faq.key, id);
      continue;
    }
    if (!runs('faqs')) continue;
    const created = await api.post<AdminFaq>('/faqs', { locale: faq.locale ?? 'en', topic: faq.topic, question: faq.question, answer: faq.answer, sourceNote: faq.sourceNote });
    faqIds.set(faq.key, created.id);
  }
  console.log(`  faqs: ${faqIds.size} ready`);

  // Entries in two passes: create every new row first so relations can point at ids.
  const ids = new Map<string, string>();
  for (const p of plan) if (p.id) ids.set(p.key, p.id);
  const toWrite = runs('entries') ? plan : [];
  for (const p of toWrite.filter((x) => x.action === 'create')) {
    const e = p.entry;
    const parentId = e.parent ? ids.get(e.parent) : undefined;
    if (e.parent && !parentId) {
      failed.push(`${p.key}: parent ${e.parent} has no id`);
      continue;
    }
    const twinKey = twinKeyOf(e);
    const twinId = twinKey ? ids.get(twinKey) : undefined;
    // A translation of a seeded English entry starts as the API's copy of it (same slug,
    // shared translationKey); the fill pass below replaces its content.
    const created = twinId
      ? await api.post<AdminEntry>(`/entries/${twinId}/translations`, { locale: e.locale })
      : await api.post<AdminEntry>('/entries', {
          type: e.type,
          locale: e.locale ?? 'en',
          title: e.title,
          slug: e.slug,
          ...(parentId ? { parentId } : {}),
          data: resolveMediaRefs({ type: e.type, ...e.data }, mediaIds),
        });
    if (twinKey && !twinId) console.log(`  warn  ${p.key}: no English twin ${twinKey} on the target; created unlinked`);
    p.id = created.id;
    ids.set(p.key, created.id);
    if (created.path !== p.path) console.log(`  warn  ${p.key}: API path ${created.path} differs from expected ${p.path}`);
  }

  let written = 0;
  for (const p of toWrite.filter((x) => x.action !== 'skip' && x.id)) {
    const e = p.entry;
    try {
      const current = await api.get<AdminEntry>(`/entries/${p.id}`);
      const body = {
        version: current.version,
        title: e.title,
        // Translations are created from the English row; keep the seed's slug.
        ...(twinKeyOf(e) ? { slug: e.slug } : {}),
        summary: e.summary ?? null,
        ...(e.blocks ? { blocks: resolveMediaRefs(e.blocks, mediaIds) } : {}),
        data: withIndustryId(e, resolveMediaRefs({ type: e.type, ...e.data }, mediaIds), ids),
        ...(e.imageId ? { imageId: resolveMediaRefs(e.imageId, mediaIds) } : {}),
        ...(e.ogImageId ? { ogImageId: resolveMediaRefs(e.ogImageId, mediaIds) } : {}),
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
  if (runs('entries')) console.log(`  entries: ${count(plan, 'create')} created, ${written} filled, ${failed.length} failed`);
  for (const f of failed) console.log(`  ERROR ${f}`);

  if (runs('redirects')) {
    const imported = await api.post<unknown>('/redirects/import', { rows: redirects.map(toImportRow) });
    console.log(`  redirects: ${JSON.stringify(imported)}`);
  }

  for (const { m, action } of runs('menus') ? menuPlan : []) {
    if (action === 'skip') continue;
    await api.put(`/menus/${m.key}`, { locale: 'en', title: m.title, items: m.items });
    console.log(`  menu ${m.key}: ${action === 'create' ? 'created' : 'overwritten'}`);
  }
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
