import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UploadedFile, UseFilters, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../../_shared/constants/marketing-permissions.constants';
import { MEDIA_LIMITS, mediaQuerySchema, mediaUploadFieldsSchema, patchMediaBodySchema } from '../contract/cms-contract';
import { CmsExceptionFilter } from '../public/cms-exception.filter';
import { parseOr400, userId } from '../public/cms-http';
import { CmsMediaService, type UploadedFile as MediaFile } from './cms-media.service';

type AuthedRequest = { user?: { id?: string } };

const upload = FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MEDIA_LIMITS.documentMaxBytes } });

/** Admin → Website → Media (API-CONTRACT 8.4). */
@Controller('admin/marketing/cms/media')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
@UseFilters(CmsExceptionFilter)
export class CmsMediaController {
  constructor(private readonly media: CmsMediaService) {}

  @Get()
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_VIEW)
  list(@Query() query: unknown) {
    return this.media.list(parseOr400(mediaQuerySchema, query));
  }

  @Get(':id')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_VIEW)
  get(@Param('id') id: string) {
    return this.media.get(id);
  }

  @Get(':id/usage')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_VIEW)
  usage(@Param('id') id: string) {
    return this.media.usage(id);
  }

  @Post()
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_EDIT)
  @UseInterceptors(upload)
  create(@UploadedFile() file: MediaFile | undefined, @Body() body: unknown, @Req() req: AuthedRequest) {
    return this.media.upload(file, parseOr400(mediaUploadFieldsSchema, body), userId(req));
  }

  @Patch(':id')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_EDIT)
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.media.update(id, parseOr400(patchMediaBodySchema, body));
  }

  @Post(':id/replace')
  @HttpCode(200)
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_EDIT)
  @UseInterceptors(upload)
  replace(@Param('id') id: string, @UploadedFile() file: MediaFile | undefined) {
    return this.media.replace(id, file);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_EDIT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.media.remove(id);
  }
}
