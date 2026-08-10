import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../_shared/constants/marketing-permissions.constants';
import { HeatmapsService } from './heatmaps.service';

@Controller('admin/marketing/heatmaps')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
export class HeatmapsController {
  constructor(private readonly svc: HeatmapsService) {}

  @Get('pages')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.HEATMAPS_VIEW)
  pages() { return this.svc.listPages(); }

  @Get('clicks')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.HEATMAPS_VIEW)
  clicks(@Query('path') path: string) { return this.svc.pageClicks(path); }

  @Get('scroll')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.HEATMAPS_VIEW)
  scroll(@Query('path') path: string) { return this.svc.scrollDepth(path); }
}
