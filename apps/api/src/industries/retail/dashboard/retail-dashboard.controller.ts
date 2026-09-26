import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RetailDashboardService } from './retail-dashboard.service';
import { ShopIdParam } from '../../../common/shop-scope';

@ApiTags('Retail - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('retail/dashboard')
export class RetailDashboardController {
  constructor(private readonly service: RetailDashboardService) {}

  @Get('overview')
  overview(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId?: string) {
    return this.service.overview(user, shopId);
  }

  /**
   * `days=1` sirf aaj; `days=7` pichhle hafte ka rozana ausat — is se
   * pata chalta hai ke dukaan asal me kis waqt masroof rehti hai, sirf
   * aaj ka ittefaq nahi.
   */
  @Get('sales-by-hour')
  salesByHour(
    @GetUser() user: AuthenticatedUser,
    @ShopIdParam() shopId?: string,
    @Query('days') days?: string,
  ) {
    return this.service.salesByHour(user, shopId, days ? parseInt(days, 10) : 1);
  }

  @Get('money-map')
  moneyMap(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId?: string) {
    return this.service.moneyMap(user, shopId);
  }

  @Get('slow-movers')
  slowMovers(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return this.service.slowMovers(user, days ? parseInt(days) : 30);
  }
}
