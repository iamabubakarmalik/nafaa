/**
 * Theme files for a Nafaa Store (`/api/stores/:id/theme/...`): Shopify theme
 * zip import, Nafaa theme file export/import, and publish/discard of the
 * imported draft. Same permissions as the theme editor.
 */
import { Body, Controller, Get, HttpCode, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions.constants';
import { StoreThemeImportService } from './store-theme-import.service';
import { ZIP_LIMITS } from './theme/shopify-theme-import';
import { NAFAA_THEME_MAX_BYTES } from './theme/nafaa-theme-file';

const VIEW = PERMISSIONS.ONLINE_PRODUCTS_VIEW;
const EDIT = PERMISSIONS.ONLINE_PRODUCTS_MANAGE;
type U = AuthenticatedUser;

@ApiTags('Nafaa Stores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stores')
export class StoreThemeImportController {
  constructor(private readonly service: StoreThemeImportService) {}

  @Get(':id/theme/import') @RequirePermissions(VIEW)
  last(@GetUser() u: U, @Param('id') id: string) { return this.service.last(u, id); }

  @Post(':id/theme/import/shopify') @HttpCode(200) @RequirePermissions(EDIT) @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: ZIP_LIMITS.maxZipBytes, files: 1 } }))
  shopify(@GetUser() u: U, @Param('id') id: string, @UploadedFile() file: Express.Multer.File | undefined, @Body() b: any) {
    return this.service.importShopify(u, id, file, b ?? {});
  }

  @Post(':id/theme/import/nafaa') @HttpCode(200) @RequirePermissions(EDIT) @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: NAFAA_THEME_MAX_BYTES, files: 1 } }))
  nafaa(@GetUser() u: U, @Param('id') id: string, @UploadedFile() file: Express.Multer.File | undefined) {
    return this.service.importNafaa(u, id, file);
  }

  @Post(':id/theme/import/publish') @HttpCode(200) @RequirePermissions(EDIT)
  publish(@GetUser() u: U, @Param('id') id: string) { return this.service.publish(u, id); }

  @Post(':id/theme/import/discard') @HttpCode(200) @RequirePermissions(EDIT)
  discard(@GetUser() u: U, @Param('id') id: string) { return this.service.discard(u, id); }

  @Get(':id/theme/export') @RequirePermissions(VIEW)
  export(@GetUser() u: U, @Param('id') id: string, @Query('which') which?: string) { return this.service.exportFile(u, id, which); }
}
