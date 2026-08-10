import {
  Body, Controller, Get, Param, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../_shared/constants/marketing-permissions.constants';
import { SeoService } from './seo.service';

@Controller('admin/marketing/seo')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
export class SeoController {
  constructor(private readonly svc: SeoService) {}

  @Get('score')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.SEO_VIEW)
  score() { return this.svc.seoScore(); }

  @Get('pages')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.SEO_VIEW)
  list(@Query() dto: any) { return this.svc.listPages(dto); }

  @Get('pages/:id')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.SEO_VIEW)
  get(@Param('id') id: string) { return this.svc.getPage(id); }

  @Post('pages')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.SEO_MANAGE)
  upsert(@Body() body: any, @Req() req: any) {
    return this.svc.upsertPage(body.path, body, req.user.id);
  }

  @Get('keywords')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.SEO_VIEW)
  keywords() { return this.svc.keywordRankings(); }
}
