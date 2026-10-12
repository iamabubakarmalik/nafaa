import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { IgnoreDto, ListLowStockDto, SetAlertDto } from './dto/low-stock.dto';
import { LowStockService } from './low-stock.service';

@ApiTags('Low Stock')
@ApiBearerAuth()
@Controller('inventory/low-stock')
export class LowStockController {
  constructor(private readonly service: LowStockService) {}

  /** Lines that need attention, per branch, with reorder numbers; paged. */
  @Get()
  list(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListLowStockDto) {
    return this.service.list(user, shop, q);
  }

  @Get('analytics')
  analytics(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListLowStockDto) {
    return this.service.analytics(user, shop, q);
  }

  @Patch(':productId/alert')
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  setAlert(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('productId') productId: string, @Body() dto: SetAlertDto) {
    return this.service.setAlert(user, shop, productId, dto);
  }

  @Post(':productId/ignore')
  @RequirePermissions(PERMISSIONS.LOW_STOCK_VIEW)
  ignore(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('productId') productId: string, @Body() dto: IgnoreDto) {
    return this.service.ignore(user, shop, productId, dto);
  }
}
