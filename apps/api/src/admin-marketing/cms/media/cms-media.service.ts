/**
 * Media library (API-CONTRACT 8.4, ARCH 4.7).
 *
 * Files live on Cloudinary under `nafaa/site/...`; the site asks Cloudinary
 * for sized AVIF/WebP. On upload the API stores dimensions, a tiny WebP blur
 * placeholder (`data:` URI), the dominant colour and a SHA-1 checksum (a
 * second upload of the same file answers 409 with the existing item).
 *
 * Delete is soft while nothing uses the file; a daily job removes the
 * Cloudinary asset and the row 30 days later.
 */
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CmsMediaKind, Prisma, type CmsMedia } from '@prisma/client';
import { createHash } from 'crypto';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import { PrismaService } from '../../../prisma/prisma.service';
import { CloudinaryService } from '../../../modules/uploads/cloudinary.service';
import {
  MEDIA_LIMITS,
  cacheTags,
  type AdminMedia,
  type MediaUploadFields,
  type MediaUsage,
  type Paginated,
  type PatchMediaBody,
} from '../contract/cms-contract';
import { iso } from '../public/cms-http';
import { collectMediaIds, toAdminMedia } from '../public/cms-media-view';
import { CmsSiteEvents } from '../public/cms-site-events.service';
import { paginated, parsePagination } from '../../_shared/helpers/pagination.helper';

const ROOT_FOLDER = 'nafaa/site';
const PURGE_AFTER_DAYS = 30;

/** Accepted uploads by MIME type. */
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);
const DOCUMENT_TYPES = new Set([
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

type ResourceType = 'image' | 'video' | 'raw';

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface MediaQuery {
  kind?: CmsMediaKind | undefined;
  tag?: string | undefined;
  q?: string | undefined;
  unused?: boolean | undefined;
  page: number;
  limit: number;
}

function resourceTypeFor(mime: string): ResourceType {
  if (IMAGE_TYPES.has(mime)) return 'image';
  if (VIDEO_TYPES.has(mime)) return 'video';
  return 'raw';
}

function defaultKind(mime: string): CmsMediaKind {
  if (IMAGE_TYPES.has(mime)) return CmsMediaKind.IMAGE;
  if (VIDEO_TYPES.has(mime)) return CmsMediaKind.VIDEO;
  return CmsMediaKind.DOCUMENT;
}

/** Where an entry uses a media id: column names or JSON areas. */
interface UsageScan {
  entries: Map<string, { id: string; title: string; path: string; where: Set<string>; live: boolean }>;
  customers: Map<string, { id: string; name: string; where: Set<string>; isPublic: boolean }>;
  settings: Set<string>;
}

@Injectable()
export class CmsMediaService {
  private readonly logger = new Logger(CmsMediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloud: CloudinaryService,
    private readonly events: CmsSiteEvents,
  ) {}

  // ─── Reads ───

  async list(query: MediaQuery): Promise<Paginated<AdminMedia>> {
    const { page, limit, skip } = parsePagination(query);
    const where: Prisma.CmsMediaWhereInput = { deletedAt: null };
    if (query.kind) where.kind = query.kind;
    if (query.tag) where.tags = { has: query.tag };
    if (query.q) {
      where.OR = [
        { alt: { contains: query.q, mode: 'insensitive' } },
        { fileName: { contains: query.q, mode: 'insensitive' } },
        { caption: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.unused !== undefined) {
      const used = await this.usedIds();
      where.id = query.unused ? { notIn: [...used] } : { in: [...used] };
    }
    const [rows, total] = await Promise.all([
      this.prisma.cmsMedia.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.cmsMedia.count({ where }),
    ]);
    return paginated(rows.map(toAdminMedia), total, page, limit);
  }

  async get(id: string): Promise<AdminMedia> {
    return toAdminMedia(await this.findOrThrow(id));
  }

  private async findOrThrow(id: string): Promise<CmsMedia> {
    const row = await this.prisma.cmsMedia.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new NotFoundException('Media nahi mili');
    return row;
  }

  // ─── Usage ───

  /** Scans entries (draft and live), customers, testimonials and settings for media ids. */
  private async scan(only?: string): Promise<{ ids: Set<string>; usage: UsageScan }> {
    const ids = new Set<string>();
    const usage: UsageScan = { entries: new Map(), customers: new Map(), settings: new Set() };
    const note = (mediaId: string, record: () => void) => {
      ids.add(mediaId);
      if (!only || mediaId === only) record();
    };

    const entries = await this.prisma.cmsEntry.findMany({
      where: { status: { not: 'ARCHIVED' } },
      select: { id: true, title: true, path: true, publishedPath: true, status: true, imageId: true, ogImageId: true, blocks: true, data: true, published: true },
    });
    for (const e of entries) {
      const live = e.publishedPath !== null && (e.status === 'PUBLISHED' || e.status === 'SCHEDULED');
      const mark = (mediaId: string, where: string) =>
        note(mediaId, () => {
          const item = usage.entries.get(e.id) ?? { id: e.id, title: e.title, path: e.publishedPath ?? e.path, where: new Set<string>(), live };
          item.where.add(where);
          usage.entries.set(e.id, item);
        });
      if (e.imageId) mark(e.imageId, 'image');
      if (e.ogImageId) mark(e.ogImageId, 'ogImage');
      for (const id of collectMediaIds(e.blocks)) mark(id, 'blocks');
      for (const id of collectMediaIds(e.data)) mark(id, 'data');
      for (const id of collectMediaIds(e.published)) mark(id, 'live version');
    }

    const customers = await this.prisma.cmsCustomer.findMany({
      select: { id: true, name: true, logoId: true, isPublic: true, testimonials: { select: { photoId: true } } },
    });
    for (const c of customers) {
      const mark = (mediaId: string, where: string) =>
        note(mediaId, () => {
          const item = usage.customers.get(c.id) ?? { id: c.id, name: c.name, where: new Set<string>(), isPublic: c.isPublic };
          item.where.add(where);
          usage.customers.set(c.id, item);
        });
      if (c.logoId) mark(c.logoId, 'logo');
      for (const t of c.testimonials) if (t.photoId) mark(t.photoId, 'testimonial photo');
    }

    const settings = await this.prisma.cmsSetting.findMany({ select: { key: true, locale: true, value: true } });
    for (const s of settings) {
      for (const id of collectMediaIds(s.value)) note(id, () => usage.settings.add(`${s.key}:${s.locale}`));
    }
    return { ids, usage };
  }

  private async usedIds(): Promise<Set<string>> {
    return (await this.scan()).ids;
  }

  async usage(id: string): Promise<MediaUsage> {
    await this.findOrThrow(id);
    const { usage } = await this.scan(id);
    return {
      entries: [...usage.entries.values()].map((e) => ({ id: e.id, title: e.title, path: e.path, where: [...e.where].join(', ') })),
      customers: [...usage.customers.values()].map((c) => ({ id: c.id, name: c.name, where: [...c.where].join(', ') })),
      settings: [...usage.settings],
    };
  }

  /** True when a change to this media can show on the site (used by something live or public). */
  private async isPublic(id: string): Promise<boolean> {
    const { usage } = await this.scan(id);
    return (
      [...usage.entries.values()].some((e) => e.live) ||
      [...usage.customers.values()].some((c) => c.isPublic) ||
      usage.settings.size > 0
    );
  }

  // ─── Writes ───

  private checkFile(file: UploadedFile | undefined): asserts file is UploadedFile {
    if (!file || !file.buffer?.length) throw new BadRequestException('File nahi mili (field "file")');
    const type = resourceTypeFor(file.mimetype);
    if (!IMAGE_TYPES.has(file.mimetype) && !VIDEO_TYPES.has(file.mimetype) && !DOCUMENT_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`Yeh file type nahi chalti (${file.mimetype}). Images, MP4/WebM, PDF, XLSX, DOCX, CSV.`);
    }
    const max = type === 'image' ? MEDIA_LIMITS.imageMaxBytes : MEDIA_LIMITS.documentMaxBytes;
    if (file.size > max) throw new BadRequestException(`File bohat bari hai (had ${Math.round(max / 1024 / 1024)} MB)`);
  }

  private checksum(buffer: Buffer): string {
    return createHash('sha1').update(buffer).digest('hex');
  }

  private async push(file: UploadedFile, folder: string | null): Promise<UploadApiResponse> {
    if (!this.cloud.isConfigured()) throw new ServiceUnavailableException('Cloudinary set nahi, upload nahi ho sakta');
    const resourceType = resourceTypeFor(file.mimetype);
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: folder ? `${ROOT_FOLDER}/${folder}` : ROOT_FOLDER,
          resource_type: resourceType,
          overwrite: false,
          unique_filename: true,
          use_filename: false,
          ...(resourceType === 'image' && file.mimetype !== 'image/svg+xml' ? { colors: true } : {}),
        },
        (error, result) => {
          if (error) return reject(new ServiceUnavailableException(`Cloudinary upload nahi hua: ${error.message}`));
          if (!result) return reject(new ServiceUnavailableException('Cloudinary ne jawab nahi diya'));
          resolve(result);
        },
      );
      Readable.from(file.buffer).pipe(stream);
    });
  }

  /** Tiny WebP placeholder as a data URI, or null (SVGs, videos, documents, network errors). */
  private async blurFor(result: UploadApiResponse, mime: string): Promise<string | null> {
    if (resourceTypeFor(mime) !== 'image' || mime === 'image/svg+xml') return null;
    try {
      const url = cloudinary.url(result.public_id, {
        secure: true,
        resource_type: 'image',
        transformation: [{ width: 16, crop: 'scale' }, { effect: 'blur:200' }, { quality: 30, fetch_format: 'webp' }],
      });
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const bytes = Buffer.from(await res.arrayBuffer());
      return bytes.length > 0 && bytes.length < 4096 ? `data:image/webp;base64,${bytes.toString('base64')}` : null;
    } catch {
      return null;
    }
  }

  private dominantColor(result: UploadApiResponse): string | null {
    const colors = (result as { colors?: unknown }).colors;
    if (Array.isArray(colors) && Array.isArray(colors[0]) && typeof colors[0][0] === 'string' && /^#[0-9a-f]{6}$/i.test(colors[0][0])) {
      return colors[0][0].toLowerCase();
    }
    return null;
  }

  private async fileColumns(file: UploadedFile, folder: string | null) {
    const result = await this.push(file, folder);
    const blur = await this.blurFor(result, file.mimetype);
    return {
      provider: 'cloudinary',
      publicId: result.public_id,
      url: result.secure_url,
      fileName: file.originalname.slice(0, 200),
      mimeType: file.mimetype,
      bytes: typeof result.bytes === 'number' ? result.bytes : file.size,
      width: typeof result.width === 'number' ? result.width : null,
      height: typeof result.height === 'number' ? result.height : null,
      durationSec: typeof result.duration === 'number' ? Math.round(result.duration) : null,
      blurDataUrl: blur,
      dominantColor: this.dominantColor(result),
    };
  }

  async upload(file: UploadedFile | undefined, fields: MediaUploadFields, userId: string | null): Promise<AdminMedia> {
    this.checkFile(file);
    const checksum = this.checksum(file.buffer);
    const duplicate = await this.prisma.cmsMedia.findFirst({ where: { checksum, deletedAt: null } });
    if (duplicate) {
      throw new ConflictException({ statusCode: 409, message: 'Yeh file pehle se library me hai', error: 'Conflict', duplicateOf: toAdminMedia(duplicate) });
    }
    const columns = await this.fileColumns(file, fields.folder ?? null);
    const row = await this.prisma.cmsMedia.create({
      data: {
        ...columns,
        kind: fields.kind ?? defaultKind(file.mimetype),
        alt: fields.alt,
        caption: fields.caption ?? null,
        credit: fields.credit ?? null,
        sourceUrl: fields.sourceUrl ?? null,
        tags: fields.tags ?? [],
        folder: fields.folder ?? null,
        checksum,
        createdById: userId,
      },
    });
    return toAdminMedia(row);
  }

  async update(id: string, body: PatchMediaBody): Promise<AdminMedia> {
    await this.findOrThrow(id);
    const row = await this.prisma.cmsMedia.update({
      where: { id },
      data: {
        ...(body.alt !== undefined ? { alt: body.alt } : {}),
        ...(body.altTranslations !== undefined ? { altTranslations: body.altTranslations } : {}),
        ...(body.caption !== undefined ? { caption: body.caption } : {}),
        ...(body.credit !== undefined ? { credit: body.credit } : {}),
        ...(body.sourceUrl !== undefined ? { sourceUrl: body.sourceUrl } : {}),
        ...(body.tags !== undefined ? { tags: body.tags } : {}),
        ...(body.focalX !== undefined ? { focalX: body.focalX } : {}),
        ...(body.focalY !== undefined ? { focalY: body.focalY } : {}),
        ...(body.kind !== undefined ? { kind: body.kind } : {}),
      },
    });
    if (await this.isPublic(id)) await this.events.changed({ tags: [cacheTags.all], reason: 'media' });
    return toAdminMedia(row);
  }

  /** New file for the same id (alt and metadata stay). The old Cloudinary asset is removed. */
  async replace(id: string, file: UploadedFile | undefined): Promise<AdminMedia> {
    const current = await this.findOrThrow(id);
    this.checkFile(file);
    if (resourceTypeFor(file.mimetype) !== resourceTypeFor(current.mimeType)) {
      throw new BadRequestException('Nayi file usi qism ki ho (image ki jagah image, document ki jagah document)');
    }
    const checksum = this.checksum(file.buffer);
    if (checksum === current.checksum) return toAdminMedia(current);
    const columns = await this.fileColumns(file, current.folder);
    const row = await this.prisma.cmsMedia.update({ where: { id }, data: { ...columns, checksum } });
    await this.destroy(current.publicId, current.mimeType);
    if (await this.isPublic(id)) await this.events.changed({ tags: [cacheTags.all], reason: 'media' });
    return toAdminMedia(row);
  }

  async remove(id: string): Promise<void> {
    await this.findOrThrow(id);
    const usage = await this.usage(id);
    const count = usage.entries.length + usage.customers.length + usage.settings.length;
    if (count > 0) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: `Yeh media ${count} jagah istemal ho rahi hai. Pehle wahan se hatayein.`,
        usage,
      });
    }
    await this.prisma.cmsMedia.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async destroy(publicId: string, mime: string): Promise<void> {
    if (!this.cloud.isConfigured()) return;
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceTypeFor(mime), invalidate: true });
    } catch (err: unknown) {
      this.logger.warn(`Cloudinary destroy failed for ${publicId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** Daily: removes media soft-deleted more than 30 days ago (Cloudinary asset and row). */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeDeleted(): Promise<number> {
    const before = new Date(Date.now() - PURGE_AFTER_DAYS * 24 * 3600 * 1000);
    const rows = await this.prisma.cmsMedia.findMany({ where: { deletedAt: { lt: before } }, take: 200 });
    if (rows.length === 0) return 0;
    const used = await this.usedIds();
    let purged = 0;
    for (const row of rows) {
      if (used.has(row.id)) continue;
      await this.destroy(row.publicId, row.mimeType);
      await this.prisma.cmsMedia.delete({ where: { id: row.id } }).catch(() => undefined);
      purged++;
    }
    if (purged > 0) this.logger.log(`Purged ${purged} deleted CMS media item(s) (deleted before ${iso(before)})`);
    return purged;
  }
}
