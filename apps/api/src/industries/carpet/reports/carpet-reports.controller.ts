import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CarpetReportsService } from './carpet-reports.service';
import { ShopIdParam } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';

@ApiTags('Carpet Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('carpet-reports')
export class CarpetReportsController {
  constructor(private readonly service: CarpetReportsService) {}

  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  @Get('overview')
  overview(
    @GetUser() user: AuthenticatedUser,
    @ShopIdParam() shopId?: string,
  ) {
    return this.service.overview(user, shopId);
  }

  @RequirePermissions(PERMISSIONS.PROFIT_REPORT_VIEW)
  @Get('roll-profit')
  rollProfit(
    @GetUser() user: AuthenticatedUser,
    @ShopIdParam() shopId?: string,
  ) {
    return this.service.rollProfitReport(user, shopId);
  }

  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  @Get('slow-moving')
  slowMoving(
    @GetUser() user: AuthenticatedUser,
    @Query('days') days?: string,
    @ShopIdParam() shopId?: string,
  ) {
    return this.service.slowMovingRolls(user, days ? Number(days) : 30, shopId);
  }

  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  @Get('todays-cuts')
  todaysCuts(
    @GetUser() user: AuthenticatedUser,
    @ShopIdParam() shopId?: string,
  ) {
    return this.service.todaysCuts(user, shopId);
  }

  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  @Get('top-designs')
  topDesigns(
    @GetUser() user: AuthenticatedUser,
    @Query('days') days?: string,
    @ShopIdParam() shopId?: string,
  ) {
    return this.service.topSellingDesigns(
      user,
      days ? Number(days) : 30,
      shopId,
    );
  }

  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  @Get('cut-pieces')
  cutPiecesReport(
    @GetUser() user: AuthenticatedUser,
    @ShopIdParam() shopId?: string,
  ) {
    return this.service.cutPiecesReport(user, shopId);
  }
}
