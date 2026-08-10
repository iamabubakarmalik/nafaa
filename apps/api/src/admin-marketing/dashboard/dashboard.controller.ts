import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../_shared/constants/marketing-permissions.constants';
import { MarketingDashboardService } from './dashboard.service';

@Controller('admin/marketing/dashboard')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
export class MarketingDashboardController {
  constructor(private readonly svc: MarketingDashboardService) {}

  @Get('overview')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.MARKETING_DASHBOARD_VIEW)
  overview() { return this.svc.overview(); }

  @Get('activity')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.MARKETING_DASHBOARD_VIEW)
  activity(@Query('limit') limit?: string) {
    return this.svc.recentActivity(limit ? Number(limit) : 20);
  }
}
