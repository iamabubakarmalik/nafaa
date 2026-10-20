import { Controller, Get, HttpCode, Post, UseFilters, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../../_shared/constants/marketing-permissions.constants';
import { CmsExceptionFilter } from '../public/cms-exception.filter';
import { CmsDashboardService } from './cms-dashboard.service';

/** Admin → Website dashboard, health report and "Revalidate everything" (API-CONTRACT 8.9). */
@Controller('admin/marketing/cms')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
@UseFilters(CmsExceptionFilter)
export class CmsDashboardController {
  constructor(private readonly dashboard: CmsDashboardService) {}

  @Get('dashboard')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_VIEW)
  get() {
    return this.dashboard.dashboard();
  }

  @Get('dashboard/health')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_VIEW)
  health() {
    return this.dashboard.health();
  }

  @Post('revalidate-all')
  @HttpCode(200)
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_PUBLISH)
  revalidateAll() {
    return this.dashboard.revalidateAll();
  }
}
