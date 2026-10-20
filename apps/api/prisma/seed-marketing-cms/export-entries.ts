/**
 * Exports CMS entries that exist on the source API but not in the seed
 * content (for example the developer docs written in the admin) to
 * `content/exported/entries.json`, so the seed can recreate them elsewhere.
 * Read-only on the source.
 *
 *   pnpm --filter @nafaa/api seed:cms:export-entries                 every published entry missing from the seed
 *   pnpm --filter @nafaa/api seed:cms:export-entries -- --types=DOC  only these types
 *   pnpm --filter @nafaa/api seed:cms:export-entries -- --drafts     include drafts
 *
 * Options: --api=<base>, --email=<admin>.
 *
 * Media ids are written as `media_<key>` (run media-export first), parents
 * and relations as `<TYPE>:<slug>` refs. FAQ links are dropped (listed in
 * the entry's `dropped`). The exported file is plain data; review it in git.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { AdminEntry, AdminEntryListItem } from '../../src/admin-marketing/cms/contract/cms-contract';
import { entries as seedEntries } from './content';
import { apiArg, argValue, hasFlag, listArg } from './lib/cli';
import { connect } from './lib/api';
import { loadManifest, toMediaRefs } from './lib/media';
import { EXPORTED_ORIGIN, seedPath } from './lib/paths';
import type { EntryRef, SeedEntry } from './lib/types';

export const EXPORTED_PATH = join(__dirname, 'content', 'exported', 'entries.json');

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apiUrl = apiArg(argv);
  const types = listArg(argv, 'types').values;
  const drafts = hasFlag(argv, 'drafts');
  const { api, as } = await connect(apiUrl, { email: argValue(argv, 'email') });
  console.log(`Entry export from ${apiUrl} as ${as}`);

  const own = seedEntries.filter((e) => e.origin !== EXPORTED_ORIGIN);
  const seeded = new Set(own.map((e) => `${e.locale ?? 'en'}:${seedPath(e, own)}`));
  const keyBySourceId = new Map(loadManifest().assets.map((a) => [a.sourceId, a.key]));
  const list = await api.listAll<AdminEntryListItem>('/entries', {});
  const refs = new Map<string, EntryRef | null>();
  const refOf = async (id: string): Promise<EntryRef | null> => {
    if (!refs.has(id)) {
      const e = await api.get<{ type: string; slug: string }>(`/entries/${id}`).catch(() => null);
      refs.set(id, e ? (`${e.type}:${e.slug}` as EntryRef) : null);
    }
    return refs.get(id) ?? null;
  };

  const picked = list.filter((e) => !seeded.has(`${e.locale}:${e.path}`) && (drafts || e.status === 'PUBLISHED') && (types.size === 0 || types.has(e.type)));
  const out: SeedEntry[] = [];
  const unknownMedia: string[] = [];
  for (const item of picked) {
    const full = (await api.get<AdminEntry & { slug: string; parentId: string | null; faqIds?: string[]; relations?: { entryId: string; kind: 'TAG' | 'RELATED' }[] }>(`/entries/${item.id}`)) as AdminEntry & Record<string, unknown>;
    const dropped: string[] = [];
    const { type: _type, ...data } = (full.data ?? {}) as Record<string, unknown>;
    const parent = full.parentId ? await refOf(String(full.parentId)) : null;
    const relations: { ref: EntryRef; kind: 'TAG' | 'RELATED' }[] = [];
    for (const r of (full.relations as { entryId: string; kind: 'TAG' | 'RELATED' }[] | undefined) ?? []) {
      const ref = await refOf(r.entryId);
      if (ref) relations.push({ ref, kind: r.kind });
    }
    if (((full.faqIds as string[] | undefined) ?? []).length) dropped.push('FAQ links (re-attach in the admin).');
    for (const field of ['imageId', 'ogImageId'] as const) {
      const id = full[field] as string | null;
      if (id && !keyBySourceId.has(id)) unknownMedia.push(`${item.path} ${field}`);
    }
    const entry: SeedEntry = {
      type: full.type,
      ...(full.locale !== 'en' ? { locale: full.locale } : {}),
      slug: String(full.slug),
      title: full.title,
      ...(full.summary ? { summary: String(full.summary) } : {}),
      ...(parent ? { parent } : {}),
      data: toMediaRefs(data, keyBySourceId),
      blocks: toMediaRefs(full.blocks as SeedEntry['blocks'], keyBySourceId),
      ...(relations.length ? { relations } : {}),
      ...(full.seoTitle ? { seoTitle: String(full.seoTitle) } : {}),
      ...(full.seoDescription ? { seoDescription: String(full.seoDescription) } : {}),
      ...(full.focusKeyword ? { focusKeyword: String(full.focusKeyword) } : {}),
      ...(full.noindex ? { noindex: true } : {}),
      ...(typeof full.sortOrder === 'number' && full.sortOrder ? { sortOrder: full.sortOrder } : {}),
      ...(full.featured ? { featured: true } : {}),
      ...(full.imageId && keyBySourceId.has(String(full.imageId)) ? { imageId: `media_${keyBySourceId.get(String(full.imageId))}` } : {}),
      ...(full.ogImageId && keyBySourceId.has(String(full.ogImageId)) ? { ogImageId: `media_${keyBySourceId.get(String(full.ogImageId))}` } : {}),
      ...(item.status !== 'PUBLISHED' ? { stub: true } : {}),
      origin: EXPORTED_ORIGIN,
      evidence: [],
      factCheck: { checkedOn: new Date().toISOString().slice(0, 10), note: `Exported from ${apiUrl} (${item.status}); written and reviewed in the admin.` },
      dropped,
      needsOwner: [],
    };
    out.push(entry);
  }

  // Parents before children so the seed can resolve parentId on the same run.
  const depth = (e: SeedEntry): number => (e.parent ? 1 + depth(out.find((x) => `${x.type}:${x.slug}` === e.parent) ?? ({} as SeedEntry)) : 0);
  out.sort((a, b) => depth(a) - depth(b) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  mkdirSync(dirname(EXPORTED_PATH), { recursive: true });
  writeFileSync(EXPORTED_PATH, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Wrote ${out.length} entries to ${EXPORTED_PATH}`);
  for (const e of out) console.log(`  ${e.type} ${e.parent ? `${e.parent} > ` : ''}${e.slug || '(root)'}`);
  for (const u of unknownMedia) console.log(`  warn  ${u}: media not in the manifest (run media-export first)`);
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
