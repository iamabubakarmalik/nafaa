import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { BatchAdjustmentDto, CreateAdjustmentDto, ListAdjustmentsDto, StockCountDto } from './dto/create-adjustment.dto';
import { StockAdjustmentsService } from './stock-adjustments.service';

@ApiTags('Stock Adjustments')
@ApiBearerAuth()
@Controller('stock-adjustments')
export class StockAdjustmentsController {
  constructor(private readonly service: StockAdjustmentsService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListAdjustmentsDto) {
    return this.service.list(user, shop, q);
  }

  @Get('analytics')
  analytics(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListAdjustmentsDto) {
    return this.service.analytics(user, shop, q);
  }

  @Get('reasons')
  reasons(@GetUser() user: AuthenticatedUser) {
    return this.service.reasons(user);
  }

  @Get('options/:productId')
  getOptions(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('productId') productId: string) {
    return this.service.getAdjustmentOptions(user, shop, productId);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateAdjustmentDto) {
    return this.service.create(user, shop, dto);
  }

  /** Several lines at once. */
  @Post('batch')
  batch(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: BatchAdjustmentDto) {
    return this.service.batch(user, shop, dto);
  }

  /** Physical stock count. */
  @Post('count')
  count(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: StockCountDto) {
    return this.service.count(user, shop, dto);
  }
}
