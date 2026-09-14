import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AppliancesAnalyticsService } from './appliances-analytics.service';
import { ShopIdParam } from '../../../common/shop-scope';

@ApiTags('Appliances Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appliances/analytics')
export class AppliancesAnalyticsController {
  constructor(private readonly service: AppliancesAnalyticsService) {}

  /** Maal + installation + repair + AMC + delivery — paanchon ki kamai. */
  @Get('profit')
  profit(
    @GetUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @ShopIdParam() shopId?: string,
  ) {
    return this.service.profitBreakdown(user, { from, to, shopId });
  }

  /** Kya khatam ho raha hai — serial wale models bhi shamil. */
  @Get('low-stock')
  lowStock(
    @GetUser() user: AuthenticatedUser,
    @ShopIdParam() shopId?: string,
  ) {
    return this.service.lowStock(user, shopId);
  }

  /** Stock value, maal ki umar, dead stock, khatam hoti warranty. */
  @Get('stock')
  stock(
    @GetUser() user: AuthenticatedUser,
    @ShopIdParam() shopId?: string,
  ) {
    return this.service.stockReport(user, shopId);
  }

  /** Service desk — technician performance, resolution time, baqi paisa. */
  @Get('service')
  serviceDesk(
    @GetUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.serviceAnalytics(user, { from, to });
  }
}
