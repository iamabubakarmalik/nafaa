import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { ForecastOrderDto, ForecastQueryDto } from './forecast.dto';
import { ForecastService } from './forecast.service';

@ApiTags('Stock forecast')
@ApiBearerAuth()
@Controller('inventory/forecast')
export class ForecastController {
  constructor(private readonly service: ForecastService) {}

  /** Forecast lines with filters, the hero numbers, categories and suppliers; paged. */
  @Get()
  @RequirePermissions(PERMISSIONS.LOW_STOCK_VIEW)
  list(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ForecastQueryDto) {
    return this.service.list(user, shop, q);
  }

  /** Lines to order grouped by supplier, for the purchase editor (nothing is saved here). */
  @Post('order-groups')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.PURCHASES_CREATE)
  orderGroups(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: ForecastOrderDto) {
    return this.service.orderGroups(user, shop, dto);
  }
}
