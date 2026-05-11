import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private configured = false;

  constructor(private readonly config: ConfigService) {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.configured = true;
      this.logger.log(`☁️  Cloudinary configured for cloud: ${cloudName}`);
    } else {
      this.logger.warn('⚠️  Cloudinary credentials missing — uploads will use local disk');
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Upload a buffer (from multer memory storage) to Cloudinary.
   */
  async uploadBuffer(
    buffer: Buffer,
    options: {
      folder?: string;
      publicId?: string;
      resourceType?: 'image' | 'video' | 'raw' | 'auto';
      tenantId?: string;
      purpose?: string;
    } = {},
  ): Promise<UploadApiResponse> {
    if (!this.configured) {
      throw new Error('Cloudinary not configured');
    }

    const folder = options.folder
      ? `nafaa/${options.folder}`
      : options.tenantId
      ? `nafaa/${options.tenantId}/${options.purpose ?? 'misc'}`
      : 'nafaa/misc';

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: options.publicId,
          resource_type: options.resourceType ?? 'image',
          overwrite: false,
          // Image optimization
          transformation: [
            { quality: 'auto:good', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('No result from Cloudinary'));
          resolve(result);
        },
      );
      Readable.from(buffer).pipe(stream);
    });
  }

  /**
   * Delete an asset from Cloudinary by public_id.
   */
  async deleteByPublicId(publicId: string): Promise<void> {
    if (!this.configured) return;
    try {
      await cloudinary.uploader.destroy(publicId, { invalidate: true });
    } catch (err: any) {
      this.logger.warn(`Failed to delete ${publicId}: ${err?.message}`);
    }
  }

  /**
   * Extract public_id from a Cloudinary URL.
   * e.g. https://res.cloudinary.com/dxxx/image/upload/v123/nafaa/abc.jpg
   *      → nafaa/abc
   */
  extractPublicId(url: string): string | null {
    try {
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-z]+$/i);
      return match?.[1] ?? null;
    } catch {
      return null;
    }
  }
}
