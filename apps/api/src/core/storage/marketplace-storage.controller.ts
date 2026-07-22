import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { PresignedUrlDto } from './dto/presigned-url.dto';
import { CustomerAuthGuard } from '../../marketplace/_shared/guards/customer-auth.guard';
import { GetCustomer } from '../../marketplace/_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../../marketplace/auth/interfaces/customer-jwt.interface';

/**
 * Separate controller so marketplace customers can also upload
 * (e.g. review photos/videos, avatar) using their marketplace token.
 */
@ApiTags('Marketplace / Uploads')
@Controller('marketplace/storage')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class MarketplaceStorageController {
  constructor(private readonly svc: StorageService) {}

  @Post('presigned-upload')
  @ApiOperation({ summary: 'Presigned URL for customer uploads (review photos, avatar, etc.)' })
  presigned(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: PresignedUrlDto) {
    return this.svc.getPresignedUploadUrl({
      fileName: dto.fileName,
      contentType: dto.contentType,
      folder: dto.folder,
      fileSize: dto.fileSize,
      userId: c.id,
    });
  }
}
