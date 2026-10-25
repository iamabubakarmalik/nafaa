/**
 * Portable media for the marketing CMS seed.
 *
 * Seed content never holds raw media ids, because ids differ per database.
 * It holds a stable reference `media_<key>` (for example `media_retail-pos`),
 * where the key comes from `media/manifest.json`. The manifest is written by
 * `media-export.ts` from a source API (normally local) and lists each asset's
 * public file URL, checksum, alt text and tags.
 *
 * Before entries are written, `syncMedia` makes sure every manifest asset
 * exists on the target API and returns key → target id:
 *   1. an item tagged `seed:<key>` on the target is that asset;
 *   2. else an item with the same SHA-1 checksum is that asset (it gets the tag);
 *   3. else the file is downloaded from the manifest URL and uploaded through
 *      POST /admin/marketing/cms/media (a 409 duplicate counts as found).
 * Running it again finds everything by tag, so it is idempotent.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { AdminMedia } from '../../../src/admin-marketing/cms/contract/cms-contract';
import { ApiError, type CmsApi } from './api';

export const MANIFEST_PATH = join(__dirname, '..', 'media', 'manifest.json');

/** Tag that marks a library item as a seed asset. */
export const KEY_TAG_PREFIX = 'seed:';
/** A seed media reference. Fits the contract's id pattern, and real ids (cuids) never contain `_`. */
export const MEDIA_REF_PATTERN = /^media_([a-z0-9][a-z0-9-]{0,56})$/;
export const KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,56}$/;

export function mediaRef(key: string): string {
  if (!KEY_PATTERN.test(key)) throw new Error(`Bad media key "${key}"`);
  return `media_${key}`;
}

export interface MediaAsset {
  key: string;
  /** Id in the source library (used to translate exported entries). */
  sourceId: string;
  url: string;
  fileName: string;
  mimeType: string;
  bytes: number;
  width: number | null;
  height: number | null;
  checksum: string | null;
  kind: string;
  alt: string;
  altTranslations: Record<string, string> | null;
  caption: string | null;
  credit: string | null;
  sourceUrl: string | null;
  focalX: number | null;
  focalY: number | null;
  /** Tags without the seed key tag. */
  tags: string[];
  folder: string | null;
}

export interface MediaManifest {
  version: 1;
  exportedAt: string;
  /** API the manifest was exported from. */
  source: string;
  assets: MediaAsset[];
}

export function loadManifest(): MediaManifest {
  if (!existsSync(MANIFEST_PATH)) return { version: 1, exportedAt: '', source: '', assets: [] };
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as MediaManifest;
}

/** Every `media_<key>` reference inside a value. */
export function collectMediaRefs(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    const m = MEDIA_REF_PATTERN.exec(value);
    if (m?.[1]) out.add(m[1]);
  } else if (Array.isArray(value)) {
    for (const v of value) collectMediaRefs(v, out);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectMediaRefs(v, out);
  }
  return out;
}

/** A copy of `value` with every `media_<key>` replaced by the target id. Unknown keys go to `missing`. */
export function resolveMediaRefs<T>(value: T, ids: Map<string, string>, missing?: Set<string>): T {
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') {
      const m = MEDIA_REF_PATTERN.exec(v);
      if (!m?.[1]) return v;
      const id = ids.get(m[1]);
      if (!id) {
        missing?.add(m[1]);
        return v;
      }
      return id;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(value) as T;
}

/** A copy of `value` with source-library ids replaced by `media_<key>` (for exported entries). */
export function toMediaRefs<T>(value: T, keyBySourceId: Map<string, string>): T {
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') {
      const key = keyBySourceId.get(v);
      return key ? mediaRef(key) : v;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(value) as T;
}

export function sha1(buffer: Buffer): string {
  return createHash('sha1').update(buffer).digest('hex');
}

/** Reads an asset from a URL, or from a path relative to the manifest (new captures before their first upload). */
export async function download(url: string): Promise<Buffer> {
  if (!/^https?:\/\//i.test(url)) return readFileSync(join(dirname(MANIFEST_PATH), url));
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

type MediaWithTags = AdminMedia & { tags?: string[]; checksum?: string | null };

export interface MediaSyncResult {
  ids: Map<string, string>;
  matched: string[];
  tagged: string[];
  uploaded: string[];
  /** Assets that would be uploaded (dry run) or failed (apply). */
  pending: string[];
  failed: string[];
}

function keyOf(item: MediaWithTags): string | null {
  const tag = (item.tags ?? []).find((t) => t.startsWith(KEY_TAG_PREFIX));
  return tag ? tag.slice(KEY_TAG_PREFIX.length) : null;
}

/** Makes every manifest asset (or only `only`) exist on the target and returns key → target id. */
export async function syncMedia(
  api: CmsApi,
  manifest: MediaManifest,
  opts: { apply: boolean; only?: Set<string>; log?: (line: string) => void },
): Promise<MediaSyncResult> {
  const log = opts.log ?? (() => undefined);
  const result: MediaSyncResult = { ids: new Map(), matched: [], tagged: [], uploaded: [], pending: [], failed: [] };
  const library = await api.listAll<MediaWithTags>('/media');
  const byKey = new Map<string, MediaWithTags>();
  const byChecksum = new Map<string, MediaWithTags>();
  for (const item of library) {
    const key = keyOf(item);
    if (key && !byKey.has(key)) byKey.set(key, item);
    if (item.checksum && !byChecksum.has(item.checksum)) byChecksum.set(item.checksum, item);
  }

  const addKeyTag = async (item: MediaWithTags, asset: MediaAsset): Promise<void> => {
    const tags = [...new Set([...(item.tags ?? []).filter((t) => !t.startsWith(KEY_TAG_PREFIX)), ...asset.tags, `${KEY_TAG_PREFIX}${asset.key}`])].slice(0, 30);
    await api.patch(`/media/${item.id}`, { tags });
  };

  for (const asset of manifest.assets) {
    if (opts.only && !opts.only.has(asset.key)) continue;
    const tagged = byKey.get(asset.key);
    if (tagged) {
      result.ids.set(asset.key, tagged.id);
      result.matched.push(asset.key);
      continue;
    }
    const same = asset.checksum ? byChecksum.get(asset.checksum) : undefined;
    if (same) {
      result.ids.set(asset.key, same.id);
      if (opts.apply) await addKeyTag(same, asset);
      result.tagged.push(asset.key);
      continue;
    }
    if (!opts.apply) {
      result.pending.push(asset.key);
      continue;
    }
    try {
      const file = await download(asset.url);
      const sum = sha1(file);
      if (asset.checksum && sum !== asset.checksum) log(`  warn  media ${asset.key}: downloaded file differs from the exported checksum`);
      const dup = byChecksum.get(sum);
      if (dup) {
        result.ids.set(asset.key, dup.id);
        await addKeyTag(dup, asset);
        result.tagged.push(asset.key);
        continue;
      }
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(file)], { type: asset.mimeType }), asset.fileName);
      form.append('alt', asset.alt);
      form.append('kind', asset.kind);
      if (asset.caption) form.append('caption', asset.caption);
      if (asset.credit) form.append('credit', asset.credit);
      if (asset.sourceUrl) form.append('sourceUrl', asset.sourceUrl);
      if (asset.folder) form.append('folder', asset.folder);
      form.append('tags', [...asset.tags, `${KEY_TAG_PREFIX}${asset.key}`].slice(0, 30).join(','));
      let created: MediaWithTags;
      try {
        created = await api.upload<MediaWithTags>('/media', form);
      } catch (err) {
        const dupOf = err instanceof ApiError && err.status === 409 ? (err.body as { duplicateOf?: MediaWithTags } | null)?.duplicateOf : undefined;
        if (!dupOf) throw err;
        await addKeyTag(dupOf, asset);
        result.ids.set(asset.key, dupOf.id);
        result.tagged.push(asset.key);
        continue;
      }
      if (asset.altTranslations || asset.focalX !== null || asset.focalY !== null) {
        await api.patch(`/media/${created.id}`, {
          ...(asset.altTranslations ? { altTranslations: asset.altTranslations } : {}),
          ...(asset.focalX !== null ? { focalX: asset.focalX } : {}),
          ...(asset.focalY !== null ? { focalY: asset.focalY } : {}),
        });
      }
      result.ids.set(asset.key, created.id);
      result.uploaded.push(asset.key);
      log(`  media ${asset.key}: uploaded → ${created.id}`);
    } catch (err) {
      result.failed.push(asset.key);
      log(`  ERROR media ${asset.key}: ${(err as Error).message}`);
    }
  }
  return result;
}
