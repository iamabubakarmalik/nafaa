import { Body, Controller, Get, Param, Put, Query, Req, UseFilters, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../../_shared/constants/marketing-permissions.constants';
import { localeSchema, putSettingBodySchema } from '../contract/cms-contract';
import { CmsExceptionFilter } from '../public/cms-exception.filter';
import { parseOr400, userId } from '../public/cms-http';
import { CmsSettingsService } from './cms-settings.service';

const localeQuery = z.object({ locale: localeSchema.optional() });

/** Admin → Website → Settings (API-CONTRACT 8.7). The llms preview lives in the public module. */
@Controller('admin/marketing/cms/settings')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
@UseFilters(CmsExceptionFilter)
export class CmsSettingsController {
  constructor(private readonly settings: CmsSettingsService) {}

  @Get()
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_VIEW)
  list(@Query() query: unknown) {
    const { locale } = parseOr400(localeQuery, query);
    return this.settings.adminBundle(locale);
  }

  @Put(':key')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_SETTINGS)
  put(@Param('key') key: string, @Body() body: unknown, @Req() req: { user?: { id?: string } }) {
    const parsed = parseOr400(putSettingBodySchema, body);
    return this.settings.put(key, { locale: parsed.locale, value: parsed.value }, userId(req));
  }
}
