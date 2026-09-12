import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { StockAdjustmentsService } from './stock-adjustments.service';

@ApiTags('Stock Adjustments')
@ApiBearerAuth()
@Controller('stock-adjustments')
export class StockAdjustmentsController {
  constructor(private readonly service: StockAdjustmentsService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.service.list(user, shop);
  }

  @Get('options/:productId')
  getOptions(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    return this.service.getAdjustmentOptions(user, productId);
  }

  @Post()
  create(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Body() dto: CreateAdjustmentDto,
  ) {
    return this.service.create(user, shop, dto);
  }
}
