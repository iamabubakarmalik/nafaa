import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { HotelDashboardService } from './hotel-dashboard.service';

@ApiTags('Hotel - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotel/dashboard')
export class HotelDashboardController {
  constructor(private readonly service: HotelDashboardService) {}

  @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
  @Get('overview') overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
}

/** Occupancy, ADR, RevPAR and the night audit carry room revenue, so they are reports. */
@ApiTags('Hotel - Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotel/reports')
export class HotelReportsController {
  constructor(private readonly service: HotelDashboardService) {}

  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  @Get('occupancy') occupancy(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) { return this.service.occupancy(user, { from, to }); }
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  @Get('night-audit') nightAudit(@GetUser() user: AuthenticatedUser, @Query('date') date?: string) { return this.service.nightAudit(user, { date }); }
}
