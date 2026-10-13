import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RetailDashboardService } from './retail-dashboard.service';
import { ALL_SHOPS, CurrentShop, ShopScope } from '../../../common/shop-scope';

/**
 * Branch for a dashboard read: the resolved scope wins (staff are locked to
 * their branch, owners pick one with the header); `?shopId=` is honoured only
 * on the all-shops view. Every query also filters by tenant.
 */
function branchOf(shop: ShopScope, queryShopId?: string): string | undefined {
  if (shop.shopId) return shop.shopId;
  const q = queryShopId?.trim();
  return q && q !== ALL_SHOPS ? q : undefined;
}

@ApiTags('Retail - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('retail/dashboard')
export class RetailDashboardController {
  constructor(private readonly service: RetailDashboardService) {}

  @Get('overview')
  overview(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('shopId') shopId?: string) {
    return this.service.overview(user, branchOf(shop, shopId));
  }

  /**
   * `days=1` sirf aaj; `days=7` pichhle hafte ka rozana ausat — is se
   * pata chalta hai ke dukaan asal me kis waqt masroof rehti hai, sirf
   * aaj ka ittefaq nahi.
   */
  @Get('sales-by-hour')
  salesByHour(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('shopId') shopId?: string,
    @Query('days') days?: string,
  ) {
    return this.service.salesByHour(user, branchOf(shop, shopId), days ? parseInt(days, 10) : 1);
  }

  @Get('money-map')
  moneyMap(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('shopId') shopId?: string) {
    return this.service.moneyMap(user, branchOf(shop, shopId));
  }

  @Get('slow-movers')
  slowMovers(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return this.service.slowMovers(user, days ? parseInt(days, 10) : 30);
  }
}
