/**
 * Publishes every seeded entry through the admin API, so the quality gates,
 * revisions, sitemap and revalidation run exactly as they do from the admin.
 *
 *   pnpm --filter @nafaa/api seed:cms:publish                         dry run: validate and print the plan
 *   pnpm --filter @nafaa/api seed:cms:publish -- --apply              publish
 *   pnpm --filter @nafaa/api seed:cms:publish -- --apply --paths=/pricing,/industries/kiryana
 *   pnpm --filter @nafaa/api seed:cms:publish -- --apply --republish  also publish entries with unpublished changes
 *
 * Options: --api=<base>, --email=<admin>, --note=<text> (revision note).
 *
 * Skipped: entries marked `stub` in the seed (outlines), entries the API
 * says cannot publish yet (quality gates; listed with the reasons), and
 * entries that are already published with no pending changes. Entries whose
 * relations point at an unpublished entry are retried after the others, up
 * to three passes, so the order of the seed does not matter.
 */

import type { AdminEntry, AdminEntryListItem } from '../../src/admin-marketing/cms/contract/cms-contract';
import { entries } from './content';
import { connect, type CmsApi } from './lib/api';
import { apiArg, argValue, hasFlag, listArg } from './lib/cli';
import { seedPath } from './lib/paths';
import { entryKey } from './lib/validate';

interface ValidateResult {
  canPublish: boolean;
  seo: { issues?: { code: string; severity: string; message: string }[] };
}

interface Target {
  key: string;
  path: string;
  id: string;
  status: string;
}

const MAX_PASSES = 3;

async function publishOne(api: CmsApi, t: Target, note: string): Promise<{ ok: boolean; reason?: string }> {
  const v = await api.post<ValidateResult>(`/entries/${t.id}/validate`, {});
  if (!v.canPublish) {
    const blocking = (v.seo.issues ?? []).filter((i) => i.severity === 'error' || i.severity === 'blocker').map((i) => `${i.code}: ${i.message}`);
    return { ok: false, reason: blocking.join(' | ') || 'quality gate' };
  }
  const current = await api.get<AdminEntry>(`/entries/${t.id}`);
  await api.post(`/entries/${t.id}/publish`, { version: current.version, publishFaqs: true, contentUpdated: true, note });
  return { ok: true };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = hasFlag(argv, 'apply');
  const republish = hasFlag(argv, 'republish');
  const only = listArg(argv, 'paths').values;
  const note = (argValue(argv, 'note') ?? 'Seed publish').slice(0, 200);
  const apiUrl = apiArg(argv);
  const { api, as } = await connect(apiUrl, { email: argValue(argv, 'email') });
  console.log(`\nPublish seeded entries: ${apply ? 'APPLY' : 'dry run'} → ${apiUrl} as ${as}`);

  const existing = new Map<string, AdminEntryListItem>();
  for (const item of await api.listAll<AdminEntryListItem>('/entries', {})) existing.set(`${item.locale}:${item.path}`, item);

  const todo: Target[] = [];
  const skipped: string[] = [];
  const missing: string[] = [];
  let upToDate = 0;
  for (const e of entries) {
    const path = seedPath(e, entries);
    if (only.size && !only.has(path)) continue;
    const key = entryKey(e);
    if (e.stub) {
      skipped.push(`${path} (stub)`);
      continue;
    }
    const found = existing.get(`${e.locale ?? 'en'}:${path}`);
    if (!found) {
      missing.push(path);
      continue;
    }
    if (found.status === 'ARCHIVED') {
      skipped.push(`${path} (archived)`);
      continue;
    }
    if (found.status === 'PUBLISHED' && !(republish && found.hasUnpublishedChanges)) {
      upToDate++;
      continue;
    }
    todo.push({ key, path, id: found.id, status: found.status });
  }

  console.log(`Seed entries: ${entries.length}; already published: ${upToDate}; to publish: ${todo.length}; stubs or archived skipped: ${skipped.length}; not on target: ${missing.length}`);
  for (const s of skipped) console.log(`  skip     ${s}`);
  for (const m of missing) console.log(`  missing  ${m} (run seed:cms --apply first)`);

  if (!apply) {
    let ready = 0;
    for (const t of todo) {
      const v = await api.post<ValidateResult>(`/entries/${t.id}/validate`, {});
      if (v.canPublish) ready++;
      const issues = (v.seo.issues ?? []).filter((i) => i.severity !== 'info' && i.severity !== 'pass').map((i) => `${i.severity}:${i.code}`);
      console.log(`  ${v.canPublish ? 'ready  ' : 'BLOCKED'}  ${t.path}${issues.length ? `  ${issues.join(', ')}` : ''}`);
    }
    console.log(`\n${ready}/${todo.length} can publish now. Dry run only; re-run with --apply to publish.`);
    return;
  }

  let pending = todo;
  const published: string[] = [];
  const blocked = new Map<string, string>();
  for (let pass = 1; pass <= MAX_PASSES && pending.length; pass++) {
    const retry: Target[] = [];
    for (const t of pending) blocked.delete(t.path);
    for (const t of pending) {
      try {
        const r = await publishOne(api, t, note);
        if (r.ok) {
          published.push(t.path);
          console.log(`  published ${t.path}`);
        } else {
          blocked.set(t.path, r.reason ?? '');
          retry.push(t);
        }
      } catch (err) {
        blocked.set(t.path, (err as Error).message);
        retry.push(t);
      }
    }
    // Only retry when this pass made progress (a newly published entry may unblock a relation).
    if (retry.length === pending.length) break;
    pending = retry;
  }
  console.log(`\nPublished ${published.length}, blocked ${blocked.size}.`);
  for (const [path, reason] of blocked) console.log(`  BLOCKED ${path}: ${reason}`);
  if (blocked.size) process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
