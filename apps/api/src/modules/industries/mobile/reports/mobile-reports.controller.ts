import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { MobileReportsService } from './mobile-reports.service';

@ApiTags('Mobile Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mobile-reports')
export class MobileReportsController {
  constructor(private readonly service: MobileReportsService) {}

  @Get('dashboard')
  dashboard(
    @GetUser() user: AuthenticatedUser,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.dashboard(user, shopId);
  }

  @Get('pta-breakdown')
  ptaBreakdown(@GetUser() user: AuthenticatedUser) {
    return this.service.ptaBreakdown(user);
  }

  @Get('top-brands')
  topBrands(
    @GetUser() user: AuthenticatedUser,
    @Query('days') days?: string,
  ) {
    return this.service.topBrands(user, days ? Number(days) : 30);
  }

  @Get('repair-analytics')
  repairAnalytics(
    @GetUser() user: AuthenticatedUser,
    @Query('days') days?: string,
  ) {
    return this.service.repairAnalytics(user, days ? Number(days) : 30);
  }

  @Get('emi-analytics')
  emiAnalytics(@GetUser() user: AuthenticatedUser) {
    return this.service.emiAnalytics(user);
  }

  @Get('used-phone-analytics')
  usedPhoneAnalytics(
    @GetUser() user: AuthenticatedUser,
    @Query('days') days?: string,
  ) {
    return this.service.usedPhoneAnalytics(user, days ? Number(days) : 30);
  }
}
