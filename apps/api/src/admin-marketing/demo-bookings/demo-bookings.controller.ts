import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../_shared/constants/marketing-permissions.constants';
import { DemoBookingsService } from './demo-bookings.service';
import { ListDemosDto } from './dto/list-demos.dto';
import { ScheduleDemoDto } from './dto/schedule-demo.dto';
import { CompleteDemoDto } from './dto/complete-demo.dto';

@Controller('admin/marketing/demo-bookings')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
export class DemoBookingsController {
  constructor(private readonly svc: DemoBookingsService) {}

  @Get('stats')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.DEMO_BOOKINGS_VIEW)
  stats() {
    return this.svc.getStats();
  }

  @Get()
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.DEMO_BOOKINGS_VIEW)
  list(@Query() dto: ListDemosDto) {
    return this.svc.list(dto);
  }

  @Get(':id')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.DEMO_BOOKINGS_VIEW)
  get(@Param('id') id: string) {
    return this.svc.getOne(id);
  }

  @Post(':id/schedule')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.DEMO_BOOKINGS_MANAGE)
  schedule(
    @Param('id') id: string,
    @Body() dto: ScheduleDemoDto,
    @Req() req: any,
  ) {
    return this.svc.schedule(id, dto, req.user.id);
  }

  @Post(':id/complete')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.DEMO_BOOKINGS_MANAGE)
  complete(
    @Param('id') id: string,
    @Body() dto: CompleteDemoDto,
    @Req() req: any,
  ) {
    return this.svc.complete(id, dto, req.user.id);
  }

  @Post(':id/cancel')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.DEMO_BOOKINGS_MANAGE)
  cancel(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    return this.svc.cancel(id, body.reason, req.user.id);
  }
}
