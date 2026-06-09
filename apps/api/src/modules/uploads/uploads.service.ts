// src/modules/uploads/uploads.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CloudinaryService } from './cloudinary.service';
import * as fs from 'fs';
import * as path from 'path';

const ALLOWED_MIME = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly config: ConfigService,
  ) {}

  private get baseUrl(): string {
    return this.config.get<string>('PUBLIC_API_URL') || 'http://localhost:4000';
  }

  async uploadOne(
    user: AuthenticatedUser,
    file: Express.Multer.File,
    purpose: string = 'misc',
  ) {
    // ─── Validation ────────────────────────────────────────────────
    if (!file) {
      this.logger.warn(`Upload failed: no file (user=${user?.id})`);
      throw new BadRequestException('No file uploaded');
    }
    if (!file.buffer || file.buffer.length === 0) {
      this.logger.warn(`Upload failed: empty buffer (user=${user?.id})`);
      throw new BadRequestException('Empty file uploaded');
    }
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      this.logger.warn(`Upload failed: bad mime ${file.mimetype}`);
      throw new BadRequestException(`Unsupported type: ${file.mimetype}`);
    }

    this.logger.log(
      `📤 Upload start: user=${user.id} tenant=${user.tenantId} purpose=${purpose} ` +
        `size=${file.size}B mime=${file.mimetype} name=${file.originalname} ` +
        `storage=${this.cloudinary.isConfigured() ? 'cloudinary' : 'local'}`,
    );

    let url: string;
    let filename: string;
    let filePath: string;
    let publicId: string | null = null;
    let storage: 'cloudinary' | 'local' = 'local';

    // ─── Upload to Cloudinary or local disk ────────────────────────
    try {
      if (this.cloudinary.isConfigured()) {
        const result = await this.cloudinary.uploadBuffer(file.buffer, {
          tenantId: user.tenantId,
          purpose,
        });
        url = result.secure_url;
        publicId = result.public_id;
        filename = `${result.public_id}.${result.format || 'bin'}`;
        filePath = result.secure_url;
        storage = 'cloudinary';
        this.logger.log(`✅ Cloudinary upload OK: ${publicId}`);
      } else {
        const dir = path.join(process.cwd(), 'uploads', user.tenantId, purpose);
        fs.mkdirSync(dir, { recursive: true });
        filename = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}-${file.originalname.replace(/[^a-z0-9.\-_]/gi, '_')}`;
        const fullPath = path.join(dir, filename);
        fs.writeFileSync(fullPath, file.buffer);
        filePath = fullPath;
        url = `${this.baseUrl}/uploads/${user.tenantId}/${purpose}/${filename}`;
        this.logger.log(`✅ Local upload OK: ${filename}`);
      }
    } catch (err: any) {
      this.logger.error(
        `❌ Storage upload FAILED: ${err?.message || err}`,
        err?.stack,
      );
      // Cloudinary errors often have err.http_code / err.error
      const detail =
        err?.error?.message ||
        err?.message ||
        'Unknown storage error';
      throw new InternalServerErrorException(
        `Image upload failed: ${detail}`,
      );
    }

    // ─── Save DB record ────────────────────────────────────────────
    try {
      const record = await this.prisma.upload.create({
        data: {
          tenantId: user.tenantId,
          uploaderId: user.id,
          filename,
          originalName: file.originalname,
          path: filePath,
          url,
          purpose,
          mimeType: file.mimetype,
          size: file.size,
          publicId: publicId ?? undefined,
          storage,
        },
      });
      this.logger.log(`💾 DB record saved: ${record.id}`);
      return record;
    } catch (err: any) {
      this.logger.error(
        `❌ DB save FAILED: ${err?.message}`,
        err?.stack,
      );
      // Cleanup uploaded file if DB save failed
      if (storage === 'cloudinary' && publicId) {
        this.cloudinary.deleteByPublicId(publicId).catch(() => {});
      }
      throw new InternalServerErrorException(
        `Database save failed: ${err?.message || 'unknown'}`,
      );
    }
  }

  async uploadMany(
    user: AuthenticatedUser,
    files: Express.Multer.File[],
    purpose: string = 'misc',
  ) {
    if (!files?.length) {
      throw new BadRequestException('No files uploaded');
    }
    const results = [];
    for (const file of files) {
      results.push(await this.uploadOne(user, file, purpose));
    }
    return results;
  }

  async findMine(user: AuthenticatedUser, limit = 50) {
    return this.prisma.upload.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const record = await this.prisma.upload.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!record) throw new NotFoundException('Upload not found');
    return record;
  }

  async remove(user: AuthenticatedUser, id: string) {
    const record = await this.findOne(user, id);

    if (record.storage === 'cloudinary' && record.publicId) {
      await this.cloudinary.deleteByPublicId(record.publicId);
    } else if (record.storage === 'local' && record.path) {
      try {
        if (fs.existsSync(record.path)) fs.unlinkSync(record.path);
      } catch {}
    }

    await this.prisma.upload.delete({ where: { id } });
    return { message: 'Deleted' };
  }
}
