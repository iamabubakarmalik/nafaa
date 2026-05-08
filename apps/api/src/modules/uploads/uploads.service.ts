import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(
    user: AuthenticatedUser | null,
    file: Express.Multer.File,
    purpose?: string,
  ) {
    const port = this.configService.get<number>('PORT') ?? 4000;
    const baseUrl = `http://localhost:${port}`;
    const url = `${baseUrl}/uploads/${file.filename}`;

    return this.prisma.upload.create({
      data: {
        tenantId: user?.tenantId ?? null,
        uploaderId: user?.id ?? null,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        url,
        purpose,
      },
    });
  }

  async findOne(id: string) {
    const upload = await this.prisma.upload.findUnique({ where: { id } });
    if (!upload) throw new NotFoundException('Upload not found');
    return upload;
  }

  async listMine(user: AuthenticatedUser) {
    return this.prisma.upload.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
