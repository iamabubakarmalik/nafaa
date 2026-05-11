import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CloudinaryService } from './cloudinary.service';
import * as fs from 'fs';
import * as path from 'path';

const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

@Injectable()
export class UploadsService {
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
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(`Unsupported type: ${file.mimetype}`);
    }

    let url: string;
    let filename: string;
    let filePath: string;
    let publicId: string | null = null;
    let storage: 'cloudinary' | 'local' = 'local';

    if (this.cloudinary.isConfigured()) {
      const result = await this.cloudinary.uploadBuffer(file.buffer, {
        tenantId: user.tenantId,
        purpose,
      });
      url = result.secure_url;
      publicId = result.public_id;
      filename = `${result.public_id}.${result.format || 'bin'}`;
      filePath = result.secure_url; // For cloudinary, path === url
      storage = 'cloudinary';
    } else {
      // Fallback to local disk
      const dir = path.join(process.cwd(), 'uploads', user.tenantId, purpose);
      fs.mkdirSync(dir, { recursive: true });
      filename = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}-${file.originalname.replace(/[^a-z0-9.\-_]/gi, '_')}`;
      const fullPath = path.join(dir, filename);
      fs.writeFileSync(fullPath, file.buffer);
      filePath = fullPath;
      url = `${this.baseUrl}/uploads/${user.tenantId}/${purpose}/${filename}`;
    }

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

    return record;
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

    // Delete from Cloudinary if applicable
    if (record.storage === 'cloudinary' && record.publicId) {
      await this.cloudinary.deleteByPublicId(record.publicId);
    } else if (record.storage === 'local' && record.path) {
      // Best-effort local file delete
      try {
        if (fs.existsSync(record.path)) fs.unlinkSync(record.path);
      } catch {}
    }

    await this.prisma.upload.delete({ where: { id } });
    return { message: 'Deleted' };
  }
}
