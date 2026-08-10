import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../_shared/constants/marketing-permissions.constants';
import { BlogAnalyticsService } from './blog-analytics.service';

@Controller('admin/marketing/blog-analytics')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
export class BlogAnalyticsController {
  constructor(private readonly svc: BlogAnalyticsService) {}

  @Get('overview')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.BLOG_ANALYTICS_VIEW)
  overview(@Query() q: any) { return this.svc.overview(q); }

  @Get('top-posts')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.BLOG_ANALYTICS_VIEW)
  topPosts(@Query() q: any) { return this.svc.topPosts(q); }
}
