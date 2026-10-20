import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, Res, UploadedFile,
  UseFilters, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../../_shared/constants/marketing-permissions.constants';
import {
  createRedirectBodySchema,
  patchRedirectBodySchema,
  redirectImportBodySchema,
  redirectTestQuerySchema,
  redirectsQuerySchema,
} from '../contract/cms-contract';
import { CmsExceptionFilter } from '../public/cms-exception.filter';
import { parseOr400, userId } from '../public/cms-http';
import { CmsRedirectsService } from './cms-redirects.service';
import { parseRedirectCsv } from './redirect-match';

type AuthedRequest = { user?: { id?: string } };

/** Admin → Website → Redirects (API-CONTRACT 8.5). */
@Controller('admin/marketing/cms/redirects')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
@UseFilters(CmsExceptionFilter)
export class CmsRedirectsController {
  constructor(private readonly redirects: CmsRedirectsService) {}

  @Get()
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_VIEW)
  list(@Query() query: unknown) {
    return this.redirects.list(parseOr400(redirectsQuerySchema, query));
  }

  @Get('export')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_VIEW)
  async export(@Res() res: Response): Promise<void> {
    const csv = await this.redirects.exportCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="nafaa-redirects.csv"');
    res.send(csv);
  }

  @Get('test')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_VIEW)
  test(@Query() query: unknown) {
    return this.redirects.test(parseOr400(redirectTestQuerySchema, query).path);
  }

  @Post()
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_REDIRECTS)
  create(@Body() body: unknown, @Req() req: AuthedRequest) {
    return this.redirects.create(parseOr400(createRedirectBodySchema, body), userId(req));
  }

  /** JSON `{ rows, dryRun? }`, or multipart with a `file` CSV (`from,to,status,note`) and `dryRun`. */
  @Post('import')
  @HttpCode(200)
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_REDIRECTS)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } }))
  import(@Body() body: unknown, @UploadedFile() file: Express.Multer.File | undefined, @Req() req: AuthedRequest) {
    if (file) {
      const rows = parseRedirectCsv(file.buffer.toString('utf8'));
      if (rows.length === 0) throw new BadRequestException('CSV khali hai');
      const dryRun = String((body as { dryRun?: unknown } | undefined)?.dryRun ?? '') === 'true';
      return this.redirects.import(parseOr400(redirectImportBodySchema, { rows, dryRun }), userId(req));
    }
    return this.redirects.import(parseOr400(redirectImportBodySchema, body), userId(req));
  }

  @Patch(':id')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_REDIRECTS)
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.redirects.update(id, parseOr400(patchRedirectBodySchema, body));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_REDIRECTS)
  async remove(@Param('id') id: string): Promise<void> {
    await this.redirects.remove(id);
  }
}
