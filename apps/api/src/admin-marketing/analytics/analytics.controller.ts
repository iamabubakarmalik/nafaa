import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../_shared/constants/marketing-permissions.constants';
import { AnalyticsService } from './analytics.service';

@Controller('admin/marketing/analytics')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
export class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}

  @Get('overview')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.ANALYTICS_VIEW)
  overview(@Query() q: { from?: string; to?: string }) {
    return this.svc.overview(q);
  }

  @Get('sources')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.ANALYTICS_VIEW)
  sources(@Query() q: { from?: string; to?: string }) {
    return this.svc.trafficSources(q);
  }

  @Get('top-pages')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.ANALYTICS_VIEW)
  topPages(@Query() q: { from?: string; to?: string }) {
    return this.svc.topPages(q);
  }

  @Get('timeseries')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.ANALYTICS_VIEW)
  timeseries(@Query('days') days?: string) {
    return this.svc.dailyTimeseries(days ? Number(days) : 30);
  }
}
