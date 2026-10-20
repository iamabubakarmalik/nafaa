import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ToystoreDashboardService } from './toystore-dashboard.service';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';

/** Toy store dashboard numbers. */
@ApiTags('Toy Store - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('toystore/dashboard')
export class ToystoreDashboardController {
  constructor(private readonly service: ToystoreDashboardService) {}

  @Get('overview') @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW) overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
  @Get('age-analytics') @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW) age(@GetUser() user: AuthenticatedUser) { return this.service.ageAnalytics(user); }
  @Get('sales-report') @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
  sales(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.service.salesReport(user, shop, from, to);
  }
}
