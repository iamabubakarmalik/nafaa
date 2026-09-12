import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ElectronicsAnalyticsService } from './electronics-analytics.service';
import { ShopIdParam } from '../../../common/shop-scope';

@ApiTags('Electronics Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('electronics/analytics')
export class ElectronicsAnalyticsController {
  constructor(private readonly service: ElectronicsAnalyticsService) {}

  /** Kamai category, condition aur brand ke hisab se tori hui. */
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

  /** Stock value, maal ki umar, dead stock aur khatam hoti warranty. */
  @Get('stock')
  stock(
    @GetUser() user: AuthenticatedUser,
    @ShopIdParam() shopId?: string,
  ) {
    return this.service.stockReport(user, shopId);
  }
}
