import { Body, Controller, Get, Param, Put, Query, Req, UseFilters, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../../_shared/constants/marketing-permissions.constants';
import { localeSchema, putMenuBodySchema } from '../contract/cms-contract';
import { CmsExceptionFilter } from '../public/cms-exception.filter';
import { parseOr400, userId } from '../public/cms-http';
import { CmsMenusService } from './cms-menus.service';

const localeQuery = z.object({ locale: localeSchema.optional() });

/** Admin → Website → Menus (API-CONTRACT 8.6). */
@Controller('admin/marketing/cms/menus')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
@UseFilters(CmsExceptionFilter)
export class CmsMenusController {
  constructor(private readonly menus: CmsMenusService) {}

  @Get()
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_VIEW)
  list(@Query() query: unknown) {
    return this.menus.list(parseOr400(localeQuery, query).locale);
  }

  @Get(':key')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_VIEW)
  detail(@Param('key') key: string, @Query() query: unknown) {
    return this.menus.detail(key, parseOr400(localeQuery, query).locale);
  }

  @Put(':key')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_EDIT)
  put(@Param('key') key: string, @Body() body: unknown, @Req() req: { user?: { id?: string } }) {
    return this.menus.put(key, parseOr400(putMenuBodySchema, body), userId(req));
  }
}
