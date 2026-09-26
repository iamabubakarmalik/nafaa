import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { BakeryDashboardService } from './bakery-dashboard.service';
import { ShopIdParam } from '../../../common/shop-scope';

@ApiTags('Bakery - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bakery/dashboard')
export class BakeryDashboardController {
  constructor(private readonly service: BakeryDashboardService) {}

  @Get('overview')
  overview(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId?: string) {
    return this.service.overview(user, shopId);
  }

  /**
   * `days=1` sirf aaj, `days=7` hafte ka rozana ausat — bakery me
   * subah ka nashta aur shaam ki chai wale do alag rush hote hain,
   * aur production isi naqshe se plan hoti hai.
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
}
