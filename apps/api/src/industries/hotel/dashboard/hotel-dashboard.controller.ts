import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CloseNightAuditDto } from '../common/hotel.dto';
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
  @Get('overview') overview(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope) { return this.service.overview(user, scope); }
}

/** Occupancy, ADR, RevPAR and the night audit carry room revenue, so they are reports. */
@ApiTags('Hotel - Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotel/reports')
export class HotelReportsController {
  constructor(private readonly service: HotelDashboardService) {}

  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  @Get('occupancy') occupancy(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.occupancy(user, { from, to }, scope);
  }
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  @Get('night-audit') nightAudit(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query('date') date?: string) {
    return this.service.nightAudit(user, { date }, scope);
  }
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  @Get('night-audit/closed') closedDays(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.closedDays(user, scope, { from, to });
  }
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  @Get('night-audit/closed/:id') closedDay(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.closedDay(user, id); }
  /** Closing the day is a desk action on the books: reports view plus cash register access. */
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW, PERMISSIONS.CASH_REGISTER_CLOSE)
  @Post('night-audit/close') close(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: CloseNightAuditDto) {
    return this.service.closeDay(user, scope, dto);
  }
}
