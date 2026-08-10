import {
  Body, Controller, Get, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../_shared/constants/marketing-permissions.constants';
import { ConversionsService } from './conversions.service';

@Controller('admin/marketing/conversions')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
export class ConversionsController {
  constructor(private readonly svc: ConversionsService) {}

  @Get('funnel')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CONVERSIONS_VIEW)
  funnel(@Query() q: any) { return this.svc.funnel(q); }

  @Get('goals')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CONVERSIONS_VIEW)
  goals() { return this.svc.listGoals(); }

  @Post('goals')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CONVERSIONS_MANAGE)
  create(@Body() body: any, @Req() req: any) {
    return this.svc.createGoal(body, req.user.id);
  }
}
