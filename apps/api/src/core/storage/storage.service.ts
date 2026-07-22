import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import * as path from 'path';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_DOC_TYPES   = ['application/pdf'];
const ALL_ALLOWED = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOC_TYPES];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10 MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;  // 50 MB
const MAX_DOC_SIZE   = 20 * 1024 * 1024;

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.region = config.get<string>('AWS_REGION') ?? 'ap-south-1';
    this.bucket = config.get<string>('AWS_S3_BUCKET') ?? 'nafaa-uploads';
    this.publicBaseUrl =
      config.get<string>('AWS_S3_PUBLIC_URL') ??
      `https://${this.bucket}.s3.${this.region}.amazonaws.com`;

    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // GENERATE PRESIGNED UPLOAD URL (frontend uploads directly)
  // ═══════════════════════════════════════════════════════════

  async getPresignedUploadUrl(params: {
    fileName: string;
    contentType: string;
    folder?: string;
    fileSize?: number;
    userId?: string;
  }) {
    // Validate content type
    if (!ALL_ALLOWED.includes(params.contentType)) {
      throw new BadRequestException(`Content type ${params.contentType} not allowed`);
    }

    // Validate size
    const isImage = ALLOWED_IMAGE_TYPES.includes(params.contentType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(params.contentType);
    const maxSize = isImage ? MAX_IMAGE_SIZE : isVideo ? MAX_VIDEO_SIZE : MAX_DOC_SIZE;
    if (params.fileSize && params.fileSize > maxSize) {
      throw new BadRequestException(
        `File too large. Max ${Math.round(maxSize / 1024 / 1024)}MB for ${
          isImage ? 'images' : isVideo ? 'videos' : 'documents'
        }`,
      );
    }

    // Build unique key
    const ext = path.extname(params.fileName).toLowerCase() || `.${params.contentType.split('/')[1]}`;
    const random = crypto.randomBytes(8).toString('hex');
    const folder = params.folder ?? 'misc';
    const date = new Date().toISOString().slice(0, 10);
    const userPart = params.userId ? `${params.userId.slice(0, 8)}-` : '';
    const key = `${folder}/${date}/${userPart}${random}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: params.contentType,
      ...(params.fileSize ? { ContentLength: params.fileSize } : {}),
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 900 }); // 15 min
    const publicUrl = `${this.publicBaseUrl}/${key}`;

    return {
      uploadUrl,
      publicUrl,
      key,
      expiresIn: 900,
      method: 'PUT',
      headers: {
        'Content-Type': params.contentType,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════
  // GENERATE PRESIGNED READ URL (private assets)
  // ═══════════════════════════════════════════════════════════

  async getPresignedReadUrl(key: string, expiresInSec = 3600) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.s3, command, { expiresIn: expiresInSec });
  }

  // ═══════════════════════════════════════════════════════════
  // DELETE OBJECT
  // ═══════════════════════════════════════════════════════════

  async deleteObject(keyOrUrl: string) {
    const key = keyOrUrl.startsWith('http')
      ? keyOrUrl.replace(this.publicBaseUrl + '/', '')
      : keyOrUrl;
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      return { success: true, key };
    } catch (e: any) {
      this.logger.warn(`Failed to delete ${key}: ${e.message}`);
      return { success: false, error: e.message };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // BATCH DELETE
  // ═══════════════════════════════════════════════════════════

  async deleteBatch(keysOrUrls: string[]) {
    const results = await Promise.all(keysOrUrls.map((k) => this.deleteObject(k)));
    return { success: results.every((r) => r.success), results };
  }

  // ═══════════════════════════════════════════════════════════
  // UTILITY — build public URL from key
  // ═══════════════════════════════════════════════════════════

  buildPublicUrl(key: string) {
    return `${this.publicBaseUrl}/${key}`;
  }
}
