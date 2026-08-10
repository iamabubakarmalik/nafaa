import {
  Body, Controller, Get, Param, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../_shared/constants/marketing-permissions.constants';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { ListCampaignsDto } from './dto/list-campaigns.dto';

@Controller('admin/marketing/campaigns')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
export class CampaignsController {
  constructor(private readonly svc: CampaignsService) {}

  @Get('stats')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CAMPAIGNS_VIEW)
  stats() { return this.svc.getStats(); }

  @Get()
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CAMPAIGNS_VIEW)
  list(@Query() dto: ListCampaignsDto) { return this.svc.list(dto); }

  @Get(':id')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CAMPAIGNS_VIEW)
  get(@Param('id') id: string) { return this.svc.getOne(id); }

  @Post()
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CAMPAIGNS_CREATE)
  create(@Body() dto: CreateCampaignDto, @Req() req: any) {
    return this.svc.create(dto, req.user.id);
  }

  @Post(':id/launch')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CAMPAIGNS_SEND)
  launch(@Param('id') id: string, @Req() req: any) {
    return this.svc.launch(id, req.user.id);
  }

  @Post(':id/pause')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CAMPAIGNS_SEND)
  pause(@Param('id') id: string, @Req() req: any) {
    return this.svc.pause(id, req.user.id);
  }

  @Post(':id/cancel')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CAMPAIGNS_SEND)
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.svc.cancel(id, req.user.id);
  }
}
