import { Body, Controller, Delete, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { StorageService } from './storage.service';
import { PresignedUrlDto } from './dto/presigned-url.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';

@ApiTags('Storage / Uploads')
@Controller('storage')
export class StorageController {
  constructor(private readonly svc: StorageService) {}

  // ─── For BUSINESS users (uses JwtAuthGuard which is global) ───
  @Post('presigned-upload')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get presigned URL to upload directly to S3' })
  presigned(@Body() dto: PresignedUrlDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.getPresignedUploadUrl({
      fileName: dto.fileName,
      contentType: dto.contentType,
      folder: dto.folder,
      fileSize: dto.fileSize,
      userId: user?.id ?? user?.sub,
    });
  }

  @Delete('object')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an object by key or public URL' })
  delete(@Body() body: { key: string }) {
    return this.svc.deleteObject(body.key);
  }
}
