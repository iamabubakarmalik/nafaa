/**
 * Nafaa Social media library and content pack import.
 *
 * Files are stored on Cloudinary (the uploads module's storage) under
 * nafaa/brand-social, images and videos alike; without Cloudinary they go to
 * the API's local uploads folder (development). A presigned S3 upload
 * (StorageService) can be registered with POST assets as well.
 *
 * Content pack: a zip with pack.json and media files (see ContentPack in
 * brand-social.types.ts). Media becomes assets; posts are created IN_REVIEW,
 * or APPROVED / SCHEDULED when approval is not required. The report lists
 * what was created and what was skipped, with the reason.
 */

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BrandSocialAsset, Prisma } from '@prisma/client';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudinaryService } from '../../modules/uploads/cloudinary.service';
import { StorageService } from '../../core/storage/storage.service';
import { listZip, readEntry, ZipEntry } from '../../integrations/stores/theme/zip-reader';
import { BrandSocialPostsService, SocialActor } from './brand-social-posts.service';
import { BrandSocialSettingsService } from './brand-social-settings.service';
import { blockingErrors, fileKey, mimeFromName, parsePack, readMediaInfo, slugify } from './brand-social.logic';
import type { AssetInput, AssetListResponse, AssetView, BrandPostStatus, ImportReport } from './brand-social.types';

export const MEDIA_MAX_BYTES = 200 * 1024 * 1024;
export const PACK_MAX_BYTES = 300 * 1024 * 1024;
const PACK_JSON_MAX = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);

interface Stored { url: string; thumbUrl: string | null; width: number | null; height: number | null; durationSec: number | null; bytes: number; mime: string; kind: 'image' | 'video'; storageKey: string | null }

@Injectable()
export class BrandSocialMediaService {
  private readonly logger = new Logger('BrandSocialMedia');

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloud: CloudinaryService,
    private readonly storage: StorageService,
    private readonly posts: BrandSocialPostsService,
    private readonly settings: BrandSocialSettingsService,
  ) {}

  /* ───────────────────────── views ───────────────────────── */

  private async views(rows: BrandSocialAsset[]): Promise<AssetView[]> {
    const ids = rows.map((r) => r.id);
    const used = ids.length
      ? await this.prisma.brandSocialPost.findMany({ where: { assetIds: { hasSome: ids }, status: { not: 'ARCHIVED' } }, select: { id: true, title: true, status: true, assetIds: true } })
      : [];
    return rows.map((a) => ({
      id: a.id, kind: a.kind === 'video' ? 'video' : 'image', url: a.url, thumbUrl: a.thumbUrl, width: a.width, height: a.height,
      durationSec: a.durationSec, bytes: a.bytes, mime: a.mime, title: a.title, tags: a.tags, folder: a.folder, createdAt: a.createdAt.toISOString(),
      usedIn: used.filter((p) => p.assetIds.includes(a.id)).map((p) => ({ id: p.id, title: p.title, status: p.status as BrandPostStatus })),
    }));
  }

  async list(q: { search?: string; kind?: string; folder?: string }): Promise<AssetListResponse> {
    const where: Prisma.BrandSocialAssetWhereInput = {};
    if (q?.kind === 'image' || q?.kind === 'video') where.kind = q.kind;
    if (q?.folder) where.folder = q.folder;
    const s = String(q?.search ?? '').trim();
    if (s) where.OR = [{ title: { contains: s, mode: 'insensitive' } }, { tags: { has: s.toLowerCase() } }, { folder: { contains: s, mode: 'insensitive' } }];
    const [rows, folders, tagRows] = await Promise.all([
      this.prisma.brandSocialAsset.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 }),
      this.prisma.brandSocialAsset.findMany({ where: { folder: { not: null } }, distinct: ['folder'], select: { folder: true } }),
      this.prisma.brandSocialAsset.findMany({ select: { tags: true }, take: 2000, orderBy: { createdAt: 'desc' } }),
    ]);
    return {
      assets: await this.views(rows),
      folders: folders.map((f) => f.folder!).sort(),
      tags: [...new Set(tagRows.flatMap((t) => t.tags))].sort(),
    };
  }

  async one(id: string): Promise<AssetView> {
    const a = await this.prisma.brandSocialAsset.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('File not found.');
    return (await this.views([a]))[0];
  }

  /* ───────────────────────── writes ───────────────────────── */

  private meta(input: { title?: unknown; tags?: unknown; folder?: unknown }) {
    const tags = Array.isArray(input.tags) ? input.tags : typeof input.tags === 'string' ? input.tags.split(',') : [];
    return {
      title: typeof input.title === 'string' ? input.title.trim().slice(0, 200) : undefined,
      tags: [...new Set(tags.filter((t): t is string => typeof t === 'string').map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 30),
      folder: typeof input.folder === 'string' ? input.folder.trim().slice(0, 80) || null : input.folder === null ? null : undefined,
    };
  }

  /** Registers a file that is already uploaded (presigned upload). */
  async create(input: AssetInput, actor: SocialActor): Promise<AssetView> {
    const url = String(input?.url ?? '').trim();
    if (!/^https?:\/\//i.test(url)) throw new BadRequestException('The file URL must start with http(s)://');
    const mime = typeof input.mime === 'string' ? input.mime : mimeFromName(url);
    const kind = input.kind === 'video' || (!input.kind && mime?.startsWith('video/')) ? 'video' : 'image';
    const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);
    const m = this.meta(input);
    const row = await this.prisma.brandSocialAsset.create({
      data: {
        kind, url, mime, thumbUrl: typeof input.thumbUrl === 'string' ? input.thumbUrl : null,
        width: n(input.width) != null ? Math.round(n(input.width)!) : null, height: n(input.height) != null ? Math.round(n(input.height)!) : null,
        durationSec: n(input.durationSec), bytes: n(input.bytes) != null ? Math.round(n(input.bytes)!) : null,
        title: m.title ?? fileKey(url).slice(0, 200), tags: m.tags, folder: m.folder ?? null, uploadedById: actor.id,
      },
    });
    return this.one(row.id);
  }

  /** A presigned S3 PUT for the browser (when S3 is set up). */
  presign(body: { fileName?: string; contentType?: string; fileSize?: number }) {
    if (!body?.fileName || !body?.contentType) throw new BadRequestException('fileName and contentType are needed.');
    return this.storage.getPresignedUploadUrl({ fileName: body.fileName, contentType: body.contentType, fileSize: body.fileSize, folder: 'brand-social' });
  }

  /** Multipart upload: stores the file and adds it to the library. */
  async upload(file: Express.Multer.File | undefined, body: Record<string, unknown>, actor: SocialActor): Promise<AssetView> {
    if (!file?.buffer?.length) throw new BadRequestException('Choose a file (field "file").');
    const stored = await this.store(new Uint8Array(file.buffer.buffer, file.buffer.byteOffset, file.buffer.byteLength), file.originalname || 'file', file.mimetype);
    const m = this.meta(body ?? {});
    const row = await this.prisma.brandSocialAsset.create({
      data: { ...this.columns(stored), title: m.title || path.parse(file.originalname || 'file').name.slice(0, 200), tags: m.tags, folder: m.folder ?? null, uploadedById: actor.id },
    });
    return this.one(row.id);
  }

  private columns(s: Stored) {
    return { kind: s.kind, url: s.url, thumbUrl: s.thumbUrl, width: s.width, height: s.height, durationSec: s.durationSec, bytes: s.bytes, mime: s.mime, storageKey: s.storageKey };
  }

  async patch(id: string, body: { title?: string; tags?: string[]; folder?: string | null }): Promise<AssetView> {
    await this.one(id);
    const m = this.meta(body ?? {});
    await this.prisma.brandSocialAsset.update({
      where: { id },
      data: { ...(m.title !== undefined ? { title: m.title } : {}), ...(body && 'tags' in body ? { tags: m.tags } : {}), ...(m.folder !== undefined ? { folder: m.folder } : {}) },
    });
    return this.one(id);
  }

  /** Deletes a file nothing uses (archived posts count as using it too, so they keep their media). */
  async remove(id: string) {
    const a = await this.prisma.brandSocialAsset.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('File not found.');
    const used = await this.prisma.brandSocialPost.count({ where: { assetIds: { has: id } } });
    if (used) throw new BadRequestException(`This file is used in ${used} post${used === 1 ? '' : 's'}. Remove it from them first.`);
    await this.prisma.brandSocialAsset.delete({ where: { id } });
    if (a.storageKey && this.cloud.isConfigured()) {
      await cloudinary.uploader.destroy(a.storageKey, { resource_type: a.kind === 'video' ? 'video' : 'image', invalidate: true }).catch(() => null);
    }
    return { deleted: true };
  }

  /* ───────────────────────── storage ───────────────────────── */

  /** Stores one image or video and reads its size. */
  async store(data: Uint8Array, name: string, declaredMime?: string | null): Promise<Stored> {
    if (data.length > MEDIA_MAX_BYTES) throw new BadRequestException(`${name} is larger than ${MEDIA_MAX_BYTES / 1024 / 1024} MB.`);
    const info = readMediaInfo(data);
    const mime = info?.mime ?? (declaredMime && (IMAGE_TYPES.has(declaredMime) || VIDEO_TYPES.has(declaredMime)) ? declaredMime : mimeFromName(name));
    if (!mime || (!IMAGE_TYPES.has(mime) && !VIDEO_TYPES.has(mime))) throw new BadRequestException(`${name}: only JPEG, PNG, WebP, GIF, MP4, MOV and WebM files.`);
    const kind: 'image' | 'video' = VIDEO_TYPES.has(mime) ? 'video' : 'image';

    if (this.cloud.isConfigured()) {
      const res = await new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'nafaa/brand-social', resource_type: kind, overwrite: false, unique_filename: true, use_filename: false },
          (error, result) => (error ? reject(new BadRequestException(`Upload failed: ${error.message}`)) : result ? resolve(result) : reject(new BadRequestException('Upload failed.'))),
        );
        Readable.from(Buffer.from(data.buffer, data.byteOffset, data.byteLength)).pipe(stream);
      });
      const thumbUrl = kind === 'video' ? cloudinary.url(res.public_id, { resource_type: 'video', format: 'jpg', secure: true, transformation: [{ start_offset: '1' }] }) : null;
      return {
        url: res.secure_url, thumbUrl, kind, mime, bytes: res.bytes ?? data.length, storageKey: res.public_id,
        width: res.width ?? info?.width ?? null, height: res.height ?? info?.height ?? null,
        durationSec: typeof (res as { duration?: number }).duration === 'number' ? (res as { duration?: number }).duration! : info?.durationSec ?? null,
      };
    }

    const dir = path.join(process.cwd(), 'uploads', 'brand-social');
    fs.mkdirSync(dir, { recursive: true });
    const ext = (path.extname(name) || `.${mime.split('/')[1]}`).toLowerCase().replace(/[^.a-z0-9]/g, '');
    const file = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(dir, file), data);
    const base = (process.env.PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '').replace(/\/api$/, '');
    return { url: `${base}/uploads/brand-social/${file}`, thumbUrl: null, kind, mime, bytes: data.length, storageKey: null, width: info?.width ?? null, height: info?.height ?? null, durationSec: info?.durationSec ?? null };
  }

  /* ───────────────────────── content pack ───────────────────────── */

  async importPack(file: Express.Multer.File | undefined, actor: SocialActor): Promise<ImportReport> {
    if (!file?.buffer?.length) throw new BadRequestException('Choose the content pack zip (field "file").');
    if (file.buffer.length > PACK_MAX_BYTES) throw new BadRequestException('The zip is larger than 300 MB. Split it into two packs.');
    const buf = new Uint8Array(file.buffer.buffer, file.buffer.byteOffset, file.buffer.byteLength);
    const entries = listZip(buf, 5000);
    if (entries === 'too_many') throw new BadRequestException('The zip has more than 5,000 files.');
    if (!entries) throw new BadRequestException('This is not a readable zip file.');
    const files = entries.filter((e) => !e.name.endsWith('/') && !/(^|\/)(__MACOSX|\.)/.test(e.name));
    const packEntry = files.filter((e) => fileKey(e.name) === 'pack.json').sort((a, b) => a.name.length - b.name.length)[0];
    if (!packEntry) throw new BadRequestException('pack.json was not found in the zip.');
    const packBytes = readEntry(buf, packEntry, PACK_JSON_MAX);
    if (!packBytes || packBytes === 'too_big') throw new BadRequestException('pack.json could not be read (or is larger than 5 MB).');
    let raw: unknown;
    try { raw = JSON.parse(new TextDecoder().decode(packBytes)); } catch (e) { throw new BadRequestException(`pack.json is not valid JSON: ${(e as Error).message}`); }

    const byKey = new Map<string, ZipEntry>();
    for (const e of files) if (e !== packEntry && !byKey.has(fileKey(e.name))) byKey.set(fileKey(e.name), e);
    let pack: ReturnType<typeof parsePack>;
    try { pack = parsePack(raw, new Set(byKey.keys())); } catch (e) { throw new BadRequestException((e as Error).message); }

    const s = await this.settings.get();
    const folder = pack.campaign ? slugify(pack.campaign, 60) || 'imports' : 'imports';
    const report: ImportReport = { campaign: pack.campaign, created: [], skipped: [...pack.skipped], assets: { uploaded: 0, failed: [] } };

    // Media first: each file once, even when several posts use it.
    const assetOf = new Map<string, string>();
    const failedFiles = new Map<string, string>();
    for (const key of [...new Set(pack.posts.flatMap((p) => p.media.map(fileKey)))]) {
      const entry = byKey.get(key)!;
      try {
        const bytes = readEntry(buf, entry, MEDIA_MAX_BYTES);
        if (bytes === 'too_big') throw new Error(`larger than ${MEDIA_MAX_BYTES / 1024 / 1024} MB`);
        if (!bytes) throw new Error('could not be unzipped');
        const stored = await this.store(bytes, entry.name);
        const row = await this.prisma.brandSocialAsset.create({
          data: { ...this.columns(stored), title: path.parse(fileKey(entry.name)).name.slice(0, 200), tags: pack.campaign ? [slugify(pack.campaign, 60)] : [], folder, uploadedById: actor.id.startsWith('key:') ? null : actor.id },
        });
        assetOf.set(key, row.id);
        report.assets.uploaded++;
      } catch (e) {
        const reason = (e as Error)?.message || 'upload failed';
        failedFiles.set(key, reason);
        report.assets.failed.push({ file: entry.name, reason });
      }
    }

    for (const p of pack.posts) {
      const bad = p.media.map(fileKey).filter((k) => failedFiles.has(k));
      if (bad.length) { report.skipped.push({ index: p.index, title: p.title, reason: `Media failed to upload: ${bad.join(', ')}.` }); continue; }
      try {
        const view = await this.posts.create({
          title: p.title, kind: p.kind, pillar: p.pillar, campaign: pack.campaign, caption: p.caption, captions: p.captions,
          hashtags: p.hashtags, firstComment: p.firstComment, link: p.link, platforms: p.platforms,
          media: p.media.map((m) => ({ assetId: assetOf.get(fileKey(m))!, url: '', kind: 'image' as const })),
          scheduledAt: p.scheduledAt?.toISOString() ?? null, notes: p.notes, options: p.options,
        }, actor, actor.automation ? {} : { status: 'IN_REVIEW' });
        let status: BrandPostStatus = view.status;
        // People skip review when approval is off; a key skips it only with the "schedule" scope.
        const skipReview = actor.automation ? !!actor.canSchedule : !s.requireApproval;
        if (skipReview && !blockingErrors(view.warnings).length) {
          status = p.scheduledAt ? 'SCHEDULED' : 'APPROVED';
          await this.prisma.brandSocialPost.update({
            where: { id: view.id },
            data: { status, nextRunAt: status === 'SCHEDULED' ? p.scheduledAt : null, approvedById: actor.id, approvedAt: new Date() },
          });
        }
        report.created.push({ id: view.id, title: view.title, status, scheduledAt: view.scheduledAt, warnings: view.warnings.length });
      } catch (e) {
        report.skipped.push({ index: p.index, title: p.title, reason: (e as Error)?.message || 'Could not be created.' });
      }
    }
    report.skipped.sort((a, b) => a.index - b.index);
    this.logger.log(`Content pack: ${report.created.length} posts, ${report.assets.uploaded} files, ${report.skipped.length} skipped`);
    return report;
  }
}
