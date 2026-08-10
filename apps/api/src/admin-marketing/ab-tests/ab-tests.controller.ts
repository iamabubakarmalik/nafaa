import {
  Body, Controller, Get, Param, Post, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../_shared/constants/marketing-permissions.constants';
import { AbTestsService } from './ab-tests.service';

@Controller('admin/marketing/ab-tests')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
export class AbTestsController {
  constructor(private readonly svc: AbTestsService) {}

  @Get()
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.AB_TESTS_VIEW)
  list() { return this.svc.list(); }

  @Get(':id')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.AB_TESTS_VIEW)
  get(@Param('id') id: string) { return this.svc.getOne(id); }

  @Get(':id/results')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.AB_TESTS_VIEW)
  results(@Param('id') id: string) { return this.svc.results(id); }

  @Post()
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.AB_TESTS_MANAGE)
  create(@Body() body: any, @Req() req: any) {
    return this.svc.create(body, req.user.id);
  }

  @Post(':id/start')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.AB_TESTS_MANAGE)
  start(@Param('id') id: string) { return this.svc.start(id); }

  @Post(':id/stop')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.AB_TESTS_MANAGE)
  stop(@Param('id') id: string, @Body() body: { winnerId?: string }) {
    return this.svc.stop(id, body.winnerId);
  }
}
