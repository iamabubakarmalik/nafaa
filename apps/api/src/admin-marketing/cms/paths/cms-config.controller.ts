import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../../_shared/constants/marketing-permissions.constants';
import type { CmsConfig } from '../contract/cms-contract';
import { CmsConfigService } from './cms-config.service';

/** Admin CMS configuration (API-CONTRACT 8.9, `GET /config`). */
@Controller('admin/marketing/cms')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
export class CmsConfigController {
  constructor(private readonly config: CmsConfigService) {}

  @Get('config')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_VIEW)
  getConfig(): Promise<CmsConfig> {
    return this.config.getConfig();
  }
}
