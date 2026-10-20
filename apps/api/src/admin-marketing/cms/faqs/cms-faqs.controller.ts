import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseFilters, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../../_shared/constants/marketing-permissions.constants';
import { createFaqBodySchema, faqsQuerySchema, localeSchema, patchFaqBodySchema } from '../contract/cms-contract';
import { CmsExceptionFilter } from '../public/cms-exception.filter';
import { parseOr400, userId } from '../public/cms-http';
import { CmsFaqsService } from './cms-faqs.service';

type AuthedRequest = { user?: { id?: string } };

/** Admin → Website → FAQs (API-CONTRACT 8.3). */
@Controller('admin/marketing/cms/faqs')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
@UseFilters(CmsExceptionFilter)
export class CmsFaqsController {
  constructor(private readonly faqs: CmsFaqsService) {}

  @Get()
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_VIEW)
  list(@Query() query: unknown) {
    return this.faqs.list(parseOr400(faqsQuerySchema, query));
  }

  @Get('topics')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_VIEW)
  topics(@Query() query: unknown) {
    return this.faqs.topics(parseOr400(z.object({ locale: localeSchema.optional() }), query).locale);
  }

  @Get(':id')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_VIEW)
  get(@Param('id') id: string) {
    return this.faqs.get(id);
  }

  @Post()
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_EDIT)
  create(@Body() body: unknown, @Req() req: AuthedRequest) {
    return this.faqs.create(parseOr400(createFaqBodySchema, body), userId(req));
  }

  @Patch(':id')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_EDIT)
  update(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthedRequest) {
    return this.faqs.update(id, parseOr400(patchFaqBodySchema, body), userId(req));
  }

  @Post(':id/publish')
  @HttpCode(200)
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_PUBLISH)
  publish(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.faqs.publish(id, userId(req));
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_PUBLISH)
  unpublish(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.faqs.unpublish(id, userId(req));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_PUBLISH)
  async remove(@Param('id') id: string): Promise<void> {
    await this.faqs.remove(id);
  }
}
