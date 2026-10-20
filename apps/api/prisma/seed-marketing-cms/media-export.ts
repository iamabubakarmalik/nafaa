/**
 * Writes the source media library to `media/manifest.json` (read-only on the source).
 *
 *   pnpm --filter @nafaa/api seed:cms:media-export                    from the local API
 *   pnpm --filter @nafaa/api seed:cms:media-export -- --verify        also download each file and compare its SHA-1
 *   pnpm --filter @nafaa/api seed:cms:media-export -- --download=<dir> also save the files to <dir>
 *
 * Options: --api=<base> (default CMS_API_URL or http://localhost:4000/api), --email=<admin>.
 *
 * Each asset gets a stable key: its `seed:<key>` tag when it has one, else
 * the file name without extension (`retail-pos.png` → `retail-pos`). Content
 * refers to it as `media_<key>`. Existing keys in the manifest are kept for
 * the same source id, so a re-export does not rename anything.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { AdminMedia } from '../../src/admin-marketing/cms/contract/cms-contract';
import { connect } from './lib/api';
import { argValue, hasFlag } from './lib/cli';
import { KEY_PATTERN, KEY_TAG_PREFIX, MANIFEST_PATH, download, loadManifest, sha1, type MediaAsset, type MediaManifest } from './lib/media';

type FullMedia = AdminMedia & Record<string, unknown>;

function slugKey(fileName: string): string {
  const stem = fileName.replace(/\.[a-z0-9]+$/i, '');
  const key = stem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 56);
  return key || 'asset';
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apiUrl = (argValue(argv, 'api') ?? process.env.CMS_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');
  const verify = hasFlag(argv, 'verify');
  const downloadDir = argValue(argv, 'download');
  const { api, as } = await connect(apiUrl, { email: argValue(argv, 'email') });
  console.log(`Media export from ${apiUrl} as ${as}`);

  const previous = new Map(loadManifest().assets.map((a) => [a.sourceId, a.key]));
  const library = await api.listAll<FullMedia>('/media');
  const used = new Set<string>();
  const assets: MediaAsset[] = [];

  for (const item of [...library].sort((a, b) => String(a.fileName).localeCompare(String(b.fileName)))) {
    const full = await api.get<FullMedia>(`/media/${item.id}`);
    const tags = (full.tags as string[] | undefined) ?? [];
    const tagKey = tags.find((t) => t.startsWith(KEY_TAG_PREFIX))?.slice(KEY_TAG_PREFIX.length);
    let key = tagKey ?? previous.get(full.id) ?? slugKey(String(full.fileName));
    if (!KEY_PATTERN.test(key)) key = slugKey(key);
    for (let n = 2; used.has(key); n++) key = `${key.replace(/-\d+$/, '')}-${n}`;
    used.add(key);
    assets.push({
      key,
      sourceId: full.id,
      url: String(full.url),
      fileName: String(full.fileName),
      mimeType: String(full.mimeType),
      bytes: Number(full.bytes),
      width: (full.width as number | null) ?? null,
      height: (full.height as number | null) ?? null,
      checksum: (full.checksum as string | null) ?? null,
      kind: String(full.kind),
      alt: String(full.alt),
      altTranslations: (full.altTranslations as Record<string, string> | null) ?? null,
      caption: (full.caption as string | null) ?? null,
      credit: (full.credit as string | null) ?? null,
      sourceUrl: (full.sourceUrl as string | null) ?? null,
      focalX: (full.focalX as number | null) ?? null,
      focalY: (full.focalY as number | null) ?? null,
      tags: tags.filter((t) => !t.startsWith(KEY_TAG_PREFIX)),
      folder: (full.folder as string | null) ?? null,
    });
  }

  let same = 0;
  const problems: string[] = [];
  if (verify || downloadDir) {
    for (const a of assets) {
      try {
        const file = await download(a.url);
        if (a.checksum && sha1(file) === a.checksum) same++;
        else problems.push(`${a.key}: downloaded bytes differ from the stored checksum`);
        if (downloadDir) {
          const out = join(downloadDir, a.fileName);
          mkdirSync(dirname(out), { recursive: true });
          writeFileSync(out, file);
        }
      } catch (err) {
        problems.push(`${a.key}: ${(err as Error).message}`);
      }
    }
  }

  const manifest: MediaManifest = { version: 1, exportedAt: new Date().toISOString(), source: apiUrl, assets };
  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${assets.length} assets to ${MANIFEST_PATH}`);
  if (verify || downloadDir) console.log(`Verified: ${same}/${assets.length} files match their checksum${downloadDir ? `; saved to ${downloadDir}` : ''}`);
  for (const p of problems) console.log(`  warn  ${p}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
